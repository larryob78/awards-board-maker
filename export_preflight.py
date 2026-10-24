"""Year-specific technical file checks. No eligibility or creative-quality certificate."""
from dataclasses import dataclass
import hashlib
import io
from PIL import Image


@dataclass(frozen=True)
class ImageProfile:
    id: str
    width: int
    height: int
    min_bytes: int
    max_bytes: int


CANNES_2026 = ImageProfile('cannes-2026-presentation-jpg', 7063, 5008, 5_000_000, 15_000_000)
SOURCE = 'https://on.lions.co/cl26-ek1'
SOURCE_PAGE = 179
CHECKED = '2026-10-24'


def inspect_jpeg(raw, profile=CANNES_2026):
    if not raw.startswith(b'\xff\xd8\xff'):
        raise ValueError('The exported file is not JPEG bytes.')
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if image.format != 'JPEG':
                raise ValueError('The exported file is not JPEG.')
            dimensions = list(image.size)
            image.verify()
    except (OSError, Image.DecompressionBombError):
        raise ValueError('The JPEG could not be decoded.') from None
    checks = {'dimensions': dimensions == [profile.width, profile.height],
              'mime': True, 'bytes': profile.min_bytes <= len(raw) <= profile.max_bytes}
    return {'profile': profile.id, 'width': dimensions[0], 'height': dimensions[1],
            'mime': 'image/jpeg', 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'checks': checks, 'technical_pass': all(checks.values()),
            'visual_review': 'Not checked', 'category_applicability': 'Not checked',
            'source': SOURCE, 'source_page': SOURCE_PAGE, 'checked_on': CHECKED,
            'byte_interpretation': 'Decimal MB (1 MB = 1,000,000 bytes). Portal acceptance remains separate.'}


def encode_candidates(png, profile=CANNES_2026):
    """At most three honest encodes; no noise, padding, repeated provider calls or image changes."""
    if not png.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Send the rendered board as PNG for JPEG encoding.')
    try:
        with Image.open(io.BytesIO(png)) as source:
            if source.format != 'PNG' or source.size != (profile.width, profile.height):
                raise ValueError(f'The rendered board must be exactly {profile.width} × {profile.height} pixels.')
            source.load()
            # Flatten transparency onto white, retaining the rendered lettering and source art.
            rgba = source.convert('RGBA')
            image = Image.new('RGB', source.size, 'white')
            image.paste(rgba, mask=rgba.getchannel('A'))
    except (OSError, Image.DecompressionBombError):
        raise ValueError('The rendered PNG could not be decoded.') from None
    candidates = []
    for quality in (100, 95, 90):
        output = io.BytesIO()
        image.save(output, 'JPEG', quality=quality, subsampling=0, optimize=True)
        raw = output.getvalue()
        report = inspect_jpeg(raw, profile)
        report['quality'] = quality
        candidates.append((raw, report))
        if report['technical_pass'] or len(raw) < profile.min_bytes:
            break  # Reducing quality cannot solve an undersized highest-quality file.
    return candidates
