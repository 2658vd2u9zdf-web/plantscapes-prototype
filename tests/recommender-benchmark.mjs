/* Recommender benchmark: policy expectations for synthetic scenarios, hard gates, unknown values,
   evidence-confidence separation, ranking, design-preference isolation, communities and server revalidation.
   Run: node tests/recommender-benchmark.mjs   (PLANTSCAPES_ENGINE_ROOT=<dir> evaluates another engine copy)
   Prints every failed expectation and exits non-zero if any fail. */
import {loadRuntime,loadServer,readBenchmark,matches,variant,gateState,communityInput} from './recommender-harness.mjs';

const {S,A,E}=await loadRuntime(),server=await loadServer(),benchmark=await readBenchmark();
const failures=[],passed=[];
const fail=(id,message)=>failures.push(id+': '+message);
const ok=id=>passed.push(id);
const SHOW=process.env.VERBOSE?Infinity:4;
const ELIGIBLE=['strong_match','suitable','conditional_match'];
const COMPONENT_FIELD={soil:'soil',moisture:'moisture',hydrology:'hydrology',light:'light'};
const rankList=results=>results.filter(r=>r.eligible_for_demo_ranking).sort(S.ranking);
const evaluateAll=(plants,zone,project)=>plants.map(p=>S.evaluate(p,zone,project));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const conflictFor=(r,f)=>r.exclusion_reasons.some(x=>x.startsWith('Environmental conflict: '+f+'='));
const DESIGN_SETS=[{anchorColours:S.contract.project_array_vocabulary.anchorColours,desiredFlowerMonths:[1,2,3,4,5,6,7,8,9,10,11,12],priorities:['pollinators'],character:'enclosed'},{anchorColours:[],desiredFlowerMonths:[],priorities:[],character:'open'}];

function checkExpectation(exp,r,plant,scenario){
  const e=exp.expect,errors=[],has=code=>r.warnings.some(w=>w.code===code),capped=rule=>r.score_caps.some(c=>c.rule===rule);
  if(e.state_in&&!e.state_in.includes(r.eligibility_state))errors.push('state '+r.eligibility_state);
  if(e.state_not_in?.includes(r.eligibility_state))errors.push('state '+r.eligibility_state);
  if('eligible' in e&&r.eligible_for_demo_ranking!==e.eligible)errors.push('eligible '+r.eligible_for_demo_ranking);
  for(const [gate,want] of Object.entries(e.gate||{})){const got=gateState(r,gate);if(!(Array.isArray(want)?want:[want]).includes(got))errors.push(gate+'='+got);}
  if('final_max' in e&&r.final_suitability_score>e.final_max)errors.push('final '+r.final_suitability_score);
  if('final_equals' in e&&r.final_suitability_score!==e.final_equals)errors.push('final '+r.final_suitability_score);
  for(const code of e.warning||[])if(!has(code))errors.push('missing warning '+code);
  for(const code of e.warning_absent||[])if(has(code))errors.push('unexpected warning '+code);
  for(const rule of e.cap||[])if(!capped(rule))errors.push('missing cap '+rule);
  for(const rule of e.cap_absent||[])if(capped(rule))errors.push('unexpected cap '+rule);
  for(const [c,v] of Object.entries(e.ratio_max||{}))if(r.component_ratios[c]>v+1e-9)errors.push(c+' ratio '+r.component_ratios[c]);
  for(const [c,v] of Object.entries(e.ratio_min||{}))if(r.component_ratios[c]<v-1e-9)errors.push(c+' ratio '+r.component_ratios[c]);
  for(const f of e.conflict_reason_for||[])if(!conflictFor(r,f))errors.push('no conflict reason for '+f);
  for(const f of e.no_conflict_reason_for||[])if(conflictFor(r,f))errors.push('unknown '+f+' reported as conflict');
  if(e.quantity_state_in&&!e.quantity_state_in.includes(r.quantity.state))errors.push('quantity state '+r.quantity.state);
  if(e.footprint_state_in&&!e.footprint_state_in.includes(r.placement.footprint_state))errors.push('footprint '+r.placement.footprint_state);
  if(e.visibility_state_in&&!e.visibility_state_in.includes(r.placement.visibility_state))errors.push('visibility '+r.placement.visibility_state);
  if(e.quantity_within_zone_area){
    const area=scenario.zone.plantable_area_m2,q=r.quantity;
    if(q.approximate_stock_capacity>Math.floor(area/r.placement.spacing_m**2))errors.push('capacity above area/spacing²');
    if(q.spacing_rule!=='SPACE-01'||!/no mixed-plan allocation/.test(q.basis)||!r.placement.origins.pilot_spacing_m)errors.push('quantity not labelled as an approximate SPACE-01 estimate');
  }
  if(e.quantity_support_floor&&r.quantity.diagnostic_capacity_before_eligibility!==Math.floor(scenario.zone.support_length_m/r.placement.spacing_m))errors.push('support capacity '+r.quantity.diagnostic_capacity_before_eligibility);
  if(e.invariant_under){
    const other=S.evaluate(plant,{...scenario.zone,...e.invariant_under.zone},{...scenario.project,...e.invariant_under.project});
    for(const f of e.invariant_under.fields)if(!same(r[f],other[f]))errors.push(f+' changed under '+JSON.stringify(e.invariant_under));
  }
  if(e.lower_than_under){
    const other=S.evaluate(plant,{...scenario.zone,...e.lower_than_under.zone},{...scenario.project,...e.lower_than_under.project}),f=e.lower_than_under.field;
    if(!(r[f]<other[f]))errors.push(f+' '+r[f]+' not below '+other[f]);
  }
  return errors;
}

