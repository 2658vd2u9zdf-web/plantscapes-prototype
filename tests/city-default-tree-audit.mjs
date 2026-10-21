import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
  for(const city of ['delft','rotterdam','utrecht','amsterdam']){
    const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto((process.env.PLANTSCAPES_TEST_URL||'http://127.0.0.1:4182')+'/website/index.html?v=city-default-audit',{waitUntil:'networkidle'});
    await page.locator('#startProject').click();await page.locator('#toSite').click();await page.waitForFunction(()=>state.siteMapReady);
    assert.ok(await page.evaluate(()=>!!state.siteMap),'Scaled map unavailable for '+city);
    await page.locator('#mapPreset').selectOption(city);
    await page.evaluate(()=>{const [lat,lng]=demo.places[field('mapPreset').value].center,dy=15/111195,dx=15/(111195*Math.cos(lat*Math.PI/180));state.plotDraft=[[lat-dy,lng-dx],[lat-dy,lng+dx],[lat+dy,lng+dx],[lat+dy,lng-dx]];finishPlot();});
    await page.locator('#toConfirm').click();
    const conditions=await page.evaluate(()=>({disturbance:state.zones[0].conditions.disturbance,origin:state.zones[0].conditions.field_origins.disturbance}));
    assert.deepEqual(conditions,{disturbance:'unknown',origin:'unknown'});
    await page.locator('#toPalette').click();
    const trees=await page.evaluate(()=>state.selected.filter(p=>p.group==='Trees').map(p=>p.name));
    console.log(JSON.stringify({city,conditions,treeCandidates:trees,errors}));
    await page.close();
  }
}finally{await browser.close();}
