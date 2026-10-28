/* Plantscapes workflow v2. Synthetic ecology is for interaction testing only. */
const DATASET_VERSION = 'nl-vascular-v0.2';
const RULE_VERSION = window.PLANTSCAPES_RULEBOOK?.version || 'rulebook unavailable';
const engine = window.PlantscapesEngine;
const suitability = window.PlantscapesSuitabilityV03;
const runtime = window.PlantscapesRuntimeV03;
const recommender = window.PlantscapesRecommender;
const candidateCards = window.PlantscapesCandidateCard;
const PATH_WIDTH = 1.5;
const PLOT_CLOSE_RADIUS_PX = 18;
const MAP_ZOOM_GESTURE = Object.freeze({pixelsPerZoomLevel:150,minimumDelta:.001,maximumDelta:.45,velocityReference:.35,maximumAcceleration:3.25,accelerationCurve:.65});
const demo = window.PLANTSCAPES_DEMO || {places:{}};
const oudolfPrecedents = window.PLANTSCAPES_OUDOLF_PRECEDENTS || [];
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const state = {
  stage: 0, unlocked: 1, nextZoneId: 2,
  zones: [{id: 1, name: 'Whole site', conditions: null}],
  inventory: [], catalogue: [], catalogueSource: 'starter names',
  selected: [], removed: [], approved: false, log: [], paletteBuilt:false,
  designRules:null, compositionMode:'auto', planAudit:null, planDirty:false, planUndo:[],
  siteMap:null, siteMapReady:false, selectedLocation:null, plotMode:'pan', plotDraft:[], plotBoundary:[], plotDraftLayer:null, plotPreviewLayer:null, plotLayer:null,
  map: null, mapReady: false, tool: 'pan', draft: [], draftLayer: null,
  sketches: [], planOverlay: null, planObjectUrl: null, siteBoundaryLayer:null, movePreviewLayer:null,
  placements:[], planMasses:[], massGrid:null, placementLayers:[], coverageLayers:[], selectedPlacement:null, draggingPlacement:null, generated:false, planRevision:0
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
  type: choice('projectType'), area: geographicPolygonAreaM2(state.plotBoundary)??'unknown', audience:field('audience').value,
  maintenance:field('maintenance').value, priorities:$$('#priorityOptions input:checked').map(x=>x.value),
  character:field('spatialCharacter').value, notes:'',
  publicAccess:checked('publicAccess'), publicHarvest:checked('foodHarvest'), sightlines:checked('clearSightlines'),
  support:checked('mappedSupport'),vigourControl:field('vigourControl').value,
  rewilding:$$('#priorityOptions input:checked').some(x=>x.value==='rewilding'), restorationOrnamentals:checked('restorationOrnamentals'),
  anchorColours:[field('anchorColour1').value,field('anchorColour2').value].filter(Boolean),
  overrideIds:state.selected.filter(p=>p.recordKind==='uncertainty_example').map(p=>p.id)
});
const site = () => {
  const selected=state.selectedLocation,points=state.plotBoundary;
  const center=points.length?points.reduce((sum,p)=>[sum[0]+p[0]/points.length,sum[1]+p[1]/points.length],[0,0]):null;
  const near=selected&&center&&Math.hypot((center[0]-selected.lat)*111195,(center[1]-selected.lng)*111195*Math.cos(selected.lat*Math.PI/180))<3000;
  return {location:(near?selected.label:nearestDemoPlace()?.label || 'Selected map area')+', Netherlands',description:field('siteDescription').value.trim()};
};

