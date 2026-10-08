/* Plantscapes workflow v2. Synthetic ecology is for interaction testing only. */
const DATASET_VERSION = 'nl-vascular-v0.2';
const RULE_VERSION = window.PLANTSCAPES_RULEBOOK?.version || 'rulebook unavailable';
const engine = window.PlantscapesEngine;
const PATH_WIDTH = 1.5;
const demo = window.PLANTSCAPES_DEMO || {places:{},plants:[],version:'missing'};
const oudolfPrecedents = window.PLANTSCAPES_OUDOLF_PRECEDENTS || [];
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const state = {
  stage: 0, unlocked: 1, nextZoneId: 2,
  zones: [{id: 1, name: 'Main site', conditions: null}],
  inventory: [], catalogue: [], catalogueSource: 'starter names',
  selected: [], removed: [], approved: false, log: [], paletteBuilt:false,
  designRules:null, compositionMode:'auto', planAudit:null, planDirty:false, planUndo:[],
  siteMap:null, siteMapReady:false, plotMode:'pan', plotDraft:[], plotBoundary:[], plotDraftLayer:null, plotLayer:null,
  map: null, mapReady: false, tool: 'pan', draft: [], draftLayer: null,
  sketches: [], planOverlay: null, planObjectUrl: null, siteBoundaryLayer:null,
  placements:[], planMasses:[], massGrid:null, placementLayers:[], coverageLayers:[], selectedPlacement:null, generated:false, planRevision:0
};
const groupOrder = ['Trees','Shrubs','Flowers & herbs','Grasses, sedges & rushes','Bulbs / geophytes','Climbers','Aquatic & marginal plants','Needs classification'];
const starter = [
  ['Achillea millefolium','Duizendblad','Flowers & herbs'],['Centaurea jacea','Knoopkruid','Flowers & herbs'],
  ['Leucanthemum vulgare','Margriet','Flowers & herbs'],['Prunella vulgaris','Gewone brunel','Flowers & herbs'],
  ['Lotus corniculatus','Gewone rolklaver','Flowers & herbs'],['Filipendula ulmaria','Moerasspirea','Flowers & herbs'],
  ['Mentha aquatica','Watermunt','Flowers & herbs'],['Knautia arvensis','Beemdkroon','Flowers & herbs'],
  ['Campanula rotundifolia','Grasklokje','Flowers & herbs'],['Alliaria petiolata','Look-zonder-look','Flowers & herbs'],
  ['Deschampsia cespitosa','Ruwe smele','Grasses, sedges & rushes'],['Carex riparia','Oeverzegge','Grasses, sedges & rushes'],
  ['Festuca rubra','Rood zwenkgras','Grasses, sedges & rushes'],['Juncus effusus','Pitrus','Grasses, sedges & rushes'],
  ['Molinia caerulea','Pijpenstrootje','Grasses, sedges & rushes'],['Briza media','Trilgras','Grasses, sedges & rushes'],
  ['Cornus sanguinea','Rode kornoelje','Shrubs'],['Salix cinerea','Grauwe wilg','Shrubs'],
  ['Viburnum opulus','Gelderse roos','Shrubs'],['Corylus avellana','Hazelaar','Shrubs'],
  ['Crataegus monogyna','Eenstijlige meidoorn','Shrubs'],['Prunus spinosa','Sleedoorn','Shrubs'],
  ['Alnus glutinosa','Zwarte els','Trees'],['Betula pendula','Ruwe berk','Trees'],
  ['Quercus robur','Zomereik','Trees'],['Tilia cordata','Winterlinde','Trees'],
  ['Sorbus aucuparia','Wilde lijsterbes','Trees'],['Salix alba','Schietwilg','Trees'],
  ['Lonicera periclymenum','Wilde kamperfoelie','Climbers'],['Hedera helix','Klimop','Climbers'],
  ['Iris pseudacorus','Gele lis','Aquatic & marginal plants'],['Lythrum salicaria','Grote kattenstaart','Aquatic & marginal plants'],
  ['Caltha palustris','Dotterbloem','Aquatic & marginal plants'],['Butomus umbellatus','Zwanenbloem','Aquatic & marginal plants']
].map((row, i) => ({id:'starter-'+i, latin:row[0], name:row[1], group:row[2], url:'', reviewed:false}));
const starterGroup = new Map(starter.map(p => [p.latin.toLowerCase(), p.group]));
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field = id => document.getElementById(id);
const checked = id => field(id).checked;
const choice = name => (document.querySelector('input[name="'+name+'"]:checked') || {}).value || '';
const project = () => ({
  type: choice('projectType'), area: geographicPolygonAreaM2(state.plotBoundary)||0, audience:field('audience').value,
  maintenance:field('maintenance').value, priorities:$$('#priorityOptions input:checked').map(x=>x.value),
  character:field('spatialCharacter').value, notes:field('projectNotes').value.trim(),
  publicAccess:checked('publicAccess'), publicHarvest:checked('foodHarvest'), sightlines:checked('clearSightlines'),
  rewilding:$$('#priorityOptions input:checked').some(x=>x.value==='rewilding'), restorationOrnamentals:checked('restorationOrnamentals'),
  anchorColours:[field('anchorColour1').value,field('anchorColour2').value].filter(Boolean)
});
const site = () => ({location:field('location').value.trim(), reference:field('siteReference').value.trim(), description:field('siteDescription').value.trim()});

