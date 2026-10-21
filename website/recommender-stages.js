/* Project-demo recommender. Five explicit stages over the complete demonstration records:
   1 site fit, 2 project fit, 3 safety and legal gates, 4 design preference, 5 data status.
   Environmental matrices and weights are the v0.3 rules; project policies come from project-policies.js.
   Shared unchanged by the browser and the local Node server. production_eligible stays false. */
(function(root){
  'use strict';
  const S=root.PlantscapesSuitabilityV03,A=root.PlantscapesRuntimeV03,D=root.PLANTSCAPES_PROJECT_DEMO,P=root.PLANTSCAPES_PROJECT_POLICIES;
  if(!S||!A||!D||!P)throw Error('Load the v0.3 bundle, evaluator, runtime adapter, project-demo view and project policies first.');
  const R=S.rules,M=R.compatibility_matrices,WEIGHT=Object.fromEntries(Object.entries(R.components).map(([k,v])=>[k,v.weight]));
  const UNKNOWN=new Set(P.unknown_values),isUnknown=v=>v===undefined||v===null||UNKNOWN.has(v);
  const list=v=>Array.isArray(v)?v:[v];
  const SEVERITY={not_applicable:0,not_entered:0,match:1,info:2,partial:3,review:4,unknown:5,needs_information:5,missing_mandatory:6,project_rule:7,not_suitable:8};
  const STATES={
    strong_fit:{label:'Strong fit',icon:'✓',order:0},good_fit:{label:'Good fit',icon:'✓',order:1},partial_fit:{label:'Partial fit',icon:'~',order:2},
    requires_review:{label:'Requires review',icon:'?',order:3},needs_information:{label:'Needs information',icon:'?',order:4},
    excluded_missing_information:{label:'Excluded: information missing',icon:'?',order:5},excluded_project_rule:{label:'Excluded by project rule',icon:'×',order:6},
    not_suitable:{label:'Not suitable',icon:'×',order:7}
  };
  const PLACEABLE=new Set(['strong_fit','good_fit','partial_fit']);

  /* Plain words for site and plant values. */
  const WORDS={
    soil:{sand:'sandy',clay:'clay',peat:'peaty',made:'made-ground'},
    moisture:{dry:'dry',fresh:'fresh',wet:'wet',variable:'variable'},
    light:{sun:'full sun',mixed:'mixed light',shade:'shade'},
    hydrology:{none:'no flooding',seasonal:'seasonal flooding',long:'long wet periods',permanent:'permanent shallow water',edge:'a water edge'},
    disturbance:{low:'light use',moderate:'moderate use',high:'heavy use'}
  };
  const or=values=>values.length<2?values.join(''):values.slice(0,-1).join(', ')+' or '+values.at(-1);
  const and=values=>values.length<2?values.join(''):values.slice(0,-1).join(', ')+' and '+values.at(-1);
  function metres(n){
    if(typeof n!=='number'||!Number.isFinite(n))return 'unknown';
    const v=n>=10?Math.round(n):n>=1?Math.round(n*10)/10:Math.round(n*20)/20;
    return String(Number(v.toFixed(2)))+' m';
  }
  const lowerFirst=s=>s.charAt(0).toLowerCase()+s.slice(1);

  /* Stage 0: records. The normal view merges the demo fills over the untouched v0.3 records. */
  const base=new Map(S.plants.map(p=>[p.fixture_id,p]));
  const complete=new Map(D.plants.map(view=>{
    const record=base.get(view.fixture_id);
    return [view.fixture_id,Object.freeze({...record,...view.values,record_kind:'demo_complete',demo_value_origins:{...record.field_origins_json,...view.origins},demo_fill_rules:{...view.rules}})];
  }));
  const examples=new Map(D.uncertainty_examples.map(spec=>{
    const record=complete.get(spec.base_fixture_id),unknown=Object.fromEntries(spec.unknown_fields.map(f=>[f,'unknown']));
    return [spec.example_id,Object.freeze({...record,...unknown,fixture_id:spec.example_id,base_fixture_id:spec.base_fixture_id,record_kind:'uncertainty_example',example:spec,demo_value_origins:{...record.demo_value_origins,...Object.fromEntries(spec.unknown_fields.map(f=>[f,'unknown']))}})];
  }));
  const recordFor=id=>complete.get(id)||examples.get(id);

  /* overrideIds: missing-information examples the user chose to add anyway. Only example IDs are accepted. */
  function project(p={},stage='candidate'){return {...A.project(p,stage),audience:p.audience||'unspecified',overrideIds:(Array.isArray(p.overrideIds)?p.overrideIds:[]).filter(id=>examples.has(id))};}
  const when=(condition,value)=>Object.entries(condition).every(([key,allowed])=>key==='any'?allowed.some(c=>when(c,value)):allowed.includes(value[key]));

  /* Stage 1: can this plant grow in the entered conditions? Project type is never read here. */
  function siteFit(plant,z,p){
    const criteria=[];
    const add=(id,label,ratio,{plantUnknown=false,siteUnknown=false,environmental=true,weight=0,text,detail='',message=''})=>{
      const status=plantUnknown?'unknown':siteUnknown?'not_entered':ratio===1?'match':ratio===0?'mismatch':'partial';
      const defaults={match:'Matches',partial:'Partial match',mismatch:'Does not match',unknown:'Information needed',not_entered:'Not entered for this site'};
      criteria.push({id,label,group:['size','spacing','maintenance','vigour'].includes(id)?'space':'growing',stage:'site',status,environmental,weight:status==='match'||status==='partial'||status==='mismatch'?weight:0,ratio:status==='unknown'||status==='not_entered'?null:ratio,
        text:(text&&text[status])||defaults[status],detail,message:status==='match'?'':message,severity:status==='mismatch'?(environmental?8:3):SEVERITY[status]});
    };
    const words=(field,values)=>or(list(values).map(v=>WORDS[field][v]||v));
    for(const [id,label,field,site] of [['soil','Soil','soil_tolerance','soil'],['moisture','Moisture','moisture_tolerance','moisture'],['light','Light','light_tolerance','light'],['hydrology','Water levels','hydrology_tolerance','hydrology']]){
      const value=plant[field],plantUnknown=isUnknown(value),siteUnknown=z[site]==='unknown';
      let ratio=plantUnknown||siteUnknown?0:Math.max(...value.map(v=>M[id][v][z[site]]));
      let message=plantUnknown?{soil:'Its soil needs are not known.',moisture:'Its moisture needs are not known.',light:'Its light needs are not known.',hydrology:'How much flooding this plant tolerates is not known, so its site fit cannot be judged.'}[id]
        :id==='light'?'Needs '+words('light',value)+', but this site has '+WORDS.light[z.light]+'.'
        :id==='hydrology'?'Copes with '+words('hydrology',value)+', but this site has '+WORDS.hydrology[z.hydrology]+'.'
        :id==='soil'?'Needs '+words('soil',value)+' soil, but this site has '+(WORDS.soil[z.soil]||z.soil)+' soil.'
        :'Needs '+words(site,value)+' ground, but this site is '+(WORDS[site][z[site]]||z[site])+'.';
      const permanentGate=id==='hydrology'&&!plantUnknown&&z.hydrology==='permanent'&&!value.includes('permanent');
      if(permanentGate)message='Cannot grow in permanent standing water.';
      const before=criteria.length;
      add(id,label,ratio,{plantUnknown,siteUnknown,weight:WEIGHT[id],detail:plantUnknown?'':(id==='hydrology'?'copes with ':'grows in ')+words(site,value)+(id==='soil'?' soil':id==='moisture'?' ground':''),message});
      if(permanentGate)Object.assign(criteria[before],{status:'mismatch',text:'Does not match',severity:8,message});
      if(!siteUnknown&&!(id==='hydrology'&&z.hydrology==='none'))criteria[before].siteWord=id==='soil'?WORDS.soil[z.soil]+' soil':id==='moisture'?WORDS.moisture[z.moisture]+' moisture':id==='hydrology'?WORDS.hydrology[z.hydrology]:WORDS.light[z.light];
      if(!plantUnknown&&!siteUnknown&&ratio>0&&ratio<1)criteria[before].message='Only partly suited to '+(id==='light'?WORDS.light[z.light]:id==='hydrology'?WORDS.hydrology[z.hydrology]:(WORDS[site][z[site]]||z[site])+' '+(id==='soil'?'soil':'ground'))+'.';
    }
    const requirement=plant.water_edge_requirement;
    if(requirement!=='not_required'){
      const edge=z.waterEdge==='yes'&&['seasonal','long','permanent','edge'].includes(z.hydrology);
      criteria.push({id:'water_edge',label:'Water edge',group:'growing',stage:'site',environmental:requirement==='required',weight:0,ratio:edge?1:requirement==='required'?0:.5,
        status:edge?'match':requirement==='required'?'mismatch':'partial',severity:edge?1:requirement==='required'?8:3,
        text:edge?'Water edge present':requirement==='required'?'Needs a water edge':'Prefers a water edge',detail:'',
        message:edge||requirement!=='required'?'':'This plant requires a water edge, but no water edge is present.'});
    }
    const parts=[['disturbance','disturbance_tolerance'],['hardscape','hardscape_tolerance']].filter(([site])=>z[site]!=='unknown');
    const ratios=parts.map(([site,field])=>Math.max(...list(plant[field]).map(v=>M[site][v][z[site]])));
    const failed=parts.find((part,i)=>ratios[i]===0);
    add('disturbance_hardscape','Use and paving',ratios.length?ratios.reduce((a,b)=>a+b,0)/ratios.length:0,{siteUnknown:!parts.length,weight:WEIGHT.disturbance_hardscape*parts.length/2,
      message:failed?.[0]==='disturbance'?'Cannot cope with the '+WORDS.disturbance[z.disturbance]+' on this site.':failed?'Should not be planted against paving or walls.':'Only partly suited to the use or paving on this site.',
      detail:parts.length<2?(parts.length?'only '+(parts[0][0]==='disturbance'?'use':'paving')+' entered':''):''});
    if(ratios.length&&ratios.some(r=>r===0)&&criteria.at(-1).status!=='mismatch')Object.assign(criteria.at(-1),{status:'mismatch',text:'Does not match',severity:8});
    // Footprint screen, identical to the v0.3 spatial rule: woody plants use spread, others spacing; climbers also need support length.
    const woody=['Trees','Shrubs'].includes(plant.group),sizeUnknown=[plant.mature_height_m,plant.mature_spread_m,plant.pilot_spacing_m].some(isUnknown);
    const footprint=woody?plant.mature_spread_m:plant.pilot_spacing_m,support=plant.climbing_support_required===true;
    const dims=[z.available_width_m,z.available_length_m,z.plantable_area_m2],geometryKnown=dims.every(v=>v!=='unknown')&&(!support||z.support_length_m!=='unknown');
    const fits=!sizeUnknown&&geometryKnown&&dims[0]>=footprint&&dims[1]>=footprint&&dims[2]>=footprint**2&&(!support||z.support_length_m>=plant.pilot_spacing_m);
    const footprintState=sizeUnknown?'unknown_plant_size':fits?'fits':geometryKnown?'does_not_fit':'unknown_geometry';
    add('size','Mature size',fits?1:0,{plantUnknown:sizeUnknown,siteUnknown:!sizeUnknown&&!geometryKnown,weight:.8*WEIGHT.spatial,
      text:{match:'Fits the space',mismatch:'Too large for the space',not_entered:'Space not measured yet'},
      detail:sizeUnknown?'':metres(plant.mature_height_m)+' tall, '+metres(plant.mature_spread_m)+' wide',
      message:sizeUnknown?'Its mature spread and planting distance are not known, so the system cannot check whether it fits or how many are needed.':'Too large for the available space: it needs about '+metres(footprint)+' across.'});
    add('spacing','Spacing',1,{plantUnknown:isUnknown(plant.pilot_spacing_m),environmental:false,text:{match:metres(plant.pilot_spacing_m)+' apart'},message:'Its planting distance is not known.'});
    const capacity=p.maintenance,capacityUnknown=capacity==='unknown';
    const maintenance=capacityUnknown?0:M.maintenance[plant.maintenance_demand][capacity];
    let vigour=capacityUnknown?0:M.vigour[plant.vigour_or_spread_risk][capacity];
    if(plant.vigour_or_spread_risk==='high'&&p.vigourControl==='yes')vigour=capacity==='low'?.5:capacityUnknown?0:1;
    add('maintenance','Maintenance',maintenance,{siteUnknown:capacityUnknown,environmental:false,weight:WEIGHT.maintenance_vigour/2,detail:plant.maintenance_demand+' care',
      text:{match:'Suitable',partial:'Needs some extra care',mismatch:'Needs more care than planned',not_entered:'Maintenance level not chosen'},message:'Needs more care than the planned maintenance level.'});
    add('vigour','Spread',vigour,{siteUnknown:capacityUnknown,environmental:false,weight:WEIGHT.maintenance_vigour/2,detail:plant.vigour_or_spread_risk+' vigour',
      text:{match:'Suitable',partial:'May spread; needs some control',mismatch:'Spreads strongly',not_entered:'Maintenance level not chosen'},message:'Spreads strongly for the planned maintenance level.'});
    const scored=criteria.filter(c=>c.weight>0),total=scored.reduce((n,c)=>n+c.weight,0);
    const score=total?Math.round(scored.reduce((n,c)=>n+c.weight*c.ratio,0)/total*10000)/100:null;
    const level=criteria.some(c=>c.severity===8)?'not_suitable':criteria.some(c=>c.status==='unknown')?'needs_information':score===null?'partial':score>=R.thresholds.strong_match?'strong':score>=R.thresholds.suitable?'good':'partial';
    return {criteria,score,level,footprint_state:footprintState};
  }

  /* Stage 2 and 3: project policies from configuration, including their exclusions. */
  function projectFit(plant,z,p){
    const policies=P.policies.filter(policy=>policy.always||when(policy.activatedBy,p)),criteria=new Map(),rows=[];
    for(const policy of policies){
      let worst=null;
      for(const rule of policy.rules){
        if(rule.when&&!((!rule.when.project||when(rule.when.project,p))&&(!rule.when.zone||when(rule.when.zone,z))))continue;
        let entry;
        if(rule.kind==='max_height'){
          const height=plant[rule.field],limit=z.max_plant_height_m!=='unknown'?z.max_plant_height_m:P.open_view_height_m;
          entry=isUnknown(height)?{outcome:'needs_information',text:'Information needed',message:'Its mature height is not known.'}:height>limit?rule.above:rule.within;
          entry={...entry,message:(entry.message||'').replace('{height}',metres(height)).replace('{limit}',metres(limit)),detail:'limit '+metres(limit)};
        }else{
          const value=plant[rule.field],key=isUnknown(value)?'unknown':String(value);
          entry=rule.values[key]||(key!=='unknown'&&rule.values['*']);
          if(!entry)continue;
        }
        const definition=P.criteria[rule.criterion],item={id:rule.criterion,label:definition.label,group:definition.group,stage:'project',policy:policy.id,status:entry.outcome,severity:SEVERITY[entry.outcome],text:entry.text,detail:entry.detail||'',message:entry.message||''};
        const previous=criteria.get(rule.criterion);
        if(!previous||item.severity>=previous.severity)criteria.set(rule.criterion,item);
        if(!worst||item.severity>worst.severity)worst=item;
      }
      if(policy.showRow&&worst){
        const text={match:'Meets policy',not_applicable:'Not applicable',info:'Meets policy',partial:'Partly meets policy',review:'Requires review',needs_information:'Information needed',missing_mandatory:'Information needed',project_rule:'Excluded by policy',not_suitable:'Excluded by policy'}[worst.status];
        rows.push({id:'policy:'+policy.id,label:policy.label,group:'project',stage:'project',policy:policy.id,status:worst.status,severity:worst.severity,text,detail:'',message:worst.message});
      }
    }
    const fields=[...new Set(policies.flatMap(policy=>policy.priority||[]))];
    const priority=fields.map(f=>P.priority_tiers[f][isUnknown(plant[f])?'unknown':plant[f]]??1);
    return {policies:policies.map(policy=>({id:policy.id,label:policy.label})),criteria:[...criteria.values()],rows,priority,priority_fields:fields};
  }

  /* Stage 4: design preference. Same terms as the v0.3 rules; it only reorders acceptable plants. */
  function design(plant,p){
    const terms={};
    if(p.anchorColours.length)terms.colour=p.anchorColours.includes(plant.flower_colour)?1:0;
    if(p.desiredFlowerMonths.length){const months=[...new Set(p.desiredFlowerMonths)];terms.months=months.filter(m=>m>=plant.flower_start_month&&m<=plant.flower_end_month).length/months.length;}
    if(p.priorities.includes('pollinators'))terms.pollinator=['nectar_reported','pollinator_visitation_reported'].includes(plant.pollinator_value)?1:plant.pollinator_value==='pilot_potential'?.5:0;
    const role=plant.composition_role;
    terms.character_role=p.character==='mosaic'?.5:p.character==='open'&&role==='woody_framework'?0:p.character==='enclosed'&&role==='woody_framework'||p.character==='open'&&role!=='woody_framework'?1:.5;
    const values=Object.values(terms);
    return {score:Math.round(100*values.reduce((a,b)=>a+b,0)/values.length*100)/100,components:terms};
  }

  const ORDER_IN_GROUP=['soil','moisture','light','hydrology','water_edge','disturbance_hardscape','size','spacing','maintenance','vigour','climbing_support','native_status','provenance','regional_occurrence','height_limit','invasive_legal','public_contact','toxicity','thorns','edible_use'];
  function evaluate(record,zoneInput,projectInput,geometry={},stage='candidate'){
    const z=A.zone(zoneInput,geometry),p=project(projectInput,stage);
    S.normalize(z,p);
    const site=siteFit(record,z,p),fit=projectFit(record,z,p),pref=design(record,p);
    /* One display row per criterion: the more severe of the site and project readings. */
    const merged=new Map();
    for(const c of [...site.criteria,...fit.criteria]){const prev=merged.get(c.id);if(!prev||c.severity>=prev.severity)merged.set(c.id,c);}
    const criteria=[...merged.values()].sort((a,b)=>ORDER_IN_GROUP.indexOf(a.id)-ORDER_IN_GROUP.indexOf(b.id)).concat(fit.rows);
    const all=[...criteria];
    const worst=Math.max(...all.map(c=>c.severity));
    const gates=all.filter(c=>c.severity>=6).map(c=>({id:c.stage+':'+(c.policy?c.policy+':':'')+c.id,criterion:c.id,outcome:c.severity===8?'not_suitable':c.severity===7?'project_rule':'missing_mandatory',message:c.message}));
    const projectPartial=all.some(c=>c.stage==='project'&&c.status==='partial');
    let state=worst===8?'not_suitable':worst===7?'excluded_project_rule':worst===6?'excluded_missing_information':worst===5?'needs_information':worst===4?'requires_review':
      site.level==='strong'?'strong_fit':site.level==='good'?'good_fit':'partial_fit';
    if(state==='strong_fit'&&projectPartial)state='good_fit';
    // One constraint: the most severe problem; below review level, missing information before partial matches.
    const missingFacts=all.filter(c=>c.severity===5);
    let key=(worst>=4?all.find(c=>c.severity===worst&&c.message):null)||all.find(c=>c.status==='info'&&c.message)||all.find(c=>c.status==='partial'&&c.message)||null;
    if(worst===5&&missingFacts.length>1)key={severity:5,message:'Several decisive facts are missing: '+and([...new Set(missingFacts.map(c=>lowerFirst(c.label)))])+'.'};
    const constraint=key&&{kind:{8:'not_suitable',7:'excluded',6:'information',5:'information',4:'review',3:'important',2:'information'}[key.severity]||'important',
      label:{8:'Not suitable',7:'Excluded',6:'Information needed',5:'Information needed',4:'Requires review',3:'Important',2:'Information needed'}[key.severity]||'Important',text:key.message};
    const missing=D.decision_fields.filter(f=>isUnknown(record[f]));
    // A user override lifts missing-information outcomes only; known conflicts and project rules stay enforced.
    // Without a known size the plant can be listed but never placed in a plan.
    const overridable=record.record_kind==='uncertainty_example'&&worst<=6,overrideActive=overridable&&p.overrideIds.includes(record.fixture_id),sizeKnown=site.footprint_state!=='unknown_plant_size';
    const placeable=PLACEABLE.has(state)||overrideActive&&sizeKnown;
    const result={fixture_id:record.fixture_id,record_kind:record.record_kind,base_fixture_id:record.base_fixture_id||record.fixture_id,scientific_name:record.scientific_name,dutch_name:record.dutch_name,group:record.group,zone_id:z.zone_id,stage,
      state,label:STATES[state].label,icon:STATES[state].icon,placeable,ranked:PLACEABLE.has(state),eligible_for_demo_ranking:placeable,
      override:{allowed:overridable,active:overrideActive,placeable:overrideActive&&sizeKnown,
        note:!overridable?'':overrideActive?(sizeKnown?'Added by you although information is missing. It can be used in plans.':'Added by you although information is missing. It stays in your list but cannot be placed until its size is known.'):'You can add it to your selection anyway.'},
      site:{score:site.score,level:site.level,footprint_state:site.footprint_state,criteria:site.criteria},
      project:{policies:fit.policies,criteria:fit.criteria,rows:fit.rows,priority:fit.priority,priority_fields:fit.priority_fields},
      gates,design:pref,criteria,constraint,
      data:{record_kind:record.record_kind,complete:!missing.length,missing,origins:Object.fromEntries(D.decision_fields.map(f=>[f,record.demo_value_origins[f]||'unknown'])),demo_filled:Object.keys(record.demo_fill_rules||{}),production_eligible:false},
      production_eligible:false};
    result.summary=summary(result,site,fit);
    return result;
  }
  function summary(result,site,fit){
    const matched=site.criteria.filter(c=>c.status==='match'&&c.siteWord);
    const blocking=result.criteria.filter(c=>c.severity>=4&&c.severity<=6&&!c.id.startsWith('policy:')),labels=[...new Set(blocking.map(c=>lowerFirst(c.label)))];
    const siteOk=!site.criteria.some(c=>c.severity>=5),plural=labels.length>1||['thorns','water levels'].includes(labels[0]);
    switch(result.state){
      case 'not_suitable':{const c=result.criteria.find(x=>x.severity===8);return {kind:'not_suitable',text:'Why it is not suitable: '+(c.stage==='site'?'the '+lowerFirst(c.label)+' does not match this site.':lowerFirst(c.text)+'.')};}
      case 'excluded_project_rule':{const c=result.criteria.find(x=>x.severity===7),policy=fit.policies.find(x=>x.id===c.policy);return {kind:'excluded',text:'Why it is excluded: '+(siteOk?'the site conditions suit it, but ':'')+'the '+lowerFirst(policy.label)+' rules it out.'};}
      case 'excluded_missing_information':return {kind:'excluded',text:'Why it is excluded: '+and(labels)+(plural?' are':' is')+' required for every use and '+(plural?'are':'is')+' missing.'};
      case 'needs_information':return {kind:'attention',text:'Why it needs attention: '+and(labels)+(plural?' are':' is')+' missing, so it cannot be ranked yet.'};
      case 'requires_review':return {kind:'attention',text:'Why it needs attention: '+(siteOk?'the site conditions are suitable, but ':'')+and(labels)+(plural?' are':' is')+' unknown.'};
    }
    const named=fit.rows.filter(r=>r.status==='match').map(r=>lowerFirst(r.label));
    const partial=result.criteria.filter(c=>c.status==='partial');
    const matchText=matched.length?'Matches the selected '+and(matched.slice(0,3).map(c=>c.siteWord))+'.':'Fits the site conditions entered so far.';
    if(partial.some(c=>c.stage==='project'))return {kind:'attention',text:'Why it needs attention: the site conditions suit it, but '+lowerFirst(partial.find(c=>c.stage==='project').text)+'.'};
    return {kind:'fits',text:'Why it fits: '+matchText+(named.length?' It also meets the current '+and(named)+'.':'')};
  }

  /* Stage 5 lives in result.data. Ranking: fit level, site score, project priority, design preference, stable id. */
  function ranking(a,b){
    const o=STATES[a.state].order-STATES[b.state].order;if(o)return o;
    const s=(b.site.score??-1)-(a.site.score??-1);if(s)return s;
    for(let i=0;i<Math.max(a.project.priority.length,b.project.priority.length);i++){const d=(a.project.priority[i]??1)-(b.project.priority[i]??1);if(d)return d;}
    const d=b.design.score-a.design.score;if(d)return d;
    return a.fixture_id<b.fixture_id?-1:a.fixture_id>b.fixture_id?1:0;
  }
  function best(record,zones,p){
    const results=zones.map(zone=>({zone,result:evaluate(record,zone,p)})).sort((a,b)=>ranking(a.result,b.result));
    return {record,zone:results[0].zone,result:results[0].result,zoneResults:Object.fromEntries(results.map(x=>[String(x.zone.id??x.result.zone_id),x.result]))};
  }
  function item({record,zone,result,zoneResults},p){
    const original=base.get(record.base_fixture_id||record.fixture_id),reference=record.record_kind==='demo_complete'?A.evaluate(original,zone,p):null;
    return {id:record.fixture_id,plant_id:record.plant_id,latin:record.scientific_name,name:record.dutch_name==='unknown'?record.scientific_name:record.dutch_name,group:record.group,
      soil:list(record.soil_tolerance).join(' / '),moisture:list(record.moisture_tolerance).join(' / '),light:list(record.light_tolerance).join(' / '),
      height:record.mature_height_m,spread:record.mature_spread_m,spacing:record.pilot_spacing_m,from:record.flower_start_month,to:record.flower_end_month,colour:record.flower_colour,
      role:record.composition_role,functionalLayer:record.functional_layer,supportRequired:record.climbing_support_required,vigour:record.vigour_or_spread_risk,
      thorns:record.thorns_or_spines,thorny:isUnknown(record.thorns_or_spines)?null:['thorns_present','prickles_present'].includes(record.thorns_or_spines),
      nativeStatus:record.native_status_nl,invasiveStatus:record.invasive_status,provenance:record.provenance_status,regionalOccurrence:record.regional_occurrence_nl,safetyStatus:record.public_contact_status,toxicity:record.toxicity_status,
      productionEligible:false,fieldOrigins:record.field_origins_json,demoValueOrigins:record.demo_value_origins,demoFillRules:record.demo_fill_rules,fieldResolutions:record.field_resolutions_json,syntheticDerivations:record.synthetic_derivations_json,
      operational:record.record_kind==='demo_complete',demo:true,recordKind:record.record_kind,example:record.example||null,
      siteOrigins:(zone.conditions||zone).field_origins||{},score:result.site.score,confidence:reference?.evidence_confidence_score??null,recommendation:result,evaluation:reference,zone:zone.name||result.zone_id,zoneRecommendations:zoneResults,
      caution:result.constraint?.text||'',evidenceStatus:'project demonstration · production_eligible=false',url:''};
  }
  function screen(zones,projectInput){
    const rows=[...complete.values()].map(record=>best(record,zones,projectInput)).sort((a,b)=>ranking(a.result,b.result));
    return {candidates:rows.filter(x=>x.result.placeable).map(x=>item(x,projectInput)),hidden:rows.filter(x=>!x.result.placeable).map(x=>({id:x.record.fixture_id,name:x.record.dutch_name==='unknown'?x.record.scientific_name:x.record.dutch_name,latin:x.record.scientific_name,group:x.record.group,state:x.result.state,label:x.result.label,reason:x.result.constraint?.text||'',recommendation:x.result}))};
  }
  const candidates=(zones,p)=>screen(zones,p).candidates;
  const activePolicies=p=>{const n=project(p);return P.policies.filter(policy=>!policy.always&&when(policy.activatedBy,n)).map(policy=>policy.label);};
  function showcase(zones,p){return [...examples.values()].map(record=>item(best(record,zones,p),p));}

  /* Where a criterion's data comes from, per plant field, for the card's "?" panels. */
  const CRITERION_FIELDS={soil:['soil_tolerance'],moisture:['moisture_tolerance'],light:['light_tolerance'],hydrology:['hydrology_tolerance'],water_edge:['water_edge_requirement'],
    disturbance_hardscape:['disturbance_tolerance','hardscape_tolerance'],size:['mature_height_m','mature_spread_m'],spacing:['pilot_spacing_m'],maintenance:['maintenance_demand'],
    vigour:['vigour_or_spread_risk'],climbing_support:['climbing_support_required'],native_status:['native_status_nl'],provenance:['provenance_status'],regional_occurrence:['regional_occurrence_nl'],
    height_limit:['mature_height_m'],invasive_legal:['invasive_status','protected_or_legal_status'],public_contact:['public_contact_status'],toxicity:['toxicity_status'],thorns:['thorns_or_spines'],
    edible_use:['edible_use_status'],flowering:['flower_start_month','flower_end_month','flower_colour']};
  const SITE_FIELDS={soil:['soil'],moisture:['moisture'],light:['light'],hydrology:['hydrology'],water_edge:['waterEdge'],disturbance_hardscape:['disturbance','hardscape']};
  const FIELD_LABELS={soil_tolerance:'Soil tolerance',moisture_tolerance:'Moisture tolerance',light_tolerance:'Light tolerance',hydrology_tolerance:'Flooding tolerance',water_edge_requirement:'Water-edge need',
    disturbance_tolerance:'Tolerance of use',hardscape_tolerance:'Tolerance of paving',mature_height_m:'Mature height',mature_spread_m:'Mature spread',pilot_spacing_m:'Planting distance',maintenance_demand:'Maintenance need',
    vigour_or_spread_risk:'Spread',climbing_support_required:'Climbing support',native_status_nl:'Native status',provenance_status:'Provenance',regional_occurrence_nl:'Regional occurrence',
    invasive_status:'Invasive status',protected_or_legal_status:'Legal status',public_contact_status:'Public contact',toxicity_status:'Toxicity',thorns_or_spines:'Thorns',edible_use_status:'Edible use',
    flower_start_month:'Flowering start',flower_end_month:'Flowering end',flower_colour:'Flower colour'};
  const ORIGINS={
    sourced:['sourced','From published sources','Taken from the sources below.'],
    expert_inference:['derived','Derived from published sources','Worked out from the sources below, for example by translating their categories into the ones this tool uses.'],
    synthetic_fallback:['placeholder','Demo placeholder','No source states this value. It is a placeholder so the demonstration can run.'],
    synthetic_demo:['placeholder','Demo placeholder',''],demo_inference:['assumption','Demo assumption',''],policy_rule:['policy','Fixed policy','Set by the prototype policy, not by a source.'],
    unknown:['missing','Not provided','No source provides this yet.'],not_reviewed:['missing','Not provided','No source provides this yet.'],conflicting:['missing','Not provided','The sources disagree, so no value is used.']};
  const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const SITE_ORIGINS={user_selected:'entered by you',synthetic_fallback:'suggested starting value, not yet checked',unknown:'not entered'};
  const plain=v=>v===null||v===undefined||typeof v==='object'&&!Array.isArray(v)?'':Array.isArray(v)?v.map(plain).join(', '):typeof v==='number'?String(v):String(v).replace(/_/g,' ');
  function sources(id,criterion,siteOrigins={}){
    const record=recordFor(id);if(!record)return null;
    const fields=(CRITERION_FIELDS[criterion]||[]).map(field=>{
      const origin=record.demo_value_origins[field]||'unknown',[kind,label,text]=ORIGINS[origin]||ORIGINS.unknown,resolution=record.field_resolutions_json?.[field];
      const removed=record.record_kind==='uncertainty_example'&&record.example.unknown_fields.includes(field),rule=D.rules[record.demo_fill_rules?.[field]];
      const cited=removed?[]:[...new Map((resolution?.claim_ids||[]).map(c=>D.claim_sources[c]).filter(Boolean).map(([source,locator])=>[source,{...D.sources[source],link:/^https?:/.test(locator)?locator:''}])).values()];
      return {field,label:FIELD_LABELS[field]||field,kind:removed?'missing':kind,origin:removed?'Not provided':label,
        explanation:removed?'This information was removed for this example.':rule?rule.note:text,
        sourceValue:!['sourced','derived'].includes(kind)||removed?'':typeof resolution?.real_value==='number'?(field.endsWith('_m')?metres(resolution.real_value):field.startsWith('flower_')&&field.endsWith('_month')?MONTH_NAMES[resolution.real_value-1]:String(resolution.real_value)):plain(resolution?.real_value),
        sources:cited,sourcesRelated:!['sourced','derived'].includes(kind)};
    });
    const site=(SITE_FIELDS[criterion]||[]).map(f=>({field:f,origin:SITE_ORIGINS[siteOrigins[f]]||(siteOrigins[f]?String(siteOrigins[f]).replace(/_/g,' '):'origin not recorded')}));
    return {fields,site};
  }

  /* Non-positional community-recipe rules; the browser community engine and the server's AI check both call this. */
  function communityFit(record,z={},p,geometry,{band,shade=false,bedType='planting',waterPresent=false},limits){
    const plant=recordFor(record.fixture_id||record.id);
    if(!plant)return {fit:false,reason:'Not a demonstration plant',result:null};
    const c=z.conditions||z,path_edge=band==='edge'||c.path_edge==='yes'?'yes':c.path_edge==='no'?'no':'unknown';
    const result=evaluate(plant,{...z,conditions:{...c,path_edge}},p,geometry,'placement');
    const height=plant.mature_height_m,thornless=plant.thorns_or_spines==='absent_reported',aquatic=plant.group==='Aquatic & marginal plants';
    const reason=!result.placeable?result.label+' for this bed':
      ['Trees','Climbers'].includes(plant.group)?plant.group+' are placed individually, not in count recipes':
      band==='edge'&&(height>limits.edgeHeight||!thornless)?'Path-edge band needs height <= '+limits.edgeHeight+' m and no thorns':
      band==='transition'&&(height>limits.transitionHeight||!thornless)?'Transition band needs height <= '+limits.transitionHeight+' m and no thorns':
      band==='interior'&&p.character==='open'&&height>limits.transitionHeight?'Open character keeps interior planting <= '+limits.transitionHeight+' m':
      shade&&plant.light_tolerance.length===1&&plant.light_tolerance[0]==='sun'?'Sun-only plant under future tree canopy':
      bedType==='water'&&!aquatic?'Water beds hold aquatic and marginal plants only':
      aquatic&&!waterPresent?'Aquatic and marginal plants need mapped water':null;
    return {fit:!reason,reason,result};
  }

  root.PlantscapesRecommender={version:D.version,policies:P,states:STATES,records:[...complete.values()],examples:[...examples.values()],record:recordFor,
    project,evaluate,ranking,screen,candidates,showcase,activePolicies,communityFit,sources,format:{metres,words:WORDS}};
})(typeof window!=='undefined'?window:globalThis);
