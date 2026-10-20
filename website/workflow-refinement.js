/* Compact workflow. Legacy DOM hooks are parked outside the visible forms. */
(()=>{
  const park=document.createElement('div');park.hidden=true;park.inert=true;document.body.append(park);
  const remove=selector=>document.querySelectorAll(selector).forEach(el=>park.append(el));
  const parkField=id=>{const el=field(id);if(el)park.append(el.closest('label')||el);};
  ['productive','other'].forEach(v=>remove('input[name="projectType"][value="'+v+'"]'));
  // Remove empty choice labels too.
  $$('#stage1 .choice').filter(el=>!el.querySelector('input')).forEach(el=>el.remove());
  ['audience','maintenance','projectNotes','siteReference','mapPreset'].forEach(parkField);
  remove('#stage1 fieldset:last-of-type');
  $$('#priorityOptions input').filter(el=>['food','learning'].includes(el.value)).forEach(el=>park.append(el.closest('label')));
  remove('.stage-header p,.stage-kicker,.nav-note,.site-map-top,.map-disclaimer,#stage2 .field small,.zones-head,#zoneList,#stage3 .evidence-banner,.composition-panel,#paletteGate,#restorationOverride,#stage4 .case-study-note,#paletteSummary,#paletteChangeLog,#catalogueStatus');
  field('inNetherlands').closest('fieldset').hidden=true;
  const features=field('featureCanopy').closest('fieldset');features.querySelector('legend').textContent='Existing trees / canopy, paving or walls';
  ['featureWater','featureDry','featureWet','featureSlope','featureRoad'].forEach(id=>park.append(field(id).closest('label')));
  field('siteDescription').closest('label').after(features);
  field('location').placeholder='Search a town, address or place';
  field('location').closest('.field-row').classList.remove('two');
  field('location').closest('label').querySelector('span').textContent='Search location';
  const icons={plotUndo:['Undo point','M18 8H5l4-4M5 8l4 4M5 8h9a5 5 0 010 10'],plotFinish:['Finish boundary','M4 12l5 5L20 5'],plotClear:['Clear boundary','M5 6h14M9 6V3h6v3M7 6l1 14h8l1-14']};
  for(const [id,[label,d]] of Object.entries(icons)){const b=field(id);b.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="'+d+'" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';b.setAttribute('aria-label',label);b.title=label;b.className='tool icon-tool';$('.site-map-toolbar').append(b);}
  field('plotStatus').parentElement.hidden=true;
  const colours=field('colourPreference');colours.querySelector('small').remove();field('conditionZones').after(colours);
  field('toPalette').textContent='Confirm & explore candidates';
  $('#stage4 h2').textContent='Explore candidates';field('toReview').textContent='Continue';
  remove('#stage5');remove('.stage[data-stage="5"]');
  // Maintain an inert stage stub for historic links and compatibility.
  $$('#stage6 .output-card').forEach(card=>{const button=card.querySelector('button');card.replaceChildren(button);});
  field('downloadCsv').textContent='Download planting palette CSV';
  $('#stage6 [data-go]').dataset.go='4';$('#stage6 [data-go]').textContent='Back to candidates';
  // Old click closures keep the original back target, so handle explicitly.
  $('#stage6 [data-go]').addEventListener('click',e=>{e.stopImmediatePropagation();showStage(4);},true);
  const toolbar=$('#stage7 .plan-main .toolrow');toolbar.append(field('finishShape'),field('undoSketch'));
  field('finishShape').textContent='Finish shape ↵';
  field('generationStatus').textContent='';
  remove('.zone-assignment,.design-review-disclosure');
  $('.plant-tools').append(field('undoRecipe'));field('undoRecipe').textContent='Undo mix edit';
  const visualStage=document.createElement('section');visualStage.id='stage8';visualStage.className='stage-panel hidden';visualStage.innerHTML='<div class="stage-header"><h2>Camera & render</h2></div>';
  visualStage.append(field('visualPanel'),$('.illustration-panel'));
  visualStage.insertAdjacentHTML('beforeend','<div class="stage-actions"><button class="button button-secondary" id="backToPlan">Back to planting plan</button></div>');$('.stage-content').append(visualStage);
  field('backToPlan').onclick=()=>showStage(7);
  $('#stage7 .stage-actions').insertAdjacentHTML('beforeend','<button id="toCamera" class="button button-primary">Camera & render</button>');
  field('toCamera').onclick=()=>{if(!state.generated||state.planDirty){generationBlocked('Generate the planting concept first.');return;}advance(8);};
  const nav=document.createElement('button');nav.className='stage';nav.dataset.stage='8';nav.innerHTML='<b>7</b>Camera & render';nav.onclick=()=>showStage(8);$('.stage-nav').append(nav);
  const names={1:'Project',2:'Site',3:'Conditions & colours',4:'Candidates',6:'Output',7:'Planting plan',8:'Camera & render'};
  $$('.stage').forEach(b=>{const n=Number(b.dataset.stage);b.innerHTML='<b>'+([1,2,3,4,6,7,8].indexOf(n)+1)+'</b>'+names[n];});
  field('viewAngle').value='path';field('viewAngle').closest('label').hidden=true;field('viewDirection').closest('label').hidden=true;
  field('visualPanel').querySelector('h3').textContent='Viewpoint';
  field('generateIllustration').textContent='Render with AI';
  $('.illustration-panel .community-heading').after(field('aiConnection'));
  const setup=document.createElement('button');setup.type='button';setup.id='renderSetup';setup.className='text-button';setup.textContent='Connect AI';$('.illustration-panel .community-heading').append(setup);
  async function connectAI(){
    setup.disabled=true;setup.textContent='Checking…';
    try{const result=await PlantscapesAI.connect(),box=$('.illustration-panel details');
      if(result?.ready){setup.textContent='AI connected';field('illustrationStatus').textContent=result.authState==='verified'?'AI connected. Choose Render with AI.':'Key configured. Choose Render with AI to make the first request.';box.open=false;}
      else{setup.textContent='Connect AI';box.open=true;field('illustrationStatus').textContent=result?.authState==='rejected'?'The key was rejected. Restart with an active key.':result?'This website was started with AI off. Restart Plantscapes with -EnableAI.':'The local AI server is not reachable. Start Plantscapes with -EnableAI.';box.scrollIntoView({block:'center',behavior:'instant'});}
    }finally{setup.disabled=false;}
  }
  setup.onclick=connectAI;
  $('.illustration-panel details').querySelector('summary').textContent='Rendering setup';
  const setupText=$$('.illustration-panel details p');setupText[0].textContent='Start Plantscapes with -EnableAI and keep its PowerShell window open.';setupText.at(-1).remove();
  document.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.target.closest('input,textarea,select,button'))return;if(state.stage===2&&state.plotDraft.length>=3){e.preventDefault();finishPlot();}else if(state.stage===7&&state.draft.length>=(state.tool==='path'?2:3)){e.preventDefault();finishShape();}});
  showStage(state.stage,false);
})();
