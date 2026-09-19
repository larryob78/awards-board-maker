'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const craft = require('../image-craft.js');
const A = 'a'.repeat(32), R = 'b'.repeat(32), P = 'c'.repeat(32), NEW = 'd'.repeat(32);
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
function bundle() { return {format:craft.FORMAT,assets:[{id:A,data:pixel,width:1,height:1,provenance:'uploaded'}],session:{activeId:R,revisions:[{id:R,assetId:A,parentId:null,label:'Original',created:'2026-09-19'}],proposals:[{id:P,assetId:A,baseId:R,status:'proposed'}],pending:{id:P,baseId:R,sourceAssetId:A},prompt:'Local instructions'}}; }

test('letterboxed image rejects pointer outside visible pixels',()=>{
 assert.equal(craft.mapPoint(30,30,{left:10,top:10,width:200,height:200},200,100),null);
 assert.deepEqual(craft.mapPoint(110,110,{left:10,top:10,width:200,height:200},200,100),{x:100,y:50});
});
test('zoomed and scrolled canvas maps in CSS coordinates',()=>{
 const rect={left:-120,top:-30,width:800,height:600};
 assert.deepEqual(craft.mapPoint(280,270,rect,400,200),{x:200,y:100});
 assert.deepEqual(craft.mapPoint(1000,1000,rect,400,200,true),{x:400,y:200});
});
test('reverse rectangle drag clamps correctly',()=>{
 assert.deepEqual(craft.normalizeRect({x:8.2,y:7.9},{x:-2,y:1.2},10,10),{x:0,y:1,width:9,height:7});
});
test('rectangle mask includes only chosen pixels',()=>{
 const mask=craft.rasterizeMask(5,4,{kind:'rectangle',rect:{x:1,y:1,width:2,height:2}});
 assert.equal(mask.filter(Boolean).length,4);assert.equal(mask[6],255);assert.equal(mask[0],0);assert.equal(mask[8],0);
});
test('lasso mask uses pixel-centre polygon filling',()=>{
 const mask=craft.rasterizeMask(5,5,{kind:'lasso',points:[{x:1,y:1},{x:4,y:1},{x:4,y:4},{x:1,y:4}]});
 assert.equal(mask.filter(Boolean).length,9);assert.equal(mask[0],0);assert.equal(mask[12],255);
});
test('brush interpolates between points and keeps distant pixels zero',()=>{
 const mask=craft.rasterizeMask(12,10,{kind:'brush',strokes:[{radius:1,points:[{x:2,y:5},{x:10,y:5}]}]});
 assert.equal(mask[5*12+6],255);assert.equal(mask[0],0);assert.equal(mask[9*12+6],0);
});
test('empty and out-of-bounds selections rejected before request',()=>{
 assert.throws(()=>craft.rasterizeMask(10,10,{kind:'rectangle',rect:{x:9,y:0,width:2,height:1}}));
 assert.throws(()=>craft.rasterizeMask(10,10,{kind:'lasso',points:[{x:1,y:1},{x:2,y:2},{x:3,y:3}]}),/empty/);
});
test('dimension limits reject decompression-scale images',()=>{
 assert.throws(()=>craft.dimensions(9000,1));assert.throws(()=>craft.dimensions(5000,5000));craft.dimensions(4000,4000);
});
test('prompt counting follows selected model Unicode convention',()=>{
 assert.equal(craft.promptCount('A😀B','characters'),3);assert.equal(craft.promptCount('A😀B','utf16'),4);
});
test('quality calculation distinguishes contain versus cover crop',()=>{
 const contain=craft.placementQuality(1000,500,500,500,'contain');assert.equal(contain.enlargement,2.5);assert.equal(contain.visibleSourceWidth,1000);
 const cover=craft.placementQuality(1000,500,500,500,'cover');assert.equal(cover.enlargement,5);assert.equal(cover.visibleSourceWidth,500);
});
test('stale or already accepted proposal cannot apply',()=>{
 assert.equal(craft.canApply({status:'proposed',baseId:R},R),true);assert.equal(craft.canApply({status:'proposed',baseId:R},P),false);assert.equal(craft.canApply({status:'accepted',baseId:R},R),false);
});
test('asset data URIs reject scripts, external URLs and malformed encodings',()=>{
 assert.equal(craft.safeImage(pixel),true);assert.equal(craft.safeImage('data:image/svg+xml;base64,AAAA'),false);assert.equal(craft.safeImage('https://example.com/image.png'),false);assert.equal(craft.safeImage('data:image/png;base64,A'),false);assert.equal(craft.safeImage(pixel,1),false);
});
test('import validator retains history and rejects broken references',()=>{
 const b=bundle();assert.equal(craft.validateBundle(b).session.prompt,'Local instructions');b.session.revisions[0].assetId=P;assert.throws(()=>craft.validateBundle(b),/links/);
});
test('import rekeys every image reference without overwriting original IDs',()=>{
 const b=bundle(),imported=craft.rekeyBundle(b,()=>NEW);
 assert.equal(imported.assets[0].id,NEW);assert.equal(imported.session.revisions[0].assetId,NEW);assert.equal(imported.session.proposals[0].assetId,NEW);assert.equal(imported.session.pending.sourceAssetId,NEW);assert.equal(b.assets[0].id,A);assert.equal(imported.session.pending.id,P);
});
test('import rejects unsupported media and impossible dimensions',()=>{
 const b=bundle();b.assets[0].data='javascript:alert(1)';assert.throws(()=>craft.validateBundle(b));b.assets[0].data=pixel;b.assets[0].width=9000;assert.throws(()=>craft.validateBundle(b));
});

