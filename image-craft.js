/* Local image craft. Pure helpers also run under Node; UI never submits implicitly. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ImageCraft = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FORMAT = 'awards-image-craft-v1';
  const MAX_IMAGE_BYTES = 84_000_000; // Bounded decoded output; source and output share the backend roundtrip cap.
  const MAX_BUNDLE_CHARS = 240_000_000;
  const ID = /^[a-f0-9]{32}$/;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function uid() { return crypto.randomUUID().replaceAll('-', ''); }
  function imageBytes(uri) {
    if (typeof uri !== 'string' || uri.length > MAX_IMAGE_BYTES * 4 / 3 + 100 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]*={0,2}$/.test(uri)) return Infinity;
    const body = uri.slice(uri.indexOf(',') + 1);
    if (body.length % 4) return Infinity;
    return body.length * 3 / 4 - (body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0);
  }
  function safeImage(uri, max = MAX_IMAGE_BYTES) { return imageBytes(uri) <= max; }
  function dimensions(width, height, limits = {}) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        width * height > (limits.source_pixels || 20_000_000) || Math.max(width, height) > (limits.source_side || 8192)) {
      throw new Error('Use an image up to 20 megapixels and 8192 pixels on either side.');
    }
  }
  function containRect(sw, sh, width, height) {
    if (![sw, sh, width, height].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid image/view dimensions.');
    const scale = Math.min(width / sw, height / sh);
    return { x: (width - sw * scale) / 2, y: (height - sh * scale) / 2, width: sw * scale, height: sh * scale, scale };
  }
  function mapPoint(clientX, clientY, rect, sw, sh, clampOutside = false) {
    const fit = containRect(sw, sh, rect.width, rect.height);
    const x = (clientX - rect.left - fit.x) / fit.scale, y = (clientY - rect.top - fit.y) / fit.scale;
    if (!clampOutside && (x < 0 || y < 0 || x > sw || y > sh)) return null;
    return { x: clamp(x, 0, sw), y: clamp(y, 0, sh) };
  }
  function normalizeRect(a, b, width, height) {
    const x = clamp(Math.floor(Math.min(a.x, b.x)), 0, width);
    const y = clamp(Math.floor(Math.min(a.y, b.y)), 0, height);
    return { x, y, width: clamp(Math.ceil(Math.max(a.x, b.x)), x, width) - x,
      height: clamp(Math.ceil(Math.max(a.y, b.y)), y, height) - y };
  }
  function validSelection(s, width, height) {
    if (!s || !['rectangle', 'lasso', 'brush'].includes(s.kind)) throw new Error('Choose a selection tool.');
    const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.y >= 0 && p.x <= width && p.y <= height;
    if (s.kind === 'rectangle') {
      const r = s.rect;
      if (!r || ![r.x, r.y, r.width, r.height].every(Number.isInteger) || r.x < 0 || r.y < 0 || r.width < 1 || r.height < 1 || r.x + r.width > width || r.y + r.height > height) throw new Error('Enter a rectangle wholly inside the source image, with width and height above zero.');
    } else if (s.kind === 'lasso') {
      if (!Array.isArray(s.points) || s.points.length < 3 || s.points.length > 10000 || !s.points.every(point)) throw new Error('Draw a closed lasso with at least three points inside the image.');
    } else if (!Array.isArray(s.strokes) || !s.strokes.length || s.strokes.length > 200 || !s.strokes.every(st => Number.isFinite(st.radius) && st.radius >= 1 && st.radius <= 1024 && Array.isArray(st.points) && st.points.length > 0 && st.points.length <= 10000 && st.points.every(point))) throw new Error('Paint a selection on the image.');
    return s;
  }
  // Pixel-centre sampling produces an exact binary mask; feathering belongs to the backend.
  function rasterizeMask(width, height, selection) {
    dimensions(width, height); validSelection(selection, width, height);
    const out = new Uint8Array(width * height);
    if (selection.kind === 'rectangle') {
      const r = selection.rect;
      for (let y = r.y; y < r.y + r.height; y++) out.fill(255, y * width + r.x, y * width + r.x + r.width);
    } else if (selection.kind === 'lasso') {
      const points = selection.points;
      const minY = clamp(Math.floor(Math.min(...points.map(p => p.y))), 0, height - 1);
      const maxY = clamp(Math.ceil(Math.max(...points.map(p => p.y))), 0, height);
      for (let y = minY; y < maxY; y++) {
        const crosses = [], py = y + .5;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i], b = points[j];
          if ((a.y > py) !== (b.y > py)) crosses.push(a.x + (py - a.y) * (b.x - a.x) / (b.y - a.y));
        }
        crosses.sort((a, b) => a - b);
        for (let i = 0; i + 1 < crosses.length; i += 2) {
          const left = clamp(Math.ceil(crosses[i] - .5), 0, width), right = clamp(Math.ceil(crosses[i + 1] - .5), 0, width);
          out.fill(255, y * width + left, y * width + right);
        }
      }
    } else {
      for (const stroke of selection.strokes) {
        for (let i = 0; i < stroke.points.length; i++) {
          const a = stroke.points[Math.max(0, i - 1)], b = stroke.points[i], r = stroke.radius;
          const minX = clamp(Math.floor(Math.min(a.x, b.x) - r), 0, width), maxX = clamp(Math.ceil(Math.max(a.x, b.x) + r), 0, width);
          const minY = clamp(Math.floor(Math.min(a.y, b.y) - r), 0, height), maxY = clamp(Math.ceil(Math.max(a.y, b.y) + r), 0, height);
          const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy;
          for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) {
            const t = len ? clamp(((x + .5 - a.x) * dx + (y + .5 - a.y) * dy) / len, 0, 1) : 0;
            if ((x + .5 - a.x - t * dx) ** 2 + (y + .5 - a.y - t * dy) ** 2 <= r * r) out[y * width + x] = 255;
          }
        }
      }
    }
    if (!out.some(Boolean)) throw new Error('The selection is empty. Select an area containing at least one pixel.');
    return out;
  }
  function promptCount(text, unit) { return unit === 'utf16' ? text.length : Array.from(text).length; }
  function placementQuality(sw, sh, boxWidth, boxHeight, fit = 'contain', exportScale = 5) {
    if (![sw, sh, boxWidth, boxHeight, exportScale].every(n => Number.isFinite(n) && n > 0)) return null;
    const scale = (fit === 'cover' ? Math.max : Math.min)(boxWidth / sw, boxHeight / sh);
    return { sourceWidth: sw, sourceHeight: sh, placedWidth: sw * scale * exportScale, placedHeight: sh * scale * exportScale,
      visibleSourceWidth: Math.min(sw, boxWidth / scale), visibleSourceHeight: Math.min(sh, boxHeight / scale), enlargement: scale * exportScale };
  }
  function canApply(proposal, activeId) { return !!proposal && proposal.status === 'proposed' && proposal.baseId === (activeId || null); }
  function validateBundle(bundle) {
    if (!bundle || bundle.format !== FORMAT || !bundle.session || !Array.isArray(bundle.assets) || bundle.assets.length > 100) throw new Error('Unsupported image history.');
    const session = bundle.session;
    if (!Array.isArray(session.revisions) || session.revisions.length > 500 || !Array.isArray(session.proposals) || session.proposals.length > 100) throw new Error('Invalid image history records.');
    let total = 0;
    const assetIds = new Set();
    for (const a of bundle.assets) {
      if (!a || !ID.test(a.id) || assetIds.has(a.id) || !safeImage(a.data) || !['uploaded', 'ai_concept'].includes(a.provenance)) throw new Error('Invalid image-history asset.');
      dimensions(a.width, a.height); total += a.data.length; assetIds.add(a.id);
      if (total > MAX_BUNDLE_CHARS) throw new Error('Image-history file is too large. Keep it below 240 MB of text.');
    }
    const revisionIds = new Set();
    for (const r of session.revisions) {
      if (!r || !ID.test(r.id) || revisionIds.has(r.id) || !assetIds.has(r.assetId) || (r.parentId !== null && !revisionIds.has(r.parentId))) throw new Error('Invalid image revision links.');
      if (typeof r.label !== 'string' || r.label.length > 500 || typeof r.created !== 'string') throw new Error('Invalid image revision description.');
      revisionIds.add(r.id);
    }
    if (session.undoStack && (!Array.isArray(session.undoStack) || !session.undoStack.every(id => revisionIds.has(id)))) throw new Error('Invalid undo history.');
    if (session.activeId !== null && !revisionIds.has(session.activeId)) throw new Error('Missing active image revision.');
    for (const p of session.proposals) {
      if (!p || !ID.test(p.id) || !assetIds.has(p.assetId) || !['proposed', 'accepted', 'rejected'].includes(p.status) || (p.baseId !== null && !revisionIds.has(p.baseId))) throw new Error('Invalid image proposal.');
    }
    if (session.receipts !== undefined && (!Array.isArray(session.receipts) || session.receipts.length > 1000)) throw new Error('Invalid saved request history.');
    for (const receipt of [session.pending, ...(session.receipts || [])].filter(r => r !== null && r !== undefined)) {
      if (!receipt || !ID.test(receipt.id) || (receipt.baseId !== null && !revisionIds.has(receipt.baseId)) || (receipt.sourceAssetId && !assetIds.has(receipt.sourceAssetId))) throw new Error('Invalid request receipt.');
      if (receipt.selection) {
        if (!safeImage(receipt.selection.mask, 8_000_000) || !['rectangle','lasso','brush'].includes(receipt.selection.kind)) throw new Error('Invalid saved selection mask.');
        dimensions(receipt.selection.width, receipt.selection.height);
        if (!Number.isInteger(receipt.selection.feather) || receipt.selection.feather < 0 || receipt.selection.feather > 64) throw new Error('Invalid saved feather.');
      }
    }
    if (session.selection) {
      const revision = session.revisions.find(r => r.id === session.activeId), selectedAsset = revision && bundle.assets.find(a => a.id === revision.assetId);
      if (!selectedAsset) throw new Error('Selection has no source image.');
      validSelection(session.selection, selectedAsset.width, selectedAsset.height);
    }
    if (session.zoom !== undefined && (!Number.isFinite(session.zoom) || session.zoom < 1 || session.zoom > 3)) throw new Error('Invalid saved zoom.');
    if (session.feather !== undefined && (!Number.isInteger(session.feather) || session.feather < 0 || session.feather > 64)) throw new Error('Invalid saved feather.');
    if (session.mode !== undefined && !['generate','whole','selection'].includes(session.mode)) throw new Error('Invalid saved image action.');
    for (const key of ['prompt', 'model', 'ratio', 'mode']) if (session[key] !== undefined && (typeof session[key] !== 'string' || session[key].length > 4000)) throw new Error('Invalid image settings.');
    // Return a new ordinary JSON object: imported objects never become executable UI markup.
    return JSON.parse(JSON.stringify(bundle));
  }
  function reconcileHero(board, image) {
    const hero = image?.data || '', heroSource = image?.source || null;
    const changed = (board.hero || '') !== hero || (board.heroSource?.imageRevisionId || null) !== (heroSource?.imageRevisionId || null);
    return { changed, state: changed ? { ...board, hero, heroSource, versions: (board.versions || []).map(v => ({ ...v, approved: false })) } : board };
  }
  function rekeyBundle(input, makeId) {
    const b = validateBundle(input), ids = new Map();
    for (const asset of b.assets) { const old = asset.id; asset.id = makeId(); if (!ID.test(asset.id)) throw new Error('Invalid new asset identifier.'); ids.set(old, asset.id); }
    for (const revision of b.session.revisions) revision.assetId = ids.get(revision.assetId);
    for (const proposal of b.session.proposals) proposal.assetId = ids.get(proposal.assetId);
    for (const receipt of [b.session.pending, ...(b.session.receipts || [])].filter(Boolean)) if (receipt.sourceAssetId) { if (!ids.has(receipt.sourceAssetId)) throw new Error('Missing receipt source image.'); receipt.sourceAssetId = ids.get(receipt.sourceAssetId); }
    return b;
  }
  let dbPromise;
  function database() {
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('awards-board-studio-assets', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('records');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error('Local image storage is unavailable. Enable browser storage before requesting a paid image.'));
    });
    return dbPromise;
  }
  async function get(key) { const db = await database(); return new Promise((resolve, reject) => { const r = db.transaction('records').objectStore('records').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
  async function putMany(entries) {
    const db = await database();
    return new Promise((resolve, reject) => { const tx = db.transaction('records', 'readwrite'); for (const [key, value] of entries) tx.objectStore('records').put(value, key); tx.oncomplete = resolve; tx.onabort = tx.onerror = () => reject(new Error('Local storage could not save this change. Keep this tab open and export your project.')); });
  }
  async function loadImage(uri, limits) {
    if (!safeImage(uri)) throw new Error('Unsupported or oversized image data.');
    const image = new Image(); image.src = uri; await image.decode(); dimensions(image.naturalWidth, image.naturalHeight, limits); return image;
  }
  function newSession() { return { projectId: uid(), revisions: [], proposals: [], activeId: null, undoStack: [], pending: null, prompt: '', mode: 'generate', model: '', ratio: '', selection: null, feather: 0, zoom: 1 }; }
  async function mount(options) {
    const $ = id => document.getElementById(id), node = (tag, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; };
    let session = newSession(), models = null, source = null, bitmap = null, drawing = null, zoom = 1, watchToken = 0, watching = false, submitting = false, saveTimer, activeProposal = null;
    const cache = new Map();
    function assertSession(origin) { if (session !== origin) throw new Error('The project changed while this image operation was running. The newer project was preserved.'); }
    const status = message => { $('image-status').textContent = message; };
    const save = () => putMany([['craft:' + session.projectId, session]]);
    const persistSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => save().catch(e => status(e.message)), 400); };
    const active = () => session.revisions.find(r => r.id === session.activeId);
    const chosen = () => models?.models.find(m => m.id === $('image-model').value);
    async function asset(id) { if (!cache.has(id)) cache.set(id, await get('asset:' + id)); return cache.get(id); }
    function syncActions() {
      const unresolved = session.pending && !['SUCCEEDED', 'FAILED', 'CANCELED', 'DISMISSED'].includes(session.pending.status);
      $('create-image').disabled = !models || !chosen() || models.configured === false || submitting || !!unresolved;
      $('resume-image').hidden = !session.pending;
      $('resume-image').disabled = submitting || watching;
      $('stop-image-watch').hidden = !watching;
      $('dismiss-image-receipt').hidden = !session.pending || watching || submitting || session.pending.status === 'SUCCEEDED';
      $('create-image').textContent = session.mode === 'generate' ? 'Generate with Runway · paid' : 'Edit with Runway · paid';
      $('image-selection-tools').hidden = session.mode !== 'selection';
      $('image-stage-wrap').hidden = !source;
      $('image-empty').hidden = !!source;
      $('image-quality').hidden = !source;
      $('image-undo').disabled = !(session.undoStack?.length);
      $('image-history-select').disabled = !session.revisions.length;
      $('image-restore').disabled = !session.revisions.length;
    }
    function settings() {
      session.prompt = $('image-prompt').value; session.mode = $('image-mode').value; session.model = $('image-model').value; session.ratio = $('image-ratio').value; session.feather = Number($('image-feather').value) || 0;
      const m = chosen(), limit = m?.prompt_limits?.[session.mode] ?? m?.input_prompt_limit ?? 4000;
      const count = promptCount(session.prompt.trim(), m?.prompt_unit);
      $('image-prompt-count').textContent = `${count} / ${limit} ${m?.prompt_unit === 'utf16' ? 'UTF-16 units' : 'characters'} for this action.`;
      $('image-prompt').setAttribute('aria-invalid', String(count > limit));
      const sends = session.mode === 'selection' ? 'your instructions and a contextual crop of this image' : session.mode === 'whole' || m?.reference_min > 0 ? 'your instructions and this image' : 'your instructions';
      $('image-transfer').textContent = `Only Generate or Edit sends ${sends} to Runway. Uploads, drawing and history stay in this browser. Runway may receive a reduced-resolution reference to meet its input limit; your original stays intact. Selected edits use local compositing, not provider-native inpainting.`;
      $('image-cost').textContent = `Paid request. Base price is not verified; check your Runway balance. ${m?.reference_extra_credits === 1 && (session.mode !== 'generate' || m.reference_min > 0) ? 'Sunburst adds 1 credit for the reference image.' : ''} Large native dimensions are an explicit choice and may cost more. No model or size fallback.`;
      syncActions(); persistSoon();
    }
    function fillRatios(preferred) {
      const m = chosen(); if (!m) return;
      $('image-ratio').replaceChildren(...m.ratios.map(r => { const op = node('option', (r !== 'auto' && (Math.max(...r.split(':').map(Number)) > 2048 || r.split(':').map(Number).reduce((a,b)=>a*b,1) > 4_000_000)) ? `Large native · ${r.replace(':', ' × ')}` : r === 'auto' ? 'Auto dimensions (provider chooses)' : `Standard / native · ${r.replace(':', ' × ')}`); op.value = r; return op; }));
      $('image-ratio').value = m.ratios.includes(preferred) ? preferred : m.default_ratio;
      if (preferred && !m.ratios.includes(preferred)) status('The selected model has different shapes. Its documented default is shown; review before submitting.');
    }
    function redraw() {
      const canvas = $('image-canvas'); if (!bitmap) return;
      const baseWidth = Math.max(240, $('image-stage-wrap').clientWidth - 2), baseHeight = Math.min(460, Math.max(260, baseWidth * .64));
      canvas.width = Math.round(baseWidth * zoom); canvas.height = Math.round(baseHeight * zoom); canvas.style.width = canvas.width + 'px'; canvas.style.height = canvas.height + 'px';
      const ctx = canvas.getContext('2d'), fit = containRect(bitmap.naturalWidth, bitmap.naturalHeight, canvas.width, canvas.height);
      ctx.fillStyle = '#e6e9df'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, fit.x, fit.y, fit.width, fit.height);
      const selection = drawing?.selection || session.selection; if (!selection) return;
      ctx.save(); ctx.beginPath(); ctx.rect(fit.x, fit.y, fit.width, fit.height); ctx.clip(); ctx.translate(fit.x, fit.y); ctx.scale(fit.scale, fit.scale);
      ctx.fillStyle = 'rgba(16,150,210,.28)'; ctx.strokeStyle = '#047ca8'; ctx.lineWidth = 2 / fit.scale;
      if (selection.kind === 'rectangle' && selection.rect) { const r = selection.rect; ctx.fillRect(r.x, r.y, r.width, r.height); ctx.strokeRect(r.x, r.y, r.width, r.height); }
      if (selection.kind === 'lasso' && selection.points?.length) { ctx.beginPath(); selection.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      if (selection.kind === 'brush') for (const stroke of selection.strokes || []) { ctx.strokeStyle = 'rgba(0,140,195,.42)'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = stroke.radius * 2; ctx.beginPath(); stroke.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); if (stroke.points.length === 1) { const p = stroke.points[0]; ctx.lineTo(p.x + .001, p.y); } ctx.stroke(); }
      ctx.restore();
    }
    function updateRectFields() {
      const r = session.selection?.rect || { x: 0, y: 0, width: 0, height: 0 };
      for (const k of ['x', 'y', 'width', 'height']) $('image-rect-' + k).value = r[k];
      $('image-selection-status').textContent = session.selection ? `${session.selection.kind} selection saved in source pixels. Blue overlay marks selected area.` : 'No area selected. Draw on the image or enter a rectangle below.';
    }
    async function loadSource() {
      source = active() ? await asset(active().assetId) : null;
      bitmap = source ? await loadImage(source.data) : null;
      $('image-source-label').textContent = source ? `${source.width} × ${source.height} source pixels · ${source.provenance === 'ai_concept' ? 'AI concept' : 'Uploaded image; provenance not verified'}` : 'No image selected';
      syncActions(); redraw(); quality();
    }
    function history() {
      $('image-history-select').replaceChildren(...session.revisions.map((r, i) => { const op = node('option', `${i + 1}. ${r.label}${r.id === session.activeId ? ' (current)' : ''}`); op.value = r.id; return op; }));
      $('image-history-select').value = session.activeId || '';
      $('image-history-count').textContent = `${session.revisions.length} image revisions. Restoring adds a revision and preserves later work.`;
      const list = $('image-proposal-list'); list.replaceChildren();
      for (const p of session.proposals.slice().reverse()) { const b = node('button', `${p.status === 'proposed' ? 'Review' : 'View'} ${p.mode || 'generated'} image · ${p.status}`); b.type = 'button'; b.addEventListener('click', () => showProposal(p)); list.append(b); }
      for (const receipt of session.receipts || []) {
        const b = node('button', `Check saved request · ${receipt.id.slice(0,8)}`); b.type = 'button';
        b.addEventListener('click', async () => {
          if (watching || submitting) { status('Stop local checking before opening another receipt.'); return; }
          const prior = session.pending; session.receipts = session.receipts.filter(r => r.id !== receipt.id);
          if (prior && prior.id !== receipt.id) session.receipts.push(prior);
          session.pending = receipt; await save(); history(); syncActions(); await watch();
        }); list.append(b);
      }
    }
    async function showProposal(p) {
      activeProposal = p;
      const after = await asset(p.assetId), beforeRevision = session.revisions.find(r => r.id === p.baseId), before = beforeRevision ? await asset(beforeRevision.assetId) : null;
      $('image-before').hidden = !before; if (before) $('image-before').src = before.data;
      $('image-before-empty').hidden = !!before; $('generated-image').src = after.data; $('image-proposal').hidden = false;
      $('image-proposal-detail').textContent = `${p.model || 'Recorded model'} · ${p.mode || 'generate'} · AI concept. ${p.status === 'proposed' ? 'Your board is unchanged.' : `Recorded decision: ${p.status}.`} ${p.edit_metadata ? 'A crop was processed and composited locally. ' : ''}${p.prompt || ''}`;
      const stale = !canApply(p, session.activeId);
      $('image-conflict').textContent = p.status === 'proposed' && stale ? 'The source changed after this request. Apply is blocked. Restore the request source in history and make a new request; this proposal stays saved.' : '';
      $('use-image').disabled = stale; $('keep-image').disabled = p.status !== 'proposed';
    }
    async function addAsset(data, provenance, metadata = {}) {
      const origin = session, img = await loadImage(data); assertSession(origin); const safeMetadata = {};
      for (const key of ['model','prompt','jobId','source_hash','mask_hash','snapshot_hash']) if (typeof metadata[key] === 'string') safeMetadata[key] = metadata[key].slice(0,4000);
      const a = { ...safeMetadata, id: uid(), data, width: img.naturalWidth, height: img.naturalHeight, provenance };
      await putMany([['asset:' + a.id, a]]); assertSession(origin); cache.set(a.id, a); return a;
    }
    async function applyRevision(assetId, label, extra = {}) {
      $('image-paid-consent').checked = false;
      const origin = session, a = await asset(assetId); assertSession(origin); const revision = { id: uid(), assetId, parentId: session.activeId, label: label.slice(0,500), created: new Date().toISOString(), ...extra };
      session.undoStack ||= []; if (extra.historyAction !== 'undo' && session.activeId) session.undoStack.push(session.activeId);
      session.revisions.push(revision); session.activeId = revision.id; session.selection = null;
      await save(); assertSession(origin); await options.apply(a.data, { kind: a.provenance === 'ai_concept' ? 'generated' : 'uploaded', provenance: a.provenance, model: a.model, prompt: a.prompt, job: a.jobId, imageRevisionId: revision.id });
      assertSession(origin); history(); updateRectFields(); await loadSource(); return revision;
    }
    async function attach(data, metadata = {}, label = 'Uploaded original') {
      const origin = session, a = await addAsset(data, metadata.kind === 'generated' || metadata.provenance === 'ai_concept' ? 'ai_concept' : 'uploaded', metadata);
      assertSession(origin); await applyRevision(a.id, label); status('Image saved locally. Drawing and instructions stay local until you choose Generate or Edit.');
    }
    function quality() {
      if (!source) return;
      const placement = options.placement?.(), q = placement && placementQuality(source.width, source.height, placement.width, placement.height, placement.fit, 5);
      $('image-quality').textContent = q ? `Source ${source.width} × ${source.height}px. Current board framing uses about ${Math.round(q.visibleSourceWidth)} × ${Math.round(q.visibleSourceHeight)} source pixels, placed at ${Math.round(q.placedWidth)} × ${Math.round(q.placedHeight)}px in the 7000 × 4950 raster export (${q.enlargement.toFixed(2)}× sampling scale). Dimensions do not prove detail or print clarity. Inspect the actual export.` : `Source ${source.width} × ${source.height}px. Generate a board to measure its actual image placement. Export quality is not yet checked.`;
    }
    function makeMask() {
      if (!source) throw new Error('Upload or apply an image before selecting an area.');
      const values = rasterizeMask(source.width, source.height, session.selection), canvas = document.createElement('canvas');
      canvas.width = source.width; canvas.height = source.height;
      const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(canvas.width, canvas.height);
      for (let i = 0; i < values.length; i++) { pixels.data[i * 4] = pixels.data[i * 4 + 1] = pixels.data[i * 4 + 2] = values[i]; pixels.data[i * 4 + 3] = 255; }
      ctx.putImageData(pixels, 0, 0);
      const mask = canvas.toDataURL('image/png'); if (!safeImage(mask, models.limits.mask_bytes)) throw new Error('The selection mask is too large. Simplify it before requesting an edit.');
      return { kind: session.selection.kind, mask, width: source.width, height: source.height, feather: session.feather };
    }
    async function acceptJob(job) {
      if (!session.pending || job.id !== session.pending.id) throw new Error('The returned receipt does not match this request.');
      if (!safeImage(job.image)) throw new Error('The image response is unsupported or too large. The receipt is retained.');
      if (session.proposals.some(p => p.id === job.id)) { session.pending.status = 'SUCCEEDED'; await save(); await showProposal(session.proposals.find(p => p.id === job.id)); return; }
      const a = await addAsset(job.image, 'ai_concept', { model: job.model, prompt: job.prompt, jobId: job.id, source_hash: job.source_hash, mask_hash: job.mask_hash, snapshot_hash: job.snapshot_hash });
      const { image, ...receipt } = job;
      const p = { ...receipt, id: job.id, assetId: a.id, baseId: session.pending.baseId, status: 'proposed', created: new Date().toISOString() };
      session.proposals.push(p); session.pending.status = 'SUCCEEDED'; await save(); history(); await showProposal(p); status('Image ready for before/after review. Apply or reject it; your board is unchanged.');
    }
    async function watch() {
      if (!session.pending || watching) return;
      const token = ++watchToken, receiptId = session.pending.id;
      watching = true; syncActions();
      try {
        for (let i = 0; i < 120 && token === watchToken; i++) {
          const job = await options.api('/api/image-jobs/' + receiptId);
          if (token !== watchToken) return;
          if (job.status === 'SUCCEEDED') { await acceptJob(job); return; }
          session.pending.status = job.status || 'UNKNOWN'; await save();
          if (['FAILED', 'CANCELED', 'UNCONFIRMED'].includes(job.status)) { status(job.message || 'This request did not complete. The receipt is preserved.'); return; }
          status('Runway is processing the saved request. You can keep working; checking again will not submit it twice.');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        if (token === watchToken) status('Still waiting. Check existing request to resume without another submission.');
      } catch (e) { status(e.message + ' The request receipt is saved. Check existing request; do not resubmit.'); }
      finally { if (token === watchToken) { watching = false; syncActions(); } }
    }
    async function submit() {
      if (submitting || $('create-image').disabled) return;
      settings(); const m = chosen(); if (!m) return;
      try {
        const prompt = session.prompt.trim(), count = promptCount(prompt, m.prompt_unit), limit = m.prompt_limits?.[session.mode] ?? m.input_prompt_limit;
        if (!Number.isInteger(session.feather) || session.feather < 0 || session.feather > (models.limits.feather_max || 64)) throw new Error('Use a whole-number feather from 0 to 64 source pixels.');
        if (prompt.length < 10 || count > limit) throw new Error(`Use at least 10 characters and no more than ${limit} ${m.prompt_unit === 'utf16' ? 'UTF-16 units' : 'characters'} for these instructions.`);
        if (!m.ratios.includes(session.ratio)) throw new Error('Choose a supported shape explicitly.');
        const needsSource = session.mode !== 'generate' || m.reference_min > 0;
        if (needsSource && !source) throw new Error('This action/model requires an image. Upload or apply one first.');
        if (needsSource && !safeImage(source.data, models.limits.source_bytes)) throw new Error('This image exceeds the current edit-input byte limit. Keep the original and upload an explicitly prepared smaller file; no automatic source reduction was applied.');
        if (!$('image-paid-consent').checked) throw new Error('Confirm the displayed Runway transfer and paid request before submitting.');
        const request = { id: uid(), prompt, ratio: session.ratio, model: m.id, mode: session.mode };
        if (needsSource) request.source = source.data;
        if (session.mode === 'selection') request.selection = makeMask();
        const { source: ignored, ...snapshot } = request;
        submitting = true; clearTimeout(saveTimer);
        if (session.pending) { session.receipts ||= []; if (!session.receipts.some(r => r.id === session.pending.id)) session.receipts.push(session.pending); }
        session.pending = { ...snapshot, sourceAssetId: needsSource ? source.id : null, baseId: session.activeId, status: 'SUBMITTING', created: new Date().toISOString() };
        await save(); // Receipt + immutable input snapshot durable BEFORE any paid POST.
        localStorage.setItem('awards-board-image-job', request.id);
        syncActions(); status('Saved request receipt. Sending this explicit paid request to Runway…');
        const job = await options.api('/api/create-image', request);
        session.pending.status = job.status || 'UNKNOWN'; await save();
        $('image-paid-consent').checked = false;
        if (job.status === 'SUCCEEDED') await acceptJob(job);
        else if (['UNCONFIRMED', 'FAILED', 'CANCELED'].includes(job.status)) status(job.message || 'Request did not complete. Keep the receipt and check its status.');
        else await watch();
      } catch (e) { status(e.message); }
      finally { submitting = false; syncActions(); }
    }
    $('image-model').addEventListener('change', () => { fillRatios(null); $('image-paid-consent').checked = false; settings(); });
    ['image-prompt', 'image-mode', 'image-ratio', 'image-feather'].forEach(id => $(id).addEventListener('input', () => { $('image-paid-consent').checked = false; settings(); }));
    $('create-image').addEventListener('click', submit);
    $('resume-image').addEventListener('click', watch);
    $('stop-image-watch').addEventListener('click', () => { watchToken++; watching = false; syncActions(); status('Stopped checking locally. This does not cancel Runway processing or billing. The receipt is saved; check it later.'); });
    $('dismiss-image-receipt').addEventListener('click', async () => { // Archiving is local and reversible; a new paid operation still needs explicit consent.
      session.receipts ||= []; session.receipts.push(session.pending); session.pending = null; await save(); history(); syncActions(); status('Previous receipt preserved in exported history. A new request will be a separate paid action.'); });
    $('use-image').addEventListener('click', async () => {
      try { if (!canApply(activeProposal, session.activeId)) throw new Error('The source changed. This proposal cannot overwrite it.');
        const p = activeProposal; await applyRevision(p.assetId, `${p.mode || 'Generated'} · ${p.model || 'AI concept'}`, { proposalId: p.id }); p.status = 'accepted'; await save(); history(); await showProposal(p); status('Image applied. Logo, typography and copy were preserved. Undo image or restore a revision at any time.');
      } catch (e) { status(e.message); }
    });
    $('keep-image').addEventListener('click', async () => { if (!activeProposal || activeProposal.status !== 'proposed') return; activeProposal.status = 'rejected'; await save(); history(); await showProposal(activeProposal); status('Proposal rejected. Your current image and the proposal are both preserved.'); });
    $('image-undo').addEventListener('click', async () => { try { const targetId = session.undoStack?.pop(); const previous = session.revisions.find(r => r.id === targetId); if (!previous) return; await applyRevision(previous.assetId, 'Undo: restored previous image', { restoredFrom: previous.id, historyAction: 'undo' }); status('Previous image restored as a new revision. Further undo follows earlier changes.'); } catch (e) { status(e.message); } });
    $('image-restore').addEventListener('click', async () => { try { const r = session.revisions.find(v => v.id === $('image-history-select').value); if (!r) return; await applyRevision(r.assetId, 'Restored: ' + r.label, { restoredFrom: r.id }); status('Selected image restored; all later revisions remain saved.'); } catch (e) { status(e.message); } });
    $('image-tool').addEventListener('change', () => { $('image-paid-consent').checked = false; session.selection = null; updateRectFields(); redraw(); persistSoon(); });
    $('image-clear-selection').addEventListener('click', () => { $('image-paid-consent').checked = false; session.selection = null; updateRectFields(); redraw(); persistSoon(); });
    $('image-set-rectangle').addEventListener('click', () => { try { if (!source) throw new Error('Upload an image first.'); const rect = Object.fromEntries(['x', 'y', 'width', 'height'].map(k => [k, Number($('image-rect-' + k).value)])); const s = { kind: 'rectangle', rect }; validSelection(s, source.width, source.height); session.selection = s; $('image-paid-consent').checked = false; $('image-tool').value = 'rectangle'; updateRectFields(); redraw(); persistSoon(); } catch (e) { status(e.message); } });
    $('image-zoom').addEventListener('input', () => { zoom = Number($('image-zoom').value); session.zoom = zoom; redraw(); persistSoon(); });
    const canvas = $('image-canvas');
    canvas.addEventListener('pointerdown', event => {
      if (!source || session.mode !== 'selection' || event.button !== 0) return;
      const p = mapPoint(event.clientX, event.clientY, canvas.getBoundingClientRect(), source.width, source.height); if (!p) return;
      $('image-paid-consent').checked = false; canvas.setPointerCapture(event.pointerId); const kind = $('image-tool').value;
      const selection = kind === 'rectangle' ? { kind, rect: normalizeRect(p, p, source.width, source.height) } : kind === 'lasso' ? { kind, points: [p] } : { kind, strokes: [...(session.selection?.kind === 'brush' ? session.selection.strokes : []), { radius: Number($('image-brush').value), points: [p] }] };
      drawing = { pointerId: event.pointerId, start: p, selection }; event.preventDefault(); redraw();
    });
    canvas.addEventListener('pointermove', event => {
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      const p = mapPoint(event.clientX, event.clientY, canvas.getBoundingClientRect(), source.width, source.height, true), s = drawing.selection;
      if (s.kind === 'rectangle') s.rect = normalizeRect(drawing.start, p, source.width, source.height);
      else { const points = s.kind === 'lasso' ? s.points : s.strokes.at(-1).points; if (points.length < 10000) points.push(p); }
      redraw();
    });
    function endDrawing(event) { if (!drawing || event.pointerId !== drawing.pointerId) return; session.selection = drawing.selection; drawing = null; updateRectFields(); redraw(); persistSoon(); }
    canvas.addEventListener('pointerup', endDrawing); canvas.addEventListener('pointercancel', () => { drawing = null; redraw(); });
    new ResizeObserver(() => { redraw(); quality(); }).observe($('image-stage-wrap'));
    $('open-image-craft').addEventListener('click', () => { $('image-craft-panel').open = true; $('image-craft-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('image-mode').focus(); redraw(); });
    $('image-craft-panel').addEventListener('toggle', redraw);
    async function exportBundle() {
      clearTimeout(saveTimer);
      const ids = new Set([...session.revisions.map(r => r.assetId), ...session.proposals.map(p => p.assetId), ...(session.receipts || []).map(r => r.sourceAssetId), session.pending?.sourceAssetId].filter(Boolean));
      return validateBundle({ format: FORMAT, session: JSON.parse(JSON.stringify(session)), assets: await Promise.all([...ids].map(asset)) });
    }
    async function importBundle(input) {
      const b = rekeyBundle(input, uid);
      for (const a of b.assets) { const img = await loadImage(a.data); if (img.naturalWidth !== a.width || img.naturalHeight !== a.height) throw new Error('Imported image dimensions do not match its history.'); }
      b.session.projectId = uid(); // Preserve the existing local project; imports get a separate namespace.
      await putMany([...b.assets.map(a => ['asset:' + a.id, a]), ['craft:' + b.session.projectId, b.session]]);
      clearTimeout(saveTimer); watchToken++; watching = false; $('image-paid-consent').checked = false; session = b.session; cache.clear(); activeProposal = null; $('image-proposal').hidden = true; await refresh(); return session.projectId;
    }
    async function refresh() {
      $('image-prompt').value = session.prompt || ''; $('image-mode').value = ['generate', 'whole', 'selection'].includes(session.mode) ? session.mode : 'generate';
      $('image-feather').value = clamp(session.feather || 0, 0, 64); zoom = clamp(session.zoom || 1, 1, 3); $('image-zoom').value = zoom;
      if (models) {
        if (session.model && !models.models.some(m => m.id === session.model)) { const unavailable = node('option', 'Saved model unavailable. Choose a model explicitly.'); unavailable.value = session.model; $('image-model').append(unavailable); $('image-model').value = session.model; $('image-ratio').replaceChildren(); status('The saved model is unavailable. No fallback was selected. Choose a supported model explicitly.'); }
        else { $('image-model').value = session.model || models.default_model; fillRatios(session.ratio); }
      }
      if (session.selection?.kind) $('image-tool').value = session.selection.kind;
      await loadSource(); history(); updateRectFields(); settings();
      const proposal = session.proposals.findLast(p => p.status === 'proposed'); if (proposal) await showProposal(proposal);
    }
    async function init(projectId, hero, heroSource, recoverLegacy = true) {
      await database(); let foundSession = false;
      if (projectId) { const saved = await get('craft:' + projectId); if (saved) { session = saved; foundSession = true; } }
      session.undoStack ||= [];
      try {
        models = await options.api('/api/image-models');
        if (!models?.models?.length || !models.models.some(m => m.id === models.default_model)) throw new Error('Image model capabilities are unavailable.');
        $('image-model').replaceChildren(...models.models.map(m => { const op = node('option', m.label); op.value = m.id; return op; }));
      } catch (e) { models = null; status(e.message + ' Local history remains available; paid requests are disabled.'); }
      if (!foundSession && !active() && hero) { const a = await addAsset(hero, heroSource?.kind === 'generated' ? 'ai_concept' : 'uploaded', heroSource || {}); session.revisions.push({ id: uid(), assetId: a.id, parentId: null, label: 'Existing board image', created: new Date().toISOString() }); session.activeId = session.revisions[0].id; }
      if (recoverLegacy && !projectId && !session.pending) { const id = localStorage.getItem('awards-board-image-job'); if (ID.test(id || '') && !session.proposals.some(p => p.id === id)) session.pending = { id, baseId: session.activeId, status: 'RECOVERED', mode: 'generate', created: new Date().toISOString() }; }
      await save(); await refresh();
      if (session.pending && !['SUCCEEDED', 'FAILED', 'CANCELED'].includes(session.pending.status)) status('A saved request receipt is available. Check existing request to recover it without submitting again.');
      else if (models) status(models.configured === false ? 'Runway credentials are disabled or not configured. Local image craft is available; paid requests are disabled.' : 'Image craft ready. A configured credential does not verify live access. Images stay local until an explicit paid request.');
      return session.projectId;
    }
    async function clearSource() { $('image-paid-consent').checked = false; session.undoStack ||= []; if (session.activeId) session.undoStack.push(session.activeId); session.activeId = null; session.selection = null; await save(); await loadSource(); history(); updateRectFields(); }
    async function startProject(hero, metadata) { clearTimeout(saveTimer); watchToken++; watching = false; session = newSession(); cache.clear(); $('image-proposal').hidden = true; activeProposal = null; return init(session.projectId, hero, metadata, false); }
    async function currentImage() { const origin = session, r = active(); if (!r) return { data: '', source: null }; const a = await asset(r.assetId); assertSession(origin); return { data: a.data, source: { kind: a.provenance === 'ai_concept' ? 'generated' : 'uploaded', provenance: a.provenance, model: a.model, prompt: a.prompt, job: a.jobId, imageRevisionId: r.id } }; }
    return { init, startProject, attach, currentImage, clearSource, exportBundle, importBundle, quality, getProjectId: () => session.projectId, hasPending: () => submitting || watching };
  }
  return { safeImage, imageBytes, dimensions, containRect, mapPoint, normalizeRect, validSelection, rasterizeMask, promptCount, placementQuality, canApply, validateBundle, rekeyBundle, reconcileHero, mount,
    storage: { get, putMany }, FORMAT, MAX_BUNDLE_CHARS };
});