function stageFromUrl(){
  const match = location.hash.match(/^#stage-(\d)$/);
  const proposed = match ? Number(match[1]) : 0;
  return proposed <= state.unlocked ? proposed : 0;
}
function showStage(number, updateHistory=true){
  if(number > state.unlocked || number < 0 || number > 7) return;
  state.stage = number;
  field('home').classList.toggle('hidden', number !== 0);
  field('workflow').classList.toggle('hidden', number === 0);
  for(let n=1;n<=7;n++) field('stage'+n).classList.toggle('hidden',n!==number);
  $$('.stage').forEach(button => {
    const n = Number(button.dataset.stage);
    button.disabled = n > state.unlocked;
    button.classList.toggle('active',n===number);
    if(n===number) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
  });
  field('stageCount').textContent = number+' of 7';
  if(number===2){renderZoneList();setTimeout(initSiteMap,40);}
  if(number===3) renderConditionZones();
  if(number===4) renderPalette();
  if(number===5) renderReview();
  if(number===6) field('outputSummary').textContent = state.selected.length+' selected candidate'+(state.selected.length===1?'':'s')+' · synthetic evidence requires real-world review.';
  if(number===7){field('planNotation').innerHTML=PlantscapesGraphics.notation;renderSpeciesOptions();renderPlanRules();setTimeout(initMap,40);}
  if(updateHistory) history.pushState({stage:number},'',number===0?'#home':'#stage-'+number);
  window.scrollTo({top:0,behavior:'instant'});
}
function advance(number){ state.unlocked=Math.max(state.unlocked,number); showStage(number); }
function invalidateFrom(stage){
  state.approved=false;state.unlocked=Math.min(state.unlocked,stage);if(stage<=3)state.paletteBuilt=false;
  if(stage<=4&&state.generated){state.generated=false;state.planAudit=null;state.planDirty=false;state.planUndo=[];state.placements=[];state.planMasses=[];state.selectedPlacement=null;state.placementLayers.forEach(layer=>state.map&&state.map.removeLayer(layer));state.placementLayers=[];field('generatePlan').textContent='Generate demo plan';field('downloadPlanSvg').disabled=true;field('downloadViewSvg').disabled=true;field('generationStatus').textContent='The project or palette changed. Generate a new demo arrangement.';renderSymbolEditor();renderPlacementList();renderVisualization();}
}

function renderZoneList(){
  field('zoneList').innerHTML = state.zones.map((z,i) =>
    '<div class="zone-row"><span>'+(i+1)+'</span><input data-zone-name="'+z.id+'" aria-label="Name for zone '+(i+1)+'" value="'+esc(z.name)+'" placeholder="Zone name"><button type="button" class="icon-button" data-remove-zone="'+z.id+'" aria-label="Remove '+esc(z.name)+'" title="Remove zone" '+(state.zones.length===1?'disabled':'')+'>×</button></div>'
  ).join('');
  $$('[data-zone-name]').forEach(input => input.addEventListener('input', () => {
    const z=state.zones.find(item=>item.id===Number(input.dataset.zoneName));
    z.name=input.value; invalidateFrom(2);
  }));
  $$('[data-remove-zone]').forEach(button => button.addEventListener('click', () => {
    state.zones=state.zones.filter(z=>z.id!==Number(button.dataset.removeZone)); invalidateFrom(2); renderZoneList();
  }));
}
function nearestDemoPlace(){
  const point=state.siteMap&&state.plotBoundary.length?state.plotBoundary.reduce((a,p)=>[a[0]+p[0]/state.plotBoundary.length,a[1]+p[1]/state.plotBoundary.length],[0,0]):(demo.places[field('mapPreset').value]||demo.places.pijnacker).center;
  return Object.values(demo.places).reduce((best,p)=>!best||Math.hypot((p.center[0]-point[0])*1.6,p.center[1]-point[1])<Math.hypot((best.center[0]-point[0])*1.6,best.center[1]-point[1])?p:best,null);
}
function defaultConditions(){
  const profile=nearestDemoPlace()||{soil:'unknown',moisture:'fresh',disturbance:'moderate'};
  return {
    soil:checked('featureHardscape')?'made':profile.soil, moisture:checked('featureWet')?'wet':checked('featureDry')?'dry':profile.moisture,
    hydrology:checked('featureWater')?'edge':checked('featureWet')||profile.moisture==='wet'?'seasonal':'none',
    light:checked('featureCanopy')?'mixed':'sun', canopy:checked('featureCanopy')?'yes':'no',
    disturbance:checked('featureRoad')?'high':profile.disturbance, hardscape:checked('featureHardscape')?'yes':'no',
    waterEdge:checked('featureWater')?'yes':'no', source:'unverified', note:''
  };
}
const options = {
  soil:[['unknown','Unknown'],['sand','Sand'],['clay','Clay / loam'],['peat','Peat / organic'],['made','Made ground']],
  moisture:[['unknown','Unknown'],['dry','Dry'],['fresh','Fresh / moderately moist'],['wet','Wet'],['variable','Variable']],
  hydrology:[['unknown','Unknown'],['none','No regular inundation'],['seasonal','Seasonal'],['long','Long-duration wetness'],['permanent','Permanent shallow water'],['edge','Water edge; regime unknown']],
  light:[['unknown','Unknown'],['sun','Mostly sun'],['mixed','Sun / partial shade'],['shade','Mostly shade']],
  canopy:[['unknown','Unknown'],['yes','Existing canopy'],['no','No canopy']],
  disturbance:[['unknown','Unknown'],['low','Low'],['moderate','Moderate'],['high','High / road stress']],
  hardscape:[['unknown','Unknown'],['yes','Nearby'],['no','No nearby hardscape']],
  waterEdge:[['unknown','Unknown'],['yes','Present'],['no','Absent']],
  source:[['unverified','Not confirmed yet'],['demo','Accept synthetic suggestion for test'],['observation','My site observation'],['survey','Site survey / test'],['document','Existing site document']]
};
const labels = {soil:'Soil',moisture:'Moisture',hydrology:'Wetness regime',light:'Light',canopy:'Canopy',disturbance:'Disturbance',hardscape:'Hardscape',waterEdge:'Water edge',source:'Basis for confirmation'};
function selectHtml(z,key){
  const values=options[key]; const current=z.conditions[key];
  return '<label class="field"><span>'+labels[key]+'</span><select data-zone-condition="'+z.id+'" data-condition-key="'+key+'">'+values.map(pair=>'<option value="'+pair[0]+'"'+(pair[0]===current?' selected':'')+'>'+pair[1]+'</option>').join('')+'</select></label>';
}
function renderConditionZones(){
  const place=nearestDemoPlace();
  field('conditionBasis').textContent='Approximate profile around '+(place?place.label:'the chosen area')+'; inferred from your boundary and feature checkboxes. It is invented for workflow testing, not derived from a soil map or survey.';
  state.zones.forEach(z=>{if(!z.conditions)z.conditions=defaultConditions();});
  field('conditionZones').innerHTML=state.zones.map((z,i)=>'<article class="condition-card"><div class="condition-card-head"><h3>'+(i+1)+'. '+esc(z.name||'Unnamed zone')+'</h3><span>Suggested · confirm or correct</span></div><div class="condition-grid">'+['soil','moisture','hydrology','light','canopy','disturbance','hardscape','waterEdge'].map(key=>selectHtml(z,key)).join('')+'</div><div class="condition-card-foot">'+selectHtml(z,'source')+'<label class="field"><span>Evidence note <em>optional</em></span><input data-zone-note="'+z.id+'" value="'+esc(z.conditions.note)+'" placeholder="e.g. surveyed in June"></label></div></article>').join('');
  $$('[data-zone-condition]').forEach(input=>input.addEventListener('change',()=>{
    const z=state.zones.find(item=>item.id===Number(input.dataset.zoneCondition));
    z.conditions[input.dataset.conditionKey]=input.value; invalidateFrom(3);
    field('conditionError').classList.add('hidden');
  }));
  $$('[data-zone-note]').forEach(input=>input.addEventListener('input',()=>{
    state.zones.find(item=>item.id===Number(input.dataset.zoneNote)).conditions.note=input.value; invalidateFrom(3);
  }));
}
function validateConditions(){
  const invalid=state.zones.filter(z=>!z.conditions||z.conditions.source==='unverified');
  if(invalid.length){const box=field('conditionError');box.textContent='Choose the basis for confirmation in '+invalid.map(z=>z.name||'unnamed zone').join(', ')+'. You can keep individual conditions as unknown.';box.classList.remove('hidden');return false;}
  field('conditionError').classList.add('hidden');return true;
}
function parseCsv(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"' && quoted && text[i+1]==='"'){cell+='"';i++;}
    else if(c==='"')quoted=!quoted;
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}
async function loadCatalogue(){
  state.catalogue=starter.slice();
  if(Array.isArray(window.PLANTSCAPES_CATALOGUE)&&window.PLANTSCAPES_CATALOGUE.length>100){
    state.catalogue=window.PLANTSCAPES_CATALOGUE.map(record=>({...record,group:starterGroup.get(record.latin.toLowerCase())||'Needs classification',reviewed:false}));
    addOudolfPrecedents();
    state.catalogueSource=DATASET_VERSION;
    field('catalogueStatus').textContent=state.catalogue.length.toLocaleString()+' plant names · includes '+oudolfPrecedents.length+' Oudolf plan precedents';
    return;
  }
  const paths=['../dataset/derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv','data/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv'];
  for(const path of paths){
    try{
      const response=await fetch(path);
      if(!response.ok)continue;
      const rows=parseCsv(await response.text()), head=rows.shift();
      if(!head||rows.length<100)continue;
      const col=name=>head.indexOf(name);
      const latinIndex=col('scientific_name'), nameIndex=col('vernacular_nl'), idIndex=col('plant_id'), urlIndex=col('verspreidingsatlas_species_page_url'), reviewIndex=col('review_status');
      state.catalogue=rows.map(row=>({id:row[idIndex],latin:row[latinIndex],name:row[nameIndex]||row[latinIndex],group:starterGroup.get((row[latinIndex]||'').toLowerCase())||'Needs classification',url:row[urlIndex]||'',reviewed:row[reviewIndex]==='reviewed'})).filter(p=>p.latin);
      state.catalogueSource=DATASET_VERSION;
      break;
    }catch{}
  }
  addOudolfPrecedents();
  field('catalogueStatus').textContent=state.catalogue.length.toLocaleString()+' plant names · includes '+oudolfPrecedents.length+' Oudolf plan precedents';
}
function precedentGroup(name){
  const genus=(name.match(/^[×x]?([A-Z][a-z]+)/)||[])[1]||'';
  if(['Magnolia','Acer','Tilia','Quercus','Betula','Malus','Amelanchier'].includes(genus))return 'Trees';
  if(['Hamamelis','Viburnum','Hydrangea','Cornus','Rosa','Sambucus','Corylus','Prunus'].includes(genus))return 'Shrubs';
  if(['Clematis','Lonicera','Hedera'].includes(genus))return 'Climbers';
  if(['Carex','Deschampsia','Calamagrostis','Hakonechloa','Molinia','Sesleria','Melica','Festuca','Panicum','Eragrostis','Briza','Schizachyrium','Sporobolus','Stipa','Miscanthus'].includes(genus))return 'Grasses, sedges & rushes';
  if(['Allium','Crocus','Leucojum','Trillium','Galanthus','Anemone'].includes(genus))return 'Bulbs / geophytes';
  return 'Flowers & herbs';
}
function precedentId(name){return 'oudolf-'+String(name).toLocaleLowerCase('en').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function addOudolfPrecedents(){
  const known=new Map(state.catalogue.map(p=>[String(p.latin||'').toLocaleLowerCase('en'),p]));
  oudolfPrecedents.forEach((record,index)=>{
    const latin=record.normalized_name;if(!latin)return;
    const key=latin.toLocaleLowerCase('en'),existing=known.get(key);
    if(existing){existing.group=precedentGroup(latin);existing.precedent=true;existing.caseId=record.case_id;existing.confidence=record.confidence;existing.sourceReading=record.source_reading;return;}
    const plant={id:precedentId(latin),latin,name:latin,group:precedentGroup(latin),url:'',reviewed:false,precedent:true,caseId:record.case_id,confidence:record.confidence,sourceReading:record.source_reading};
    state.catalogue.push(plant);known.set(key,plant);
  });
}
async function loadDesignRules(){
  try{
    let rules=window.PLANTSCAPES_DESIGN_RULES||null;
    if(!rules){
      const response=await fetch('data/oudolf-informed-design-rules.v0.1.json');
      if(!response.ok)throw new Error('Rule dataset unavailable');
      rules=await response.json();
    }
    if(!Array.isArray(rules.rules)||!Array.isArray(rules.composition_modes))throw new Error('Rule dataset has an unsupported structure');
    state.designRules=rules;
    const version=field('compositionRuleStatus');
    if(version)version.textContent='Rule set '+rules.schema_version+' · '+rules.rules.length+' explainable principles';
  }catch{
    state.designRules=null;
    const version=field('compositionRuleStatus');
    if(version)version.textContent='Built-in composition fallback · rule JSON unavailable in this browser context';
  }
}
const fallbackModes=[
  {mode_id:'matrix_accent',label:'Matrix + accents',description:'A repeated ground layer links the planted area; accents recur as visible groups.'},
  {mode_id:'repeated_drifts',label:'Repeated drifts',description:'Elongated, flowing masses repeat across the bed or linked beds.'},
  {mode_id:'community_patches',label:'Irregular plant communities',description:'Irregular, interlocking groups respond to local site conditions.'}
];
function compositionModes(){return state.designRules?.composition_modes||fallbackModes;}
function selectedCompositionMode(){
  const chosen=field('compositionMode')?.value||state.compositionMode;
  if(chosen!=='auto')return chosen;
  return 'repeated_drifts';
}
function compositionModeRecord(){return selectedCompositionMode()==='formal_blocks'?{mode_id:'formal_blocks',label:'Formal bands & blocks',description:'Geometric groups follow your paths, using the same ecology, spacing and safety rules.'}:compositionModes().find(mode=>mode.mode_id===selectedCompositionMode())||fallbackModes[0];}
function compositionRoleFor(plant){
  if(!plant?.demo&&!plant?.precedent)return 'unassessed';
  if(plant.group==='Trees'||plant.group==='Shrubs')return 'woody_framework';
  if(plant.group==='Grasses, sedges & rushes')return 'matrix';
  if(plant.group==='Climbers')return 'structural_perennial';
  if(plant.group==='Aquatic & marginal plants')return 'community_patch';
  return Number(plant.height)>=1.1?'structural_perennial':'seasonal_accent';
}
function compositionRoleLabel(role){
  return {matrix:'Matrix layer',structural_perennial:'Structural perennial',seasonal_accent:'Seasonal accent',woody_framework:'Woody framework',community_patch:'Site-specific patch'}[role]||'Not assessed';
}
function compositionNarrative(){
  const mode=compositionModeRecord(),roles={};
  state.selected.forEach(plant=>{const role=compositionRoleFor(plant);roles[role]=(roles[role]||0)+1;});
  const roleText=Object.entries(roles).filter(([key])=>key!=='unassessed').map(([key,count])=>count+' '+compositionRoleLabel(key).toLowerCase()).join(' · ');
  return {mode,roleText};
}
function inventoryNamesFromRows(rows){return rows.map(row=>String(row[0]||'').trim()).filter(name=>name&&!/^(species|scientific.?name|plant.?name|naam)$/i.test(name)).slice(0,2000);}
function renderInventory(){
  const box=field('inventoryPreview');box.classList.toggle('hidden',!state.inventory.length);
  if(state.inventory.length)box.innerHTML='<strong>'+state.inventory.length+' inventory name'+(state.inventory.length===1?'':'s')+' loaded · verify on site</strong><p>'+esc(state.inventory.slice(0,12).join(' · '))+(state.inventory.length>12?' …':'')+'</p>';
}
const colourHex={white:'#f8f7e8',purple:'#9b79b9',pink:'#df8fab',yellow:'#ecd46a',blue:'#799bc7',green:'#91a96c',brown:'#a78368',gold:'#d5ba74',cream:'#eee6c0'};
function demoCandidates(){
  const p=project(),zones=state.zones.map(z=>z.conditions||defaultConditions());
  return [...demo.plants,...(demo.ornamentals||[])].map((row,i)=>{
    const [latin,name,group,moisture,light,height,from,to,colour,caution]=row;
    const demoSoils=moisture==='dry'?['sand','clay']:moisture==='wet'?['peat','clay']:['clay','peat','sand'];
    const perZone=zones.map((c,j)=>{
      let score=3;
      if(demoSoils.includes(c.soil))score+=1;else if(c.soil==='made')score-=1;
      if(c.moisture===moisture)score+=3;else if(c.moisture==='variable'||c.moisture==='unknown')score+=1;else if((c.moisture==='wet'&&moisture==='dry')||(c.moisture==='dry'&&moisture==='wet'))score-=4;
      if(c.light===light||c.light==='mixed'||light==='mixed')score+=2;else score-=2;
      if(group==='Aquatic & marginal plants')score+=c.waterEdge==='yes'||c.hydrology==='seasonal'?3:-7;
      if(group==='Trees'&&p.area<180)score-=5;
      if(p.sightlines&&height>2)score-=2;
      if(c.hardscape==='yes'&&group==='Trees')score-=2;
      if(p.type==='restoration'&&['Flowers & herbs','Grasses, sedges & rushes'].includes(group))score+=1;
      return {score,index:j,zone:state.zones[j]?.name||'Main site'};
    }).sort((a,b)=>b.score-a.score);
    const plant=engine.enrich({id:'demo-'+i,latin,name,group,moisture,light,soil:demoSoils.join(' / '),height,from,to,colour,caution,score:perZone[0].score,zone:perZone[0].zone,reviewed:false,demo:true,nativeStatus:i>=demo.plants.length?'non_native_fixture':'native_fixture',url:''});
    // Preference scores cannot override ecological exclusion checks.
    const fits=perZone.filter(match=>engine.zoneFit(plant,state.zones[match.index],p).fit);
    if(!fits.length||!engine.eligibility(plant,p).eligible)return null;
    plant.score=fits[0].score;plant.zone=fits[0].zone;
    plant.role=compositionRoleFor(plant);
    return plant;
  }).filter(x=>x&&x.score>=4).sort((a,b)=>Number(a.nativeStatus==='non_native_fixture')-Number(b.nativeStatus==='non_native_fixture')||b.score-a.score||a.name.localeCompare(b.name,'nl'));
}
function buildDemoPalette(){
  state.selected=demoCandidates();state.removed=[];state.log=['Built '+state.selected.length+' site-filtered test candidates under '+RULE_VERSION+'. '+(project().rewilding?'Rewilding: native fixtures only.':'Native fixtures first; labelled ornamental alternatives allowed.')];state.paletteBuilt=true;state.approved=false;
}
function cardHtml(p){
  if(p.demo){
    const months=['J','F','M','A','M','J','J','A','S','O','N','D'].map((month,i)=>'<span '+(i+1>=p.from&&i+1<=p.to?'class="bloom" style="--bloom:'+colourHex[p.colour]+'"':'')+'>'+month+'</span>').join('');
    return '<div class="plant-row"><div class="plant-row-inner"><div class="plant-row-name"><strong>'+esc(p.name)+'</strong><em>'+esc(p.latin)+'</em><small>Demo fit · '+esc(p.zone)+' · synthetic score '+p.score+' · <span class="role-tag">'+esc(compositionRoleLabel(compositionRoleFor(p)))+'</span></small></div><button type="button" class="plant-control" data-expand="'+esc(p.id)+'" aria-label="More about '+esc(p.name)+'" aria-expanded="false">⌄</button><button type="button" class="plant-control icon-button" data-remove-plant="'+esc(p.id)+'" aria-label="Remove '+esc(p.name)+'" title="Remove">×</button></div><div class="plant-detail hidden"><div class="trait-preview"><div class="botanical-demo" role="img" aria-label="Generic botanical illustration; not a photograph"><span style="--petal:'+colourHex[p.colour]+'">✿</span><small>Illustration only</small></div><div><strong>Flowering period · simulated</strong><div class="month-strip" aria-label="Simulated flowering from month '+p.from+' to '+p.to+'">'+months+'</div><p>Blossom colour: '+esc(p.colour)+' · verify phenology.</p></div></div><p><strong>Status & spacing:</strong> '+esc(p.nativeStatus==='non_native_fixture'?'Non-native ornamental fixture':'Native fixture')+' · mature spread '+p.spread.toFixed(2)+' m · draft spacing '+p.spacing.toFixed(2)+' m. Verify status and dimensions.</p><p><strong>Composition role:</strong> '+esc(compositionRoleLabel(compositionRoleFor(p)))+' · assigned from the mock layer and height, not reviewed plant traits.</p><p><strong>Suggested zone:</strong> '+esc(p.zone)+' · mock fit based on '+esc(p.soil)+' soil, '+esc(p.moisture)+' moisture and '+esc(p.light)+' light.</p><p><strong>Role & size:</strong> '+esc(p.group)+' · approximate mature height '+p.height+' m. Verify spread and spacing.</p><p><strong>Caution:</strong> '+esc(p.caution)+'. Edible parts and toxicity are unverified. Do not use this record to decide harvesting or public safety.</p><p><strong>Evidence:</strong> Synthetic Plantscapes test layer '+esc(demo.version)+'; style logic uses '+esc(RULE_VERSION)+'. <span class="data-unknown">No verified site suitability or locality</span></p></div></div>';
  }
  const source=p.precedent?'Oudolf case study '+esc(p.caseId)+' · name-resolution confidence '+Math.round((p.confidence||0)*100)+'% · ornamental precedent only':p.url?'<a href="'+esc(p.url)+'" target="_blank" rel="noreferrer">Open taxonomy record</a>':'No record link in starter subset';
  const months=['J','F','M','A','M','J','J','A','S','O','N','D'].map(month=>'<span>'+month+'</span>').join('');
  return '<div class="plant-row"><div class="plant-row-inner"><div class="plant-row-name"><strong>'+esc(p.name)+'</strong><em>'+esc(p.latin)+'</em><small>'+(p.precedent?'Oudolf case-study precedent · not a site recommendation':'Manual working selection · not a site recommendation')+'</small></div><button type="button" class="plant-control" data-expand="'+esc(p.id)+'" aria-label="More about '+esc(p.name)+'" aria-expanded="false">⌄</button><button type="button" class="plant-control icon-button" data-remove-plant="'+esc(p.id)+'" aria-label="Remove '+esc(p.name)+'" title="Remove">×</button></div><div class="plant-detail hidden" id="detail-'+esc(p.id.replace(/[^a-z0-9-]/gi,'-'))+'"><div class="trait-preview"><div class="photo-placeholder" role="img" aria-label="Plant photograph not licensed for this record">Photograph<br>not available</div><div><strong>Flowering months and blossom colour</strong><div class="month-strip" aria-label="Flowering months not yet verified">'+months+'</div><p>No reviewed flowering data; no months are highlighted.</p></div></div><p><strong>Potential zone:</strong> Not assessed. Confirmed site zones: '+esc(state.zones.map(z=>z.name).join(', '))+'.</p><p><strong>Ecological role, soil and light fit, mature size:</strong> Not reviewed in this dataset.</p><p><strong>Hazards, edible parts and compatibility:</strong> Unknown. Do not use for public-contact or harvesting decisions without specialist checks.</p><p><strong>Evidence:</strong> Taxonomic identity only. '+source+'. <span class="data-unknown">Case-plan use does not establish Dutch nativeness or site suitability.</span></p></div></div>';
}
function renderPalette(){
  const p=project(), manual=state.selected.length, composition=compositionNarrative();
  field('restorationOverride').classList.toggle('hidden',p.type!=='restoration'||p.rewilding);
  field('colourPreference').classList.toggle('hidden',p.rewilding);
  field('compositionMode').value=state.compositionMode;
  field('compositionGuide').innerHTML='<strong>'+esc(composition.mode.label)+'</strong><span>'+esc(composition.mode.description)+' These are spatial roles, not species ratios.</span>';
  const modeRuleIds=composition.mode.rule_ids||[],modeRules=(state.designRules?.rules||[]).filter(rule=>modeRuleIds.includes(rule.rule_id));
  const evidenceById=new Map((state.designRules?.evidence_sources||[]).map(source=>[source.id,source]));
  field('compositionEvidence').innerHTML=modeRules.length?'<p>Rule-based guidance; it shapes mock spatial grouping, not ecological eligibility:</p><ul>'+modeRules.map(rule=>'<li>'+esc(rule.rule)+'<small>Evidence: '+esc(rule.evidence_ids.map(id=>evidenceById.get(id)?.pages||evidenceById.get(id)?.type||id).filter(Boolean).join(' · '))+'</small></li>').join('')+'</ul><p class="data-unknown">Rule interpretations are not fixed planting formulas. Source-plan colour marks are legend symbols, not reliable flower-colour data.</p>':'<p>Choose a composition mode. The local rule file provides the evidence-linked guidance when available.</p>';
  field('paletteGate').innerHTML='<strong>'+esc(p.rewilding?'Rewilding · native plants only':'Public-park design · native plants first')+'</strong><span>Approved design rules guide the concept. Plant fit, spread and safety remain labelled test data. Name-only records can be shortlisted but cannot be automatically placed.</span>';
  field('paletteSummary').innerHTML='<strong>'+manual+' synthetic candidates in your working palette</strong><br>Project: '+esc(p.type)+' · '+esc(p.area)+' m² · '+esc(state.zones.length)+' confirmed zone'+(state.zones.length===1?'':'s')+'. Mode: '+esc(composition.mode.label)+'. Palette role counts: '+esc(composition.roleText||'not yet assigned')+'. Counts describe taxa, not planting area or quantities.';
  field('paletteGroups').innerHTML=groupOrder.map(group=>{
    const items=state.selected.filter(x=>x.group===group);
    return '<section class="palette-group"><h3>'+esc(group)+'<span>'+items.length+'</span></h3>'+(items.length?items.map(cardHtml).join(''):'<p class="empty-group">No eligible selection for this layer. Change the conditions or add a plant for review.</p>')+'</section>';
  }).join('');
  $$('[data-remove-plant]').forEach(button=>button.addEventListener('click',()=>{
    const index=state.selected.findIndex(p=>p.id===button.dataset.removePlant);if(index<0)return;
    const p=state.selected.splice(index,1)[0];state.removed.push(p);state.log.push('Removed '+p.name);invalidateFrom(4);renderPalette();
  }));
  $$('[data-expand]').forEach(button=>button.addEventListener('click',()=>{
    const detail=button.closest('.plant-row').querySelector('.plant-detail');
    const open=button.getAttribute('aria-expanded')!=='true';
    button.setAttribute('aria-expanded',String(open));detail.classList.toggle('hidden',!open);button.textContent=open?'⌃':'⌄';
  }));
  field('paletteChangeLog').innerHTML=state.log.length?esc(state.log.slice(-3).join(' · '))+(state.removed.length?' <button type="button" id="undoPlant">Undo removal</button>':''):'No palette edits yet.';
  if(field('undoPlant'))field('undoPlant').addEventListener('click',()=>{
    const p=state.removed.pop();if(!p)return;state.selected.push(p);state.log.push('Restored '+p.name);invalidateFrom(4);renderPalette();
  });
}
function renderSearch(){
  const q=field('plantSearch').value.trim().toLocaleLowerCase('nl-NL'), box=field('searchResults');
  if(q.length<2){box.classList.add('hidden');box.innerHTML='';return;}
  const results=state.catalogue.filter(p=>(p.name+' '+p.latin).toLocaleLowerCase('nl-NL').includes(q)).sort((a,b)=>Number(b.precedent)-Number(a.precedent)).slice(0,30);
  box.classList.remove('hidden');
  box.innerHTML=results.length?results.map(p=>'<button type="button" class="search-result" data-add-plant="'+esc(p.id)+'"><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.precedent?'Oudolf plan · '+p.caseId+' · identity '+Math.round((p.confidence||0)*100)+'%':p.latin)+'</small></span><b>'+((state.selected.some(x=>x.id===p.id))?'Added':'+ Add name')+'</b></button>').join(''):'<p class="empty-group">No matching name in the loaded catalogue. This is not evidence that the species is absent from the Netherlands.</p>';
  $$('[data-add-plant]').forEach(button=>button.addEventListener('click',()=>{
    let p=state.catalogue.find(x=>x.id===button.dataset.addPlant);
    if(!p||state.selected.some(x=>x.id===p.id))return;
    p=demoCandidates().find(x=>x.latin.toLowerCase()===p.latin.toLowerCase())||p;
    if(state.selected.some(x=>x.latin.toLowerCase()===p.latin.toLowerCase()))return;
    state.selected.push(p);state.log.push('Manually added '+p.name);invalidateFrom(4);renderPalette();renderSearch();
  }));
}
function renderReview(){
  const selected=state.selected,removed=state.removed;
  field('reviewSummary').innerHTML='<div><strong>'+selected.length+'</strong><span>selected candidates</span></div><div><strong>'+removed.length+'</strong><span>excluded during review</span></div><div><strong>'+state.zones.length+'</strong><span>confirmed site zones</span></div>';
  field('reviewGroups').innerHTML=groupOrder.filter(group=>selected.some(p=>p.group===group)).map(group=>'<section><h3>'+esc(group)+'</h3><p>'+selected.filter(p=>p.group===group).map(p=>esc(p.name)).join(' · ')+'</p></section>').join('')+'<section><h3>Excluded</h3><p>'+(removed.length?removed.map(p=>esc(p.name)).join(' · '):'None')+'</p></section>';
}
function csvCell(v){let s=String(v==null?'':v);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function downloadCsv(){
  const p=project(),s=site();
  const rows=[
    ['PLANTSCAPES SYNTHETIC CANDIDATE REVIEW — NOT A PLANTING SPECIFICATION'],
    ['Name catalogue version',DATASET_VERSION],['Synthetic trait version',demo.version],['Rule version',RULE_VERSION],['Exported on',new Date().toISOString()],
    ['Location (user-entered)',s.location],['Site reference',s.reference],['Area m2',p.area],
    ['Project type',p.type],['Audience',p.audience],['Maintenance capacity',p.maintenance],['Priorities',p.priorities.join('; ')],
    ['Spatial character',p.character],['Composition mode',compositionModeRecord().label],['Composition rule version',RULE_VERSION],['Public access',p.publicAccess],['Public harvesting',p.publicHarvest],['Preserve open views',p.sightlines],['Rewilding native-only policy',p.rewilding],['Seasonal anchor colours',p.anchorColours.join('; ')],
    ['Project notes',p.notes],['Site description',s.description],
    ['Recommendation status','Simulated recommendations for workflow testing only; no verified site suitability'],
    ['Plot boundary','Prototype outline with '+state.plotBoundary.length+' corners; not cadastral'],
    ['Unresolved checks','Local occurrence; native status; site traits; hazards; provenance; density; source licences'],
    [],['ZONE CONTEXT'],['Zone','Soil','Moisture','Hydrology','Light','Canopy','Disturbance','Hardscape','Water edge','Confirmation source','Evidence note']
  ];
  state.zones.forEach(z=>{const c=z.conditions||defaultConditions();rows.push([z.name,c.soil,c.moisture,c.hydrology,c.light,c.canopy,c.disturbance,c.hardscape,c.waterEdge,c.source,c.note]);});
  rows.push([],['WORKING SELECTION — SIMULATED, NOT SITE RECOMMENDATIONS'],['Category','Dutch name','Latin name','Zone','Approx. height m','Simulated flowering','Demo soil','Demo moisture','Demo light','Composition role','Caution','Evidence status','Inclusion trace','Unresolved checks','Native status fixture','Spread fixture m','Spacing fixture m']);
  state.selected.forEach(item=>rows.push([item.group,item.name,item.latin,item.zone||'',item.height||'',item.from&&item.to?item.from+'–'+item.to:'',item.soil||'',item.moisture||'',item.light||'',compositionRoleFor(item)==='unassessed'?'Not assessed':compositionRoleLabel(compositionRoleFor(item)),item.caution||'',item.demo?'Synthetic test traits':'Name catalogue only',item.demo?'Synthetic site-fit score '+item.score+'; composition role assigned from mock layer/height under '+compositionModeRecord().label:'Manually selected by designer; no traits assessed','Verify local presence, site fit, hazards, spacing, provenance and maintenance',item.nativeStatus||'unknown',item.spread||'',item.spacing||'']));
  rows.push([],['APPLIED RULES AND EVIDENCE'],['Rule ID','Rule','Status','Evidence URLs']);
  window.PLANTSCAPES_RULEBOOK.rules.forEach(rule=>rows.push([rule.id,rule.name,rule.status,rule.sources.map(id=>window.PLANTSCAPES_RULEBOOK.source_registry[id]).join('; ')]));
  if(state.generated&&!state.planDirty){rows.push([],['DRAFT PLAN DECISIONS — SYNTHETIC'],['Plant','Zone','Quantity','Spacing m','Rules','Reason']);planPlantKey().forEach(entry=>{const placed=state.placements.filter(x=>x.plantId===entry.plant.id),first=placed[0];rows.push([entry.plant.latin,first?.zone||'',placed.length,first?.spacing||'',first?.ruleTrace?.join('; ')||'',first?.reason||'']);});}
  rows.push([],['EXCLUDED DURING REVIEW'],['Dutch name','Latin name','Decision']);state.removed.forEach(item=>rows.push([item.name,item.latin,'Removed by designer']));
  rows.push([],['EXISTING PLANT INVENTORY — VERIFY ON SITE'],['Uploaded name','Advice']);
  state.inventory.forEach(name=>rows.push([name,'Verify identity, condition and local status on site; no removal advice from a name alone']));
  const content='\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='plantscapes-SYNTHETIC-candidate-review.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  field('downloadStatus').textContent='CSV download started. All simulated traits remain unverified.';
}
const pinCode={'Trees':'T','Shrubs':'S','Flowers & herbs':'F','Grasses, sedges & rushes':'G','Bulbs / geophytes':'B','Climbers':'C','Aquatic & marginal plants':'W','Needs classification':'?'};
const pinClass={'Trees':'tree','Shrubs':'shrub','Flowers & herbs':'flower','Grasses, sedges & rushes':'grass','Bulbs / geophytes':'bulb','Climbers':'climber','Aquatic & marginal plants':'water','Needs classification':'unknown'};
function pointInPolygon(point,polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if(((a[0]>point[0])!==(b[0]>point[0]))&&(point[1]<(b[1]-a[1])*(point[0]-a[0])/(b[0]-a[0])+a[1]))inside=!inside;
  }
  return inside;
}
function planBounds(){
  const points=state.plotBoundary;
  return {minA:Math.min(...points.map(p=>p[0])),maxA:Math.max(...points.map(p=>p[0])),minB:Math.min(...points.map(p=>p[1])),maxB:Math.max(...points.map(p=>p[1]))};
}
function localMetricPolygon(points,origin){
  if(!Array.isArray(points)||points.length<3||points.some(p=>Math.abs(p[0])>90||Math.abs(p[1])>180))return null;
  const originLat=Array.isArray(origin)?origin[0]:points.reduce((sum,p)=>sum+p[0],0)/points.length;
  const originLng=Array.isArray(origin)?origin[1]:points.reduce((sum,p)=>sum+p[1],0)/points.length;
  const lat0=originLat*Math.PI/180,rad=Math.PI/180,R=6371008.8;
  return points.map(([lat,lng])=>[R*Math.cos(lat0)*(lng-originLng)*rad,R*(lat-originLat)*rad]);
}
function metricPolygonArea(points,origin){
  const metric=localMetricPolygon(points,origin);if(!metric)return null;
  let area=0;for(let i=0,j=metric.length-1;i<metric.length;j=i++)area+=metric[j][0]*metric[i][1]-metric[i][0]*metric[j][1];
  return Math.abs(area)/2;
}
function geographicPolygonAreaM2(points){return metricPolygonArea(points);}
function placementPool(group){return state.selected.filter(p=>p.group===group&&engine.eligibility(p,project()).eligible);}
function renderSpeciesOptions(){
  const choices=state.selected.filter(p=>engine.eligibility(p,project()).eligible);
  field('symbolSpecies').innerHTML=choices.length?choices.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+esc(p.group)+'</option>').join(''):'<option value="">No demo plants selected</option>';
  field('sketchZone').innerHTML=state.zones.map(z=>'<option value="'+z.id+'">'+esc(z.name)+' · '+esc(z.conditions?.moisture||'unconfirmed')+' / '+esc(z.conditions?.light||'unconfirmed')+'</option>').join('');
}
function seededRandom(seed){let value=seed>>>0;return ()=>{value=(1664525*value+1013904223)>>>0;return value/4294967296;};}
function pointFromNormalized(bounds,nx,ny){
  return [bounds.minA+(bounds.maxA-bounds.minA)*Math.max(0,Math.min(1,nx)),bounds.minB+(bounds.maxB-bounds.minB)*Math.max(0,Math.min(1,ny))];
}
function pointSegmentDistance(point,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;if(!length)return Math.hypot(point[0]-a[0],point[1]-a[1]);const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/length));return Math.hypot(point[0]-(a[0]+t*dx),point[1]-(a[1]+t*dy));}
function nearTree(point,trees,radius){return trees.some(tree=>Math.hypot(point[0]-tree.xy[0],point[1]-tree.xy[1])<radius);}
function metricToLatLng(point,origin){const rad=Math.PI/180,R=6371008.8;return [origin[0]+point[1]/R/rad,origin[1]+point[0]/(R*Math.cos(origin[0]*rad))/rad];}
function latLngToMetric(point,origin){const rad=Math.PI/180,R=6371008.8;return [(point[1]-origin[1])*rad*R*Math.cos(origin[0]*rad),(point[0]-origin[0])*rad*R];}
function hatchColour(index){const palette=['#315f49','#71803a','#b05e7e','#4b8290','#8b6b45','#71649a','#aa764b','#4d8059','#a14955','#557ba5','#85863a','#765a78','#39776c','#ae8154','#596d41','#bd6e60','#55736e','#8d7197','#6b8145','#80694c','#427c9b','#a05b66'];return palette[(index-1)%palette.length];}
function taxonKeyIndex(id){return plantKeyNumber(id);}
function generatePlan(){
  if(state.plotBoundary.length<3){field('generationStatus').textContent='Draw and save the plot boundary in step 2 first.';return;}
  if(state.plotBoundary.some(p=>Math.abs(p[0])>90||Math.abs(p[1])>180)){field('generationStatus').textContent='Use the geographic map for a scaled planting plan. The fallback board has no metre scale.';return;}
  const beds=state.sketches.filter(s=>s.type==='planting'&&s.points.length>=3);
  const paths=state.sketches.filter(s=>s.type==='path'&&s.points.length>=2);
  if(!paths.length){field('generationStatus').textContent='Draw your paths first: choose Path, click two or more points, then Finish shape. Paths use a 1.5 m width.';setTool('path');return;}
  if(!beds.length){field('generationStatus').textContent='Draw a planting area: choose its site conditions in the sidebar, then Planting area → click corners → Finish shape.';setTool('planting');return;}
  if(state.generated&&!confirm('Regenerate the concept? Current individual plant edits will be replaced.'))return;
  const origin=[state.plotBoundary.reduce((s,p)=>s+p[0],0)/state.plotBoundary.length,state.plotBoundary.reduce((s,p)=>s+p[1],0)/state.plotBoundary.length];
  const result=engine.generate({
    boundary:localMetricPolygon(state.plotBoundary,origin),
    beds:beds.map(b=>({polygon:localMetricPolygon(b.points,origin),zoneId:b.zoneId||state.zones[0].id})),
    paths:paths.map(s=>s.points.map(p=>latLngToMetric(p,origin))),
    waterBeds:state.sketches.filter(s=>s.type==='water'&&s.points.length>=3).map(s=>({polygon:localMetricPolygon(s.points,origin),zoneId:s.zoneId||state.zones[0].id})),
    exclusions:state.sketches.filter(s=>['open'].includes(s.type)&&s.points.length>=3).map(s=>localMetricPolygon(s.points,origin)),
    plants:state.selected,project:project(),zones:state.zones,mode:selectedCompositionMode(),
    mix:{matrix:Number(field('mixMatrix').value),flowers:Number(field('mixFlowers').value),structure:Number(field('mixStructure').value)},
    pathWidth:PATH_WIDTH
  });
  if(result.error){field('generationStatus').textContent=result.error;return;}
  if(!result.placements.length){field('generationStatus').textContent='The drawn beds have no compatible planting positions. Widen the beds or review the palette and conditions.';return;}
  state.placements=result.placements.map((p,i)=>({...makePlacement(i,state.selected.find(q=>q.id===p.plantId),p.xy,origin,result.bounds,selectedCompositionMode(),p.tree),...p}));
  state.selectedPlacement=null;state.generated=true;state.planDirty=false;state.planRevision++;state.planUndo=[];
  state.planAudit={...result,origin};
  setTool('pan');
  buildPlantingMasses(origin,result.bounds,result.valid);
  field('generatePlan').textContent='Regenerate concept';
  field('downloadPlanSvg').disabled=false;field('downloadViewSvg').disabled=false;
  const count=state.placements.length,used=new Set(state.placements.map(p=>p.plantId));
  field('generationStatus').textContent=count.toLocaleString()+' draft plants · '+used.size+' taxa · '+state.placements.filter(p=>p.tree).length+' trees · '+compositionModeRecord().label+'. Quantities follow individual spread and spacing fixtures.';
  renderPlantingCoverage();renderPlacements();renderSymbolEditor();renderVisualization();renderPlanRules();
}
function markPlanDirty(){
  if(!state.generated)return;
  state.planDirty=true;
  field('downloadPlanSvg').disabled=true;field('downloadViewSvg').disabled=true;
  field('generationStatus').textContent='Drawing or mix changed. Regenerate to update the concept.';
  renderVisualization();renderPlanRules();
}
function renderPlanRules(){
  const panel=field('planRuleReview');if(!panel)return;
  const audit=state.planAudit,p=project();
  const pathCount=state.sketches.filter(x=>x.type==='path').length,bedCount=state.sketches.filter(x=>x.type==='planting').length;
  const status=state.planDirty?'Spaces changed; regeneration needed':state.generated?'Concept ready for review':'Draw paths, then planting zones';
  const treeTotal=state.placements.filter(x=>x.tree).length,treeTaxa=state.selected.filter(x=>x.group==='Trees').length,aquaticTotal=state.placements.filter(x=>plantForPlacement(x)?.group==='Aquatic & marginal plants').length;
  const structuralNote=state.generated?'<p class="plan-structure-note"><strong>'+treeTotal+' trees · '+aquaticTotal+' marginal plants</strong><br>Trees must fit their full mock mature crown without crossing a path, water or open space. '+(p.character==='open'?'Open spatial character intentionally omits trees.':'The prototype tests at most one tree per selected tree taxon per planting bed ('+treeTaxa+' tree taxa selected); it does not calculate a target canopy cover.')+' Root volume and desired canopy cover still need design review. Marginals need mapped water linked to confirmed wet conditions; the assumed shoreline band is 1.2 m. No deep-water traits are curated yet.</p>':'';
  const issues=audit?.warnings||['Municipality: review route visibility, accessibility and maintenance.','Landscape architect: inspect plant fit, spacing and seasonal structure.'];
  const used=new Set(state.placements.map(x=>x.plantId));
  const seasonal=['Spring','Summer','Autumn','Winter'].map((name,i)=>{
    const range=[[3,4,5],[6,7,8],[9,10,11],[12,1,2]][i];
    const species=state.selected.filter(x=>used.has(x.id)&&range.some(m=>m>=x.from&&m<=x.to));
    const colours=[...new Set(species.map(x=>x.colour))];
    const structural=state.selected.filter(x=>used.has(x.id)&&(['Trees','Shrubs','Grasses, sedges & rushes'].includes(x.group)||x.height>=1.1)).length;
    return '<div><strong>'+name+'</strong><span>'+species.length+' flowering taxa</span>'+(i===3?'<span>'+structural+' possible structural taxa · verify persistence</span>':'')+'<div class="season-swatches">'+colours.map(c=>'<i title="'+esc(c)+'" style="background:'+(colourHex[c]||'#74856b')+'"></i>').join('')+'</div></div>';
  }).join('');
  panel.innerHTML='<div class="rule-review-head"><h3>Design review</h3><span>'+esc(status)+'</span></div><p>'+pathCount+' path'+(pathCount===1?'':'s')+' · '+bedCount+' planting zone'+(bedCount===1?'':'s')+' · '+esc(p.rewilding?'Native fixtures only':'Native fixtures first; labelled ornamentals allowed')+'</p>'+structuralNote+(state.generated?'<div class="season-review">'+seasonal+'</div>':'')+'<details><summary>Checks for the architect and municipality</summary><ul>'+issues.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul></details><details><summary>Why plants were not placed</summary>'+(audit?.decisions?.length?'<ul>'+audit.decisions.map(d=>'<li>'+esc(state.selected.find(x=>x.id===d.plantId)?.name||d.plantId)+': '+esc(d.reason)+' <small>'+esc(d.rules.join(', '))+'</small></li>').join('')+'</ul>':'<p>Generate a concept to see placement decisions.</p>')+'</details><details><summary>Rules and sources</summary><p>Path edge → transition → interior. Mature spread controls spacing. Trees need actual crown space. No species quota.</p><a href="data/planting-plan-rules.v0.1.json" download>Download the applied rulebook</a></details>';
  field('undoPlanEdit').disabled=!state.planUndo.length;
}
function plantingAreas(){
  const marked=state.sketches.filter(s=>s.type==='planting'&&s.points.length>=3).map(s=>s.points);
  return marked;
}
function metricPolygonAreaFromXY(poly){let area=0;for(let i=0,j=poly.length-1;i<poly.length;j=i++)area+=poly[j][0]*poly[i][1]-poly[i][0]*poly[j][1];return Math.abs(area)/2;}
function buildPlantingMasses(origin,bounds,valid){
  const cell=2.5,groups=new Map(),living=state.placements.filter(item=>!item.tree);state.massGrid={origin,bounds,cell};
  living.forEach((item,index)=>{
    const gx=Math.floor((item.xy[0]-bounds.minX)/cell),gy=Math.floor((item.xy[1]-bounds.minY)/cell),key=item.plantId+':'+gx+':'+gy;
    const mass=groups.get(key)||{plantId:item.plantId,gx,gy,count:0,first:item};mass.count++;groups.set(key,mass);
    // A small, regular sample remains as individual accent notation; every marker is still one plant.
    if(index%31===0||plantForPlacement(item)?.group==='Aquatic & marginal plants')item.accent=true;
  });
  const cells=new Map();groups.forEach(m=>{const key=m.gx+':'+m.gy;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(m);});
  cells.forEach(list=>{list.sort((a,b)=>a.plantId.localeCompare(b.plantId));const total=list.reduce((n,m)=>n+m.count,0);let offset=0;list.forEach(m=>{m.fraction=m.count/total;m.offset=offset;offset+=m.fraction;});});
  state.planMasses=Array.from(groups.values()).map((mass,index)=>{
    const cellX=bounds.minX+mass.gx*cell,x=cellX+mass.offset*cell,y=bounds.minY+mass.gy*cell,w=cell*mass.fraction,corners=[[x,y],[x+w,y],[x+w,y+cell],[x,y+cell]];
    const polygon=corners.map(point=>metricToLatLng(point,origin));
    const centre=[x+w/2,y+cell/2];
    const complete=valid(centre)&&corners.every(valid);
    return {...mass,id:'mass-'+index,polygon,area:complete?w*cell:0,complete,gx:mass.gx,gy:mass.gy};
  }).filter(mass=>mass.complete);
}
function refreshPlantingMassCounts(){
  if(!state.massGrid)return;
  const {bounds,cell}=state.massGrid,counts=new Map();
  state.placements.filter(item=>!item.tree).forEach(item=>{const xy=item.xy;if(!xy)return;const gx=Math.floor((xy[0]-bounds.minX)/cell),gy=Math.floor((xy[1]-bounds.minY)/cell),key=item.plantId+':'+gx+':'+gy;const record=counts.get(key)||{plantId:item.plantId,gx,gy,count:0,first:item};record.count++;counts.set(key,record);});
  state.planMasses=state.planMasses.map(mass=>{const record=counts.get(mass.plantId+':'+mass.gx+':'+mass.gy);return record?{...mass,...record}:null;}).filter(Boolean);
}
function chooseBedPlant(point,pool,mode,bounds){
  const grasses=pool.filter(p=>p.group==='Grasses, sedges & rushes'),matrix=grasses.length?grasses:pool.filter(p=>['Flowers & herbs','Bulbs / geophytes'].includes(p.group));
  const accents=pool.filter(p=>!matrix.includes(p));let chosen=pool[0];
  if(mode==='matrix_accent'&&matrix.length&&accents.length){const patch=Math.floor(point[0]/6)+Math.floor(point[1]/6)*31;chosen=((patch%5)+5)%5===0?accents[Math.abs(patch)%accents.length]:matrix[Math.abs(patch)%matrix.length];}
  else if(mode==='repeated_drifts'){const drift=Math.floor((point[0]+point[1]*.38)/2.4),heightOrdered=pool.slice().sort((a,b)=>(Number(a.height)||.5)-(Number(b.height)||.5));chosen=heightOrdered[Math.abs(drift)%heightOrdered.length];}
  else {const patch=Math.floor(point[0]/3)+Math.floor(point[1]/3)*31;chosen=pool[Math.abs(patch)%pool.length];}
  return chosen;
}
function makePlacement(index,plant,xy,origin,bounds,mode,isTree=false){const point=metricToLatLng(xy,origin);return {id:'symbol-'+(index+1),plantId:plant.id,compositionRole:compositionRoleFor(plant),compositionMode:mode,point,xy,nx:(xy[0]-bounds.minX)/Math.max(.001,bounds.maxX-bounds.minX),ny:(xy[1]-bounds.minY)/Math.max(.001,bounds.maxY-bounds.minY),tree:isTree};}
function renderPlantingCoverage(){
  if(state.map){
    state.coverageLayers.forEach(layer=>state.map.removeLayer(layer));state.coverageLayers=[];
    if(!state.generated)return;
    plantingAreas().forEach(points=>{
      const layer=L.polygon(points,{stroke:false,fillColor:'#a8c69b',fillOpacity:.38,interactive:false}).addTo(state.map);
      layer.bringToBack();state.coverageLayers.push(layer);
    });
    if(state.siteBoundaryLayer)state.siteBoundaryLayer.bringToFront();
    state.sketches.forEach(item=>item.layer?.bringToFront());
    return;
  }
  renderFallbackSketch();
}
function plantForPlacement(item){return state.selected.find(p=>p.id===item.plantId)||null;}
function planPlantKey(){
  const seen=new Set(),plants=[];
  state.placements.forEach(item=>{const plant=plantForPlacement(item);if(plant&&!seen.has(plant.id)){seen.add(plant.id);plants.push(plant);}});
  return plants.map((plant,index)=>({plant,index:index+1,colour:hatchColour(index+1)}));
}
function plantKeyNumber(plantId){return planPlantKey().find(entry=>entry.plant.id===plantId)?.index||0;}
function selectPlacement(id){state.selectedPlacement=id;renderSymbolEditor();renderPlacements();}
function applyMassHatch(layer,colour,index){
  const path=layer.getElement?.(),svg=path?.ownerSVGElement;if(!svg)return;
  let defs=svg.querySelector('defs[data-plantscapes-hatches]');
  if(!defs){defs=document.createElementNS('http://www.w3.org/2000/svg','defs');defs.setAttribute('data-plantscapes-hatches','true');svg.prepend(defs);}
  const id='plant-mass-hatch-'+index;
  const existing=svg.querySelector('#'+id);
  if(!existing||existing.getAttribute('data-colour')!==colour){existing?.remove();defs.insertAdjacentHTML('beforeend',PlantscapesGraphics.pattern(index,colour,id));svg.querySelector('#'+id).setAttribute('data-colour',colour);}
  path.setAttribute('fill','url(#'+id+')');path.setAttribute('fill-opacity','1');
}
function renderPlacements(){
  if(state.map){state.placementLayers.forEach(layer=>state.map.removeLayer(layer));state.placementLayers=[];
    const key=new Map(planPlantKey().map(entry=>[entry.plant.id,entry]));
    state.planMasses.forEach(mass=>{const p=state.selected.find(plant=>plant.id===mass.plantId);if(!p)return;const entry=key.get(p.id),colour=entry?.colour||'#536d59';const layer=L.polygon(mass.polygon,{color:colour,weight:.6,fillColor:colour,fillOpacity:.18,interactive:true}).addTo(state.map).bindTooltip(String(entry?.index||0).padStart(2,'0')+' · '+p.name+' · '+mass.count+' plants in this hatch mass');layer.on('click',event=>{L.DomEvent.stopPropagation(event);selectPlacement(mass.first.id);});applyMassHatch(layer,colour,entry?.index||0);state.placementLayers.push(layer);});
    state.placements.filter(item=>item.tree||item.accent).forEach(item=>{const p=plantForPlacement(item);if(!p)return;
      const entry=key.get(p.id),selected=item.id===state.selectedPlacement,colour=entry?.colour||'#536d59';
      const marker=L.circleMarker(item.point,{radius:item.tree?6.2:selected?4.8:p.group==='Shrubs'?3.8:2.8,color:item.tree||p.group==='Shrubs'?'#263b2d':'#fff',weight:item.tree?1.8:1,fillColor:colour,fillOpacity:.92}).addTo(state.map).bindTooltip(String(entry?.index||0).padStart(2,'0')+' · '+p.name+(item.tree?' · illustrative tree':' · illustrative planting position'));
      marker.on('click',event=>{L.DomEvent.stopPropagation(event);selectPlacement(item.id);});state.placementLayers.push(marker);
      if(item.tree){const radius=item.spread/2;if(radius>0){const buffer=L.circle(item.point,{radius,color:'#765c3a',weight:1,dashArray:'3 4',fillColor:'#d5b58b',fillOpacity:.13,interactive:false}).addTo(state.map);state.placementLayers.push(buffer);}}
    });
    const largest=new Map();state.planMasses.forEach(m=>{if(!largest.has(m.plantId)||largest.get(m.plantId).count<m.count)largest.set(m.plantId,m);});
    largest.forEach(m=>{const centre=m.polygon.reduce((p,q)=>[p[0]+q[0]/4,p[1]+q[1]/4],[0,0]);const label=L.tooltip({permanent:true,direction:'center',className:'taxon-code'}).setLatLng(centre).setContent(String(key.get(m.plantId)?.index||'')).addTo(state.map);state.placementLayers.push(label);});
    (state.planAudit?.visibility||[]).forEach(prompt=>{const marker=L.circleMarker(metricToLatLng(prompt.xy,state.planAudit.origin),{radius:7,color:'#a45d20',weight:2,dashArray:'3 3',fillColor:'#fff0c8',fillOpacity:.6}).addTo(state.map).bindTooltip(prompt.reason+' Review marker; not a calculated safe sightline.');state.placementLayers.push(marker);});
  }else renderFallbackSketch();
  renderPlacementList();
}
function renderPlacementList(){
  field('symbolCount').textContent=planPlantKey().length;
  if(state.generated){const nonTrees=state.placements.filter(p=>!p.tree),counts={matrix:0,flowers:0,structure:0};nonTrees.forEach(p=>{const plant=plantForPlacement(p);const role=plant?.group==='Grasses, sedges & rushes'?'matrix':plant?.group==='Shrubs'||plant?.height>=1.3?'structure':'flowers';counts[role]++;});field('mixReport').textContent='Actual non-tree counts: '+Object.entries(counts).map(([k,n])=>k+' '+Math.round(n/Math.max(1,nonTrees.length)*100)+'%').join(' · ')+'. Position, fit and spacing override weights.';}
  field('planNotation').innerHTML=PlantscapesGraphics.notation;
  const grouped=new Map();state.placements.forEach(item=>{const p=plantForPlacement(item);if(!p)return;const record=grouped.get(p.id)||{plant:p,count:0,first:item};record.count++;grouped.set(p.id,record);});
  const key=new Map(planPlantKey().map(entry=>[entry.plant.id,entry]));
  field('placementList').innerHTML=grouped.size?Array.from(grouped.values()).map(({plant,count,first})=>{const item=state.placements.find(x=>x.plantId===plant.id&&(x.tree||x.accent)),entry=key.get(plant.id),isSelected=item&&state.selectedPlacement===item.id,massCount=state.planMasses.filter(mass=>mass.plantId===plant.id).length,tag=item?'button':'div',selectAttr=item?' type="button" data-select-symbol="'+esc(item.id)+'"':'';return '<'+tag+selectAttr+' class="placement-item'+(isSelected?' active':'')+'"><span class="taxon-swatch">'+PlantscapesGraphics.swatch(entry)+'<b>'+entry.index+'</b></span><span>'+esc(plant.name)+'<small>'+count.toLocaleString()+' plants · '+massCount+' hatch masses · '+esc(plant.group||'unclassified')+(item?'':' · mass only')+'</small></span></'+tag+'>';}).join(''):'No positions yet.';
  $$('[data-select-symbol]').forEach(button=>button.addEventListener('click',()=>selectPlacement(button.dataset.selectSymbol)));
  const used=new Set(state.placements.map(item=>item.plantId)),unplaced=state.generated?state.selected.filter(p=>!used.has(p.id)):[];
  field('unplacedCount').textContent=unplaced.length;
  field('unplacedList').innerHTML=state.generated?(unplaced.length?unplaced.map(p=>'<div class="unplaced-item">'+esc(p.name)+' <small>'+esc(p.group)+'</small></div>').join(''):'Every selected demo taxon is represented.'):'Generate a plan to compare the palette.';
}
function checkPlanEdit(plant,point,ignoreId){
  if(state.planDirty)return 'Regenerate after changing paths or zones.';
  const eligible=engine.eligibility(plant,project());if(!eligible.eligible)return eligible.reason;
  const xy=latLngToMetric(point,state.planAudit.origin);
  if(!state.planAudit.valid(xy))return 'Keep the plant in its planting or water zone, outside paths and open ground.';
  const bed=state.planAudit.bedFor(xy),zone=state.zones.find(z=>String(z.id)===String(bed.zoneId));
  const fit=engine.zoneFit(plant,zone,project());if(!fit.fit)return fit.reason;
  if(!state.planAudit.aquaticFit(plant,xy))return 'Aquatic / marginal plants need the water or shoreline; terrestrial plants cannot go in water.';
  if(plant.group==='Aquatic & marginal plants'&&state.planAudit.waterFor(xy)&&state.planAudit.shoreDistance(xy)>1.2)return 'These marginal fixtures need the assumed 1.2 m shoreline, not deep open water.';
  const d=state.planAudit.pathDistance(xy);
  if(d<engine.config.edgeDepth&&(plant.height>engine.config.edgeHeight||plant.thorny))return 'This path edge requires lower planting without thorns.';
  if(plant.group==='Trees'){
    const r=plant.spread/2;
    if(!Array.from({length:12},(_,n)=>[xy[0]+r*Math.cos(n*Math.PI/6),xy[1]+r*Math.sin(n*Math.PI/6)]).every(q=>state.planAudit.valid(q)&&!state.planAudit.waterFor(q)))return 'The mature tree crown does not fit the available planting space.';
  }
  if(state.placements.some(q=>q.id!==ignoreId&&Math.hypot(q.xy[0]-xy[0],q.xy[1]-xy[1])<(q.tree?Math.max(.75,q.spread*.12):(q.spacing+plant.spacing)/2)))return 'This position is too close to another plant for the draft spacing. Choose a different position or smaller plant.';
  return '';
}
function savePlanUndo(){state.planUndo.push(state.placements.map(p=>({...p,point:p.point.slice(),xy:p.xy.slice()})));if(state.planUndo.length>20)state.planUndo.shift();}
function refreshAfterPlanEdit(message){
  if(state.planAudit)buildPlantingMasses(state.planAudit.origin,state.planAudit.bounds,state.planAudit.valid);
  renderPlacements();renderSymbolEditor();renderVisualization();renderPlanRules();
  field('generationStatus').textContent=message;
}
function undoPlanEdit(){
  if(!state.planUndo.length)return;
  state.placements=state.planUndo.pop();state.selectedPlacement=null;refreshAfterPlanEdit('Previous individual plant edit restored.');
}
function renderSymbolEditor(){
  const box=field('selectedSymbol'),item=state.placements.find(x=>x.id===state.selectedPlacement);
  if(!item){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;
  const plant=plantForPlacement(item),options=state.selected.filter(p=>p.id===item.plantId||!checkPlanEdit(engine.enrich(p),item.point,item.id)).map(p=>'<option value="'+esc(p.id)+'"'+(p.id===item.plantId?' selected':'')+'>'+esc(p.name)+'</option>').join('');
  box.innerHTML='<strong>'+esc(plant?.name||'Plant')+'</strong><p>'+esc(item.reason||'Individual designer edit; checks applied before placement.')+'</p><small>Rules: '+esc((item.ruleTrace||[]).join(', '))+' · '+esc(item.evidenceStatus||'synthetic_demo')+'</small><label class="field"><span>Change species</span><select id="editSymbolSpecies">'+options+'</select></label><div class="symbol-actions"><button id="moveSymbol" type="button" class="button button-secondary">Move on map</button><button id="removeSymbol" type="button" class="button button-secondary">Remove</button></div>';
  field('editSymbolSpecies').addEventListener('change',event=>{
    const next=engine.enrich(state.selected.find(p=>p.id===event.target.value)),error=checkPlanEdit(next,item.point,item.id);
    if(error){renderSymbolEditor();const feedback=document.createElement('p');feedback.className='edit-error';feedback.setAttribute('role','alert');feedback.textContent=error;box.append(feedback);return;}
    savePlanUndo();Object.assign(item,{plantId:next.id,spread:next.spread,spacing:next.spacing,height:next.height,tree:next.group==='Trees',reason:'Species changed by designer; zone, path edge and spacing rechecked.',ruleTrace:['G04','G05','S01','S02','D01','D03']});refreshAfterPlanEdit('Species changed; placement checks passed.');
  });
  field('moveSymbol').addEventListener('click',()=>setTool('moveSymbol'));
  field('removeSymbol').addEventListener('click',()=>{savePlanUndo();state.placements=state.placements.filter(x=>x.id!==item.id);state.selectedPlacement=null;refreshAfterPlanEdit('Plant removed. Undo is available.');});
}
function moveSelectedSymbol(point){
  const item=state.placements.find(x=>x.id===state.selectedPlacement);if(!item)return;
  const error=checkPlanEdit(engine.enrich(plantForPlacement(item)),point,item.id);if(error){field('generationStatus').textContent=error;return;}
  savePlanUndo();const b=planBounds();item.point=point;item.nx=(point[1]-b.minB)/Math.max(.000001,b.maxB-b.minB);item.ny=(point[0]-b.minA)/Math.max(.000001,b.maxA-b.minA);item.xy=latLngToMetric(point,state.planAudit.origin);item.reason='Moved by designer; zone, path edge and spacing rechecked.';refreshAfterPlanEdit('Plant moved. View updated and undo is available.');setTool('pan');
}
function addPlantSymbol(point){
  if(!state.generated){field('generationStatus').textContent='Generate a concept before adding an individual plant.';return;}
  const plant=engine.enrich(state.selected.find(p=>p.id===field('symbolSpecies').value));if(!plant)return;
  const error=checkPlanEdit(plant,point);if(error){field('generationStatus').textContent=error;return;}
  savePlanUndo();const xy=latLngToMetric(point,state.planAudit.origin),item=makePlacement(Date.now(),plant,xy,state.planAudit.origin,state.planAudit.bounds,selectedCompositionMode(),plant.group==='Trees');
  Object.assign(item,{xy,spacing:plant.spacing,spread:plant.spread,height:plant.height,accent:true,reason:'Added by designer; eligibility, zone, path edge and spacing checked.',ruleTrace:['G04','G05','S01','S02','D01','D03'],evidenceStatus:plant.demo?'synthetic_demo':'reviewed'});
  state.placements.push(item);state.selectedPlacement=item.id;refreshAfterPlanEdit('Plant added. View updated and undo is available.');
}
function renderVisualization(){
  const canvas=field('visualCanvas');
  if(!state.generated||state.planDirty){canvas.innerHTML='<div class="visual-empty">'+(state.planDirty?'Regenerate the concept after changing the spaces.':'Draw your paths and planting zones, then generate a concept to see the view.')+'</div>';return;}
  const season=field('viewSeason').value,age=Number(field('viewAge').value),direction=field('viewDirection').value,origin=state.planAudit.origin;
  const result=PlantscapesGraphics.elevated({
    boundary:localMetricPolygon(state.plotBoundary,origin),
    sketches:state.sketches.map(s=>({...s,points:s.points.map(p=>latLngToMetric(p,origin))})),
    placements:state.placements,plants:state.selected,
    masses:state.planMasses.map(m=>({...m,polygon:localMetricPolygon(m.polygon,origin)})),
    keys:planPlantKey(),season,age,direction,angle:field('viewAngle').value,pathWidth:PATH_WIDTH,colours:colourHex
  });
  canvas.innerHTML=result.svg;
  canvas.setAttribute('aria-label','Elevated mock view showing actual paths, open ground, water and relative planting heights.');
  field('visualCaption').textContent='Woody plants and '+result.sample+' symbols from '+state.placements.length+' positions. Grass tufts, flowering and seedheads use group-level seasonal fixtures, not botanical predictions.';
}
function downloadSvg(markup,name){
  const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function downloadPlanSvg(){
  if(!state.generated||state.planDirty)return;
  const origin=state.planAudit.origin,poly=localMetricPolygon(state.plotBoundary,origin);
  const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),minX=Math.min(...xs),maxY=Math.max(...ys);
  const scale=Math.min(800/Math.max(1,Math.max(...xs)-minX),440/Math.max(1,maxY-Math.min(...ys)));
  const px=p=>50+(latLngToMetric(p,origin)[0]-minX)*scale,py=p=>105+(maxY-latLngToMetric(p,origin)[1])*scale;
  const points=poly=>poly.map(p=>px(p).toFixed(1)+','+py(p).toFixed(1)).join(' ');
  const key=planPlantKey(),byId=new Map(key.map(k=>[k.plant.id,k])),rows=Math.ceil(key.length/2),height=780+rows*44;
  const patterns=key.map(k=>PlantscapesGraphics.pattern(k.index,k.colour,'mass-'+k.index)).join('');
  const beds=plantingAreas().map(p=>'<polygon points="'+points(p)+'" fill="#e5eedc" stroke="#8aab78"/>').join('');
  const masses=state.planMasses.map(m=>'<polygon points="'+points(m.polygon)+'" fill="url(#mass-'+byId.get(m.plantId)?.index+')" stroke="'+byId.get(m.plantId)?.colour+'" stroke-width=".4"/>').join('');
  const sketch=state.sketches.filter(s=>s.type!=='planting'&&s.type!=='camera').map(s=>'<'+(s.type==='path'?'polyline':'polygon')+' points="'+points(s.points)+'" fill="'+(s.type==='path'?'none':sketchStyles[s.type].fillColor)+'" stroke="'+sketchStyles[s.type].color+'" stroke-width="'+(s.type==='path'?Math.max(2,PATH_WIDTH*scale):2)+'" stroke-linejoin="round"/>').join('');
  const symbols=state.placements.filter(p=>p.tree||p.accent).map(p=>{
    const k=byId.get(p.plantId),x=px(p.point),y=py(p.point),shrub=k?.plant.group==='Shrubs';
    return (p.tree?'<circle cx="'+x+'" cy="'+y+'" r="'+(p.spread/2*scale)+'" fill="none" stroke="#765c3a" stroke-dasharray="3 4" stroke-width=".8"/>':'')+'<circle cx="'+x+'" cy="'+y+'" r="'+(p.tree?5:shrub?3.5:2)+'" fill="'+k?.colour+'" stroke="'+(p.tree||shrub?'#263b2d':'#fff')+'" stroke-width="'+(p.tree?1.8:1)+'"/>'+(p.tree?'<text x="'+(x+7)+'" y="'+(y-5)+'" font-size="10" font-weight="700">'+k.index+'</text>':'');
  }).join('');
  const largest=new Map();state.planMasses.forEach(m=>{if(!largest.has(m.plantId)||largest.get(m.plantId).count<m.count)largest.set(m.plantId,m);});
  const labels=[...largest.values()].map(m=>{const x=m.polygon.reduce((s,p)=>s+px(p),0)/4,y=m.polygon.reduce((s,p)=>s+py(p),0)/4;return '<g><rect x="'+(x-9)+'" y="'+(y-8)+'" width="18" height="16" rx="3" fill="#fff" stroke="'+byId.get(m.plantId).colour+'"/><text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-size="11">'+byId.get(m.plantId).index+'</text></g>';}).join('');
  const review=(state.planAudit.visibility||[]).map(p=>{const xy=metricToLatLng(p.xy,origin);return '<circle cx="'+px(xy)+'" cy="'+py(xy)+'" r="7" fill="none" stroke="#a45d20" stroke-dasharray="3 3"/>';}).join('');
  const camera=state.sketches.filter(s=>s.type==='camera').map(s=>'<rect x="'+(px(s.points[0])-5)+'" y="'+(py(s.points[0])-4)+'" width="10" height="8" fill="#183d32"/>').join('');
  const legend=key.map((k,i)=>{const x=50+(i%2)*410,y=744+Math.floor(i/2)*44,count=state.placements.filter(p=>p.plantId===k.plant.id).length;return '<g><rect x="'+x+'" y="'+(y-15)+'" width="28" height="28" fill="url(#mass-'+k.index+')" stroke="'+k.colour+'"/><text x="'+(x+38)+'" y="'+y+'" font-size="12" font-weight="600">'+String(k.index).padStart(2,'0')+' · '+esc(k.plant.name)+' · '+count.toLocaleString()+'</text><text x="'+(x+38)+'" y="'+(y+16)+'" font-size="11" fill="#536657">'+esc(k.plant.latin)+' · '+esc(k.plant.group)+'</text></g>';}).join('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 '+height+'" width="900" height="'+height+'"><defs>'+patterns+'</defs><rect width="900" height="'+height+'" fill="#fbfcf7"/><g font-family="Segoe UI, Arial, sans-serif" fill="#183d32"><text x="50" y="43" font-size="25" font-weight="700">Plantscapes · concept planting plan</text><text x="50" y="67" font-size="12">MOCK DATA · diagram with consistent plan proportions · not construction documentation</text>'+beds+masses+sketch+symbols+labels+review+camera+'<polygon points="'+points(state.plotBoundary)+'" fill="none" stroke="#234638" stroke-dasharray="8 5" stroke-width="2"/><text x="825" y="100" font-size="14">↑ N</text><text x="50" y="590" font-size="17" font-weight="600">Symbols & spaces</text><circle cx="57" cy="614" r="5" fill="#71803a" stroke="#263b2d" stroke-width="2"/><text x="72" y="618" font-size="12">Tree centre</text><circle cx="230" cy="614" r="3.5" fill="#71803a" stroke="#263b2d"/><text x="244" y="618" font-size="12">Shrub centre</text><circle cx="415" cy="614" r="2.5" fill="#71803a" stroke="#fff"/><text x="428" y="618" font-size="12">Sample perennial</text><circle cx="645" cy="614" r="8" fill="none" stroke="#765c3a" stroke-dasharray="3 3"/><text x="660" y="618" font-size="12">Mature crown envelope</text><path d="M50 642h18" stroke="#9e724b" stroke-width="5"/><text x="76" y="646" font-size="12">Path</text><rect x="225" y="635" width="18" height="12" fill="#efe3ac"/><text x="250" y="646" font-size="12">Open ground</text><rect x="405" y="635" width="18" height="12" fill="#afd7dd"/><text x="430" y="646" font-size="12">Water</text><circle cx="645" cy="642" r="7" fill="none" stroke="#a45d20" stroke-dasharray="3 3"/><text x="660" y="646" font-size="12">Visibility review prompt</text><rect x="50" y="663" width="10" height="8" fill="#183d32"/><text x="76" y="674" font-size="12">Camera marker, if drawn</text><text x="50" y="700" font-size="12">Number + pattern identify taxa. Perennial dots are samples; quantities include every draft position.</text><text x="50" y="723" font-size="17" font-weight="600">Species key · quantities are individual plants</text>'+legend+'<text x="50" y="'+(height-22)+'" font-size="11">Verify species, spacing, soil, water depth, safety, access and root volume before use.</text></g></svg>';
  downloadSvg(svg,'plantscapes-MOCK-planting-plan.svg');
}
function downloadViewSvg(){
  const svg=field('visualCanvas').querySelector('svg');if(!svg)return;
  downloadSvg(svg.outerHTML,'plantscapes-MOCK-schematic-view.svg');
}
function demoBasemap(map){
  if(!window.L)return;
  L.tileLayer('https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png',{
    minZoom:6,maxZoom:22,maxNativeZoom:19,bounds:[[50.5,3.25],[54,7.6]],
    attribution:'Kaartgegevens © Kadaster / PDOK'
  }).addTo(map);
}
function initSiteMap(){
  if(state.siteMapReady){if(state.siteMap)state.siteMap.invalidateSize();return;}
  state.siteMapReady=true;
  if(!window.L){field('siteMap').classList.add('hidden');field('siteBoard').classList.remove('hidden');return;}
  const place=demo.places[field('mapPreset').value]||demo.places.pijnacker;
  state.siteMap=L.map('siteMap',{doubleClickZoom:false,zoomAnimation:false,fadeAnimation:false}).setView(place.center,15);demoBasemap(state.siteMap);
  L.control.scale({position:'bottomright',metric:true,imperial:false,maxWidth:120}).addTo(state.siteMap);
  state.siteMap.dragging[state.plotMode==='draw'?'disable':'enable']();
  field('plotPan').classList.toggle('active',state.plotMode==='pan');field('plotDraw').classList.toggle('active',state.plotMode==='draw');
  state.siteMap.on('click',event=>{if(state.plotMode!=='draw')return;state.plotDraft.push([event.latlng.lat,event.latlng.lng]);drawPlot();});
  if(state.plotBoundary.length)drawPlot();
  setTimeout(()=>state.siteMap.invalidateSize(),100);
}
function drawPlot(){
  const map=state.siteMap;
  if(map){
    if(state.plotDraftLayer)map.removeLayer(state.plotDraftLayer);
    if(state.plotLayer)map.removeLayer(state.plotLayer);
    state.plotDraftLayer=state.plotDraft.length?L.layerGroup([
      L.polyline(state.plotDraft,{color:'#db7b46',weight:3,dashArray:'7 5'}),
      ...state.plotDraft.map((p,i)=>L.circleMarker(p,{radius:7,color:'#fff',weight:2,fillColor:'#d87543',fillOpacity:1}).bindTooltip('Corner '+(i+1)))
    ]).addTo(map):null;
    state.plotLayer=state.plotBoundary.length?L.polygon(state.plotBoundary,{color:'#26443a',fillColor:'#b8d79f',fillOpacity:.27,weight:3}).addTo(map):null;
  }else{
    const board=field('siteBoard');board.querySelectorAll('svg').forEach(x=>x.remove());
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1000 1000');
    const points=state.plotDraft.length?state.plotDraft:state.plotBoundary;
    if(points.length){const shape=document.createElementNS('http://www.w3.org/2000/svg',state.plotDraft.length?'polyline':'polygon');shape.setAttribute('points',points.map(p=>p.join(',')).join(' '));shape.setAttribute('stroke','#26443a');shape.setAttribute('stroke-width','5');shape.setAttribute('fill',state.plotDraft.length?'none':'#b8d79f');shape.setAttribute('fill-opacity','.5');svg.append(shape);points.forEach(p=>{const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('cx',p[0]);dot.setAttribute('cy',p[1]);dot.setAttribute('r','10');dot.setAttribute('fill','#d87543');svg.append(dot);});}board.append(svg);
  }
  const count=state.plotDraft.length;
  field('plotStatus').textContent=state.plotMode==='draw'?(count?count+' corner'+(count===1?'':'s')+' placed · '+(count>=3?'finish the boundary':'add '+(3-count)+' more'):'Draw mode: click at least three corners; map panning is paused.'):state.plotBoundary.length?'Move mode: drag to navigate · boundary saved with '+state.plotBoundary.length+' corners':'Move mode: drag to navigate · choose Draw boundary when ready.';
  const area=metricPolygonArea(count>=3?state.plotDraft:state.plotBoundary);
  field('plotAreaReadout').textContent=area?((count>=3?'Draft area':'Measured site area')+': '+Math.round(area).toLocaleString()+' m² · calculated from the drawn boundary'):count>=3?'Finish the boundary to calculate area.':'Draw the boundary on the geographic map to calculate area.';
  field('plotFinish').disabled=count<3;field('plotUndo').disabled=!count;field('plotClear').disabled=!count&&!state.plotBoundary.length;
}
function finishPlot(){if(state.plotDraft.length<3)return;state.plotBoundary=state.plotDraft.map(p=>p.slice());state.plotDraft=[];state.zones.forEach(z=>z.conditions=null);invalidateFrom(2);state.plotMode='pan';if(state.siteMap)state.siteMap.dragging.enable();field('plotPan').classList.add('active');field('plotDraw').classList.remove('active');drawPlot();}
function examplePlot(){
  const center=state.siteMap?state.siteMap.getCenter():{lat:500,lng:500};
  state.plotBoundary=state.siteMap?[[center.lat-.000045,center.lng-.00013],[center.lat-.000045,center.lng+.00013],[center.lat+.000045,center.lng+.00013],[center.lat+.000045,center.lng-.00013]]:[[430,430],[570,430],[570,570],[430,570]];
  state.plotDraft=[];state.zones.forEach(z=>z.conditions=null);invalidateFrom(2);state.plotMode='pan';if(state.siteMap)state.siteMap.dragging.enable();field('plotPan').classList.add('active');field('plotDraw').classList.remove('active');drawPlot();if(state.siteMap)state.siteMap.fitBounds(state.plotBoundary,{padding:[55,55],animate:false});
}
const sketchStyles={
  boundary:{color:'#26443a',fillColor:'#d4e7bf',fillOpacity:.06,weight:3,dashArray:'7 5'},
  path:{color:'#9e724b',weight:5},open:{color:'#d3b765',fillColor:'#e9d78e',fillOpacity:.45,weight:2},
  planting:{color:'#3b8155',fillColor:'#70ae74',fillOpacity:.45,weight:2},
  water:{color:'#4e929f',fillColor:'#83bdc6',fillOpacity:.55,weight:2}
};
const toolLabels={boundary:'Boundary',path:'Path',open:'Open ground',planting:'Planting zone',water:'Water',symbol:'Plant symbol',moveSymbol:'Move symbol',camera:'Camera view'};
function initMap(){
  if(state.mapReady){if(state.map){state.map.invalidateSize();if(state.siteBoundaryLayer)state.map.removeLayer(state.siteBoundaryLayer);if(state.plotBoundary.length){state.siteBoundaryLayer=L.polygon(state.plotBoundary,{color:'#203e35',weight:3,dashArray:'6 4',fillColor:'#c9dda8',fillOpacity:.1}).addTo(state.map);state.map.fitBounds(state.plotBoundary,{padding:[50,50],animate:false});}}else renderFallbackSketch();return;}
  state.mapReady=true;
  if(!window.L){
    field('map').classList.add('hidden');
    field('mapFallback').classList.remove('hidden');field('sketchBoard').classList.remove('hidden');setTool(state.tool);renderFallbackSketch();return;
  }
  const place=nearestDemoPlace()||demo.places.pijnacker;
  state.map=L.map('map',{doubleClickZoom:false,zoomAnimation:false,fadeAnimation:false,scrollWheelZoom:false}).setView(place.center,15);demoBasemap(state.map);
  L.control.scale({position:'bottomright',metric:true,imperial:false,maxWidth:120}).addTo(state.map);
  if(state.plotBoundary.length){state.siteBoundaryLayer=L.polygon(state.plotBoundary,{color:'#203e35',weight:3,dashArray:'6 4',fillColor:'#c9dda8',fillOpacity:.1}).addTo(state.map);state.map.fitBounds(state.plotBoundary,{padding:[50,50],animate:false});}
  state.map.on('click',event=>{if(state.tool==='pan')return;if(state.tool==='camera'){addCamera([event.latlng.lat,event.latlng.lng]);return;}if(state.tool==='symbol'){addPlantSymbol([event.latlng.lat,event.latlng.lng]);return;}if(state.tool==='moveSymbol'){moveSelectedSymbol([event.latlng.lat,event.latlng.lng]);return;}state.draft.push([event.latlng.lat,event.latlng.lng]);drawDraft();});
  setTool('pan');if(state.generated)renderPlantingCoverage();setTimeout(()=>state.map.invalidateSize(),100);
}
function setTool(tool){
  state.tool=tool; $$('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
  const drawing=tool!=='pan';
  if(state.map){drawing?state.map.dragging.disable():state.map.dragging.enable();field('map').classList.toggle('draw-mode',drawing);}
  field('sketchBoard').classList.toggle('draw-mode',drawing);
  field('mapInstruction').textContent=tool==='pan'?'Pan and zoom to your site. Switch tools to draw.':tool==='camera'?'Click to place the camera; the schematic view will update.':tool==='symbol'?'Choose a plant in the sidebar, then click inside the plot to add its symbol.':tool==='moveSymbol'?'Click inside the plot to move the selected symbol.':'Click points for '+toolLabels[tool].toLowerCase()+', then choose Finish shape.';
  updateSketchButtons();
}
function drawDraft(){
  if(state.map){
    if(state.draftLayer)state.map.removeLayer(state.draftLayer);
    if(state.draft.length)state.draftLayer=L.layerGroup([L.polyline(state.draft,{color:sketchStyles[state.tool].color,weight:3,dashArray:'4 4'}),...state.draft.map((p,i)=>L.circleMarker(p,{radius:7,color:'#fff',weight:2,fillColor:sketchStyles[state.tool].color,fillOpacity:1}).bindTooltip('Point '+(i+1)))]).addTo(state.map);
  }else renderFallbackSketch();
  updateSketchButtons();
}
function finishShape(){
  const minimum=state.tool==='path'?2:3;
  if(state.draft.length<minimum)return;
  const item={type:state.tool,points:state.draft.map(pair=>pair.slice()),layer:null,zoneId:['planting','water'].includes(state.tool)?(Number(field('sketchZone').value)||state.zones[0].id):null};
  if(state.map){
    item.layer=state.tool==='path'?L.polyline(item.points,sketchStyles[item.type]).addTo(state.map):L.polygon(item.points,sketchStyles[item.type]).addTo(state.map);
    if(state.draftLayer)state.map.removeLayer(state.draftLayer);state.draftLayer=null;
  }
  state.sketches.push(item);state.draft=[];renderSketchList();renderFallbackSketch();updateSketchButtons();
  if(state.generated)renderPlantingCoverage();
  if(state.generated)field('generationStatus').textContent='Sketch changed. Regenerate the demo plan to account for the new space.';
  markPlanDirty();renderPlanRules();
}
function exampleSpaces(){
  if(state.plotBoundary.length<3){field('generationStatus').textContent='Save the boundary in step 2 before using example spaces.';return;}
  const b=planBounds(),mid=(b.minB+b.maxB)/2;
  if(!state.sketches.some(s=>s.type==='path')){setTool('path');state.draft=[[b.minA,mid],[b.maxA,mid]];drawDraft();finishShape();}
  if(!state.sketches.some(s=>s.type==='planting')){setTool('planting');state.draft=state.plotBoundary.map(p=>p.slice());drawDraft();finishShape();}
  setTool('pan');field('generationStatus').textContent='Example path and bed added. Edit the spaces or generate a concept.';
}
function addCamera(point){
  const previous=state.sketches.filter(x=>x.type==='camera');previous.forEach(x=>{if(state.map&&x.layer)state.map.removeLayer(x.layer);});
  state.sketches=state.sketches.filter(x=>x.type!=='camera');
  const item={type:'camera',points:[point],layer:null};
  if(state.map){
    const icon=L.divIcon({className:'camera-icon',html:'<span aria-label="Camera view">▣</span>',iconSize:[30,30],iconAnchor:[15,15]});
    item.layer=L.marker(point,{icon}).addTo(state.map);
  }
  state.sketches.push(item);renderSketchList();renderFallbackSketch();updateSketchButtons();
  if(state.plotBoundary.length){const b=planBounds(),midA=(b.minA+b.maxA)/2,midB=(b.minB+b.maxB)/2;field('viewDirection').value=Math.abs(point[0]-midA)>Math.abs(point[1]-midB)?point[0]<midA?'south':'north':point[1]<midB?'west':'east';renderVisualization();}
}
function undoSketch(){
  if(state.draft.length){state.draft.pop();drawDraft();return;}
  const item=state.sketches.pop();if(!item)return;
  if(state.map&&item.layer)state.map.removeLayer(item.layer);
  renderSketchList();renderFallbackSketch();updateSketchButtons();
  if(state.generated)renderPlantingCoverage();
  if(state.generated)field('generationStatus').textContent='Sketch changed. Regenerate the demo plan to reflect it.';
  markPlanDirty();renderPlanRules();
}
function clearSketch(){
  if(!state.sketches.length&&!state.draft.length)return;
  if(!confirm('Clear all sketch layers? This cannot be undone.'))return;
  if(state.map){state.sketches.forEach(item=>item.layer&&state.map.removeLayer(item.layer));if(state.draftLayer)state.map.removeLayer(state.draftLayer);}
  state.sketches=[];state.draft=[];state.draftLayer=null;renderSketchList();renderFallbackSketch();updateSketchButtons();if(state.generated)renderPlantingCoverage();
  if(state.generated)field('generationStatus').textContent='Sketch cleared. Regenerate the demo plan to reflect it.';
  markPlanDirty();renderPlanRules();
}
function updateSketchButtons(){
  field('finishShape').disabled=state.draft.length<(state.tool==='path'?2:3);
  field('undoSketch').disabled=!state.draft.length&&!state.sketches.length;
  field('clearSketch').disabled=!state.draft.length&&!state.sketches.length;
  if(state.stage===7&&state.tool!=='pan'&&state.tool!=='camera'&&state.tool!=='symbol'&&state.tool!=='moveSymbol')field('mapInstruction').textContent=state.draft.length?state.draft.length+' point'+(state.draft.length===1?'':'s')+' placed · '+(field('finishShape').disabled?'add more points':'Finish shape to save '+toolLabels[state.tool].toLowerCase()):'Click points for '+toolLabels[state.tool].toLowerCase()+'; each corner appears immediately.';
}
function renderSketchList(){
  field('sketchList').innerHTML=state.sketches.length?state.sketches.map((item,i)=>'<div><span>'+esc(toolLabels[item.type])+(item.zoneId?' · '+esc(state.zones.find(z=>z.id===item.zoneId)?.name||'Unlinked conditions'):'')+'</span><span>#'+(i+1)+'</span></div>').join(''):'No layers drawn yet.';
}
function renderFallbackSketch(){
  if(state.map)return;
  const board=field('sketchBoard');
  board.querySelectorAll('svg,.fallback-camera,.fallback-plant-symbol').forEach(el=>el.remove());
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('preserveAspectRatio','none');
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');defs.innerHTML='<pattern id="planting-ground-hatch" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#dcead3"/><path d="M-3 12L12-3M3 15L15 3" stroke="#86a97c" stroke-width="1" opacity=".65"/></pattern>';svg.append(defs);
  const draw=(item,draft=false)=>{
    if(item.type==='camera'){
      const marker=document.createElement('div');marker.className='fallback-camera';marker.style.left=(item.points[0][0]/10)+'%';marker.style.top=(item.points[0][1]/10)+'%';marker.textContent='▣';board.append(marker);return;
    }
    const shape=document.createElementNS('http://www.w3.org/2000/svg',item.type==='path'||draft?'polyline':'polygon');
    shape.setAttribute('points',item.points.map(p=>p.join(',')).join(' '));
    const style=sketchStyles[item.type];shape.setAttribute('stroke',style.color);shape.setAttribute('stroke-width',item.type==='path'?9:4);shape.setAttribute('fill',draft||item.type==='path'?'none':style.fillColor);shape.setAttribute('fill-opacity',draft?'0':String(style.fillOpacity||0));if(draft)shape.setAttribute('stroke-dasharray','8 7');svg.append(shape);
  };
  if(state.generated)plantingAreas().forEach(points=>{const area=document.createElementNS('http://www.w3.org/2000/svg','polygon');area.setAttribute('points',points.map(p=>p.join(',')).join(' '));area.setAttribute('fill','url(#planting-ground-hatch)');area.setAttribute('stroke','#73956e');area.setAttribute('stroke-width','2');svg.append(area);});
  if(state.generated&&state.planMasses.length){const bounds=planBounds(),key=new Map(planPlantKey().map(entry=>[entry.plant.id,entry]));key.forEach(entry=>{const pattern=document.createElementNS('http://www.w3.org/2000/svg','pattern');pattern.setAttribute('id','fallback-mass-'+entry.index);pattern.setAttribute('width','8');pattern.setAttribute('height','8');pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.innerHTML='<rect width="8" height="8" fill="'+entry.colour+'" fill-opacity=".16"/><path d="M-2 8L8-2M2 10L10 2" stroke="'+entry.colour+'" stroke-width="1.4"/>';defs.append(pattern);});state.planMasses.forEach(mass=>{const entry=key.get(mass.plantId);if(!entry)return;const area=document.createElementNS('http://www.w3.org/2000/svg','polygon'),coords=mass.polygon.map(point=>[((point[1]-bounds.minB)/Math.max(.000001,bounds.maxB-bounds.minB)*1000).toFixed(1)+','+((1-(point[0]-bounds.minA)/Math.max(.000001,bounds.maxA-bounds.minA))*1000).toFixed(1)].join(' ')).join(' ');area.setAttribute('points',coords);area.setAttribute('fill','url(#fallback-mass-'+entry.index+')');area.setAttribute('stroke',entry.colour);area.setAttribute('stroke-width','.6');svg.append(area);});}
  if(state.plotBoundary.length)draw({type:'boundary',points:state.plotBoundary});
  state.sketches.forEach(item=>draw(item));
  if(state.draft.length)draw({type:state.tool,points:state.draft},true);
  board.append(svg);
  state.placements.filter(item=>item.tree||item.accent).forEach(item=>{const p=plantForPlacement(item);if(!p)return;const marker=document.createElement('button');marker.type='button';marker.className='fallback-plant-symbol '+(pinClass[p.group]||'unknown');marker.style.left=(item.point[0]/10)+'%';marker.style.top=(item.point[1]/10)+'%';marker.setAttribute('aria-label','Select individual plant, '+p.name);marker.textContent=plantKeyNumber(p.id);marker.addEventListener('click',event=>{event.stopPropagation();selectPlacement(item.id);});board.append(marker);});
}
function uploadPlan(file){
  if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)){field('planImageName').textContent='Choose a PNG, JPG or WebP image.';return;}
  if(state.planObjectUrl)URL.revokeObjectURL(state.planObjectUrl);
  state.planObjectUrl=URL.createObjectURL(file);field('planImageName').textContent=file.name;
  if(state.map){
    if(state.planOverlay)state.map.removeLayer(state.planOverlay);
    state.planOverlay=L.imageOverlay(state.planObjectUrl,state.map.getBounds(),{opacity:.68,interactive:false}).addTo(state.map);
    state.planOverlay.bringToBack();
  }else{
    field('sketchBoard').querySelectorAll('.fallback-image').forEach(el=>el.remove());
    const img=document.createElement('img');img.src=state.planObjectUrl;img.alt='Uploaded site plan underlay';img.className='fallback-image';field('sketchBoard').prepend(img);
  }
}
function setup(){
  field('startProject').addEventListener('click',()=>advance(1));
  field('brand').addEventListener('click',event=>{event.preventDefault();showStage(0);});
  $$('[data-go]').forEach(button=>button.addEventListener('click',()=>showStage(Number(button.dataset.go))));
  $$('.stage').forEach(button=>button.addEventListener('click',()=>showStage(Number(button.dataset.stage))));
  field('toSite').addEventListener('click',()=>advance(2));
  field('toConfirm').addEventListener('click',()=>{if(!site().location){field('location').setCustomValidity('Enter a town or site name.');field('location').reportValidity();return;}field('location').setCustomValidity('');if(!checked('inNetherlands')){field('siteError').textContent='This workflow is limited to sites in the Netherlands. Confirm the location to continue.';field('siteError').classList.remove('hidden');return;}if(state.plotBoundary.length<3){field('siteError').textContent='Outline the plot on the map, or choose Use example plot, before continuing.';field('siteError').classList.remove('hidden');return;}field('siteError').classList.add('hidden');advance(3);});
  field('location').addEventListener('input',()=>field('location').setCustomValidity(''));
  field('toPalette').addEventListener('click',()=>{if(validateConditions()){if(!state.paletteBuilt)buildDemoPalette();advance(4);}});
  field('toReview').addEventListener('click',()=>advance(5));
  field('approvePalette').addEventListener('click',()=>{state.approved=true;advance(6);});
  field('downloadCsv').addEventListener('click',downloadCsv);
  field('toPlan').addEventListener('click',()=>advance(7));
  field('mapPreset').addEventListener('change',()=>{const p=demo.places[field('mapPreset').value];if(p){field('location').value=p.label+', Netherlands';if(state.siteMap)state.siteMap.setView(p.center,15);state.plotBoundary=[];state.plotDraft=[];state.zones.forEach(z=>z.conditions=null);invalidateFrom(2);drawPlot();}});
  field('plotPan').addEventListener('click',()=>{state.plotMode='pan';field('plotPan').classList.add('active');field('plotDraw').classList.remove('active');if(state.siteMap)state.siteMap.dragging.enable();drawPlot();});
  field('plotDraw').addEventListener('click',()=>{state.plotMode='draw';field('plotDraw').classList.add('active');field('plotPan').classList.remove('active');if(state.siteMap)state.siteMap.dragging.disable();drawPlot();});
  field('plotExample').addEventListener('click',examplePlot);
  field('plotUndo').addEventListener('click',()=>{state.plotDraft.pop();drawPlot();});
  field('plotFinish').addEventListener('click',finishPlot);
  field('plotClear').addEventListener('click',()=>{state.plotDraft=[];state.plotBoundary=[];state.zones.forEach(z=>z.conditions=null);invalidateFrom(2);drawPlot();});
  field('siteBoard').addEventListener('click',event=>{if(state.siteMap||state.plotMode!=='draw')return;const rect=field('siteBoard').getBoundingClientRect();state.plotDraft.push([Math.round((event.clientX-rect.left)/rect.width*1000),Math.round((event.clientY-rect.top)/rect.height*1000)]);drawPlot();});
  field('addZone').addEventListener('click',()=>{state.zones.push({id:state.nextZoneId++,name:'New zone',conditions:null});invalidateFrom(2);renderZoneList();});
  $$('#priorityOptions input').forEach(input=>input.addEventListener('change',()=>{
    const chosen=$$('#priorityOptions input:checked');if(chosen.length>3)input.checked=false;
    field('priorityCount').textContent=$$('#priorityOptions input:checked').length+' of 3 chosen';
    invalidateFrom(1);
  }));
  $$('#stage1 input, #stage1 select').forEach(input=>{if(!input.closest('#priorityOptions'))input.addEventListener('change',()=>invalidateFrom(1));});
  $$('#stage2 input:not([type=file]), #stage2 textarea').forEach(input=>input.addEventListener('change',()=>invalidateFrom(2)));
  $$('[id^="feature"]').forEach(input=>input.addEventListener('change',()=>{state.zones.forEach(z=>z.conditions=null);invalidateFrom(2);}));
  field('priorityCount').textContent='3 of 3 chosen';
  field('inventoryFile').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    field('inventoryFileName').textContent=file.name;
    try{
      if(/\.csv$/i.test(file.name))state.inventory=inventoryNamesFromRows(parseCsv(await file.text()));
      else if(window.XLSX){const workbook=XLSX.read(await file.arrayBuffer(),{type:'array'});state.inventory=inventoryNamesFromRows(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{header:1}));}
      else throw new Error('Spreadsheet reader unavailable. Save the file as CSV.');
      renderInventory();
    }catch(error){state.inventory=[];field('inventoryFileName').textContent=error.message||'Could not read file';renderInventory();}
  });
  field('plantSearch').addEventListener('input',renderSearch);
  field('compositionMode').addEventListener('change',()=>{
    state.compositionMode=field('compositionMode').value;
    state.log.push('Composition mode set to '+compositionModeRecord().label);
    invalidateFrom(4);renderPalette();
  });
  field('restorationOrnamentals').addEventListener('change',()=>{buildDemoPalette();state.log.push('Designer changed the restoration ornamental policy; shortlist rebuilt.');invalidateFrom(4);renderPalette();});
  ['anchorColour1','anchorColour2'].forEach(id=>field(id).addEventListener('change',()=>{state.log.push('Seasonal anchor colours changed.');invalidateFrom(4);renderPalette();}));
  field('generatePlan').addEventListener('click',generatePlan);
  ['mixMatrix','mixFlowers','mixStructure'].forEach(id=>field(id).addEventListener('change',markPlanDirty));
  field('undoPlanEdit').addEventListener('click',undoPlanEdit);
  field('downloadPlanSvg').addEventListener('click',downloadPlanSvg);
  field('downloadViewSvg').addEventListener('click',downloadViewSvg);
  ['viewDirection','viewAngle','viewSeason','viewAge'].forEach(id=>field(id).addEventListener('change',renderVisualization));
  $$('.toolrow .tool').forEach(button=>button.addEventListener('click',()=>{state.draft=[];drawDraft();setTool(button.dataset.tool);}));
  field('finishShape').addEventListener('click',finishShape);
  field('undoSketch').addEventListener('click',undoSketch);
  field('clearSketch').addEventListener('click',clearSketch);
  field('planImage').addEventListener('change',event=>uploadPlan(event.target.files[0]));
  field('sketchBoard').addEventListener('click',event=>{
    if(state.map||state.tool==='pan')return;
    const rect=field('sketchBoard').getBoundingClientRect();
    const point=[Math.round((event.clientX-rect.left)/rect.width*1000),Math.round((event.clientY-rect.top)/rect.height*1000)];
    if(state.tool==='camera')addCamera(point);else if(state.tool==='symbol')addPlantSymbol(point);else if(state.tool==='moveSymbol')moveSelectedSymbol(point);else{state.draft.push(point);drawDraft();}
  });
  window.addEventListener('popstate',()=>showStage(stageFromUrl(),false));
  window.addEventListener('hashchange',()=>showStage(stageFromUrl(),false));
  loadCatalogue();loadDesignRules();renderZoneList();showStage(stageFromUrl(),false);
}
setup();
