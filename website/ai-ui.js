/* AI is optional. Real provider responses, explicit review, persistent per-view images. */
(function(){
  'use strict';
  let connection=null,busy=false,proposal=null,recipeUndo=[],imageEpoch=0,currentImage=null,renderPrompt='';
  const recipes=()=>state.recipeOverrides||(state.recipeOverrides={});
  const clean=n=>Number(Number(n||0).toFixed(4));
  function context(){
    const a=state.planAudit,p=project();if(!a?.communityMode||state.planDirty)return null;
    const ids=new Set([...a.communities.flatMap(c=>c.eligible.map(p=>p.id)),...state.placements.filter(p=>p.tree||p.manual).map(p=>p.plantId)]);
    return {version:'community-recipes-v1',project:{type:p.type,maintenance:p.maintenance,rewilding:p.rewilding,restorationOrnamentals:p.restorationOrnamentals,publicAccess:p.publicAccess,character:p.character,priorities:p.priorities},zones:state.zones.map(z=>({id:z.id,conditions:z.conditions})),geometry:[{type:'boundary',points:localMetricPolygon(state.plotBoundary,a.origin).map(p=>p.map(clean))},...state.sketches.filter(s=>s.type!=='camera').map(s=>({type:s.type,zoneId:s.zoneId,points:s.points.map(p=>latLngToMetric(p,a.origin).map(clean))}))],trees:state.placements.filter(p=>p.tree||p.manual).map(p=>({plantId:p.plantId,xy:p.xy.map(clean)})),species:state.selected.filter(p=>ids.has(p.id)).map(p=>({id:p.id,latin:p.latin})),communities:a.communities.map(c=>({id:c.id,zoneId:c.zoneId,zone:c.zone,band:c.band,shade:c.shade,area:clean(c.area),density:clean(c.density),total:c.total,allowedIds:c.eligible.map(p=>p.id),rows:c.rows.map(r=>({plantId:r.plantId,percentage:clean(r.percentage),count:r.count}))}))};
  }
  function viewKey(){return JSON.stringify({renderer:'dense-volume-v1',...(renderPrompt?{refinement:renderPrompt,refinementVersion:2}:{}),context:context(),camera:currentCamera(),season:field('viewSeason').value,direction:field('viewDirection').value,angle:field('viewAngle').value,age:field('viewAge').value});}
  async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
  function db(){return new Promise((resolve,reject)=>{const request=indexedDB.open('plantscapes-illustrations',1);request.onupgradeneeded=()=>request.result.createObjectStore('images');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
  async function stored(key,value){const database=await db();try{return await new Promise((resolve,reject)=>{const tx=database.transaction('images',value?'readwrite':'readonly'),request=value?tx.objectStore('images').put(value,key):tx.objectStore('images').get(key);tx.oncomplete=()=>resolve(value||request.result);tx.onerror=()=>reject(tx.error);});}finally{database.close();}}
  async function status(){try{const response=await fetch('/api/status',{signal:AbortSignal.timeout(3000),cache:'no-store'});if(!response.ok)throw Error();connection=await response.json();}catch{connection=null;}refresh();return connection;}
  async function post(route,body){
    if(!connection?.ready)throw Error('AI needs the local server, an API key and its enable setting. Import an image to use your ChatGPT subscription instead.');
    const response=await fetch(route,{method:'POST',headers:{'Content-Type':'application/json','X-Plantscapes-Token':connection.nonce},body:JSON.stringify(body)}),result=await response.json();if(!response.ok)throw Error(result.error||'The AI request failed.');return result;
  }
  function refresh(){
    const ready=!!context();
    field('askAI').disabled=busy||!ready||!connection?.ready;field('generateIllustration').disabled=busy||!ready||field('viewAngle').value!=='path';
    if(field('refineRender'))field('refineRender').disabled=busy||!ready||!field('renderRequest').value.trim();
    field('aiConnection').textContent=connection?.authState==='rejected'?'Key rejected · restart the launcher with an active key':connection?.ready?(connection.authState==='verified'?'API authenticated':'Key configured · not yet verified')+' · $'+connection.remaining.toFixed(2)+' local allowance available (not your API balance)':'AI off · local API setup required';
    field('viewDirection').closest('label').hidden=field('viewAngle').value==='path';
    field('importIllustration').disabled=!ready;field('exportAIReference').disabled=!ready;
    field('undoRecipe').disabled=!recipeUndo.length;
    if(!ready){proposal=null;field('aiProposal').hidden=true;field('communityControls').hidden=true;}
    renderImage();
  }
  function renderCommunities(){
    const a=state.planAudit;if(!a?.communityMode)return;
    const select=field('communitySelect'),previous=select.value;
    select.innerHTML=a.communities.map((c,i)=>'<option value="'+i+'">'+esc(c.zone)+' · '+esc(c.band)+(c.shade?' · under canopy':'')+' · '+Math.round(c.area)+' m²</option>').join('');
    if(previous&&Number(previous)<a.communities.length)select.value=previous;
    field('communityControls').hidden=false;renderRecipe();
  }
  function renderRecipe(){
    const c=state.planAudit?.communities?.[Number(field('communitySelect').value)];if(!c)return;
    const rows=new Map(c.rows.map(r=>[r.plantId,r]));
    field('communityRows').innerHTML=c.eligible.map(p=>{const r=rows.get(p.id);return '<label class="recipe-row"><span>'+esc(p.name)+'<small>'+esc(p.latin)+'</small></span><input type="number" min="0" max="100" step="0.1" value="'+(r?.percentage||0).toFixed(1)+'" data-recipe-species="'+esc(p.id)+'" aria-label="'+esc(p.name)+' percentage"><span>%</span><small>'+Number(r?.count||0).toLocaleString()+'</small></label>';}).join('');
    field('communityNumbers').textContent='~'+Math.round(c.area)+' m² · '+c.density.toFixed(1)+' plants/m² · ~'+c.total.toLocaleString()+' plants. Shares are plant counts, not cover.';
    field('recipeStatus').textContent='';
  }
  function commitRecipes(next){const previous=structuredClone(recipes()),revision=state.planRevision;recipeUndo.push(previous);state.recipeOverrides=next;generatePlan();if(state.planRevision===revision){state.recipeOverrides=previous;recipeUndo.pop();return;}proposal=null;field('aiProposal').hidden=true;}
  function applyRecipe(){
    const c=state.planAudit?.communities?.[Number(field('communitySelect').value)];if(!c||state.planDirty)return;
    const shares=Object.fromEntries($$('[data-recipe-species]').map(input=>[input.dataset.recipeSpecies,Number(input.value)]));
    if(Object.values(shares).some(n=>!Number.isFinite(n)||n<0||n>100)||Math.abs(Object.values(shares).reduce((n,q)=>n+q,0)-100)>.15){field('recipeStatus').textContent='Shares must total 100%.';return;}
    commitRecipes({...recipes(),[c.id]:shares});
  }
  async function ask(){
    const c=context(),request=field('aiRequest').value.trim();if(!c||!request)return;
    const original=JSON.stringify(c);busy=true;refresh();field('aiFeedbackStatus').textContent='Reviewing planting mix…';
    try{
      const result=await post('/api/feedback',{context:c,request});
      if(JSON.stringify(context())!==original)throw Error('The plan changed while AI was responding. Ask again for the current plan.');
      for(const change of result.proposal.changes){const community=c.communities.find(x=>x.id===change.communityId);if(!community||change.shares.some(s=>!community.allowedIds.includes(s.plantId))||Math.abs(change.shares.reduce((n,s)=>n+s.percentage,0)-100)>.01)throw Error('The proposed mix failed validation.');}
      proposal={...result.proposal,context:original};
      field('aiProposalText').textContent=proposal.summary;
      field('aiProposalChanges').innerHTML=proposal.changes.map(change=>{const community=c.communities.find(x=>x.id===change.communityId);return '<li>'+esc(community.zone)+' / '+esc(community.band)+': '+change.shares.filter(s=>s.percentage>0).map(s=>esc(state.selected.find(p=>p.id===s.plantId)?.name||s.plantId)+' '+s.percentage.toFixed(1)+'%').join(', ')+'</li>';}).join('');
      field('aiProposalWarnings').textContent=proposal.warnings.join(' ');field('aiProposal').hidden=false;field('applyAI').disabled=!proposal.changes.length;
      field('aiFeedbackStatus').textContent='Proposal only · '+result.model+'. Review before applying.';
    }catch(e){field('aiFeedbackStatus').textContent=e.message;}finally{busy=false;await status();}
  }
  function applyAI(){if(!proposal||proposal.context!==JSON.stringify(context())){field('aiFeedbackStatus').textContent='The plan changed. Ask for a new proposal.';return;}const next={...recipes()};proposal.changes.forEach(c=>next[c.communityId]=Object.fromEntries(c.shares.map(s=>[s.plantId,s.percentage])));commitRecipes(next);}
  async function referencePNG(markup){
    const svg=markup?new DOMParser().parseFromString(markup,'image/svg+xml').documentElement:field('visualCanvas').querySelector('svg');if(!svg)throw Error('Generate a plan first.');
    const copy=svg.cloneNode(true);copy.querySelectorAll('text,title,g[font-family]').forEach(n=>n.remove());copy.setAttribute('viewBox','0 75 900 415');copy.setAttribute('width','900');copy.setAttribute('height','415');
    const image=new Image(),url=URL.createObjectURL(new Blob([copy.outerHTML],{type:'image/svg+xml'}));
    try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Could not prepare the schematic.'));image.src=url;});const canvas=document.createElement('canvas');canvas.width=900;canvas.height=415;canvas.getContext('2d').drawImage(image,0,0,900,415);return canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
  }
  async function renderImage(){
    const epoch=++imageEpoch,box=field('aiImage');if(!context()){box.hidden=true;field('illustrationEmpty').hidden=false;field('illustrationEmpty').textContent=state.planDirty?'Plan changed. Regenerate before creating an illustration.':'Generate a planting plan first.';return;}
    try{const key=await digest(viewKey()),record=await stored(key);if(epoch!==imageEpoch)return;currentImage=record||null;box.hidden=!record;field('illustrationEmpty').hidden=!!record;field('illustrationEmpty').textContent='No illustration for this plan, view and season.';field('illustrationDownload').hidden=!record;
      if(record){box.src=record.url||record.data;box.alt=record.label+' · '+field('viewSeason').value;field('illustrationDownload').href=box.src;field('illustrationDownload').download='plantscapes-'+field('viewSeason').value+'-illustration.png';field('illustrationStatus').textContent=record.label;}
      else if(!busy&&!field('illustrationStatus').textContent)field('illustrationStatus').textContent='AI illustrations are not planting specifications.';
    }catch{field('illustrationStatus').textContent='Local image storage is unavailable in this browser.';}
  }
  async function generateImage(refinement){
    if(busy)return;
    if(typeof refinement==='string'&&refinement.trim()){
      await status();
      if(!connection?.capabilities?.renderRefinement){field('illustrationStatus').textContent='Your server is running an older version. In its PowerShell window press Ctrl+C, run the Plantscapes startup command again, then click Update render. No paid request was sent.';return;}
    }
    if(field('viewAngle').value!=='path')return;
    if(!connection?.ready){document.querySelector('.illustration-panel details').open=true;field('illustrationStatus').textContent='Connect AI using the setup below, then check the connection.';return;}
    const c=context();if(!c||busy)return;const previousPrompt=renderPrompt;renderPrompt=typeof refinement==='string'?refinement.trim():renderPrompt;const requestedPrompt=renderPrompt;
    const original=viewKey(),source=field('visualCanvas').querySelector('svg')?.outerHTML,view={season:field('viewSeason').value,direction:field('viewDirection').value,angle:field('viewAngle').value,camera:currentCamera(),age:Number(field('viewAge').value)},key=await digest(original);
    if(await stored(key)){await renderImage();field('illustrationStatus').textContent='Using the saved illustration for this request.';return;}
    if(!confirm('Generate one low-quality 1024 × 1024 draft? Plantscapes sets aside $0.50 of its local allowance as a conservative safeguard, NOT a quoted image price. Actual API billing includes input and output tokens. Cancel to keep using the free schematic.')){renderPrompt=previousPrompt;return;}
    busy=true;refresh();field('illustrationStatus').textContent='Generating illustration… this may take a few minutes.';
    let failure='';try{const result=await post('/api/illustration',{context:c,image:await referencePNG(source),refinement:requestedPrompt,...view});if(requestedPrompt&&result.refinementApplied!==requestedPrompt)throw Error('The server did not confirm the refinement. Restart Plantscapes before trying again.');await stored(key,result);if(viewKey()===original)await renderImage();else field('illustrationStatus').textContent='Saved for the original view; the current plan or season has changed.';}catch(e){renderPrompt=previousPrompt;failure=e.message;}finally{busy=false;await status();if(failure){await renderImage();field('illustrationStatus').textContent=failure;}}
  }
  async function importImage(file){
    if(!file||!context())return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10000000){field('illustrationStatus').textContent='Use a PNG, JPEG or WebP image under 10 MB.';return;}
    const key=await digest(viewKey());try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});await stored(key,{data,label:'Imported illustration · not botanically verified'});await renderImage();}catch{field('illustrationStatus').textContent='Could not store this image locally.';}
  }
  function onPlan(){renderCommunities();renderCameraPresets();refresh();}
  // Map picking has keyboard-accessible path/highlight presets as an alternative.
  field('viewAngle').insertAdjacentHTML('afterbegin','<option value="path" selected>Path perspective</option>');field('viewAngle').value='path';
  field('visualCanvas').insertAdjacentHTML('beforebegin','<div class="camera-controls"><button id="placeViewpoint" class="button button-secondary" type="button">Choose viewpoint on map</button><p id="cameraHelp" class="compact-note" role="status">Click a path, then the highlight you want to look towards. Free schematic preview.</p><details><summary>Viewpoint presets</summary><div class="visual-controls"><label class="field"><span>Stand on</span><select id="cameraPath"></select></label><label class="field"><span>Look towards</span><select id="cameraTarget"></select></label><button id="applyCameraPreset" class="button button-secondary" type="button">Set viewpoint</button></div></details></div>');
  function renderCameraPresets(){
    const drawn=state.sketches.filter(s=>s.type==='path'&&s.points.length>1),paths=drawn.length?drawn:[{points:[...state.plotBoundary,state.plotBoundary[0]]}];
    field('cameraPath').innerHTML=paths.flatMap((s,i)=>[.25,.5,.75].map(t=>'<option value="'+i+','+t+'">'+(drawn.length?'Path '+(i+1):'Plot perimeter')+' · '+(t*100)+'%</option>')).join('');
    field('cameraTarget').innerHTML='<option value="centre">Plot centre</option>'+state.placements.filter(p=>p.tree||state.selected.find(s=>s.id===p.plantId)?.group==='Shrubs').slice(0,30).map(p=>'<option value="'+esc(p.id)+'">'+esc(state.selected.find(s=>s.id===p.plantId)?.name||'Plant')+'</option>').join('');
    field('applyCameraPreset').disabled=!paths.length;field('placeViewpoint').disabled=!paths.length;
  }
  field('placeViewpoint').addEventListener('click',()=>{state.cameraDraft=null;setTool('camera');field('map').scrollIntoView({block:'center',behavior:'instant'});});
  field('applyCameraPreset').addEventListener('click',()=>{
    const [index,t]=field('cameraPath').value.split(',').map(Number),drawn=state.sketches.filter(s=>s.type==='path'),path=drawn.length?drawn[index]:{points:[...state.plotBoundary,state.plotBoundary[0]]};if(!path||!state.planAudit)return;
    const segments=path.points.slice(1).map((b,i)=>{const a=latLngToMetric(path.points[i],state.planAudit.origin),q=latLngToMetric(b,state.planAudit.origin);return Math.hypot(q[0]-a[0],q[1]-a[1]);});let distance=segments.reduce((a,b)=>a+b,0)*t,i=0;while(i<segments.length-1&&distance>segments[i])distance-=segments[i++];
    const fraction=distance/(segments[i]||1),eye=path.points[i].map((n,j)=>n+(path.points[i+1][j]-n)*fraction),target=state.placements.find(p=>String(p.id)===field('cameraTarget').value)?.point||null;
    const b=planBounds();state.cameraDraft=eye;addCamera(target||[(b.minA+b.maxA)/2,(b.minB+b.maxB)/2]);
  });
  const illustrationNote=field('generateIllustration').parentElement.nextElementSibling;
  illustrationNote.textContent='One low-quality draft, only on click. $0.50 local reserve—not the image price. The schematic and planting mix are sent to OpenAI. Saved images are reused free.';
  field('aiConnection').setAttribute('role','status');
  field('communitySelect').addEventListener('change',renderRecipe);field('applyRecipe').addEventListener('click',applyRecipe);
  field('askAI').addEventListener('click',ask);field('applyAI').addEventListener('click',applyAI);
  field('undoRecipe').addEventListener('click',()=>{if(!recipeUndo.length)return;const previous=state.recipeOverrides,revision=state.planRevision,next=recipeUndo.pop();state.recipeOverrides=next;generatePlan();if(state.planRevision===revision){state.recipeOverrides=previous;recipeUndo.push(next);}});
  field('aiImage').insertAdjacentHTML('afterend','<div class="render-refinement"><label class="field"><span>Refine the render</span><textarea id="renderRequest" maxlength="1600" rows="2" placeholder="e.g. softer afternoon light, more natural foliage textures"></textarea></label><button id="refineRender" type="button" class="button button-secondary" disabled>Update render</button></div>');
  field('renderRequest').addEventListener('input',()=>{field('refineRender').disabled=busy||!context()||!field('renderRequest').value.trim();});
  field('refineRender').addEventListener('click',()=>generateImage(field('renderRequest').value));
  field('generateIllustration').addEventListener('click',()=>generateImage());field('importIllustration').addEventListener('change',e=>importImage(e.target.files[0]));
  field('exportAIReference').addEventListener('click',async()=>{try{const a=document.createElement('a');a.href=await referencePNG();a.download='plantscapes-'+field('viewSeason').value+'-reference.png';a.click();}catch(e){field('illustrationStatus').textContent=e.message;}});
  function changeCommunity(id,from,to){
    const c=state.planAudit?.communities.find(c=>c.id===id);if(!c)return;
    if(to&&!c.eligible.some(p=>p.id===to))return;
    const shares=Object.fromEntries(c.rows.map(r=>[r.plantId,r.percentage])),amount=shares[from]||0;delete shares[from];if(to)shares[to]=(shares[to]||0)+amount;
    const sum=Object.values(shares).reduce((a,b)=>a+b,0);if(!sum){alert('Choose a replacement before removing the last species in this mix.');return;}
    Object.keys(shares).forEach(k=>shares[k]=shares[k]/sum*100);commitRecipes({...recipes(),[id]:shares});
  }
  window.PlantscapesAI={refresh,onPlan,context,referencePNG,connect:status,changeCommunity};status();
})();
