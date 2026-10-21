/* Five-stage project-demo recommender: site fit vs project fit, policies, gates, preferences, uncertainty,
   and browser/server/community alignment. No paid AI calls. */
import assert from 'node:assert/strict';
import {loadDemo,canonicalZones,baseProject,openClayZone} from './project-demo-harness.mjs';

const {R,A,P,E,window:w}=await loadDemo({engines:true});
const {zones}=await canonicalZones();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const siteSignature=r=>JSON.stringify(r.site);
let checks=0;const ok=(cond,msg)=>{assert.ok(cond,msg);checks++;};

// Stage 1 does not move when only the project type or project policies change.
const projectVariants=[baseProject,{...baseProject,type:'restoration'},{...baseProject,type:'other'},{...baseProject,rewilding:true},{...baseProject,publicAccess:false},
  {...baseProject,publicHarvest:true},{...baseProject,sightlines:true,character:'open'},{...baseProject,audience:'students'},{...baseProject,type:'restoration',restorationOrnamentals:true},{...baseProject,support:true}];
for(const zone of zones)for(const record of R.records){
  const reference=siteSignature(R.evaluate(record,zone,baseProject));
  for(const variant of projectVariants)ok(siteSignature(R.evaluate(record,zone,variant))===reference,'site fit changed with project for '+record.fixture_id);
}

// Stage 1 uses the same matrices as the audited v0.3 reference evaluator (which has Python parity).
for(const zone of zones)for(const record of R.records){
  const ours=R.evaluate(record,zone,baseProject),reference=A.evaluate(record,zone,{...baseProject,support:true});
  const ratio=id=>ours.site.criteria.find(c=>c.id===id).ratio;
  for(const id of ['soil','moisture','hydrology','light'])ok(ratio(id)===reference.component_ratios[id],record.fixture_id+' '+id+' ratio differs from v0.3');
  ok(ratio('disturbance_hardscape')===reference.component_ratios.disturbance_hardscape,record.fixture_id+' disturbance ratio differs');
  ok((ratio('maintenance')+ratio('vigour'))/2===reference.component_ratios.maintenance_vigour,record.fixture_id+' maintenance ratio differs');
  ok(ours.site.footprint_state===reference.placement.footprint_state,record.fixture_id+' footprint differs');
}

// Rewilding activates native, provenance and occurrence rules; known introduced plants cannot pass it.
const rewilding={...baseProject,rewilding:true},introduced=R.records.filter(r=>r.native_status_nl==='introduced');
ok(introduced.length===6,'six ornamental records are known introduced in the demo view');
const rw=R.evaluate(R.records[0],openClayZone,rewilding);
ok(rw.project.policies.some(p=>p.id==='rewilding'),'rewilding policy active');
ok(['native_status','provenance','regional_occurrence'].every(id=>rw.project.criteria.some(c=>c.id===id&&c.policy==='rewilding')),'rewilding checks native, provenance and occurrence');
ok(same(rw.project.priority_fields,['native_status_nl','provenance_status','regional_occurrence_nl']),'rewilding prioritises native, provenance, occurrence');
for(const record of introduced){
  const normal=R.evaluate(record,openClayZone,baseProject),wild=R.evaluate(record,openClayZone,rewilding);
  ok(normal.placeable&&normal.state!=='strong_fit','introduced plant allowed but ranked as at most a good fit outside rewilding: '+record.fixture_id+' '+normal.state);
  ok(wild.state==='excluded_project_rule'&&!wild.placeable,'introduced plant passed rewilding: '+record.fixture_id);
  ok(siteSignature(normal)===siteSignature(wild),'rewilding changed environmental fit');
  ok(/rewilding/i.test(wild.summary.text)&&/not native/i.test(wild.constraint.text),'rewilding exclusion explained');
}
// Equally suitable native plants rank above non-native ones.
const list=R.candidates([openClayZone],baseProject);
for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
  const a=list[i].recommendation,b=list[j].recommendation;
  if(a.state===b.state&&a.site.score===b.site.score)ok(a.project.priority[0]<=b.project.priority[0],'native-first order broken: '+a.fixture_id+' before '+b.fixture_id);
}
ok(list.findIndex(p=>p.nativeStatus==='introduced')>list.findIndex(p=>p.nativeStatus==='native_original'),'a native plant leads the list');