/* 1. Benchmark scenarios. */
for(const scenario of benchmark.scenarios){
  const variants=(scenario.adversarial_variants||[]).map(v=>({label:v.label,plant:variant(S.plants,v)}));
  const results=evaluateAll(S.plants,scenario.zone,scenario.project);
  const variantResults=Object.fromEntries(variants.map(v=>[v.label,{plant:v.plant,result:S.evaluate(v.plant,scenario.zone,scenario.project)}]));
  for(const exp of scenario.expectations){
    if(exp.ranking){
      const ranked=rankList(results),byId=new Map(S.plants.map(p=>[p.fixture_id,p])),known=new Set(['native_original','native_archaeophyte']);
      const bad=[];
      for(let i=0;i<ranked.length;i++)for(let j=i+1;j<ranked.length;j++){
        const a=ranked[i],b=ranked[j];
        if(a.final_suitability_score===b.final_suitability_score&&a.raw_suitability_score===b.raw_suitability_score&&!known.has(byId.get(a.fixture_id).native_status_nl)&&known.has(byId.get(b.fixture_id).native_status_nl))bad.push(a.scientific_name+' (#'+(i+1)+', native '+byId.get(a.fixture_id).native_status_nl+') above '+b.scientific_name+' (#'+(j+1)+')');
      }
      bad.length?fail(exp.id,bad.length+' unknown-native-before-native pairs, e.g. '+bad.slice(0,2).join('; ')):ok(exp.id);
      continue;
    }
    const subjects=exp.adversarial?[variantResults[exp.adversarial]]:S.plants.map((p,i)=>({plant:p,result:results[i]})).filter(x=>matches(x.plant,exp.select));
    if(subjects.length<(exp.min_matches||1)){fail(exp.id,'selector matched '+subjects.length+' < '+exp.min_matches);continue;}
    const bad=subjects.map(x=>({name:x.plant.scientific_name+(exp.adversarial?' ['+exp.adversarial+']':''),errors:checkExpectation(exp,x.result,x.plant,scenario)})).filter(x=>x.errors.length);
    bad.length?fail(exp.id,bad.length+'/'+subjects.length+' records fail, e.g. '+bad.slice(0,2).map(x=>x.name+' → '+x.errors.join(', ')).join(' | ')):ok(exp.id);
  }
  /* Scenario-wide invariants. */
  const all=[...results,...Object.values(variantResults).map(v=>v.result)],allPlants=[...S.plants,...variants.map(v=>v.plant)];
  const inv=scenario.id+'/invariants',errs=[];
  for(const r of all){
    if(r.production_eligible!==false||r.harvesting_allowed!==false)errs.push(r.fixture_id+' production/harvest');
    if(r.hard_gate_results.some(g=>g.triggered)&&(r.eligibility_state!=='excluded'||r.final_suitability_score!==0||r.eligible_for_demo_ranking))errs.push(r.fixture_id+' gate not enforced');
    if(r.final_suitability_score>r.raw_suitability_score)errs.push(r.fixture_id+' final above raw');
    if(r.eligible_for_demo_ranking!==ELIGIBLE.includes(r.eligibility_state))errs.push(r.fixture_id+' eligibility flag');
    for(const [component,field] of Object.entries(COMPONENT_FIELD))if(scenario.zone[field]==='unknown'&&(r.component_ratios[component]!==0||conflictFor(r,field)))errs.push(r.fixture_id+' unknown '+field+' scored or called conflict');
  }
  for(const [i,plant] of allPlants.entries())for(const prefs of DESIGN_SETS){
    const other=S.evaluate(plant,scenario.zone,{...scenario.project,...prefs}),r=all[i];
    for(const f of ['raw_suitability_score','final_suitability_score','eligibility_state','eligible_for_demo_ranking','hard_gate_results','score_caps','evidence_confidence_score'])if(!same(r[f],other[f]))errs.push(r.fixture_id+' design preference changed '+f);
  }
  if(!same(results,evaluateAll(S.plants,scenario.zone,scenario.project)))errs.push('non-deterministic evaluation');
  const ranked=rankList(results).map(r=>r.fixture_id);
  if(!same(ranked,rankList([...results].reverse()).map(r=>r.fixture_id)))errs.push('ranking depends on input order');
  if(ranked.some(id=>!results.find(r=>r.fixture_id===id).eligible_for_demo_ranking))errs.push('ineligible record ranked');
  errs.length?fail(inv,errs.slice(0,4).join('; ')+(errs.length>4?' … +'+(errs.length-4):'')):ok(inv);
}

