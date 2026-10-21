"""Complete deterministic plant–zone simulation. Does not import or change the website.

CLI: python dataset/score_demo_suitability_v0_3.py [--inputs path] [--output-dir path]
Public API: evaluate(plant, zone, project) -> full diagnostic result.
"""
import argparse,json,math,sys
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).parent/'research/demo-v0_3'))
from pilot_model import *
RULES=read_json(DATA/'scoring/plant-suitability-rules-v0_3.json')
CONTRACT=read_json(DATA/'scoring/plant-location-contract-v0_3.json')
MATRIX=RULES['compatibility_matrices']
UNKNOWN={'unknown','not_reviewed','not_assessed','conflicting'}
THORNS={'thorns_present','prickles_present'}

def total(values):
    # Left-to-right like JavaScript; built-in sum() is compensated on Python>=3.12 (rules numeric_summation).
    t=0
    for v in values:t+=v
    return t

def normalized_inputs(zone,project):
    z=dict(zone);p=dict(project)
    z.setdefault('zone_id','unnamed_zone')
    for f,vocab in CONTRACT['zone_vocabulary'].items():
        z.setdefault(f,'unknown')
        if z[f] not in vocab:raise ValueError('Invalid zone '+f+': '+str(z[f]))
    for f in CONTRACT['zone_numeric_or_unknown']:
        z.setdefault(f,'unknown')
        if z[f]!='unknown' and (isinstance(z[f],bool) or not isinstance(z[f],(int,float)) or not math.isfinite(z[f]) or z[f]<0):raise ValueError('Invalid zone dimension '+f)
    defaults={'type':'other','maintenance':'unknown','character':'mosaic','vigourControl':'unknown','evaluation_stage':'candidate'}
    for f,vocab in CONTRACT['project_vocabulary'].items():
        p.setdefault(f,defaults[f])
        if p[f] not in vocab:raise ValueError('Invalid project '+f)
    for f in CONTRACT['project_booleans']:
        p.setdefault(f,False)
        if not isinstance(p[f],bool):raise ValueError('Project boolean required: '+f)
    p.setdefault('area','unknown')
    if p['area']!='unknown' and (isinstance(p['area'],bool) or not isinstance(p['area'],(int,float)) or not math.isfinite(p['area']) or p['area']<0):raise ValueError('Invalid project area')
    for f,vocab in CONTRACT['project_array_vocabulary'].items():
        p.setdefault(f,[])
        if not isinstance(p[f],list) or any(v not in vocab for v in p[f]):raise ValueError('Invalid preference '+f)
    return z,p

