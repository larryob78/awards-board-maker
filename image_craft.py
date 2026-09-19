"""Validated image craft inputs and lossless local region compositing.

Capabilities follow Runway /v1/text_to_image and /assets/inputs, checked 2026-09-19.
No network, credentials, model fallback, or provider-native mask is used here.
"""
import base64
import binascii
import hashlib
import io
import json
import math
import re
import warnings
from PIL import Image, ImageChops, ImageFilter

MODEL = 'gpt_image_2_5_sunburst'
SUNBURST_RATIOS = ('1536:1920', '1920:1920', '1920:1280', '2160:3840', '2880:2880', '3840:2160',
    '2048:880', '1920:1088', '1920:1440', '1920:1536', '1440:1920', '1280:1920', '1088:1920',
    '2912:1248', '2560:1440', '2560:1712', '2560:1920', '2560:2048', '2560:2560', '2048:2560',
    '1920:2560', '1712:2560', '1440:2560', '3840:1648', '3504:2336', '3264:2448', '3200:2560',
    '2560:3200', '2448:3264', '2336:3504', 'auto')
GEN4_RATIOS = ('1024:1024', '1080:1080', '1168:880', '1360:768', '1440:1080', '1080:1440',
    '1808:768', '1920:1080', '1080:1920', '2112:912', '1280:720', '720:1280', '720:720',
    '960:720', '720:960', '1680:720')
MAX_SOURCE_BYTES = 84_000_000
MAX_OUTPUT_BYTES = 84_000_000
MAX_MASK_BYTES = 8_000_000
MAX_PIXELS = 20_000_000
MAX_SIDE = 8192
MAX_REFERENCE_URI = 5_000_000
APP_PROMPT_LIMIT = 4000
WHOLE_PREFIX = 'Edit the reference image tagged source. Preserve its composition and unchanged details. Requested change: '
SELECTION_PREFIX = ('Edit the reference image tagged source, a contextual crop of a larger original. '
    'Keep the same framing and geometry; preserve surrounding context, camera and lighting except for the requested change. '
    'Do not add borders or lettering. The app will apply only the selected pixels. Requested change: ')
MODELS = {
    MODEL: {'label': 'GPT Image 2.5 Sunburst', 'ratios': SUNBURST_RATIOS, 'prompt_limit': 32000,
            'prompt_unit': 'characters', 'reference_min': 0, 'reference_max': 16, 'default_ratio': '1536:1920'},
    'gen4_image': {'label': 'Runway Gen-4 Image', 'ratios': GEN4_RATIOS, 'prompt_limit': 1000,
                   'prompt_unit': 'utf16', 'reference_min': 0, 'reference_max': 3, 'default_ratio': '1024:1024'},
    'gen4_image_turbo': {'label': 'Runway Gen-4 Image Turbo', 'ratios': GEN4_RATIOS, 'prompt_limit': 1000,
                         'prompt_unit': 'utf16', 'reference_min': 1, 'reference_max': 3, 'default_ratio': '1024:1024'},
}


