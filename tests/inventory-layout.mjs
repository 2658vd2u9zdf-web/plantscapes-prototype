import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/overpass-api.de/**',r=>r.fulfill({json:{elements:[]}}));
 await page.route('**/api/illustration',r=>r.abort());await page.route('**/api/feedback',r=>r.abort());
 await page.goto('http://127.0.0.1:4185/website/index.html',{waitUntil:'networkidle'});
 await page.locator('#startProject').click();await page.locator('#toSite').click();await page.locator('#location').fill('Delft');
 await page.locator('#inventoryFile').setInputFiles({name:'existing.csv',mimeType:'text/csv',buffer:Buffer.from('Quantity;Scientific name\n2;Achillea millefolium\n1;Unknown test plant\n3;Unknown test plant')});
 await page.waitForFunction(()=>state.inventory.length===2);
 await page.locator('#plotExample').click();await page.locator('#toConfirm').click();await page.locator('#toPalette').click();
 assert.equal(await page.locator('.inventory-group .plant-row').count(),2);
 assert.match(await page.locator('.inventory-group').innerText(),/Unknown test plant/);
 await page.locator('[data-inventory="inventory-1"] [data-expand]').click();
 assert.ok(await page.locator('[data-inventory="inventory-1"] .plant-detail').isVisible());
 assert.equal(await page.evaluate(()=>state.selected.some(p=>p.name==='Unknown test plant')),false);
 await page.locator('#toPlan').click();
 await page.evaluate(()=>{setTool('planting');state.draft=state.plotBoundary.map(p=>p.slice());drawDraft();finishShape();setTool('pan');});
 await page.locator('#generatePlan').click();
 for(const width of [1440,1200,1024,800,375]){
  await page.setViewportSize({width,height:900});
  const overflow=await page.locator('#stage7 .plan-map-toolbar').evaluate(el=>{const bounds=el.getBoundingClientRect();return [...el.children].filter(c=>c.getClientRects().length&&getComputedStyle(c).display!=='none').some(c=>c.getBoundingClientRect().right>bounds.right+1);});
  assert.equal(overflow,false,'Toolbar overflow at '+width);
 }
 assert.deepEqual(errors,[]);console.log('Passed: uploaded CSV inventory, unknown records, expandable details, no automatic selection, responsive plan toolbar. No paid AI calls.');
}finally{await browser.close();}
