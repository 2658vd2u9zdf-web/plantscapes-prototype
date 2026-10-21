import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {validateContext,validateProposal} from '../server.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.PLANTSCAPES_TEST_URL||'http://127.0.0.1:4182')+'/website/index.html?v=v03-browser',{waitUntil:'networkidle'});
  await page.locator('#startProject').click();await page.locator('#toSite').click();
  assert.equal(await page.evaluate(()=>state.stage),2,`stage failed; errors: ${errors.join('; ')}`);
  assert.ok(await page.locator('#maintenance').count());assert.ok(await page.locator('#mappedSupport').count());
  await page.locator('#plotExample').click();await page.locator('#toConfirm').click();
  assert.equal(await page.evaluate(()=>state.stage),3,errors.join('; '));
  assert.ok(await page.locator('[data-number-key="available_width_m"]').count());
  await page.locator('[data-condition-key="source"]').selectOption('survey');
  assert.equal(await page.evaluate(()=>runtime.zone(state.zones[0]).source),'demo','synthetic fields cannot be promoted by a source label');
  await page.locator('#toPalette').click();assert.equal(await page.evaluate(()=>state.stage),4,errors.join('; '));
  const count=await page.locator('#paletteGroups .plant-row').count();assert.ok(count>0,`no v0.3 candidates; errors: ${errors.join('; ')}`);
  const data=await page.evaluate(()=>state.selected.map(p=>({id:p.id,placeable:p.recommendation.placeable,production:p.productionEligible,complete:p.recommendation.data.complete})));
  assert.ok(data.every(p=>p.id.startsWith('demo-')&&p.placeable&&p.production===false&&p.complete));
  const firstRow=await page.locator('#paletteGroups .candidate-row').first().textContent();
  assert.doesNotMatch(firstRow,/v0\.3|production|confidence|capped|conditional_match/i,'collapsed rows stay plain');
  // Keyboard: focus the chevron and press Enter; state is announced by aria-expanded, not by colour alone.
  const toggle=page.locator('#paletteGroups [data-expand]').first();await toggle.focus();await page.keyboard.press('Enter');
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.match(await toggle.getAttribute('aria-label'),/^Hide details for /);
  const detail=await page.locator('.plant-detail:not([hidden])').first().textContent();
  assert.match(detail,/Growing conditions/);assert.match(detail,/Flower colour:/);assert.doesNotMatch(detail,/not production eligible|Field origins|synthetic_fallback/i);
  // Missing-information examples render separately and never change the palette.
  const before=await page.evaluate(()=>state.selected.map(p=>p.id).join('|'));
  await page.locator('#showExamples').check();assert.equal(await page.locator('.candidate-example').count(),10);
  assert.equal(await page.evaluate(()=>state.selected.map(p=>p.id).join('|')),before);
  // "Add anyway" moves one example into the selection, marked as added by the designer; Remove takes it out again.
  const overrideId=await page.locator('[data-override-plant]').first().getAttribute('data-override-plant');
  await page.locator('[data-override-plant]').first().click();
  assert.ok(await page.evaluate(id=>state.selected.some(p=>p.id===id&&p.recommendation.override.active),overrideId));
  assert.equal(await page.locator('#paletteGroups .palette-group:not(.example-group) [data-candidate="'+overrideId+'"] .override-tag').count(),1);
  await page.locator('#paletteGroups .palette-group:not(.example-group) [data-remove-plant="'+overrideId+'"]').click();
  assert.equal(await page.evaluate(()=>state.selected.map(p=>p.id).join('|')),before);
  await page.locator('#showExamples').uncheck();
  await page.setViewportSize({width:375,height:850});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'palette fits 375 px');
  await page.setViewportSize({width:1400,height:950});
  await page.locator('#toReview').click();await page.locator('#toPlan').click();
  await page.evaluate(()=>exampleSpaces());await page.locator('#generatePlan').click();
  const plan=await page.evaluate(()=>({generated:state.generated,count:state.placements.length,communities:state.planAudit?.communities?.length||0,status:field('generationStatus').textContent}));
  assert.ok(plan.generated&&plan.count>0&&plan.communities>0,JSON.stringify(plan));
  assert.ok(await page.locator('#communityControls').isVisible(),'community recipe controls stay usable');
  const aiContext=await page.evaluate(()=>PlantscapesAI.context());assert.ok(aiContext?.communities?.length>0);
  validateContext(aiContext);
  const check={summary:'Direct validation only.',warnings:[],changes:[{communityId:aiContext.communities[0].id,shares:aiContext.communities[0].rows.map(r=>({plantId:r.plantId,percentage:r.percentage}))}]};
  validateProposal(check,aiContext);
  assert.ok(await page.locator('#visualCanvas svg').count());
  await page.locator('#toCamera').click();assert.equal(await page.evaluate(()=>state.stage),8);
  assert.ok(await page.locator('#cameraPlan').count());
  assert.ok(await page.locator('#exportScene').isVisible(),'render scene export stays available');
  assert.deepEqual(errors,[]);
  console.log(`Passed: browser v0.3 palette with ${count} candidates, conditional evidence and provenance.`);
}finally{await browser.close();}
