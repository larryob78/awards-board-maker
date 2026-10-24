import io
import unittest
from PIL import Image
from export_preflight import CANNES_2026, ImageProfile, encode_candidates, inspect_jpeg


class ExportTests(unittest.TestCase):
    def png(self):
        output = io.BytesIO()
        Image.effect_noise((320, 240), 25).convert('RGB').save(output, 'PNG')
        return output.getvalue()

    def test_verified_year_profile_and_actual_jpeg_bytes(self):
        self.assertEqual((CANNES_2026.width, CANNES_2026.height), (7063, 5008))
        self.assertEqual((CANNES_2026.min_bytes, CANNES_2026.max_bytes), (5_000_000, 15_000_000))
        profile = ImageProfile('test', 320, 240, 1000, 1_000_000)
        candidates = encode_candidates(self.png(), profile)
        raw, report = candidates[0]
        self.assertEqual(report['mime'], 'image/jpeg')
        self.assertEqual(report['bytes'], len(raw))
        self.assertTrue(report['technical_pass'])
        self.assertEqual(report['visual_review'], 'Not checked')
        with Image.open(io.BytesIO(raw)) as actual:
            self.assertEqual(actual.size, (320, 240))

    def test_never_pads_an_undersized_image(self):
        candidates = encode_candidates(self.png(), ImageProfile('test', 320, 240, 1_000_000, 2_000_000))
        self.assertEqual(len(candidates), 1)
        self.assertFalse(candidates[0][1]['checks']['bytes'])

    def test_encoding_attempts_bounded_at_three(self):
        candidates = encode_candidates(self.png(), ImageProfile('test', 320, 240, 1, 500))
        self.assertEqual([report['quality'] for _, report in candidates], [100, 95, 90])
        self.assertFalse(any(report['technical_pass'] for _, report in candidates))

    def test_no_fake_extension_or_wrong_dimensions(self):
        with self.assertRaises(ValueError):
            inspect_jpeg(self.png())
        with self.assertRaises(ValueError):
            encode_candidates(self.png())