/* 2. Every hard gate: triggered exclusions survive favourable design preferences; unknowns never pass. */
const base={zone_id:'gate_base',soil:'clay',moisture:'fresh',hydrology:'none',light:'sun',canopy:'no',disturbance:'low',hardscape:'no',waterEdge:'no',source:'survey',path_edge:'no',available_width_m:40,available_length_m:40,plantable_area_m2:1600,max_plant_height_m:'unknown',support_length_m:20};
const project={type:'landscape',area:5000,maintenance:'moderate',publicAccess:false,publicHarvest:false,sightlines:false,rewilding:false,support:true,character:'mosaic',restorationOrnamentals:false,vigourControl:'no',evaluation_stage:'placement',anchorColours:[],desiredFlowerMonths:[],priorities:[]};
const herb=S.plants.find(p=>p.fixture_id==='demo-core-08'),tree=S.plants.find(p=>p.group==='Trees'),climber=S.plants.find(p=>p.climbing_support_required),thorny=S.plants.find(p=>p.thorns_or_spines==='thorns_present'),edgePlant=S.plants.find(p=>p.water_edge_requirement==='required'),demanding=S.plants.find(p=>p.maintenance_demand==='high'&&p.vigour_or_spread_risk==='moderate');
const favour=p=>({anchorColours:[p.flower_colour],desiredFlowerMonths:Array.from({length:p.flower_end_month-p.flower_start_month+1},(_,i)=>p.flower_start_month+i),priorities:['pollinators'],character:'enclosed'});
const gateCases=[
  ['H01_IDENTITY',{...herb,scientific_name:'unknown'},base,{}],
  ['H02_INVASIVE_LEGAL',{...herb,invasive_status:'listed_eu'},base,{}],
  ['H02_INVASIVE_LEGAL',{...herb,invasive_status:'listed_nl'},base,{}],
  ['H02_INVASIVE_LEGAL',{...herb,invasive_status:'invasive_elsewhere'},base,{}],
  ['H02_INVASIVE_LEGAL',{...herb,protected_or_legal_status:'legally_prohibited'},base,{}],
  ['H03_WATER_EDGE',edgePlant,{...base,moisture:'wet',hydrology:'seasonal',waterEdge:'no'},{}],
  ['H04_PERMANENT_WATER',herb,{...base,moisture:'wet',hydrology:'permanent',waterEdge:'yes'},{}],
  ['H05_SUPPORT',climber,base,{support:false}],
  ['H06_PUBLIC_CONTACT',{...herb,public_contact_status:'unsuitable'},base,{publicAccess:true}],
  ['H07_WOODY_GEOMETRY',tree,{...base,available_width_m:2,available_length_m:2,plantable_area_m2:4},{}],
  ['H08_VIGOUR',{...herb,vigour_or_spread_risk:'high'},base,{maintenance:'low',vigourControl:'no'}],
  ['H09_NATIVE_POLICY',{...herb,native_status_nl:'introduced'},base,{rewilding:true}],
  ['H10_RESTORATION_POLICY',{...herb,native_status_nl:'introduced'},base,{type:'restoration'}],
  ['H11_PATH_THORNS',thorny,{...base,path_edge:'yes'},{}]];
