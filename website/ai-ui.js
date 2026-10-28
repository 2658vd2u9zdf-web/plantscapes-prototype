/* AI is optional. Real provider responses, explicit review, persistent per-view images. */
(function(){
  'use strict';
  let connection=null,busy=false,proposal=null,recipeUndo=[],imageEpoch=0,currentImage=null,renderPrompt='';
  const recipes=()=>state.recipeOverrides||(state.recipeOverrides={});
  const clean=n=>Number(Number(n||0).toFixed(4));
  function treeOptions(){
    if(!state.planAudit||state.planDirty)return [];
    const original=state.placements,options=[],a=state.planAudit,b=a.bounds;
    state.placements=original.slice();
    try{
      const trees=state.selected.filter(p=>p.group==='Trees').map(p=>engine.enrich(p));
      for(let i=1;i<=1600&&options.length<40&&trees.length;i++){
        const xy=[b.minX+(b.maxX-b.minX)*((i*.61803398875)%1),b.minY+(b.maxY-b.minY)*((i*.41421356237)%1)];
        for(const plant of trees){const point=metricToLatLng(xy,a.origin);
          if(checkPlanEdit(plant,point)||state.placements.some(q=>q.tree&&Math.hypot(q.xy[0]-xy[0],q.xy[1]-xy[1])<(q.spread+plant.spread)*.35))continue;
          const slot={id:'tree-slot-'+options.length,plantId:plant.id,xy:xy.map(clean)};
          options.push(slot);state.placements.push({...slot,tree:true,spread:plant.spread,spacing:plant.spacing});break;
        }
      }
    }finally{state.placements=original;}return options;
  }
  function context(){
    const a=state.planAudit,p=project();if(!a?.communityMode||state.planDirty)return null;
    const pool=palettePool(),geometry=[{type:'boundary',points:localMetricPolygon(state.plotBoundary,a.origin).map(p=>p.map(clean))},...state.sketches.filter(s=>s.type!=='camera').map(s=>({type:s.type,zoneId:s.zoneId,points:s.points.map(p=>latLngToMetric(p,a.origin).map(clean))}))];
    const beds=[...geometry.filter(g=>g.type==='planting'),...geometry.filter(g=>g.type==='water')];
    const communities=a.communities.map(c=>{
      const bed=beds[c.bedIndex],zone=state.zones.find(z=>String(z.id)===String(c.zoneId)),xs=bed.points.map(p=>p[0]),ys=bed.points.map(p=>p[1]);
      const dimensions={available_width_m:Math.max(...xs)-Math.min(...xs),available_length_m:Math.max(...ys)-Math.min(...ys),plantable_area_m2:engine.area(bed.points)};
      const allowedIds=pool.filter(plant=>recommender.communityFit({id:plant.id},zone,p,dimensions,{band:c.band,shade:c.shade,bedType:bed.type,waterPresent:geometry.some(g=>g.type==='water')},engine.config).fit).map(p=>p.id);
      return {id:c.id,zoneId:c.zoneId,bedIndex:c.bedIndex,zone:c.zone,band:c.band,shade:c.shade,area:clean(c.area),density:clean(c.density),total:c.total,allowedIds,rows:c.rows.map(r=>({plantId:r.plantId,percentage:clean(r.percentage),count:r.count}))};
    });
    const ids=new Set([...communities.flatMap(c=>c.allowedIds),...state.placements.filter(p=>p.tree||p.manual).map(p=>p.plantId),...state.selected.filter(p=>p.group==='Trees').map(p=>p.id)]);
    return {treeOptions:treeOptions(),version:'community-recipes-v2/v0.3',project:recommender.project(p,'placement'),zones:state.zones.map(z=>({id:z.id,conditions:z.conditions})),geometry,trees:state.placements.filter(p=>p.tree||p.manual).map(p=>({plantId:p.plantId,xy:p.xy.map(clean)})),species:pool.filter(p=>ids.has(p.id)).map(p=>({id:p.id,latin:p.latin})),communities};
  }
  function palettePool(){return [...new Map([...recommender.screen(screeningZones(),project()).candidates,...state.selected].map(p=>[p.id,p])).values()];}
  function viewKey(){return JSON.stringify({renderer:'render-chain-v2',context:context(),camera:currentCamera(),season:field('viewSeason').value,direction:field('viewDirection').value,angle:field('viewAngle').value,age:field('viewAge').value});}
  async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
  function db(){return new Promise((resolve,reject)=>{const request=indexedDB.open('plantscapes-illustrations',1);request.onupgradeneeded=()=>request.result.createObjectStore('images');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
  async function stored(key,value){const database=await db();try{return await new Promise((resolve,reject)=>{const tx=database.transaction('images',value?'readwrite':'readonly'),request=value?tx.objectStore('images').put(value,key):tx.objectStore('images').get(key);tx.oncomplete=()=>resolve(value||request.result);tx.onerror=()=>reject(tx.error);});}finally{database.close();}}
  async function status(){try{const response=await fetch('/api/status',{signal:AbortSignal.timeout(3000),cache:'no-store'});if(!response.ok)throw Error();connection=await response.json();}catch{connection=null;}refresh();return connection;}
  async function post(route,body){
    if(!connection?.ready)throw Error('AI needs the local server, an API key and its enable setting. Import an image to use your ChatGPT subscription instead.');
    const response=await fetch(route,{method:'POST',headers:{'Content-Type':'application/json','X-Plantscapes-Token':connection.nonce},body:JSON.stringify(body),signal:AbortSignal.timeout(210000)}),result=await response.json();if(!response.ok)throw Error(result.error||'The AI request failed.');return result;
  }
  function refresh(){
    const ready=!!context();
    field('askAI').disabled=busy||!ready||!connection?.ready;field('generateIllustration').disabled=busy||!ready||field('viewAngle').value!=='path';
    if(field('refineRender'))field('refineRender').disabled=busy||!ready||!field('renderRequest').value.trim();
    field('aiConnection').textContent=connection?.authState==='rejected'?'Key rejected · restart the launcher with an active key':connection?.ready?(connection.authState==='verified'?'API authenticated':'Key configured · not yet verified')+' · $'+connection.remaining.toFixed(2)+' local allowance available (not your API balance)':'AI off · local API setup required';
    field('viewDirection').closest('label').hidden=field('viewAngle').value==='path';
    field('importIllustration').disabled=!ready;field('exportAIReference').disabled=!ready;
    field('undoRecipe').disabled=!recipeUndo.length;field('undoRecipe').hidden=!recipeUndo.length;
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
    field('communityRows').innerHTML=c.eligible.map(p=>{const r=rows.get(p.id),why=p.recommendation?'<button type="button" class="text-button recipe-why" data-reasoning="'+esc(p.id)+'" aria-expanded="false">Why this plant</button><small class="recipe-reason" hidden>'+esc(p.recommendation.label+'. '+p.recommendation.summary.text)+'</small>':'';return '<label class="recipe-row"><span>'+esc(p.name)+'<small>'+esc(p.latin)+'</small>'+why+'</span><input type="number" min="0" max="100" step="0.1" value="'+(r?.percentage||0).toFixed(1)+'" data-recipe-species="'+esc(p.id)+'" aria-label="'+esc(p.name)+' share of plant count, percent"><span>%</span><small>'+Number(r?.count||0).toLocaleString()+'</small></label>';}).join('');
    $$('[data-reasoning]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();const reason=button.nextElementSibling,open=reason.hidden;reason.hidden=!open;button.setAttribute('aria-expanded',String(open));}));
    field('communityNumbers').textContent='~'+Math.round(c.area)+' m² · '+c.density.toFixed(1)+' plants/m² · ~'+c.total.toLocaleString()+' plants (prototype estimate). Shares are percentages of the plant count, not ground cover.';
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
      await status();if(!(connection?.capabilities?.plantingRefinement>=2))throw Error('Restart Plantscapes in PowerShell to load the new planting refinement, then try again. No paid request was sent.');
      const result=await post('/api/feedback',{context:c,request});
      if(JSON.stringify(context())!==original)throw Error('The plan changed while AI was responding. Ask again for the current plan.');
      for(const change of result.proposal.changes){const community=c.communities.find(x=>x.id===change.communityId);if(!community||change.shares.some(s=>!community.allowedIds.includes(s.plantId))||Math.abs(change.shares.reduce((n,s)=>n+s.percentage,0)-100)>.01)throw Error('The proposed mix failed validation.');}
      proposal={...result.proposal,context:original};
      field('aiProposalText').textContent=proposal.summary;
      field('aiProposalChanges').innerHTML=proposal.changes.map(change=>{const community=c.communities.find(x=>x.id===change.communityId);return '<li>'+esc(community.zone)+' / '+esc(community.band)+': '+[...new Set([...change.shares.map(s=>s.plantId),...community.rows.map(s=>s.plantId)])].map(plantId=>({plantId,percentage:change.shares.find(s=>s.plantId===plantId)?.percentage||0})).map(s=>esc(palettePool().find(p=>p.id===s.plantId)?.name||s.plantId)+' '+(community.rows.find(r=>r.plantId===s.plantId)?.percentage||0).toFixed(1)+'% → '+s.percentage.toFixed(1)+'%'+(!state.selected.some(p=>p.id===s.plantId)?' (add to palette)':'')).join(', ')+'</li>';}).join('');
      field('aiProposalWarnings').textContent=proposal.warnings.join(' ');field('aiProposal').hidden=false;field('applyAI').disabled=!proposal.changes.length&&!proposal.treeAdditions?.length;field('aiProposalChanges').innerHTML+=(proposal.treeAdditions||[]).map(id=>{const slot=c.treeOptions.find(s=>s.id===id);return '<li>Add '+esc(state.selected.find(p=>p.id===slot?.plantId)?.name||'tree')+'</li>';}).join('');
      field('aiFeedbackStatus').textContent=proposal.changes.length||proposal.treeAdditions?.length?'Suggested changes — review, then apply.':'No applicable change was returned. Your palette is unchanged; see the explanation above.';
    }catch(e){field('aiFeedbackStatus').textContent=e.message;}finally{busy=false;await status();}
  }
  function applyAI(){if(!proposal||proposal.context!==JSON.stringify(context())){field('aiFeedbackStatus').textContent='The plan changed. Ask for a new proposal.';return;}const accepted=proposal,c=context(),additions=(accepted.treeAdditions||[]).map(id=>c.treeOptions.find(s=>s.id===id));
    const snapshot={full:true,selected:state.selected.slice(),placements:structuredClone(state.placements),recipes:structuredClone(recipes()),audit:state.planAudit,masses:state.planMasses,revision:state.planRevision};
    const next=Object.fromEntries(c.communities.map(c=>[c.id,Object.fromEntries(c.rows.map(r=>[r.plantId,r.percentage]))]));
    accepted.changes.forEach(c=>next[c.communityId]=Object.fromEntries(c.shares.map(s=>[s.plantId,s.percentage])));
    const addedIds=new Set(accepted.changes.flatMap(c=>c.shares.filter(s=>s.percentage>0).map(s=>s.plantId)));
    state.selected=[...new Map([...state.selected,...palettePool().filter(p=>addedIds.has(p.id))].map(p=>[p.id,p])).values()];
    if(accepted.changes.length){state.recipeOverrides=next;generatePlan({skipConfirmation:true});if(state.planRevision===snapshot.revision){state.selected=snapshot.selected;state.recipeOverrides=snapshot.recipes;field('aiFeedbackStatus').textContent='Could not apply the proposal. The palette has been kept.';return;}
      const unapplied=accepted.changes.some(change=>{const actual=state.planAudit.communities.find(c=>c.id===change.communityId);if(!actual)return true;const ids=new Set([...change.shares.map(s=>s.plantId),...actual.rows.map(r=>r.plantId)]);return [...ids].some(id=>Math.abs((change.shares.find(s=>s.plantId===id)?.percentage||0)-(actual.rows.find(r=>r.plantId===id)?.percentage||0))>.02);});
      if(unapplied){state.selected=snapshot.selected;state.placements=snapshot.placements;state.recipeOverrides=snapshot.recipes;state.planAudit=snapshot.audit;state.planMasses=snapshot.masses;state.planRevision=snapshot.revision;renderPalette();renderCommunities();refreshAfterPlanEdit('The proposed mix could not be applied; previous plan restored.');proposal=accepted;field('aiProposal').hidden=false;field('aiFeedbackStatus').textContent='The generated mix did not match the proposal. Your previous plan has been restored. Refresh the website and regenerate before trying again.';return;}
      for(const item of snapshot.placements.filter(p=>p.manual)){const plant=state.selected.find(p=>p.id===item.plantId);if(plant&&!checkPlanEdit(plant,item.point))state.placements.push(item);}
    }
    let count=0;for(const slot of additions){if(!slot)continue;const plant=engine.enrich(state.selected.find(p=>p.id===slot.plantId)),point=metricToLatLng(slot.xy,state.planAudit.origin);if(checkPlanEdit(plant,point))continue;const item=makePlacement(Date.now()+count,plant,slot.xy,state.planAudit.origin,state.planAudit.bounds,selectedCompositionMode(),true);state.placements.push({...item,manual:true,accent:true,spacing:plant.spacing,spread:plant.spread,height:plant.height,reason:'AI-proposed selected-palette tree; placement checks passed.'});count++;}
    const touched=new Set(accepted.changes.flatMap(ch=>c.communities.find(x=>x.id===ch.communityId).rows.map(r=>r.plantId)));
    state.selected=state.selected.filter(p=>!touched.has(p.id)||quantityForPlant(p.id)>0);
    recipeUndo.push(snapshot);state.planUndo=[];renderPalette();renderCommunities();refreshAfterPlanEdit('Planting proposal applied.');
    field('aiFeedbackStatus').textContent='Applied '+accepted.changes.length+' mix changes'+(additions.length?' and '+count+' of '+additions.length+' proposed trees':'')+'. Palette and plan updated. Undo is available.';
    proposal=null;field('aiProposal').hidden=true;refresh();}
  async function referencePNG(markup){
    const svg=markup?new DOMParser().parseFromString(markup,'image/svg+xml').documentElement:field('visualCanvas').querySelector('svg');if(!svg)throw Error('Generate a plan first.');
    const copy=svg.cloneNode(true);copy.querySelectorAll('text,title,g[font-family]').forEach(n=>n.remove());copy.setAttribute('viewBox','0 75 900 415');copy.setAttribute('width','900');copy.setAttribute('height','415');
    const image=new Image(),url=URL.createObjectURL(new Blob([copy.outerHTML],{type:'image/svg+xml'}));
    try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Could not prepare the schematic.'));image.src=url;});const canvas=document.createElement('canvas');canvas.width=900;canvas.height=415;canvas.getContext('2d').drawImage(image,0,0,900,415);return canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
  }
  async function renderImage(){
    const epoch=++imageEpoch,box=field('aiImage');if(!context()){box.hidden=true;field('illustrationEmpty').hidden=false;field('illustrationEmpty').textContent=state.planDirty?'Plan changed. Regenerate before creating an illustration.':'Generate a planting plan first.';return;}
    try{const key=await digest(viewKey()),record=await stored(key);if(epoch!==imageEpoch)return;currentImage=record||null;if(field('restoreRender')){field('restoreRender').hidden=!record?.original;field('restoreRender').disabled=busy;}box.hidden=!record;field('illustrationEmpty').hidden=!!record;field('illustrationEmpty').textContent='No illustration for this plan, view and season.';field('illustrationDownload').hidden=!record;
      if(record){box.src=record.url||record.data;box.alt=record.label+' · '+field('viewSeason').value;field('illustrationDownload').href=box.src;field('illustrationDownload').download='plantscapes-'+field('viewSeason').value+'-illustration.png';}
      else if(!busy&&!field('illustrationStatus').textContent)field('illustrationStatus').textContent='AI illustrations are not planting specifications.';
    }catch{field('illustrationStatus').textContent='Local image storage is unavailable in this browser.';}
  }
  async function generateImage(refinement){
    if(busy)return;
    if(typeof refinement==='string'&&refinement.trim()){
      await status();
      if(connection?.ready&&!(connection.capabilities?.renderRefinement>=2)){field('illustrationStatus').textContent='Your server is running an older version. In its PowerShell window press Ctrl+C, run the Plantscapes startup command again, then click Update render. No paid request was sent.';return;}
    }
    if(field('viewAngle').value!=='path'){field('illustrationStatus').textContent='Choose Path perspective before generating or refining a render.';return;}
    if(!connection?.ready){document.querySelector('.illustration-panel details').open=true;field('illustrationStatus').textContent='Connect AI using the setup below, then check the connection.';return;}
    const c=context();if(!c){field('illustrationStatus').textContent='Regenerate the planting plan before updating this render.';return;}if(busy)return;const previousPrompt=renderPrompt;renderPrompt=typeof refinement==='string'?refinement.trim():'';const requestedPrompt=renderPrompt;
    const original=viewKey(),source=field('visualCanvas').querySelector('svg')?.outerHTML,view={season:field('viewSeason').value,direction:field('viewDirection').value,angle:field('viewAngle').value,camera:currentCamera(),age:Number(field('viewAge').value)},key=await digest(original);
    const previous=await stored(key);if(requestedPrompt&&!previous?.key){renderPrompt=previousPrompt;field('illustrationStatus').textContent='Generate a base render before refining it.';return;}
    if(previous&&!requestedPrompt){await renderImage();field('illustrationStatus').textContent='Using the saved illustration for this request.';return;}
    if(!confirm('Generate one low-quality 1024 × 1024 draft? Plantscapes sets aside $0.20 of its local allowance, NOT a quoted image price or maximum API charge. Actual API billing includes input and output tokens. Cancel to keep using the free schematic.')){renderPrompt=previousPrompt;return;}
    busy=true;refresh();field('illustrationStatus').textContent='Generating illustration… this may take a few minutes.';
    field('refineRender').textContent='Updating…';let failure='';try{const result=await post('/api/illustration',{context:c,image:await referencePNG(source),refinement:requestedPrompt,previousKey:requestedPrompt?previous?.key:undefined,...view});if(requestedPrompt&&result.refinementApplied!==requestedPrompt)throw Error('The server did not confirm the refinement. Restart Plantscapes before trying again.');await stored(key,{...result,original:previous?.original||previous||null,previous:previous?{...previous,previous:null}:null});if(viewKey()===original)await renderImage();else field('illustrationStatus').textContent='Saved for the original view; the current plan or season has changed.';}catch(e){renderPrompt=previousPrompt;failure=e.message;}finally{busy=false;field('refineRender').textContent='Update render';await status();if(!failure)field('illustrationStatus').textContent='Render updated.';if(failure){await renderImage();field('illustrationStatus').textContent=failure;}}
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
  illustrationNote.textContent='One low-quality draft, only on click. $0.20 local reserve—not the image price. The schematic and planting mix are sent to OpenAI. Saved images are reused free.';
  field('aiConnection').setAttribute('role','status');
  field('communitySelect').addEventListener('change',renderRecipe);field('applyRecipe').addEventListener('click',applyRecipe);
  field('askAI').parentElement.append(field('undoRecipe'));field('undoRecipe').textContent='Undo planting change';
  field('askAI').addEventListener('click',ask);field('applyAI').addEventListener('click',applyAI);
  field('undoRecipe').addEventListener('click',()=>{if(!recipeUndo.length)return;const previous=state.recipeOverrides,revision=state.planRevision,next=recipeUndo.pop();if(next.full){state.selected=next.selected;state.placements=next.placements;state.recipeOverrides=next.recipes;state.planAudit=next.audit;state.planMasses=next.masses;state.planRevision++;state.planUndo=[];renderPalette();renderCommunities();refreshAfterPlanEdit('Previous palette and planting restored.');return;}state.recipeOverrides=next;generatePlan();if(state.planRevision===revision){state.recipeOverrides=previous;recipeUndo.push(next);}});
  field('aiImage').insertAdjacentHTML('afterend','<div class="render-refinement"><label class="field"><span>Refine the render</span><textarea id="renderRequest" maxlength="1600" rows="2" placeholder="e.g. softer afternoon light, more natural foliage textures"></textarea></label><button id="refineRender" type="button" class="button button-secondary" disabled>Update render</button><button id="restoreRender" type="button" class="button button-secondary" hidden>Return to original</button></div>');
  field('refineRender').parentElement.append(field('illustrationStatus'));
  field('restoreRender').addEventListener('click',async()=>{if(busy||!currentImage?.original)return;await stored(await digest(viewKey()),currentImage.original);renderPrompt='';field('renderRequest').value='';await renderImage();});
  field('renderRequest').addEventListener('input',()=>{field('refineRender').disabled=busy||!context()||!field('renderRequest').value.trim();});
  field('refineRender').addEventListener('click',()=>generateImage(field('renderRequest').value).catch(e=>{field('illustrationStatus').textContent=e.message||'Could not update the render.';}));
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