function stageFromUrl(){
  const match = location.hash.match(/^#stage-(\d)$/);
  const proposed = match ? (Number(match[1])===8?7:Number(match[1])) : 0;
  return proposed <= state.unlocked ? proposed : 0;
}
function showStage(number, updateHistory=true){
  if(number===5)number=6;
  if(number===8)number=7;
  if(number > state.unlocked || number < 0 || number > 7) return;
  state.stage = number;
  field('home').classList.toggle('hidden', number !== 0);
  field('workflow').classList.toggle('hidden', number === 0);
  for(let n=1;n<=8;n++) field('stage'+n)?.classList.toggle('hidden',n!==number);
  $$('.stage').forEach(button => {
    const n = Number(button.dataset.stage);
    button.disabled = n > state.unlocked;
    button.classList.toggle('active',n===number);
    if(n===number) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
  });
  field('stageCount').textContent = ([1,2,3,4,7].indexOf(number)+1)+' of 5';
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
    disturbance:'unknown', hardscape:checked('featureHardscape')?'yes':'no',
    waterEdge:checked('featureWater')?'yes':'no', source:'demo',path_edge:'unknown',
    available_width_m:'unknown',available_length_m:'unknown',plantable_area_m2:'unknown',max_plant_height_m:'unknown',support_length_m:'unknown',
    field_origins:Object.fromEntries(['soil','moisture','hydrology','light','canopy','disturbance','hardscape','waterEdge'].map(f=>[f,f==='disturbance'?'unknown':'synthetic_fallback'])),note:''
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
  path_edge:[['unknown','Not mapped'],['yes','Path edge'],['no','Away from paths']],
  source:[['unverified','Not confirmed yet'],['demo','Accept synthetic suggestion for test'],['observation','My site observation'],['survey','Site survey / test'],['document','Existing site document']]
};
const labels = {soil:'Soil',moisture:'Moisture',hydrology:'Wetness regime',light:'Light',canopy:'Canopy',disturbance:'Disturbance',hardscape:'Hardscape',waterEdge:'Water edge',path_edge:'Path edge',source:'Basis for confirmation'};
function selectHtml(z,key){
  const values=options[key]; const current=z.conditions[key];
  const guidance=key==='disturbance'?'<span class="info-icon" tabindex="0" role="img" aria-label="More information about disturbance">i<span class="info-tooltip" role="tooltip">A nearby mapped road does not prove high site stress. Choose a level only from site evidence.</span></span>':'';
  return '<label class="field"><span>'+labels[key]+guidance+'</span><select data-zone-condition="'+z.id+'" data-condition-key="'+key+'">'+values.map(pair=>'<option value="'+pair[0]+'"'+(pair[0]===current?' selected':'')+'>'+pair[1]+'</option>').join('')+'</select></label>';
}
function renderConditionZones(){
  const place=nearestDemoPlace();
  field('conditionBasis').textContent='Approximate profile around '+(place?place.label:'the chosen area')+'; inferred from your boundary and feature checkboxes. It is invented for workflow testing, not derived from a soil map or survey.';
  state.zones.forEach(z=>{if(!z.conditions)z.conditions=defaultConditions();});
  field('conditionZones').innerHTML=state.zones.map(z=>{const advancedKeys=['available_width_m','available_length_m','plantable_area_m2','max_plant_height_m','support_length_m'];const hasAdvancedValue=z.conditions.path_edge!=='unknown'||advancedKeys.some(key=>z.conditions[key]&&z.conditions[key]!=='unknown')||z.conditions.source!=='demo'||z.conditions.note;return '<article class="condition-card"><div class="condition-card-head"><h3>'+esc(z.name||'Unnamed zone')+'</h3></div><p class="condition-estimate-note">Initial estimate — review values you can verify.</p><div class="condition-grid">'+['soil','moisture','hydrology','light','canopy','disturbance','hardscape','waterEdge'].map(key=>selectHtml(z,key)).join('')+'</div><details class="advanced-site-details"'+(hasAdvancedValue?' open':'')+'><summary>Advanced site details <span>Optional placement, space and evidence settings</span></summary><div class="advanced-site-details-body">'+selectHtml(z,'path_edge')+'<p class="measurement-guidance">Leave a measurement empty if it is not known.</p><div class="condition-grid">'+[['available_width_m','Clear width (m)'],['available_length_m','Clear length (m)'],['plantable_area_m2','Clear zone area (m²)'],['max_plant_height_m','Visibility limit (m)'],['support_length_m','Mapped support length (m)']].map(([key,label])=>'<label class="field"><span>'+label+'</span><input type="number" min="0" step="any" placeholder="Not measured" data-zone-number="'+z.id+'" data-number-key="'+key+'" value="'+(z.conditions[key]==='unknown'?'':esc(z.conditions[key]))+'"></label>').join('')+'</div><div class="condition-card-foot">'+selectHtml(z,'source')+'<label class="field"><span>Evidence note <em>optional</em></span><input data-zone-note="'+z.id+'" value="'+esc(z.conditions.note)+'" placeholder="e.g. surveyed in June"></label></div></div></details></article>'}).join('');
  $$('[data-zone-condition]').forEach(input=>input.addEventListener('change',()=>{
    const z=state.zones.find(item=>item.id===Number(input.dataset.zoneCondition));
    z.conditions[input.dataset.conditionKey]=input.value;if(input.dataset.conditionKey!=='source')z.conditions.field_origins[input.dataset.conditionKey]='user_selected'; invalidateFrom(3);
    field('conditionError').classList.add('hidden');
  }));
  $$('[data-zone-note]').forEach(input=>input.addEventListener('input',()=>{
    state.zones.find(item=>item.id===Number(input.dataset.zoneNote)).conditions.note=input.value; invalidateFrom(3);
  }));
  $$('[data-zone-number]').forEach(input=>input.addEventListener('input',()=>{const z=state.zones.find(item=>item.id===Number(input.dataset.zoneNumber));z.conditions[input.dataset.numberKey]=input.value===''?'unknown':Number(input.value);invalidateFrom(3);}));
}
function validateConditions(){
  state.zones.forEach(z=>{if(!z.conditions)z.conditions=defaultConditions();});
  field('conditionError').classList.add('hidden');return true;
}
function parseCsv(text){
  const delimiter=(text.split(/\r?\n/,1)[0].match(/;/g)||[]).length>(text.split(/\r?\n/,1)[0].match(/,/g)||[]).length?';':',';
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"' && quoted && text[i+1]==='"'){cell+='"';i++;}
    else if(c==='"')quoted=!quoted;
    else if(c===delimiter&&!quoted){row.push(cell);cell='';}
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
  return plant?.operational?plant.role:'unassessed';
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
function inventoryNamesFromRows(rows){
  const headers=(rows[0]||[]).map(x=>String(x).replace(/^\uFEFF/,'').trim().toLowerCase());
  let column=headers.findIndex(x=>/^(scientific[ _-]?name|latin[ _-]?name|botanical[ _-]?name|wetenschappelijke naam|latijnse naam)$/.test(x));
  if(column<0)column=headers.findIndex(x=>/^(species|plant[ _-]?name|name|naam|soort|plant|nederlandse naam)$/.test(x));
  const data=column<0?rows:rows.slice(1);if(column<0)column=0;
  const seen=new Set();return data.map(row=>String(row[column]||'').trim()).filter(name=>{const key=name.toLocaleLowerCase('nl-NL');if(!key||seen.has(key))return false;seen.add(key);return true;}).slice(0,2000);
}
function inventoryPaletteHtml(screened){
  if(!state.inventory.length)return '';
  const normal=name=>String(name||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('nl-NL');
  const records=[...screened.candidates,...screened.hidden];
  return '<section class="palette-group inventory-group"><h3>Existing plants<span>'+state.inventory.length+'</span></h3><p>Uploaded inventory · verify on site. These records are not new planting recommendations.</p>'+state.inventory.map((name,i)=>{
    const matches=records.filter(p=>[p.name,p.latin].some(n=>normal(n)===normal(name)));
    const match=matches.length===1?matches[0]:null,id='inventory-'+i;
    if(match?.recommendation&&screened.candidates.includes(match))return candidateCards.cardHtml({...match,id},{removable:false});
    const label=match?.label||'Information missing';
    const reason=match?.reason||'No unambiguous operational record with enough information to assess this plant.';
    return '<article class="plant-row candidate-card" data-inventory="'+id+'"><div class="candidate-row"><div class="candidate-name"><h4>'+esc(name)+'</h4><p class="candidate-role">Existing plant · '+esc(label)+'</p></div><div class="candidate-actions">'+candidateCards.toggleButton(id,name)+'</div></div><div class="plant-detail" id="candidate-detail-'+id+'" hidden><p>'+esc(reason)+'</p><p>Verify identity, condition and site suitability. Missing size, ecological and safety information stays unknown. This record is not automatically placed and does not imply removal of the existing plant.</p></div></article>';
  }).join('')+'</section>';
}
function renderInventory(){
  const box=field('inventoryPreview');box.classList.toggle('hidden',!state.inventory.length);
  if(state.inventory.length)box.innerHTML='<strong>'+state.inventory.length+' inventory name'+(state.inventory.length===1?'':'s')+' loaded · verify on site</strong><p>'+esc(state.inventory.slice(0,12).join(' · '))+(state.inventory.length>12?' …':'')+'</p>';
}
const colourHex={white:'#f8f7e8',purple:'#9b79b9',pink:'#df8fab',yellow:'#ecd46a',blue:'#799bc7',green:'#91a96c',brown:'#a78368',gold:'#d5ba74',cream:'#eee6c0'};
const screeningZones=()=>state.zones.map(z=>({...z,conditions:z.conditions||defaultConditions()}));
function demoCandidates(){
  return recommender.candidates(screeningZones(),project());
}
/* A missing-information example evaluated as if the user has added it anyway. */
function overrideItem(id){
  const p=project();
  return recommender.showcase(screeningZones(),{...p,overrideIds:[...p.overrideIds,id]}).find(item=>item.id===id);
}
function buildDemoPalette(){
  const kept=project().overrideIds;
  state.selected=demoCandidates();state.removed=[];state.log=[];state.paletteBuilt=true;state.approved=false;
  // Overrides are the designer's decision, so they survive a rebuild while only information is still missing.
  for(const id of kept){
    const item=overrideItem(id);
    if(item.recommendation.override.active)state.selected.push(item);
    else state.log.push(item.name+' (added anyway) was dropped: '+(item.recommendation.constraint?.text||item.recommendation.label));
  }
}
function refreshOperationalRanking(){
  if(!state.paletteBuilt)return;
  const current=new Set(state.selected.filter(p=>p.operational).map(p=>p.id));
  const operational=demoCandidates().filter(p=>current.has(p.id));
  state.selected=[...operational,...state.selected.filter(p=>!p.operational)];
}
function cardHtml(p){
  if(p.recommendation)return candidateCards.cardHtml(p);
  const source=p.precedent?'Oudolf case study '+esc(p.caseId)+' · name-resolution confidence '+Math.round((p.confidence||0)*100)+'% · ornamental precedent only':p.url?'<a href="'+esc(p.url)+'" target="_blank" rel="noreferrer">Open taxonomy record</a>':'No record link in starter subset';
  const months=['J','F','M','A','M','J','J','A','S','O','N','D'].map(month=>'<span>'+month+'</span>').join('');
  return '<div class="plant-row"><div class="plant-row-inner"><div class="plant-row-name"><strong>'+esc(p.name)+'</strong><em>'+esc(p.latin)+'</em><small>'+(p.precedent?'Oudolf case-study precedent · not a site recommendation':'Manual working selection · not a site recommendation')+'</small></div>'+candidateCards.toggleButton(p.id,p.name)+candidateCards.removeButton(p.id,p.name)+'</div><div class="plant-detail hidden" id="detail-'+esc(p.id.replace(/[^a-z0-9-]/gi,'-'))+'"><div class="trait-preview"><div class="photo-placeholder" role="img" aria-label="Plant photograph not licensed for this record">Photograph<br>not available</div><div><strong>Flowering months and blossom colour</strong><div class="month-strip" aria-label="Flowering months not yet verified">'+months+'</div><p>No reviewed flowering data; no months are highlighted.</p></div></div><p><strong>Potential zone:</strong> Not assessed. Confirmed site zones: '+esc(state.zones.map(z=>z.name).join(', '))+'.</p><p><strong>Ecological role, soil and light fit, mature size:</strong> Not reviewed in this dataset.</p><p><strong>Hazards, edible parts and compatibility:</strong> Unknown. Do not use for public-contact or harvesting decisions without specialist checks.</p><p><strong>Evidence:</strong> Taxonomic identity only. '+source+'. <span class="data-unknown">Case-plan use does not establish Dutch nativeness or site suitability.</span></p></div></div>';
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
  const zones=screeningZones(),screened=recommender.screen(zones,p),rules=recommender.activePolicies(p);
  field('paletteGate').innerHTML='<strong>'+esc(rules.length?'Project rules: '+rules.join(' · '):'Native plants first')+'</strong><span>Approved design rules guide the concept. Name-only records can be shortlisted but cannot be automatically placed.</span>';
  field('paletteSummary').innerHTML='<strong>'+manual+' candidates for this site</strong><br>Project: '+esc(p.type)+' · '+esc(typeof p.area==='number'?Math.round(p.area).toLocaleString('en-GB'):p.area)+' m² · '+esc(state.zones.length)+' profile zone'+(state.zones.length===1?'':'s')+'. Project rules: '+esc(['Native plants first',...rules].join(' · '))+'. Mode: '+esc(composition.mode.label)+'. Palette role counts: '+esc(composition.roleText||'not yet assigned')+'. Counts describe plants, not planting area or quantities.';
  field('paletteGroups').innerHTML=inventoryPaletteHtml(screened)+groupOrder.map(group=>{
    const items=state.selected.filter(x=>x.group===group);
    const emptyReason=group==='Trees'&&state.zones.every(z=>z.conditions?.disturbance==='high')?'All eight operational trees list low disturbance tolerance, while these zones are marked high. Recheck disturbance only if site evidence supports a different level.':'No eligible selection for this layer. Change the conditions or add a plant for review.';
    return '<section class="palette-group"><h3>'+esc(group)+'<span>'+items.length+'</span></h3>'+(items.length?items.map(cardHtml).join(''):'<p class="empty-group">'+esc(emptyReason)+'</p>')+'</section>';
  }).join('')+'<section class="palette-extras">'+candidateCards.hiddenHtml(screened.hidden)+
    '<label class="example-toggle"><input type="checkbox" id="showExamples"'+(state.showExamples?' checked':'')+'> Show missing-information examples</label>'+
    (state.showExamples?'<p class="example-intro">Ten copies of plants above with information deliberately removed. They show what the system does when data is missing. They stay out of your selection unless you choose Add anyway.</p><section class="palette-group example-group"><h3>Missing-information examples<span>10</span></h3>'+recommender.showcase(zones,p).map(item=>candidateCards.cardHtml(item,{removable:false,selected:p.overrideIds.includes(item.id)})).join('')+'</section>':'')+'</section>';
  $$('[data-remove-plant]').forEach(button=>button.addEventListener('click',()=>{
    const index=state.selected.findIndex(p=>p.id===button.dataset.removePlant);if(index<0)return;
    const p=state.selected.splice(index,1)[0];state.removed.push(p);state.log.push('Removed '+p.name);invalidateFrom(4);renderPalette();
    field('undoPlant')?.focus();
  }));
  $$('[data-expand]').forEach(button=>button.addEventListener('click',()=>candidateCards.toggle(button)));
  $$('[data-source-toggle]').forEach(button=>button.addEventListener('click',()=>candidateCards.toggleSource(button)));
  field('showExamples').addEventListener('change',event=>{state.showExamples=event.target.checked;renderPalette();field('showExamples').focus();});
  $$('[data-override-plant]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.overridePlant;if(state.selected.some(p=>p.id===id))return;
    const item=overrideItem(id);if(!item?.recommendation.override.active)return;
    state.selected.push(item);state.log.push('Added '+item.name+' anyway (information missing)');invalidateFrom(4);renderPalette();
    document.querySelector('.example-group [data-candidate="'+id+'"] [data-expand]')?.focus();
  }));
  field('paletteChangeLog').innerHTML=state.log.length?esc(state.log.slice(-3).join(' · '))+(state.removed.length?' <button type="button" id="undoPlant">Undo removal</button>':''):'';
  if(field('undoPlant'))field('undoPlant').addEventListener('click',()=>{
    const p=state.removed.pop();if(!p)return;state.selected.push(p);state.log.push('Restored '+p.name);invalidateFrom(4);renderPalette();
    document.querySelector('#paletteGroups [data-candidate="'+p.id+'"] [data-expand]')?.focus();
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
    ['Name catalogue version',DATASET_VERSION],['Operational dataset and scoring version',suitability.version],['Design rule version',RULE_VERSION],['Exported on',new Date().toISOString()],
    ['Map area (nearest demo location)',s.location],['Area m2',p.area],
    ['Project type',p.type],['Audience',p.audience],['Maintenance capacity',p.maintenance],['Priorities',p.priorities.join('; ')],
    ['Spatial character',p.character],['Composition mode',compositionModeRecord().label],['Composition rule version',RULE_VERSION],['Public access',p.publicAccess],['Public harvesting',p.publicHarvest],['Preserve open views',p.sightlines],['Rewilding native-only policy',p.rewilding],['Seasonal anchor colours',p.anchorColours.join('; ')],
    ['Project notes',p.notes],['Site description',s.description],
    ['Recommendation status','Project demonstration: complete operational values (sourced, inferred or synthetic, see origin column); all records production_eligible=false'],
    ['Plot boundary','Prototype outline with '+state.plotBoundary.length+' corners; not cadastral'],
    ['Unresolved checks','Local occurrence; native status; site traits; hazards; provenance; density; source licences'],
    [],['ZONE CONTEXT'],['Zone','Soil','Moisture','Hydrology','Light','Canopy','Disturbance','Hardscape','Water edge','Confirmation source','Evidence note']
  ];
  state.zones.forEach(z=>{const c=z.conditions||defaultConditions();rows.push([z.name,c.soil,c.moisture,c.hydrology,c.light,c.canopy,c.disturbance,c.hardscape,c.waterEdge,c.source,c.note]);});
  rows.push([],['WORKING SELECTION — SIMULATED, NOT SITE RECOMMENDATIONS'],['Fixture ID','Plant ID','Category','Dutch name','Latin name','Zone','Fit','Why','Main constraint','Active project rules','Site fit score (internal)','Demo value origins','Demo fill rules','v0.3 reference class','Raw score','Capped score','Evidence confidence','Hard gates requiring review or exclusion','Warnings','Field origins','Production eligible','Height m','Spread m','SPACE-01 pilot spacing m','Role','Native status','Invasive status','Public contact status']);
  state.selected.forEach(item=>{const e=item.evaluation,r=item.recommendation;rows.push([item.id,item.plant_id||'',item.group,item.name,item.latin,item.zone||'',r?(r.label+(r.override.active?' (added anyway by designer; information missing)':'')):'unassessed',r?.summary.text||'',r?.constraint?r.constraint.label+': '+r.constraint.text:'',r?r.project.policies.map(x=>x.label).join('; '):'',r?.site.score??'',item.demoValueOrigins?JSON.stringify(item.demoValueOrigins):'',item.demoFillRules?JSON.stringify(item.demoFillRules):'',e?.eligibility_state||'unassessed',e?.raw_suitability_score||'',e?.final_suitability_score||'',e?.evidence_confidence_score||'',e?.hard_gate_results.filter(g=>g.state!=='passed').map(g=>g.gate_id+': '+g.state).join('; ')||'',e?.warnings.map(w=>w.message).join('; ')||'',item.fieldOrigins?JSON.stringify(item.fieldOrigins):'',item.productionEligible===false?'false':'unknown',item.height||'',item.spread||'',item.spacing||'',compositionRoleFor(item),item.nativeStatus||'unknown',item.invasiveStatus||'unknown',item.safetyStatus||'unknown']);});
  rows.push([],['APPLIED RULES AND EVIDENCE'],['Rule ID','Rule','Status','Evidence URLs']);
  window.PLANTSCAPES_RULEBOOK.rules.forEach(rule=>rows.push([rule.id,rule.name,rule.status,rule.sources.map(id=>window.PLANTSCAPES_RULEBOOK.source_registry[id]).join('; ')]));
  if(state.generated&&!state.planDirty){rows.push([],['DRAFT PLAN DECISIONS — SYNTHETIC'],['Plant','Zone','Quantity','Spacing m','Rules','Reason']);planPlantKey().forEach(entry=>{const placed=state.placements.filter(x=>x.plantId===entry.plant.id),first=placed[0];rows.push([entry.plant.latin,first?.zone||'',quantityForPlant(entry.plant.id),first?.spacing||'',first?.ruleTrace?.join('; ')||'',first?.reason||'']);});}
  if(state.planAudit?.communities&&!state.planDirty){rows.push([],['COMMUNITY RECIPES — ESTIMATED, SYNTHETIC'],['Community','Zone','Band','Estimated area m2','Density plants/m2','Species','Percentage of plant counts','Estimated quantity','Area method']);state.planAudit.communities.forEach(c=>c.rows.forEach(r=>rows.push([c.id,c.zone,c.band,c.area,c.density,r.plant.latin,r.percentage,r.count,state.planAudit.areaMethod])));}
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
function constrainPlanPoint(point){
  const boundary=state.plotBoundary;
  if(boundary.length<3||pointInPolygon(point,boundary))return point;
  let nearest=boundary[0],shortest=Infinity;
  boundary.forEach((a,index)=>{
    const b=boundary[(index+1)%boundary.length],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
    const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(length||1)));
    const candidate=[a[0]+t*dx,a[1]+t*dy],distance=(point[0]-candidate[0])**2+(point[1]-candidate[1])**2;
    if(distance<shortest){nearest=candidate;shortest=distance;}
  });
  return nearest;
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
function generationBlocked(message,tool){
  field('generationStatus').textContent=message;
  if(tool)setTool(tool);
  alert(message);
  field('mapInstruction').scrollIntoView({block:'center',behavior:'instant'});
}
function generatePlan(options={}){
  if(state.draft.length){generationBlocked('Your current '+(toolLabels[state.tool]||'shape').toLowerCase()+' is not saved yet. Choose Finish shape below the map before generating. Your points have been kept.');return;}
  if(state.plotBoundary.length<3){field('generationStatus').textContent='Draw and save the plot boundary in step 2 first.';return;}
  if(state.plotBoundary.some(p=>Math.abs(p[0])>90||Math.abs(p[1])>180)){field('generationStatus').textContent='Use the geographic map for a scaled planting plan. The fallback board has no metre scale.';return;}
  const beds=state.sketches.filter(s=>s.type==='planting'&&s.points.length>=3);
  const paths=state.sketches.filter(s=>s.type==='path'&&s.points.length>=2);
  if(!beds.length){generationBlocked('No saved planting area yet. Planting area is now selected: click at least three corners on the map, then choose Finish shape. After that, click Generate concept again.','planting');return;}
  if(state.generated&&!options.skipConfirmation&&!confirm('Regenerate the concept? Current individual plant edits will be replaced.'))return;
  const origin=[state.plotBoundary.reduce((s,p)=>s+p[0],0)/state.plotBoundary.length,state.plotBoundary.reduce((s,p)=>s+p[1],0)/state.plotBoundary.length];
  const result=engine.generate({
    boundary:localMetricPolygon(state.plotBoundary,origin),
    beds:beds.map(b=>({polygon:localMetricPolygon(b.points,origin),zoneId:b.zoneId||state.zones[0].id})),
    paths:paths.map(s=>s.points.map(p=>latLngToMetric(p,origin))),
    waterBeds:state.sketches.filter(s=>s.type==='water'&&s.points.length>=3).map(s=>({polygon:localMetricPolygon(s.points,origin),zoneId:s.zoneId||state.zones[0].id})),
    exclusions:state.sketches.filter(s=>['open'].includes(s.type)&&s.points.length>=3).map(s=>localMetricPolygon(s.points,origin)),
    plants:state.selected,project:project(),zones:state.zones,mode:selectedCompositionMode(),
    mix:{matrix:Number(field('mixMatrix').value),flowers:Number(field('mixFlowers').value),structure:Number(field('mixStructure').value)},
    pathWidth:PATH_WIDTH,recipes:state.recipeOverrides||{}
  });
  if(result.error){generationBlocked(result.error);return;}
  if(!result.placements.length){generationBlocked('No compatible planting positions were found. Check that planting areas are inside the plot, do not overlap open ground, and match the selected plants and site conditions.');return;}
  state.placements=result.placements.map((p,i)=>({...makePlacement(i,state.selected.find(q=>q.id===p.plantId),p.xy,origin,result.bounds,selectedCompositionMode(),p.tree),...p}));
  state.selectedPlacement=null;state.generated=true;state.planDirty=false;state.planRevision++;state.planUndo=[];
  state.planAudit={...result,origin};
  field('stage7').classList.remove('plan-area-editing');
  setTool('pan');
  buildPlantingMasses(origin,result.bounds,result.valid);
  field('generatePlan').textContent='Regenerate concept';
  field('downloadPlanSvg').disabled=false;field('downloadViewSvg').disabled=false;
  clearPlanPlacementIssue();
  const count=state.placements.length,used=new Set(Object.entries(result.quantities||{}).filter(([,quantity])=>quantity>0).map(([id])=>id));
  field('generationStatus').textContent=Number(result.totalQuantity||count).toLocaleString()+' estimated plants · '+used.size+' species';
  renderPlantingCoverage();renderPlacements();renderSymbolEditor();renderVisualization();renderPlanRules();window.PlantscapesAI?.onPlan();
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
  const status=state.planDirty?'Spaces changed; regeneration needed':state.generated?'Concept ready for review':'Draw planting areas; paths are optional';
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
  panel.innerHTML='<div class="rule-review-head"><h3>Design review</h3><span>'+esc(status)+'</span></div><p>'+pathCount+' path'+(pathCount===1?'':'s')+' · '+bedCount+' planting zone'+(bedCount===1?'':'s')+' · v0.3 demonstration only; all records not production eligible</p>'+structuralNote+(state.generated?'<div class="season-review">'+seasonal+'</div>':'')+'<details><summary>Checks for the architect and municipality</summary><ul>'+issues.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul></details><details><summary>Why plants were not placed</summary>'+(audit?.decisions?.length?'<ul>'+audit.decisions.map(d=>'<li>'+esc(state.selected.find(x=>x.id===d.plantId)?.name||d.plantId)+': '+esc(d.reason)+' <small>'+esc(d.rules.join(', '))+'</small></li>').join('')+'</ul>':'<p>Generate a concept to see placement decisions.</p>')+'</details><details><summary>Rules and sources</summary><p>Path edge → transition → interior. SPACE-01 pilot spacing is synthetic. Trees need actual crown space. No species quota.</p><a href="data/planting-plan-rules.v0.1.json" download>Download the applied rulebook</a></details>';
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
    state.sketches.forEach(item=>{if(item.layer?.bringToFront)item.layer.bringToFront();else item.layer?.eachLayer?.(layer=>layer.bringToFront?.());});
    return;
  }
  renderFallbackSketch();
}
function quantityForPlant(id){
  if(!state.planAudit?.communityMode)return state.placements.filter(p=>p.plantId===id).length;
  const plant=state.selected.find(p=>p.id===id);
  if(plant?.group==='Trees')return state.placements.filter(p=>p.plantId===id&&p.tree).length;
  return (state.planAudit.quantities[id]||0)+state.placements.filter(p=>p.plantId===id&&p.manual).length;
}
function plantForPlacement(item){return state.selected.find(p=>p.id===item.plantId)||null;}
function planPlantKey(){
  const seen=new Set(),plants=[];
  state.placements.forEach(item=>{const plant=plantForPlacement(item);if(plant&&!seen.has(plant.id)){seen.add(plant.id);plants.push(plant);}});
  state.planAudit?.communities?.forEach(c=>c.rows.forEach(r=>{const plant=state.selected.find(p=>p.id===r.plantId);if(plant&&r.count>0&&!seen.has(plant.id)){seen.add(plant.id);plants.push(plant);}}));
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
    state.planMasses.forEach(mass=>{const p=state.selected.find(plant=>plant.id===mass.plantId);if(!p)return;const entry=key.get(p.id),colour=entry?.colour||'#536d59';const layer=L.polygon(mass.polygon,{color:colour,weight:.6,fillColor:colour,fillOpacity:.18,interactive:true}).addTo(state.map).bindTooltip(String(entry?.index||0).padStart(2,'0')+' · '+p.name+' · '+mass.count+' preview samples in this hatch');layer.on('click',event=>{L.DomEvent.stopPropagation(event);if(state.tool==='selectPlant')selectPlacement(mass.first.id);});applyMassHatch(layer,colour,entry?.index||0);state.placementLayers.push(layer);});
    state.placements.filter(item=>item.tree||item.accent).forEach(item=>{const p=plantForPlacement(item);if(!p)return;
      const entry=key.get(p.id),selected=item.id===state.selectedPlacement,dragging=item.id===state.draggingPlacement,colour=entry?.colour||'#536d59';
      const marker=L.circleMarker(item.point,{radius:item.tree?6.2:selected?4.8:p.group==='Shrubs'?3.8:2.8,color:item.tree||p.group==='Shrubs'?'#263b2d':'#fff',weight:item.tree?1.8:1,opacity:dragging?0:1,fillColor:colour,fillOpacity:dragging?0:.92}).addTo(state.map).bindTooltip(String(entry?.index||0).padStart(2,'0')+' · '+p.name+(item.tree?' · illustrative tree':' · illustrative planting position'));
      marker.on('click',event=>{L.DomEvent.stopPropagation(event);if(state.tool==='selectPlant')selectPlacement(item.id);});
      marker.on('mousedown',event=>{
        if(state.tool!=='selectPlant')return;
        L.DomEvent.stopPropagation(event);
        state.selectedPlacement=item.id;state.draggingPlacement=item.id;
        state.map.dragging.disable();renderPlacements();renderSymbolEditor();updateMovePreview(item.point);
        const dragPoint=mouseEvent=>{
          if(!state.draggingPlacement)return;
          const point=state.map.mouseEventToLatLng(mouseEvent);
          updateMovePreview(constrainPlanPoint([point.lat,point.lng]));
        };
        const dropPlant=mouseEvent=>{
          document.removeEventListener('mousemove',dragPoint);
          document.removeEventListener('mouseup',dropPlant);
          if(!state.draggingPlacement)return;
          const point=state.map.mouseEventToLatLng(mouseEvent);
          state.draggingPlacement=null;
          moveSelectedSymbol(constrainPlanPoint([point.lat,point.lng]),true);
        };
        document.addEventListener('mousemove',dragPoint);
        document.addEventListener('mouseup',dropPlant);
      });
      state.placementLayers.push(marker);
      if(item.tree){const radius=item.spread/2;if(radius>0){const buffer=L.circle(item.point,{radius,color:'#765c3a',weight:1,dashArray:'3 4',fillColor:'#d5b58b',fillOpacity:.13,interactive:false}).addTo(state.map);state.placementLayers.push(buffer);}}
    });
    const largest=new Map();state.planMasses.forEach(m=>{if(!largest.has(m.plantId)||largest.get(m.plantId).count<m.count)largest.set(m.plantId,m);});
    largest.forEach(m=>{const centre=m.polygon.reduce((p,q)=>[p[0]+q[0]/4,p[1]+q[1]/4],[0,0]);const label=L.tooltip({permanent:true,direction:'center',className:'taxon-code'}).setLatLng(centre).setContent(String(key.get(m.plantId)?.index||'')).addTo(state.map);state.placementLayers.push(label);});
    const selected=state.placements.find(item=>item.id===state.selectedPlacement);
    if(selected?.point&&!state.draggingPlacement){state.placementLayers.push(L.circleMarker(selected.point,{radius:selected.tree?13:10,color:'#c8e85a',weight:3,fill:false,interactive:false}).addTo(state.map));}
    (state.planAudit?.visibility||[]).forEach(prompt=>{const marker=L.circleMarker(metricToLatLng(prompt.xy,state.planAudit.origin),{radius:7,color:'#a45d20',weight:2,dashArray:'3 3',fillColor:'#fff0c8',fillOpacity:.6}).addTo(state.map).bindTooltip(prompt.reason+' Review marker; not a calculated safe sightline.');state.placementLayers.push(marker);});
  }else renderFallbackSketch();
  renderPlacementList();
}
function renderPlacementList(){
  field('symbolCount').textContent=planPlantKey().length;
  if(state.generated){const counts={matrix:0,flowers:0,structure:0};planPlantKey().filter(k=>k.plant.group!=='Trees').forEach(k=>{const role=k.plant.group==='Grasses, sedges & rushes'?'matrix':k.plant.group==='Shrubs'||k.plant.height>=1.3?'structure':'flowers';counts[role]+=quantityForPlant(k.plant.id);});const total=Object.values(counts).reduce((n,q)=>n+q,0);field('mixReport').textContent='Estimated non-tree quantities: '+Object.entries(counts).map(([k,n])=>k+' '+Math.round(n/Math.max(1,total)*100)+'%').join(' · ')+'. Site fit and community recipes override global weights.';}
  field('planNotation').innerHTML=PlantscapesGraphics.notation;
  const grouped=new Map();state.placements.forEach(item=>{const p=plantForPlacement(item);if(!p)return;const record=grouped.get(p.id)||{plant:p,count:0,first:item};record.count++;grouped.set(p.id,record);});
  const key=new Map(planPlantKey().map(entry=>[entry.plant.id,entry]));
  planPlantKey().forEach(entry=>{const record=grouped.get(entry.plant.id)||{plant:entry.plant,first:null};record.count=quantityForPlant(entry.plant.id);grouped.set(entry.plant.id,record);});
  field('placementList').innerHTML=grouped.size?Array.from(grouped.values()).map(({plant,count,first})=>{const item=state.placements.find(x=>x.plantId===plant.id),entry=key.get(plant.id),isSelected=item&&state.selectedPlacement===item.id,massCount=state.planMasses.filter(mass=>mass.plantId===plant.id).length,tag=item?'button':'div',selectAttr=item?' type="button" data-select-symbol="'+esc(item.id)+'"':'';return '<'+tag+selectAttr+' class="placement-item'+(isSelected?' active':'')+'"><span class="taxon-swatch">'+PlantscapesGraphics.swatch(entry)+'<b>'+entry.index+'</b></span><span>'+esc(plant.name)+'<small>'+count.toLocaleString()+' plants · '+massCount+' hatch masses · '+esc(plant.group||'unclassified')+(item?'':' · mass only')+'</small></span></'+tag+'>';}).join(''):'No positions yet.';
  $$('[data-select-symbol]').forEach(button=>button.addEventListener('click',()=>selectPlacement(button.dataset.selectSymbol)));
  const used=new Set(planPlantKey().map(k=>k.plant.id)),unplaced=state.generated?state.selected.filter(p=>!used.has(p.id)):[];
  field('unplacedCount').textContent=unplaced.length;
  field('unplacedList').innerHTML=state.generated?(unplaced.length?unplaced.map(p=>'<div class="unplaced-item">'+esc(p.name)+' <small>'+esc(p.group)+(p.recommendation?.override.active&&!p.recommendation.placeable?' · added anyway; size unknown, so it cannot be placed':'')+'</small></div>').join(''):'Every selected demo taxon is represented.'):'Generate a plan to compare the palette.';
}
function checkPlanEdit(plant,point,ignoreId){
  if(state.planDirty)return 'Regenerate after changing paths or zones.';
  const eligible=engine.eligibility(plant,project());if(!eligible.eligible)return eligible.reason;
  const xy=latLngToMetric(point,state.planAudit.origin);
  if(!state.planAudit.valid(xy))return 'Keep the plant in its planting or water zone, outside paths and open ground.';
  const bed=state.planAudit.bedFor(xy),zone=state.zones.find(z=>String(z.id)===String(bed.zoneId));
  const xs=bed.polygon.map(q=>q[0]),ys=bed.polygon.map(q=>q[1]),d=state.planAudit.pathDistance(xy);
  const geometry={available_width_m:Math.max(...xs)-Math.min(...xs),available_length_m:Math.max(...ys)-Math.min(...ys),plantable_area_m2:engine.area(bed.polygon),max_plant_height_m:d<engine.config.edgeDepth?engine.config.edgeHeight:zone.conditions?.max_plant_height_m};
  const fit=engine.zoneFit(plant,{...zone,conditions:{...zone.conditions,path_edge:d<engine.config.edgeDepth?'yes':'no'},geometry},project());if(!fit.fit)return fit.reason;
  if(!state.planAudit.aquaticFit(plant,xy))return 'Aquatic / marginal plants need the water or shoreline; terrestrial plants cannot go in water.';
  if(plant.group==='Aquatic & marginal plants'&&state.planAudit.waterFor(xy)&&state.planAudit.shoreDistance(xy)>1.2)return 'These marginal fixtures need the assumed 1.2 m shoreline, not deep open water.';
  if(d<engine.config.edgeDepth&&(plant.height>engine.config.edgeHeight||plant.thorns==='unknown'||plant.thorny))return 'This path edge requires lower planting and resolved thorn evidence.';
  if(plant.group==='Trees'){
    const r=plant.spread/2;
    if(!Array.from({length:12},(_,n)=>[xy[0]+r*Math.cos(n*Math.PI/6),xy[1]+r*Math.sin(n*Math.PI/6)]).every(q=>state.planAudit.valid(q)&&!state.planAudit.waterFor(q)))return 'The mature tree crown does not fit the available planting space.';
  }
  if(state.placements.some(q=>(plant.group!=='Trees'||q.tree)&&!q.preview&&q.id!==ignoreId&&Math.hypot(q.xy[0]-xy[0],q.xy[1]-xy[1])<(q.tree?Math.max(.75,q.spread*.12):(q.spacing+plant.spacing)/2)))return 'This position is too close to another structural plant for the draft spacing. Choose a different position or smaller plant.';
  return '';
}
function reportPlanPlacementIssue(error,heading='Plant not added'){
  const detail=error==='This path edge requires lower planting and resolved thorn evidence.'?'This point is too close to a path for the chosen plant. Choose a lower, non-thorny species or place it farther from the path.':error.startsWith('Keep the plant')?'Choose a point inside a planting or water area and outside paths and open ground.':error.startsWith('This position is too close')?'Choose a position farther from the nearby structural plant, or select a smaller plant.':error;
  field('generationStatus').textContent=detail;
  const notice=field('planActionAlert');if(!notice)return;
  notice.innerHTML='<strong>'+esc(heading)+'</strong><span>'+esc(detail)+'</span>';
  notice.hidden=false;notice.focus({preventScroll:true});
}
function clearPlanPlacementIssue(){const notice=field('planActionAlert');if(notice)notice.hidden=true;}
function savePlanUndo(){state.planUndo.push(state.placements.map(p=>({...p,point:p.point.slice(),xy:p.xy.slice()})));if(state.planUndo.length>20)state.planUndo.shift();}
function refreshAfterPlanEdit(message){
  if(state.planAudit)buildPlantingMasses(state.planAudit.origin,state.planAudit.bounds,state.planAudit.valid);
  renderPlacements();renderSymbolEditor();renderVisualization();renderPlanRules();window.PlantscapesAI?.refresh();
  field('generationStatus').textContent=message;
}
function undoPlanEdit(){
  if(!state.planUndo.length)return;
  state.placements=state.planUndo.pop();state.selectedPlacement=null;refreshAfterPlanEdit('Previous individual plant edit restored.');
}
function renderSymbolEditor(){
  const box=field('selectedSymbol'),item=state.placements.find(x=>x.id===state.selectedPlacement);
  const addField=field('symbolSpecies').closest('label'),help=field('symbolHelp'),mode=field('plantToolMode'),actions=field('plantToolActions'),undo=field('undoPlanEdit'),bar=field('mapSelectionBar'),count=field('selectedPlantCount');
  addField.hidden=false;help.hidden=!!item;mode.textContent=item?'Edit selected plant':'Add plant';undo.hidden=!state.planUndo.length;actions.replaceChildren();
  if(!item){box.hidden=true;box.innerHTML='';if(bar)bar.hidden=true;return;}
  box.hidden=false;
  if(bar)bar.hidden=state.tool!=='selectPlant';if(count)count.textContent='1 plant selected';
  if(item.preview){
    const community=state.planAudit.communities.find(c=>c.id===item.communityId);
    box.innerHTML='<strong>Selected mix: '+esc(plantForPlacement(item)?.name||'Plant')+'</strong>';
    actions.innerHTML='<label class="toolbar-species"><span>plant type:</span><select id="replaceMixSpecies">'+(community?.eligible||[]).map(p=>'<option value="'+esc(p.id)+'"'+(p.id===item.plantId?' selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label><button id="closePlantSelection" type="button" class="map-selection-remove" aria-label="Close plant editing" title="Return to Add plants">×</button>';
    field('replaceMixSpecies').onchange=e=>PlantscapesAI.changeCommunity(item.communityId,item.plantId,e.target.value);
    field('closePlantSelection').onclick=()=>{state.selectedPlacement=null;clearMovePreview();setTool('symbol');};return;
  }
  const plant=plantForPlacement(item),options=state.selected.filter(p=>p.id===item.plantId||!checkPlanEdit(engine.enrich(p),item.point,item.id)).map(p=>'<option value="'+esc(p.id)+'"'+(p.id===item.plantId?' selected':'')+'>'+esc(p.name)+'</option>').join('');
  box.innerHTML='<strong>Selected plant: '+esc(plant?.name||'Plant')+'</strong>';
  actions.innerHTML='<label class="toolbar-species"><span>plant type:</span><select id="editSymbolSpecies">'+options+'</select></label><button id="closePlantSelection" type="button" class="map-selection-remove" aria-label="Close plant editing" title="Return to Add plants">×</button>';
  field('editSymbolSpecies').addEventListener('change',event=>{
    const next=engine.enrich(state.selected.find(p=>p.id===event.target.value)),error=checkPlanEdit(next,item.point,item.id);
    if(error){renderSymbolEditor();const feedback=document.createElement('p');feedback.className='edit-error';feedback.setAttribute('role','alert');feedback.textContent=error;box.append(feedback);return;}
    savePlanUndo();Object.assign(item,{plantId:next.id,spread:next.spread,spacing:next.spacing,height:next.height,tree:next.group==='Trees',reason:'Species changed by designer; zone, path edge and spacing rechecked.',ruleTrace:['G04','G05','S01','S02','D01','D03']});refreshAfterPlanEdit('Species changed; placement checks passed.');
  });
  field('closePlantSelection').addEventListener('click',()=>{state.selectedPlacement=null;clearMovePreview();setTool('symbol');});
}
function moveSelectedSymbol(point,keepEditing=false){
  const item=state.placements.find(x=>x.id===state.selectedPlacement);if(!item)return;
  const error=checkPlanEdit(engine.enrich(plantForPlacement(item)),point,item.id);if(error){reportPlanPlacementIssue(error,'Plant not moved');return;}
  savePlanUndo();const b=planBounds();item.point=point;item.nx=(point[1]-b.minB)/Math.max(.000001,b.maxB-b.minB);item.ny=(point[0]-b.minA)/Math.max(.000001,b.maxA-b.minA);item.xy=latLngToMetric(point,state.planAudit.origin);item.reason='Moved by designer; zone, path edge and spacing rechecked.';refreshAfterPlanEdit('Plant moved. View updated and undo is available.');setTool(keepEditing?'selectPlant':'pan');
}
function clearMovePreview(){
  if(state.movePreviewLayer&&state.map)state.map.removeLayer(state.movePreviewLayer);
  state.movePreviewLayer=null;
}
function updateMovePreview(point){
  if(!state.map||(state.tool!=='moveSymbol'&&!state.draggingPlacement)){clearMovePreview();return;}
  const item=state.placements.find(entry=>entry.id===state.selectedPlacement),plant=item&&plantForPlacement(item);
  if(!item||!plant){clearMovePreview();return;}
  const entry=planPlantKey().find(key=>key.plant.id===plant.id),colour=entry?.colour||'#536d59',style={radius:item.tree?14:12,color:'#c8e85a',weight:3,dashArray:'3 2',fillColor:colour,fillOpacity:1,interactive:false};
  if(state.movePreviewLayer)state.movePreviewLayer.setLatLng(point);else state.movePreviewLayer=L.circleMarker(point,style).addTo(state.map);
}
function addPlantSymbol(point){
  if(!state.generated){reportPlanPlacementIssue('Generate a concept before adding an individual plant.');return;}
  const plant=engine.enrich(state.selected.find(p=>p.id===field('symbolSpecies').value));if(!plant)return;
  const error=checkPlanEdit(plant,point);if(error){reportPlanPlacementIssue(error);return;}
  savePlanUndo();const xy=latLngToMetric(point,state.planAudit.origin),item=makePlacement(Date.now(),plant,xy,state.planAudit.origin,state.planAudit.bounds,selectedCompositionMode(),plant.group==='Trees');
  Object.assign(item,{manual:true,xy,spacing:plant.spacing,spread:plant.spread,height:plant.height,accent:true,reason:'Added by designer; eligibility, zone, path edge and spacing checked.',ruleTrace:['G04','G05','S01','S02','D01','D03'],evidenceStatus:plant.demo?'synthetic_demo':'reviewed'});
  state.placements.push(item);state.selectedPlacement=item.id;clearPlanPlacementIssue();refreshAfterPlanEdit('Plant added. View updated and undo is available.');
}
function renderVisualization(){
  updatePlanRefinementControls();
  const canvas=field('visualCanvas');
  if(!state.generated||state.planDirty){window.PlantscapesAI?.refresh();canvas.innerHTML='<div class="visual-empty">'+(state.planDirty?'Regenerate the concept after changing the spaces.':'Draw your paths and planting zones, then generate a concept to see the view.')+'</div>';return;}
  const season=field('viewSeason').value,age=Number(field('viewAge').value),direction=field('viewDirection').value,origin=state.planAudit.origin;
  const result=PlantscapesGraphics.elevated({
    boundary:localMetricPolygon(state.plotBoundary,origin),
    sketches:state.sketches.map(s=>({...s,points:s.points.map(p=>latLngToMetric(p,origin))})),
    placements:window.PlantscapesDenseView?PlantscapesDenseView():state.placements,plants:state.selected,
    masses:state.planMasses.map(m=>({...m,polygon:localMetricPolygon(m.polygon,origin)})),
    keys:planPlantKey(),season,age,direction,angle:field('viewAngle').value,camera:currentCamera(),pathWidth:PATH_WIDTH,colours:colourHex
  });
  canvas.innerHTML=result.svg;
  const viewport=canvas.querySelector('svg');viewport.querySelectorAll('g[font-family]').forEach(el=>el.remove());viewport.setAttribute('viewBox','0 75 900 415');
  window.PlantscapesAI?.refresh();
  canvas.setAttribute('aria-label',field('viewAngle').value==='path'?'Eye-level perspective from the selected path position towards the selected highlight.':'Mock view showing actual paths, open ground, water and relative planting heights.');
  field('visualCaption').textContent='Woody plants and '+result.sample+' symbols from '+state.placements.length+' positions. Grass tufts, flowering and seedheads use group-level seasonal fixtures, not botanical predictions.';
}
function updatePlanRefinementControls(){
  const ready=state.generated&&!state.planDirty,stage=field('stage7');
  stage.classList.toggle('plan-generated',ready);
  const tools=stage.querySelector('.plant-tools'),addPlant=stage.querySelector('[data-tool="symbol"]'),selectPlant=stage.querySelector('[data-tool="selectPlant"]');
  tools.hidden=!ready;addPlant.hidden=!ready;if(selectPlant)selectPlant.hidden=!ready;
  const editAreas=field('editPlanAreas');
  if(editAreas){editAreas.hidden=!ready;if(!ready){stage.classList.remove('plan-area-editing');editAreas.textContent='Edit areas';}else editAreas.textContent=stage.classList.contains('plan-area-editing')?'View concept':'Edit areas';}
  const mappingAreas=!ready||stage.classList.contains('plan-area-editing'),phase=field('planPhaseIndicator'),speciesField=field('mapSpeciesField'),generate=field('generatePlan');
  if(phase)phase.textContent=mappingAreas?'1 · Map areas':'2 · Refine planting';
  if(speciesField)speciesField.hidden=mappingAreas;
  if(generate){generate.hidden=!mappingAreas;generate.textContent=state.generated?'Regenerate concept':'Generate concept';}
  const mapStepOne=field('mapStepOne'),mapStepTwo=field('mapStepTwo'),mapAction=field('mapPhaseAction'),download=field('downloadPlanSvg');
  if(mapStepOne){mapStepOne.classList.toggle('active',mappingAreas);mapStepOne.disabled=!state.generated&&!mappingAreas;}
  if(mapStepTwo){mapStepTwo.classList.toggle('active',!mappingAreas);mapStepTwo.disabled=!ready;}
  if(mapAction){mapAction.classList.toggle('is-refine',!mappingAreas);mapAction.hidden=false;}
  if(download)download.hidden=mappingAreas;
  const viewRender=field('viewRenderSection'),viewRenderJump=field('viewRenderJump'),viewNotice=field('viewRenderNotice'),visual=field('visualPanel'),illustration=field('illustrationPanel');
  if(viewRender)viewRender.hidden=false;if(viewRenderJump)viewRenderJump.hidden=!ready;if(viewNotice)viewNotice.hidden=ready;if(visual)visual.hidden=!ready;if(illustration)illustration.hidden=!ready;
  if(!ready&&['symbol','moveSymbol'].includes(state.tool))setTool('pan');
  if(ready){
    tools.querySelector('h3').textContent='Plant tools';
    field('symbolHelp').textContent='Select a species, choose Add plant above the map, then click inside a planting area. This adds one individual plant.';
    const notes=tools.querySelectorAll('.side-note');
    if(notes[1])notes[1].textContent='Select a plant symbol or a species-key entry to inspect, move, replace or remove it.';
  }
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
  const camera=state.sketches.filter(s=>s.type==='camera').map(s=>'<rect x="'+(px(s.points[0])-5)+'" y="'+(py(s.points[0])-4)+'" width="10" height="8" fill="#183d32"/>'+(s.points[1]?'<line x1="'+px(s.points[0])+'" y1="'+py(s.points[0])+'" x2="'+px(s.points[1])+'" y2="'+py(s.points[1])+'" stroke="#183d32" stroke-width="2" stroke-dasharray="5 4"/><circle cx="'+px(s.points[1])+'" cy="'+py(s.points[1])+'" r="5" fill="none" stroke="#183d32"/>':'')).join('');
  const legend=key.map((k,i)=>{const x=50+(i%2)*410,y=744+Math.floor(i/2)*44,count=quantityForPlant(k.plant.id);return '<g><rect x="'+x+'" y="'+(y-15)+'" width="28" height="28" fill="url(#mass-'+k.index+')" stroke="'+k.colour+'"/><text x="'+(x+38)+'" y="'+y+'" font-size="12" font-weight="600">'+String(k.index).padStart(2,'0')+' · '+esc(k.plant.name)+' · '+count.toLocaleString()+'</text><text x="'+(x+38)+'" y="'+(y+16)+'" font-size="11" fill="#536657">'+esc(k.plant.latin)+' · '+esc(k.plant.group)+'</text></g>';}).join('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 '+height+'" width="900" height="'+height+'"><defs>'+patterns+'</defs><rect width="900" height="'+height+'" fill="#fbfcf7"/><g font-family="Segoe UI, Arial, sans-serif" fill="#183d32"><text x="50" y="43" font-size="25" font-weight="700">Plantscapes · concept planting plan</text><text x="50" y="67" font-size="12">MOCK DATA · diagram with consistent plan proportions · not construction documentation</text>'+beds+masses+sketch+symbols+labels+review+camera+'<polygon points="'+points(state.plotBoundary)+'" fill="none" stroke="#234638" stroke-dasharray="8 5" stroke-width="2"/><text x="825" y="100" font-size="14">↑ N</text><text x="50" y="590" font-size="17" font-weight="600">Symbols & spaces</text><circle cx="57" cy="614" r="5" fill="#71803a" stroke="#263b2d" stroke-width="2"/><text x="72" y="618" font-size="12">Tree centre</text><circle cx="230" cy="614" r="3.5" fill="#71803a" stroke="#263b2d"/><text x="244" y="618" font-size="12">Shrub centre</text><circle cx="415" cy="614" r="2.5" fill="#71803a" stroke="#fff"/><text x="428" y="618" font-size="12">Sample perennial</text><circle cx="645" cy="614" r="8" fill="none" stroke="#765c3a" stroke-dasharray="3 3"/><text x="660" y="618" font-size="12">Mature crown envelope</text><path d="M50 642h18" stroke="#9e724b" stroke-width="5"/><text x="76" y="646" font-size="12">Path</text><rect x="225" y="635" width="18" height="12" fill="#efe3ac"/><text x="250" y="646" font-size="12">Open ground</text><rect x="405" y="635" width="18" height="12" fill="#afd7dd"/><text x="430" y="646" font-size="12">Water</text><circle cx="645" cy="642" r="7" fill="none" stroke="#a45d20" stroke-dasharray="3 3"/><text x="660" y="646" font-size="12">Visibility review prompt</text><rect x="50" y="663" width="10" height="8" fill="#183d32"/><text x="76" y="674" font-size="12">Camera marker, if drawn</text><text x="50" y="700" font-size="12">Number + pattern identify taxa. Perennial dots are samples; quantities are estimated from community area and density.</text><text x="50" y="723" font-size="17" font-weight="600">Species key · quantities are individual plants</text>'+legend+'<text x="50" y="'+(height-22)+'" font-size="11">Verify species, spacing, soil, water depth, safety, access and root volume before use.</text></g></svg>';
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
  const netherlandsBounds=L.latLngBounds([[50.75,3.2],[53.65,7.3]]);
  state.siteMap=L.map('siteMap',{doubleClickZoom:false,scrollWheelZoom:false,touchZoom:true,zoomControl:true,zoomSnap:.25,zoomDelta:.25,zoomAnimation:true,fadeAnimation:true,maxBounds:netherlandsBounds,maxBoundsViscosity:1}).setView(place.center,15);
  state.siteMap.setMinZoom(state.siteMap.getBoundsZoom(netherlandsBounds,false));
  demoBasemap(state.siteMap);
  L.control.scale({position:'bottomright',metric:true,imperial:false,maxWidth:120}).addTo(state.siteMap);
  state.siteMap.dragging[state.plotMode==='draw'?'disable':'enable']();
  field('siteMap').classList.toggle('draw-mode',state.plotMode==='draw');
  field('plotPan').classList.toggle('active',state.plotMode==='pan');field('plotDraw').classList.toggle('active',state.plotMode==='draw');
  state.siteMap.on('click',event=>{if(state.plotMode!=='draw')return;if(shouldClosePlot(event.latlng)){finishPlot();return;}state.plotDraft.push([event.latlng.lat,event.latlng.lng]);drawPlot();});
  state.siteMap.on('mousemove',event=>updatePlotPreview(event.latlng));
  state.siteMap.on('mouseout',clearPlotPreview);
  let queuedZoom=0,zoomFrame=0,lastGestureAt=0,gesturePoint=null;
  const applyGestureZoom=()=>{
    zoomFrame=0;
    if(Math.abs(queuedZoom)<MAP_ZOOM_GESTURE.minimumDelta)return;
    const delta=Math.max(-MAP_ZOOM_GESTURE.maximumDelta,Math.min(MAP_ZOOM_GESTURE.maximumDelta,queuedZoom));
    queuedZoom-=delta;
    const next=Math.max(state.siteMap.getMinZoom(),Math.min(state.siteMap.getMaxZoom(),state.siteMap.getZoom()+delta));
    state.siteMap.setZoomAround(gesturePoint,next,{animate:false});
    if(Math.abs(queuedZoom)>=MAP_ZOOM_GESTURE.minimumDelta)zoomFrame=requestAnimationFrame(applyGestureZoom);
  };
  state.siteMap.getContainer().addEventListener('wheel',event=>{
    if(!event.ctrlKey)return;
    event.preventDefault();
    const unit=event.deltaMode===1?16:event.deltaMode===2?state.siteMap.getSize().y:1,pixels=event.deltaY*unit,now=performance.now();
    const elapsed=lastGestureAt?Math.max(8,Math.min(120,now-lastGestureAt)):16;
    lastGestureAt=now;
    const velocity=Math.abs(pixels)/elapsed;
    const acceleration=Math.min(MAP_ZOOM_GESTURE.maximumAcceleration,1+(MAP_ZOOM_GESTURE.maximumAcceleration-1)*Math.pow(velocity/MAP_ZOOM_GESTURE.velocityReference,MAP_ZOOM_GESTURE.accelerationCurve));
    queuedZoom-=pixels/MAP_ZOOM_GESTURE.pixelsPerZoomLevel*acceleration;
    gesturePoint=state.siteMap.mouseEventToContainerPoint(event);
    if(!zoomFrame)zoomFrame=requestAnimationFrame(applyGestureZoom);
  },{passive:false});
  if(state.plotBoundary.length)drawPlot();
  setTimeout(()=>state.siteMap.invalidateSize(),100);
}
function clearPlotPreview(){
  if(state.plotPreviewLayer&&state.siteMap)state.siteMap.removeLayer(state.plotPreviewLayer);
  state.plotPreviewLayer=null;
}
function shouldClosePlot(point){
  if(!state.siteMap||state.plotDraft.length<3)return false;
  return state.siteMap.latLngToContainerPoint(point).distanceTo(state.siteMap.latLngToContainerPoint(state.plotDraft[0]))<=PLOT_CLOSE_RADIUS_PX;
}
function shouldCloseSketch(point){
  if(!state.map||state.draft.length<3)return false;
  return state.map.latLngToContainerPoint(point).distanceTo(state.map.latLngToContainerPoint(state.draft[0]))<=PLOT_CLOSE_RADIUS_PX;
}
function updatePlotPreview(point){
  if(!state.siteMap||state.plotMode!=='draw'||!state.plotDraft.length){clearPlotPreview();return;}
  const segment=[state.plotDraft[state.plotDraft.length-1],point];
  if(state.plotPreviewLayer)state.plotPreviewLayer.setLatLngs(segment);
  else state.plotPreviewLayer=L.polyline(segment,{color:'#db7b46',weight:2,dashArray:'4 6',opacity:.72,interactive:false}).addTo(state.siteMap);
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
  field('plotStatus').textContent=state.plotMode==='draw'?(count?count+' corner'+(count===1?'':'s')+' placed · '+(count>=3?'click the first corner again or finish the boundary':'add '+(3-count)+' more')+' · Backspace or Delete undoes the last point':'Draw mode: click at least three corners; map panning is paused.'):state.plotBoundary.length?'Move mode: drag to navigate · use + or − to zoom · boundary saved with '+state.plotBoundary.length+' corners':'Move mode: drag to navigate · use + or − to zoom · choose Draw boundary when ready.';
  const area=metricPolygonArea(count>=3?state.plotDraft:state.plotBoundary);
  field('plotAreaReadout').textContent=Math.round(area||0).toLocaleString()+' m²';
  field('plotFinish').disabled=count<3;field('plotUndo').disabled=!count;field('plotClear').disabled=!count&&!state.plotBoundary.length;
}
/* A saved outline must enclose an area: corners not on one line, and no edges crossing each other. */
function outlineProblem(points){
  const poly=localMetricPolygon(points)||points,side=(a,b,c)=>Math.sign((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));
  const cross=(a,b,c,d)=>side(a,b,c)*side(a,b,d)<0&&side(c,d,a)*side(c,d,b)<0;
  if(poly.some((a,i)=>poly.some((c,j)=>j>i+1&&!(i===0&&j===poly.length-1)&&cross(a,poly[i+1],c,poly[(j+1)%poly.length]))))return 'The outline crosses itself. Undo the last corners and redraw it without crossing lines.';
  if(metricPolygonAreaFromXY(poly)<1)return 'The outline encloses almost no area. Place corners that are not on one straight line.';
  return '';
}
/* Plan shapes drawn for an earlier plot elsewhere would otherwise stay in the plan, camera and exports. */
function dropShapesOutsidePlot(){
  const b=planBounds(),outside=s=>s.points.every(p=>p[0]<b.minA)||s.points.every(p=>p[0]>b.maxA)||s.points.every(p=>p[1]<b.minB)||s.points.every(p=>p[1]>b.maxB);
  const dropped=state.sketches.filter(outside);if(!dropped.length)return;
  dropped.forEach(s=>{if(state.map&&s.layer)state.map.removeLayer(s.layer);});
  state.sketches=state.sketches.filter(s=>!outside(s));renderSketchList();updateSketchButtons();
  field('generationStatus').textContent=dropped.length+' drawn shape'+(dropped.length===1?' was':'s were')+' outside the new plot boundary and '+(dropped.length===1?'has':'have')+' been removed from the plan.';
}
function finishPlot(){
  if(state.plotDraft.length<3)return;
  const problem=outlineProblem(state.plotDraft);field('siteError').textContent=problem;field('siteError').classList.toggle('hidden',!problem);if(problem)return;
  clearPlotPreview();state.plotBoundary=state.plotDraft.map(p=>p.slice());state.plotDraft=[];state.zones.forEach(z=>z.conditions=null);invalidateFrom(2);dropShapesOutsidePlot();state.plotMode='pan';if(state.siteMap)state.siteMap.dragging.enable();field('siteMap').classList.remove('draw-mode');field('plotPan').classList.add('active');field('plotDraw').classList.remove('active');drawPlot();
}
function examplePlot(){
  const center=state.siteMap?state.siteMap.getCenter():{lat:500,lng:500};
  state.plotBoundary=state.siteMap?[[center.lat-.000045,center.lng-.00013],[center.lat-.000045,center.lng+.00013],[center.lat+.000045,center.lng+.00013],[center.lat+.000045,center.lng-.00013]]:[[430,430],[570,430],[570,570],[430,570]];
  clearPlotPreview();state.plotDraft=[];state.zones.forEach(z=>z.conditions=null);invalidateFrom(2);dropShapesOutsidePlot();field('siteError').classList.add('hidden');state.plotMode='pan';if(state.siteMap)state.siteMap.dragging.enable();field('siteMap').classList.remove('draw-mode');field('plotPan').classList.add('active');field('plotDraw').classList.remove('active');drawPlot();if(state.siteMap)state.siteMap.fitBounds(state.plotBoundary,{padding:[55,55],animate:false});
}
const sketchStyles={
  boundary:{color:'#26443a',fillColor:'#d4e7bf',fillOpacity:.06,weight:3,dashArray:'7 5'},
  path:{color:'#9e724b',weight:5},open:{color:'#d3b765',fillColor:'#e9d78e',fillOpacity:.45,weight:2},
  planting:{color:'#3b8155',fillColor:'#70ae74',fillOpacity:.45,weight:2},
  water:{color:'#4e929f',fillColor:'#83bdc6',fillOpacity:.55,weight:2}
};
const toolLabels={boundary:'Boundary',path:'Path',open:'Open ground',planting:'Planting zone',water:'Water',symbol:'Plant symbol',selectPlant:'Select plant',moveSymbol:'Move symbol',camera:'Camera view'};
function initMap(){
  if(state.mapReady){if(state.map){state.map.invalidateSize();if(state.siteBoundaryLayer)state.map.removeLayer(state.siteBoundaryLayer);if(state.plotBoundary.length){state.siteBoundaryLayer=L.polygon(state.plotBoundary,{color:'#203e35',weight:3,dashArray:'6 4',fillColor:'#c9dda8',fillOpacity:.1}).addTo(state.map);state.map.fitBounds(state.plotBoundary,{padding:[50,50],animate:false});}}else renderFallbackSketch();return;}
  state.mapReady=true;
  if(!window.L){
    field('map').classList.add('hidden');
    field('mapFallback').classList.remove('hidden');field('sketchBoard').classList.remove('hidden');setTool(state.tool);renderFallbackSketch();return;
  }
  const place=nearestDemoPlace()||demo.places.pijnacker;
  state.map=L.map('map',{doubleClickZoom:false,scrollWheelZoom:false,touchZoom:true,zoomControl:true,zoomSnap:.25,zoomDelta:.25,zoomAnimation:true,fadeAnimation:true}).setView(place.center,15);demoBasemap(state.map);
  L.control.scale({position:'bottomright',metric:true,imperial:false,maxWidth:120}).addTo(state.map);
  let queuedZoom=0,zoomFrame=0,lastGestureAt=0,gesturePoint=null;
  const applyGestureZoom=()=>{zoomFrame=0;if(Math.abs(queuedZoom)<MAP_ZOOM_GESTURE.minimumDelta)return;const delta=Math.max(-MAP_ZOOM_GESTURE.maximumDelta,Math.min(MAP_ZOOM_GESTURE.maximumDelta,queuedZoom));queuedZoom-=delta;const next=Math.max(state.map.getMinZoom(),Math.min(state.map.getMaxZoom(),state.map.getZoom()+delta));state.map.setZoomAround(gesturePoint,next,{animate:false});if(Math.abs(queuedZoom)>=MAP_ZOOM_GESTURE.minimumDelta)zoomFrame=requestAnimationFrame(applyGestureZoom);};
  state.map.getContainer().addEventListener('wheel',event=>{if(!event.ctrlKey)return;event.preventDefault();const unit=event.deltaMode===1?16:event.deltaMode===2?state.map.getSize().y:1,pixels=event.deltaY*unit,now=performance.now(),elapsed=lastGestureAt?Math.max(8,Math.min(120,now-lastGestureAt)):16;lastGestureAt=now;const velocity=Math.abs(pixels)/elapsed,acceleration=Math.min(MAP_ZOOM_GESTURE.maximumAcceleration,1+(MAP_ZOOM_GESTURE.maximumAcceleration-1)*Math.pow(velocity/MAP_ZOOM_GESTURE.velocityReference,MAP_ZOOM_GESTURE.accelerationCurve));queuedZoom-=pixels/MAP_ZOOM_GESTURE.pixelsPerZoomLevel*acceleration;gesturePoint=state.map.mouseEventToContainerPoint(event);if(!zoomFrame)zoomFrame=requestAnimationFrame(applyGestureZoom);},{passive:false});
  if(state.plotBoundary.length){state.siteBoundaryLayer=L.polygon(state.plotBoundary,{color:'#203e35',weight:3,dashArray:'6 4',fillColor:'#c9dda8',fillOpacity:.1}).addTo(state.map);state.map.fitBounds(state.plotBoundary,{padding:[50,50],animate:false});}
  state.map.on('click',event=>{if(state.tool==='pan'||state.tool==='selectPlant')return;const point=constrainPlanPoint([event.latlng.lat,event.latlng.lng]);if(state.tool==='camera'){addCamera(point);return;}if(state.tool==='symbol'){addPlantSymbol(point);return;}if(state.tool==='moveSymbol'){moveSelectedSymbol(point);return;}if(state.tool!=='path'&&shouldCloseSketch(point)){finishShape();return;}state.draft.push(point);drawDraft();});
  state.map.on('mousemove',event=>{const point=constrainPlanPoint([event.latlng.lat,event.latlng.lng]);updateSketchPreview(point);updateMovePreview(point);});
  state.map.on('mouseup',event=>{
    if(!state.draggingPlacement)return;
    state.draggingPlacement=null;
    moveSelectedSymbol(constrainPlanPoint([event.latlng.lat,event.latlng.lng]),true);
  });
  state.map.on('mouseout',()=>{clearSketchPreview();if(!state.draggingPlacement)clearMovePreview();});
  setTool('pan');if(state.generated)renderPlantingCoverage();setTimeout(()=>state.map.invalidateSize(),100);
}
function setTool(tool){
  if(tool!=='selectPlant')state.draggingPlacement=null;
  state.tool=tool; $$('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
  const drawing=!['pan','selectPlant'].includes(tool);
  const sketching=['planting','path','water','open'].includes(tool);
  if(state.map){drawing?state.map.dragging.disable():state.map.dragging.enable();field('map').classList.toggle('draw-mode',drawing);field('map').classList.toggle('map-sketch-mode',sketching);field('map').classList.toggle('move-plant-mode',tool==='selectPlant'||tool==='moveSymbol');}
  field('sketchBoard').classList.toggle('draw-mode',drawing);field('sketchBoard').classList.toggle('map-sketch-mode',sketching);
  if(!sketching){state.sketchHover=null;clearSketchPreview();}
  if(tool!=='moveSymbol'&&tool!=='selectPlant')clearMovePreview();
  if(tool!=='camera')state.cameraDraft=null;
  field('stage7').classList.toggle('plan-selection-mode',tool==='selectPlant');
  field('mapInstruction').textContent=tool==='pan'?'Pan and zoom to your site. Switch tools to draw.':tool==='selectPlant'?'Click a plant to edit it, then drag it to a new position.':tool==='camera'?'First click near a path to place the viewpoint; then click the highlight to look towards.':tool==='symbol'?'Choose a species in the map toolbar, then click inside the plot to add its symbol.':tool==='moveSymbol'?'Click inside the plot to move the selected symbol.':'Click points for '+toolLabels[tool].toLowerCase()+', then choose Finish shape.';
  updateSketchButtons();
  if(field('mapSelectionBar'))renderSymbolEditor();
}
function clearSketchPreview(){
  if(state.sketchPreviewLayer&&state.map)state.map.removeLayer(state.sketchPreviewLayer);
  state.sketchPreviewLayer=null;
}
function updateSketchPreview(point){
  if(!state.map||!['planting','path','water','open'].includes(state.tool)||!state.draft.length){clearSketchPreview();return;}
  const segment=[state.draft[state.draft.length-1],point],style=sketchStyles[state.tool];
  if(state.sketchPreviewLayer)state.sketchPreviewLayer.setLatLngs(segment);
  else state.sketchPreviewLayer=L.polyline(segment,{color:style.color,weight:3,dashArray:'5 6',opacity:.7,interactive:false}).addTo(state.map);
}
function drawDraft(){
  clearSketchPreview();
  if(state.map){
    if(state.draftLayer)state.map.removeLayer(state.draftLayer);
    if(state.draft.length)state.draftLayer=L.layerGroup([L.polyline(state.draft,{color:sketchStyles[state.tool].color,weight:3,dashArray:'4 4'}),...state.draft.map((p,i)=>L.circleMarker(p,{radius:7,color:'#fff',weight:2,fillColor:sketchStyles[state.tool].color,fillOpacity:1}).bindTooltip('Point '+(i+1)))]).addTo(state.map);
  }else renderFallbackSketch();
  updateSketchButtons();
}
function finishShape(){
  const minimum=state.tool==='path'?2:3;
  if(state.draft.length<minimum)return;
  const problem=state.tool==='path'?'':outlineProblem(state.draft);if(problem){field('mapInstruction').textContent=problem;return;}
  const item={type:state.tool,points:state.draft.map(pair=>pair.slice()),layer:null,zoneId:['planting','water'].includes(state.tool)?(Number(field('sketchZone').value)||state.zones[0].id):null};
  if(state.map){
    item.layer=state.tool==='path'?L.polyline(item.points,sketchStyles[item.type]).addTo(state.map):L.polygon(item.points,sketchStyles[item.type]).addTo(state.map);
    if(state.draftLayer)state.map.removeLayer(state.draftLayer);state.draftLayer=null;
  }
  state.sketches.push(item);state.draft=[];state.sketchHover=null;renderSketchList();renderFallbackSketch();updateSketchButtons();
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
function currentCamera(){
  const origin=state.planAudit?.origin;if(!origin)return null;
  const camera=state.sketches.find(s=>s.type==='camera');
  if(camera?.points.length===2)return {eye:latLngToMetric(camera.points[0],origin),target:latLngToMetric(camera.points[1],origin),eyeHeight:1.6};
  const path=state.sketches.find(s=>s.type==='path'&&s.points.length>1);
  if(!path){const eye=latLngToMetric(state.plotBoundary[0],origin),target=[0,0];if(Math.hypot(...eye)<2)target[1]=5;return {eye,target,eyeHeight:1.6};}
  const a=latLngToMetric(path.points[0],origin),b=latLngToMetric(path.points[1],origin);
  const eye=a.map((n,i)=>(n+b[i])/2),v={north:[0,-1],south:[0,1],east:[-1,0],west:[1,0]}[field('viewDirection').value];
  return {eye,target:eye.map((n,i)=>n+v[i]*20),eyeHeight:1.6};
}
function nearestPathPoint(point){
  const origin=state.planAudit?.origin;if(!origin)return null;
  const q=latLngToMetric(point,origin);let closest=null;
  state.sketches.filter(s=>s.type==='path').forEach(s=>s.points.slice(1).forEach((p,i)=>{
    const a=latLngToMetric(s.points[i],origin),b=latLngToMetric(p,origin),dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/(dx*dx+dy*dy||1))),xy=[a[0]+t*dx,a[1]+t*dy],distance=Math.hypot(q[0]-xy[0],q[1]-xy[1]);
    if(!closest||distance<closest.distance)closest={point:s.points[i].map((n,j)=>n+t*(p[j]-n)),distance};
  }));return closest;
}
function addCamera(point){
  if(!state.cameraDraft){
    const path=nearestPathPoint(point);
    if(path&&path.distance>5){field('mapInstruction').textContent='Click within 5 m of a drawn path. The viewpoint snaps onto the path.';return;}
    state.cameraDraft=path?path.point:point;field('mapInstruction').textContent='Viewpoint set. Now click a planting highlight to look towards.';
    field('cameraHelp').textContent='Viewpoint set. Click the highlight on the map.';return;
  }
  const eye=state.cameraDraft,origin=state.planAudit.origin;
  if(Math.hypot(...latLngToMetric(point,origin).map((n,i)=>n-latLngToMetric(eye,origin)[i]))<2){field('mapInstruction').textContent='Choose a highlight at least 2 m from the viewpoint.';return;}
  const previous=state.sketches.filter(x=>x.type==='camera');previous.forEach(x=>{if(state.map&&x.layer)state.map.removeLayer(x.layer);});
  state.sketches=state.sketches.filter(x=>x.type!=='camera');
  const item={type:'camera',points:[eye,point],layer:null};
  if(state.map){
    const icon=L.divIcon({className:'camera-icon',html:'<span aria-label="Camera view">▣</span>',iconSize:[30,30],iconAnchor:[15,15]});
    item.layer=L.layerGroup([L.marker(eye,{icon}),L.polyline([eye,point],{color:'#173e34',weight:2,dashArray:'6 4',interactive:false}),L.circleMarker(point,{radius:6,color:'#173e34',fillColor:'#fff',fillOpacity:1,interactive:false})]).addTo(state.map);
  }
  state.sketches.push(item);renderSketchList();renderFallbackSketch();updateSketchButtons();
  state.cameraDraft=null;field('viewAngle').value='path';setTool('pan');
  field('cameraHelp').textContent='Path viewpoint → chosen highlight. Change it anytime; no AI call is made.';renderVisualization();
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
  state.sketches=[];state.draft=[];state.sketchHover=null;state.draftLayer=null;clearSketchPreview();renderSketchList();renderFallbackSketch();updateSketchButtons();if(state.generated)renderPlantingCoverage();
  if(state.generated)field('generationStatus').textContent='Sketch cleared. Regenerate the demo plan to reflect it.';
  markPlanDirty();renderPlanRules();
}
function updateSketchButtons(){
  field('finishShape').disabled=state.draft.length<(state.tool==='path'?2:3);
  field('undoSketch').disabled=!state.draft.length&&!state.sketches.length;
  field('clearSketch').disabled=!state.draft.length&&!state.sketches.length;
  if(state.stage===7&&state.tool!=='pan'&&state.tool!=='selectPlant'&&state.tool!=='camera'&&state.tool!=='symbol'&&state.tool!=='moveSymbol')field('mapInstruction').textContent=state.draft.length?state.draft.length+' point'+(state.draft.length===1?'':'s')+' placed · '+(field('finishShape').disabled?'add more points':'Finish shape to save '+toolLabels[state.tool].toLowerCase()):'Click points for '+toolLabels[state.tool].toLowerCase()+'; each corner appears immediately.';
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
  if(state.draft.length)draw({type:state.tool,points:state.sketchHover?[...state.draft,state.sketchHover]:state.draft},true);
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
  field('toConfirm').addEventListener('click',()=>{if(state.plotBoundary.length<3){field('siteError').textContent='Outline the plot on the map, or choose Use example plot, before continuing.';field('siteError').classList.remove('hidden');return;}field('siteError').classList.add('hidden');advance(3);});
  field('toPalette').addEventListener('click',()=>{if(validateConditions()){if(!state.paletteBuilt)buildDemoPalette();advance(4);}});
  field('toReview').addEventListener('click',()=>{state.approved=true;advance(6);});
  field('approvePalette').addEventListener('click',()=>{state.approved=true;advance(6);});
  field('downloadCsv').addEventListener('click',downloadCsv);
  field('toPlan').addEventListener('click',()=>advance(7));
  field('mapPreset').addEventListener('change',()=>{const p=demo.places[field('mapPreset').value];if(p){const hadBoundary=state.plotBoundary.length>=3;state.selectedLocation=null;field('location').value='';field('locationStatus').textContent=state.siteMap?'Map moved to '+p.label+'. '+(hadBoundary?'The previous boundary was cleared. ':'')+'Draw your plot boundary.':'Starting city selected. The scaled map is unavailable; reload when the map service is reachable.';clearPlotPreview();if(state.siteMap)state.siteMap.setView(p.center,15);state.plotBoundary=[];state.plotDraft=[];state.zones.forEach(z=>z.conditions=null);invalidateFrom(2);drawPlot();}});
  field('plotPan').addEventListener('click',()=>{clearPlotPreview();state.plotMode='pan';field('plotPan').classList.add('active');field('plotDraw').classList.remove('active');if(state.siteMap)state.siteMap.dragging.enable();field('siteMap').classList.remove('draw-mode');drawPlot();});
  field('plotDraw').addEventListener('click',()=>{state.plotMode='draw';field('plotDraw').classList.add('active');field('plotPan').classList.remove('active');if(state.siteMap)state.siteMap.dragging.disable();field('siteMap').classList.add('draw-mode');drawPlot();});
  field('plotExample').addEventListener('click',examplePlot);
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||!['Backspace','Delete'].includes(event.key))return;
    if(event.target instanceof HTMLElement&&event.target.matches('input,textarea,select,[contenteditable="true"]'))return;
    if(state.stage===2&&state.plotMode==='draw'&&state.plotDraft.length){event.preventDefault();state.plotDraft.pop();drawPlot();}
    if(state.stage===7&&state.tool!=='pan'&&state.tool!=='camera'&&state.tool!=='symbol'&&state.tool!=='moveSymbol'&&state.draft.length){event.preventDefault();state.draft.pop();drawDraft();}
  });
  field('plotUndo').addEventListener('click',()=>{state.plotDraft.pop();drawPlot();});
  field('plotFinish').addEventListener('click',finishPlot);
  field('plotClear').addEventListener('click',()=>{clearPlotPreview();state.plotDraft=[];state.plotBoundary=[];state.zones.forEach(z=>z.conditions=null);invalidateFrom(2);drawPlot();});
  field('siteBoard').addEventListener('click',event=>{if(state.siteMap||state.plotMode!=='draw')return;const rect=field('siteBoard').getBoundingClientRect(),x=Math.round((event.clientX-rect.left)/rect.width*1000),y=Math.round((event.clientY-rect.top)/rect.height*1000),first=state.plotDraft[0];if(first&&state.plotDraft.length>=3&&Math.hypot(x-first[0],y-first[1])<=PLOT_CLOSE_RADIUS_PX/rect.width*1000){finishPlot();return;}state.plotDraft.push([x,y]);drawPlot();});
  field('addZone').addEventListener('click',()=>{state.zones.push({id:state.nextZoneId++,name:'New zone',conditions:null});invalidateFrom(2);renderZoneList();});
  const updatePriorityLimit=()=>{
    const inputs=$$('#priorityOptions input'),chosen=inputs.filter(input=>input.checked),limitReached=chosen.length>=3;
    inputs.forEach(input=>{input.disabled=limitReached&&!input.checked;input.closest('label').classList.toggle('priority-unavailable',input.disabled);});
    field('priorityCount').textContent=limitReached?'Maximum reached — deselect one to change':'Choose up to 3 — '+chosen.length+' selected';
  };
  $$('#priorityOptions input').forEach(input=>input.addEventListener('change',()=>{
    const chosen=$$('#priorityOptions input:checked');if(chosen.length>3)input.checked=false;
    updatePriorityLimit();
    invalidateFrom(1);
  }));
  $$('#stage1 input, #stage1 select').forEach(input=>{if(!input.closest('#priorityOptions'))input.addEventListener('change',()=>invalidateFrom(1));});
  $$('#stage2 input:not([type=file]), #stage2 textarea').forEach(input=>input.addEventListener('change',()=>invalidateFrom(2)));
  $$('[id^="feature"]').forEach(input=>input.addEventListener('change',()=>{state.zones.forEach(z=>z.conditions=null);invalidateFrom(2);}));
  updatePriorityLimit();
  field('inventoryFile').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    field('inventoryFileName').textContent=file.name;
    try{
      if(/\.csv$/i.test(file.name))state.inventory=inventoryNamesFromRows(parseCsv(await file.text()));
      else if(window.XLSX){const workbook=XLSX.read(await file.arrayBuffer(),{type:'array'});state.inventory=inventoryNamesFromRows(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{header:1}));}
      else throw new Error('Spreadsheet reader unavailable. Save the file as CSV.');
      renderInventory();if(state.paletteBuilt)renderPalette();
    }catch(error){state.inventory=[];field('inventoryFileName').textContent=error.message||'Could not read file';renderInventory();}
  });
  field('plantSearch').addEventListener('input',renderSearch);
  field('compositionMode').addEventListener('change',()=>{
    state.compositionMode=field('compositionMode').value;
    state.log.push('Composition mode set to '+compositionModeRecord().label);
    invalidateFrom(4);renderPalette();
  });
  field('restorationOrnamentals').addEventListener('change',()=>{buildDemoPalette();state.log.push('Designer changed the restoration ornamental policy; shortlist rebuilt.');invalidateFrom(4);renderPalette();});
  ['anchorColour1','anchorColour2'].forEach(id=>field(id).addEventListener('change',()=>{refreshOperationalRanking();state.log.push('Seasonal anchor colours changed; ranking refreshed.');invalidateFrom(4);renderPalette();}));
  field('generatePlan').addEventListener('click',generatePlan);
  ['mixMatrix','mixFlowers','mixStructure'].forEach(id=>field(id).addEventListener('change',markPlanDirty));
  field('undoPlanEdit').addEventListener('click',undoPlanEdit);
  field('downloadPlanSvg').addEventListener('click',downloadPlanSvg);
  field('downloadViewSvg').addEventListener('click',downloadViewSvg);
  ['viewDirection','viewAngle','viewSeason','viewAge'].forEach(id=>field(id).addEventListener('change',renderVisualization));
  $$('.toolrow .tool[data-tool]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.tool==='symbol'&&state.selectedPlacement){state.selectedPlacement=null;renderSymbolEditor();}state.draft=[];state.sketchHover=null;drawDraft();setTool(button.dataset.tool);}));
  field('finishShape').addEventListener('click',finishShape);
  field('undoSketch').addEventListener('click',undoSketch);
  field('clearSketch').addEventListener('click',clearSketch);
  field('planImage').addEventListener('change',event=>uploadPlan(event.target.files[0]));
  field('sketchBoard').addEventListener('click',event=>{
    if(state.map||state.tool==='pan'||state.tool==='selectPlant')return;
    const rect=field('sketchBoard').getBoundingClientRect();
    const point=constrainPlanPoint([Math.round((event.clientX-rect.left)/rect.width*1000),Math.round((event.clientY-rect.top)/rect.height*1000)]);
    const first=state.draft[0];
    if(state.tool==='camera')addCamera(point);else if(state.tool==='symbol')addPlantSymbol(point);else if(state.tool==='moveSymbol')moveSelectedSymbol(point);else if(state.tool!=='path'&&first&&state.draft.length>=3&&Math.hypot(point[0]-first[0],point[1]-first[1])<=PLOT_CLOSE_RADIUS_PX/rect.width*1000)finishShape();else{state.draft.push(point);state.sketchHover=null;drawDraft();}
  });
  field('sketchBoard').addEventListener('mousemove',event=>{if(state.map||!['planting','path','water','open'].includes(state.tool)||!state.draft.length)return;const rect=field('sketchBoard').getBoundingClientRect();state.sketchHover=constrainPlanPoint([Math.round((event.clientX-rect.left)/rect.width*1000),Math.round((event.clientY-rect.top)/rect.height*1000)]);renderFallbackSketch();});
  field('sketchBoard').addEventListener('mouseleave',()=>{if(state.sketchHover){state.sketchHover=null;renderFallbackSketch();}});
  window.addEventListener('popstate',()=>showStage(stageFromUrl(),false));
  window.addEventListener('hashchange',()=>showStage(stageFromUrl(),false));
  loadCatalogue();loadDesignRules();renderZoneList();showStage(stageFromUrl(),false);
}
setup();