for(const [gate,plant,zone,changes] of gateCases){
  const id='gate/'+gate+'/'+(plant===herb?'demo-core-08':plant.fixture_id)+'/'+JSON.stringify(changes),r=S.evaluate(plant,zone,{...project,...changes,...favour(plant)});
  const errs=[];
  if(gateState(r,gate)!=='excluded')errs.push(gate+'='+gateState(r,gate));
  if(r.final_suitability_score!==0||r.eligible_for_demo_ranking||rankList([r]).length)errs.push('design preference recovered an exclusion');
  if(!(r.raw_suitability_score>0))errs.push('diagnostic raw score lost');
  if(!r.exclusion_reasons.some(x=>x.startsWith(gate)))errs.push('exclusion reason missing');
  errs.length?fail(id,errs.join(', ')):ok(id);
}
const reviewCases=[
  ['H02_INVASIVE_LEGAL unknown invasive',herb,base,{},'H02_INVASIVE_LEGAL'],
  ['H04_PERMANENT_WATER unknown hydrology',herb,{...base,hydrology:'unknown'},{},'H04_PERMANENT_WATER'],
  ['H06_PUBLIC_CONTACT unreviewed contact',herb,base,{publicAccess:true},'H06_PUBLIC_CONTACT'],
  ['H07_WOODY_GEOMETRY unknown geometry',tree,{...base,available_width_m:'unknown'},{},'H07_WOODY_GEOMETRY'],
  ['H07_WOODY_GEOMETRY candidate misfit',tree,{...base,available_width_m:2,available_length_m:2,plantable_area_m2:4},{evaluation_stage:'candidate'},'H07_WOODY_GEOMETRY'],
  ['H08_VIGOUR unknown maintenance',{...herb,vigour_or_spread_risk:'high'},base,{maintenance:'unknown'},'H08_VIGOUR'],
  ['H09_NATIVE_POLICY unknown native',{...herb,native_status_nl:'unknown'},base,{rewilding:true},'H09_NATIVE_POLICY'],
  ['H10_RESTORATION_POLICY unknown native',{...herb,native_status_nl:'unknown'},base,{type:'restoration'},'H10_RESTORATION_POLICY'],
  ['H10_RESTORATION_POLICY override disclosed',{...herb,native_status_nl:'introduced'},base,{type:'restoration',restorationOrnamentals:true},'H10_RESTORATION_POLICY'],
  ['H11_PATH_THORNS unknown thorns',herb,{...base,path_edge:'yes'},{},'H11_PATH_THORNS'],
  ['H11_PATH_THORNS unknown path edge',thorny,{...base,path_edge:'unknown'},{},'H11_PATH_THORNS'],
  ['H11_PATH_THORNS candidate stage',thorny,{...base,path_edge:'yes'},{evaluation_stage:'candidate'},'H11_PATH_THORNS'],
  ['H12_MAINTENANCE_CAPACITY demand above capacity',demanding,base,{maintenance:'low'},'H12_MAINTENANCE_CAPACITY'],
  ['H12_MAINTENANCE_CAPACITY unknown capacity',demanding,base,{maintenance:'unknown'},'H12_MAINTENANCE_CAPACITY']];
