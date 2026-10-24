/* Guided design studio. All generated text is rendered as text, never HTML. */
(() => {
  const $ = id => document.getElementById(id);
  const INPUTS = ['brand','campaign','brief','results','mandatories','direction','color'];
  const COPY = ['headline','subhead','context','insight','idea','execution','results'];
  const LABELS = {headline:'Campaign / idea name',subhead:'Supporting line',context:'Brief',insight:'Insight',idea:'Idea',execution:'Execution',results:'Results'};
  const EXAMPLE = new URLSearchParams(location.search).has('example');
  const STORAGE = 'awards-board-studio-v1';
  const POINTER = EXAMPLE ? STORAGE+'-example' : STORAGE;
  const BOARD_KEY = EXAMPLE ? 'board:example' : 'board:main';
  let state = {format:STORAGE,inputs:{},hero:'',logo:'',font:'',versions:[],current:0};
  let saveRevision=0;
  let busy = false;
  let aiAvailable = false;
  let writeProposal = null;
  let fontFamily = '';
  let loadedFontFace = null;
  let saveTimer, craft, craftReady, restoring = true, projectChanging = false, saveQueue = Promise.resolve();
  function node(tag,text,className) { const el=document.createElement(tag); if(text!==undefined)el.textContent=text; if(className)el.className=className; return el; }
  function current() { return state.versions[state.current]; }
  function inputs() { return Object.fromEntries(INPUTS.map(id=>[id,$(id).value])); }
  function ragEnabled() { const off=$('rag-off'); return !(off && off.checked); }
  function ragLabel() { return ragEnabled() ? 'RAG-ON' : 'RAG-OFF'; }
  function persist() {
    if(restoring)return Promise.resolve();
    state.inputs=inputs();
    const snapshot=structuredClone(state),requestedSave=++saveRevision;
    $('save-status').textContent='Saving changes locally…';
    saveQueue=saveQueue.catch(()=>{}).then(async()=>{
      await ImageCraft.storage.putMany([[BOARD_KEY,snapshot]]);
      // Binary originals/previews belong in IndexedDB, never the small localStorage quota.
      const pointer={format:STORAGE,largeAssetsInDB:true};
      localStorage.setItem(POINTER,JSON.stringify(pointer));
      if(requestedSave===saveRevision)$('save-status').textContent='Saved locally in this browser. Save project keeps a separate copy with image history.';
    }).catch(error=>{$('save-status').textContent='Local saving needs attention. Keep this tab open and use Save project. '+error.message;throw error;});
    // Event handlers may ignore the promise; still keep the recoverable error visible.
    saveQueue.catch(()=>{});return saveQueue;
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer=setTimeout(persist,350); }
  async function api(path,data) {
    let response;
    try { response=await fetch(path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined}); }
    catch { throw new Error('The local server is unavailable. Your work is preserved. Restart the server and retry.'); }
    let result;
    try { result=await response.json(); } catch { throw new Error('The local server returned an incomplete response. Your work is preserved.'); }
    if(!response.ok) throw new Error(result.error||'The request failed. Please retry.');
    return result;
  }
  function safeImage(value) { return ImageCraft.safeImage(value); }
  function validateOriginalLogo(original){if(!original)return;if(!['eps','png','jpeg','webp'].includes(original.format)||typeof original.data!=='string'||original.data.length>11_000_000||!/^data:[^,]*;base64,[A-Za-z0-9+/=]+$/.test(original.data))throw new Error('Unsupported original logo data.');original.mime=original.format==='eps'?'application/postscript':'image/'+original.format;original.name=String(original.name||'original-logo.'+original.format).split(/[\\/]/).pop().replace(/[\x00-\x1f]/g,'').slice(0,180);}
  function validateProject(value) {
    if(!value||value.format!==STORAGE||!value.inputs||typeof value.inputs!=='object'||Array.isArray(value.inputs)||!Array.isArray(value.versions)||value.versions.length>1000) throw new Error('This is not a supported Awards Board project.');
    for(const field of INPUTS) if(value.inputs[field]!==undefined && typeof value.inputs[field]!=='string') throw new Error('Invalid brief data.');
    for(const field of ['hero','logo']) if(value[field] && !safeImage(value[field])) throw new Error('The project contains an unsupported image.');
    if(value.font && (typeof value.font!=='string'||value.font.length>14000000||!/^data:[^,]*;base64,[A-Za-z0-9+/=]+$/.test(value.font)))throw new Error('Unsupported font data.');
    validateOriginalLogo(value.logoOriginal);
    value.versions.forEach(version=>{
      if(!version||typeof version!=='object'||!version.draft||typeof version.draft!=='object')throw new Error('Invalid board version.');
      for(const field of COPY)if(typeof version.draft[field]!=='string'||version.draft[field].length>6000)throw new Error('Invalid board wording.');
      if(!['editorial','impact','story'].includes(version.layout)||!/^#[a-fA-F0-9]{6}$/.test(version.draft.color))throw new Error('Invalid board styling.');
      if(!Array.isArray(version.draft.missing)||!version.draft.missing.every(v=>typeof v==='string')||!Array.isArray(version.draft.applied_principles)||!version.draft.applied_principles.every(p=>p&&typeof p.rule==='string'))throw new Error('Invalid review notes.');
      if(typeof version.draft.rationale!=='string'||typeof version.draft.brand!=='string'||typeof version.draft.campaign!=='string')throw new Error('Invalid board metadata.');
      if(version.logo&& !safeImage(version.logo))throw new Error('Unsupported saved logo preview.');
      validateOriginalLogo(version.logoOriginal);
      version.approved=false;
      version.imageFit=version.imageFit==='cover'?'cover':'contain';
      version.imagePosition=['left','right','top'].includes(version.imagePosition)?version.imagePosition:'center';
    });
    value.current=Math.max(0,Math.min(Number(value.current)||0,value.versions.length-1));
    return value;
  }
  function restoreInputs() { INPUTS.forEach(id=>$(id).value=state.inputs[id]??(id==='color'?'#e24b32':'')); $('remove-hero').hidden=!state.hero; $('remove-logo').hidden=!state.logo; }
  async function installFont() {
    fontFamily='';if(loadedFontFace){document.fonts.delete(loadedFontFace);loadedFontFace=null;}$('remove-font').hidden=!state.font;
    if(state.font) { try { const face=new FontFace('StudioBrand',`url(${state.font})`); await face.load(); document.fonts.add(face);loadedFontFace=face; fontFamily='StudioBrand'; } catch { $('save-status').textContent='This font could not load. Using the selected typography preset.'; } }
  }
  function resize() { const width=$('board-fit').clientWidth; if(!width)return; $('board-fit').style.height=`${width*990/1400}px`; $('board-art').style.transform=`scale(${width/1400})`; }
  function accentInk(hex) { const values=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4); return values[0]*.2126+values[1]*.7152+values[2]*.0722>.179?'#14231c':'#ffffff'; }
  function typographySettings() { return current()?.typography||{preset:'editorial',scale:1,leading:1,tracking:0,spacing:1}; }

  function showRefs(draft) {
    const panel = $('rag-refs');
    const list = $('rag-ref-list');
    const badge = $('rag-badge');
    const mode = draft?.rag_mode || (draft?.use_rag === false ? 'RAG-OFF' : 'RAG-ON');
    if (badge) {
      badge.hidden = !draft;
      badge.textContent = mode;
      badge.dataset.mode = mode === 'RAG-ON' ? 'on' : 'off';
    }
    if (!panel || !list) return;
    const refs = (draft?.provenance || []).slice(0, 3);
    if (!draft || mode === 'RAG-OFF' || !refs.length) {
      panel.hidden = true;
      list.replaceChildren();
      return;
    }
    panel.hidden = false;
    list.replaceChildren(...refs.map(ref => {
      const item = node('li');
      if (ref.thumbnail) {
        const img = node('img');
        img.src = ref.thumbnail;
        img.alt = '';
        img.width = 72;
        img.height = 51;
        item.append(img);
      }
      const meta = node('div');
      meta.append(node('strong', ref.filename || ref.title || ref.id));
      if (ref.title && ref.filename) meta.append(node('span', ref.title));
      item.append(meta);
      return item;
    }));
  }

  function renderBoard() {
    const version=current(); if(!version)return;
    const caption=document.querySelector('.canvas-caption span');if(caption)caption.textContent=version.demo?'Fictional concept · editable example':'Your campaign board';
    const draft=version.draft, art=$('board-art'); art.replaceChildren(); art.className=`board-art layout-${version.layout}`;
    art.style.setProperty('--board-accent',draft.color); art.style.setProperty('--accent-ink',accentInk(draft.color));
    art.style.setProperty('--image-fit',version.imageFit||'contain');art.style.setProperty('--image-position',version.imagePosition||'center');
    if(fontFamily)art.style.setProperty('--brand-font',fontFamily);else art.style.removeProperty('--brand-font');
    const top=node('div',undefined,'art-top');top.append(node('div',draft.brand||'Your campaign','art-brand'));
    const displayedLogo=version.logo??state.logo;if(displayedLogo){const logo=node('img',undefined,'art-logo');logo.src=displayedLogo;logo.alt='Brand logo';top.append(logo);}
    art.append(top,node('div',draft.campaign||'Campaign story','art-campaign'));
    const content=node('div',undefined,'art-content');const visual=node('div',undefined,'art-visual');
    if(state.hero){const img=node('img');img.src=state.hero;img.alt='Your campaign image';visual.append(img);}
    else {const letters=(draft.brand||draft.campaign||'IDEA').split(/\s+/).map(v=>v[0]).join('').slice(0,3).toUpperCase();visual.append(node('div',letters,'art-wordmark'));}
    if(state.hero&&state.heroSource?.kind==='generated')visual.append(node('span','AI concept image','art-generated'));
    const text=node('div',undefined,'art-text');const heading=node('div',undefined,'art-heading');heading.append(node('h1',draft.headline,'art-headline'),node('p',draft.subhead,'art-subhead'));heading.children[0].dataset.copyField='headline';heading.children[1].dataset.copyField='subhead';text.append(heading);
    ['context','idea','insight','execution'].forEach(field=>{const section=node('section',undefined,'art-section');section.append(node('h3',field==='insight'&&!version.approved?'Insight · review':LABELS[field]),node('p',draft[field]||'Add your wording.'));section.lastChild.dataset.copyField=field;text.append(section);});
    const proof=node('section',undefined,`art-proof${draft.results?'':' missing'}`);proof.append(node('h3','Results'),node('p',draft.results||'Results to be confirmed.'));proof.lastChild.dataset.copyField='results';text.append(proof);content.append(visual,text);art.append(content);
    const footer=node('div',undefined,'art-footer');footer.append(node('span',draft.brand||'Campaign board'));if(!version.approved)footer.append(node('span','DRAFT · FOR REVIEW','review-watermark'));art.append(footer);
    art.querySelectorAll('[data-copy-field]').forEach(el=>{
      el.tabIndex=0;el.contentEditable='plaintext-only';el.setAttribute('role','textbox');el.setAttribute('aria-multiline','true');el.setAttribute('aria-label','Edit '+LABELS[el.dataset.copyField]);
      el.addEventListener('focus',()=>{if(selectedCopy!==el.dataset.copyField)selectCopy(el.dataset.copyField,false);});
      el.addEventListener('input',()=>{const field=el.dataset.copyField;const limit=field==='headline'?85:field==='subhead'?170:field==='execution'?340:field==='results'?550:280;const value=[...el.childNodes].filter(child=>!child.classList?.contains('text-move-handle')).map(child=>child.textContent).join('').slice(0,limit);if(el.textContent.replace(/Move$/,'')!==value)el.textContent=value;current().draft[field]=value;current().approved=false;$('approve').checked=false;$('draft-state').textContent='Edited · Review needed';$('selection-copy').value=value;buildEditor();showReview();scheduleSave();requestAnimationFrame(checkQuality);});
      el.addEventListener('keydown',event=>{if(event.altKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();checkpoint();const amount=event.shiftKey?10:1;const dx=event.key==='ArrowLeft'?-amount:event.key==='ArrowRight'?amount:0;const dy=event.key==='ArrowUp'?-amount:event.key==='ArrowDown'?amount:0;current().textBoxes??={};current().textBoxes[el.dataset.copyField]=BoardObjects.nudge(current().textBoxes[el.dataset.copyField],dx,dy);current().approved=false;renderBoard();scheduleSave();const again=$('board-art').querySelector('[data-copy-field="'+el.dataset.copyField+'"]');again?.focus();syncBoxControls();showMoveHandle(el.dataset.copyField);}});
      el.addEventListener('blur',()=>{checkQuality();});
    });
    for(const [field,size] of Object.entries(version.typeSizes||{})){if(COPY.includes(field)&&Number.isFinite(size)&&size>=12&&size<=140){const el=art.querySelector('[data-copy-field="'+field+'"]');if(el)el.style.fontSize=size+'px';}}
    for(const field of COPY){const el=art.querySelector('[data-copy-field="'+field+'"]');const box=BoardObjects.normalise(version.textBoxes?.[field]);if(el){el.style.position='relative';el.style.left=box.x+'px';el.style.top=box.y+'px';if(box.width)el.style.width=box.width+'px';el.dataset.boxX=box.x;el.dataset.boxY=box.y;}}
    const logo=art.querySelector('.art-logo');if(logo){logo.style.width=Math.max(40,Math.min(260,Number(state.logoWidth)||150))+'px';logo.style.height='auto';logo.style.maxHeight='64px';logo.style.objectFit='contain';logo.style.order=state.logoPlacement==='left'?'-1':'1';logo.style.position='relative';logo.style.left=BoardObjects.normalise({x:state.logoX}).x+'px';logo.style.top=BoardObjects.normalise({y:state.logoY}).y+'px';}
    if(window.BoardTypography)BoardTypography.fit(art,typographySettings());
    resize(); requestAnimationFrame(()=>{checkQuality();craft?.quality();});
    document.querySelectorAll('[data-layout]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.layout===version.layout)));
    $('draft-state').textContent=version.approved?'Reviewed by you':(version.manual?'Manual draft · Review needed':'AI draft · Review needed');$('approve').checked=!!version.approved;
    $('image-fit').value=version.imageFit||'contain';$('image-position').value=version.imagePosition||'center';
  }
  function checkQuality() {
    const version=current();if(!version)return;
    const art=$('board-art'); const issues=[];
    if(window.BoardTypography)issues.push(...BoardTypography.inspect(art).issues.map(issue=>issue.message));
    const content=art.querySelector('.art-content');if(content&&content.scrollHeight>content.clientHeight+3)issues.push('Some content is too long for this layout. Shorten the wording or try another treatment.');
    const text=art.querySelector('.art-text');if(text&&text.scrollHeight>text.clientHeight+3)issues.push('The story needs less text to fit comfortably.');
    version.fitIssues=[...new Set(issues)];
    $('quality-status').textContent=issues.length?[...new Set(issues)].join(' '):'Text fits the layout. Review the wording and image framing at full size before approval.';
    $('quality-status').dataset.state=issues.length?'warning':'pass';
  }
  function showReview() {
    const draft=current().draft;$('design-rationale').textContent=draft.rationale;
    $('applied-principles').replaceChildren(...draft.applied_principles.map(p=>node('li',p.rule)));
    const evidence=$('campaign-evidence');evidence.replaceChildren(...['context','insight','idea','execution'].map(field=>node('li',`${LABELS[field]} · ${current().manual?'Your wording':field==='insight'?'Interpretation for review':'AI wording from your brief'}: “${draft.support?.[field]||'No supporting detail supplied'}”`)));
    const gaps=[...draft.missing];if(state.heroSource?.kind==='generated')gaps.push('AI-generated concept image: do not present it as proof of real campaign execution.');if(!draft.results)gaps.push('Add supported results when they are available.');if(!state.hero)gaps.push('This is a typography-led draft. Add your own campaign image for more visual evidence.');
    $('review-gaps').replaceChildren(...[...new Set(gaps)].map(text=>node('li',text)));
  }
  function buildEditor() {
    const panel=$('copy-fields');panel.replaceChildren();
    COPY.forEach(field=>{const group=node('div');const label=node('label',LABELS[field]);label.htmlFor=`edit-${field}`;const input=node('textarea');input.id=`edit-${field}`;input.rows=field==='headline'?2:3;input.maxLength=field==='results'?550:field==='headline'?85:field==='subhead'?170:field==='execution'?340:280;input.value=current().draft[field];input.addEventListener('input',()=>{current().writing_events??=[];current().writing_events.push({field,action:'edited',at:new Date().toISOString()});current().draft[field]=input.value;current().approved=false;renderBoard();showReview();scheduleSave();});group.append(label,input);panel.append(group);});
  }
  const editUndo=[];
  function checkpoint(){if(!current())return;editUndo.push({version:current(),draft:structuredClone(current().draft),typeSizes:{...current().typeSizes},textBoxes:structuredClone(current().textBoxes||{}),logo:state.logo,logoOriginal:state.logoOriginal||null,logoPlacement:state.logoPlacement||'right',logoWidth:state.logoWidth||150,logoX:state.logoX||0,logoY:state.logoY||0});if(editUndo.length>30)editUndo.shift();}
  function undoBoard(){const before=editUndo.pop();if(!before)return;const version=before.version;if(!state.versions.includes(version))return;version.draft=before.draft;version.typeSizes=before.typeSizes;version.textBoxes=before.textBoxes;state.logo=before.logo;state.logoOriginal=before.logoOriginal;version.logo=before.logo;version.logoOriginal=before.logoOriginal;state.logoPlacement=before.logoPlacement;state.logoWidth=before.logoWidth;state.logoX=before.logoX;state.logoY=before.logoY;version.approved=false;renderBoard();buildEditor();showReview();persist();if(selectedCopy){$('selection-copy').value=current().draft[selectedCopy];syncBoxControls();showMoveHandle(selectedCopy);const selected=$('board-art').querySelector('[data-copy-field="'+selectedCopy+'"]');if(selected)$('selected-type-size').value=Math.round(parseFloat(getComputedStyle(selected).fontSize));}}
  let selectedCopy = null;
  function selectCopy(field,focus=true) {
    checkpoint();
    selectedCopy=field;$('selection-inspector').hidden=false;
    $('selection-label').textContent=LABELS[field];$('selection-copy').value=current().draft[field];
    $('copy-editor').hidden=true;
    $('selection-copy').maxLength=field==='results'?550:field==='headline'?85:field==='subhead'?170:field==='execution'?340:280;
    openTool('type');$('selection-inspector').hidden=false;const selected=$('board-art').querySelector('[data-copy-field="'+field+'"]');$('selected-type-size').value=Math.round(current().typeSizes?.[field]||parseFloat(selected?getComputedStyle(selected).fontSize:24));syncBoxControls();showMoveHandle(field);if(focus)$('selection-copy').focus();
  }
  $('close-selection').addEventListener('click',()=>{$('selection-inspector').hidden=true;$('copy-editor').hidden=false;selectedCopy=null;});
  $('selection-copy').addEventListener('input',()=>{if(!current()||!selectedCopy)return;current().draft[selectedCopy]=$('selection-copy').value;current().approved=false;renderBoard();buildEditor();showReview();scheduleSave();});
  $('start-manual').addEventListener('click',async()=>{
    await craftReady;
    const source=inputs();
    const draft={brand:source.brand,campaign:source.campaign,color:source.color,headline:source.campaign||'Your campaign headline',subhead:'',context:'',insight:'',idea:'',execution:'',results:source.results,
      missing:['Manual draft: add your approved campaign story and check every claim.'],applied_principles:[],rationale:'Manual editable composition. No AI writing request was made.',support:{},input_snapshot:source,layout:'impact',use_rag:false,rag_mode:'RAG-OFF',provenance:[]};
    state.versions.push({draft,manual:true,layout:'impact',typography:{preset:'modern',scale:1,leading:1,tracking:0,spacing:1},approved:false,imageFit:'contain',imagePosition:'center',created:new Date().toISOString()});
    state.current=state.versions.length-1;showVersion();$('copy-editor').open=true;await persist();
    $('generation-status').textContent='Editable manual board ready. Your rough notes are preserved. Select any wording on the board to edit it.';
  });
  function syncBoxControls(){if(!selectedCopy||!current())return;const box=BoardObjects.normalise(current().textBoxes?.[selectedCopy]);const el=$('board-art').querySelector('[data-copy-field="'+selectedCopy+'"]');for(const [key,value] of Object.entries({x:box.x,y:box.y,width:box.width||el?.offsetWidth||400})){const input=$('box-'+key);if(input)input.value=Math.round(value*10)/10;}}
  function updateBox(change){if(!selectedCopy||!current())return;const before=BoardObjects.normalise(current().textBoxes?.[selectedCopy]),after=BoardObjects.normalise({...before,...change});if(JSON.stringify(before)===JSON.stringify(after))return;checkpoint();current().textBoxes??={};current().textBoxes[selectedCopy]=after;current().approved=false;renderBoard();scheduleSave();syncBoxControls();showMoveHandle(selectedCopy);}
  function showMoveHandle(field){
    $('board-art').querySelectorAll('.text-move-handle').forEach(el=>el.remove());const text=$('board-art').querySelector('[data-copy-field="'+field+'"]');if(!text)return;
    const handle=node('button','Move','text-move-handle');handle.type='button';handle.contentEditable='false';handle.dataset.html2canvasIgnore='true';handle.setAttribute('aria-label','Move selected text box; Alt plus arrow keys also nudge it');text.append(handle);
    handle.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();checkpoint();const version=current(),origin=BoardObjects.normalise(version.textBoxes?.[field]),startX=event.clientX,startY=event.clientY,scale=$('board-art').getBoundingClientRect().width/1400;handle.setPointerCapture(event.pointerId);const move=point=>{const box=BoardObjects.nudge(origin,(point.clientX-startX)/scale,(point.clientY-startY)/scale);version.textBoxes??={};version.textBoxes[field]=box;text.style.left=box.x+'px';text.style.top=box.y+'px';};const finish=point=>{move(point);handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);version.approved=false;syncBoxControls();checkQuality();scheduleSave();};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);});
  }
  function syncTypographyControls() { const settings=typographySettings();['preset','scale','leading','tracking','spacing'].forEach(key=>{const control=$(`type-${key}`);if(control)control.value=settings[key];}); }
  function showVersion() {
    selectedCopy=null;$('selection-inspector').hidden=true;$('copy-editor').hidden=false;
    $('empty-state').hidden=!!current();$('board-workspace').hidden=!current();
    if(!current())return;
    $('version-select').replaceChildren(...state.versions.map((v,i)=>{const option=node('option',`Draft ${i+1}`);option.value=i;return option;}));$('version-select').value=state.current;
    if(current().logo!==undefined){state.logo=current().logo;state.logoOriginal=current().logoOriginal||null;}
    renderBoard();buildEditor();showReview();syncTypographyControls();showRefs(current()?.draft);writeProposal=null;$('writing-proposal').hidden=true;
  }
  async function fileData(file) { return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read the selected file.'));reader.readAsDataURL(file);}); }
  for(const name of ['hero','logo']){
    $(`${name}-upload`).addEventListener('change',async event=>{
      const file=event.target.files[0];if(!file)return;const origin=state;
      try{
        if(projectChanging)throw new Error('Wait for the project to finish opening before uploading an image.');
        const byteLimit=name==='hero'?84_000_000:8_000_000,isEPS=name==='logo'&&(/\.eps$/i.test(file.name)||file.type==='application/postscript');if((!isEPS&&!['image/png','image/jpeg','image/webp'].includes(file.type))||file.size>byteLimit)throw new Error(`Choose ${name==='logo'?'EPS, ':''}PNG, JPG or WebP under ${byteLimit/1_000_000} MB.`);
        await craftReady;const originalData=await fileData(file);let data=originalData,epsPreview=null;if(isEPS){$('logo-upload-status').textContent='Creating a local EPS preview. Original file preserved.';epsPreview=await api('/api/convert-eps',{data:originalData.split(',')[1]});data=epsPreview.preview;}const img=new Image();img.src=data;await img.decode();if(projectChanging||state!==origin)throw new Error('The project changed during upload. Its newer images were preserved; select the file again in the intended project.');
        if(name==='hero'){ImageCraft.dimensions(img.naturalWidth,img.naturalHeight);await craft.attach(data,{},'Uploaded original');}
        else {checkpoint();for(const version of state.versions){if(version.logo===undefined){version.logo=state.logo;version.logoOriginal=state.logoOriginal||null;}}if(img.width*img.height>40_000_000)throw new Error('Choose a logo smaller than 40 megapixels.');state.logo=data;state.logoOriginal={name:file.name,format:isEPS?'eps':file.type.split('/')[1],mime:isEPS?'application/postscript':file.type,data:originalData,bytes:file.size,...(epsPreview?{sha256:epsPreview.source_sha256,conversion:{pixels:epsPreview.pixels,has_transparency:epsPreview.has_transparency,declared_process_colours:epsPreview.declared_process_colours,renderer:epsPreview.renderer}}:{})};if(current()){current().logo=data;current().logoOriginal=state.logoOriginal;}state.logoPlacement??='right';state.logoWidth??=150;if(current())current().approved=false;$('remove-logo').hidden=false;renderBoard();await persist();$('logo-upload-status').textContent=isEPS?'EPS preview added. Original EPS retained in this project; canvas uses a raster preview.':'Logo added. Original image retained in this project.';updateOriginalLogoDownload();}
      }catch(error){$('save-status').textContent=error.message;$('logo-upload-status').textContent=error.message;}
      event.target.value='';
    });
    $(`remove-${name}`).addEventListener('click',async()=>{try{await craftReady;if(name==='hero'){await craft.clearSource();state.heroSource=null;}state[name]='';if(name==='logo'){state.logoOriginal=null;if(current()){current().logo='';current().logoOriginal=null;}}$(`${name}-upload`).value='';$(`remove-${name}`).hidden=true;if(current())current().approved=false;renderBoard();if(current())showReview();await persist();}catch(error){$('save-status').textContent=error.message;}});
  }
  INPUTS.forEach(id=>$(id).addEventListener('input',()=>{scheduleSave();if(id==='color'&&current()){current().draft.color=$('color').value;current().approved=false;renderBoard();}}));

  document.querySelectorAll('input[name="rag-mode"]').forEach(input=>input.addEventListener('change',()=>{if(current())showRefs({...current().draft,rag_mode:ragLabel(),use_rag:ragEnabled(),provenance:ragEnabled()?current().draft.provenance:[]});$('generation-status').textContent=`Next generate will run as ${ragLabel()}.`;scheduleSave();}));
  $('brief-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    if($('brief').value.trim().length<30){$('generation-status').textContent='Add a few sentences about the problem, idea and what happened.';$('brief').focus();return;}
    busy=true;setGenerateEnabled(false,'Generating your board…');$('working-state').hidden=false;$('empty-state').hidden=true;$('board-workspace').hidden=true;
    $('working-state').scrollIntoView({block:'center',behavior:'smooth'});$('generation-status').textContent='Designing your board. You can keep editing the brief; this draft uses the text submitted now.';persist();
    try{const draft=await api('/api/create-board',{...inputs(),has_image:!!state.hero,use_rag:ragEnabled()});state.versions.push({draft,layout:draft.layout,typography:{preset:'editorial',scale:1,leading:1,tracking:0,spacing:1},approved:false,imageFit:'contain',imagePosition:'center',created:new Date().toISOString()});state.current=state.versions.length-1;showVersion();persist();$('generation-status').textContent='Your draft is ready. Try a treatment, refine the wording, then review.';}
    catch(error){$('generation-status').textContent=error.message;showVersion();}
    finally{busy=false;$('working-state').hidden=true;setGenerateEnabled(aiAvailable, aiAvailable?'':'AI is not configured. Add API keys in .env to enable Generate.');}
  });
  document.querySelectorAll('[data-layout]').forEach(button=>button.addEventListener('click',()=>{if(!current())return;current().layout=button.dataset.layout;current().approved=false;renderBoard();persist();}));
  ['image-fit','image-position'].forEach(id=>$(id).addEventListener('change',()=>{if(!current())return;current()[id==='image-fit'?'imageFit':'imagePosition']=$(id).value;current().approved=false;renderBoard();persist();}));
  $('approve').addEventListener('change',()=>{current().approved=$('approve').checked;renderBoard();persist();});
  $('version-select').addEventListener('change',()=>{state.current=Number($('version-select').value);showVersion();persist();});
  $('remove-font').addEventListener('click',async()=>{state.font='';$('font-upload').value='';await installFont();if(current())current().approved=false;renderBoard();persist();});
  $('font-upload').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>8_000_000||!/\.(otf|ttf|woff2?)$/i.test(file.name))throw new Error('Choose a font file under 8 MB.');state.font=await fileData(file);await installFont();if(current())current().approved=false;renderBoard();persist();}catch(error){$('save-status').textContent=error.message;}});
  function encodeText(text){const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
  async function saveFile(format,data,statusId){const result=await api('/api/export',{format,data});const link=node('a',`Download ${format==='json'?'project':format.toUpperCase()}`);link.href=result.url;const mode=(current()?.draft?.rag_mode||ragLabel()).replace('-', '');link.download=(result.filename||`awards-board.${format}`).replace(/(\.[^.]+)$/, `-${current()?.draft?.rag_mode||ragLabel()}$1`);link.target='_blank';link.rel='noopener';(format==='json'?$('save-links'):$('download-links')).append(link);$(statusId).textContent='Saved on this Mac. Use the download link to choose your own copy.';link.click();}
  $('save-project').addEventListener('click',async()=>{
    try{
      await craftReady;if(projectChanging)throw new Error('Wait for the project to finish opening before saving.');state.inputs=inputs();const origin=state,snapshot=await craft.currentImage();if(projectChanging||state!==origin)throw new Error('The project changed while preparing its backup. Save the current project again.');const recovered=ImageCraft.reconcileHero(state,snapshot);state=recovered.state;if(recovered.changed){renderBoard();if(current())showReview();persist();}
      const imageCraft=await craft.exportBundle(),revision=imageCraft.session.revisions.find(r=>r.id===imageCraft.session.activeId);
      const bundle={...state,hero:revision?'':state.hero,heroAssetRef:revision?.assetId||null,imageCraft};
      const blob=new Blob([JSON.stringify(bundle)],{type:'application/json'}),url=URL.createObjectURL(blob);
      const link=node('a','Download project with image history');link.href=url;link.download='awards-board-project-'+new Date().toISOString().slice(0,10)+'.json';
      $('save-links').append(link);link.click();$('save-status').textContent='Project download prepared locally, including images, history and pending receipts. Keep the downloaded file as a separate backup.';
    }catch(error){$('save-status').textContent=error.message;}
  });
  $('open-project').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    if(projectChanging){$('save-status').textContent='Another project is still opening.';return;}projectChanging=true;$('image-craft-panel').inert=true;
    try{
      await craftReady;if(craft.hasPending())throw new Error('Stop local request checking before opening another project. Its saved receipt will remain recoverable.');
      if(file.size>280_000_000)throw new Error('Project files must be under 280 MB.');
      const parsed=JSON.parse(await file.text());
      if(parsed.heroAssetRef){const checked=ImageCraft.validateBundle(parsed.imageCraft);const image=checked.assets.find(a=>a.id===parsed.heroAssetRef);if(!image)throw new Error('The project is missing its board image.');parsed.hero=image.data;}
      const loaded=validateProject(parsed);delete loaded.heroAssetRef;
      // Check/import all media before replacing the visible board. Imports preserve prior IDB records.
      let projectId;
      if(loaded.imageCraft){const checked=ImageCraft.validateBundle(loaded.imageCraft);const revision=checked.session.revisions.find(r=>r.id===checked.session.activeId);const asset=revision?checked.assets.find(a=>a.id===revision.assetId):null;if((asset?.data||'')!==(loaded.hero||''))throw new Error('The imported board image does not match its active image revision. The current project was preserved.');projectId=await craft.importBundle(checked);}
      else projectId=await craft.startProject(loaded.hero,loaded.heroSource);
      delete loaded.imageCraft;state=loaded;state.imageCraftId=projectId;restoreInputs();await installFont();showVersion();await persist();
      $('save-status').textContent='Project and image history opened. Imported board approval is reset for review.';
    }catch(error){$('save-status').textContent=error.message;}finally{projectChanging=false;$('image-craft-panel').inert=false;event.target.value='';}
  });
  const exportLibraries=new Map();
  function loadExportLibrary(url,ready){
    if(ready())return Promise.resolve();
    if(!exportLibraries.has(url))exportLibraries.set(url,new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=url;script.onload=()=>ready()?resolve():reject(new Error('The export tools could not initialize. Your board remains saved.'));script.onerror=()=>{exportLibraries.delete(url);script.remove();reject(new Error('The local export tools could not load. Restart the local server and retry. Your board remains saved.'));};document.head.append(script);
    }));return exportLibraries.get(url);
  }
  async function exportBoard(format){if(!current())return;const button=$(`export-${format}`);button.disabled=true;$('export-status').textContent='Preparing your board…';try{await loadExportLibrary('/vendor/html2canvas-1.4.1.min.js',()=>!!window.html2canvas);if(format==='pdf')await loadExportLibrary('/vendor/jspdf-2.5.1.umd.min.js',()=>!!window.jspdf);await document.fonts.ready;await Promise.all([...$('board-art').querySelectorAll('img')].map(img=>img.decode()));checkQuality();if(current().fitIssues?.length)throw new Error('Fix the text-fit warnings before exporting. Your draft is saved.');if(!window.html2canvas)throw new Error('The export library could not load. Check your internet connection and retry.');const canvas=await html2canvas($('board-art'),{scale:5,width:1400,height:990,backgroundColor:null,onclone:doc=>{const art=doc.getElementById('board-art');art.style.transform='none';art.style.position='relative';art.parentElement.style.width='1400px';art.parentElement.style.height='990px';}});let data;if(format==='png'){data=canvas.toDataURL('image/png').split(',')[1];}else{if(!window.jspdf)throw new Error('The PDF export library could not load.');const pdf=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a2',compress:true});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,594,420,undefined,'FAST');data=pdf.output('datauristring').split(',')[1];}await saveFile(format,data,'export-status');}catch(error){$('export-status').textContent=error.message;}finally{button.disabled=false;}}
  ['png','pdf'].forEach(format=>$(`export-${format}`).addEventListener('click',()=>exportBoard(format)));
  $('load-example').addEventListener('click',()=>{if($('brief').value.trim()){$('generation-status').textContent='Your brief is already filled in. Save it before replacing it with an example.';return;}$('brand').value='REFILL';$('campaign').value='The next refill';$('brief').value='FICTIONAL DEMO. People want to cut single-use plastic but often forget their reusable bottles. REFILL placed refill stations at a community arts festival and added simple signs at food stalls, reminding visitors to refill. The idea was to make a refill the easiest next step. The activation used reusable bottles, festival maps and clear directional signs. No measured campaign results are available.';$('color').value='#dc5737';persist();$('generation-status').textContent='Fictional example loaded. Select Generate my board.';});
  ['preset','scale','leading','tracking','spacing'].forEach(key=>$(`type-${key}`).addEventListener('input',()=>{if(!current())return;current().typography={...typographySettings(),[key]:key==='preset'?$(`type-${key}`).value:Number($(`type-${key}`).value)};current().approved=false;renderBoard();scheduleSave();}));
  $('reset-type').addEventListener('click',()=>{if(!current())return;current().typography={preset:'editorial',scale:1,leading:1,tracking:0,spacing:1};current().approved=false;syncTypographyControls();renderBoard();persist();});
  $('ask-writer').addEventListener('click',async()=>{if(!current())return;const version=current();const field=$('writing-field').value;const original=version.draft[field];$('ask-writer').disabled=true;$('writing-status').textContent='Crafting an alternative from your campaign facts…';$('writing-proposal').hidden=true;try{const proposal=await api('/api/refine-copy',{campaign:version.draft.input_snapshot,field,current_text:original,action:$('writing-action').value,intent:$('writing-intent').value,results_verified:$('writer-results-verified').checked,use_rag:ragEnabled()});writeProposal={proposal,version,original};version.writing_events??=[];version.writing_events.push({field,action:'proposed',proposal,evidence:proposal.evidence,at:new Date().toISOString()});scheduleSave();$('proposed-copy').textContent=proposal.proposed_text;$('writing-rationale').textContent=proposal.rationale;$('writing-evidence').replaceChildren(...(proposal.evidence||[]).map(e=>node('li',`${e.source}: “${e.excerpt}”`)),...(proposal.missing||[]).map(m=>node('li',`To confirm: ${m}`)));$('writing-proposal').hidden=false;$('writing-status').textContent=proposal.is_interpretation?'Suggested interpretation: review before applying.':'Suggested wording: review before applying.';}catch(error){$('writing-status').textContent=error.message;}finally{$('ask-writer').disabled=false;}});
  $('apply-writing').addEventListener('click',()=>{if(!writeProposal)return;const {proposal,version,original}=writeProposal;if(current()!==version||version.draft[proposal.field]!==original){$('writing-status').textContent='This wording changed while the assistant was working. Request a fresh suggestion to keep your edits.';return;}version.draft[proposal.field]=proposal.proposed_text;version.approved=false;version.writing_history??=[];version.writing_events??=[];version.writing_events.push({field:proposal.field,action:'accepted',at:new Date().toISOString()});version.writing_history.push({field:proposal.field,before:original,after:proposal.proposed_text,evidence:proposal.evidence,action:'accepted',at:new Date().toISOString()});renderBoard();buildEditor();showReview();persist();$('writing-proposal').hidden=true;$('writing-status').textContent='Suggested wording applied. You can edit it further or restore the previous wording.';});
  $('reject-writing').addEventListener('click',()=>{if(writeProposal){writeProposal.version.writing_events??=[];writeProposal.version.writing_events.push({field:writeProposal.proposal.field,action:'rejected',at:new Date().toISOString()});persist();}$('writing-proposal').hidden=true;writeProposal=null;$('writing-status').textContent='Kept your existing wording.';});
  $('undo-writing').addEventListener('click',()=>{const version=current();const last=version?.writing_history?.at(-1);if(!last){$('writing-status').textContent='No accepted writing suggestion to undo.';return;}if(version.draft[last.field]!==last.after){$('writing-status').textContent='You edited this wording after applying the suggestion. Your newer changes are kept.';return;}version.draft[last.field]=last.before;version.writing_history.pop();version.approved=false;renderBoard();buildEditor();persist();$('writing-status').textContent='Previous wording restored.';});
  // The app frame reuses inspected Napkin Circle colours and circle-button dimensions.
  const header=document.querySelector('.app-header');header.replaceChildren();
  const brand=node('strong','napkin');brand.append(node('span','◯','circle-wordmark'));
  const title=node('span','Awards board','workspace-title');
  const saved=node('span','Browser draft · checking…','saved-indicator');saved.id='circle-save-state';
  const files=node('button','File');files.type='button';files.className='circle-file';
  const example=node('a','Fictional example');example.href='?example=1';example.className='example-link';
  const undo=node('button','Undo');undo.type='button';undo.className='circle-file';undo.addEventListener('click',undoBoard);header.append(brand,title,saved,example,undo,files);
  const rail=node('nav',undefined,'circle-rail');rail.setAttribute('aria-label','Board tools');
  const drawer=node('aside',undefined,'circle-drawer');drawer.hidden=true;document.body.append(drawer);
  const drawerHead=node('div',undefined,'drawer-heading');const drawerTitle=node('h2','Story');const close=node('button','Close');close.type='button';drawerHead.append(drawerTitle,close);drawer.append(drawerHead);
  const groups={};
  for(const [key,label] of [['story','Story'],['image','Image'],['type','Type'],['file','File']]){
    const group=node('div',undefined,'inspector-group');group.hidden=true;drawer.append(group);groups[key]=group;
    if(key!=='file'){const button=node('button',undefined,'circle-tool');button.type='button';button.dataset.tool=key;button.setAttribute('aria-label',label);button.append(node('span',key==='story'?'Aa':key==='image'?'▧':'T','circle-tool-disc'),node('span',label));button.addEventListener('click',()=>openTool(key));rail.append(button);}
  }
  function move(selector,target){const el=document.querySelector(selector);if(el)target.append(el);}
  move('#selection-inspector',groups.type);move('#copy-editor',groups.story);move('.writing-panel',groups.story);
  const typeSizeLabel=node('label','Size');const selectedSize=node('input');selectedSize.id='selected-type-size';selectedSize.type='number';selectedSize.min='12';selectedSize.max='140';selectedSize.step='1';typeSizeLabel.append(selectedSize);$('selection-inspector').append(typeSizeLabel);const saveTypeSize=()=>{if(!current()||!selectedCopy||!Number.isFinite(selectedSize.valueAsNumber))return;const value=Math.max(12,Math.min(140,selectedSize.valueAsNumber));if(current().typeSizes?.[selectedCopy]===value)return;checkpoint();current().typeSizes??={};current().typeSizes[selectedCopy]=value;current().approved=false;renderBoard();persist();};selectedSize.addEventListener('input',saveTypeSize);selectedSize.addEventListener('change',saveTypeSize);
  const boxControls=node('div',undefined,'box-controls');for(const [key,label] of [['x','Horizontal offset'],['y','Vertical offset'],['width','Text box width']]){const lab=node('label',label);const input=node('input');input.type='number';input.id='box-'+key;input.step='1';input.min=key==='width'?'80':key==='x'?'-1400':'-990';input.max=key==='width'?'1280':key==='x'?'1400':'990';lab.append(input);boxControls.append(lab);const saveGeometry=()=>{if(Number.isFinite(input.valueAsNumber))updateBox({[key]:input.valueAsNumber});};input.addEventListener('input',saveGeometry);input.addEventListener('change',saveGeometry);}$('selection-inspector').append(boxControls,node('p','Drag Move, or Alt + arrow keys for 1px; add Shift for 10px. Fine adjustments remain yours.'));
  const duplicate=node('button','Duplicate draft');duplicate.type='button';groups.file.prepend(duplicate);duplicate.addEventListener('click',async()=>{await craftReady;if(!current())return;const copy=structuredClone(current());copy.approved=false;copy.created=new Date().toISOString();state.versions.push(copy);state.current=state.versions.length-1;showVersion();await persist();});
  const craftTest=node('button','Create Fearless Girl craft test version');craftTest.type='button';groups.file.prepend(craftTest);craftTest.addEventListener('click',async()=>{await craftReady;if(!current())return;const copy=structuredClone(current());copy.manual=true;copy.demo=false;copy.approved=false;copy.created=new Date().toISOString();Object.assign(copy.draft,{headline:'Fearless Girl',subhead:'Small in scale. Unafraid of power.',context:'Make unequal power impossible to ignore.',idea:'A small, fearless bronze girl confronts the Wall Street bull.',insight:'A small figure can challenge a towering symbol of power.',execution:'A fearless stance. A bronze girl. A confrontation on Wall Street.',results:'Concept test. Results not supplied.'});copy.draft.missing=['CONCEPT TEST. The user’s unequal-pay premise is creative input, not a verified statistic or historical campaign claim. Logo placement is a test, not endorsement. No verified results supplied.'];state.versions.push(copy);state.current=state.versions.length-1;showVersion();await persist();});
  const assets=document.querySelector('.asset-fields');groups.image.append(assets);const logoArea=$('logo-upload').parentElement;logoArea.querySelector('label').textContent='Add your logo';const formatNote=node('p','EPS, PNG, JPG or WebP · up to 8 MB. EPS uses a local raster preview; original retained. SVG: export PNG first.','logo-format-note');logoArea.append(formatNote);const logoStatus=node('p','','status');logoStatus.id='logo-upload-status';logoStatus.setAttribute('role','status');logoArea.append(logoStatus);const placeLabel=node('label','Logo position');const place=node('select');place.id='logo-position';for(const [value,label] of [['left','Top left'],['right','Top right']]){const option=node('option',label);option.value=value;place.append(option);}placeLabel.append(place);logoArea.append(placeLabel);place.addEventListener('change',()=>{checkpoint();state.logoPlacement=place.value;if(current())current().approved=false;renderBoard();persist();});const logoSizeLabel=node('label','Logo width');const logoSize=node('input');logoSize.type='range';logoSize.id='logo-width';logoSize.min='40';logoSize.max='260';logoSize.value=String(state.logoWidth||150);logoSizeLabel.append(logoSize);logoArea.append(logoSizeLabel);logoSize.addEventListener('change',()=>{checkpoint();state.logoWidth=Number(logoSize.value);if(current())current().approved=false;renderBoard();persist();});move('#image-craft-panel',groups.image);move('.refine-bar',groups.image);
  for(const [key,label] of [['logoX','Logo horizontal offset'],['logoY','Logo vertical offset']]){const lab=node('label',label);const input=node('input');input.type='number';input.step='1';input.min='-990';input.max='990';input.id=key;input.value=String(state[key]||0);lab.append(input);$('logo-upload').parentElement.append(lab);input.addEventListener('focus',checkpoint);const saveOffset=()=>{if(!Number.isFinite(input.valueAsNumber))return;const value=Math.max(-990,Math.min(990,input.valueAsNumber));if(state[key]===value)return;state[key]=value;if(current())current().approved=false;renderBoard();persist();};input.addEventListener('input',saveOffset);input.addEventListener('change',saveOffset);}
  const originalDownload=node('a','Download original logo');originalDownload.id='original-logo-download';originalDownload.hidden=true;originalDownload.style.display='inline-block';$('logo-upload').parentElement.append(originalDownload);let originalLogoURL=null;
  function updateOriginalLogoDownload(){const original=current()?.logoOriginal||state.logoOriginal;if(originalLogoURL)URL.revokeObjectURL(originalLogoURL);originalDownload.hidden=!original?.data;if(!original?.data)return;const bytes=Uint8Array.from(atob(original.data.split(',')[1]),c=>c.charCodeAt(0));originalLogoURL=URL.createObjectURL(new Blob([bytes],{type:original.mime||'application/octet-stream'}));originalDownload.href=originalLogoURL;originalDownload.download=original.name||'original-logo.eps';}
  const imageDetails=node('details',undefined,'image-request-details');imageDetails.append(node('summary','Image settings and request details'));
  for(const id of ['image-source-label','image-quality','image-prompt-count','image-transfer','image-cost']){const el=$(id);if(el)imageDetails.append(el);}
  for(const id of ['image-model','image-ratio']){const el=$(id);if(el)imageDetails.append(el.closest('label'));}
  document.querySelector('.craft-controls').append(imageDetails);
  document.querySelectorAll('#image-craft-panel .privacy-note').forEach(el=>{if(!imageDetails.contains(el))imageDetails.append(el);});
  move('.layout-bar',groups.type);move('.type-panel',groups.type);
  move('.project-tools',groups.file);move('#save-status',groups.file);move('#save-links',groups.file);move('.export-bar',groups.file);move('#export-status',groups.file);move('#download-links',groups.file);move('.review-panel',groups.file);
  const advanced=node('details');advanced.append(node('summary','Campaign notes and connections'));advanced.append(document.querySelector('.brief-panel'));groups.story.append(advanced);
  const canvas=document.querySelector('.design-panel');canvas.prepend(rail);canvas.after(drawer);
  const toolbar=document.querySelector('.design-toolbar');toolbar.hidden=true;
  const hint=node('div',undefined,'canvas-caption');hint.append(node('span',EXAMPLE?'Fictional concept · editable example':'Your campaign board'),node('span','Select wording to edit'));canvas.prepend(hint);
  function openTool(key){drawer.hidden=false;Object.entries(groups).forEach(([name,group])=>group.hidden=name!==key);drawerTitle.textContent=key[0].toUpperCase()+key.slice(1);document.body.classList.add('inspector-open');rail.querySelectorAll('[data-tool]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tool===key)));if(key==='story'){ $('copy-editor').open=true;if(!selectedCopy)$('copy-editor').hidden=false;}if(key==='image'){updateOriginalLogoDownload();for(const name of ['logoX','logoY'])if($(name))$(name).value=state[name]||0;$('logo-position').value=state.logoPlacement||'right';$('logo-width').value=state.logoWidth||150;}requestAnimationFrame(resize);}
  close.addEventListener('click',()=>{drawer.hidden=true;document.body.classList.remove('inspector-open');rail.querySelectorAll('[data-tool]').forEach(button=>button.setAttribute('aria-pressed','false'));resize();});
  const festival=node('details',undefined,'festival-export');festival.append(node('summary','Festival file checks'));
  festival.append(node('p','Cannes Lions 2026 presentation JPG: 7063 × 5008 pixels, 5–15 MB. Category applicability and visual review remain separate. D&AD: not checked.'));
  const ruleSource=node('a','Official 2026 Entry Kit · page 179');ruleSource.href='https://on.lions.co/cl26-ek1';ruleSource.target='_blank';ruleSource.rel='noopener';festival.append(ruleSource,node('p','File specification checked 24 October 2026. Decimal MB used; portal acceptance remains separate.'));
  const categoryLabel=node('label','Your category (applicability not checked)');const categoryInput=node('input');categoryInput.maxLength=150;categoryInput.placeholder='Choose your category outside this file check';categoryLabel.append(categoryInput);festival.append(categoryLabel);categoryInput.addEventListener('change',()=>{state.exportCategory=categoryInput.value;scheduleSave();});
  const inspect=node('button','Check image resolution');inspect.type='button';const cannes=node('button','Export Cannes 2026 JPG');cannes.type='button';const fileStatus=node('p','','status');fileStatus.id='festival-status';fileStatus.setAttribute('role','status');const fileResults=node('div');festival.append(inspect,cannes,fileStatus,fileResults);groups.file.prepend(festival);
  function placedImageReport(scale){return [...$('board-art').querySelectorAll('.art-visual img,.art-logo')].map(img=>{const fit=img.classList.contains('art-logo')?'contain':current()?.imageFit||'contain';const q=ImageCraft.placementQuality(img.naturalWidth,img.naturalHeight,img.clientWidth,img.clientHeight,fit,scale);return q?{asset:img.classList.contains('art-logo')?'Logo':'Hero',native:[img.naturalWidth,img.naturalHeight],visible_native:[Math.round(q.visibleSourceWidth),Math.round(q.visibleSourceHeight)],export_box:[Math.round(img.clientWidth*scale),Math.round(img.clientHeight*scale)],sampling_scale:q.enlargement}:null;}).filter(Boolean);}
  function showResolution(){const reports=placedImageReport(7063/1400);fileResults.replaceChildren(...reports.map(item=>node('p',`${item.asset}: original ${item.native.join(' × ')} px; visible crop ${item.visible_native.join(' × ')} px; export placement ${item.export_box.join(' × ')} px; ${item.sampling_scale>1?item.sampling_scale.toFixed(2)+'× enlargement: inspect detail or use a higher-resolution original.':'native pixel coverage sufficient; visual quality still needs review.'}`)));if(!reports.length)fileResults.append(node('p','No placed image. Text is rendered at export resolution.'));fileResults.append(node('p','No paid upscaler is connected here. Image enlargement does not create verified detail; text and logo remain separate from any future image-only upscale.'));return reports;}
  inspect.addEventListener('click',showResolution);
  function boardExportSnapshot(){return JSON.stringify({draft:current()?.draft,layout:current()?.layout,typography:current()?.typography,typeSizes:current()?.typeSizes,textBoxes:current()?.textBoxes,hero:state.hero,logo:state.logo,logoPlacement:state.logoPlacement,logoWidth:state.logoWidth,logoX:state.logoX,logoY:state.logoY,imageFit:current()?.imageFit,imagePosition:current()?.imagePosition});}
  cannes.addEventListener('click',async()=>{
    if(!current()){fileStatus.textContent='Open a board first.';return;}cannes.disabled=true;
    try{await craftReady;await loadExportLibrary('/vendor/html2canvas-1.4.1.min.js',()=>!!window.html2canvas);await document.fonts.ready;await Promise.all([...$('board-art').querySelectorAll('img')].map(img=>img.decode()));checkQuality();if(current().fitIssues?.length)throw new Error('Resolve text-fit warnings before export. Your board remains saved.');const assetReport=showResolution();const exportSnapshot=boardExportSnapshot();const hashBytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(exportSnapshot)));const sourceHash=[...hashBytes].map(value=>value.toString(16).padStart(2,'0')).join('');fileStatus.textContent='Rendering the board and checking JPEG bytes. Up to three local encoding attempts; no paid requests.';
      const rendered=await html2canvas($('board-art'),{scale:(7063+.01)/1400,width:1400,height:990,backgroundColor:null,onclone:doc=>{const art=doc.getElementById('board-art');art.style.transform='none';art.style.position='relative';art.parentElement.style.width='1400px';art.parentElement.style.height='990px';}});
      const exact=document.createElement('canvas');exact.width=7063;exact.height=5008;const ctx=exact.getContext('2d');ctx.fillStyle=getComputedStyle($('board-art')).backgroundColor;ctx.fillRect(0,0,7063,5008);ctx.drawImage(rendered,Math.floor((7063-rendered.width)/2),Math.floor((5008-rendered.height)/2));
      if(exportSnapshot!==boardExportSnapshot())throw new Error('The board changed during rendering. Your newer edits are saved; export again when ready. No candidate was stored.');const result=await api('/api/export-cannes',{data:exact.toDataURL('image/png').split(',')[1],source_board_hash:sourceHash});fileStatus.textContent=result.message;fileResults.append(node('p',result.technical_pass?'Technical file check: passed. Visual review, category fit and evidence remain not checked.':'Technical file check: failed. Earlier files and editable board preserved.'));
      for(const attempt of result.attempts){const link=node('a',`${attempt.technical_pass?'Passing candidate':'Draft candidate'}: ${attempt.width} × ${attempt.height} JPEG · ${(attempt.bytes/1e6).toFixed(2)} MB`);link.href=attempt.url;link.target='_blank';link.rel='noopener';fileResults.append(link,node('br'));}
      const reportLink=node('a','Download exact file-check report');reportLink.href=result.report_url;reportLink.target='_blank';fileResults.append(reportLink);state.lastExportCheck={profile:'cannes-2026-presentation-jpg',at:new Date().toISOString(),category:state.exportCategory||'Not selected',assets:assetReport,technical_pass:result.technical_pass,source_board_hash:sourceHash,report_url:result.report_url};await persist();
    }catch(error){fileStatus.textContent=error.message;}finally{cannes.disabled=false;}
  });
  files.addEventListener('click',()=>openTool('file'));
  $('open-image-craft').addEventListener('click',()=>openTool('image'));
  const saveObserver=new MutationObserver(()=>{saved.textContent=$('save-status').textContent||'Browser draft · saved locally';});saveObserver.observe($('save-status'),{childList:true,subtree:true});
  async function createExample(){
    const response=await fetch('/demo-bottle.jpg');if(!response.ok)throw new Error('The example image could not load. Your own project is unchanged.');
    const image=await fileData(await response.blob());
    state.inputs={brand:'REFILL',campaign:'Make the next refill easy.',brief:'FICTIONAL CONCEPT. Demonstrate a refill reminder at a fictional arts festival. No activation or measured results are claimed.',results:'',color:'#355d73',mandatories:'Fictional concept only.',direction:'Restrained editorial, warm paper and blue product.'};
    const draft={...state.inputs,headline:'One bottle.\nA better habit.',subhead:'Make the next refill easy.',context:'Reusable bottles only help when people remember to refill them.',insight:'The easiest next step is the one people can see.',idea:'Put the refill reminder where the next drink happens.',execution:'A proposed festival system: refill points, simple directional signs and a reusable bottle. Concept only; not deployed.',results:'Not measured. This is a fictional concept, not a live campaign.',missing:['Fictional example. No actual activation or results.'],applied_principles:[],rationale:'Editable fictional example with a separate synthetic hero. No reference-board assets or claims reused.',support:{},input_snapshot:{...state.inputs},layout:'editorial',use_rag:false,rag_mode:'RAG-OFF',provenance:[]};
    state.versions.push({draft,manual:true,demo:true,layout:'editorial',typography:{preset:'modern',scale:1,leading:1,tracking:0,spacing:1},approved:false,imageFit:'cover',imagePosition:'center',created:new Date().toISOString()});state.current=state.versions.length-1;
    await craft.attach(image,{kind:'generated',label:'Synthetic bottle · fictional concept'});state.hero=image;state.heroSource={kind:'generated',label:'Synthetic bottle · fictional concept'};
    restoreInputs();showVersion();await persist();
  }
  craftReady=(async()=>{
    try{
      const savedPointer=localStorage.getItem(POINTER);
      if(savedPointer){const pointer=JSON.parse(savedPointer);const stored=pointer.largeAssetsInDB?await ImageCraft.storage.get(BOARD_KEY):pointer;if(!stored)throw new Error('The local image database is missing. Open a saved project to recover its assets.');state=validateProject(stored);}
      craft=await ImageCraft.mount({api,
        apply:async(image,source)=>{state.hero=image;state.heroSource=source;state.imageCraftId=craft.getProjectId();state.versions.forEach(v=>v.approved=false);$('remove-hero').hidden=false;renderBoard();if(current())showReview();await persist();},
        placement:()=>{const img=$('board-art').querySelector('.art-visual img');return img?{width:img.clientWidth,height:img.clientHeight,fit:current()?.imageFit||'contain'}:null;}
      });
      const recoverLegacy=!state.imageCraftId;state.imageCraftId=await craft.init(state.imageCraftId,state.hero,state.heroSource,recoverLegacy);
      const recovered=ImageCraft.reconcileHero(state,await craft.currentImage());state=recovered.state;
      restoreInputs();await installFont();showVersion();restoring=false;if((EXAMPLE||!savedPointer)&&!current())await createExample();await persist();saved.textContent='Browser draft · saved locally';if(recovered.changed)$('image-status').textContent='Recovered the saved image revision and reset board approval for review. Original images and history are preserved.';
    }catch(error){restoring=false;$('save-status').textContent=error.message;$('image-status').textContent=error.message;throw error;}
  })();craftReady.finally(()=>{document.body.classList.remove('workspace-loading');$('workspace-loading').hidden=true;}).catch(()=>{});
  new ResizeObserver(resize).observe($('board-fit'));

  function setGenerateEnabled(on, reason){
    const btn=$('generate');
    btn.disabled=!on;
    btn.classList.toggle('is-busy', !!busy && !on);
    btn.setAttribute('aria-disabled', String(!on));
    if(!on){
      btn.title=reason|| (busy?'Generating your board…':'Generate is unavailable until AI is configured.');
      if(!busy) btn.setAttribute('aria-label', reason||'Generate unavailable: AI not configured');
    }else{
      btn.removeAttribute('title');
      btn.setAttribute('aria-label','Generate my board');
    }
  }
  api('/api/status').then(status=>{aiAvailable=status.ai_available;$('ask-writer').disabled=!aiAvailable;$('writing-status').textContent=aiAvailable?'Writing assistant connected.':'AI writing is not configured. Manual wording edits remain available.';setGenerateEnabled(aiAvailable, aiAvailable?'':'AI is not configured. Add API keys in .env to enable Generate.');$('generation-status').textContent=aiAvailable?'Ready when you are.':'Generate is disabled: AI is not configured. Your brief and manual edits will still be saved.';const coverage=status.learning||{};$('learning-status').textContent=`${(coverage.images_scanned||0).toLocaleString()} images scanned locally; ${coverage.ai_reviewed||0} boards studied visually by AI. ${status.principle_count||0} design principles and safeguards. The sample informs design; award level is not a guarantee of board quality.`;}).catch(error=>{setGenerateEnabled(false, error.message);$('generation-status').textContent='Generate is disabled: '+error.message;});
})();
