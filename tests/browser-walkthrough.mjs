import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4181/website/index.html?v=workspace-mix-4',{waitUntil:'networkidle'});
  await page.locator('#startProject').click();await page.locator('#toSite').click();
  await page.locator('#location').fill('Delft public park, Netherlands');
  await page.locator('#mapPreset').selectOption('delft');
  await page.locator('#inNetherlands').check();
  await page.locator('#plotExample').click();await page.locator('#toConfirm').click();
  await page.locator('[data-condition-key="source"]').selectOption('demo');
  await page.locator('[data-condition-key="hydrology"]').selectOption('seasonal');
  await page.locator('[data-condition-key="waterEdge"]').selectOption('no');
  await page.locator('#toPalette').click();
  const candidates=await page.locator('.plant-row').count();assert.ok(candidates>10,'palette should contain visible test plants');
  assert.equal(await page.evaluate(()=>state.selected.filter(p=>p.group==='Aquatic & marginal plants').length),0,'seasonal wetness alone must not suggest aquatic plants without water');
  assert.ok(await page.evaluate(()=>state.selected.every(p=>state.zones.some(z=>engine.zoneFit(p,z,project()).fit))),'all candidates must pass at least one confirmed zone gate');
  await page.locator('[data-expand]').first().click();assert.ok(await page.locator('.plant-detail:not(.hidden)').count());
  await page.locator('[data-remove-plant]').first().click();assert.equal(await page.locator('.plant-row').count(),candidates-1);
  await page.locator('#undoPlant').click();assert.equal(await page.locator('.plant-row').count(),candidates);
  await page.locator('#toReview').click();await page.locator('#approvePalette').click();
  const csvPromise=page.waitForEvent('download');await page.locator('#downloadCsv').click();const csv=await csvPromise;assert.match(csv.suggestedFilename(),/candidate/);
  await page.locator('#toPlan').click();await page.locator('#generatePlan').click();
  assert.match(await page.locator('#generationStatus').textContent(),/Draw your paths first/);
  assert.equal(await page.locator('#demoGenerate').count(),0,'demo shortcut is removed');
  assert.ok(await page.locator('#selectedSymbol').isHidden(),'no inactive plant inspector');
  await page.locator('#map.leaflet-container').waitFor({state:'visible'});
  // UI drawing clicks use map projection of the saved test boundary.
  const drawing=await page.evaluate(()=>{const b=planBounds(),middle=(b.minB+b.maxB)/2;return {path:[[b.minA,middle],[b.maxA,middle]].map(p=>{const q=state.map.latLngToContainerPoint(p);return {x:q.x,y:q.y};}),bed:state.plotBoundary.map(p=>{const q=state.map.latLngToContainerPoint(p);return {x:q.x,y:q.y};})};});
  await page.locator('[data-tool="path"]').click();
  for(const position of drawing.path)await page.locator('#map').click({position});
  await page.locator('#finishShape').click();
  await page.locator('[data-tool="planting"]').click();
  for(const position of drawing.bed)await page.locator('#map').click({position});
  await page.locator('#finishShape').click();await page.locator('#generatePlan').click();
  assert.match(await page.locator('#generationStatus').textContent(),/draft plants/);
  assert.ok(await page.locator('#visualCanvas svg').count(),'view must draw');
  assert.match(await page.locator('#planNotation').textContent(),/Tree centre/);
  assert.ok(await page.locator('#placementList svg pattern').count()>5,'legend must use the plan hatch patterns');
  await page.locator('#viewAngle').selectOption('side');assert.match(await page.locator('#visualCanvas').textContent(),/Side view/);
  await page.locator('#viewAngle').selectOption('elevated');
  assert.ok(await page.locator('#map .leaflet-overlay-pane svg path').count()>5,'map must draw plants');
  await page.locator('.species-key summary').click();
  await page.locator('[data-select-symbol]').first().click();
  assert.ok(await page.locator('#selectedSymbol').isVisible(),'a selected plant must expose a real editor');
  const alternatives=await page.locator('#editSymbolSpecies option').evaluateAll(options=>options.map(o=>o.value));
  if(alternatives.length>1){const current=await page.locator('#editSymbolSpecies').inputValue();await page.locator('#editSymbolSpecies').selectOption(alternatives.find(id=>id!==current));assert.match(await page.locator('#generationStatus').textContent(),/Species changed/);await page.locator('#undoPlanEdit').click();await page.locator('[data-select-symbol]').first().click();}
  const before=await page.locator('#placementList').textContent();
  await page.locator('#removeSymbol').click();await page.locator('#undoPlanEdit').click();
  assert.equal(await page.locator('#placementList').textContent(),before,'undo must restore plant quantities');
  const planPromise=page.waitForEvent('download');await page.locator('#downloadPlanSvg').click();const plan=await planPromise;assert.match(plan.suggestedFilename(),/\.svg$/);
  const output=new URL('../project-information/implementation-checks/',import.meta.url);await mkdir(output,{recursive:true});
  await plan.saveAs(fileURLToPath(new URL('legible-planting-plan.svg',output)));
  await page.locator('.species-key summary').click();
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.locator('#stage7').screenshot({path:fileURLToPath(new URL('simplified-workspace.png',output))});
  await page.locator('#visualPanel').screenshot({path:fileURLToPath(new URL('elevated-plan-view.png',output))});
  await page.locator('#map').screenshot({path:fileURLToPath(new URL('approved-plan-map.png',output))});
  await page.locator('.design-review-disclosure > summary').click();
  await page.locator('#planRuleReview').screenshot({path:fileURLToPath(new URL('approved-plan-review.png',output))});
  await page.locator('.plant-tools + details summary').click();
  await page.locator('#mixMatrix').fill('65');await page.locator('#mixMatrix').dispatchEvent('change');
  assert.ok(await page.locator('#downloadPlanSvg').isDisabled(),'changed geometry must disable stale plan export');
  assert.match(await page.locator('#visualCanvas').textContent(),/Regenerate/);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,'mobile horizontal overflow');
  await page.setViewportSize({width:1440,height:1000});
  const aquatic=await page.evaluate(()=>{
    // Explicitly synthetic large wet-park fixture; no map conditions are claimed.
    const origin=[52.009,4.358],toGeo=p=>metricToLatLng(p,origin);
    state.generated=false;state.sketches.forEach(s=>s.layer&&state.map.removeLayer(s.layer));state.sketches=[];
    state.plotBoundary=[[0,0],[50,0],[50,40],[0,40]].map(toGeo);
    state.siteBoundaryLayer.setLatLngs(state.plotBoundary);state.map.fitBounds(state.plotBoundary);
    state.zones[0].conditions={...state.zones[0].conditions,soil:'clay',moisture:'wet',light:'sun',hydrology:'permanent',waterEdge:'yes',source:'demo'};
    buildDemoPalette();
    for(const [type,points] of [['planting',[[0,0],[50,0],[50,40],[0,40]]],['path',[[24,0],[24,40]]],['open',[[2,2],[13,2],[13,10],[2,10]]],['water',[[30,5],[48,5],[48,27],[30,27]]]]){
      setTool(type);state.draft=points.map(toGeo);finishShape();
    }
    setTool('pan');generatePlan();
    return state.placements.filter(p=>plantForPlacement(p)?.group==='Aquatic & marginal plants').length;
  });
  assert.ok(aquatic>0,'water-zone integration must place marginal plants');
  for(const type of ['water','open','path'])assert.ok(await page.locator('#visualCanvas [data-surface="'+type+'"]').count(),'view must include '+type);
  await page.locator('#visualPanel').screenshot({path:fileURLToPath(new URL('wet-park-elevated-view.png',output))});
  await page.locator('#map').screenshot({path:fileURLToPath(new URL('wet-park-plan-map.png',output))});
  const fixedPositions=await page.evaluate(()=>JSON.stringify(state.placements.map(p=>p.xy)));
  for(const season of ['spring','summer','autumn','winter']){
    await page.locator('#viewSeason').selectOption(season);
    assert.ok(await page.locator('#visualCanvas [data-plant-form="grass-tuft"]').count(),'grass tufts must remain identifiable in '+season);
    await page.locator('#visualPanel').screenshot({path:fileURLToPath(new URL('mixed-'+season+'-view.png',output))});
  }
  assert.equal(await page.evaluate(()=>JSON.stringify(state.placements.map(p=>p.xy))),fixedPositions,'season changes must not reshuffle the design');
  await page.locator('#viewAngle').selectOption('side');
  await page.locator('#visualPanel').screenshot({path:fileURLToPath(new URL('mixed-side-view.png',output))});
  assert.deepEqual(errors,[],'no browser JavaScript errors');
  const report={status:'passed',candidateCount:candidates,aquaticPositions:aquatic,checks:['palette visible','no aquatic candidates without water','all candidates pass confirmed-zone gates','expand/remove/undo','CSV download','path gate','UI-drawn path and bed generate a plan','top legend','side and elevated views','inactive inspector hidden','plant undo','SVG download','stale-plan gate','mobile width','wet shoreline placement','water/open/path geometry in view','grass tufts in all four seasons'],browserErrors:errors};
  await writeFile(new URL('browser-check.json',output),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
