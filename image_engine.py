"""GPT Image through Runway. Credentials stay in the server process only."""
import base64
from contextlib import contextmanager
import fcntl
import io
import json
import os
from pathlib import Path
import re
import ssl
import subprocess
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen, build_opener, HTTPSHandler, HTTPRedirectHandler
import certifi
from PIL import Image
from image_craft import MODEL, SUNBURST_RATIOS, prepare, composite_selection, public_models, digest
from image_craft import MAX_OUTPUT_BYTES, MAX_PIXELS, MAX_SIDE, decode_image, validate_output_dimensions

RATIOS = set(SUNBURST_RATIOS)
CONTEXT = ssl.create_default_context(cafile=certifi.where())


def configured(config):
    return bool(os.environ.get('RUNWAYML_API_SECRET') or os.environ.get('RUNWAY_API_KEY') or config.get('runway_secret_ref'))


def credential(config):
    ref = config.get('runway_secret_ref', '')
    key = os.environ.get('RUNWAYML_API_SECRET') or os.environ.get('RUNWAY_API_KEY')
    if not ref and key:
        return key.strip()
    if not isinstance(ref, str) or not ref.startswith('op://'):
        raise RuntimeError('Connect the Runway credential in 1Password before generating an image.')
    try:
        result = subprocess.run(['op', 'read', ref, '--account', config.get('runway_account', 'napkin.1password.eu')],
                                capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        raise RuntimeError('Unlock 1Password and approve access, then try again. No image request was sent.') from None
    if result.returncode or not result.stdout.strip():
        raise RuntimeError('1Password could not supply the Runway key. Unlock it and approve access. No image request was sent.')
    return result.stdout.strip()


def provider(path, key, data=None):
    request = Request('https://api.dev.runwayml.com/v1/' + path,
                      data=json.dumps(data).encode() if data is not None else None,
                      headers={'Authorization': 'Bearer ' + key, 'X-Runway-Version': '2024-11-06', 'Content-Type': 'application/json'})
    try:
        with urlopen(request, timeout=45, context=CONTEXT) as response:
            return json.load(response)
    except HTTPError as error:
        # Do not return raw provider bodies or headers (may contain sensitive information).
        raise RuntimeError(f'Runway returned HTTP {error.code}. Check access, credits or service status.') from None
    except (URLError, TimeoutError, ValueError):
        raise RuntimeError('Runway could not confirm the request. Check its task history before starting another image.') from None


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise RuntimeError('Unexpected redirect while saving the generated image.')


def download_image(url, *, lossless=False):
    parsed = urlparse(url)
    # Only fetch Runway's signed media hosts, never arbitrary caller-supplied URLs.
    host = parsed.hostname or ''
    if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port not in (None, 443) or not (
            host.endswith('.cloudfront.net') or host.endswith('.runwayml.com') or host.endswith('.amazonaws.com')):
        raise RuntimeError('Runway returned an unrecognised image host. The task is retained; no new image was requested.')
    try:
        with build_opener(NoRedirect(), HTTPSHandler(context=CONTEXT)).open(url, timeout=45) as response:
            raw = response.read(16_000_001)
        if len(raw) > 16_000_000:
            raise ValueError('Large image')
        with Image.open(io.BytesIO(raw)) as image:
            if image.width * image.height > MAX_PIXELS or max(image.size) > MAX_SIDE:
                raise ValueError('Large dimensions')
            output = io.BytesIO()
            if lossless:
                image.convert('RGBA').save(output, format='PNG')
            else:
                image.convert('RGB').save(output, format='JPEG', quality=95)
            data = output.getvalue()
        if len(data) > MAX_OUTPUT_BYTES:
            raise ValueError('Large image')
    except (OSError, ValueError, Image.DecompressionBombError):
        raise RuntimeError('The image could not be saved. Resume this task rather than generating again.') from None
    return ('data:image/png;base64,' if lossless else 'data:image/jpeg;base64,') + base64.b64encode(data).decode()


class ImageJobs:
    def __init__(self, config, directory):
        self.config, self.directory = config, Path(directory)
        self.lock = threading.Lock()
        self._secret = None
        self._secret_at = 0

    def key(self):
        if not self._secret or time.monotonic() - self._secret_at > 600:
            self._secret = credential(self.config)
            self._secret_at = time.monotonic()
        return self._secret

    def path(self, job_id):
        if not isinstance(job_id, str) or not re.fullmatch(r'[a-f0-9]{32}', job_id):
            raise ValueError('Invalid image request ID.')
        return self.directory / (job_id + '.json')

    def save(self, job):
        self.directory.mkdir(parents=True, exist_ok=True)
        path = self.path(job['id'])
        temp = path.with_suffix('.tmp')
        temp.write_text(json.dumps(job))
        temp.replace(path)

    def load(self, job_id):
        path = self.path(job_id)
        if not path.is_file():
            raise ValueError('Image request not found on this Mac.')
        return json.loads(path.read_text())

    def public(self, job):
        return {k: job[k] for k in ('id', 'status', 'model', 'prompt', 'ratio', 'image', 'message',
                                  'mode', 'provenance', 'source_hash', 'mask_hash', 'snapshot_hash',
                                  'source_dimensions', 'edit_metadata', 'reference_metadata',
                                  'failure_code', 'provider_output_dimensions', 'provider_output_retained') if k in job}

    @contextmanager
    def guard(self):
        """One receipt directory is coordinated across objects, threads and server processes."""
        if not self.lock.acquire(blocking=False):
            raise RuntimeError('An image request is being processed. Resume it shortly.')
        try:
            self.directory.mkdir(parents=True, exist_ok=True)
            # Never unlink this file: replacement would permit locks on different inodes.
            with (self.directory / '.image-jobs.lock').open('a+b') as handle:
                try:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    raise RuntimeError('An image request is being processed in another session. Resume it shortly.') from None
                try:
                    yield
                finally:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        finally:
            self.lock.release()

    def output_path(self, job):
        suffix = '.provider.png' if job.get('mode') == 'selection' else '.provider.jpg'
        return self.path(job['id']).with_suffix(suffix)

    def retain_output(self, job, image_uri):
        raw, image = decode_image(image_uri, byte_limit=MAX_OUTPUT_BYTES)
        path = self.output_path(job)
        temporary = path.with_suffix(path.suffix + '.tmp')
        temporary.write_bytes(raw)
        temporary.replace(path)
        job.update(provider_output_retained=True, provider_output_dimensions=list(image.size),
                   provider_output_hash=digest(raw), status='OUTPUT_READY')
        self.save(job)

    def finish_output(self, job):
        raw = self.output_path(job).read_bytes()
        if digest(raw) != job['provider_output_hash']:
            raise RuntimeError('The retained provider output has changed. The original and receipt are preserved.')
        mime = 'png' if job.get('mode') == 'selection' else 'jpeg'
        generated = f'data:image/{mime};base64,' + base64.b64encode(raw).decode('ascii')
        _, image = decode_image(generated, byte_limit=MAX_OUTPUT_BYTES)
        try:
            validate_output_dimensions(job, image)
        except ValueError as error:
            job.update(status='FAILED', failure_code='OUTPUT_DIMENSIONS', message=str(error))
            self.save(job)
            return self.public(job)
        if job.get('mode') == 'selection':
            result, metadata = composite_selection(job, generated)
            job.update(status='SUCCEEDED', image=result, edit_metadata=metadata)
        else:
            job.update(status='SUCCEEDED', image=generated)
        self.save(job)
        return self.public(job)

    def create(self, data):
        if not isinstance(data, dict):
            raise ValueError('Image request must be an object.')
        job_id = data.get('id')
        path = self.path(job_id)
        inputs, payload = prepare(data)
        with self.guard():
            if path.exists():
                job = self.load(job_id)
                if 'request_fingerprint' in job:
                    same_request = job['request_fingerprint'] == inputs['request_fingerprint']
                else:
                    # Legacy generation receipts remain resumable without being submitted again.
                    same_request = (job.get('prompt') == inputs['prompt'] and job.get('ratio') == inputs['ratio']
                                    and job.get('model', MODEL) == inputs['model'] and inputs['mode'] == 'generate'
                                    and inputs['source_hash'] is None and 'snapshot' not in inputs)
                if not same_request:
                    raise ValueError('This request ID belongs to different image inputs. Resume it or start a new explicit request.')
                return self.public(job)
            key = self.key()
            job = dict(inputs, id=job_id, status='SUBMITTING', provider_prompt=payload['promptText'],
                       provider_input_hash=digest(json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()))
            self.save(job)  # Receipt before sending: an uncertain POST is never automatically retried.
            try:
                response = provider('text_to_image', key, payload)
                task = response.get('id', '')
                if not isinstance(task, str) or not re.fullmatch(r'[a-zA-Z0-9-]{1,100}', task):
                    raise RuntimeError('Runway did not return a valid task receipt.')
                job.update(status='PENDING', task_id=task)
            except RuntimeError as error:
                job.update(status='UNCONFIRMED', message=str(error) + ' This request will not be resubmitted automatically.')
            self.save(job)
            return self.public(job)

    def status(self, job_id):
        self.path(job_id)
        with self.guard():
            job = self.load(job_id)
            if job['status'] == 'SUBMITTING':
                job.update(status='UNCONFIRMED', message='Submission was interrupted. Check Runway task history before starting another image.')
                self.save(job)
            if job['status'] in {'SUCCEEDED', 'FAILED', 'CANCELED', 'UNCONFIRMED'}:
                return self.public(job)
            if job['status'] == 'OUTPUT_READY':
                return self.finish_output(job)
            data = provider('tasks/' + job['task_id'], self.key())
            status = data.get('status')
            if status == 'SUCCEEDED':
                output = data.get('output')
                if not isinstance(output, list) or not output or not isinstance(output[0], str):
                    raise RuntimeError('Runway returned no image. The task receipt is retained.')
                generated = (download_image(output[0], lossless=True) if job.get('mode') == 'selection'
                             else download_image(output[0]))
                self.retain_output(job, generated)
                return self.finish_output(job)
            elif status in {'FAILED', 'CANCELED', 'CANCELLED'}:
                job.update(status='FAILED', message='Runway did not complete this image. Your board is unchanged.')
            elif status in {'PENDING', 'RUNNING', 'THROTTLED'}:
                job['status'] = status
            else:
                raise RuntimeError('Runway returned an unknown task state. Resume this task later.')
            self.save(job)
            return self.public(job)
