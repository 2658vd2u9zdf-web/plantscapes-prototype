import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto((process.env.PLANTSCAPES_TEST_URL||'http://127.0.0.1:4182')+'/website/index.html?v=pijnacker-repro',{waitUntil:'networkidle'});
  await page.locator('#startProject').click();await page.locator('#toSite').click();await page.waitForFunction(()=>state.siteMapReady);
  assert.ok(await page.evaluate(()=>!!state.siteMap),'Scaled map must be available for geographic test');
  await page.evaluate(()=>{
    const [lat,lng]=demo.places.pijnacker.center,h=100/111195,w=114.72/(111195*Math.cos(lat*Math.PI/180));
    state.plotBoundary=[[lat-h/2,lng-w/2],[lat-h/2,lng+w/2],[lat+h/2,lng+w/2],[lat+h/2,lng-w/2]];
    drawPlot();state.siteMap.fitBounds(state.plotBoundary,{animate:false});
  });
  const area=await page.evaluate(()=>geographicPolygonAreaM2(state.plotBoundary));
  await page.locator('#toConfirm').click();await page.locator('#toPalette').click();
  assert.equal(await page.evaluate(()=>state.stage),4);
  const candidates=await page.evaluate(()=>state.selected.map(p=>({id:p.id,name:p.name,group:p.group,score:p.score,confidence:p.confidence})));
  await page.locator('#toReview').click();await page.locator('#toPlan').click();
  await page.evaluate(()=>exampleSpaces());await page.locator('#generatePlan').click();
  const plan=await page.evaluate(()=>({generated:state.generated,status:field('generationStatus').textContent,trees:state.placements.filter(p=>p.tree).map(p=>({id:p.plantId,name:state.selected.find(x=>x.id===p.plantId)?.name})),roster:Object.entries(state.planAudit?.quantities||{}).filter(([,n])=>n>0).map(([id,n])=>({id,name:state.selected.find(p=>p.id===id)?.name,group:state.selected.find(p=>p.id===id)?.group,estimatedQuantity:n})),placedSpecies:[...new Set(state.placements.map(p=>p.plantId))].map(id=>({id,name:state.selected.find(x=>x.id===id)?.name,quantity:state.planAudit?.quantities?.[id]??state.placements.filter(p=>p.plantId===id).length})),communities:state.planAudit?.communities?.map(c=>({id:c.id,band:c.band,area:c.area,total:c.total,rows:c.rows.map(r=>({id:r.plantId,percentage:r.percentage,count:r.count}))})),warnings:state.planAudit?.warnings||[]}));
  assert.ok(plan.generated,JSON.stringify(plan));assert.deepEqual(errors,[]);
  console.log(JSON.stringify({location:'Pijnacker',area_m2:Math.round(area),candidates,plan}));
}finally{await browser.close();}
