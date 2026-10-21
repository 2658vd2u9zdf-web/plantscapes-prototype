import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.PLANTSCAPES_TEST_URL||'http://127.0.0.1:4182';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const scenarios=[
  {name:'Groningen wet peat 1500 m2',lat:53.2194,lng:6.5665,method:'preset',width:30,length:50,soil:'peat',moisture:'wet',hydrology:'seasonal',light:'sun',canopy:'no',disturbance:'low',maintenance:'moderate'},
  {name:'Groningen wet peat 1500 m2 open character',lat:53.2194,lng:6.5665,method:'preset',width:30,length:50,soil:'peat',moisture:'wet',hydrology:'seasonal',light:'sun',canopy:'no',disturbance:'low',maintenance:'moderate',character:'open'},
  {name:'Leeuwarden fresh clay 10000 m2',lat:53.2012,lng:5.7999,method:'map navigation',width:100,length:100,soil:'clay',moisture:'fresh',hydrology:'none',light:'sun',canopy:'no',disturbance:'low',maintenance:'moderate'}
];
function rectangle(lat,lng,width,length){const dy=length/2/111195,dx=width/2/(111195*Math.cos(lat*Math.PI/180));return [[lat-dy,lng-dx],[lat-dy,lng+dx],[lat+dy,lng+dx],[lat+dy,lng-dx]];}
try{
  for(const s of scenarios){
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],dialogs=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());d.accept();});
    await page.goto(base+'/website/index.html?v=north-sites-investigation',{waitUntil:'domcontentloaded'});
    await page.locator('#startProject').click();
    await page.locator('#maintenance').selectOption(s.maintenance);
    if(s.character)await page.locator('#spatialCharacter').selectOption(s.character);
    await page.locator('#toSite').click();
    await page.waitForFunction(()=>state.siteMapReady,{timeout:10000});
    if(s.method==='preset')await page.locator('#mapPreset').selectOption('groningen');
    const boundary=rectangle(s.lat,s.lng,s.width,s.length);
    await page.evaluate(({s,boundary})=>{state.siteMap?.setView([s.lat,s.lng],15);state.plotDraft=boundary;finishPlot();}, {s,boundary});
    const site=await page.evaluate(()=>({siteMapReady:!!state.siteMap,boundary:state.plotBoundary,area:geographicPolygonAreaM2(state.plotBoundary),readout:field('plotAreaReadout').textContent,mapStatus:field('mapDataStatus').textContent,location:site().location}));
    await page.locator('#toConfirm').click();
    for(const [key,value] of Object.entries({soil:s.soil,moisture:s.moisture,hydrology:s.hydrology,light:s.light,canopy:s.canopy,disturbance:s.disturbance,hardscape:'no',waterEdge:'no',path_edge:'no',source:'demo'}))await page.locator(`[data-condition-key="${key}"]`).selectOption(value);
    for(const [key,value] of Object.entries({available_width_m:s.width,available_length_m:s.length,plantable_area_m2:s.width*s.length}))await page.locator(`[data-number-key="${key}"]`).fill(String(value));
    const zone=await page.evaluate(()=>runtime.zone(state.zones[0]));
    await page.locator('#toPalette').click();
    const palette=await page.evaluate(()=>({summary:field('paletteSummary').textContent,groups:Object.fromEntries(groupOrder.map(g=>[g,state.selected.filter(p=>p.group===g).map(p=>({id:p.id,name:p.name,score:p.evaluation.final_suitability_score,confidence:p.evaluation.evidence_confidence_score,spread:p.spread,spacing:p.spacing}))]).filter(([,v])=>v.length)),excludedTrees:PlantscapesSuitabilityV03.plants.filter(p=>p.group==='Trees'&&!state.selected.some(q=>q.id===p.fixture_id)).map(p=>({id:p.fixture_id,name:p.dutch_name,result:runtime.evaluate(p,state.zones[0],project())})).map(x=>({id:x.id,name:x.name,eligibility:x.result.eligibility_state,reasons:x.result.exclusion_reasons,gates:x.result.hard_gate_results.filter(g=>g.triggered).map(g=>g.gate_id)}))}));
    await page.locator('#toReview').click();await page.locator('#toPlan').click();
    await page.evaluate(()=>{setTool('planting');state.draft=state.plotBoundary.map(p=>p.slice());drawDraft();finishShape();setTool('pan');});
    await page.locator('#generatePlan').click();
    const plan=await page.evaluate(()=>{
      const counts={};for(const x of state.placements)counts[x.plantId]=(counts[x.plantId]||0)+1;
      const bed=state.sketches.find(x=>x.type==='planting');const origin=[state.plotBoundary.reduce((n,p)=>n+p[0],0)/state.plotBoundary.length,state.plotBoundary.reduce((n,p)=>n+p[1],0)/state.plotBoundary.length];const poly=localMetricPolygon(bed.points,origin),xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);const geometry={available_width_m:Math.max(...xs)-Math.min(...xs),available_length_m:Math.max(...ys)-Math.min(...ys),plantable_area_m2:engine.area(poly)};
      return {generated:state.generated,status:field('generationStatus').textContent,placementCount:state.placements.length,totalQuantity:state.planAudit?.totalQuantity,treeCount:state.placements.filter(p=>p.tree).length,roster:Object.entries(state.planAudit?.quantities||{}).filter(([,n])=>n>0).map(([id,n])=>({id,name:state.selected.find(p=>p.id===id)?.name,group:state.selected.find(p=>p.id===id)?.group,estimatedQuantity:n})),placed:Object.entries(counts).map(([id,count])=>{const p=state.selected.find(x=>x.id===id);return {id,name:p?.name,group:p?.group,previewCount:count,estimatedQuantity:state.planAudit?.quantities?.[id]??count};}).sort((a,b)=>b.previewCount-a.previewCount),warnings:state.planAudit?.warnings,treeDecisions:state.planAudit?.decisions?.filter(d=>state.selected.find(p=>p.id===d.plantId)?.group==='Trees'),treeFit:state.selected.filter(p=>p.group==='Trees').map(p=>({id:p.id,name:p.name,spread:p.spread,result:engine.zoneFit(p,{...state.zones[0],geometry},project()).evaluation?.eligibility_state,fit:engine.zoneFit(p,{...state.zones[0],geometry},project()).fit})),lowPlants:state.selected.filter(p=>p.group!=='Trees').map(p=>({id:p.id,name:p.name,height:p.height,fit:engine.zoneFit(p,{...state.zones[0],geometry},project()).fit,thorns:p.thorns})).filter(p=>p.height<=1.3),geometry,errors:field('generationStatus').textContent};
    });
    console.log(JSON.stringify({scenario:s,site,zone,palette,plan,dialogs,errors}));
    await page.close();
  }
}finally{await browser.close();}