def evaluate(plant,zone,project):
    z,p=normalized_inputs(zone,project);used=set();warnings=[];include=[];exclude=[];gates=[];caps=[]
    def read(f):used.add(f);return plant[f]
    origins=read('field_origins_json');conf=read('field_confidence_json')
    def warn(code,message):
        if not any(w['code']==code and w['message']==message for w in warnings):warnings.append({'code':code,'message':message})
    def addcap(rule):caps.append((rule,RULES['final_score_caps'][rule]))
    def gate(code,trigger,reason,review=False):
        fields=RULES['hard_gate_plant_fields'][code]
        assumptions=[f+'='+origins[f] for f in fields if origins[f] in ['expert_inference','synthetic_fallback']]
        if assumptions:reason+=' Pilot assumptions: '+', '.join(assumptions)+'.'
        gates.append({'gate_id':code,'triggered':bool(trigger),'state':'excluded' if trigger else 'requires_review' if review else 'passed','reason':reason,'operational_values':{f:plant[f] for f in fields},'value_origins':{f:origins[f] for f in fields}})
        if trigger:exclude.append(code+': '+reason)
    def factor(field):
        value=z[field]
        key='unknown' if value=='unknown' else 'made' if field=='soil' and value=='made' else 'variable' if field=='moisture' and value=='variable' else 'edge_hydroperiod' if field=='hydrology' and value=='edge' else 'known'
        return RULES['site_uncertainty_factors'][key]
    if z['source'] in ['unverified','unknown']:
        warn('site_evidence_gap','Site input source is unverified/unknown; comparisons are diagnostic only and site confidence is zero.');addcap('unknown_site')
    elif z['source']=='demo':warn('synthetic_site','Zone values and dimensions are a synthetic example; site-source confidence factor is 0.5.')
    def compatibility(matrix,field,sitefield):
        vals=read(field);vals=vals if isinstance(vals,list) else [vals]
        value=z[sitefield];r=max(MATRIX[matrix][v][value] for v in vals)
        if value=='unknown':
            warn('site_data_gap','Unknown '+sitefield+' scores zero; confirm site data before use.');addcap('unknown_site')
        elif value=='made':warn('made_ground_uncertain','Made ground composition unconfirmed: soil compatibility ratio is 0.25.')
        elif value in ['variable','edge']:warn('site_regime_uncertain',sitefield+'='+value+' is conditional, never confirmed compatibility.')
        if r==0 and value!='unknown':addcap('known_environmental_conflict');exclude.append('Environmental conflict: '+sitefield+'='+value+' versus '+str(vals)+'.')
        elif r==1:include.append(sitefield+'='+value+' matches operational '+str(vals)+'. Origin: '+origins[field]+'.')
        elif value!='unknown':warn('conditional_compatibility',sitefield+' compatibility is conditional ('+str(r)+').')
        return r
    ratios={}
    for component,pfield,sitefield in [('soil','soil_tolerance','soil'),('moisture','moisture_tolerance','moisture'),('hydrology','hydrology_tolerance','hydrology'),('light','light_tolerance','light')]:ratios[component]=compatibility(component,pfield,sitefield)
    disturbance=compatibility('disturbance','disturbance_tolerance','disturbance');hardscape=compatibility('hardscape','hardscape_tolerance','hardscape')
    ratios['disturbance_hardscape']=(disturbance+hardscape)/2
    group=read('group');height=read('mature_height_m');spread=read('mature_spread_m');spacing=read('pilot_spacing_m');woody=group in ['Trees','Shrubs']
    footprint=spread if woody else spacing
    dimensions=[z[f] for f in ['available_width_m','available_length_m','plantable_area_m2']]
    support_required=read('climbing_support_required')
    geometry_known=all(v!='unknown' for v in dimensions) and (not support_required or z['support_length_m']!='unknown')
    fits=geometry_known and dimensions[0]>=footprint and dimensions[1]>=footprint and dimensions[2]>=footprint**2 and (not support_required or z['support_length_m']>=spacing)
    space_state='fits' if fits else 'does_not_fit' if geometry_known else 'unknown_geometry'
    if not geometry_known:
        warn('site_geometry_gap','Missing clear zone dimensions/area: footprint scores zero; quantity is unresolved.');addcap('unknown_site')
    elif not fits:addcap('spatial_impossibility');exclude.append('Insufficient clear space for '+str(round(footprint,3))+'m pilot footprint.')
    height_state='inactive'
    if p['sightlines']:
        if z['path_edge']=='unknown':
            height_state='unknown_required_height_limit';warn('sightline_context_gap','Sightline preservation requires mapped path-edge context; visibility scores zero until mapped.');addcap('unknown_site')
        elif z['path_edge']=='yes':
            height_state='unknown_required_height_limit' if z['max_plant_height_m']=='unknown' else 'fits' if height<=z['max_plant_height_m'] else 'exceeds_visibility_limit'
            if height_state=='unknown_required_height_limit':
                warn('sightline_height_gap','Required maximum height is unknown; visibility scores zero.');addcap('unknown_site')
            if height_state=='exceeds_visibility_limit':addcap('spatial_impossibility');exclude.append('Operational height exceeds the project visibility limit.')
    ratios['spatial']=.8*MATRIX['spatial_footprint'][space_state]+.2*MATRIX['spatial_height'][height_state]
    demand=read('maintenance_demand');vigour=read('vigour_or_spread_risk')
    maintenance_ratio=MATRIX['maintenance'][demand][p['maintenance']];vigour_ratio=MATRIX['vigour'][vigour][p['maintenance']]
    if vigour=='high' and p['vigourControl']=='yes':vigour_ratio=.5 if p['maintenance']=='low' else 1 if p['maintenance']!='unknown' else 0
    if p['maintenance']=='unknown':
        warn('project_data_gap','Maintenance capacity unknown: management component scores zero.');addcap('unknown_site')
    if maintenance_ratio==0 and p['maintenance']!='unknown':warn('maintenance_conflict','Operational demand exceeds maintenance capacity.')
    ratios['maintenance_vigour']=(maintenance_ratio+vigour_ratio)/2
    # Gates are calculated before ranking; all components still survive exclusion.
    fid=read('fixture_id');pid=read('plant_id');name=read('scientific_name');dutch=read('dutch_name')
    gate('H01_IDENTITY',name in UNKNOWN or pid in UNKNOWN,'Taxon identity unresolved.' if name in UNKNOWN or pid in UNKNOWN else 'Archived accepted identity retained; specialist review pending.')
    invasive=read('invasive_status');legal=read('protected_or_legal_status');native=read('native_status_nl');provenance=read('provenance_status');contact=read('public_contact_status');toxic=read('toxicity_status');edible=read('edible_use_status');thorns=read('thorns_or_spines')
    gate('H02_INVASIVE_LEGAL',invasive in ['listed_nl','listed_eu','invasive_elsewhere'] or legal=='legally_prohibited','Invasive='+invasive+'; legal/protection='+legal+'.',invasive in UNKNOWN or legal in UNKNOWN or legal=='protected')
    edge_requirement=read('water_edge_requirement')
    edge_ok=z['waterEdge']=='yes' and z['hydrology'] in ['seasonal','long','permanent','edge']
    gate('H03_WATER_EDGE',edge_requirement=='required' and not edge_ok,'Required edge='+edge_requirement+'; confirmed compatible edge='+str(edge_ok)+'.')
    if edge_requirement=='preferred' and not edge_ok:warn('water_edge_preference','Operational wet-site preference has no confirmed water edge; not a mandatory aquatic gate.')
    no_permanent='permanent' not in plant['hydrology_tolerance']
    gate('H04_PERMANENT_WATER',z['hydrology']=='permanent' and no_permanent,'Hydrology unknown; permanent water is not ruled out for a record without operational permanent tolerance.' if z['hydrology']=='unknown' and no_permanent else 'Permanent-water regime needs explicit operational permanent tolerance.',z['hydrology']=='unknown' and no_permanent)
    gate('H05_SUPPORT',support_required and not p['support'],'Climbing support required='+str(support_required)+'; supplied='+str(p['support'])+'.')
    gate('H06_PUBLIC_CONTACT',p['publicAccess'] and contact=='unsuitable','Public access='+str(p['publicAccess'])+'; contact status='+contact+'.',p['publicAccess'] and contact in UNKNOWN)
    gate('H07_WOODY_GEOMETRY',woody and geometry_known and not fits and p['evaluation_stage']=='placement','Woody spread footprint '+str(round(spread,3))+'m; clear geometry='+space_state+'; stage='+p['evaluation_stage']+'.',woody and (not geometry_known or not fits and p['evaluation_stage']=='candidate'))
    gate('H08_VIGOUR',p['maintenance']=='low' and vigour=='high' and p['vigourControl']!='yes','Maintenance='+p['maintenance']+'; vigour='+vigour+'; explicit control='+p['vigourControl']+'.',vigour=='high' and p['maintenance']=='unknown' and p['vigourControl']!='yes')
    if p['maintenance']=='low' and vigour=='high' and p['vigourControl']=='yes':
        warn('active_vigour_control_required','High-vigour pilot candidate requires the declared ongoing control; conditional management ratio 0.5.');addcap('active_vigour_control_required')
    gate('H09_NATIVE_POLICY',p['rewilding'] and native=='introduced','Native status='+native+'; native-only policy='+str(p['rewilding'])+'.',p['rewilding'] and native in UNKNOWN)
    gate('H10_RESTORATION_POLICY',p['type']=='restoration' and native=='introduced' and not p['restorationOrnamentals'],'Restoration ornamental exception='+str(p['restorationOrnamentals'])+'; native='+native+'.',p['type']=='restoration' and (native in UNKNOWN or native=='introduced' and p['restorationOrnamentals']))
    if p['type']=='restoration' and native=='introduced' and p['restorationOrnamentals']:warn('restoration_ornamental_exception','Known introduced record admitted only through the explicit restoration ornamental override; disclose it separately and keep it under policy review (rulebook G05).')
    if native=='introduced' and not p['rewilding']:warn('non_native_label','Known introduced (non-native) record: label it explicitly with a rationale (rulebook G05). This is not an invasiveness finding.')
    gate('H11_PATH_THORNS',z['path_edge']=='yes' and thorns in THORNS and p['evaluation_stage']=='placement','Mapped path edge='+z['path_edge']+'; thorn evidence='+thorns+'.',z['path_edge']!='no' and thorns in UNKNOWN or thorns in THORNS and (z['path_edge']=='unknown' or p['evaluation_stage']=='candidate' and z['path_edge']=='yes'))
    gate('H12_MAINTENANCE_CAPACITY',False,'Operational maintenance demand='+demand+'; project capacity='+p['maintenance']+'; demand ratio='+str(maintenance_ratio)+'.',p['maintenance']=='unknown' or maintenance_ratio==0)
    applicable=['invasive_status','protected_or_legal_status','provenance_status','toxicity_status']
    if p['publicAccess']:applicable+=['public_contact_status','thorns_or_spines']
    if p['publicHarvest']:applicable+=['edible_use_status']
    if p['rewilding'] or p['type']=='restoration':applicable+=['native_status_nl']
    unresolved=[f for f in applicable if plant[f] in UNKNOWN or f=='protected_or_legal_status' and plant[f]=='protected']
    for f in unresolved:warn('policy_or_safety_review_required',f+'='+str(plant[f])+'; demonstration conditional only, no real-world clearance.')
    if unresolved:addcap('unknown_policy')
    if p['publicAccess'] and contact in UNKNOWN:addcap('unreviewed_public_contact')
    if p['rewilding'] and native in UNKNOWN:addcap('unknown_native_rewilding')
    if toxic not in UNKNOWN:warn('documented_toxicity','Archived toxicity='+toxic+'; parts, exposure and public use require specialist assessment.')
    hazards=read('unresolved_safety_or_policy_json')
    if p['publicAccess']:
        for f in ['allergen_risk','irritant_sap','contact_irritation_status']:
            item=hazards.get(f,{'status':'unknown'})
            warn('public_contact_hazard_context',f+'='+str(item['status'])+'; no general safety clearance.')
    harvest_allowed=p['publicHarvest'] and edible=='reviewed_for_requested_use' and toxic=='no_hazard_reviewed_for_use' and contact=='reviewed_for_project' and provenance=='reviewed_for_project' and not unresolved
    if p['publicHarvest'] and (not harvest_allowed or not plant['production_eligible']):warn('harvesting_not_recommended','Public harvesting requested; pilot records cannot clear identity/parts/preparation/exposure/provenance for the requested use. Never recommend consumption.')
    production=read('production_eligible')
    warn('simulation_only','production_eligible='+str(production).lower()+'; this result is a pilot simulation, not planting, procurement or food advice.')
    if z['canopy']=='yes':warn('canopy_context','Canopy present: use observed light; no additional canopy score or assumed future shade.')
    elif z['canopy']=='unknown':warn('canopy_context','Canopy context unknown; light remains the only light score.')
    component_scores={k:round(v*RULES['components'][k]['weight'],4) for k,v in ratios.items()}
    raw=round(total(component_scores.values()),4)
    hard_excluded=any(g['triggered'] for g in gates)
    final=0 if hard_excluded else min([raw]+[cap for reason,cap in caps])
    state='excluded' if hard_excluded else next(s for s in ['strong_match','suitable','conditional_match','unsuitable'] if final>=RULES['thresholds'][s])
    # Points a confirmed input could still resolve; reported only, never added to a score.
    weight={k:spec['weight'] for k,spec in RULES['components'].items()}
    withheld=total([weight[k] for k in ['soil','moisture','hydrology','light'] if z[k]=='unknown']+[weight['disturbance_hardscape']/2 for k in ['disturbance','hardscape'] if z[k]=='unknown']+([.8*weight['spatial']] if not geometry_known else [])+([.2*weight['spatial']] if height_state=='unknown_required_height_limit' else [])+([weight['maintenance_vigour']] if p['maintenance']=='unknown' else []))
    known_failure=any(rule in ['known_environmental_conflict','spatial_impossibility'] for rule,cap in caps)
    if state=='unsuitable' and not known_failure and raw+withheld>=RULES['thresholds']['conditional_match']:
        state='data_gap';exclude.append('Data gap: '+str(round(float(withheld),3))+' points withheld for unknown inputs; confirm site/project data before screening (rulebook G02 zone_data_gap). Not a known conflict.')
    # Evidence confidence does not depend on the compatibility ratios.
    site_factors={k:factor(k) for k in ['soil','moisture','hydrology','light','disturbance','hardscape']}
    geom_factor=1 if geometry_known else 0
    spatial_factor=.8*geom_factor+.2*(0 if height_state=='unknown_required_height_limit' else 1)
    contextual={'soil':site_factors['soil'],'moisture':site_factors['moisture'],'hydrology':site_factors['hydrology'],'light':site_factors['light'],'disturbance_hardscape':(site_factors['disturbance']+site_factors['hardscape'])/2,'spatial':spatial_factor,'maintenance_vigour':0 if p['maintenance']=='unknown' else 1}
    confidence_terms={};component_origins={}
    for k,spec in RULES['components'].items():
        fields=spec['plant_fields'];component_origins[k]={f:origins[f] for f in fields}
        confidence_terms[k]=round(total(conf[f] for f in fields)/len(fields)*contextual[k]*spec['weight']/100,5)
        assumptions=[f+'='+origins[f] for f in fields if origins[f] in ['expert_inference','synthetic_fallback']]
        if assumptions:warn('component_assumptions',k+' relies on '+', '.join(assumptions)+'. This is simulated compatibility, not reviewed field evidence.')
    policy_factor=max(.5,1-.05*len(unresolved));source_factor=RULES['site_source_factors'][z['source']]
    evidence_confidence=round(total(confidence_terms.values())*policy_factor*source_factor,4)
    # Design preferences are an explicitly separate tie-breaker.
    colour=read('flower_colour');start=read('flower_start_month');end=read('flower_end_month');poll=read('pollinator_value');role=read('composition_role');layer=read('functional_layer')
    design_terms={}
    if p['anchorColours']:design_terms['colour']=1 if colour in p['anchorColours'] else 0
    if p['desiredFlowerMonths']:design_terms['months']=len(set(range(start,end+1)) & set(p['desiredFlowerMonths']))/len(set(p['desiredFlowerMonths']))
    if 'pollinators' in p['priorities']:design_terms['pollinator']=1 if poll in ['nectar_reported','pollinator_visitation_reported'] else .5 if poll=='pilot_potential' else 0
    design_terms['character_role']=.5 if p['character']=='mosaic' else 0 if p['character']=='open' and role=='woody_framework' else 1 if p['character']=='enclosed' and role=='woody_framework' or p['character']=='open' and role!='woody_framework' else .5
    design_score=round(100*total(design_terms.values())/len(design_terms),4)
    design_assumptions=[f+'='+origins[f] for f in DESIGN if origins[f] in ['expert_inference','synthetic_fallback']]
    if design_assumptions:warn('design_assumptions','Design output uses '+', '.join(design_assumptions)+'.')
    if poll=='pilot_potential':warn('synthetic_pollinator_output','Pollinator value is a simulation placeholder; no researched ecological benefit is asserted.')
    quantity_state='resolved_pilot_capacity';quantity=0
    if support_required:
        if z['support_length_m']=='unknown':quantity_state='unresolved_support';warn('support_quantity_gap','Mapped support length required for climber stock estimate.')
        else:quantity=math.floor(z['support_length_m']/spacing)
    elif geometry_known:
        quantity=min(math.floor(dimensions[0]/spacing)*math.floor(dimensions[1]/spacing),math.floor(dimensions[2]/spacing**2))
        if p['area']!='unknown':quantity=min(quantity,math.floor(p['area']/spacing**2))
    else:quantity_state='unresolved_space'
    if not fits and not support_required:quantity=0
    if group=='Trees' and p['character']=='open':quantity=0;quantity_state='omitted_by_design_preference'
    diagnostic_quantity=quantity
    if state in ['excluded','unsuitable','data_gap']:quantity=0;quantity_state='not_eligible_for_pilot_placement'
    # All fields are either directly consumed above or published as evidence/display output.
    trace={f:read(f) for f in ['synthetic_derivations_json','evidence_claim_ids_json','field_resolutions_json','record_notes']}
    return {'fixture_id':fid,'plant_id':pid,'scientific_name':name,'dutch_name':dutch,'group':group,'zone_id':z['zone_id'],'raw_suitability_score':raw,'final_suitability_score':round(final,4),'evidence_confidence_score':evidence_confidence,'eligibility_state':state,'points_withheld_for_unknown_inputs':round(withheld,4),'native_evidence_tier':RULES['native_evidence_tiers'].get(native,1),'eligible_for_demo_ranking':state in ['strong_match','suitable','conditional_match'],'production_eligible':production,'component_scores':component_scores,'component_ratios':ratios,'component_value_origins':component_origins,'component_confidence_terms':confidence_terms,'confidence_factors':{'site_source':source_factor,'policy':policy_factor,'site_fields':site_factors,'component_context':contextual},'hard_gate_results':gates,'score_caps':[{'rule':r,'cap':c} for r,c in sorted(set(caps))],'warnings':warnings,'inclusion_reasons':include or ['No confirmed full component match; inspect conditional ratios and exclusions.'],'exclusion_reasons':exclude or ['No known hard exclusion; unresolved policy/safety still blocks real-world use.'],'design_preference_score':design_score,'design_preference_components':design_terms,'design_output':{'flower_start_month':start,'flower_end_month':end,'flower_colour':colour,'pollinator_value':poll,'origins':{f:origins[f] for f in DESIGN}},'placement':{'height_m':height,'spread_m':spread,'spacing_m':spacing,'clear_footprint_m':footprint,'footprint_state':space_state,'visibility_state':height_state,'functional_layer':layer,'composition_role':role,'climbing_support_required':support_required,'vigour_or_spread_risk':vigour,'thorns_or_spines':thorns,'origins':{f:origins[f] for f in SPATIAL+['thorns_or_spines']}},'quantity':{'approximate_stock_capacity':quantity,'diagnostic_capacity_before_eligibility':diagnostic_quantity,'state':quantity_state,'unit':'plants','basis':'Single-species capacity only; no mixed-plan allocation or seed-rate claim.','spacing_rule':'SPACE-01'},'harvesting_allowed':bool(harvest_allowed and production and not hard_excluded and state!='unsuitable'),'profile_trace':trace,'unresolved_safety_or_policy':hazards,'consumed_fields':sorted(used)}