// Other project inputs activate their configured policies.
const activeFor=project=>R.evaluate(R.records[0],openClayZone,project).project.policies.map(p=>p.id);
ok(activeFor(baseProject).includes('public_access'),'public access policy');
ok(activeFor({...baseProject,audience:'students'}).includes('children'),'children policy');
ok(activeFor({...baseProject,maintenance:'low'}).includes('low_maintenance'),'low maintenance policy');
ok(activeFor({...baseProject,character:'open'}).includes('open_views')&&activeFor({...baseProject,sightlines:true}).includes('open_views'),'open views policy');
ok(activeFor({...baseProject,type:'restoration'}).includes('restoration'),'restoration policy');
ok(activeFor({...baseProject,publicHarvest:true}).includes('public_harvest'),'harvest policy');
ok(!activeFor({...baseProject,publicAccess:false}).includes('public_access'),'public access policy only when public');
ok(P.policies.every(p=>p.always||p.activatedBy),'every policy is configuration with an activation rule');
const byId=id=>R.records.find(r=>r.fixture_id===id);
ok(R.evaluate(byId('demo-core-37'),{...openClayZone,conditions:{...openClayZone.conditions,soil:'sand',path_edge:'yes'}},baseProject).state==='excluded_project_rule','thorny hawthorn excluded beside a public path');
ok(R.evaluate(byId('demo-core-52'),openClayZone,{...baseProject,audience:'students',support:true}).state==='excluded_project_rule','strongly toxic ivy excluded at a children’s site');
ok(R.evaluate(byId('demo-core-15'),openClayZone,{...baseProject,publicHarvest:true}).state==='excluded_project_rule','toxic record excluded from public harvesting');
ok(R.evaluate(byId('demo-core-44'),openClayZone,{...baseProject,maintenance:'low'}).state==='excluded_project_rule','high-maintenance birch excluded from low maintenance');
ok(R.evaluate(byId('demo-core-01'),openClayZone,{...baseProject,maintenance:'low',vigourControl:'no'}).state==='excluded_project_rule','uncontrolled high vigour excluded');
ok(R.evaluate(byId('demo-core-01'),openClayZone,{...baseProject,maintenance:'low',vigourControl:'yes'}).placeable,'declared spread control admits high vigour');
ok(R.evaluate(byId('demo-core-44'),openClayZone,{...baseProject,character:'open'}).state==='excluded_project_rule','tall tree excluded under open views');
ok(R.evaluate(byId('demo-core-51'),openClayZone,baseProject).state==='not_suitable','climber without support is not suitable');
ok(R.evaluate(byId('demo-core-51'),openClayZone,{...baseProject,support:true}).placeable,'climber with support is allowed');
ok(R.evaluate(byId('demo-ornamental-01'),openClayZone,{...baseProject,type:'restoration'}).state==='excluded_project_rule','restoration excludes ornamentals');
ok(R.evaluate(byId('demo-ornamental-01'),openClayZone,{...baseProject,type:'restoration',restorationOrnamentals:true}).placeable,'ornamental exception admits it');
ok(R.evaluate(byId('demo-core-18'),openClayZone,baseProject).state==='not_suitable','required water edge missing');
ok(R.evaluate(byId('demo-core-06'),{...openClayZone,conditions:{...openClayZone.conditions,hydrology:'permanent',waterEdge:'yes',moisture:'wet'}},baseProject).state==='not_suitable','permanent water needs permanent tolerance');
const smallSpace={...openClayZone,conditions:{...openClayZone.conditions,available_width_m:15,available_length_m:15,plantable_area_m2:225}};
ok(R.evaluate(byId('demo-core-45'),smallSpace,baseProject).state==='not_suitable','oak too large for the measured space');
ok(/too large/i.test(R.evaluate(byId('demo-core-45'),smallSpace,baseProject).constraint.text),'size gate explained');