test('recovery reconciles committed craft image and invalidates approval',()=>{
 const board={hero:'old',heroSource:null,versions:[{approved:true,draft:{headline:'Preserved'}}]};
 const recovered=craft.reconcileHero(board,{data:'new',source:{imageRevisionId:R,provenance:'ai_concept'}});
 assert.equal(recovered.changed,true);assert.equal(recovered.state.hero,'new');assert.equal(recovered.state.versions[0].approved,false);assert.equal(recovered.state.versions[0].draft.headline,'Preserved');assert.equal(board.hero,'old');
 assert.equal(craft.reconcileHero(recovered.state,{data:'new',source:{imageRevisionId:R}}).changed,false);
 assert.equal(craft.reconcileHero(board,{data:'',source:null}).state.hero,'');
});
test('archived receipts and saved selection are validated before import',()=>{
 const b=bundle();b.session.receipts=[{id:null}];assert.throws(()=>craft.validateBundle(b),/receipt/);
 b.session.receipts=[{id:P,baseId:R,sourceAssetId:'f'.repeat(32)}];assert.throws(()=>craft.validateBundle(b),/receipt/);
 delete b.session.receipts;b.session.selection={kind:'lasso',points:'not an array'};assert.throws(()=>craft.validateBundle(b),/lasso/);
});

test('local async recovery keeps receipts and delayed uploads in their own projects',async()=>{
 const records=new Map(),local=new Map(),elements=new Map();let imageGate=null;
 const context=new Proxy({}, {get:(o,k)=>o[k]||(()=>{})});
 class Element {
  constructor(){this.value='';this.hidden=false;this.clientWidth=600;this.style={};this.children=[];this.listeners={};}
  addEventListener(n,f){this.listeners[n]=f;}replaceChildren(...c){this.children=c;}append(...c){this.children.push(...c);}setAttribute(){}getContext(){return context;}scrollIntoView(){}focus(){}
 }
 global.document={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement(){return new Element();}};
 global.ResizeObserver=class{observe(){}};
 global.localStorage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)};
 global.Image=class{constructor(){this.naturalWidth=1;this.naturalHeight=1;}async decode(){if(imageGate){const gate=imageGate;imageGate=null;await gate;}}};
 global.indexedDB={open(){const req={};queueMicrotask(()=>{req.result={transaction(){const tx={};tx.objectStore=()=>({get(k){const r={};queueMicrotask(()=>{r.result=structuredClone(records.get(k));r.onsuccess?.();});return r;},put(v,k){records.set(k,structuredClone(v));setTimeout(()=>tx.oncomplete?.(),0);}});return tx;}};req.onsuccess?.();});return req;}};
 const model={id:'fixture',label:'Fixture',ratios:['1:1'],default_ratio:'1:1',input_prompt_limit:4000,reference_min:0};
 const api=async()=>({default_model:'fixture',models:[model],configured:true,limits:{source_bytes:84000000,mask_bytes:8000000}});
 records.set('asset:'+A,{id:A,data:pixel,width:1,height:1,provenance:'uploaded'});
 records.set('craft:'+P,{projectId:P,revisions:[{id:R,assetId:A,parentId:null,label:'Original',created:'now'}],proposals:[],activeId:R,undoStack:[],pending:null});
 local.set('awards-board-image-job',NEW);
 const a=await craft.mount({api,apply:async()=>{}});await a.init(P,pixel,null);
 assert.equal((await a.exportBundle()).session.pending,null,'legacy receipt must not bind to existing project');
 local.clear();
 const applications=[],c=await craft.mount({api,apply:async(data)=>applications.push(data)});
 await c.init(null,pixel,null,false);
 let release;imageGate=new Promise(resolve=>release=resolve);
 const upload=c.attach(pixel).then(()=>({ok:true}),error=>({error}));
 const projectB=await c.startProject(pixel,null);release();
 const result=await upload;assert.match(result.error.message,/project changed/);assert.equal(applications.length,0);assert.equal(c.getProjectId(),projectB);
 const invalid=await c.exportBundle();invalid.session.receipts=[{id:null}];
 await assert.rejects(c.importBundle(invalid),/receipt/);assert.equal(c.getProjectId(),projectB);
 await c.clearSource();
 const reopened=await craft.mount({api,apply:async()=>{}});await reopened.init(projectB,pixel,null);
 assert.equal((await reopened.currentImage()).data,'','cleared image must not resurrect from stale board snapshot');
});