def rank(results):
    # Explicit stages from the rules file; strings (fixture_id) compare by code point, ascending only.
    stages=RULES['ranking_stages']
    return sorted([r for r in results if r['eligible_for_demo_ranking']],key=lambda r:tuple(-r[s['field']] if s['order']=='desc' else r[s['field']] for s in stages))

def run_examples(inputs=None,output_dir=None):
    inputs=read_json(inputs or DATA/'research/demo-v0_3/example-inputs.json');out=Path(output_dir or DATA/'research/demo-v0_3/example-results');out.mkdir(parents=True,exist_ok=True)
    allresults=[];summaries={}
    for zone in inputs['zones']:
        results=[evaluate(plant,zone,inputs['project']) for plant in load_plants()];allresults+=results
        ranked=rank(results)
        summaries[zone['zone_id']]={'record_count':len(results),'ranked_eligible':[{'rank':i+1,**{k:r[k] for k in ['fixture_id','scientific_name','raw_suitability_score','final_suitability_score','evidence_confidence_score','eligibility_state']}} for i,r in enumerate(ranked)],'excluded_plants':[{'fixture_id':r['fixture_id'],'scientific_name':r['scientific_name'],'raw_score':r['raw_suitability_score'],'reasons':[g for g in r['hard_gate_results'] if g['triggered']]} for r in results if r['eligibility_state']=='excluded'],'unsuitable_plants':[{'fixture_id':r['fixture_id'],'reasons':r['exclusion_reasons']} for r in results if r['eligibility_state']=='unsuitable'],'top_demonstration_candidates':[{'scientific_name':r['scientific_name'],'final_score':r['final_suitability_score'],'raw_score':r['raw_suitability_score'],'confidence':r['evidence_confidence_score'],'explanation':r['inclusion_reasons'],'warnings':r['warnings'],'synthetic_components':[k for k,v in r['component_value_origins'].items() if 'synthetic_fallback' in v.values()]} for r in ranked[:5]]}
    (out/'all-plant-zone-evaluations.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n' for r in allresults),encoding='utf-8')
    headers=['zone_id','fixture_id','plant_id','scientific_name','raw_suitability_score','final_suitability_score','evidence_confidence_score','eligibility_state','design_preference_score','production_eligible']
    rows=[]
    for r in allresults:
        row={k:r[k] for k in headers}
        row.update({k+'_points':v for k,v in r['component_scores'].items()})
        for f in ['component_value_origins','hard_gate_results','warnings','inclusion_reasons','exclusion_reasons','placement','quantity']:row[f+'_json']=json.dumps(r[f],ensure_ascii=False,separators=(',',':'))
        rows.append(row)
    write_csv(out/'all-plant-zone-scores.csv',rows)
    write_json(out/'zone-rankings-and-explanations.json',summaries)
    print('Evaluated',len(allresults),'plant–zone pairs. Full outputs:',out)
    return allresults,summaries

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--inputs');parser.add_argument('--output-dir');args=parser.parse_args();run_examples(args.inputs,args.output_dir)