// Hard gates cannot be rescued by design preferences.
const favourable=record=>({anchorColours:[record.flower_colour],desiredFlowerMonths:[record.flower_start_month,record.flower_end_month],priorities:['pollinators']});
const adversarial=[{...byId('demo-core-04'),fixture_id:'adv-listed',invasive_status:'listed_nl'},{...byId('demo-core-04'),fixture_id:'adv-prohibited',protected_or_legal_status:'legally_prohibited'},{...byId('demo-core-04'),fixture_id:'adv-contact',public_contact_status:'unsuitable'}];
for(const zone of [...zones,openClayZone])for(const record of [...R.records,...adversarial])for(const project of [baseProject,rewilding,{...baseProject,maintenance:'low'},{...baseProject,character:'open'}]){
  const plain=R.evaluate(record,zone,project);if(plain.placeable)continue;
  for(const character of ['mosaic','open','enclosed']){
    const preferred=R.evaluate(record,zone,{...project,...favourable(record),character:project.character==='open'?'open':character});
    ok(!preferred.placeable&&preferred.state===plain.state,'preference rescued '+record.fixture_id+' ('+plain.state+')');
  }
}
for(const record of adversarial)ok(!R.evaluate(record,openClayZone,{...baseProject,...favourable(record)}).placeable,record.fixture_id+' must stay excluded');

// Design preferences only reorder acceptable plants.
const prefsA={...baseProject,anchorColours:['yellow'],desiredFlowerMonths:[3,4],priorities:['pollinators'],character:'enclosed'};
const prefsB={...baseProject,anchorColours:['purple','blue'],desiredFlowerMonths:[8,9,10],priorities:[],character:'enclosed'};
for(const zone of zones){
  const a=R.candidates([zone],prefsA),b=R.candidates([zone],prefsB);
  ok(same(a.map(p=>p.id).sort(),b.map(p=>p.id).sort()),'design preference changed the acceptable set');
  const stateOf=new Map(b.map(p=>[p.id,p.recommendation.state]));
  ok(a.every(p=>stateOf.get(p.id)===p.recommendation.state),'design preference changed a state');
  const group=p=>p.recommendation.state+'|'+p.recommendation.site.score+'|'+p.recommendation.project.priority.join(',');
  ok(same(a.map(group),b.map(group)),'preferences may only reorder plants within the same fit, score and priority');
}

// Uncertainty examples produce understandable missing-information states, and never fill their gaps.
const expected={'uncertainty-01-native-status':'requires_review','uncertainty-02-invasive-legal':'excluded_missing_information','uncertainty-03-public-contact':'requires_review','uncertainty-04-toxicity':'requires_review','uncertainty-05-thorns':'requires_review','uncertainty-06-hydrology':'needs_information','uncertainty-07-size':'needs_information','uncertainty-08-provenance':'requires_review','uncertainty-10-several-decisive':'needs_information'};
const technical=/[a-z]+_[a-z]+|\bH\d{2}\b|synthetic|fallback|production|confidence|v0\.3|undefined|null/i;
for(const item of R.showcase([openClayZone],baseProject)){
  const r=item.recommendation,id=item.id;
  if(expected[id])ok(r.state===expected[id],id+' expected '+expected[id]+' got '+r.state);
  else ok(r.placeable&&r.constraint.kind==='information'&&/does not depend/.test(r.constraint.text),'regional occurrence gap is informational outside rewilding');
  ok(!r.placeable||id.includes('regional-occurrence'),id+' must not be placeable');
  ok(r.data.missing.length>=1&&item.example.unknown_fields.every(f=>r.data.missing.includes(f)),id+' lost its unknowns');
  ok(r.constraint&&r.constraint.text.length<200&&!technical.test(r.constraint.text)&&!technical.test(r.summary.text),id+' message not understandable: '+r.summary.text+' / '+r.constraint?.text);
}
const several=R.showcase([openClayZone],baseProject).find(p=>p.id==='uncertainty-10-several-decisive').recommendation;
ok(/cannot be ranked yet/.test(several.summary.text)&&/Several decisive facts/.test(several.constraint.text),'several-missing example explains itself');
const wildExamples=Object.fromEntries(R.showcase([openClayZone],rewilding).map(p=>[p.id,p.recommendation.state]));
ok(wildExamples['uncertainty-01-native-status']==='needs_information','rewilding needs native status');
ok(wildExamples['uncertainty-09-regional-occurrence']==='requires_review','rewilding reviews regional occurrence');
const privateSite=Object.fromEntries(R.showcase([openClayZone],{...baseProject,publicAccess:false}).map(p=>[p.id,p.recommendation]));
ok(['uncertainty-03-public-contact','uncertainty-04-toxicity','uncertainty-05-thorns'].every(id=>privateSite[id].placeable),'contact, toxicity and thorn gaps matter only with public access');

