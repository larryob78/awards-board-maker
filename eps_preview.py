"""Bounded local EPS raster preview. Preserve source; never execute in the web process."""
import base64
import hashlib
import io
import os
from pathlib import Path
import re
import struct
import subprocess
import sys
import tempfile
from PIL import Image

MAX_BYTES = 8_000_000
MAX_SIDE = 2048


def postscript_segment(raw):
    if not isinstance(raw, bytes) or not 0 < len(raw) <= MAX_BYTES:
        raise ValueError('Choose an EPS file under 8 MB.')
    ps = raw
    if raw[:4] == bytes.fromhex('c5d0d3c6'):
        if len(raw) < 30:
            raise ValueError('Invalid EPS binary header.')
        offset, length = struct.unpack_from('<II', raw, 4)
        if offset < 30 or length < 30 or offset + length > len(raw):
            raise ValueError('Invalid EPS PostScript segment.')
        ps = raw[offset:offset + length]
    if not ps.startswith(b'%!PS-Adobe-') or b'EPSF-' not in ps[:100]:
        raise ValueError('This is not a supported EPS file. Renaming an image does not convert it.')
    pages = re.search(rb'(?m)^%%Pages:\s*(\d+)', ps)
    if pages and int(pages[1]) != 1:
        raise ValueError('Only a single-page EPS logo is supported.')
    pattern = rb'(?m)^%%(?:HiRes)?BoundingBox:\s*([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)\s+([-+\d.]+)'
    match = re.search(pattern, ps)
    if not match:
        raise ValueError('This EPS needs a numeric bounding box before it can be previewed.')
    try:
        x0, y0, x1, y1 = [float(v) for v in match.groups()]
    except ValueError:
        raise ValueError('Invalid EPS bounding box.') from None
    width, height = x1-x0, y1-y0
    if not all(0 < v <= 20000 for v in (width, height)):
        raise ValueError('EPS dimensions are outside this preview limit.')
    return ps, (width, height)


def convert_eps(raw):
    ps, (width, height) = postscript_segment(raw)
    if not Path('/opt/homebrew/bin/gs').is_file():
        raise RuntimeError('EPS preview is unavailable on this Mac. Upload the supplied JPEG or PNG instead.')
    dpi = min(144, MAX_SIDE * 72 / max(width, height))
    worker = Path(__file__).with_name('eps_worker.py')
    with tempfile.TemporaryDirectory(prefix='napkin-eps-') as directory:
        temp = Path(directory)
        (temp/'input.eps').write_bytes(ps)
        args = [sys.executable, '-I', str(worker), '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop',
                '-dFirstPage=1', '-dLastPage=1', '-dNumRenderingThreads=1', '-dMaxBitmap=16777216',
                '-sDEVICE=pngalpha', f'-r{dpi:.6f}', '-sOutputFile=preview.png', '-f', 'input.eps']
        env = {'PATH': '/usr/bin:/bin:/opt/homebrew/bin', 'HOME': directory, 'TMPDIR': directory}
        try:
            result = subprocess.run(args, cwd=directory, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=25)
        except (OSError, subprocess.TimeoutExpired):
            raise RuntimeError('EPS preview exceeded its local limit. Original retained; use the JPEG or a simpler EPS.') from None
        output = temp/'preview.png'
        if result.returncode or not output.is_file() or output.stat().st_size > MAX_BYTES:
            raise RuntimeError('This EPS could not be safely previewed. Use the supplied JPEG or export a PNG. No board asset changed.')
        png = output.read_bytes()
        try:
            with Image.open(io.BytesIO(png)) as image:
                if image.format != 'PNG' or max(image.size) > MAX_SIDE + 1 or image.width*image.height > 4_200_000:
                    raise ValueError('Invalid preview dimensions.')
                image.load()
                dimensions = list(image.size)
                transparent = image.convert('RGBA').getchannel('A').getextrema()[0] < 255
        except (OSError, ValueError, Image.DecompressionBombError):
            raise RuntimeError('EPS preview validation failed. The current logo is unchanged.') from None
    colour = re.search(rb'(?m)^%%DocumentProcessColors:([^\r\n]+)', ps)
    return {'preview': 'data:image/png;base64,'+base64.b64encode(png).decode(),
            'pixels': dimensions, 'has_transparency': transparent, 'source_sha256': hashlib.sha256(raw).hexdigest(),
            'source_bytes': len(raw), 'bounding_box_points': [width,height],
            'declared_process_colours': colour[1].decode('ascii','replace').strip() if colour else 'Not declared',
            'renderer': 'Ghostscript local raster preview; original EPS retained. Not editable vector artwork or calibrated colour proof.'}
