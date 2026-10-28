/* Compact workflow. Legacy DOM hooks are parked outside the visible forms. */
(()=>{
  const park=document.createElement('div');park.hidden=true;park.inert=true;document.body.append(park);
  const remove=selector=>document.querySelectorAll(selector).forEach(el=>park.append(el));
  const parkField=id=>{const el=field(id);if(el)park.append(el.closest('label')||el);};
  ['productive','other'].forEach(v=>remove('input[name="projectType"][value="'+v+'"]'));
  // Remove empty choice labels too.
  $$('#stage1 .choice').filter(el=>!el.querySelector('input')).forEach(el=>el.remove());
  remove('#stage1 .stage-actions [data-go="0"]');
  field('toSite').textContent='Next >';
  $('#stage2 .stage-actions [data-go]').textContent='< Back';field('toConfirm').textContent='Next >';
  $('#stage3 .stage-actions [data-go]').textContent='< Back';
  $('#stage4 .stage-actions [data-go]').textContent='< Back';
  ['audience','projectNotes','siteReference','mapPreset'].forEach(parkField);
  $('.site-map-shell').before(field('location').closest('.field-row'));
  $$('#priorityOptions input').filter(el=>['food','learning'].includes(el.value)).forEach(el=>park.append(el.closest('label')));
  remove('.stage-header p,.stage-kicker,.nav-note,.site-map-top,.map-disclaimer,#stage2 .field small,.zones-head,#zoneList,#stage3 .evidence-banner,.composition-panel,#paletteGate,#stage4 .case-study-note:not(#restorationOverride)');
  if(field('inNetherlands'))field('inNetherlands').closest('fieldset').hidden=true;
  const features=field('featureCanopy').closest('fieldset');
  field('siteDescription').closest('label').after(features);
  field('location').placeholder='Search a town, address or place';
  field('location').closest('.field-row').classList.remove('two');
  field('location').closest('label').querySelector('span').textContent='Search location';
  const icons={plotUndo:['Undo point','M18 8H5l4-4M5 8l4 4M5 8h9a5 5 0 010 10'],plotFinish:['Finish boundary','M4 12l5 5L20 5'],plotClear:['Clear boundary','M5 6h14M9 6V3h6v3M7 6l1 14h8l1-14']};
  for(const [id,[label,d]] of Object.entries(icons)){const b=field(id);b.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="'+d+'" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';b.setAttribute('aria-label',label);b.title=label;b.className='tool icon-tool';$('.site-map-toolbar').append(b);}
  field('plotStatus').parentElement.hidden=true;
  const colours=field('colourPreference');colours.querySelector('small').remove();
  const makeColourPicker=(id,label)=>{
    const select=field(id),picker=document.createElement('div'),values=[['','No preference','no-preference'],['purple','Purple','purple'],['white','White','white'],['pink','Pink','pink'],['yellow','Yellow','yellow'],['blue','Blue','blue']];
    picker.className='colour-picker';picker.innerHTML='<span id="'+id+'Label">'+label+'</span><div class="colour-swatches" role="radiogroup" aria-labelledby="'+id+'Label">'+values.map(([value,name,klass])=>'<label class="colour-swatch '+klass+'" title="'+name+'"><input type="radio" name="'+id+'Swatch" value="'+value+'" aria-label="'+name+'"'+(select.value===value?' checked':'')+'><i></i></label>').join('')+'</div>';
    select.classList.add('swatch-select');select.setAttribute('aria-labelledby',id+'Label');picker.append(select);
    picker.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{select.value=input.value;select.dispatchEvent(new Event('change'));}));
    return picker;
  };
  colours.replaceChildren(makeColourPicker('anchorColour1','Recurring flower colour'),makeColourPicker('anchorColour2','Second colour'));
  field('conditionZones').after(colours);
  field('toPalette').textContent='Next >';
  $('#stage4 h2').textContent='Explore candidates';
  remove('#stage5');remove('.stage[data-stage="5"]');
  const candidateActions=document.createElement('div');candidateActions.className='candidate-output-actions';
  field('toPlan').className='button button-primary';field('downloadCsv').className='button button-secondary';
  field('toPlan').innerHTML='<span>Continue to plan workspace<small>Test a planting arrangement using illustrative rules and simulated quantities.</small></span>';
  field('downloadCsv').innerHTML='<span>Download planting palette CSV<small>Includes names, zones, a simulated decision trace and unresolved checks.</small></span>';
  const outputLayout=document.createElement('section');outputLayout.className='candidate-output-layout';
  const outputSide=document.createElement('div');outputSide.className='candidate-output-side';
  const outputHeading=document.createElement('h2');outputHeading.className='candidate-output-heading';outputHeading.textContent='Output';
  const stage4Actions=$('#stage4 .stage-actions');stage4Actions.before(outputLayout);
  candidateActions.append(field('downloadCsv'),field('toPlan'));outputSide.append(outputHeading,stage4Actions);outputLayout.append(outputSide,candidateActions);
  remove('#toReview');remove('#stage6');remove('.stage[data-stage="6"]');
  const toolbar=$('#stage7 .plan-main .toolrow');toolbar.classList.add('site-map-toolbar','plan-map-toolbar');
  const planMain=$('#stage7 .plan-main'),workflowTabs=document.createElement('div');workflowTabs.id='mapWorkflowTabs';workflowTabs.className='map-workflow-tabs';workflowTabs.innerHTML='<button id="mapStepOne" type="button" class="map-workflow-step active">1. Map Area</button><button id="mapStepTwo" type="button" class="map-workflow-step" disabled>2. Refine planting</button>';planMain.insertBefore(workflowTabs,toolbar);
  ['pan','planting','path','water','open','symbol'].forEach(tool=>toolbar.append(toolbar.querySelector('[data-tool="'+tool+'"]')));
  toolbar.querySelector('[data-tool="symbol"]').textContent='Add plants';
  const selectPlant=document.createElement('button');selectPlant.type='button';selectPlant.className='tool';selectPlant.dataset.tool='selectPlant';selectPlant.textContent='Edit plants';toolbar.append(selectPlant);
  const mapSpeciesField=field('symbolSpecies').closest('label');mapSpeciesField.id='mapSpeciesField';mapSpeciesField.classList.add('map-species-field');toolbar.insertBefore(mapSpeciesField,selectPlant);
  selectPlant.addEventListener('click',()=>{state.draft=[];state.sketchHover=null;drawDraft();setTool('selectPlant');});
  const editAreas=document.createElement('button');editAreas.id='editPlanAreas';editAreas.type='button';editAreas.className='tool edit-areas-tool';editAreas.textContent='Edit areas';
  toolbar.insertBefore(editAreas,toolbar.querySelector('[data-tool="symbol"]'));
  editAreas.onclick=()=>{const stage=field('stage7'),editing=stage.classList.toggle('plan-area-editing');editAreas.textContent=editing?'View concept':'Edit areas';setTool('pan');field('generationStatus').textContent=editing?'Edit planting areas, paths, water or open ground. Regenerate the concept when you are finished.':'Concept view restored.';};
  field('mapStepOne').onclick=()=>{if(state.generated&&!field('stage7').classList.contains('plan-area-editing'))editAreas.click();};
  field('mapStepTwo').onclick=()=>{if(field('stage7').classList.contains('plan-area-editing')&&!state.planDirty)editAreas.click();};
  const selectedPlantBar=document.createElement('div');selectedPlantBar.id='mapSelectionBar';selectedPlantBar.className='map-selection-bar';selectedPlantBar.hidden=true;selectedPlantBar.innerHTML='<span id="selectedPlantCount">1 plant selected</span><div id="plantToolActions" class="plant-tool-actions"></div>';field('map').after(selectedPlantBar);
  field('undoPlanEdit').className='tool icon-tool';field('undoPlanEdit').innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M18 8H5l4-4M5 8l4 4M5 8h9a5 5 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';field('undoPlanEdit').setAttribute('aria-label','Undo plant edit');field('undoPlanEdit').title='Undo plant edit';field('undoPlanEdit').hidden=true;
  toolbar.append(field('undoPlanEdit'),field('undoSketch'),field('finishShape'),field('clearSketch'));
  toolbar.querySelector('[data-tool="pan"]').innerHTML='↔ Move map';
  const planToolIcons={undoSketch:['Undo point','M18 8H5l4-4M5 8l4 4M5 8h9a5 5 0 010 10'],finishShape:['Finish shape','M4 12l5 5L20 5'],clearSketch:['Clear plan layers','M5 6h14M9 6V3h6v3M7 6l1 14h8l1-14']};
  for(const [id,[label,d]] of Object.entries(planToolIcons)){const b=field(id);b.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="'+d+'" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';b.setAttribute('aria-label',label);b.title=label;b.className='tool icon-tool';}
  field('generationStatus').textContent='';
  remove('.zone-assignment,.design-review-disclosure');
  const plantTools=$('.plant-tools'),planSidebar=$('.plan-sidebar'),placementAlert=document.createElement('div'),plantToolMode=document.createElement('p');
  placementAlert.id='planActionAlert';placementAlert.className='plan-action-alert';placementAlert.hidden=true;placementAlert.setAttribute('role','alert');placementAlert.tabIndex=-1;
  plantToolMode.id='plantToolMode';plantToolMode.className='plant-tool-mode';plantToolMode.textContent='Add plant';
  plantTools.querySelector('h3').after(plantToolMode);
  const mixDetails=$$('#stage7 .workspace-details').find(details=>details.querySelector('summary')?.textContent.includes('Planting mix'));
  field('askAI').parentElement.append(field('undoRecipe'));field('undoRecipe').textContent='Undo planting change';field('undoRecipe').hidden=true;
  const generatePlan=field('generatePlan'),downloadPlan=field('downloadPlanSvg'),mapPhaseAction=document.createElement('section'),sidebarActions=document.createElement('div');generatePlan.classList.add('plan-generate-action');mapPhaseAction.id='mapPhaseAction';mapPhaseAction.className='map-phase-action';mapPhaseAction.innerHTML='<div class="map-phase-copy"><strong>Generate concept</strong><span>to refine planting</span></div>';mapPhaseAction.append(generatePlan,downloadPlan);generatePlan.setAttribute('aria-label','Generate concept');downloadPlan.hidden=!state.generated;sidebarActions.className='plan-sidebar-actions';sidebarActions.append(placementAlert,mapPhaseAction);planSidebar.append(sidebarActions);
  const viewRender=document.createElement('section');viewRender.id='viewRenderSection';viewRender.innerHTML='<div class="view-render-heading"><h3>View &amp; render</h3><p>Review the planting concept from a chosen viewpoint, then create or export its visual output.</p></div><p id="viewRenderNotice" class="view-render-notice">Available after you generate the planting concept.</p>';
  const illustrationPanel=$('.illustration-panel'),visualPanel=field('visualPanel'),viewNotice=viewRender.querySelector('#viewRenderNotice'),planReady=state.generated&&!state.planDirty;illustrationPanel.id='illustrationPanel';visualPanel.hidden=!planReady;illustrationPanel.hidden=!planReady;viewNotice.hidden=planReady;viewRender.append(visualPanel,illustrationPanel);field('communityControls').after(viewRender);
  const viewRenderJump=document.createElement('button');viewRenderJump.id='viewRenderJump';viewRenderJump.type='button';viewRenderJump.className='button button-secondary';viewRenderJump.textContent='View & render ↓';viewRenderJump.hidden=true;viewRenderJump.onclick=()=>viewRender.scrollIntoView({behavior:'smooth',block:'start'});$('.workspace-actions').append(viewRenderJump);
  const planBack=$('#stage7 .stage-actions [data-go]');planBack.dataset.go='4';planBack.textContent='< Back';
  const names={1:'Project aim',2:'Locate & outline',3:'Site condition',4:'Candidates',7:'Planting plan'};
  $$('.stage').forEach(b=>{const n=Number(b.dataset.stage);b.innerHTML='<b>'+([1,2,3,4,7].indexOf(n)+1)+'</b>'+names[n];});
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