// "Add anyway": a user override lifts missing-information outcomes only. Unknown size stays unplaceable;
// known conflicts and project rules cannot be overridden; nothing changes without the override.
const exampleIds=R.examples.map(e=>e.fixture_id),SEVERE=['not_suitable','excluded_project_rule'];
ok(!R.evaluate(R.records[0],openClayZone,{...baseProject,overrideIds:exampleIds}).override.allowed,'normal plants are never overridden');
for(const project of [baseProject,rewilding]){
  const plain=Object.fromEntries(R.showcase([openClayZone],project).map(p=>[p.id,p.recommendation]));
  const forced=Object.fromEntries(R.showcase([openClayZone],{...project,overrideIds:exampleIds}).map(p=>[p.id,p.recommendation]));
  for(const id of exampleIds){
    const a=plain[id],b=forced[id],sizeUnknown=b.site.footprint_state==='unknown_plant_size';
    ok(!a.override.active&&a.placeable===(a.state.endsWith('_fit')),id+' override must be opt-in');
    ok(b.state===a.state&&b.label===a.label&&b.ranked===a.ranked,id+' override must not relabel or re-rank the plant');
    ok(a.override.allowed===(SEVERE.indexOf(a.state)<0),id+' every example is addable unless a known conflict or rule excludes it');
    if(a.override.allowed)ok(b.override.active&&b.placeable===!sizeUnknown,id+' override placement ('+b.state+')');
    else ok(!b.override.active&&b.placeable===a.placeable,id+' not overridable but changed');
  }
}
const sorbusExample='uncertainty-03-public-contact',birchExample='uncertainty-07-size';
const openViews=R.showcase([openClayZone],{...baseProject,character:'open',overrideIds:[sorbusExample]}).find(p=>p.id===sorbusExample).recommendation;
ok(openViews.state==='excluded_project_rule'&&!openViews.override.allowed&&!openViews.placeable,'override cannot lift a project rule');
const lowCare=R.showcase([openClayZone],{...baseProject,maintenance:'low',overrideIds:[birchExample]}).find(p=>p.id===birchExample).recommendation;
ok(!lowCare.override.allowed&&!lowCare.placeable,'override cannot lift a known maintenance conflict');
const clayOnly={...openClayZone,conditions:{...openClayZone.conditions,soil:'peat'}};
const soilClash=R.evaluate({...R.record('uncertainty-04-toxicity'),soil_tolerance:['sand']},clayOnly,{...baseProject,overrideIds:['uncertainty-04-toxicity']});
ok(soilClash.state==='not_suitable'&&!soilClash.override.allowed&&!soilClash.placeable,'override cannot lift an environmental mismatch');
ok(R.project({...baseProject,overrideIds:['demo-core-01','invented',sorbusExample]}).overrideIds.join()===sorbusExample,'only example IDs can be overridden');

