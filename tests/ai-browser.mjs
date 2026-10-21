/* Browser-side AI context and local image workflow; no provider or paid endpoint request. */
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const PIXEL=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=','base64');
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.PLANTSCAPES_TEST_URL||'http://127.0.0.1:4182')+'/website/index.html?v=ai-browser-v03',{waitUntil:'networkidle'});
  await page.locator('#startProject').click();await page.locator('#toSite').click();await page.locator('#plotExample').click();await page.locator('#toConfirm').click();await page.locator('#toPalette').click();await page.locator('#toReview').click();await page.locator('#toPlan').click();
  await page.evaluate(()=>exampleSpaces());await page.locator('#generatePlan').click();
  await page.waitForFunction(()=>state.generated&&!!PlantscapesAI.context()?.communities?.length);
  const context=await page.evaluate(()=>PlantscapesAI.context());assert.ok(context?.communities?.length>0,JSON.stringify(await page.evaluate(()=>({generated:state.generated,status:field('generationStatus').textContent,selected:state.selected.length,sketches:state.sketches.length,audit:state.planAudit?.communityMode}))));
  assert.equal(context.version,'community-recipes-v1/v0.3');
  assert.ok(context.communities.every(c=>c.allowedIds.every(id=>context.species.some(p=>p.id===id))));
  assert.ok(context.communities.every(c=>Number.isInteger(c.bedIndex)));
  assert.equal(context.project.evaluation_stage,'placement');
  await page.locator('#toCamera').click();
  const reference=await page.evaluate(()=>PlantscapesAI.referencePNG());const bytes=Buffer.from(reference.split(',')[1],'base64');
  assert.equal(bytes.readUInt32BE(16),900);assert.equal(bytes.readUInt32BE(20),415);
  await page.locator('#importIllustration').setInputFiles({name:'local-concept.png',mimeType:'image/png',buffer:PIXEL});
  await page.locator('#aiImage').waitFor({state:'visible'});
  assert.match(await page.locator('#illustrationStatus').textContent(),/Imported|local|image/i);
  assert.deepEqual(errors,[]);
  console.log('Passed: browser v0.3 AI context, reference PNG and local illustration import; no paid request.');
}finally{await browser.close();}