def public_models():
    rows = []
    for model, spec in MODELS.items():
        limits = {mode: min(APP_PROMPT_LIMIT, spec['prompt_limit'] - len(prefix))
                  for mode, prefix in [('generate', ''), ('whole', WHOLE_PREFIX), ('selection', SELECTION_PREFIX)]}
        rows.append(dict(spec, id=model, ratios=list(spec['ratios']), provider_prompt_limit=spec['prompt_limit'],
                         input_prompt_limit=min(APP_PROMPT_LIMIT, spec['prompt_limit']), prompt_limits=limits,
                         provider_native_mask=False, modes=['generate', 'whole', 'selection'],
                         quality='high' if model == MODEL else None, price_known=False,
                         reference_extra_credits=1 if model == MODEL else None))
    return {'default_model': MODEL, 'models': rows, 'limits': {'source_bytes': MAX_SOURCE_BYTES,
            'mask_bytes': MAX_MASK_BYTES, 'output_bytes': MAX_OUTPUT_BYTES, 'source_pixels': MAX_PIXELS, 'source_side': MAX_SIDE,
            'provider_reference_uri_chars': MAX_REFERENCE_URI, 'feather_max': 64},
            'capability_source': 'https://docs.dev.runwayml.com/api/',
            'input_source': 'https://docs.dev.runwayml.com/assets/inputs/', 'verified_date': '2026-09-19'}


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def image_uri(image):
    output = io.BytesIO()
    image.save(output, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode('ascii')


def decode_image(uri, *, mask=False, byte_limit=None):
    limit = byte_limit or (MAX_MASK_BYTES if mask else MAX_SOURCE_BYTES)
    if not isinstance(uri, str) or len(uri) > 50 + 4 * ((limit + 2) // 3):
        raise ValueError(f'The image is missing or too large. Choose an image under {limit // 1_000_000} MB.')
    match = re.fullmatch(r'data:image/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/]*={0,2})', uri)
    if not match or (mask and match.group(1) != 'png'):
        raise ValueError('Use a PNG selection mask and a PNG, JPEG or WebP source image, encoded as a data URI.')
    try:
        raw = base64.b64decode(match.group(2), validate=True)
        if not raw or len(raw) > limit:
            raise ValueError('Image size is outside the supported limit.')
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as opened:
                expected = {'png': 'PNG', 'jpeg': 'JPEG', 'jpg': 'JPEG', 'webp': 'WEBP'}[match.group(1)]
                if opened.format != expected or getattr(opened, 'n_frames', 1) != 1:
                    raise ValueError('Image content does not match its declared type, or is animated.')
                if opened.width * opened.height > MAX_PIXELS or max(opened.size) > MAX_SIDE:
                    raise ValueError('Image dimensions exceed 20 million pixels or an 8192-pixel side.')
                # Reject nontrivial EXIF orientation rather than silently changing selection coordinates.
                if opened.getexif().get(274, 1) != 1:
                    raise ValueError('Re-save this image with its orientation applied before editing it.')
                opened.load()
                image = opened.convert('RGBA')
    except (OSError, SyntaxError, binascii.Error, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ValueError('The image could not be decoded safely. Choose a valid static PNG, JPEG or WebP.') from None
    return raw, image


def mask_image(uri, source_size, declared_width, declared_height):
    if (type(declared_width) is not int or type(declared_height) is not int
            or (declared_width, declared_height) != source_size):
        raise ValueError('Selection dimensions must exactly match the original image.')
    raw, image = decode_image(uri, mask=True)
    if image.size != source_size:
        raise ValueError('Selection mask dimensions must exactly match the original image.')
    # The browser contract is opaque black/white PNG. Alpha masks are also accepted
    # when transparent pixels are black and selected pixels are opaque white.
    pixels = image.getdata()
    for r, g, b, a in pixels:
        if (r, g, b, a) not in ((0, 0, 0, 255), (0, 0, 0, 0), (255, 255, 255, 255)):
            raise ValueError('Use a binary mask: opaque white selects, black or transparent black protects.')
    mask = image.convert('L')
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError('Select an area before generating a region edit.')
    return raw, mask, bounds


def make_reference(image, ratio):
    """Letterbox a contextual crop, retaining an invertible mapping to source pixels."""
    width, height = image.size
    rw, rh = (width, height) if ratio == 'auto' else tuple(map(int, ratio.split(':')))
    scale = min(1.0, 2048 / max(rw, rh), max(width / rw, height / rh))
    canvas_size = (max(1, round(rw * scale)), max(1, round(rh * scale)))
    while True:
        fit = min(canvas_size[0] / width, canvas_size[1] / height, 1.0)
        content_size = (max(1, round(width * fit)), max(1, round(height * fit)))
        left, top = (canvas_size[0] - content_size[0]) // 2, (canvas_size[1] - content_size[1]) // 2
        canvas = Image.new('RGBA', canvas_size, (128, 128, 128, 255))
        canvas.paste(image.resize(content_size, Image.Resampling.LANCZOS), (left, top))
        uri = image_uri(canvas)
        if len(uri) <= MAX_REFERENCE_URI:
            return uri, {'reference_size': list(canvas_size),
                         'reference_content_box': [left, top, left + content_size[0], top + content_size[1]],
                         'reference_scale': [content_size[0] / width, content_size[1] / height]}
        if min(canvas_size) <= 64:
            raise ValueError('The reference crop cannot fit the provider input limit.')
        canvas_size = (max(1, int(canvas_size[0] * .8)), max(1, int(canvas_size[1] * .8)))


def prepare(data):
    """Validate before credential access. Return immutable receipt inputs and payload."""
    if not isinstance(data, dict):
        raise ValueError('Image request must be an object.')
    model = data.get('model', MODEL)
    if not isinstance(model, str) or model not in MODELS:
        raise ValueError('Choose a supported image model. No replacement model was selected.')
    spec = MODELS[model]
    mode = data.get('mode', 'generate')
    if mode not in ('generate', 'whole', 'selection'):
        raise ValueError('Choose generate, whole-image edit or selection edit.')
    ratio = data.get('ratio', spec['default_ratio'])
    if not isinstance(ratio, str) or ratio not in spec['ratios']:
        raise ValueError('Choose a documented shape for this model. No replacement shape was selected.')
    prompt = data.get('prompt')
    if not isinstance(prompt, str) or not 10 <= len(prompt.strip()) <= APP_PROMPT_LIMIT:
        raise ValueError('Describe the image in 10–4,000 characters.')
    prompt = prompt.strip()
    provider_prompt = {'generate': '', 'whole': WHOLE_PREFIX, 'selection': SELECTION_PREFIX}[mode] + prompt
    count = len(provider_prompt.encode('utf-16-le')) // 2 if spec['prompt_unit'] == 'utf16' else len(provider_prompt)
    if count > spec['prompt_limit']:
        raise ValueError('This model prompt is too long, including the edit instructions. Shorten it or explicitly choose another model.')
    source = data.get('source')
    selection = data.get('selection')
    if mode != 'selection' and selection is not None:
        raise ValueError('Selection data is only allowed in selection edit mode.')
    if mode in ('whole', 'selection') and not source:
        raise ValueError('Choose a source image before editing.')
    if model == 'gen4_image_turbo' and not source:
        raise ValueError('Gen-4 Image Turbo requires a reference image. Choose one or explicitly select another model.')
    job = {'model': model, 'mode': mode, 'prompt': prompt, 'ratio': ratio, 'provenance': 'ai_concept',
           'source_hash': None, 'mask_hash': None}
    payload = {'model': model, 'promptText': provider_prompt, 'ratio': ratio}
    if model == MODEL:
        payload.update(quality='high', outputCount=1, background='opaque')
    if source is not None:
        source_raw, source_image = decode_image(source)
        job.update(source=source, source_hash=digest(source_raw), source_dimensions=list(source_image.size))
        if mode == 'selection':
            if not isinstance(selection, dict) or selection.get('kind') not in ('rectangle', 'lasso', 'brush'):
                raise ValueError('Choose a rectangle, lasso or brush selection.')
            feather = selection.get('feather', 0)
            if type(feather) not in (int, float) or not math.isfinite(feather) or not 0 <= feather <= 64:
                raise ValueError('Feather must be between 0 and 64 source-image pixels.')
            mask_raw, mask, bounds = mask_image(selection.get('mask'), source_image.size,
                                               selection.get('width'), selection.get('height'))
            padding = max(16, math.ceil(max(bounds[2] - bounds[0], bounds[3] - bounds[1]) * .2))
            crop = (max(0, bounds[0] - padding), max(0, bounds[1] - padding),
                    min(source_image.width, bounds[2] + padding), min(source_image.height, bounds[3] + padding))
            reference, mapping = make_reference(source_image.crop(crop), ratio)
            job.update(selection=dict(selection, feather=feather), mask_hash=digest(mask_raw),
                       edit_metadata=dict(mapping, crop_box=list(crop), selection_box=list(bounds),
                                          source_size=list(source_image.size), context_padding=padding,
                                          provider_native_mask=False, composite='local_original_mask', feather=feather))
        else:
            if len(source) > MAX_REFERENCE_URI:
                reference, mapping = make_reference(source_image, 'auto')
            else:
                reference = source
                mapping = {'reference_size': list(source_image.size),
                           'reference_content_box': [0, 0, source_image.width, source_image.height],
                           'reference_scale': [1.0, 1.0]}
            job['reference_metadata'] = dict(mapping, source_size=list(source_image.size),
                                             reference_reduced=(mapping['reference_size'] != list(source_image.size)),
                                             original_preserved=True)
        payload['referenceImages'] = [{'uri': reference, 'tag': 'source'}]
    canonical = {k: job.get(k) for k in ('model', 'mode', 'prompt', 'ratio', 'source_hash', 'mask_hash')}
    if selection is not None:
        canonical['selection'] = {k: job['selection'][k] for k in ('kind', 'width', 'height', 'feather')}
    # Optional caller snapshot binds the request to a board/version without trusting its contents as commands.
    snapshot = data.get('snapshot')
    if snapshot is not None:
        if not isinstance(snapshot, (str, dict)):
            raise ValueError('The image snapshot must be text or an object.')
        try:
            serialized = json.dumps(snapshot, sort_keys=True, separators=(',', ':'), allow_nan=False)
        except (TypeError, ValueError):
            raise ValueError('The image snapshot must contain valid JSON.') from None
        if len(serialized) > 32_000:
            raise ValueError('The image snapshot is too large.')
        canonical['snapshot'] = snapshot
        job['snapshot'] = snapshot
    job['snapshot_hash'] = digest(json.dumps(canonical, sort_keys=True, separators=(',', ':'), allow_nan=False).encode())
    job['request_fingerprint'] = job['snapshot_hash']
    return job, payload


def validate_output_dimensions(job, image):
    """Explicit ratios are native pixel sizes; auto accepts only documented native outputs."""
    ratio = job['ratio']
    if ratio == 'auto':
        supported = {tuple(map(int, item.split(':'))) for item in MODELS[job['model']]['ratios'] if item != 'auto'}
        valid = image.size in supported
        expected = 'a documented native size for automatic framing'
    else:
        expected_size = tuple(map(int, ratio.split(':')))
        valid = image.size == expected_size
        expected = f'{expected_size[0]} × {expected_size[1]}'
    if not valid:
        raise ValueError(f'Provider output is {image.width} × {image.height}; this request requires {expected}. '
                         'The provider image is retained locally for review, and the original is unchanged. '
                         'No automatic retry will be sent.')


def composite_selection(job, generated_uri):
    """Only original selected pixels can change; outside RGBA bytes remain identical."""
    _, source = decode_image(job['source'])
    selection = job['selection']
    _, mask, _ = mask_image(selection['mask'], source.size, selection['width'], selection['height'])
    _, generated = decode_image(generated_uri, byte_limit=MAX_OUTPUT_BYTES)
    validate_output_dimensions(job, generated)
    metadata = job['edit_metadata']
    reference_size = tuple(metadata['reference_size'])
    mapped = generated.resize(reference_size, Image.Resampling.LANCZOS)
    patch = mapped.crop(tuple(metadata['reference_content_box']))
    crop = tuple(metadata['crop_box'])
    patch = patch.resize((crop[2] - crop[0], crop[3] - crop[1]), Image.Resampling.LANCZOS)
    local_mask = mask.crop(crop)
    if selection['feather']:
        # Blur and then intersect with the original binary mask: no outward pixels can change.
        local_mask = ImageChops.multiply(local_mask.filter(ImageFilter.GaussianBlur(selection['feather'])), local_mask)
    original_crop = source.crop(crop)
    source.paste(Image.composite(patch, original_crop, local_mask), crop[:2])
    output = image_uri(source)
    if len(output) > 50 + 4 * ((MAX_OUTPUT_BYTES + 2) // 3):
        raise ValueError('The lossless composite exceeds the supported output size. The original is unchanged.')
    metadata = dict(metadata, generated_size=list(generated.size), output_size=list(source.size),
                    output_format='PNG', outside_selection='original RGBA pixels preserved')
    return output, metadata
