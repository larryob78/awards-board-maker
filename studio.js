/* Guided design studio. All generated text is rendered as text, never HTML. */
(() => {
  const $ = id => document.getElementById(id);
  const INPUTS = ['brand','campaign','brief','results','mandatories','direction','color'];
  const COPY = ['headline','subhead','context','insight','idea','execution','results'];
  const LABELS = {headline:'Headline',subhead:'Supporting line',context:'Background',insight:'Insight',idea:'The idea',execution:'Execution',results:'Results'};
  const STORAGE = 'awards-board-studio-v1';
  let state = {format:STORAGE,inputs:{},hero:'',logo:'',font:'',versions:[],current:0};
  let busy = false;
  let aiAvailable = false;
  let writeProposal = null;
  let fontFamily = '';
  let loadedFontFace = null;
  let saveTimer;
  function node(tag,text,className) { const el=document.createElement(tag); if(text!==undefined)el.textContent=text; if(className)el.className=className; return el; }
  function current() { return state.versions[state.current]; }
  function inputs() { return Object.fromEntries(INPUTS.map(id=>[id,$(id).value])); }
  function persist() {
    state.inputs=inputs();
    try { localStorage.setItem(STORAGE,JSON.stringify(state)); $('save-status').textContent='Saved in this browser on this Mac.'; }
    catch { $('save-status').textContent='Browser storage is full. Use Save project to keep your work.'; }
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
  function safeImage(value) { return typeof value==='string' && value.length<13000000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value); }
  function validateProject(value) {
    if(!value||value.format!==STORAGE||!value.inputs||typeof value.inputs!=='object'||Array.isArray(value.inputs)||!Array.isArray(value.versions)||value.versions.length>1000) throw new Error('This is not a supported Awards Board project.');
    for(const field of INPUTS) if(value.inputs[field]!==undefined && typeof value.inputs[field]!=='string') throw new Error('Invalid brief data.');
    for(const field of ['hero','logo']) if(value[field] && !safeImage(value[field])) throw new Error('The project contains an unsupported image.');
    if(value.font && (typeof value.font!=='string'||value.font.length>14000000||!/^data:[^,]*;base64,[A-Za-z0-9+/=]+$/.test(value.font)))throw new Error('Unsupported font data.');
    value.versions.forEach(version=>{
      if(!version||typeof version!=='object'||!version.draft||typeof version.draft!=='object')throw new Error('Invalid board version.');
      for(const field of COPY)if(typeof version.draft[field]!=='string'||version.draft[field].length>6000)throw new Error('Invalid board wording.');
      if(!['editorial','impact','story'].includes(version.layout)||!/^#[a-fA-F0-9]{6}$/.test(version.draft.color))throw new Error('Invalid board styling.');
      if(!Array.isArray(version.draft.missing)||!version.draft.missing.every(v=>typeof v==='string')||!Array.isArray(version.draft.applied_principles)||!version.draft.applied_principles.every(p=>p&&typeof p.rule==='string'))throw new Error('Invalid review notes.');
      if(typeof version.draft.rationale!=='string'||typeof version.draft.brand!=='string'||typeof version.draft.campaign!=='string')throw new Error('Invalid board metadata.');
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
  function renderBoard() {
    const version=current(); if(!version)return;
    const draft=version.draft, art=$('board-art'); art.replaceChildren(); art.className=`board-art layout-${version.layout}`;
    art.style.setProperty('--board-accent',draft.color); art.style.setProperty('--accent-ink',accentInk(draft.color));
    art.style.setProperty('--image-fit',version.imageFit||'contain');art.style.setProperty('--image-position',version.imagePosition||'center');
    if(fontFamily)art.style.setProperty('--brand-font',fontFamily);else art.style.removeProperty('--brand-font');
    const top=node('div',undefined,'art-top');top.append(node('div',draft.brand||'Your campaign','art-brand'));
    if(state.logo){const logo=node('img',undefined,'art-logo');logo.src=state.logo;logo.alt='Brand logo';top.append(logo);}
    art.append(top,node('div',draft.campaign||'Campaign story','art-campaign'));
    const content=node('div',undefined,'art-content');const visual=node('div',undefined,'art-visual');
    if(state.hero){const img=node('img');img.src=state.hero;img.alt='Your campaign image';visual.append(img);}
    else {const letters=(draft.brand||draft.campaign||'IDEA').split(/\s+/).map(v=>v[0]).join('').slice(0,3).toUpperCase();visual.append(node('div',letters,'art-wordmark'));}
    const text=node('div',undefined,'art-text');const heading=node('div',undefined,'art-heading');heading.append(node('h1',draft.headline,'art-headline'),node('p',draft.subhead,'art-subhead'));text.append(heading);
    ['insight','idea','execution'].forEach(field=>{const section=node('section',undefined,'art-section');section.append(node('h3',field==='insight'&&!version.approved?'Suggested insight':LABELS[field]),node('p',draft[field]));text.append(section);});
    const proof=node('section',undefined,`art-proof${draft.results?'':' missing'}`);proof.append(node('h3','Results'),node('p',draft.results||'Results to be confirmed.'));text.append(proof);content.append(visual,text);art.append(content);
    const footer=node('div',undefined,'art-footer');footer.append(node('span',draft.brand||'Campaign board'));if(!version.approved)footer.append(node('span','DRAFT · FOR REVIEW','review-watermark'));art.append(footer);
    if(window.BoardTypography)BoardTypography.fit(art,typographySettings());
    resize(); requestAnimationFrame(checkQuality);
    document.querySelectorAll('[data-layout]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.layout===version.layout)));
    $('draft-state').textContent=version.approved?'Reviewed by you':'AI draft · Review needed';$('approve').checked=!!version.approved;
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
    const evidence=$('campaign-evidence');evidence.replaceChildren(...['context','insight','idea','execution'].map(field=>node('li',`${LABELS[field]} · ${field==='insight'?'Interpretation for review':'AI wording from your brief'}: “${draft.support?.[field]||'No supporting detail supplied'}”`)));
    const gaps=[...draft.missing];if(!draft.results)gaps.push('Add supported results when they are available.');if(!state.hero)gaps.push('This is a typography-led draft. Add your own campaign image for more visual evidence.');
    $('review-gaps').replaceChildren(...[...new Set(gaps)].map(text=>node('li',text)));
  }
  function buildEditor() {
    const panel=$('copy-fields');panel.replaceChildren();
    COPY.forEach(field=>{const group=node('div');const label=node('label',LABELS[field]);label.htmlFor=`edit-${field}`;const input=node('textarea');input.id=`edit-${field}`;input.rows=field==='headline'?2:3;input.maxLength=field==='results'?550:field==='headline'?85:field==='subhead'?170:field==='execution'?340:280;input.value=current().draft[field];input.addEventListener('input',()=>{current().writing_events??=[];current().writing_events.push({field,action:'edited',at:new Date().toISOString()});current().draft[field]=input.value;current().approved=false;renderBoard();showReview();scheduleSave();});group.append(label,input);panel.append(group);});
  }
  function syncTypographyControls() { const settings=typographySettings();['preset','scale','leading','tracking','spacing'].forEach(key=>{const control=$(`type-${key}`);if(control)control.value=settings[key];}); }
  function showVersion() {
    $('empty-state').hidden=!!current();$('board-workspace').hidden=!current();
    if(!current())return;
    $('version-select').replaceChildren(...state.versions.map((v,i)=>{const option=node('option',`Draft ${i+1}`);option.value=i;return option;}));$('version-select').value=state.current;
    renderBoard();buildEditor();showReview();syncTypographyControls();writeProposal=null;$('writing-proposal').hidden=true;
  }
  async function fileData(file) { return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read the selected file.'));reader.readAsDataURL(file);}); }
  for(const name of ['hero','logo']){
    $(`${name}-upload`).addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8_000_000)throw new Error('Choose a PNG, JPG or WebP image under 8 MB.');const data=await fileData(file);const img=new Image();img.src=data;await img.decode();if(img.width*img.height>40_000_000)throw new Error('Choose an image smaller than 40 megapixels.');state[name]=data;if(current())current().approved=false;$(`remove-${name}`).hidden=false;renderBoard();if(current())showReview();persist();}catch(error){$('save-status').textContent=error.message;}});
    $(`remove-${name}`).addEventListener('click',()=>{state[name]='';$(`${name}-upload`).value='';$(`remove-${name}`).hidden=true;if(current())current().approved=false;renderBoard();if(current())showReview();persist();});
  }
  INPUTS.forEach(id=>$(id).addEventListener('input',()=>{scheduleSave();if(id==='color'&&current()){current().draft.color=$('color').value;current().approved=false;renderBoard();}}));
  $('brief-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    if($('brief').value.trim().length<30){$('generation-status').textContent='Add a few sentences about the problem, idea and what happened.';$('brief').focus();return;}
    busy=true;$('generate').disabled=true;$('working-state').hidden=false;$('empty-state').hidden=true;$('board-workspace').hidden=true;
    $('working-state').scrollIntoView({block:'center',behavior:'smooth'});$('generation-status').textContent='Designing your board. You can keep editing the brief; this draft uses the text submitted now.';persist();
    try{const draft=await api('/api/create-board',{...inputs(),has_image:!!state.hero});state.versions.push({draft,layout:draft.layout,typography:{preset:'editorial',scale:1,leading:1,tracking:0,spacing:1},approved:false,imageFit:'contain',imagePosition:'center',created:new Date().toISOString()});state.current=state.versions.length-1;showVersion();persist();$('generation-status').textContent='Your draft is ready. Try a treatment, refine the wording, then review.';}
    catch(error){$('generation-status').textContent=error.message;showVersion();}
    finally{busy=false;$('working-state').hidden=true;$('generate').disabled=!aiAvailable;}
  });
  document.querySelectorAll('[data-layout]').forEach(button=>button.addEventListener('click',()=>{if(!current())return;current().layout=button.dataset.layout;current().approved=false;renderBoard();persist();}));
  ['image-fit','image-position'].forEach(id=>$(id).addEventListener('change',()=>{if(!current())return;current()[id==='image-fit'?'imageFit':'imagePosition']=$(id).value;current().approved=false;renderBoard();persist();}));
  $('approve').addEventListener('change',()=>{current().approved=$('approve').checked;renderBoard();persist();});
  $('version-select').addEventListener('change',()=>{state.current=Number($('version-select').value);showVersion();persist();});
  $('remove-font').addEventListener('click',async()=>{state.font='';$('font-upload').value='';await installFont();if(current())current().approved=false;renderBoard();persist();});
  $('font-upload').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>8_000_000||!/\.(otf|ttf|woff2?)$/i.test(file.name))throw new Error('Choose a font file under 8 MB.');state.font=await fileData(file);await installFont();if(current())current().approved=false;renderBoard();persist();}catch(error){$('save-status').textContent=error.message;}});
  function encodeText(text){const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
  async function saveFile(format,data,statusId){const result=await api('/api/export',{format,data});const link=node('a',`Download ${format==='json'?'project':format.toUpperCase()}`);link.href=result.url;link.download=result.filename;link.target='_blank';link.rel='noopener';(format==='json'?$('save-links'):$('download-links')).append(link);$(statusId).textContent='Saved on this Mac. Use the download link to choose your own copy.';link.click();}
  $('save-project').addEventListener('click',async()=>{persist();try{await saveFile('json',encodeText(JSON.stringify(state,null,2)),'save-status');}catch(error){$('save-status').textContent=error.message;}});
  $('open-project').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>20000000)throw new Error('Project files must be under 20 MB.');const loaded=validateProject(JSON.parse(await file.text()));state=loaded;restoreInputs();await installFont();showVersion();persist();}catch(error){$('save-status').textContent=error.message;}event.target.value='';});
  async function exportBoard(format){if(!current())return;const button=$(`export-${format}`);button.disabled=true;$('export-status').textContent='Preparing your board…';try{await document.fonts.ready;await Promise.all([...$('board-art').querySelectorAll('img')].map(img=>img.decode()));checkQuality();if(current().fitIssues?.length)throw new Error('Fix the text-fit warnings before exporting. Your draft is saved.');if(!window.html2canvas)throw new Error('The export library could not load. Check your internet connection and retry.');const canvas=await html2canvas($('board-art'),{scale:5,width:1400,height:990,backgroundColor:null,onclone:doc=>{const art=doc.getElementById('board-art');art.style.transform='none';art.style.position='relative';art.parentElement.style.width='1400px';art.parentElement.style.height='990px';}});let data;if(format==='png'){data=canvas.toDataURL('image/png').split(',')[1];}else{if(!window.jspdf)throw new Error('The PDF export library could not load.');const pdf=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a2',compress:true});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,594,420,undefined,'FAST');data=pdf.output('datauristring').split(',')[1];}await saveFile(format,data,'export-status');}catch(error){$('export-status').textContent=error.message;}finally{button.disabled=false;}}
  ['png','pdf'].forEach(format=>$(`export-${format}`).addEventListener('click',()=>exportBoard(format)));
  $('load-example').addEventListener('click',()=>{if($('brief').value.trim()){$('generation-status').textContent='Your brief is already filled in. Save it before replacing it with an example.';return;}$('brand').value='REFILL';$('campaign').value='The next refill';$('brief').value='FICTIONAL DEMO. People want to cut single-use plastic but often forget their reusable bottles. REFILL placed refill stations at a community arts festival and added simple signs at food stalls, reminding visitors to refill. The idea was to make a refill the easiest next step. The activation used reusable bottles, festival maps and clear directional signs. No measured campaign results are available.';$('color').value='#dc5737';persist();$('generation-status').textContent='Fictional example loaded. Select Generate my board.';});
  ['preset','scale','leading','tracking','spacing'].forEach(key=>$(`type-${key}`).addEventListener('input',()=>{if(!current())return;current().typography={...typographySettings(),[key]:key==='preset'?$(`type-${key}`).value:Number($(`type-${key}`).value)};current().approved=false;renderBoard();scheduleSave();}));
  $('reset-type').addEventListener('click',()=>{if(!current())return;current().typography={preset:'editorial',scale:1,leading:1,tracking:0,spacing:1};current().approved=false;syncTypographyControls();renderBoard();persist();});
  $('ask-writer').addEventListener('click',async()=>{if(!current())return;const version=current();const field=$('writing-field').value;const original=version.draft[field];$('ask-writer').disabled=true;$('writing-status').textContent='Crafting an alternative from your campaign facts…';$('writing-proposal').hidden=true;try{const proposal=await api('/api/refine-copy',{campaign:version.draft.input_snapshot,field,current_text:original,action:$('writing-action').value,intent:$('writing-intent').value,results_verified:$('writer-results-verified').checked});writeProposal={proposal,version,original};version.writing_events??=[];version.writing_events.push({field,action:'proposed',proposal,evidence:proposal.evidence,at:new Date().toISOString()});scheduleSave();$('proposed-copy').textContent=proposal.proposed_text;$('writing-rationale').textContent=proposal.rationale;$('writing-evidence').replaceChildren(...(proposal.evidence||[]).map(e=>node('li',`${e.source}: “${e.excerpt}”`)),...(proposal.missing||[]).map(m=>node('li',`To confirm: ${m}`)));$('writing-proposal').hidden=false;$('writing-status').textContent=proposal.is_interpretation?'Suggested interpretation: review before applying.':'Suggested wording: review before applying.';}catch(error){$('writing-status').textContent=error.message;}finally{$('ask-writer').disabled=false;}});
  $('apply-writing').addEventListener('click',()=>{if(!writeProposal)return;const {proposal,version,original}=writeProposal;if(current()!==version||version.draft[proposal.field]!==original){$('writing-status').textContent='This wording changed while the assistant was working. Request a fresh suggestion to keep your edits.';return;}version.draft[proposal.field]=proposal.proposed_text;version.approved=false;version.writing_history??=[];version.writing_events??=[];version.writing_events.push({field:proposal.field,action:'accepted',at:new Date().toISOString()});version.writing_history.push({field:proposal.field,before:original,after:proposal.proposed_text,evidence:proposal.evidence,action:'accepted',at:new Date().toISOString()});renderBoard();buildEditor();showReview();persist();$('writing-proposal').hidden=true;$('writing-status').textContent='Suggested wording applied. You can edit it further or restore the previous wording.';});
  $('reject-writing').addEventListener('click',()=>{if(writeProposal){writeProposal.version.writing_events??=[];writeProposal.version.writing_events.push({field:writeProposal.proposal.field,action:'rejected',at:new Date().toISOString()});persist();}$('writing-proposal').hidden=true;writeProposal=null;$('writing-status').textContent='Kept your existing wording.';});
  $('undo-writing').addEventListener('click',()=>{const version=current();const last=version?.writing_history?.at(-1);if(!last){$('writing-status').textContent='No accepted writing suggestion to undo.';return;}if(version.draft[last.field]!==last.after){$('writing-status').textContent='You edited this wording after applying the suggestion. Your newer changes are kept.';return;}version.draft[last.field]=last.before;version.writing_history.pop();version.approved=false;renderBoard();buildEditor();persist();$('writing-status').textContent='Previous wording restored.';});
  new ResizeObserver(resize).observe($('board-fit'));
  try{const saved=localStorage.getItem(STORAGE);if(saved)state=validateProject(JSON.parse(saved));}catch{$('save-status').textContent='A saved draft could not be loaded. Open a saved project if you have one.';}
  restoreInputs();installFont().then(showVersion);
  api('/api/status').then(status=>{aiAvailable=status.ai_available;$('generate').disabled=!aiAvailable;$('generation-status').textContent=aiAvailable?'Ready when you are.':'AI is not configured. Your brief and manual edits will still be saved.';const coverage=status.learning||{};$('learning-status').textContent=`${(coverage.images_scanned||0).toLocaleString()} images scanned locally; ${coverage.ai_reviewed||0} boards studied visually by AI. ${status.principle_count||0} design principles and safeguards. The sample informs design; award level is not a guarantee of board quality.`;}).catch(error=>{$('generate').disabled=true;$('generation-status').textContent=error.message;});
})();
