/* Project-demo data: 60 operationally complete plants, 10 controlled uncertainty examples, preserved archives. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {loadDemo,read,canonicalZones,baseProject} from './project-demo-harness.mjs';

const {S,D,R}=await loadDemo();
const UNKNOWN=new Set(['unknown','not_reviewed','not_assessed','conflicting']);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const blank=v=>v===undefined||v===null||v===''||(Array.isArray(v)&&!v.length)||(!Array.isArray(v)&&UNKNOWN.has(v));
const required=['soil_tolerance','moisture_tolerance','hydrology_tolerance','light_tolerance','disturbance_tolerance','hardscape_tolerance','mature_height_m','mature_spread_m','pilot_spacing_m','functional_layer','composition_role','maintenance_demand','vigour_or_spread_risk','climbing_support_required','native_status_nl','invasive_status','protected_or_legal_status','public_contact_status','toxicity_status','thorns_or_spines','provenance_status','regional_occurrence_nl'];

// 60 normal plants are operationally complete for every criterion the recommender consumes.
assert.equal(R.records.length,60);
assert.ok(required.every(f=>D.decision_fields.includes(f)),'decision field list covers the requested criteria');
for(const record of R.records){
  const missing=D.decision_fields.filter(f=>blank(record[f]));
  assert.equal(missing.join(','),'',record.fixture_id+' has decision-blocking unknowns');
  assert.equal(record.production_eligible,false,'production_eligible stays false internally');
  assert.equal(record.record_kind,'demo_complete');
}

// Internal provenance: every value keeps its real origin; demo fills carry a rule and never overwrite known data.
const base=new Map(S.plants.map(p=>[p.fixture_id,p]));
let filled=0;
for(const record of R.records){
  const original=base.get(record.fixture_id);
  for(const f of D.decision_fields){
    const origin=record.demo_value_origins[f];
    assert.ok(origin,record.fixture_id+' '+f+' has no origin');
    if(f in record.demo_fill_rules){
      filled++;
      const rule=D.rules[record.demo_fill_rules[f]];
      assert.ok(rule&&rule.field===f&&rule.set===record[f],record.fixture_id+' '+f+' fill rule mismatch');
      assert.ok(['demo_inference','synthetic_demo'].includes(origin),record.fixture_id+' '+f+' fill origin '+origin);
      assert.ok(f==='regional_occurrence_nl'||blank(original[f]),record.fixture_id+' '+f+' overwrote a known value');
    }else{
      assert.ok(same(record[f],original[f]),record.fixture_id+' '+f+' changed without a fill rule');
      assert.equal(origin,original.field_origins_json[f],record.fixture_id+' '+f+' lost its v0.3 origin');
    }
  }
  assert.ok(same(record.field_resolutions_json,original.field_resolutions_json),'v0.3 field resolutions remain attached');
}
assert.ok(filled>400,'demo fills are recorded per field');

// Ten controlled examples keep their intended unknowns and stay outside the normal set.
assert.equal(R.examples.length,10);
const intended=['native_status_nl','invasive_status','public_contact_status','toxicity_status','thorns_or_spines','hydrology_tolerance','pilot_spacing_m','provenance_status','regional_occurrence_nl'];
for(const f of intended)assert.ok(R.examples.some(e=>e.example.unknown_fields.includes(f)),'an example removes '+f);
assert.ok(R.examples.some(e=>e.example.unknown_fields.includes('mature_spread_m')));
assert.ok(R.examples.some(e=>e.example.unknown_fields.length>=4),'one example misses several decisive fields');
for(const e of R.examples){
  assert.ok(e.fixture_id.startsWith('uncertainty-')&&e.record_kind==='uncertainty_example');
  assert.ok(!R.records.some(r=>r.fixture_id===e.fixture_id));
  const source=R.records.find(r=>r.fixture_id===e.base_fixture_id);
  for(const f of D.decision_fields){
    if(e.example.unknown_fields.includes(f)){assert.equal(e[f],'unknown',e.fixture_id+' must keep '+f+' unknown');assert.equal(e.demo_value_origins[f],'unknown');}
    else assert.ok(same(e[f],source[f]),e.fixture_id+' '+f+' must match its base plant');
  }
}

// Examples never enter normal rankings, and computing them leaves the normal ranking untouched.
const {zones}=await canonicalZones();
for(const project of [baseProject,{...baseProject,rewilding:true},{...baseProject,publicAccess:false,maintenance:'low'}]){
  const before=R.screen(zones,project),ids=before.candidates.map(p=>p.id).join('|');
  assert.ok(![...before.candidates,...before.hidden].some(p=>p.id.startsWith('uncertainty-')),'examples leaked into the normal screen');
  R.showcase(zones,project);
  assert.equal(R.screen(zones,project).candidates.map(p=>p.id).join('|'),ids,'showcase changed the normal ranking');
  assert.equal(before.candidates.length+before.hidden.length,60);
}

// Research archives remain unchanged (LF-normalised SHA-256 captured by the build).
const archive=JSON.parse(await read('dataset/project-demo/archive-hashes-v0_3.json'));
assert.ok(Object.keys(archive.files).length>=20);
for(const [file,hash] of Object.entries(archive.files)){
  const bytes=await readFile(new URL('../'+file,import.meta.url));
  assert.equal(crypto.createHash('sha256').update(Buffer.from(bytes.toString('binary').replace(/\r\n/g,'\n'),'binary')).digest('hex'),hash,file+' changed');
}
// The v0.3 runtime bundle still carries the unfilled research values.
assert.equal(S.plants.filter(p=>p.invasive_status==='unknown').length,60,'the v0.3 bundle was not rewritten with demo values');

console.log(JSON.stringify({status:'passed',completePlants:60,demoFilledValues:filled,uncertaintyExamples:10,archivesUnchanged:Object.keys(archive.files).length}));
