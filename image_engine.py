"""GPT Image through Runway. Credentials stay in the server process only."""
import base64
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

MODEL = 'gpt_image_2_5_sunburst'
RATIOS = {'1536:1920', '1920:1920', '1920:1280'}
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


def download_image(url):
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
            if image.width * image.height > 20_000_000:
                raise ValueError('Large dimensions')
            output = io.BytesIO()
            image.convert('RGB').save(output, format='JPEG', quality=95)
            data = output.getvalue()
        if len(data) > 8_000_000:
            raise ValueError('Large image')
    except (OSError, ValueError, Image.DecompressionBombError):
        raise RuntimeError('The image could not be saved. Resume this task rather than generating again.') from None
    return 'data:image/jpeg;base64,' + base64.b64encode(data).decode()


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
        return {k: job[k] for k in ('id', 'status', 'model', 'prompt', 'ratio', 'image', 'message') if k in job}

    def create(self, data):
        job_id, prompt, ratio = data.get('id'), data.get('prompt'), data.get('ratio', '1536:1920')
        path = self.path(job_id)
        if not isinstance(prompt, str) or not 10 <= len(prompt.strip()) <= 4000 or ratio not in RATIOS:
            raise ValueError('Describe the image in 10–4,000 characters and choose a supported shape.')
        if not self.lock.acquire(blocking=False):
            raise RuntimeError('An image request is being processed. Resume it shortly.')
        try:
            if path.exists():
                job = self.load(job_id)
                if job['prompt'] != prompt.strip() or job['ratio'] != ratio:
                    raise ValueError('This request ID belongs to another prompt.')
                return self.public(job)
            key = self.key()
            job = {'id': job_id, 'status': 'SUBMITTING', 'model': MODEL, 'prompt': prompt.strip(), 'ratio': ratio}
            self.save(job)  # Receipt before sending: an uncertain POST is never automatically retried.
            try:
                response = provider('text_to_image', key, {'model': MODEL, 'promptText': prompt.strip(),
                                                         'ratio': ratio, 'quality': 'high', 'outputCount': 1, 'background': 'opaque'})
                task = response.get('id', '')
                if not isinstance(task, str) or not re.fullmatch(r'[a-zA-Z0-9-]{1,100}', task):
                    raise RuntimeError('Runway did not return a valid task receipt.')
                job.update(status='PENDING', task_id=task)
            except RuntimeError as error:
                job.update(status='UNCONFIRMED', message=str(error) + ' This request will not be resubmitted automatically.')
            self.save(job)
            return self.public(job)
        finally:
            self.lock.release()

    def status(self, job_id):
        with self.lock:
            job = self.load(job_id)
            if job['status'] == 'SUBMITTING':
                job.update(status='UNCONFIRMED', message='Submission was interrupted. Check Runway task history before starting another image.')
                self.save(job)
            if job['status'] in {'SUCCEEDED', 'FAILED', 'CANCELED', 'UNCONFIRMED'}:
                return self.public(job)
            data = provider('tasks/' + job['task_id'], self.key())
            status = data.get('status')
            if status == 'SUCCEEDED':
                output = data.get('output')
                if not isinstance(output, list) or not output or not isinstance(output[0], str):
                    raise RuntimeError('Runway returned no image. The task receipt is retained.')
                job.update(status=status, image=download_image(output[0]))
            elif status in {'FAILED', 'CANCELED', 'CANCELLED'}:
                job.update(status='FAILED', message='Runway did not complete this image. Your board is unchanged.')
            elif status in {'PENDING', 'RUNNING', 'THROTTLED'}:
                job['status'] = status
            else:
                raise RuntimeError('Runway returned an unknown task state. Resume this task later.')
            self.save(job)
            return self.public(job)
