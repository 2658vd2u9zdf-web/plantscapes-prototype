/* Browser regressions from BUG-PERFORMANCE-AUDIT.md: Leaflet stylesheet integrity, invalid outlines,
   palette focus after remove/undo, and plan shapes left behind when the site moves. No AI request. */
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],consoleErrors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('dialog',d=>d.accept());
  await page.goto((process.env.PLANTSCAPES_TEST_URL||'http://127.0.0.1:4182')+'/website/index.html?v=audit-browser',{waitUntil:'networkidle'});
  assert.ok(await page.evaluate(()=>[...document.styleSheets].some(s=>/leaflet\.css/.test(s.href||'')&&(()=>{try{return s.cssRules.length>0;}catch{return false;}})())),'Leaflet stylesheet passes its integrity check');
  assert.ok(!consoleErrors.some(e=>/integrity/.test(e)),consoleErrors.join('\n'));
  await page.locator('#startProject').click();await page.locator('#toSite').click();await page.waitForFunction(()=>state.siteMap);
  const outlines=await page.evaluate(()=>{
    const c=state.siteMap.getCenter(),error=()=>field('siteError').classList.contains('hidden')?'':field('siteError').textContent,save=points=>{state.plotMode='draw';state.plotDraft=points.map(([a,b])=>[c.lat+a,c.lng+b]);finishPlot();return {saved:state.plotBoundary.length,error:error(),kept:state.plotDraft.length};};
    return {line:save([[0,0],[.0001,.0001],[.0002,.0002]]),bowtie:save([[0,0],[.0002,.0003],[0,.0003],[.0002,0]]),valid:save([[0,0],[0,.0003],[.0002,.0003],[.0002,0]])};
  });
  assert.ok(!outlines.line.saved&&/no area/.test(outlines.line.error),JSON.stringify(outlines));
  assert.ok(!outlines.bowtie.saved&&/crosses itself/.test(outlines.bowtie.error)&&outlines.bowtie.kept===4,'a crossing outline is refused and its corners are kept');
  assert.ok(outlines.valid.saved===4&&!outlines.valid.error,JSON.stringify(outlines));
  await page.locator('#toConfirm').click();await page.locator('#toPalette').click();
  const focus=await page.evaluate(()=>{
    const remove=document.querySelectorAll('[data-remove-plant]')[1],id=remove.dataset.removePlant;remove.click();const afterRemove=document.activeElement.id;
    field('undoPlant').click();return {afterRemove,afterUndo:document.activeElement.closest('[data-candidate]')?.dataset.candidate===id};
  });
  assert.deepEqual(focus,{afterRemove:'undoPlant',afterUndo:true},'keyboard focus survives palette edits');
  await page.locator('#toReview').click();await page.locator('#toPlan').click();await page.waitForFunction(()=>state.map);
  await page.evaluate(()=>{exampleSpaces();generatePlan();});
  assert.ok(await page.evaluate(()=>state.generated));
  await page.evaluate(()=>{showStage(2);const preset=field('mapPreset');preset.value='groningen';preset.dispatchEvent(new Event('change'));});
  await page.locator('#plotExample').click();
  const moved=await page.evaluate(()=>({shapes:state.sketches.length,message:field('generationStatus').textContent}));
  assert.ok(moved.shapes===0&&/outside the new plot boundary/.test(moved.message),JSON.stringify(moved));
  await page.locator('#toConfirm').click();await page.locator('#toPalette').click();await page.locator('#toReview').click();await page.locator('#toPlan').click();
  const plan=await page.evaluate(()=>{exampleSpaces();generatePlan();return {generated:state.generated,placements:state.placements.length,status:field('generationStatus').textContent};});
  assert.ok(plan.generated&&plan.placements>0,'a new plot generates after the site moved: '+JSON.stringify(plan));
  assert.deepEqual(errors,[]);
  console.log('Passed: Leaflet integrity, invalid outlines, palette focus and stale plan shapes after a site move.');
}finally{await browser.close();}
