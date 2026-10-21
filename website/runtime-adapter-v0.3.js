/* Only translates app inputs and operational records. Suitability stays in suitability-v0.3.js. */
(function(root){
  'use strict';
  const E=root.PlantscapesSuitabilityV03;
  const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n:'unknown';
  function project(p={},stage='candidate'){
    for(const key of ['publicAccess','publicHarvest','sightlines','rewilding','support','restorationOrnamentals'])if(typeof p[key]!=='boolean')throw Error('Explicit project input required: '+key);
    return {type:p.type||'other',area:finite(p.area),maintenance:p.maintenance||'unknown',publicAccess:p.publicAccess===true,publicHarvest:p.publicHarvest===true,sightlines:p.sightlines===true,rewilding:p.rewilding===true,support:p.support===true,character:p.character||'mosaic',restorationOrnamentals:p.restorationOrnamentals===true,vigourControl:p.vigourControl||'unknown',evaluation_stage:stage,anchorColours:p.anchorColours||[],desiredFlowerMonths:p.desiredFlowerMonths||[],priorities:(p.priorities||[]).filter(x=>x==='pollinators')};
  }
  function zone(z={},geometry={}){
    const c=z.conditions||z,origins=c.field_origins||{};
    const source=Object.values(origins).includes('synthetic_fallback')?'demo':c.source||'unknown';
    const value=f=>c[f]||'unknown';
    return {zone_id:String(z.zone_id||z.id||'unnamed_zone'),soil:value('soil'),moisture:value('moisture'),hydrology:value('hydrology'),light:value('light'),canopy:value('canopy'),disturbance:value('disturbance'),hardscape:value('hardscape'),waterEdge:value('waterEdge'),source,path_edge:value('path_edge'),available_width_m:finite(geometry.available_width_m??c.available_width_m),available_length_m:finite(geometry.available_length_m??c.available_length_m),plantable_area_m2:finite(geometry.plantable_area_m2??c.plantable_area_m2),max_plant_height_m:finite(geometry.max_plant_height_m??c.max_plant_height_m),support_length_m:finite(geometry.support_length_m??c.support_length_m)};
  }
  function evaluate(plant,z,p,geometry={},stage='candidate'){return E.evaluate(plant,zone(z,geometry),project(p,stage));}
  /* Non-positional community-recipe rules, shared by the browser community engine and the server's AI
     revalidation so both admit exactly the same plants. Shoreline distance stays positional in the engine. */
  function communityFit(record,z={},p,geometry,{band,shade=false,bedType='planting',waterPresent=false},limits){
    const c=z.conditions||z,path_edge=band==='edge'||c.path_edge==='yes'?'yes':c.path_edge==='no'?'no':'unknown';
    const result=evaluate(record,{...z,conditions:{...c,path_edge}},p,geometry,'placement');
    const height=record.mature_height_m,thornless=record.thorns_or_spines==='absent_reported',aquatic=record.group==='Aquatic & marginal plants';
    const reason=!result.eligible_for_demo_ranking?'v0.3 '+result.eligibility_state+' for this bed':
      ['Trees','Climbers'].includes(record.group)?record.group+' are placed individually, not in count recipes':
      band==='edge'&&(height>limits.edgeHeight||!thornless)?'Path-edge band needs height <= '+limits.edgeHeight+' m and reported absence of thorns':
      band==='transition'&&(height>limits.transitionHeight||!thornless)?'Transition band needs height <= '+limits.transitionHeight+' m and reported absence of thorns':
      band==='interior'&&p.character==='open'&&height>limits.transitionHeight?'Open character keeps interior planting <= '+limits.transitionHeight+' m':
      shade&&record.light_tolerance.length===1&&record.light_tolerance[0]==='sun'?'Sun-only record under future tree canopy':
      bedType==='water'&&!aquatic?'Water beds hold aquatic and marginal records only':
      aquatic&&!waterPresent?'Aquatic and marginal records need mapped water':null;
    return {fit:!reason,reason,result};
  }
  function plant(record,result){
    const t=result.placement,o=record.field_origins_json;
    return {id:record.fixture_id,plant_id:record.plant_id,latin:record.scientific_name,name:record.dutch_name==='unknown'?record.scientific_name:record.dutch_name,group:record.group,
      soil:record.soil_tolerance.join(' / '),moisture:record.moisture_tolerance.join(' / '),light:record.light_tolerance.join(' / '),
      height:t.height_m,spread:t.spread_m,spacing:t.spacing_m,from:record.flower_start_month,to:record.flower_end_month,colour:record.flower_colour,
      role:t.composition_role,functionalLayer:t.functional_layer,supportRequired:t.climbing_support_required,vigour:t.vigour_or_spread_risk,
      thorns:t.thorns_or_spines,thorny:t.thorns_or_spines==='unknown'?null:['thorns_present','prickles_present'].includes(t.thorns_or_spines),nativeStatus:record.native_status_nl,
      invasiveStatus:record.invasive_status,provenance:record.provenance_status,safetyStatus:record.public_contact_status,
      productionEligible:record.production_eligible,fieldOrigins:o,fieldResolutions:record.field_resolutions_json,syntheticDerivations:record.synthetic_derivations_json,
      operational:true,demo:true,score:result.final_suitability_score,confidence:result.evidence_confidence_score,evaluation:result,
      caution:result.warnings.filter(w=>['policy_or_safety_review_required','documented_toxicity','harvesting_not_recommended'].includes(w.code)).map(w=>w.message).join(' '),
      evidenceStatus:'v0.3 conditional demonstration',url:''};
  }
  function candidates(zones,p){
    return E.plants.map(record=>{
      const results=zones.map(z=>({zone:z,result:evaluate(record,z,p)})).filter(x=>x.result.eligible_for_demo_ranking).sort((a,b)=>E.ranking(a.result,b.result));
      if(!results.length)return null;
      const best=results[0],item=plant(record,best.result);item.zone=best.zone.name||best.result.zone_id;item.zoneEvaluations=Object.fromEntries(zones.map(z=>[String(z.id),evaluate(record,z,p)]));return item;
    }).filter(Boolean).sort((a,b)=>E.ranking(a.evaluation,b.evaluation));
  }
  root.PlantscapesRuntimeV03={project,zone,evaluate,communityFit,plant,candidates};
})(typeof window!=='undefined'?window:globalThis);
