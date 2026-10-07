/* Plantscapes workflow v2. Synthetic ecology is for interaction testing only. */
const DATASET_VERSION = 'nl-vascular-v0.2';
const RULE_VERSION = 'oudolf-pattern-rules-v0.1 + synthetic-site-fit-v0.1';
const demo = window.PLANTSCAPES_DEMO || {places:{},plants:[],version:'missing'};
const oudolfPrecedents = window.PLANTSCAPES_OUDOLF_PRECEDENTS || [];
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const state = {
  stage: 0, unlocked: 1, nextZoneId: 2,
  zones: [{id: 1, name: 'Main site', conditions: null}],
  inventory: [], catalogue: [], catalogueSource: 'starter names',
  selected: [], removed: [], approved: false, log: [], paletteBuilt:false,
  designRules:null, compositionMode:'auto',
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
  publicAccess:checked('publicAccess'), publicHarvest:checked('foodHarvest'), sightlines:checked('clearSightlines')
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
  if(number===7){renderSpeciesOptions();setTimeout(initMap,40);}
  if(updateHistory) history.pushState({stage:number},'',number===0?'#home':'#stage-'+number);
  window.scrollTo({top:0,behavior:'instant'});
}
function advance(number){ state.unlocked=Math.max(state.unlocked,number); showStage(number); }
function invalidateFrom(stage){
  state.approved=false;state.unlocked=Math.min(state.unlocked,stage);if(stage<=3)state.paletteBuilt=false;
  if(stage<=4&&state.generated){state.generated=false;state.placements=[];state.planMasses=[];state.selectedPlacement=null;state.placementLayers.forEach(layer=>state.map&&state.map.removeLayer(layer));state.placementLayers=[];field('generatePlan').textContent='Generate demo plan';field('downloadPlanSvg').disabled=true;field('downloadViewSvg').disabled=true;field('generationStatus').textContent='The project or palette changed. Generate a new demo arrangement.';renderSymbolEditor();renderPlacementList();renderVisualization();}
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
  const character=project().character;
  return character==='open'?'repeated_drifts':character==='enclosed'?'community_patches':'matrix_accent';
}
function compositionModeRecord(){return compositionModes().find(mode=>mode.mode_id===selectedCompositionMode())||fallbackModes[0];}
function compositionRoleFor(plant){
  if(!plant?.demo&&!plant?.precedent)return 'unassessed';
  if(plant.group==='Trees'||plant.group==='Shrubs')return 'woody_framework';
  if(plant.group==='Grasses, sedges & rushes')return 'matrix';
  if(plant.group==='Climbers')return 'structural_perennial';
  if(plant.group==='Aquatic & marginal plants')return 'community_patch';
  return Number(plant.height)>=1.1?'structural_perennial':'seasonal_accent';
}
function compositionRoleLabel(role){
  const found=state.designRules?.planting_roles?.find(item=>item.role_id===role);
  return found?.role_id==='matrix'?'Matrix layer':found?.role_id==='structural_perennial'?'Structural perennial':found?.role_id==='seasonal_accent'?'Seasonal accent':found?.role_id==='woody_framework'?'Woody framework':found?.role_id==='community_patch'?'Site-specific patch':'Not assessed';
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
  return demo.plants.map((row,i)=>{
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
      return {score,zone:state.zones[j]?.name||'Main site'};
    }).sort((a,b)=>b.score-a.score);
    const plant={id:'demo-'+i,latin,name,group,moisture,light,soil:demoSoils.join(' / '),height,from,to,colour,caution,score:perZone[0].score,zone:perZone[0].zone,reviewed:false,demo:true,url:''};
    plant.role=compositionRoleFor(plant);
    return plant;
  }).filter(x=>x.score>=4).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'nl')).filter((item,_,all)=>{
    const rank=all.filter(x=>x.group===item.group&&x.score>=item.score).indexOf(item);
    const cap=item.group==='Trees'?(p.area<500?2:p.area<5000?5:12):item.group==='Shrubs'?(p.area<500?5:12):item.group==='Climbers'?2:99;
    return rank<cap;
  });
}
function buildDemoPalette(){
  const precedents=['Adiantum pedatum','Aruncus \'Horatio\'','Astrantia \'Roma\'','Brunnera macrophylla','Deschampsia cespitosa \'Goldtau\'','Hakonechloa macra','Heuchera villosa','Achillea \'Moonshine\'','Amsonia hubrichtii','Echinacea purpurea \'Fatal Attraction\'','Festuca mairei','Molinia caerulea subsp. arundinacea \'Transparent\'','Persicaria amplexicaulis \'Orange Field\'','Salvia nemorosa \'Purple Rain\'','Sporobolus heterolepis','Stachys officinalis \'Hummelo\'','Leucojum aestivum','Crocus speciosus','Anemone nemorosa'];
  const precedentCandidates=oudolfPrecedents.filter(record=>precedents.includes(record.normalized_name)).map(record=>({id:precedentId(record.normalized_name),latin:record.normalized_name,name:record.normalized_name,group:precedentGroup(record.normalized_name),url:'',reviewed:false,precedent:true,caseId:record.case_id,confidence:record.confidence,sourceReading:record.source_reading}));
  state.selected=[...demoCandidates(),...precedentCandidates];state.removed=[];state.log=['Built synthetic candidates and added '+precedentCandidates.length+' resolved Oudolf case-study precedents; precedent identity does not imply site suitability.'];state.paletteBuilt=true;state.approved=false;
}
function cardHtml(p){
  if(p.demo){
    const months=['J','F','M','A','M','J','J','A','S','O','N','D'].map((month,i)=>'<span '+(i+1>=p.from&&i+1<=p.to?'class="bloom" style="--bloom:'+colourHex[p.colour]+'"':'')+'>'+month+'</span>').join('');
    return '<div class="plant-row"><div class="plant-row-inner"><div class="plant-row-name"><strong>'+esc(p.name)+'</strong><em>'+esc(p.latin)+'</em><small>Demo fit · '+esc(p.zone)+' · synthetic score '+p.score+' · <span class="role-tag">'+esc(compositionRoleLabel(compositionRoleFor(p)))+'</span></small></div><button type="button" class="plant-control" data-expand="'+esc(p.id)+'" aria-label="More about '+esc(p.name)+'" aria-expanded="false">⌄</button><button type="button" class="plant-control icon-button" data-remove-plant="'+esc(p.id)+'" aria-label="Remove '+esc(p.name)+'" title="Remove">×</button></div><div class="plant-detail hidden"><div class="trait-preview"><div class="botanical-demo" role="img" aria-label="Generic botanical illustration; not a photograph"><span style="--petal:'+colourHex[p.colour]+'">✿</span><small>Illustration only</small></div><div><strong>Flowering period · simulated</strong><div class="month-strip" aria-label="Simulated flowering from month '+p.from+' to '+p.to+'">'+months+'</div><p>Blossom colour: '+esc(p.colour)+' · verify phenology.</p></div></div><p><strong>Composition role:</strong> '+esc(compositionRoleLabel(compositionRoleFor(p)))+' · assigned from the mock layer and height, not reviewed plant traits.</p><p><strong>Suggested zone:</strong> '+esc(p.zone)+' · mock fit based on '+esc(p.soil)+' soil, '+esc(p.moisture)+' moisture and '+esc(p.light)+' light.</p><p><strong>Role & size:</strong> '+esc(p.group)+' · approximate mature height '+p.height+' m. Verify spread and spacing.</p><p><strong>Caution:</strong> '+esc(p.caution)+'. Edible parts and toxicity are unverified. Do not use this record to decide harvesting or public safety.</p><p><strong>Evidence:</strong> Synthetic Plantscapes test layer '+esc(demo.version)+'; style logic uses '+esc(RULE_VERSION)+'. <span class="data-unknown">No verified site suitability or locality</span></p></div></div>';
  }
  const source=p.precedent?'Oudolf case study '+esc(p.caseId)+' · name-resolution confidence '+Math.round((p.confidence||0)*100)+'% · ornamental precedent only':p.url?'<a href="'+esc(p.url)+'" target="_blank" rel="noreferrer">Open taxonomy record</a>':'No record link in starter subset';
  const months=['J','F','M','A','M','J','J','A','S','O','N','D'].map(month=>'<span>'+month+'</span>').join('');
  return '<div class="plant-row"><div class="plant-row-inner"><div class="plant-row-name"><strong>'+esc(p.name)+'</strong><em>'+esc(p.latin)+'</em><small>'+(p.precedent?'Oudolf case-study precedent · not a site recommendation':'Manual working selection · not a site recommendation')+'</small></div><button type="button" class="plant-control" data-expand="'+esc(p.id)+'" aria-label="More about '+esc(p.name)+'" aria-expanded="false">⌄</button><button type="button" class="plant-control icon-button" data-remove-plant="'+esc(p.id)+'" aria-label="Remove '+esc(p.name)+'" title="Remove">×</button></div><div class="plant-detail hidden" id="detail-'+esc(p.id.replace(/[^a-z0-9-]/gi,'-'))+'"><div class="trait-preview"><div class="photo-placeholder" role="img" aria-label="Plant photograph not licensed for this record">Photograph<br>not available</div><div><strong>Flowering months and blossom colour</strong><div class="month-strip" aria-label="Flowering months not yet verified">'+months+'</div><p>No reviewed flowering data; no months are highlighted.</p></div></div><p><strong>Potential zone:</strong> Not assessed. Confirmed site zones: '+esc(state.zones.map(z=>z.name).join(', '))+'.</p><p><strong>Ecological role, soil and light fit, mature size:</strong> Not reviewed in this dataset.</p><p><strong>Hazards, edible parts and compatibility:</strong> Unknown. Do not use for public-contact or harvesting decisions without specialist checks.</p><p><strong>Evidence:</strong> Taxonomic identity only. '+source+'. <span class="data-unknown">Case-plan use does not establish Dutch nativeness or site suitability.</span></p></div></div>';
}
function renderPalette(){
  const p=project(), manual=state.selected.length, composition=compositionNarrative();
  field('compositionMode').value=state.compositionMode;
  field('compositionGuide').innerHTML='<strong>'+esc(composition.mode.label)+'</strong><span>'+esc(composition.mode.description)+' These are spatial roles, not species ratios.</span>';
  const modeRuleIds=composition.mode.rule_ids||[],modeRules=(state.designRules?.rules||[]).filter(rule=>modeRuleIds.includes(rule.rule_id));
  const evidenceById=new Map((state.designRules?.evidence_sources||[]).map(source=>[source.id,source]));
  field('compositionEvidence').innerHTML=modeRules.length?'<p>Rule-based guidance; it shapes mock spatial grouping, not ecological eligibility:</p><ul>'+modeRules.map(rule=>'<li>'+esc(rule.rule)+'<small>Evidence: '+esc(rule.evidence_ids.map(id=>evidenceById.get(id)?.pages||evidenceById.get(id)?.type||id).filter(Boolean).join(' · '))+'</small></li>').join('')+'</ul><p class="data-unknown">Rule interpretations are not fixed planting formulas. Source-plan colour marks are legend symbols, not reliable flower-colour data.</p>':'<p>Choose a composition mode. The local rule file provides the evidence-linked guidance when available.</p>';
  field('paletteGate').innerHTML='<strong>Illustrative composition rules · synthetic plant-fit data</strong><span>The Oudolf-informed rule set shapes roles and spatial grouping only. '+esc(demo.version)+' still invents the plant traits and site-fit scores; the national catalogue supplies names only. Nothing here is a verified planting recommendation.</span>';
  field('paletteSummary').innerHTML='<strong>'+manual+' synthetic candidates in your working palette</strong><br>Project: '+esc(p.type)+' · '+esc(p.area)+' m² · '+esc(state.zones.length)+' confirmed zone'+(state.zones.length===1?'':'s')+'. Mode: '+esc(composition.mode.label)+'. Palette role counts: '+esc(composition.roleText||'not yet assigned')+'. Counts describe taxa, not planting area or quantities.';
  field('paletteGroups').innerHTML=groupOrder.map(group=>{
    const items=state.selected.filter(x=>x.group===group);
    return '<section class="palette-group"><h3>'+esc(group)+'<span>'+items.length+'</span></h3>'+(items.length?items.map(cardHtml).join(''):'<p class="empty-group">No selected plants in this layer.</p>')+'</section>';
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
    const p=state.removed.pop();if(!p)return;state.selected.push(p);state.log.push('Restored '+p.name);renderPalette();
  });
}
function renderSearch(){
  const q=field('plantSearch').value.trim().toLocaleLowerCase('nl-NL'), box=field('searchResults');
  if(q.length<2){box.classList.add('hidden');box.innerHTML='';return;}
  const results=state.catalogue.filter(p=>(p.name+' '+p.latin).toLocaleLowerCase('nl-NL').includes(q)).sort((a,b)=>Number(b.precedent)-Number(a.precedent)).slice(0,30);
  box.classList.remove('hidden');
  box.innerHTML=results.length?results.map(p=>'<button type="button" class="search-result" data-add-plant="'+esc(p.id)+'"><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.precedent?'Oudolf plan · '+p.caseId+' · identity '+Math.round((p.confidence||0)*100)+'%':p.latin)+'</small></span><b>'+((state.selected.some(x=>x.id===p.id))?'Added':'+ Add name')+'</b></button>').join(''):'<p class="empty-group">No matching name in the loaded catalogue. This is not evidence that the species is absent from the Netherlands.</p>';
  $$('[data-add-plant]').forEach(button=>button.addEventListener('click',()=>{
    const p=state.catalogue.find(x=>x.id===button.dataset.addPlant);
    if(!p||state.selected.some(x=>x.id===p.id))return;
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
    ['Spatial character',p.character],['Composition mode',compositionModeRecord().label],['Composition rule version',RULE_VERSION],['Public access',p.publicAccess],['Public harvesting',p.publicHarvest],['Required sightlines',p.sightlines],
    ['Project notes',p.notes],['Site description',s.description],
    ['Recommendation status','Simulated recommendations for workflow testing only; no verified site suitability'],
    ['Plot boundary','Prototype outline with '+state.plotBoundary.length+' corners; not cadastral'],
    ['Unresolved checks','Local occurrence; native status; site traits; hazards; provenance; density; source licences'],
    [],['ZONE CONTEXT'],['Zone','Soil','Moisture','Hydrology','Light','Canopy','Disturbance','Hardscape','Water edge','Confirmation source','Evidence note']
  ];
  state.zones.forEach(z=>{const c=z.conditions||defaultConditions();rows.push([z.name,c.soil,c.moisture,c.hydrology,c.light,c.canopy,c.disturbance,c.hardscape,c.waterEdge,c.source,c.note]);});
  rows.push([],['WORKING SELECTION — SIMULATED, NOT SITE RECOMMENDATIONS'],['Category','Dutch name','Latin name','Zone','Approx. height m','Simulated flowering','Demo soil','Demo moisture','Demo light','Composition role','Caution','Evidence status','Inclusion trace','Unresolved checks']);
  state.selected.forEach(item=>rows.push([item.group,item.name,item.latin,item.zone||'',item.height||'',item.from&&item.to?item.from+'–'+item.to:'',item.soil||'',item.moisture||'',item.light||'',compositionRoleFor(item)==='unassessed'?'Not assessed':compositionRoleLabel(compositionRoleFor(item)),item.caution||'',item.demo?'Synthetic test traits':'Name catalogue only',item.demo?'Synthetic site-fit score '+item.score+'; composition role assigned from mock layer/height under '+compositionModeRecord().label:'Manually selected by designer; no traits assessed','Verify local presence, site fit, hazards, spacing, provenance and maintenance']));
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
function placementPool(group){return state.selected.filter(p=>p.group===group&&(p.demo||p.precedent));}
function renderSpeciesOptions(){
  const choices=state.selected.filter(p=>p.demo||p.precedent);
  field('symbolSpecies').innerHTML=choices.length?choices.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+esc(p.group)+'</option>').join(''):'<option value="">No demo plants selected</option>';
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
  const planting=plantingAreas();
  if(state.plotBoundary.length<3){field('generationStatus').textContent='Draw and save the plot boundary in step 2 first.';return;}
  if(state.plotBoundary.some(p=>Math.abs(p[0])>90||Math.abs(p[1])>180)){field('generationStatus').textContent='Area-based planting density needs a geographic map. The schematic fallback is not to scale; open the prototype with its map tiles enabled.';return;}
  if(!planting.length){field('generationStatus').textContent='Mark at least one Planting zone on this map. Only marked beds are measured and planted.';return;}
  const nonTreePool=state.selected.filter(p=>p.demo||p.precedent).filter(p=>p.group!=='Trees');
  if(!nonTreePool.length){field('generationStatus').textContent='Select at least one non-tree plant before generating a dense bed.';return;}
  if(state.generated&&!confirm('Regenerate the mock plan? Current symbol edits will be replaced.'))return;
  const origin=[state.plotBoundary.reduce((s,p)=>s+p[0],0)/state.plotBoundary.length,state.plotBoundary.reduce((s,p)=>s+p[1],0)/state.plotBoundary.length];
  const beds=planting.map(poly=>localMetricPolygon(poly,origin)).filter(Boolean);
  const plotMetric=localMetricPolygon(state.plotBoundary,origin);
  const exclusions=state.sketches.filter(s=>['open','water'].includes(s.type)&&s.points.length>=3).map(s=>localMetricPolygon(s.points,origin)).filter(Boolean);
  const paths=state.sketches.filter(s=>s.type==='path'&&s.points.length>=2).map(s=>s.points.map(p=>localMetricPolygon([p,p,[p[0]+.000001,p[1]+.000001]],origin)[0]));
  const area=beds.reduce((sum,poly)=>sum+metricPolygonAreaFromXY(poly),0);
  if(!area||area<1){field('generationStatus').textContent='The planting-zone outline is too small or invalid to measure. Redraw the zone.';return;}
  const mode=selectedCompositionMode();
  const seed=Math.round(area*37+state.selected.length*101+state.plotBoundary.length*13+state.planRevision*97+mode.length*19),random=seededRandom(seed),radius=Math.max(0,Math.min(5,Number(field('treeExclusionRadius').value)||0));
  const bounds={minX:Math.min(...beds.flat().map(p=>p[0])),maxX:Math.max(...beds.flat().map(p=>p[0])),minY:Math.min(...beds.flat().map(p=>p[1])),maxY:Math.max(...beds.flat().map(p=>p[1]))};
  const contains=(pt,polys)=>polys.some(poly=>pointInPolygon(pt,poly));
  const pathSegments=paths.flatMap(line=>line.slice(1).map((p,i)=>[line[i],p]));
  const pathHalfWidthM=.75; // 1.5 m total mock path width, measured on both sides of the sketched centreline.
  const valid=(pt)=>pointInPolygon(pt,plotMetric)&&contains(pt,beds)&&!contains(pt,exclusions)&&!pathSegments.some(([a,b])=>pointSegmentDistance(pt,a,b)<pathHalfWidthM);
  const treePool=placementPool('Trees');
  const trees=[],treeCount=treePool.length&&area>=90?Math.min(12,Math.floor(area/90)):0;
  for(let i=0;i<treeCount;i++)for(let tries=0;tries<250;tries++){const pt=[bounds.minX+random()*(bounds.maxX-bounds.minX),bounds.minY+random()*(bounds.maxY-bounds.minY)];if(valid(pt)&&trees.every(t=>Math.hypot(t.xy[0]-pt[0],t.xy[1]-pt[1])>6)){trees.push({xy:pt,plant:treePool[i%treePool.length]});break;}}
  const netArea=Math.max(0,area-exclusions.reduce((sum,poly)=>sum+metricPolygonAreaFromXY(poly),0)-trees.length*Math.PI*radius*radius),uncappedTarget=Math.ceil(netArea*2),placements=[],candidatePoints=[],candidateLimit=50000;
  const cell=.62,offsetX=random()*cell,offsetY=random()*cell;
  let row=0,candidatesSeen=0;
  for(let y=bounds.minY+offsetY;y<=bounds.maxY;y+=cell,row++){
    const stagger=(row%2)*cell/2;
    for(let x=bounds.minX+offsetX+stagger;x<=bounds.maxX;x+=cell){const pt=[x,y];if(!valid(pt)||nearTree(pt,trees,radius))continue;candidatesSeen++;if(candidatePoints.length<candidateLimit)candidatePoints.push(pt);else{const replacement=Math.floor(random()*candidatesSeen);if(replacement<candidateLimit)candidatePoints[replacement]=pt;}}
  }
  const safetyCapHit=uncappedTarget>=candidateLimit||candidatesSeen>candidateLimit,target=Math.min(candidateLimit,Math.max(uncappedTarget,candidatePoints.length));
  candidatePoints.slice(0,target).forEach(pt=>placements.push(makePlacement(placements.length,chooseBedPlant(pt,nonTreePool,mode,bounds),pt,origin,bounds,mode)));
  for(let tries=0;placements.length<target&&tries<target*80;tries++){const pt=[bounds.minX+random()*(bounds.maxX-bounds.minX),bounds.minY+random()*(bounds.maxY-bounds.minY)];if(!valid(pt)||nearTree(pt,trees,radius)||placements.some(item=>Math.hypot(item.xy[0]-pt[0],item.xy[1]-pt[1])<.25))continue;placements.push(makePlacement(placements.length,chooseBedPlant(pt,nonTreePool,mode,bounds),pt,origin,bounds,mode));}
  trees.forEach((tree,i)=>placements.push(makePlacement(placements.length,tree.plant,tree.xy,origin,bounds,mode,true)));
  state.placements=placements;state.selectedPlacement=null;state.generated=true;state.planRevision++;
  buildPlantingMasses(origin,bounds,valid);
  field('generatePlan').textContent='Regenerate demo plan';
  field('downloadPlanSvg').disabled=false;field('downloadViewSvg').disabled=false;
  const used=new Set(placements.map(item=>item.plantId));
  const modeRecord=compositionModeRecord();
  field('generationStatus').textContent=placements.length.toLocaleString()+' plants represented by '+state.planMasses.length.toLocaleString()+' species-coded hatch masses and '+placements.filter(item=>item.tree||item.accent).length.toLocaleString()+' individual tree/accent symbols · '+Math.max(0,placements.length-trees.length).toLocaleString()+' non-tree plants across '+Math.round(area).toLocaleString()+' m² of marked beds ('+(netArea?((placements.length-trees.length)/netArea).toFixed(2):'0')+' per eligible m²) · '+trees.length+' mock trees with trunk-centred buffers at '+radius+' m · paths excluded at 1.5 m width · '+used.size+' taxa. Pattern: '+modeRecord.label+'. Density is a test rule, not a horticultural prescription.'+(safetyCapHit?' 50,000-plant safety cap reached; positions are sampled across the full bed and density may be below 2/m². Split very large sites for the requested minimum.':'');
  renderPlantingCoverage();renderPlacements();renderSymbolEditor();renderVisualization();
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
    if(index%31===0)item.accent=true;
  });
  state.planMasses=Array.from(groups.values()).map((mass,index)=>{
    const x=bounds.minX+mass.gx*cell,y=bounds.minY+mass.gy*cell,corners=[[x,y],[x+cell,y],[x+cell,y+cell],[x,y+cell]];
    const polygon=corners.map(point=>metricToLatLng(point,origin));
    const centre=[x+cell/2,y+cell/2];
    const complete=valid(centre)&&corners.every(valid);
    return {...mass,id:'mass-'+index,polygon,area:complete?cell*cell:0,complete,gx:mass.gx,gy:mass.gy};
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
  const path=layer.getElement&&layer.getElement();if(!path)return;
  const svg=path.ownerSVGElement;if(!svg)return;let defs=svg.querySelector('defs[data-plantscapes-hatches]');
  if(!defs){defs=document.createElementNS('http://www.w3.org/2000/svg','defs');defs.setAttribute('data-plantscapes-hatches','true');svg.prepend(defs);}
  const id='plant-mass-hatch-'+index;if(!svg.querySelector('#'+id)){const pattern=document.createElementNS('http://www.w3.org/2000/svg','pattern');pattern.setAttribute('id',id);pattern.setAttribute('width','8');pattern.setAttribute('height','8');pattern.setAttribute('patternUnits','userSpaceOnUse');const base=document.createElementNS('http://www.w3.org/2000/svg','rect');base.setAttribute('width','8');base.setAttribute('height','8');base.setAttribute('fill',colour);base.setAttribute('fill-opacity','.16');const lines=document.createElementNS('http://www.w3.org/2000/svg','path');lines.setAttribute('d','M-2 8L8-2M2 10L10 2');lines.setAttribute('stroke',colour);lines.setAttribute('stroke-width','1.4');pattern.append(base,lines);defs.append(pattern);}
  path.setAttribute('fill','url(#'+id+')');path.setAttribute('fill-opacity','1');
}
function renderPlacements(){
  if(state.map){state.placementLayers.forEach(layer=>state.map.removeLayer(layer));state.placementLayers=[];
    const key=new Map(planPlantKey().map(entry=>[entry.plant.id,entry]));
    state.planMasses.forEach(mass=>{const p=state.selected.find(plant=>plant.id===mass.plantId);if(!p)return;const entry=key.get(p.id),colour=entry?.colour||'#536d59';const layer=L.polygon(mass.polygon,{color,weight:.6,fillColor:colour,fillOpacity:.18,interactive:true}).addTo(state.map).bindTooltip(String(entry?.index||0).padStart(2,'0')+' · '+p.name+' · '+mass.count+' plants in this hatch mass');applyMassHatch(layer,colour,entry?.index||0);state.placementLayers.push(layer);});
    state.placements.filter(item=>item.tree||item.accent).forEach(item=>{const p=plantForPlacement(item);if(!p)return;
      const entry=key.get(p.id),selected=item.id===state.selectedPlacement,colour=entry?.colour||'#536d59';
      const marker=L.circleMarker(item.point,{renderer,radius:item.tree?6.2:selected?4.8:2.8,color:item.tree?'#263b2d':'#fff',weight:item.tree?1.8:.8,fillColor:colour,fillOpacity:.92}).addTo(state.map).bindTooltip(String(entry?.index||0).padStart(2,'0')+' · '+p.name+(item.tree?' · illustrative tree':' · illustrative planting position'));
      marker.on('click',event=>{L.DomEvent.stopPropagation(event);selectPlacement(item.id);});state.placementLayers.push(marker);
      if(item.tree){const radius=Math.max(0,Math.min(5,Number(field('treeExclusionRadius').value)||0));if(radius>0){const buffer=L.circle(item.point,{radius,color:'#765c3a',weight:1,dashArray:'3 4',fillColor:'#d5b58b',fillOpacity:.13,interactive:false}).addTo(state.map);state.placementLayers.push(buffer);}}
    });
  }else renderFallbackSketch();
  renderPlacementList();
}
function renderPlacementList(){
  field('symbolCount').textContent=state.planMasses.length;
  const grouped=new Map();state.placements.forEach(item=>{const p=plantForPlacement(item);if(!p)return;const record=grouped.get(p.id)||{plant:p,count:0,first:item};record.count++;grouped.set(p.id,record);});
  const key=new Map(planPlantKey().map(entry=>[entry.plant.id,entry]));
  field('placementList').innerHTML=grouped.size?Array.from(grouped.values()).map(({plant,count,first})=>{const item=state.placements.find(x=>x.plantId===plant.id&&(x.tree||x.accent)),entry=key.get(plant.id),isSelected=item&&state.selectedPlacement===item.id,massCount=state.planMasses.filter(mass=>mass.plantId===plant.id).length,tag=item?'button':'div',selectAttr=item?' type="button" data-select-symbol="'+esc(item.id)+'"':'';return '<'+tag+selectAttr+' class="placement-item'+(isSelected?' active':'')+'"><span class="placement-dot" style="background:'+entry.colour+'">'+entry.index+'</span><span>'+esc(plant.name)+'<small>'+count.toLocaleString()+' plants · '+massCount+' hatch masses · '+esc(plant.group||'unclassified')+(item?'':' · mass only')+'</small></span></'+tag+'>';}).join(''):'No positions yet.';
  $$('[data-select-symbol]').forEach(button=>button.addEventListener('click',()=>selectPlacement(button.dataset.selectSymbol)));
  const used=new Set(state.placements.map(item=>item.plantId)),unplaced=state.generated?state.selected.filter(p=>(p.demo||p.precedent)&&!used.has(p.id)):[];
  field('unplacedCount').textContent=unplaced.length;
  field('unplacedList').innerHTML=state.generated?(unplaced.length?unplaced.map(p=>'<div class="unplaced-item">'+esc(p.name)+' <small>'+esc(p.group)+'</small></div>').join(''):'Every selected demo taxon is represented.'):'Generate a plan to compare the palette.';
}
function renderSymbolEditor(){
  const box=field('selectedSymbol'),item=state.placements.find(x=>x.id===state.selectedPlacement);
  if(!item){box.textContent=state.generated?'Select a symbol on the plan to change it.':'Generate a plan, then select a symbol.';return;}
  const plant=plantForPlacement(item);const options=state.selected.filter(p=>p.demo||p.precedent).map(p=>'<option value="'+esc(p.id)+'"'+(p.id===item.plantId?' selected':'')+'>'+esc(p.name)+'</option>').join('');
  box.innerHTML='<strong>Selected symbol</strong><label class="field"><span>Species</span><select id="editSymbolSpecies">'+options+'</select></label><div class="symbol-actions"><button id="moveSymbol" type="button" class="button button-secondary">Move on map</button><button id="removeSymbol" type="button" class="button button-secondary">Remove</button></div><small>'+esc(plant?.group||'Unknown layer')+' · one symbol is one individual plant.</small>';
  field('editSymbolSpecies').addEventListener('change',event=>{item.plantId=event.target.value;refreshPlantingMassCounts();renderPlacements();renderPlacementList();renderSymbolEditor();renderVisualization();field('generationStatus').textContent='Species changed. Hatch masses and the quantity key updated.';});
  field('moveSymbol').addEventListener('click',()=>{setTool('moveSymbol');field('mapInstruction').textContent='Click a new point inside the plot for the selected symbol.';});
  field('removeSymbol').addEventListener('click',()=>{state.placements=state.placements.filter(x=>x.id!==item.id);state.selectedPlacement=null;refreshPlantingMassCounts();renderPlacements();renderPlacementList();renderSymbolEditor();renderVisualization();field('generationStatus').textContent='Individual symbol removed. Hatch mass counts updated.';});
}
function moveSelectedSymbol(point){
  const item=state.placements.find(x=>x.id===state.selectedPlacement);if(!item)return;
  if(!pointInPolygon(point,state.plotBoundary)){field('generationStatus').textContent='Keep symbols inside the saved plot boundary.';return;}
  const b=planBounds();item.point=point;item.nx=(point[0]-b.minA)/Math.max(.000001,b.maxA-b.minA);item.ny=(point[1]-b.minB)/Math.max(.000001,b.maxB-b.minB);if(state.massGrid)item.xy=latLngToMetric(point,state.massGrid.origin);
  refreshPlantingMassCounts();
  renderPlacements();renderVisualization();setTool('pan');field('generationStatus').textContent='Symbol moved. Schematic view updated.';
}
function addPlantSymbol(point){
  if(!state.generated){field('generationStatus').textContent='Generate a demo plan before adding a plant symbol.';return;}
  if(!pointInPolygon(point,state.plotBoundary)){field('generationStatus').textContent='Place plant symbols inside the saved plot boundary.';return;}
  const plantId=field('symbolSpecies').value;if(!plantId)return;
  const b=planBounds(),item={id:'symbol-'+Date.now(),plantId,point,nx:(point[0]-b.minA)/Math.max(.000001,b.maxA-b.minA),ny:(point[1]-b.minB)/Math.max(.000001,b.maxB-b.minB)};
  state.placements.push(item);state.selectedPlacement=item.id;renderPlacements();renderSymbolEditor();renderVisualization();field('generationStatus').textContent='Plant symbol added. Schematic view updated.';
}
function renderVisualization(){
  const canvas=field('visualCanvas');
  if(!state.generated){canvas.innerHTML='<div class="visual-empty">Generate a demo plan to see the illustrative view.</div>';return;}
  const season=field('viewSeason').value,age=Number(field('viewAge').value),direction=field('viewDirection').value;
  const sky={spring:'#dcecf0',summer:'#d7ebec',autumn:'#e7e4d1',winter:'#dce2e5'}[season];
  const ground={spring:'#83a875',summer:'#779960',autumn:'#ad986a',winter:'#a8b4aa'}[season];
  const ageScale={1:.43,5:.68,15:.9,30:1.05}[age];
  const stride=Math.max(1,Math.ceil(state.placements.length/140));
  const items=state.placements.filter((_,i)=>i%stride===0).map(item=>{const plant=plantForPlacement(item);let x=direction==='east'?item.nx:direction==='west'?1-item.nx:direction==='north'?item.ny:1-item.ny;let depth=direction==='east'?item.ny:direction==='west'?1-item.ny:direction==='north'?1-item.nx:item.nx;return {plant,x:75+x*650,y:250-depth*75,depth};}).filter(x=>x.plant).sort((a,b)=>b.depth-a.depth);
  const shapes=items.map(({plant,x,y})=>{
    const kind=pinClass[plant.group],height=Math.min(95,22+Math.sqrt(plant.height||1)*18)*ageScale;
    if(kind==='tree'){const bare=season==='winter',c=season==='autumn'?'#b58d49':season==='spring'?'#9ebc76':'#567f56';return '<g><ellipse cx="'+x+'" cy="'+(y+4)+'" rx="28" ry="7" fill="#315d4555"/><path d="M'+x+' '+y+'v-'+height+'" stroke="#6d604a" stroke-width="7"/><circle cx="'+x+'" cy="'+(y-height)+'" r="'+(bare?8:height*.35)+'" fill="'+(bare?'#8d7965':c)+'" opacity=".9"/></g>';}
    if(kind==='shrub'||kind==='climber'){const c=season==='winter'?'#7b846d':season==='autumn'?'#987d56':'#5d8a5b';return '<g><ellipse cx="'+x+'" cy="'+(y+3)+'" rx="19" ry="5" fill="#315d4544"/><ellipse cx="'+x+'" cy="'+(y-height*.36)+'" rx="'+(14*ageScale)+'" ry="'+(height*.43)+'" fill="'+c+'"/></g>';}
    if(kind==='grass'){return '<g stroke="'+(season==='winter'?'#9e9d7e':'#688b5b')+'" stroke-width="2" fill="none"><path d="M'+x+' '+y+'q-9 -20 -11 -25M'+x+' '+y+'q7 -22 12 -26M'+x+' '+y+'v-27"/></g>';}
    const months={spring:4,summer:7,autumn:10,winter:1},bloom=months[season]>=plant.from&&months[season]<=plant.to,flower=bloom?(colourHex[plant.colour]||'#ebd67a'):'#73956a';
    return '<g><path d="M'+x+' '+y+'v-18" stroke="#4e805a" stroke-width="2"/><circle cx="'+x+'" cy="'+(y-20)+'" r="'+(bloom?7:3)+'" fill="'+flower+'" stroke="#4a7153" stroke-width="1"/></g>';
  }).join('');
  const water=state.sketches.some(s=>s.type==='water')||state.zones.some(z=>z.conditions?.waterEdge==='yes');
  canvas.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" role="img" aria-label="Synthetic '+esc(season)+' landscape view at year '+age+' from '+esc(direction)+'"><rect width="800" height="360" fill="'+sky+'"/><circle cx="680" cy="65" r="31" fill="#f6edcb"/><path d="M0 204 Q190 183 360 205T800 195V360H0Z" fill="'+ground+'"/><path d="M0 272Q220 230 430 270T800 252V360H0Z" fill="'+(season==='winter'?'#809485':'#63865d')+'"/>'+(water?'<path d="M0 310 Q270 282 800 324V360H0Z" fill="#92bdc3" opacity=".9"/>':'')+shapes+'<rect x="18" y="16" width="330" height="28" rx="5" fill="#183d32dd"/><text x="30" y="35" fill="#fff" font-family="Segoe UI, sans-serif" font-size="14">'+esc(season[0].toUpperCase()+season.slice(1))+' · Year '+age+' · View from '+esc(direction)+'</text></svg>';
  canvas.setAttribute('aria-label','Synthetic '+season+' landscape view at year '+age+' from '+direction+'; '+items.length+' planting symbols');
  field('visualCaption').textContent='Illustrative sample of '+items.length+' from '+state.placements.length+' plan symbols · '+season+' · year '+age+' · view from '+direction+'. Flowering and height use invented demonstration values, not forecasts.';
}
function downloadSvg(markup,name){
  const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function downloadPlanSvg(){
  if(!state.generated)return;
  const b=planBounds(),fallback=!state.map;
  const px=point=>fallback?95+(point[0]-b.minA)/Math.max(.000001,b.maxA-b.minA)*710:95+(point[1]-b.minB)/Math.max(.000001,b.maxB-b.minB)*710;
  const py=point=>fallback?100+(point[1]-b.minB)/Math.max(.000001,b.maxB-b.minB)*455:100+(b.maxA-point[0])/Math.max(.000001,b.maxA-b.minA)*455;
  const points=poly=>poly.map(p=>px(p).toFixed(1)+','+py(p).toFixed(1)).join(' ');
  const key=planPlantKey(),keyById=new Map(key.map(entry=>[entry.plant.id,entry]));
  const symbols=state.placements.filter(item=>item.tree||item.accent).map(item=>{const p=plantForPlacement(item),entry=keyById.get(p?.id),colour=entry?.colour||'#68756b',x=px(item.point).toFixed(1),y=py(item.point).toFixed(1),r=item.tree?5:2.7;return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+colour+'" stroke="'+(item.tree?'#263b2d':'#fff')+'" stroke-width="'+(item.tree?1.4:.65)+'"/>';}).join('');
  const massPatterns=key.map(({plant,index,colour})=>'<pattern id="mass-'+index+'" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="'+colour+'" fill-opacity=".18"/><path d="M-2 8L8-2M2 10L10 2" stroke="'+colour+'" stroke-width="1.7"/></pattern>').join('');
  const masses=state.planMasses.map(mass=>{const index=keyById.get(mass.plantId)?.index||1;return '<polygon points="'+points(mass.polygon)+'" fill="url(#mass-'+index+')" stroke="'+(keyById.get(mass.plantId)?.colour||'#536d59')+'" stroke-width=".35"/>';}).join('');
  const legend=key.map(({plant,index,colour})=>{const i=index-1,x=105+(i<22?0:420),y=628+(i%22)*14,count=state.placements.filter(item=>item.plantId===plant.id).length;return '<g><rect x="'+(x-6)+'" y="'+(y-7)+'" width="13" height="13" fill="url(#mass-'+index+')" stroke="'+colour+'" stroke-width=".6"/><text x="'+(x+13)+'" y="'+(y+4)+'" font-family="Arial, sans-serif" font-size="10" fill="#244539">'+String(index).padStart(2,'0')+'  '+esc(plant.name)+' — '+esc(plant.latin)+' · '+count.toLocaleString()+' plants</text></g>';}).join('');
  const beds=plantingAreas().map(poly=>'<polygon points="'+points(poly)+'" fill="url(#planting-hatch)" stroke="#66875e" stroke-width="1.5"/>').join('');
  const sketch=state.sketches.filter(x=>x.type!=='camera'&&x.type!=='planting').map(item=>{const style=sketchStyles[item.type],tag=item.type==='path'?'polyline':'polygon';return '<'+tag+' points="'+points(item.points)+'" fill="'+(item.type==='path'?'none':style.fillColor)+'" fill-opacity="'+(style.fillOpacity||0)+'" stroke="'+style.color+'" stroke-width="'+(item.type==='path'?5:2.5)+'" stroke-linecap="round" stroke-linejoin="round"/>';}).join('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 960" width="900" height="960"><defs><pattern id="planting-hatch" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#e4eedc"/><path d="M-2 10L10-2M3 13L13 3" stroke="#9bb58b" stroke-width="1"/></pattern>'+massPatterns+'</defs><rect width="900" height="960" fill="#fbfcf7"/><text x="72" y="43" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#183d32">Plantscapes · planting layout</text><text x="72" y="66" font-family="Arial, sans-serif" font-size="11" letter-spacing="1" fill="#647565">'+esc(compositionModeRecord().label.toUpperCase())+' · ILLUSTRATIVE MOCK · NOT TO SCALE</text><rect x="72" y="84" width="756" height="490" rx="2" fill="#f1f3eb" stroke="#c6d0c3"/> '+beds+masses+'<polygon points="'+points(state.plotBoundary)+'" fill="none" stroke="#234638" stroke-width="2.5" stroke-dasharray="8 5"/>'+sketch+symbols+'<g transform="translate(786 115)"><path d="M0 29V0M0 0l-7 12M0 0l7 12" fill="none" stroke="#234638" stroke-width="2"/><text x="0" y="43" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#234638">N</text></g><text x="72" y="606" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#183d32">Species key · quantities are plants, hatch areas show composition</text><text x="72" y="622" font-family="Arial, sans-serif" font-size="9" fill="#647565">Coded hatch = mass planting · circles = individual trees and accent plants · quantities retain every generated plant</text>'+legend+'<text x="72" y="940" font-family="Arial, sans-serif" font-size="10" fill="#725723">Mock positions, plant roles and coverage are illustrative. Confirm species, quantities, spacing, access and site conditions before use.</text></svg>';
  downloadSvg(svg,'plantscapes-MOCK-planting-plan.svg');
}
function downloadViewSvg(){
  const svg=field('visualCanvas').querySelector('svg');if(!svg)return;
  downloadSvg(svg.outerHTML,'plantscapes-MOCK-schematic-view.svg');
}
function demoBasemap(map){
  if(!window.L)return;
  L.tileLayer('https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png',{
    minZoom:6,maxZoom:19,bounds:[[50.5,3.25],[54,7.6]],
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
  field('addCenterShape').disabled=tool==='pan';
  updateSketchButtons();
}
function addCenterShape(){
  if(state.tool==='pan')return;
  const c=state.map?state.map.getCenter():{lat:500,lng:500};
  if(state.tool==='camera'){addCamera(state.map?[c.lat,c.lng]:[500,500]);return;}
  if(state.tool==='symbol'){addPlantSymbol(state.map?[c.lat,c.lng]:[500,500]);return;}
  if(state.tool==='moveSymbol'){moveSelectedSymbol(state.map?[c.lat,c.lng]:[500,500]);return;}
  const d=state.map?.00018:80;
  state.draft=state.tool==='path'?[[c.lat-d,c.lng-d],[c.lat+d,c.lng+d]]:[[c.lat-d,c.lng-d],[c.lat-d,c.lng+d],[c.lat+d,c.lng+d],[c.lat+d,c.lng-d]];
  drawDraft();finishShape();
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
  const item={type:state.tool,points:state.draft.map(pair=>pair.slice()),layer:null};
  if(state.map){
    item.layer=state.tool==='path'?L.polyline(item.points,sketchStyles[item.type]).addTo(state.map):L.polygon(item.points,sketchStyles[item.type]).addTo(state.map);
    if(state.draftLayer)state.map.removeLayer(state.draftLayer);state.draftLayer=null;
  }
  state.sketches.push(item);state.draft=[];renderSketchList();renderFallbackSketch();updateSketchButtons();
  if(state.generated)renderPlantingCoverage();
  if(state.generated)field('generationStatus').textContent='Sketch changed. Regenerate the demo plan to account for the new space.';
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
}
function clearSketch(){
  if(!state.sketches.length&&!state.draft.length)return;
  if(!confirm('Clear all sketch layers? This cannot be undone.'))return;
  if(state.map){state.sketches.forEach(item=>item.layer&&state.map.removeLayer(item.layer));if(state.draftLayer)state.map.removeLayer(state.draftLayer);}
  state.sketches=[];state.draft=[];state.draftLayer=null;renderSketchList();renderFallbackSketch();updateSketchButtons();if(state.generated)renderPlantingCoverage();
  if(state.generated)field('generationStatus').textContent='Sketch cleared. Regenerate the demo plan to reflect it.';
}
function updateSketchButtons(){
  field('finishShape').disabled=state.draft.length<(state.tool==='path'?2:3);
  field('undoSketch').disabled=!state.draft.length&&!state.sketches.length;
  field('clearSketch').disabled=!state.draft.length&&!state.sketches.length;
  if(state.stage===7&&state.tool!=='pan'&&state.tool!=='camera'&&state.tool!=='symbol'&&state.tool!=='moveSymbol')field('mapInstruction').textContent=state.draft.length?state.draft.length+' point'+(state.draft.length===1?'':'s')+' placed · '+(field('finishShape').disabled?'add more points':'Finish shape to save '+toolLabels[state.tool].toLowerCase()):'Click points for '+toolLabels[state.tool].toLowerCase()+'; each corner appears immediately.';
}
function renderSketchList(){
  field('sketchList').innerHTML=state.sketches.length?state.sketches.map((item,i)=>'<div><span>'+esc(toolLabels[item.type])+'</span><span>#'+(i+1)+'</span></div>').join(''):'No layers drawn yet.';
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
  field('generatePlan').addEventListener('click',generatePlan);
  field('downloadPlanSvg').addEventListener('click',downloadPlanSvg);
  field('downloadViewSvg').addEventListener('click',downloadViewSvg);
  ['viewDirection','viewSeason','viewAge'].forEach(id=>field(id).addEventListener('change',renderVisualization));
  $$('.toolrow .tool').forEach(button=>button.addEventListener('click',()=>{state.draft=[];drawDraft();setTool(button.dataset.tool);}));
  field('finishShape').addEventListener('click',finishShape);
  field('addCenterShape').addEventListener('click',addCenterShape);
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
