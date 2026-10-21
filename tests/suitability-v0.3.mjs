import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const ctx={window:{}};
for(const f of ['website/data/operational-v0.3.generated.js','website/suitability-v0.3.js'])vm.runInNewContext(await read(f),ctx);
const E=ctx.window.PlantscapesSuitabilityV03;
const inputs=JSON.parse(await read('dataset/research/demo-v0_3/example-inputs.json'));
const saved=(await read('dataset/research/demo-v0_3/example-results/all-plant-zone-evaluations.jsonl')).trim().split(/\r?\n/).map(JSON.parse);
assert.equal(E.plants.length,60);
assert.equal(new Set(E.plants.map(p=>p.plant_id)).size,60);
assert.ok(E.plants.every(p=>p.production_eligible===false));
for(const p of E.plants){
  assert.equal(p.field_resolutions_json.pilot_spacing_m.operational_value_origin,'synthetic_fallback');
  assert.equal(p.invasive_status,'unknown');
  assert.equal(p.field_origins_json.invasive_status,'unknown');
}
let checked=0;
for(const expected of saved){
  const plant=E.plants.find(p=>p.fixture_id===expected.fixture_id);
  const zone=inputs.zones.find(z=>z.zone_id===expected.zone_id);
  const actual=JSON.parse(JSON.stringify(E.evaluate(plant,zone,inputs.project)));
  for(const key of Object.keys(expected))assert.deepEqual(actual[key],expected[key],`${expected.fixture_id}/${zone.zone_id}/${key}`);
  checked++;
}
assert.equal(checked,180);
console.log(`Passed: ${checked} canonical v0.3 evaluations, 60 records, provenance and policy state.`);