// Communities, trees, browser and server use the same eligibility decisions.
const {validateContext}=await import('../server.mjs');
{
  const herb='uncertainty-04-toxicity',sized='uncertainty-07-size',project={...baseProject,overrideIds:[herb,sized]};
  const pool=[...R.candidates([openClayZone],project),...R.showcase([openClayZone],project).filter(p=>project.overrideIds.includes(p.id))];
  const boundary=[[0,0],[24,0],[24,20],[0,20]];
  const plan=E.generate({boundary,beds:[{polygon:boundary,zoneId:1}],waterBeds:[],paths:[],zones:[openClayZone],plants:pool,project,pathWidth:1.5});
  ok(plan.communities.some(c=>c.eligible.some(p=>p.id===herb)),'overridden plant with known size joins communities');
  ok(plan.communities.every(c=>!c.eligible.some(p=>p.id===sized))&&plan.placements.every(p=>p.plantId!==sized),'overridden plant without size is never placed');
  const c=plan.communities.find(x=>x.eligible.some(p=>p.id===herb));
  const context=over=>({version:'test',project:JSON.parse(JSON.stringify(R.project({...baseProject,overrideIds:over},'placement'))),zones:[{id:1,conditions:openClayZone.conditions}],geometry:[{type:'boundary',points:boundary},{type:'planting',zoneId:1,points:boundary}],species:[],communities:[{id:c.id,zoneId:1,bedIndex:0,zone:c.zone,band:c.band,shade:!!c.shade,area:Math.min(c.area,480),allowedIds:[herb],rows:[]}]});
  let accepted=true;try{validateContext(context([herb]));}catch{accepted=false;}
  ok(accepted,'server accepts the overridden plant when the override is sent');
  let rejected=false;try{validateContext(context([]));}catch{rejected=true;}
  ok(rejected,'server rejects the same plant without the override');
  rejected=false;try{validateContext({...context([herb]),project:{...context([herb]).project,overrideIds:'all'}});}catch{rejected=true;}
  ok(rejected,'server rejects malformed overrides');
}
for(const [label,zone,project] of [['public',openClayZone,baseProject],['rewilding',openClayZone,rewilding],['canonical-dry',zones[0],{...baseProject,maintenance:'low'}]]){
  const app={...zone,id:1},screened=R.screen([app],project),pool=screened.candidates;
  const boundary=[[0,-1],[24,-1],[24,20],[0,20]],bed=[[0,0],[24,0],[24,20],[0,20]];
  const plan=E.generate({boundary,beds:[{polygon:bed,zoneId:1}],waterBeds:[],paths:[[[0,-.75],[24,-.75]]],zones:[app],plants:pool,project,pathWidth:1.5});
  ok(plan.communities?.length>0,label+' produced no communities');
  const hiddenIds=new Set(screened.hidden.map(h=>h.id));
  ok(plan.communities.every(c=>c.eligible.every(p=>!hiddenIds.has(p.id)&&p.recommendation.placeable)),label+': excluded plant in a community');
  ok(plan.placements.every(p=>!hiddenIds.has(p.plantId)),label+': excluded plant placed');
  ok(plan.communities.every(c=>c.shareBasis==='plant_count'),label+': community shares are plant-count shares');
  if(label==='rewilding')ok(plan.placements.every(p=>!p.plantId.startsWith('demo-ornamental')),'introduced plants never placed under rewilding');
  const context={version:'test',project:JSON.parse(JSON.stringify(R.project(project,'placement'))),zones:[{id:1,conditions:zone.conditions}],geometry:[{type:'boundary',points:boundary},{type:'planting',zoneId:1,points:bed}],species:[],communities:[]};
  for(const c of plan.communities.slice(0,6)){
    const base={id:c.id,zoneId:1,bedIndex:0,zone:c.zone,band:c.band,shade:!!c.shade,area:Math.min(c.area,24*20),rows:[]};
    for(const plant of R.records.filter(r=>!['Trees','Climbers'].includes(r.group))){
      const browser=c.eligible.some(p=>p.id===plant.fixture_id);
      let server=true;try{validateContext({...context,communities:[{...base,allowedIds:[plant.fixture_id]}]});}catch{server=false;}
      if(pool.some(p=>p.id===plant.fixture_id))ok(browser===server,label+' '+c.band+': browser '+browser+' vs server '+server+' for '+plant.fixture_id);
      else ok(!browser&&!server,label+': a plant outside the palette was accepted for '+plant.fixture_id);
    }
  }
  for(const tree of pool.filter(p=>p.group==='Trees')){
    const fit=E.zoneFit(tree,{...app,geometry:{available_width_m:24,available_length_m:20,plantable_area_m2:480}},project);
    ok(fit.fit===R.evaluate(R.record(tree.id),app,project,{available_width_m:24,available_length_m:20,plantable_area_m2:480},'placement').placeable,'tree placement uses the recommender for '+tree.id);
  }
}
ok(typeof w.PlantscapesRecommender.communityFit==='function','recommender exposes community fit');

// Determinism and input-order independence.
ok(same(R.candidates(zones,baseProject).map(p=>p.id),R.candidates([...zones].reverse(),baseProject).map(p=>p.id)),'zone order changed ranking');
ok(same(R.evaluate(R.records[5],zones[1],baseProject),R.evaluate(R.records[5],zones[1],baseProject)),'evaluation not deterministic');

console.log(JSON.stringify({status:'passed',checks}));