for(const [label,plant,zone,changes,gate] of reviewCases){
  const r=S.evaluate(plant,zone,{...project,...changes}),state=gateState(r,gate);
  state==='requires_review'?ok('review/'+label):fail('review/'+label,gate+'='+state+' (unknown or unresolved input must not read as passed)');
}
{
  const r=S.evaluate({...herb,native_status_nl:'introduced'},base,{...project,type:'restoration',restorationOrnamentals:true});
  r.warnings.some(w=>w.code==='restoration_ornamental_exception')&&r.eligibility_state!=='excluded'?ok('review/H10 override warning'):fail('review/H10 override warning','override admitted an introduced record without a disclosure warning');
  const label=S.evaluate({...herb,native_status_nl:'introduced'},base,project);
  label.warnings.some(w=>w.code==='non_native_label')?ok('policy/G05 non-native label'):fail('policy/G05 non-native label','introduced record outside rewilding has no explicit non-native label');
}

/* 3. Unknown values never become safe, non-invasive, native or compatible, and reduce confidence. */
{
  const unknownAll={...herb};for(const f of ['invasive_status','protected_or_legal_status','provenance_status','public_contact_status','toxicity_status','edible_use_status','native_status_nl','thorns_or_spines'])unknownAll[f]='unknown';
  const r=S.evaluate(unknownAll,{...base,path_edge:'yes'},{...project,publicAccess:true,rewilding:true});
  const errs=[];
  if(r.final_suitability_score>54)errs.push('final '+r.final_suitability_score);
  for(const g of ['H02_INVASIVE_LEGAL','H06_PUBLIC_CONTACT','H09_NATIVE_POLICY','H11_PATH_THORNS'])if(gateState(r,g)!=='requires_review')errs.push(g+'='+gateState(r,g));
  if(!r.warnings.some(w=>w.code==='policy_or_safety_review_required'))errs.push('no review warning');
  if(!(r.confidence_factors.policy<1))errs.push('policy confidence not reduced');
  errs.length?fail('unknown/policy-values',errs.join(', ')):ok('unknown/policy-values');
  for(const field of ['soil','moisture','hydrology','light','disturbance','hardscape']){
    const known=S.evaluate(herb,base,project),unknown=S.evaluate(herb,{...base,[field]:'unknown'},project),e=[];
    const component=field==='disturbance'||field==='hardscape'?'disturbance_hardscape':field;
    if(!(unknown.component_ratios[component]<known.component_ratios[component]||known.component_ratios[component]===0))e.push('full points kept');
    if(!(unknown.evidence_confidence_score<known.evidence_confidence_score))e.push('confidence not reduced');
    if(!unknown.warnings.some(w=>w.code==='site_data_gap'))e.push('no site_data_gap warning');
    if(conflictFor(unknown,field)||unknown.score_caps.some(c=>c.rule==='known_environmental_conflict'))e.push('reported as conflict');
    if(!unknown.score_caps.some(c=>c.rule==='unknown_site'))e.push('no gap cap');
    e.length?fail('unknown/zone-'+field,e.join(', ')):ok('unknown/zone-'+field);
  }
  const allUnknown=S.evaluate(herb,{zone_id:'blank'},{});
  allUnknown.eligibility_state==='data_gap'&&!allUnknown.eligible_for_demo_ranking&&allUnknown.evidence_confidence_score===0?ok('unknown/all-inputs-blank'):fail('unknown/all-inputs-blank','state '+allUnknown.eligibility_state+', confidence '+allUnknown.evidence_confidence_score+' (missing inputs must read as a data gap, not unsuitable)');
  const conflictAndGap=S.evaluate(herb,{zone_id:'mixed',moisture:'wet',light:'shade'},{});
  conflictAndGap.eligibility_state==='unsuitable'?ok('unknown/known-conflict-still-unsuitable'):fail('unknown/known-conflict-still-unsuitable','known conflict with gaps became '+conflictAndGap.eligibility_state);
}

