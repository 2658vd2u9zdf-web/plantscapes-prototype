/* Writes a compact behaviour snapshot (rankings, scores, states, gates, confidence, exclusions, quantity,
   placement and community consequences) for the canonical zones and every benchmark scenario, plus a
   JavaScript/Python parity summary. Used to produce the before/after audit record.
   Run: node tests/recommender-audit-snapshot.mjs <out.json> [label]   (PLANTSCAPES_ENGINE_ROOT selects the engine) */
import {writeFile} from 'node:fs/promises';
import {loadRuntime,readBenchmark,readJSON,runPython,comparable,firstDifference,communityInput,ENGINE_ROOT} from './recommender-harness.mjs';

const [out,label='snapshot']=process.argv.slice(2);
if(!out)throw Error('Usage: node tests/recommender-audit-snapshot.mjs <out.json> [label]');
const {S,A,E}=await loadRuntime(),benchmark=await readBenchmark(),canonical=await readJSON('dataset/location/canonical-scoring-inputs-v0_3.json');
const cases=[...canonical.zones.map(z=>({id:'canonical/'+z.zone_id,zone:z,project:canonical.project,community:true})),...benchmark.scenarios.map(s=>({id:s.id,zone:s.zone,project:s.project,community:['B01_dry_sunny_sand','B04_wet_not_permanent','B07_low_maintenance_municipal'].includes(s.id)}))];
const python=await runPython(cases.map(({id,zone,project})=>({id,zone,project})));
const snapshot={label,engine:ENGINE_ROOT,rules_version:S.rules.version,benchmark_version:benchmark.version,cases:{}};

for(const c of cases){
  const results=S.plants.map(p=>S.evaluate(p,c.zone,c.project)),ranked=[...results.filter(r=>r.eligible_for_demo_ranking).sort(S.ranking)];
  const parity=results.map((r,i)=>firstDifference(comparable(r),python[c.id].results[i])).filter(Boolean);
  const pyOrder=python[c.id].ranked;
  const rows=Object.fromEntries(results.map(r=>[r.fixture_id,{
    name:r.scientific_name,group:r.group,rank:ranked.findIndex(x=>x.fixture_id===r.fixture_id)+1||null,
    raw:r.raw_suitability_score,final:r.final_suitability_score,state:r.eligibility_state,confidence:r.evidence_confidence_score,design:r.design_preference_score,
    gates:Object.fromEntries(r.hard_gate_results.filter(g=>g.state!=='passed').map(g=>[g.gate_id,g.state])),
    caps:r.score_caps.map(x=>x.rule),exclusions:r.hard_gate_results.some(g=>g.triggered)||r.eligibility_state!=='conditional_match'?r.exclusion_reasons:[],
    quantity:{capacity:r.quantity.approximate_stock_capacity,diagnostic:r.quantity.diagnostic_capacity_before_eligibility,state:r.quantity.state},
    placement:{footprint:r.placement.footprint_state,visibility:r.placement.visibility_state},
    warnings:[...new Set(r.warnings.map(w=>w.code))].sort()}]));
  const entry={zone:c.zone,project:c.project,counts:{},ranking:ranked.map(r=>r.fixture_id),rows,parity:{mismatches:parity.length+(JSON.stringify(ranked.map(r=>r.fixture_id))===JSON.stringify(pyOrder)?0:1),examples:parity.slice(0,3)}};
  for(const r of results)entry.counts[r.eligibility_state]=(entry.counts[r.eligibility_state]||0)+1;
  if(c.community){
    const zone={...c.zone,available_width_m:24,available_length_m:20,plantable_area_m2:480};
    const pool=A.candidates([{id:1,name:c.id,conditions:zone}],c.project);
    const water=zone.waterEdge==='yes'&&['permanent','edge','long','seasonal'].includes(zone.hydrology);
    const plan=E.generate(communityInput(zone,c.project,pool,{water}).input);
    const member=new Map();
    for(const com of plan.communities||[])for(const r of com.rows)member.set(r.plantId,[...(member.get(r.plantId)||[]),com.band+(com.shade?'-shade':'')+':'+r.percentage.toFixed(1)+'%']);
    entry.community={error:plan.error||null,communities:(plan.communities||[]).map(com=>({band:com.band,shade:com.shade,area:Math.round(com.area),total:com.total,species:com.rows.length,shareBasis:com.shareBasis??null,rows:com.rows.map(r=>({id:r.plantId,pct:Number(r.percentage.toFixed(2)),count:r.count,areaPct:r.spacingAreaShare===undefined?null:Number(r.spacingAreaShare.toFixed(2))}))})),
      trees:(plan.placements||[]).filter(p=>p.tree).map(p=>p.plantId),
      consequence:Object.fromEntries(pool.map(p=>[p.id,member.get(p.id)||(p.group==='Trees'?((plan.placements||[]).some(x=>x.tree&&x.plantId===p.id)?'placed as individual tree':'tree not placed'):p.group==='Climbers'?'climber: not placed (no mapped support placement)':p.group==='Aquatic & marginal plants'?'aquatic: shoreline only':'not in any community (band/height/shade filters or zone fit)')]))};
  }
  snapshot.cases[c.id]=entry;
}
await writeFile(out,JSON.stringify(snapshot,null,1));
console.log(JSON.stringify({label,cases:cases.length,parityMismatches:Object.values(snapshot.cases).reduce((n,c)=>n+c.parity.mismatches,0),out}));
