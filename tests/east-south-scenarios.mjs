import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});

const scenarios=[
  {label:'Utrecht small dry urban plot',location:'preset',city:'utrecht',center:[52.090,5.122],width:20,length:30,soil:'sand',moisture:'dry',hydrology:'none',light:'sun',canopy:'no',disturbance:'high',hardscape:'yes',waterEdge:'no',maintenance:'low',audience:'public',character:'mosaic'},
  {label:'Maastricht large fresh sheltered plot',location:'search',city:'Maastricht',center:[50.8514,5.6909],width:100,length:120,soil:'clay',moisture:'fresh',hydrology:'none',light:'mixed',canopy:'yes',disturbance:'low',hardscape:'no',waterEdge:'no',maintenance:'moderate',audience:'habitat',character:'enclosed'}
];
try{
  for(const s of scenarios){
    const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await page.goto('http://127.0.0.1:4182/website/index.html?v=east-south-scenarios',{waitUntil:'networkidle'});
      await page.locator('#startProject').click();
      await page.locator('#maintenance').selectOption(s.maintenance);
      await page.evaluate(value=>{field('audience').value=value;},s.audience);
      await page.locator('#spatialCharacter').selectOption(s.character);
      if(s.audience==='habitat')await page.locator('#publicAccess').uncheck();
      await page.locator('#toSite').click();
      await page.waitForFunction(()=>state.siteMapReady);
      let lookup='not requested';
      if(s.location==='preset'){
        await page.locator('#mapPreset').selectOption(s.city);
      }else{
        await page.locator('#location').fill(s.city);
        await page.locator('#locationSearch').click();
        await page.waitForTimeout(1500);
        const n=await page.locator('#locationResults .search-result').count();
        if(n){await page.locator('#locationResults .search-result').first().click();lookup=await page.locator('#locationStatus').textContent();}
        else {lookup=await page.locator('#locationStatus').textContent();await page.evaluate(([lat,lng])=>state.siteMap.setView([lat,lng],17),s.center);}
      }
      const mapReady=await page.evaluate(()=>!!state.siteMap);
      if(!mapReady)throw Error('Scaled map unavailable');
      await page.locator('#plotDraw').click();
      await page.evaluate(({center,width,length})=>{
        const [lat,lng]=center,dy=length/2/111195,dx=width/2/(111195*Math.cos(lat*Math.PI/180));
        for(const [a,b] of [[lat-dy,lng-dx],[lat-dy,lng+dx],[lat+dy,lng+dx],[lat+dy,lng-dx]])state.siteMap.fire('click',{latlng:L.latLng(a,b)});
      },s);
      await page.locator('#plotFinish').click();
      const plot=await page.evaluate(()=>({area:Math.round(geographicPolygonAreaM2(state.plotBoundary)),boundary:state.plotBoundary.length}));
      await page.locator('#toConfirm').click();
      for(const [key,value] of Object.entries({soil:s.soil,moisture:s.moisture,hydrology:s.hydrology,light:s.light,canopy:s.canopy,disturbance:s.disturbance,hardscape:s.hardscape,waterEdge:s.waterEdge}))await page.locator(`[data-condition-key="${key}"]`).selectOption(value);
      await page.locator('[data-condition-key="source"]').selectOption('demo');
      await page.locator('#toPalette').click();
      const candidates=await page.evaluate(()=>{
        const groups={};for(const p of state.selected)(groups[p.group]??=[]).push({id:p.id,name:p.name,latin:p.latin,score:p.evaluation.final_suitability_score,confidence:p.evaluation.evidence_confidence_score});
        return {groups,count:state.selected.length,treeExclusions:PlantscapesSuitabilityV03.plants.filter(p=>p.group==='Trees').map(p=>({id:p.fixture_id,name:p.dutch_name,eval:runtime.evaluate(p,state.zones[0],project(),{},'candidate')})).filter(x=>!x.eval.eligible_for_demo_ranking).map(x=>({id:x.id,name:x.name,reasons:x.eval.exclusion_reasons,gates:x.eval.hard_gate_results.filter(g=>g.triggered).map(g=>g.gate_id)}))};
      });
      await page.locator('#toReview').click();await page.locator('#toPlan').click();
      await page.evaluate(()=>exampleSpaces());
      await page.locator('#generatePlan').click();
      const plan=await page.evaluate(()=>{
        const tally={};for(const p of state.placements){const plant=state.selected.find(x=>x.id===p.plantId);const key=plant?.name||p.plantId;(tally[key]??={id:p.plantId,group:plant?.group,count:0}).count++;}
        for(const row of Object.values(tally))row.estimatedQuantity=state.planAudit?.quantities?.[row.id]??row.count;
        return {generated:state.generated,status:field('generationStatus').textContent,placements:state.placements.length,trees:state.placements.filter(p=>p.tree).length,roster:Object.entries(state.planAudit?.quantities||{}).filter(([,n])=>n>0).map(([id,n])=>({id,name:state.selected.find(p=>p.id===id)?.name,group:state.selected.find(p=>p.id===id)?.group,estimatedQuantity:n})),placed:tally,communities:state.planAudit?.communities?.length||0,warnings:state.planAudit?.warnings||[],treeDecisions:state.planAudit?.decisions?.filter(d=>state.selected.find(p=>p.id===d.plantId)?.group==='Trees').map(d=>({name:state.selected.find(p=>p.id===d.plantId)?.name,reason:d.reason}))||[],plantingAreas:state.sketches.filter(x=>x.type==='planting').length};
      });
      console.log(JSON.stringify({scenario:s,lookup,plot,candidates,plan,errors}));
    }catch(error){console.log(JSON.stringify({scenario:s.label,error:error.stack,errors}));}
    finally{await page.close();}
  }
}finally{await browser.close();}
