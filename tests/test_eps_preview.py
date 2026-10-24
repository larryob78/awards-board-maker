import io
from pathlib import Path
import struct
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from eps_preview import convert_eps, postscript_segment

GOOD = b'%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 100 100\n%%Pages: 1\n1 0 0 setrgbcolor 10 10 80 80 rectfill showpage\n'

class EPSPreviewTests(unittest.TestCase):
    def test_disguised_or_malformed_upload_rejected(self):
        for raw in [b'<svg/>', b'\x89PNG\r\n\x1a\n', GOOD.replace(b'EPSF-',b'OTHER'), b'\xc5\xd0\xd3\xc6'+b'\0'*26]:
            with self.assertRaises(ValueError):postscript_segment(raw)
        with self.assertRaises(ValueError):postscript_segment(GOOD.replace(b'%%Pages: 1',b'%%Pages: 2'))

    def test_binary_wrapper_keeps_postscript_and_rejects_bounds(self):
        header=bytes.fromhex('c5d0d3c6')+struct.pack('<II',30,len(GOOD))+b'\0'*18
        self.assertEqual(postscript_segment(header+GOOD),(GOOD,(100,100)))
        with self.assertRaises(ValueError):postscript_segment(GOOD.replace(b'100 100',b'90000 90000',1))

    @unittest.skipUnless(Path('/opt/homebrew/bin/gs').is_file(),'Local Ghostscript unavailable')
    def test_real_preview_is_bounded_and_transparency_is_measured(self):
        result=convert_eps(GOOD)
        self.assertEqual(result['pixels'],[200,200])
        self.assertTrue(result['has_transparency'])
        self.assertEqual(result['source_bytes'],len(GOOD))
        self.assertEqual(len(result['source_sha256']),64)

    @unittest.skipUnless(Path('/opt/homebrew/bin/gs').is_file(),'Local Ghostscript unavailable')
    def test_safer_rejects_private_file_read_without_leaking_data(self):
        with tempfile.TemporaryDirectory() as directory:
            private=Path(directory)/'private.txt';private.write_text('synthetic-private-value')
            malicious=GOOD.split(b'1 0 0')[0]+f'({private}) (r) file 100 string readstring pop print showpage\n'.encode()
            with self.assertRaises(RuntimeError) as error:convert_eps(malicious)
            self.assertNotIn('synthetic-private-value',str(error.exception))
            self.assertNotIn(str(private),str(error.exception))

    @patch('eps_preview.subprocess.run',side_effect=subprocess.TimeoutExpired('gs',25))
    def test_timeout_is_actionable_and_no_raw_output(self,run):
        with self.assertRaisesRegex(RuntimeError,'local limit'):convert_eps(GOOD)