/* 4. Suitability and evidence confidence stay separate. */
{
  const weak=structuredClone(herb);for(const f of Object.keys(weak.field_confidence_json)){weak.field_confidence_json[f]=0;}
  const a=S.evaluate(herb,base,project),b=S.evaluate(weak,base,project),errs=[];
  for(const f of ['raw_suitability_score','final_suitability_score','eligibility_state','component_scores'])if(!same(a[f],b[f]))errs.push('evidence changed '+f);
  if(!(b.evidence_confidence_score<a.evidence_confidence_score))errs.push('confidence unused');
  const survey=S.evaluate(herb,{...base,source:'survey'},project),demo=S.evaluate(herb,{...base,source:'demo'},project);
  if(!same(survey.component_scores,demo.component_scores)||survey.evidence_confidence_score<=demo.evidence_confidence_score)errs.push('site source mixed into suitability');
  if('combined_score' in a||'overall_score' in a)errs.push('combined score present');
  errs.length?fail('confidence/separation',errs.join(', ')):ok('confidence/separation');
  /* A higher-confidence record must not be ordered after an otherwise identical lower-confidence record purely by colour. */
  const r1={...a,fixture_id:'z-high',evidence_confidence_score:40,design_preference_score:0},r2={...a,fixture_id:'a-low',evidence_confidence_score:10,design_preference_score:0};
  [r1,r2].sort(S.ranking)[0].fixture_id==='z-high'?ok('ranking/confidence-before-fixture-id'):fail('ranking/confidence-before-fixture-id','confidence ignored at equal design preference');
}

/* 5. Ranking determinism and tie-breaking. */
{
  const r=S.evaluate(herb,base,project),ids=['demo-b','demo-B','demo_a','demo-a','Demo-a'];
  const sorted=ids.map(id=>({...r,fixture_id:id})).sort(S.ranking).map(x=>x.fixture_id),codepoint=[...ids].sort();
  same(sorted,codepoint)?ok('ranking/codepoint-fixture-tie-break'):fail('ranking/codepoint-fixture-tie-break','locale-dependent order '+sorted.join(',')+' vs Python/codepoint '+codepoint.join(','));
}

/* 6. Communities contain only eligible plants and the server revalidates them identically. */
const wetEdgeZone={zone_id:'community_wet_edge',soil:'clay',moisture:'wet',hydrology:'edge',light:'sun',canopy:'no',disturbance:'low',hardscape:'no',waterEdge:'yes',source:'demo',path_edge:'unknown',available_width_m:24,available_length_m:20,plantable_area_m2:480,max_plant_height_m:'unknown',support_length_m:'unknown'};
const communityCases=[
  ['dry-sand',benchmark.scenarios.find(s=>s.id==='B01_dry_sunny_sand'),{},false],
  ['open-character',benchmark.scenarios.find(s=>s.id==='B04_wet_not_permanent'),{character:'open'},false],
  ['wet-edge-with-pond',{zone:wetEdgeZone,project:benchmark.scenarios[0].project},{publicAccess:false},true]];
