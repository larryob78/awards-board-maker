import base64
import io
import json
import random
import subprocess
import sys
import threading
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw, ImageChops
from image_craft import (MODEL, decode_image, digest, image_uri, prepare, public_models,
                         composite_selection, MAX_REFERENCE_URI, WHOLE_PREFIX, validate_output_dimensions, MAX_SOURCE_BYTES, MAX_OUTPUT_BYTES)
from image_engine import ImageJobs, download_image


def source_image(size=(96, 64)):
    image = Image.new('RGBA', size)
    image.putdata([((x * 7) % 256, (y * 13) % 256, (x + y * 9) % 256, (x * 11 + y) % 256)
                   for y in range(size[1]) for x in range(size[0])])
    return image


def make_selection(size=(96, 64), kind='rectangle', feather=0):
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rectangle((30, 20, 49, 39), fill=255)
    return {'kind': kind, 'mask': image_uri(mask), 'width': size[0], 'height': size[1], 'feather': feather}


class ImageCraftTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.jobs = ImageJobs({}, self.temp.name)
        self.data = {'id': 'b' * 32, 'prompt': 'Change the selected surface to warm terracotta',
                     'ratio': '1920:1280', 'model': MODEL}
        self.source = image_uri(source_image())

    def edit(self, **changes):
        return dict(self.data, mode='selection', source=self.source,
                    selection=make_selection(), **changes)

    def test_capabilities_are_explicit_and_cover_standard_and_large_native_sizes(self):
        models = public_models()
        self.assertEqual(models['default_model'], MODEL)
        by_id = {row['id']: row for row in models['models']}
        for ratio in ('1536:1920', '1920:1920', '1920:1280', '2160:3840', '2880:2880', '3840:2160'):
            self.assertIn(ratio, by_id[MODEL]['ratios'])
        self.assertEqual(by_id[MODEL]['provider_prompt_limit'], 32000)
        self.assertEqual(by_id['gen4_image']['prompt_unit'], 'utf16')
        self.assertEqual(by_id['gen4_image_turbo']['reference_min'], 1)
        self.assertFalse(any(row['provider_native_mask'] for row in models['models']))
        self.assertFalse(any(row['price_known'] for row in models['models']))

    @patch('image_engine.credential', return_value='test-key-never-saved')
    @patch('image_engine.provider', return_value={'id': 'task-one'})
    def test_whole_edit_maps_reference_and_retains_original_receipt(self, provider, credential):
        data = dict(self.data, mode='whole', source=self.source, snapshot={'board_version': 'v7'})
        public = self.jobs.create(data)
        payload = provider.call_args.args[2]
        self.assertEqual(payload['referenceImages'], [{'uri': self.source, 'tag': 'source'}])
        self.assertTrue(payload['promptText'].startswith(WHOLE_PREFIX))
        self.assertEqual(public['mode'], 'whole')
        self.assertEqual(public['provenance'], 'ai_concept')
        self.assertNotIn('source', public)
        self.assertNotIn('snapshot', public)
        saved = self.jobs.load(data['id'])
        self.assertEqual(saved['source'], self.source)
        self.assertEqual(saved['snapshot'], data['snapshot'])
        self.assertNotIn('test-key-never-saved', json.dumps(saved))
        raw, _ = decode_image(self.source)
        self.assertEqual(saved['source_hash'], digest(raw))
        self.assertIn('provider_input_hash', saved)

    def test_selection_is_context_crop_with_invertible_mapping_and_no_native_mask(self):
        job, payload = prepare(self.edit())
        self.assertEqual(job['edit_metadata']['selection_box'], [30, 20, 50, 40])
        self.assertEqual(job['edit_metadata']['crop_box'], [14, 4, 66, 56])
        self.assertEqual(payload['referenceImages'][0]['tag'], 'source')
        self.assertNotIn('mask', payload)
        self.assertNotEqual(payload['referenceImages'][0]['uri'], self.source)
        _, reference = decode_image(payload['referenceImages'][0]['uri'])
        self.assertEqual(list(reference.size), job['edit_metadata']['reference_size'])
        self.assertLessEqual(len(payload['referenceImages'][0]['uri']), MAX_REFERENCE_URI)
        self.assertEqual(job['source'], self.source)
        self.assertIn('reference_scale', job['edit_metadata'])
        self.assertIn('preserve surrounding context', payload['promptText'])

    def test_selection_output_preserves_exact_rgba_outside_mask_and_png(self):
        for kind in ('rectangle', 'lasso', 'brush'):
            for feather in (0, 3.5):
                with self.subTest(kind=kind, feather=feather):
                    data = self.edit()
                    data['selection'] = make_selection(kind=kind, feather=feather)
                    # Irregular hole tests local clipping, not merely the mask bounding rectangle.
                    _, mask = decode_image(data['selection']['mask'])
                    ImageDraw.Draw(mask).rectangle((35, 25, 38, 29), fill=(0, 0, 0, 255))
                    data['selection']['mask'] = image_uri(mask)
                    job, _ = prepare(data)
                    generated = image_uri(Image.new('RGBA', (1920, 1280), (255, 10, 20, 123)))
                    output, metadata = composite_selection(job, generated)
                    self.assertTrue(output.startswith('data:image/png;base64,'))
                    _, result = decode_image(output)
                    _, original = decode_image(self.source)
                    changed = 0
                    for y in range(original.height):
                        for x in range(original.width):
                            if mask.getpixel((x, y))[0] == 0:
                                self.assertEqual(result.getpixel((x, y)), original.getpixel((x, y)))
                            elif result.getpixel((x, y)) != original.getpixel((x, y)):
                                changed += 1
                    self.assertGreater(changed, 0)
                    self.assertEqual(job['source'], self.source)
                    self.assertEqual(metadata['output_size'], list(original.size))
                    self.assertEqual(metadata['generated_size'], [1920, 1280])
                    self.assertEqual(metadata['output_format'], 'PNG')

    @patch('image_engine.credential', return_value='test-key')
    @patch('image_engine.provider')
    @patch('image_engine.download_image')
    def test_selection_completes_after_reload_without_resubmission(self, download, provider, credential):
        provider.side_effect = [{'id': 'task'}, {'status': 'SUCCEEDED', 'output': ['https://a.cloudfront.net/image']}]
        download.return_value = image_uri(Image.new('RGBA', (1920, 1280), (200, 80, 1, 255)))
        self.jobs.create(self.edit())
        restarted = ImageJobs({}, self.temp.name)
        result = restarted.status(self.data['id'])
        self.assertEqual(result['status'], 'SUCCEEDED')
        self.assertTrue(result['image'].startswith('data:image/png;base64,'))
        download.assert_called_once_with('https://a.cloudfront.net/image', lossless=True)
        self.assertEqual(ImageJobs({}, self.temp.name).status(self.data['id']), result)
        self.assertEqual(provider.call_count, 2)
        self.assertEqual(self.jobs.load(self.data['id'])['source'], self.source)

    @patch('image_engine.credential', return_value='test-key')
    @patch('image_engine.provider', side_effect=RuntimeError('Uncertain POST'))
    def test_selection_uncertainty_remains_unconfirmed_and_never_resubmits(self, provider, credential):
        result = self.jobs.create(self.edit())
        self.assertEqual(result['status'], 'UNCONFIRMED')
        self.assertEqual(ImageJobs({}, self.temp.name).create(self.edit())['status'], 'UNCONFIRMED')
        self.assertEqual(ImageJobs({}, self.temp.name).status(self.data['id'])['status'], 'UNCONFIRMED')
        self.assertEqual(provider.call_count, 1)

    @patch('image_engine.credential', return_value='test-key')
    @patch('image_engine.provider', return_value={'id': 'task'})
    def test_same_id_rejects_changed_model_source_mask_feather_and_snapshot(self, provider, credential):
        data = self.edit(snapshot={'version': 1})
        self.jobs.create(data)
        changes = [dict(model='gen4_image', ratio='1024:1024'),
                   dict(source=image_uri(Image.new('RGBA', (96, 64), 'red'))),
                   dict(selection={**data['selection'], 'feather': 2}),
                   dict(selection={**data['selection'], 'kind': 'lasso'}), dict(snapshot={'version': 2}),
                   dict(mode='whole', selection=None)]
        different_mask = Image.new('L', (96, 64), 0)
        ImageDraw.Draw(different_mask).rectangle((0, 0, 10, 10), fill=255)
        changes.append(dict(selection={**data['selection'], 'mask': image_uri(different_mask)}))
        for change in changes:
            with self.subTest(change=list(change)):
                with self.assertRaises(ValueError):
                    self.jobs.create({**data, **change})
        self.assertEqual(provider.call_count, 1)

    @patch('image_engine.credential')
    @patch('image_engine.provider')
    def test_invalid_images_masks_and_models_never_access_key_or_provider(self, provider, credential):
        cases = [dict(model='unknown-image-model'), dict(source='https://example.test/private.jpg'),
                 dict(source='data:image/png;base64,AAAA'), dict(source='data:image/svg+xml;base64,AAAA'),
                 dict(source=self.source.replace('image/png', 'image/jpeg')),
                 dict(selection={**make_selection(), 'width': 95}),
                 dict(selection={**make_selection(), 'height': True}),
                 dict(selection={**make_selection(), 'mask': image_uri(Image.new('L', (32, 32), 255))}),
                 dict(selection={**make_selection(), 'mask': image_uri(Image.new('L', (96, 64), 0))}),
                 dict(selection={**make_selection(), 'mask': image_uri(Image.new('L', (96, 64), 128))}),
                 dict(selection={**make_selection(), 'feather': float('nan')}),
                 dict(selection={**make_selection(), 'feather': 65}),
                 dict(source=image_uri(Image.new('RGB', (8193, 1))))]
        for change in cases:
            with self.subTest(change=list(change)):
                with self.assertRaises(ValueError):
                    self.jobs.create({**self.edit(), **change})
        provider.assert_not_called()
        credential.assert_not_called()
        self.assertFalse(list(Path(self.temp.name).glob('*.json')))

    def test_gen4_uses_only_its_documented_fields_and_utf16_limit(self):
        for model in ('gen4_image', 'gen4_image_turbo'):
            job, payload = prepare(dict(self.data, model=model, ratio='1024:1024', mode='whole', source=self.source))
            self.assertEqual(payload['model'], model)
            self.assertNotIn('quality', payload)
            self.assertNotIn('background', payload)
            self.assertNotIn('outputCount', payload)
        with self.assertRaises(ValueError):
            prepare(dict(self.data, model='gen4_image_turbo', ratio='1024:1024'))
        with self.assertRaises(ValueError):
            prepare(dict(self.data, model='gen4_image', ratio='1024:1024', prompt='😀' * 501))
        with self.assertRaises(ValueError):
            prepare(dict(self.data, model='gen4_image', ratio='1536:1920'))

    def test_supported_static_image_types_decode_and_type_mismatch_fails(self):
        for fmt, mime in [('PNG', 'png'), ('JPEG', 'jpeg'), ('WEBP', 'webp')]:
            output = io.BytesIO()
            Image.new('RGB', (40, 40), 'red').save(output, format=fmt)
            uri = 'data:image/' + mime + ';base64,' + base64.b64encode(output.getvalue()).decode()
            raw, image = decode_image(uri)
            self.assertEqual(raw, output.getvalue())
            self.assertEqual(image.size, (40, 40))

    @patch('image_engine.provider')
    @patch('image_engine.credential')
    def test_legacy_receipt_is_resumable_without_credentials_or_submission(self, credential, provider):
        legacy = {'id': self.data['id'], 'status': 'UNCONFIRMED', 'model': MODEL,
                  'prompt': self.data['prompt'], 'ratio': self.data['ratio']}
        self.jobs.save(legacy)
        self.assertEqual(self.jobs.create(self.data)['status'], 'UNCONFIRMED')
        with self.assertRaises(ValueError):
            self.jobs.create(dict(self.data, source=self.source, mode='whole'))
        credential.assert_not_called()
        provider.assert_not_called()

    @patch('image_engine.credential', return_value='test-key')
    @patch('image_engine.provider')
    def test_cross_instance_create_and_status_cannot_race_the_same_receipt(self, provider, credential):
        entered, release = threading.Event(), threading.Event()
        results, errors = [], []
        def submit(*args):
            entered.set()
            if not release.wait(5):
                raise AssertionError('Test submission was not released')
            return {'id': 'single-paid-task'}
        provider.side_effect = submit
        def first_request():
            try:
                results.append(self.jobs.create(self.data))
            except Exception as error:
                errors.append(error)
        worker = threading.Thread(target=first_request)
        worker.start()
        try:
            self.assertTrue(entered.wait(3))
            second = ImageJobs({}, self.temp.name)
            with self.assertRaisesRegex(RuntimeError, 'another session'):
                second.create(self.data)
            with self.assertRaisesRegex(RuntimeError, 'another session'):
                second.status(self.data['id'])
            self.assertEqual(self.jobs.load(self.data['id'])['status'], 'SUBMITTING')
        finally:
            release.set()
            worker.join(5)
        self.assertFalse(worker.is_alive())
        self.assertFalse(errors)
        self.assertEqual(results[0]['status'], 'PENDING')
        self.assertEqual(second.create(self.data)['status'], 'PENDING')
        self.assertEqual(provider.call_count, 1)

    def test_directory_lock_excludes_a_separate_process_before_credential_access(self):
        script = """
import json,sys
from unittest.mock import patch
from image_engine import ImageJobs
jobs=ImageJobs({},sys.argv[1])
with patch('image_engine.credential',side_effect=AssertionError('credential accessed')), patch('image_engine.provider',side_effect=AssertionError('provider called')):
    try:
        jobs.create(json.loads(sys.argv[2]))
    except RuntimeError as error:
        assert 'another session' in str(error)
        print('lock prevented submission')
    else:
        raise AssertionError('request bypassed cross-process lock')
"""
        with self.jobs.guard():
            result = subprocess.run([sys.executable, '-B', '-c', script, self.temp.name, json.dumps(self.data)],
                                    capture_output=True, text=True, timeout=10,
                                    cwd=Path(__file__).resolve().parents[1])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('lock prevented submission', result.stdout)

    @patch('image_engine.build_opener')
    def test_large_native_jpeg_download_can_expand_to_lossless_png(self, opener):
        # Real image codecs, mocked network: this JPEG fits the unchanged 16 MB wire limit.
        noise = Image.frombytes('RGB', (3840, 2160), random.Random(42).randbytes(3840 * 2160 * 3))
        encoded = io.BytesIO()
        noise.save(encoded, format='JPEG', quality=80)
        raw = encoded.getvalue()
        self.assertLess(len(raw), 16_000_000)
        opener.return_value.open.return_value.__enter__.return_value.read.return_value = raw
        uri = download_image('https://a.cloudfront.net/image.jpg', lossless=True)
        png, decoded = decode_image(uri)
        self.assertGreater(len(png), 8_000_000)
        self.assertLess(len(png), MAX_OUTPUT_BYTES)
        self.assertEqual(decoded.size, (3840, 2160))
        validate_output_dimensions(dict(self.data, ratio='3840:2160'), decoded)

    def test_lossless_jpeg_composite_roundtrips_as_selection_and_whole_reference(self):
        noise = Image.frombytes('RGB', (2048, 2048), random.Random(12).randbytes(2048 * 2048 * 3))
        encoded = io.BytesIO()
        noise.save(encoded, format='JPEG', quality=80)
        raw = encoded.getvalue()
        self.assertLess(len(raw), 8_000_000)
        source = 'data:image/jpeg;base64,' + base64.b64encode(raw).decode('ascii')
        first_data = dict(self.data, mode='selection', source=source, selection=make_selection((2048, 2048)))
        first_job, _ = prepare(first_data)
        generated = image_uri(Image.new('RGBA', (1920, 1280), (240, 10, 4, 255)))
        output, _ = composite_selection(first_job, generated)
        png, result = decode_image(output)
        self.assertGreater(len(png), 8_000_000)
        self.assertLess(len(png), MAX_SOURCE_BYTES)
        self.assertEqual(first_job['source'], source)
        _, original = decode_image(source)
        for channel in ImageChops.difference(original, result).split():
            bounds = channel.getbbox()
            if bounds:
                self.assertTrue(bounds[0] >= 30 and bounds[1] >= 20 and bounds[2] <= 50 and bounds[3] <= 40)
        second_job, _ = prepare(dict(first_data, source=output))
        second_output, _ = composite_selection(second_job, generated)
        self.assertEqual(decode_image(second_output)[1].size, (2048, 2048))
        self.assertEqual(second_job['source'], output)
        whole_job, payload = prepare(dict(self.data, mode='whole', source=output))
        self.assertLessEqual(len(payload['referenceImages'][0]['uri']), MAX_REFERENCE_URI)
        self.assertTrue(whole_job['reference_metadata']['reference_reduced'])
        self.assertLess(whole_job['reference_metadata']['reference_scale'][0], 1)
        self.assertEqual(whole_job['source'], output)
        self.assertEqual(whole_job['source_hash'], digest(png))

    @patch('image_engine.credential', return_value='test-key')
    @patch('image_engine.provider')
    @patch('image_engine.download_image')
    def test_wrong_native_dimensions_fail_without_stretch_and_keep_output_for_review(self, download, provider, credential):
        for index, (mode, size) in enumerate([('generate', (1, 1)), ('whole', (1280, 1920)), ('selection', (1, 1))]):
            with self.subTest(mode=mode):
                data = dict(self.data, id=f'{index + 1:032x}', mode=mode)
                if mode in ('whole', 'selection'):
                    data['source'] = self.source
                if mode == 'selection':
                    data['selection'] = make_selection()
                output = io.BytesIO()
                fmt = 'PNG' if mode == 'selection' else 'JPEG'
                Image.new('RGB', size, 'red').save(output, format=fmt)
                mime = 'png' if fmt == 'PNG' else 'jpeg'
                download.return_value = f'data:image/{mime};base64,' + base64.b64encode(output.getvalue()).decode()
                provider.side_effect = [{'id': 'task'}, {'status': 'SUCCEEDED', 'output': ['https://a.cloudfront.net/image']}]
                self.jobs.create(data)
                result = self.jobs.status(data['id'])
                self.assertEqual(result['status'], 'FAILED')
                self.assertEqual(result['failure_code'], 'OUTPUT_DIMENSIONS')
                self.assertEqual(result['provider_output_dimensions'], list(size))
                self.assertTrue(result['provider_output_retained'])
                self.assertNotIn('image', result)
                saved = self.jobs.load(data['id'])
                self.assertTrue(self.jobs.output_path(saved).is_file())
                if mode != 'generate':
                    self.assertEqual(saved['source'], self.source)
                before = provider.call_count
                self.assertEqual(ImageJobs({}, self.temp.name).status(data['id']), result)
                self.assertEqual(provider.call_count, before)

    @patch('image_engine.credential', return_value='test-key')
    @patch('image_engine.provider')
    @patch('image_engine.download_image')
    def test_retained_provider_output_resumes_after_local_composite_interruption(self, download, provider, credential):
        provider.side_effect = [{'id': 'task'}, {'status': 'SUCCEEDED', 'output': ['https://a.cloudfront.net/image']}]
        download.return_value = image_uri(Image.new('RGBA', (1920, 1280), 'orange'))
        self.jobs.create(self.edit())
        with patch('image_engine.composite_selection', side_effect=RuntimeError('Interrupted local work')):
            with self.assertRaisesRegex(RuntimeError, 'Interrupted local work'):
                self.jobs.status(self.data['id'])
        self.assertEqual(self.jobs.load(self.data['id'])['status'], 'OUTPUT_READY')
        result = ImageJobs({}, self.temp.name).status(self.data['id'])
        self.assertEqual(result['status'], 'SUCCEEDED')
        self.assertEqual(provider.call_count, 2)
        self.assertEqual(download.call_count, 1)

    def test_auto_output_policy_accepts_only_documented_native_sizes(self):
        job = dict(self.data, ratio='auto')
        validate_output_dimensions(job, Image.new('RGB', (1920, 1920)))
        for dimensions in ((1, 1), (1000, 1000), (1920, 1281)):
            with self.subTest(dimensions=dimensions):
                with self.assertRaises(ValueError):
                    validate_output_dimensions(job, Image.new('RGB', dimensions))
        prepared, _ = prepare(self.edit())
        with self.assertRaises(ValueError):
            composite_selection(prepared, image_uri(Image.new('RGB', (1, 1))))


if __name__ == '__main__':
    unittest.main()
