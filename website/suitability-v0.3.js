/* v0.3 operational evaluator. Shared unchanged by browser and local Node server. */
(function(root){
  'use strict';
  const data=root.PLANTSCAPES_OPERATIONAL_V03;
  if(!data)throw Error('Build dataset/../website/data/operational-v0.3.generated.js first.');
  const R=data.rules,C=data.contract,M=R.compatibility_matrices;
  const UNKNOWN=new Set(['unknown','not_reviewed','not_assessed','conflicting']),THORNS=new Set(['thorns_present','prickles_present']);
  const total=values=>values.reduce((a,b)=>a+b,0);
  const assumptions=o=>Object.entries(o).filter(([,v])=>['expert_inference','synthetic_fallback'].includes(v)).map(([f,v])=>f+'='+v);
  const round=(n,d=4)=>Number(n.toFixed(d));
  const pyfloat=(n,d=3)=>{const r=round(n,d);return Number.isInteger(r)?r.toFixed(1):String(r);};
  const py=v=>Array.isArray(v)?'['+v.map(x=>"'"+x+"'").join(', ')+']':typeof v==='boolean'?(v?'True':'False'):String(v);
  function normalize(zone,project){
    const z={zone_id:'unnamed_zone',...zone},p={type:'other',maintenance:'unknown',character:'mosaic',vigourControl:'unknown',evaluation_stage:'candidate',...project};
    for(const [f,vocab] of Object.entries(C.zone_vocabulary)){z[f]??='unknown';if(!vocab.includes(z[f]))throw Error('Invalid zone '+f+': '+z[f]);}
    for(const f of C.zone_numeric_or_unknown){z[f]??='unknown';if(z[f]!=='unknown'&&(!Number.isFinite(z[f])||z[f]<0))throw Error('Invalid zone dimension '+f);}
    for(const [f,vocab] of Object.entries(C.project_vocabulary))if(!vocab.includes(p[f]))throw Error('Invalid project '+f);
    for(const f of C.project_booleans){p[f]??=false;if(typeof p[f]!=='boolean')throw Error('Project boolean required: '+f);}
    p.area??='unknown';if(p.area!=='unknown'&&(!Number.isFinite(p.area)||p.area<0))throw Error('Invalid project area');
    for(const [f,vocab] of Object.entries(C.project_array_vocabulary)){p[f]??=[];if(!Array.isArray(p[f])||p[f].some(v=>!vocab.includes(v)))throw Error('Invalid preference '+f);}
    return [z,p];
  }
  function evaluate(plant,zone,project){
    const [z,p]=normalize(zone,project),used=new Set(),warnings=[],include=[],exclude=[],gates=[],caps=[];
    const read=f=>(used.add(f),plant[f]),origins=read('field_origins_json'),conf=read('field_confidence_json');
    const warn=(code,message)=>{if(!warnings.some(w=>w.code===code&&w.message===message))warnings.push({code,message});};
    const addcap=rule=>caps.push([rule,R.final_score_caps[rule]]);
    const gate=(code,trigger,reason,review=false)=>{
      const fields=R.hard_gate_plant_fields[code],a=fields.filter(f=>['expert_inference','synthetic_fallback'].includes(origins[f])).map(f=>f+'='+origins[f]);
      if(a.length)reason+=' Pilot assumptions: '+a.join(', ')+'.';
      gates.push({gate_id:code,triggered:!!trigger,state:trigger?'excluded':review?'requires_review':'passed',reason,operational_values:Object.fromEntries(fields.map(f=>[f,plant[f]])),value_origins:Object.fromEntries(fields.map(f=>[f,origins[f]]))});
      if(trigger)exclude.push(code+': '+reason);
    };
    const factor=f=>R.site_uncertainty_factors[z[f]==='unknown'?'unknown':f==='soil'&&z[f]==='made'?'made':f==='moisture'&&z[f]==='variable'?'variable':f==='hydrology'&&z[f]==='edge'?'edge_hydroperiod':'known'];
    if(['unverified','unknown'].includes(z.source)){warn('site_evidence_gap','Site input source is unverified/unknown; comparisons are diagnostic only and site confidence is zero.');addcap('unknown_site');}
    else if(z.source==='demo')warn('synthetic_site','Zone values and dimensions are a synthetic example; site-source confidence factor is 0.5.');
    const compatibility=(matrix,field,sitefield)=>{
      const vals=read(field),list=Array.isArray(vals)?vals:[vals],value=z[sitefield],ratio=Math.max(...list.map(v=>M[matrix][v][value]));
      if(value==='unknown'){warn('site_data_gap','Unknown '+sitefield+' scores zero; confirm site data before use.');addcap('unknown_site');}
      else if(value==='made')warn('made_ground_uncertain','Made ground composition unconfirmed: soil compatibility ratio is 0.25.');
      else if(['variable','edge'].includes(value))warn('site_regime_uncertain',sitefield+'='+value+' is conditional, never confirmed compatibility.');
      if(ratio===0&&value!=='unknown'){addcap('known_environmental_conflict');exclude.push('Environmental conflict: '+sitefield+'='+value+' versus '+py(list)+'.');}
      else if(ratio===1)include.push(sitefield+'='+value+' matches operational '+py(list)+'. Origin: '+origins[field]+'.');
      else if(value!=='unknown')warn('conditional_compatibility',sitefield+' compatibility is conditional ('+ratio+').');
      return ratio;
    };
    const ratios={};
    for(const [component,pfield,sitefield] of [['soil','soil_tolerance','soil'],['moisture','moisture_tolerance','moisture'],['hydrology','hydrology_tolerance','hydrology'],['light','light_tolerance','light']])ratios[component]=compatibility(component,pfield,sitefield);
    const disturbance=compatibility('disturbance','disturbance_tolerance','disturbance'),hardscape=compatibility('hardscape','hardscape_tolerance','hardscape');
    ratios.disturbance_hardscape=(disturbance+hardscape)/2;
    const group=read('group'),height=read('mature_height_m'),spread=read('mature_spread_m'),spacing=read('pilot_spacing_m'),woody=['Trees','Shrubs'].includes(group),footprint=woody?spread:spacing;
    const dimensions=['available_width_m','available_length_m','plantable_area_m2'].map(f=>z[f]),support_required=read('climbing_support_required');
    const geometry_known=dimensions.every(v=>v!=='unknown')&&(!support_required||z.support_length_m!=='unknown');
    const fits=geometry_known&&dimensions[0]>=footprint&&dimensions[1]>=footprint&&dimensions[2]>=footprint**2&&(!support_required||z.support_length_m>=spacing);
    const space_state=fits?'fits':geometry_known?'does_not_fit':'unknown_geometry';
    if(!geometry_known){warn('site_geometry_gap','Missing clear zone dimensions/area: footprint scores zero; quantity is unresolved.');addcap('unknown_site');}
    else if(!fits){addcap('spatial_impossibility');exclude.push('Insufficient clear space for '+pyfloat(footprint)+'m pilot footprint.');}
    let height_state='inactive';
    if(p.sightlines){
      if(z.path_edge==='unknown'){height_state='unknown_required_height_limit';warn('sightline_context_gap','Sightline preservation requires mapped path-edge context; visibility scores zero until mapped.');addcap('unknown_site');}
      else if(z.path_edge==='yes'){
        height_state=z.max_plant_height_m==='unknown'?'unknown_required_height_limit':height<=z.max_plant_height_m?'fits':'exceeds_visibility_limit';
        if(height_state==='unknown_required_height_limit'){warn('sightline_height_gap','Required maximum height is unknown; visibility scores zero.');addcap('unknown_site');}
        if(height_state==='exceeds_visibility_limit'){addcap('spatial_impossibility');exclude.push('Operational height exceeds the project visibility limit.');}
      }
    }
    ratios.spatial=.8*M.spatial_footprint[space_state]+.2*M.spatial_height[height_state];
    const demand=read('maintenance_demand'),vigour=read('vigour_or_spread_risk'),maintenance_ratio=M.maintenance[demand][p.maintenance];
    let vigour_ratio=M.vigour[vigour][p.maintenance];
    if(vigour==='high'&&p.vigourControl==='yes')vigour_ratio=p.maintenance==='low'?.5:p.maintenance!=='unknown'?1:0;
    if(p.maintenance==='unknown'){warn('project_data_gap','Maintenance capacity unknown: management component scores zero.');addcap('unknown_site');}
    if(maintenance_ratio===0&&p.maintenance!=='unknown')warn('maintenance_conflict','Operational demand exceeds maintenance capacity.');
    ratios.maintenance_vigour=(maintenance_ratio+vigour_ratio)/2;
    const fid=read('fixture_id'),pid=read('plant_id'),name=read('scientific_name'),dutch=read('dutch_name');
    gate('H01_IDENTITY',UNKNOWN.has(name)||UNKNOWN.has(pid),UNKNOWN.has(name)||UNKNOWN.has(pid)?'Taxon identity unresolved.':'Archived accepted identity retained; specialist review pending.');
    const invasive=read('invasive_status'),legal=read('protected_or_legal_status'),native=read('native_status_nl'),provenance=read('provenance_status'),contact=read('public_contact_status'),toxic=read('toxicity_status'),edible=read('edible_use_status'),thorns=read('thorns_or_spines');
    gate('H02_INVASIVE_LEGAL',['listed_nl','listed_eu','invasive_elsewhere'].includes(invasive)||legal==='legally_prohibited','Invasive='+invasive+'; legal/protection='+legal+'.',UNKNOWN.has(invasive)||UNKNOWN.has(legal)||legal==='protected');
    const edge_requirement=read('water_edge_requirement'),edge_ok=z.waterEdge==='yes'&&['seasonal','long','permanent','edge'].includes(z.hydrology);
    gate('H03_WATER_EDGE',edge_requirement==='required'&&!edge_ok,'Required edge='+edge_requirement+'; confirmed compatible edge='+py(edge_ok)+'.');
    if(edge_requirement==='preferred'&&!edge_ok)warn('water_edge_preference','Operational wet-site preference has no confirmed water edge; not a mandatory aquatic gate.');
    const no_permanent=!plant.hydrology_tolerance.includes('permanent');
    gate('H04_PERMANENT_WATER',z.hydrology==='permanent'&&no_permanent,z.hydrology==='unknown'&&no_permanent?'Hydrology unknown; permanent water is not ruled out for a record without operational permanent tolerance.':'Permanent-water regime needs explicit operational permanent tolerance.',z.hydrology==='unknown'&&no_permanent);
    gate('H05_SUPPORT',support_required&&!p.support,'Climbing support required='+py(support_required)+'; supplied='+py(p.support)+'.');
    gate('H06_PUBLIC_CONTACT',p.publicAccess&&contact==='unsuitable','Public access='+py(p.publicAccess)+'; contact status='+contact+'.',p.publicAccess&&UNKNOWN.has(contact));
    gate('H07_WOODY_GEOMETRY',woody&&geometry_known&&!fits&&p.evaluation_stage==='placement','Woody spread footprint '+pyfloat(spread)+'m; clear geometry='+space_state+'; stage='+p.evaluation_stage+'.',woody&&(!geometry_known||!fits&&p.evaluation_stage==='candidate'));
    gate('H08_VIGOUR',p.maintenance==='low'&&vigour==='high'&&p.vigourControl!=='yes','Maintenance='+p.maintenance+'; vigour='+vigour+'; explicit control='+p.vigourControl+'.',vigour==='high'&&p.maintenance==='unknown'&&p.vigourControl!=='yes');
    if(p.maintenance==='low'&&vigour==='high'&&p.vigourControl==='yes'){warn('active_vigour_control_required','High-vigour pilot candidate requires the declared ongoing control; conditional management ratio 0.5.');addcap('active_vigour_control_required');}
    gate('H09_NATIVE_POLICY',p.rewilding&&native==='introduced','Native status='+native+'; native-only policy='+py(p.rewilding)+'.',p.rewilding&&UNKNOWN.has(native));
    gate('H10_RESTORATION_POLICY',p.type==='restoration'&&native==='introduced'&&!p.restorationOrnamentals,'Restoration ornamental exception='+py(p.restorationOrnamentals)+'; native='+native+'.',p.type==='restoration'&&(UNKNOWN.has(native)||native==='introduced'&&p.restorationOrnamentals));
    if(p.type==='restoration'&&native==='introduced'&&p.restorationOrnamentals)warn('restoration_ornamental_exception','Known introduced record admitted only through the explicit restoration ornamental override; disclose it separately and keep it under policy review (rulebook G05).');
    if(native==='introduced'&&!p.rewilding)warn('non_native_label','Known introduced (non-native) record: label it explicitly with a rationale (rulebook G05). This is not an invasiveness finding.');
    gate('H11_PATH_THORNS',z.path_edge==='yes'&&THORNS.has(thorns)&&p.evaluation_stage==='placement','Mapped path edge='+z.path_edge+'; thorn evidence='+thorns+'.',z.path_edge!=='no'&&UNKNOWN.has(thorns)||THORNS.has(thorns)&&(z.path_edge==='unknown'||p.evaluation_stage==='candidate'&&z.path_edge==='yes'));
    gate('H12_MAINTENANCE_CAPACITY',false,'Operational maintenance demand='+demand+'; project capacity='+p.maintenance+'; demand ratio='+maintenance_ratio+'.',p.maintenance==='unknown'||maintenance_ratio===0);
    const applicable=['invasive_status','protected_or_legal_status','provenance_status','toxicity_status'];
    if(p.publicAccess)applicable.push('public_contact_status','thorns_or_spines');
    if(p.publicHarvest)applicable.push('edible_use_status');
    if(p.rewilding||p.type==='restoration')applicable.push('native_status_nl');
    const unresolved=applicable.filter(f=>UNKNOWN.has(plant[f])||f==='protected_or_legal_status'&&plant[f]==='protected');
    for(const f of unresolved)warn('policy_or_safety_review_required',f+'='+plant[f]+'; demonstration conditional only, no real-world clearance.');
    if(unresolved.length)addcap('unknown_policy');
    if(p.publicAccess&&UNKNOWN.has(contact))addcap('unreviewed_public_contact');
    if(p.rewilding&&UNKNOWN.has(native))addcap('unknown_native_rewilding');
    if(!UNKNOWN.has(toxic))warn('documented_toxicity','Archived toxicity='+toxic+'; parts, exposure and public use require specialist assessment.');
    const hazards=read('unresolved_safety_or_policy_json');
    if(p.publicAccess)for(const f of ['allergen_risk','irritant_sap','contact_irritation_status'])warn('public_contact_hazard_context',f+'='+String(hazards[f]?.status??'unknown')+'; no general safety clearance.');
    const harvest_allowed=p.publicHarvest&&edible==='reviewed_for_requested_use'&&toxic==='no_hazard_reviewed_for_use'&&contact==='reviewed_for_project'&&provenance==='reviewed_for_project'&&!unresolved.length;
    if(p.publicHarvest&&(!harvest_allowed||!plant.production_eligible))warn('harvesting_not_recommended','Public harvesting requested; pilot records cannot clear identity/parts/preparation/exposure/provenance for the requested use. Never recommend consumption.');
    const production=read('production_eligible');warn('simulation_only','production_eligible='+py(production).toLowerCase()+'; this result is a pilot simulation, not planting, procurement or food advice.');
    if(z.canopy==='yes')warn('canopy_context','Canopy present: use observed light; no additional canopy score or assumed future shade.');
    else if(z.canopy==='unknown')warn('canopy_context','Canopy context unknown; light remains the only light score.');
    const component_scores=Object.fromEntries(Object.entries(ratios).map(([k,v])=>[k,round(v*R.components[k].weight)])),raw=round(total(Object.values(component_scores)));
    const hard_excluded=gates.some(g=>g.triggered),final=hard_excluded?0:Math.min(raw,...caps.map(c=>c[1]));
    let state=hard_excluded?'excluded':['strong_match','suitable','conditional_match','unsuitable'].find(s=>final>=R.thresholds[s]);
    // Points a confirmed input could still resolve; reported only, never added to a score.
    const weight=Object.fromEntries(Object.entries(R.components).map(([k,spec])=>[k,spec.weight]));
    const withheld=total([...['soil','moisture','hydrology','light'].filter(k=>z[k]==='unknown').map(k=>weight[k]),...['disturbance','hardscape'].filter(k=>z[k]==='unknown').map(()=>weight.disturbance_hardscape/2),...(!geometry_known?[.8*weight.spatial]:[]),...(height_state==='unknown_required_height_limit'?[.2*weight.spatial]:[]),...(p.maintenance==='unknown'?[weight.maintenance_vigour]:[])]);
    const known_failure=caps.some(([rule])=>['known_environmental_conflict','spatial_impossibility'].includes(rule));
    if(state==='unsuitable'&&!known_failure&&raw+withheld>=R.thresholds.conditional_match){state='data_gap';exclude.push('Data gap: '+pyfloat(withheld)+' points withheld for unknown inputs; confirm site/project data before screening (rulebook G02 zone_data_gap). Not a known conflict.');}
    const site_factors=Object.fromEntries(['soil','moisture','hydrology','light','disturbance','hardscape'].map(f=>[f,factor(f)]));
    const geom_factor=geometry_known?1:0,spatial_factor=.8*geom_factor+.2*(height_state==='unknown_required_height_limit'?0:1);
    const contextual={soil:site_factors.soil,moisture:site_factors.moisture,hydrology:site_factors.hydrology,light:site_factors.light,disturbance_hardscape:(site_factors.disturbance+site_factors.hardscape)/2,spatial:spatial_factor,maintenance_vigour:p.maintenance==='unknown'?0:1};
    const confidence_terms={},component_origins={};
    for(const [k,spec] of Object.entries(R.components)){
      const fields=spec.plant_fields;component_origins[k]=Object.fromEntries(fields.map(f=>[f,origins[f]]));
      confidence_terms[k]=round(total(fields.map(f=>conf[f]))/fields.length*contextual[k]*spec.weight/100,5);
      const a=assumptions(component_origins[k]);if(a.length)warn('component_assumptions',k+' relies on '+a.join(', ')+'. This is simulated compatibility, not reviewed field evidence.');
    }
    const policy_factor=Math.max(.5,1-.05*unresolved.length),source_factor=R.site_source_factors[z.source];
    const evidence_confidence=round(total(Object.values(confidence_terms))*policy_factor*source_factor);
    const colour=read('flower_colour'),start=read('flower_start_month'),end=read('flower_end_month'),poll=read('pollinator_value'),role=read('composition_role'),layer=read('functional_layer');
    const design_terms={};
    if(p.anchorColours.length)design_terms.colour=p.anchorColours.includes(colour)?1:0;
    if(p.desiredFlowerMonths.length){const months=[...new Set(p.desiredFlowerMonths)];design_terms.months=months.filter(m=>m>=start&&m<=end).length/months.length;}
    if(p.priorities.includes('pollinators'))design_terms.pollinator=['nectar_reported','pollinator_visitation_reported'].includes(poll)?1:poll==='pilot_potential'?.5:0;
    design_terms.character_role=p.character==='mosaic'?.5:p.character==='open'&&role==='woody_framework'?0:p.character==='enclosed'&&role==='woody_framework'||p.character==='open'&&role!=='woody_framework'?1:.5;
    const design_score=round(100*total(Object.values(design_terms))/Object.keys(design_terms).length);
    const designFields=['flower_start_month','flower_end_month','flower_colour','pollinator_value'];
    const design_assumptions=designFields.filter(f=>['expert_inference','synthetic_fallback'].includes(origins[f])).map(f=>f+'='+origins[f]);
    if(design_assumptions.length)warn('design_assumptions','Design output uses '+design_assumptions.join(', ')+'.');
    if(poll==='pilot_potential')warn('synthetic_pollinator_output','Pollinator value is a simulation placeholder; no researched ecological benefit is asserted.');
    let quantity_state='resolved_pilot_capacity',quantity=0;
    if(support_required){if(z.support_length_m==='unknown'){quantity_state='unresolved_support';warn('support_quantity_gap','Mapped support length required for climber stock estimate.');}else quantity=Math.floor(z.support_length_m/spacing);}
    else if(geometry_known){quantity=Math.min(Math.floor(dimensions[0]/spacing)*Math.floor(dimensions[1]/spacing),Math.floor(dimensions[2]/spacing**2));if(p.area!=='unknown')quantity=Math.min(quantity,Math.floor(p.area/spacing**2));}
    else quantity_state='unresolved_space';
    if(!fits&&!support_required)quantity=0;
    if(group==='Trees'&&p.character==='open'){quantity=0;quantity_state='omitted_by_design_preference';}
    const diagnostic_quantity=quantity;
    if(['excluded','unsuitable','data_gap'].includes(state)){quantity=0;quantity_state='not_eligible_for_pilot_placement';}
    const trace=Object.fromEntries(['synthetic_derivations_json','evidence_claim_ids_json','field_resolutions_json','record_notes'].map(f=>[f,read(f)]));
    return {fixture_id:fid,plant_id:pid,scientific_name:name,dutch_name:dutch,group,zone_id:z.zone_id,raw_suitability_score:raw,final_suitability_score:round(final),evidence_confidence_score:evidence_confidence,eligibility_state:state,points_withheld_for_unknown_inputs:round(withheld),native_evidence_tier:R.native_evidence_tiers[native]??1,eligible_for_demo_ranking:['strong_match','suitable','conditional_match'].includes(state),production_eligible:production,component_scores,component_ratios:ratios,component_value_origins:component_origins,component_confidence_terms:confidence_terms,confidence_factors:{site_source:source_factor,policy:policy_factor,site_fields:site_factors,component_context:contextual},hard_gate_results:gates,score_caps:[...new Map(caps.map(([r,c])=>[r,{rule:r,cap:c}])).values()].sort((a,b)=>a.rule.localeCompare(b.rule)),warnings,inclusion_reasons:include.length?include:['No confirmed full component match; inspect conditional ratios and exclusions.'],exclusion_reasons:exclude.length?exclude:['No known hard exclusion; unresolved policy/safety still blocks real-world use.'],design_preference_score:design_score,design_preference_components:design_terms,design_output:{flower_start_month:start,flower_end_month:end,flower_colour:colour,pollinator_value:poll,origins:Object.fromEntries(designFields.map(f=>[f,origins[f]]))},placement:{height_m:height,spread_m:spread,spacing_m:spacing,clear_footprint_m:footprint,footprint_state:space_state,visibility_state:height_state,functional_layer:layer,composition_role:role,climbing_support_required:support_required,vigour_or_spread_risk:vigour,thorns_or_spines:thorns,origins:Object.fromEntries(['mature_height_m','mature_spread_m','pilot_spacing_m','functional_layer','composition_role','climbing_support_required','vigour_or_spread_risk','thorns_or_spines'].map(f=>[f,origins[f]]))},quantity:{approximate_stock_capacity:quantity,diagnostic_capacity_before_eligibility:diagnostic_quantity,state:quantity_state,unit:'plants',basis:'Single-species capacity only; no mixed-plan allocation or seed-rate claim.',spacing_rule:'SPACE-01'},harvesting_allowed:!!(harvest_allowed&&production&&!hard_excluded&&state!=='unsuitable'),profile_trace:trace,unresolved_safety_or_policy:hazards,consumed_fields:[...used].sort()};
  }
  /* Explicit stages from the rules file; strings compare by code point (no locale), matching Python. */
  function ranking(a,b){
    for(const {field,order} of R.ranking_stages){const x=a[field],y=b[field];if(x!==y)return (x<y?-1:1)*(order==='desc'?-1:1);}
    return 0;
  }
  root.PlantscapesSuitabilityV03={version:data.version,plants:data.plants,rules:R,contract:C,normalize,evaluate,ranking};
})(typeof window!=='undefined'?window:globalThis);
