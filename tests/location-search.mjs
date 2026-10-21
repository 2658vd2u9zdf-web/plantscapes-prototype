import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
  const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  let pdokOffline=false;
  await page.route('https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?*',route=>pdokOffline?route.abort():route.fulfill({json:{response:{docs:[{weergavenaam:'Delft Centrum',centroide_ll:'POINT(4.3600 52.0110)'}]}}}));
  await page.route('https://overpass-api.de/api/interpreter',route=>route.abort());
  await page.goto((process.env.PLANTSCAPES_TEST_URL||'http://127.0.0.1:4182')+'/website/index.html?v=location-search',{waitUntil:'networkidle'});
  await page.locator('#startProject').click();await page.locator('#toSite').click();
  await page.waitForFunction(()=>state.siteMapReady);
  assert.ok(await page.locator('#mapPreset').isVisible(),'starting city must be available as a fallback');
  assert.ok(await page.locator('#locationSearch').isVisible(),'search must have a visible action');
  await page.locator('#mapPreset').selectOption('utrecht');
  const scaledMap=await page.evaluate(()=>!!state.siteMap);
  assert.match(await page.locator('#locationStatus').textContent(),scaledMap?/Map moved to Utrecht/:/scaled map is unavailable/);
  await page.locator('#location').fill('Delft');
  await page.locator('#locationResults .search-result').first().waitFor();
  await page.locator('#locationResults .search-result').first().click();
  assert.equal(await page.locator('#location').inputValue(),'Delft Centrum');
  assert.match(await page.locator('#locationStatus').textContent(),scaledMap?/Map moved to Delft Centrum/:/scaled map is unavailable/);
  if(scaledMap)assert.ok(await page.evaluate(()=>Math.abs(state.siteMap.getCenter().lat-52.011)<.001));
  await page.locator('#plotExample').click();
  if(scaledMap){
    await page.waitForFunction(()=>state.mapEvidence?.source==='unavailable');
    assert.match(await page.locator('#mapDataStatus').textContent(),/Location search and drawing still work/);
    assert.match(await page.evaluate(()=>site().location),/Delft Centrum/);
  }
  await page.locator('#toConfirm').click();assert.equal(await page.evaluate(()=>state.stage),3);
  assert.equal(await page.evaluate(()=>state.zones[0].conditions.disturbance),'unknown','a city preset or nearby road must not assert high disturbance');
  pdokOffline=true;await page.evaluate(()=>showStage(2));await page.locator('#location').fill('offline');await page.locator('#locationSearch').click();
  await page.getByText('Location search service unavailable. Choose a starting city or move the map manually.').waitFor();
  await page.locator('#mapPreset').selectOption('amsterdam');
  assert.match(await page.locator('#locationStatus').textContent(),scaledMap?/Map moved to Amsterdam/:/Starting city selected/);
  assert.deepEqual(errors,[]);
  console.log('Passed: searchable PDOK location, offline city fallback, and '+(scaledMap?'map pan, selected address, nonblocking map-check failure.':'honest scaled-map-unavailable fallback.'));
}finally{await browser.close();}
