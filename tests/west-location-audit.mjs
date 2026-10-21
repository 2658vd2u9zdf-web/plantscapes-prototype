import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');

const scenarios=[
  {name:'Delft courtyard',city:'delft',width:10,length:20,soil:'clay',moisture:'fresh',hydrology:'none',light:'sun',disturbance:'moderate',path:false},
  {name:'Rotterdam neighbourhood green',city:'rotterdam',width:40,length:40,soil:'clay',moisture:'fresh',hydrology:'none',light:'sun',disturbance:'high',path:true},
  {name:'Rotterdam mapped path, zone away from edge',city:'rotterdam',width:40,length:40,soil:'clay',moisture:'fresh',hydrology:'none',light:'sun',disturbance:'high',path:true,pathEdge:'no'},
  {name:'Rotterdam moderate stress with path edge',city:'rotterdam',width:40,length:40,soil:'clay',moisture:'fresh',hydrology:'none',light:'sun',disturbance:'moderate',path:true,pathEdge:'yes'},
  {name:'Rotterdam moderate stress away from path',city:'rotterdam',width:40,length:40,soil:'clay',moisture:'fresh',hydrology:'none',light:'sun',disturbance:'moderate',path:true,pathEdge:'no'},
];

const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
  for(const scenario of scenarios){
    const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('dialog',dialog=>dialog.dismiss());
    await page.goto((process.env.PLANTSCAPES_TEST_URL||'http://127.0.0.1:4182')+'/website/index.html?v=west-audit-'+scenario.city,{waitUntil:'networkidle'});
    await page.locator('#startProject').click();
    await page.locator('#maintenance').selectOption('moderate');
    await page.locator('#vigourControl').selectOption('yes');
    await page.locator('#toSite').click();
    await page.waitForFunction(()=>state.siteMapReady);
    if(!await page.evaluate(()=>!!state.siteMap))throw Error('Scaled map unavailable for the geographic scenario');
    await page.locator('#mapPreset').selectOption(scenario.city);
    await page.evaluate(({width,length})=>{
      const center=state.siteMap?.getCenter()||demo.places[field('mapPreset').value].center;
      const lat=center.lat??center[0],lng=center.lng??center[1];
      const dLat=length/111195/2,dLng=width/(111195*Math.cos(lat*Math.PI/180))/2;
      state.plotDraft=[[lat-dLat,lng-dLng],[lat-dLat,lng+dLng],[lat+dLat,lng+dLng],[lat+dLat,lng-dLng]];
      finishPlot();
    },scenario);
    const site=await page.evaluate(()=>({site:site().location,area:project().area,mapReady:!!state.siteMap,plotBoundary:state.plotBoundary}));
    await page.locator('#toConfirm').click();
    for(const [key,value] of Object.entries({soil:scenario.soil,moisture:scenario.moisture,hydrology:scenario.hydrology,light:scenario.light,canopy:'no',disturbance:scenario.disturbance,hardscape:'no',waterEdge:'no',path_edge:scenario.pathEdge??(scenario.path?'yes':'no')}))
      await page.locator(`[data-condition-key="${key}"]`).selectOption(value);
    for(const [key,value] of Object.entries({available_width_m:scenario.width,available_length_m:scenario.length,plantable_area_m2:scenario.width*scenario.length}))
      await page.locator(`[data-number-key="${key}"]`).fill(String(value));
    const zone=await page.evaluate(()=>runtime.zone(state.zones[0]));
    await page.locator('#toPalette').click();
    const candidates=await page.evaluate(()=>state.selected.filter(p=>p.operational).map(p=>({id:p.id,name:p.name,group:p.group,score:p.evaluation.final_suitability_score,confidence:p.evaluation.evidence_confidence_score,class:p.evaluation.eligibility_state})));
    const treeChecks=await page.evaluate(()=>PlantscapesSuitabilityV03.plants.filter(p=>p.group==='Trees').map(p=>{const e=runtime.evaluate(p,state.zones[0],project());return {id:p.fixture_id,name:p.dutch_name,eligible:e.eligible_for_demo_ranking,reason:e.exclusion_reasons,gates:e.hard_gate_results.filter(g=>g.triggered).map(g=>g.gate_id+':'+g.state)};}));
    await page.locator('#toReview').click();await page.locator('#toPlan').click();
    if(scenario.path)await page.evaluate(()=>exampleSpaces());
    else await page.evaluate(()=>{setTool('planting');state.draft=state.plotBoundary.map(p=>p.slice());drawDraft();finishShape();setTool('pan');});
    await page.locator('#generatePlan').click();
    const plan=await page.evaluate(()=>({generated:state.generated,status:field('generationStatus').textContent,area:state.planAudit?.area,totalQuantity:state.planAudit?.totalQuantity,previewCount:state.placements.length,treeCount:state.placements.filter(p=>p.tree).length,roster:Object.entries(state.planAudit?.quantities||{}).filter(([,n])=>n>0).map(([id,n])=>({id,name:state.selected.find(p=>p.id===id)?.name,group:state.selected.find(p=>p.id===id)?.group,estimatedQuantity:n})),placed:[...new Map(state.placements.map(p=>[p.plantId,{id:p.plantId,name:state.selected.find(q=>q.id===p.plantId)?.name,previewCount:state.placements.filter(x=>x.plantId===p.plantId).length,estimatedQuantity:state.planAudit?.quantities?.[p.plantId]??null}])).values()],decisions:state.planAudit?.decisions?.map(d=>({id:d.plantId,reason:d.reason})),warnings:state.planAudit?.warnings,treeReview:field('planRuleReview').textContent.match(/\d+ trees/)?.[0]}));
    const result={scenario,site,zone,candidates,treeChecks,plan,errors};
    if(process.env.AUDIT_SUMMARY)console.log(JSON.stringify({scenario,site:{site:site.site,area:site.area,mapReady:site.mapReady},candidateCounts:Object.fromEntries([...new Set(candidates.map(p=>p.group))].map(group=>[group,candidates.filter(p=>p.group===group).length])),trees:candidates.filter(p=>p.group==='Trees'),treeChecks,plan:{generated:plan.generated,status:plan.status,totalQuantity:plan.totalQuantity,previewCount:plan.previewCount,treeCount:plan.treeCount,placed:plan.placed.filter(p=>p.id.startsWith('demo-core-4')),decisions:plan.decisions,warnings:plan.warnings},errors}));
    else console.log(JSON.stringify(result));
    await page.close();
  }
}finally{await browser.close();}
