import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const {createServer,validateContext}=await import('../server.mjs');const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/overpass-api.de/**',r=>r.fulfill({json:{elements:[]}}));
 const imageRequests=[];const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=';
 await page.route('**/api/illustration',r=>{const body=r.request().postDataJSON();imageRequests.push(body);return r.fulfill({json:{key:String(imageRequests.length).padStart(64,'0'),url:pixel,refinementApplied:body.refinement,label:'Test render'}});});
 page.on('dialog',d=>d.accept());
 await page.route('**/api/status',r=>r.fulfill({json:{ready:true,nonce:'mock',remaining:6,capabilities:{renderRefinement:2,plantingRefinement:2}}}));
 await page.route('**/api/feedback',r=>{const c=r.request().postDataJSON().context;validateContext(c);if(r.request().postDataJSON().request==='Change the mix'){const community=c.communities.find(x=>x.allowedIds.length>1);return r.fulfill({json:{model:'mock',proposal:{summary:'Focus this mix on the requested plant',changes:[{communityId:community.id,shares:[{plantId:community.allowedIds.at(-1),percentage:100}]}],treeAdditions:[],warnings:[]}}});}r.fulfill({json:{model:'mock',proposal:{summary:'Add selected trees',changes:[],treeAdditions:c.treeOptions.slice(0,2).map(s=>s.id),warnings:[]}}});});
 await page.goto('http://127.0.0.1:'+server.address().port+'/website/index.html',{waitUntil:'networkidle'});
 await page.locator('#startProject').click();await page.locator('#toSite').click();await page.locator('#location').fill('Delft');
 await page.locator('#inventoryFile').setInputFiles({name:'existing.csv',mimeType:'text/csv',buffer:Buffer.from('Quantity;Scientific name\n2;Achillea millefolium\n1;Unknown test plant\n3;Unknown test plant')});
 await page.waitForFunction(()=>state.inventory.length===2);
 await page.locator('#plotExample').click();await page.locator('#toConfirm').click();await page.locator('#toPalette').click();
 assert.equal(await page.locator('.inventory-group .plant-row').count(),2);
 assert.match(await page.locator('.inventory-group').innerText(),/Unknown test plant/);
 await page.locator('[data-inventory="inventory-1"] [data-expand]').click();
 assert.ok(await page.locator('[data-inventory="inventory-1"] .plant-detail').isVisible());
 assert.equal(await page.evaluate(()=>state.selected.some(p=>p.name==='Unknown test plant')),false);
 await page.locator('#toPlan').click();await page.evaluate(()=>{const centre=state.plotBoundary.reduce((a,p)=>[a[0]+p[0]/state.plotBoundary.length,a[1]+p[1]/state.plotBoundary.length],[0,0]);state.plotBoundary=state.plotBoundary.map(p=>p.map((n,i)=>centre[i]+(n-centre[i])*5));});
 await page.evaluate(()=>{setTool('planting');state.draft=state.plotBoundary.map(p=>p.slice());drawDraft();finishShape();setTool('pan');});
 await page.locator('#generatePlan').click();
 const before=await page.evaluate(()=>({trees:state.placements.filter(p=>p.tree).length,slots:PlantscapesAI.context()?.treeOptions.length}));
 console.log('Tree capacity',before);assert.ok(before.slots>0,'Example plot must offer eligible tree positions');
 await page.locator('#aiRequest').fill('A thicker canopy of trees');await page.locator('#askAI').click();await page.locator('#applyAI').click();
 assert.equal(await page.evaluate(()=>state.placements.filter(p=>p.tree).length),before.trees+Math.min(2,before.slots));
 await page.locator('#undoRecipe').click();assert.equal(await page.evaluate(()=>state.placements.filter(p=>p.tree).length),before.trees);
 const paletteBefore=await page.evaluate(()=>state.selected.map(p=>p.id));
 await page.locator('#aiRequest').fill('Change the mix');await page.locator('#askAI').click();await page.locator('#applyAI').click();
 assert.ok(await page.evaluate(()=>Object.keys(state.recipeOverrides).length>0));
 const applied=await page.evaluate(()=>state.planAudit.communities.map(c=>({id:c.id,rows:c.rows.map(r=>({id:r.plantId,p:r.percentage})),expected:state.recipeOverrides[c.id],sample:state.placements.filter(p=>p.communityId===c.id).map(p=>p.plantId)})));
 for(const c of applied){for(const row of c.rows)assert.ok(Math.abs(row.p-(c.expected[row.id]||0))<.02,'Applied percentages must reach the generator');assert.ok(c.sample.every(id=>c.expected[id]>0),'Drawing must use the applied recipe');}

 assert.notDeepEqual(await page.evaluate(()=>state.selected.map(p=>p.id)),paletteBefore,'Applied proposal must update palette membership');
 await page.locator('#undoRecipe').click();assert.deepEqual(await page.evaluate(()=>state.selected.map(p=>p.id)),paletteBefore);
 await page.evaluate(()=>{field('applyCameraPreset').click();field('generateIllustration').click();});
 await page.waitForTimeout(1500);await page.waitForFunction(()=>!document.getElementById('aiImage').hidden);
 await page.locator('#renderRequest').fill('Only soften the foreground foliage');await page.locator('#refineRender').click({force:true});
 await page.waitForFunction(()=>document.getElementById('restoreRender').hidden===false);
 await page.waitForFunction(()=>!document.getElementById('refineRender').disabled&&document.getElementById('refineRender').textContent==='Update render');assert.equal(imageRequests.length,2);assert.equal(imageRequests[1].previousKey,'1'.padStart(64,'0'));
 await page.locator('#renderRequest').fill('Keep that change and warm the light');await page.locator('#refineRender').click({force:true});
 await page.waitForFunction(()=>document.getElementById('refineRender').textContent==='Update render'&&!document.getElementById('refineRender').disabled);
 for(let i=0;i<30&&imageRequests.length<3;i++)await page.waitForTimeout(100);assert.equal(imageRequests.length,3);assert.equal(imageRequests[2].previousKey,'2'.padStart(64,'0'));
 await page.locator('#restoreRender').click({force:true});assert.equal(imageRequests.length,3);
 for(const width of [1440,1200,1024,800,375]){
  await page.setViewportSize({width,height:900});
  const overflow=await page.locator('#stage7 .plan-map-toolbar').evaluate(el=>{const bounds=el.getBoundingClientRect();return [...el.children].filter(c=>c.getClientRects().length&&getComputedStyle(c).display!=='none').some(c=>c.getBoundingClientRect().right>bounds.right+1);});
  assert.equal(overflow,false,'Toolbar overflow at '+width);
 }
 assert.deepEqual(errors,[]);console.log('Passed: AI tree additions, changed palette membership, undo, two chained render edits, restore original, inventory and responsive toolbar. No paid AI calls.');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