for(const [label,scenario,changes,water] of communityCases){
  const appProject={...scenario.project,...changes},zone={...scenario.zone,available_width_m:24,available_length_m:20,plantable_area_m2:480};
  const pool=A.candidates([{id:1,name:label,conditions:zone}],appProject);
  const {input}=communityInput(zone,appProject,pool,{water});
  const plan=E.generate(input),errs=[],byId=new Map(S.plants.map(p=>[p.fixture_id,p]));
  if(plan.error||!plan.communities?.length){fail('community/'+label,'no community plan: '+(plan.error||'none'));continue;}
  const beds=[...input.beds,...input.waterBeds];
  for(const c of plan.communities){
    const bed=beds[c.bedIndex],xs=bed.polygon.map(p=>p[0]),ys=bed.polygon.map(p=>p[1]);
    const geometry={available_width_m:Math.max(...xs)-Math.min(...xs),available_length_m:Math.max(...ys)-Math.min(...ys),plantable_area_m2:E.area(bed.polygon)};
    for(const row of c.rows){
      const record=byId.get(row.plantId),result=A.evaluate(record,{id:1,conditions:zone},appProject,geometry,'placement');
      if(!result.eligible_for_demo_ranking)errs.push(row.plantId+' in '+c.band+' is '+result.eligibility_state);
      if(['Trees','Climbers'].includes(record.group))errs.push(row.plantId+' '+record.group+' mixed into a count recipe');
    }
    if(Math.abs(c.rows.reduce((n,r)=>n+r.percentage,0)-100)>1e-6)errs.push(c.id+' percentages');
    if(c.shareBasis!=='plant_count')errs.push(c.id+' share basis not declared (count share vs ground cover)');
  }
  /* Server revalidation: same membership as the browser for every operational plant. */
  const geometry=[{type:'boundary',points:input.boundary},...input.beds.map(b=>({type:'planting',zoneId:1,points:b.polygon})),...input.waterBeds.map(b=>({type:'water',zoneId:1,points:b.polygon}))];
  const context={version:'benchmark',project:JSON.parse(JSON.stringify(A.project(appProject,'placement'))),zones:[{id:1,conditions:zone}],geometry,species:pool.map(p=>({id:p.id})),communities:plan.communities.map(c=>({id:c.id,zoneId:1,bedIndex:c.bedIndex,zone:c.zone,band:c.band,shade:c.shade,area:c.area,allowedIds:c.eligible.map(p=>p.id),rows:c.rows.map(r=>({plantId:r.plantId,percentage:r.percentage}))}))};
  try{server.validateContext(context);}catch(e){errs.push('server rejected browser community: '+e.message);}
  for(const c of context.communities){
    const browser=new Set(c.allowedIds);
    for(const p of pool){
      if(browser.has(p.id))continue;
      let accepted=true;try{server.validateContext({...context,communities:[{...c,allowedIds:[p.id]}]});}catch{accepted=false;}
      if(accepted&&!(p.group==='Aquatic & marginal plants'&&bedTypeOf(geometry,c.bedIndex)==='planting'))errs.push('server accepts '+p.id+' ('+p.group+', h='+p.height+') that the browser keeps out of '+c.band+(bedTypeOf(geometry,c.bedIndex)==='water'?' water':' land')+' community');
    }
  }
  errs.length?fail('community/'+label,[...new Set(errs)].slice(0,SHOW).join('; ')+(new Set(errs).size>SHOW?' … +'+(new Set(errs).size-SHOW):'')):ok('community/'+label);
}
function bedTypeOf(geometry,index){const beds=[...geometry.filter(g=>g.type==='planting'),...geometry.filter(g=>g.type==='water')];return beds[index]?.type;}

/* 7. Production-ineligible status is preserved everywhere. */
{
  const pool=A.candidates([{id:1,name:'p',conditions:benchmark.scenarios[0].zone}],benchmark.scenarios[0].project);
  pool.length&&pool.every(p=>p.productionEligible===false&&p.evaluation.production_eligible===false)&&S.plants.every(p=>p.production_eligible===false)?ok('production/ineligible-preserved'):fail('production/ineligible-preserved','a production_eligible value changed');
}

for(const f of failures)console.log('FAIL '+f);
console.log(JSON.stringify({passed:passed.length,failed:failures.length,engine:process.env.PLANTSCAPES_ENGINE_ROOT||'repository',benchmark:benchmark.version,rules:S.rules.version}));
if(failures.length)process.exitCode=1;
