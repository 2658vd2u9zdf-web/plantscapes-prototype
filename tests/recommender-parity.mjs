/* JavaScript (browser + server) versus Python reference evaluator: every result field and every ranking.
   Cases: canonical zones, example inputs, eight location presets, all benchmark scenarios and adversarial
   variants, plus a deterministic sweep of contract vocabulary including unknown values.
   Run: node tests/recommender-parity.mjs   (needs python on PATH, or PYTHON=<interpreter>) */
import assert from 'node:assert/strict';
import {loadRuntime,readBenchmark,readJSON,runPython,variant,comparable,firstDifference} from './recommender-harness.mjs';

const {S}=await loadRuntime(),benchmark=await readBenchmark();
const canonical=await readJSON('dataset/location/canonical-scoring-inputs-v0_3.json'),examples=await readJSON('dataset/research/demo-v0_3/example-inputs.json'),presets=await readJSON('dataset/location/demo-location-presets-v0_3.json');
const cases=[
  ...canonical.zones.map(z=>({id:'canonical/'+z.zone_id,zone:z,project:canonical.project})),
  ...examples.zones.map(z=>({id:'example/'+z.zone_id,zone:z,project:examples.project})),
  ...presets.presets.map(p=>({id:'preset/'+p.preset_id,...p.default_demonstration_zone.evaluation_payload})),
  {id:'blank',zone:{zone_id:'blank'},project:{}}];
/* Deterministic sweep: every vocabulary value (including unknown) appears in many combinations. */
let seed=20261020;const next=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32,pick=list=>list[Math.floor(next()*list.length)];
const C=S.contract,dims=['unknown',0,0.5,1,3,8,12,40];
for(let i=0;i<80;i++){
  const zone={zone_id:'sweep-'+i};for(const [f,vocab] of Object.entries(C.zone_vocabulary))zone[f]=pick(vocab);for(const f of C.zone_numeric_or_unknown)zone[f]=pick(dims);
  const project={area:pick(['unknown',12,100,5000])};for(const [f,vocab] of Object.entries(C.project_vocabulary))project[f]=pick(vocab);for(const f of C.project_booleans)project[f]=next()<.5;
  for(const [f,vocab] of Object.entries(C.project_array_vocabulary))project[f]=vocab.filter(()=>next()<.25);
  cases.push({id:'sweep/'+i,zone,project});
}
const python={...await runPython(cases),...await runPython(null)};
let compared=0,rankings=0;const mismatches=[];
const check=(id,plants,zone,project)=>{
  const js=plants.map(p=>S.evaluate(p,zone,project)),py=python[id];
  assert.ok(py,'Python output missing for '+id);assert.equal(js.length,py.results.length,id+' record count');
  js.forEach((r,i)=>{
    const d=firstDifference(comparable(r),py.results[i]);if(d)mismatches.push(id+'/'+r.fixture_id+' '+d);
    for(const f of ['synthetic_derivations_json','evidence_claim_ids_json','field_resolutions_json','record_notes'])assert.deepEqual(r.profile_trace[f],plants[i][f],'evidence trace altered '+f);
    compared++;
  });
  const order=[...js.filter(r=>r.eligible_for_demo_ranking).sort(S.ranking).map(r=>r.fixture_id)];
  if(JSON.stringify(order)!==JSON.stringify(py.ranked))mismatches.push(id+' ranking order differs');rankings++;
};
for(const c of cases)check(c.id,S.plants,c.zone,c.project);
for(const s of benchmark.scenarios){
  check(s.id,S.plants,s.zone,s.project);
  for(const v of s.adversarial_variants||[])check(s.id+'~'+v.label,[variant(S.plants,v)],s.zone,s.project);
}
for(const m of mismatches.slice(0,20))console.log('MISMATCH '+m);
assert.equal(mismatches.length,0,mismatches.length+' JavaScript/Python mismatches');
console.log(`Passed: JavaScript and Python agree on ${compared} plant-zone evaluations (all result fields) and ${rankings} rankings.`);
