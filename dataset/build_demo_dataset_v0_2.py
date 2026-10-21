"""Offline deterministic builder for the separate 60-fixture research layer.
Reads versioned reviewed working observations; never touches national/application inputs.
"""
import csv, hashlib, json, sys
from collections import Counter, defaultdict
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'research/demo-v0_2'))
from model import ADMIN, BOOL, DATE, FIELDS, GROUPS, MULTI, NUMERIC, ORIGINS, ROOT, SAFETY, TRAIT_MAP, UNITS, VOCAB, profile_schema

DATA=ROOT/'dataset';RESEARCH=DATA/'research/demo-v0_2'
PROFILE=DATA/'derived/plantscapes_demo_plant_traits_v0_2.csv'
CLAIMS=DATA/'claims/plantscapes_demo_plant_claims_v0_2.jsonl'
GAPS=DATA/'derived/plantscapes_demo_data_gaps_v0_2.csv'
LEDGER=DATA/'source-ledger-demo-v0_2.csv'
MANIFEST=DATA/'dataset_manifest_demo_v0_2.json'
STATS=DATA/'derived/plantscapes_demo_completeness_v0_2.json'
REQUIRED_PRODUCTION=sorted(SAFETY|set('soil_textures moisture_regimes drainage_tolerance light_regimes mature_height_min_m mature_height_max_m mature_spread_min_m mature_spread_max_m dimension_context suitable_establishment_methods management_warnings'.split()))

def save_json(path,value):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

def cell(value):
    if value is None:return ''
    if isinstance(value,bool):return str(value).lower()
    if isinstance(value,list):return '|'.join(str(v) for v in value)
    if isinstance(value,dict):return json.dumps(value,ensure_ascii=False,separators=(',',':'))
    return str(value)

def write_csv(path,rows,fields=None):
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('w',encoding='utf-8',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=fields or list(rows[0]),lineterminator='\n');writer.writeheader()
        for row in rows:writer.writerow({k:cell(v) for k,v in row.items()})

def build():
    research=json.loads((RESEARCH/'source-observations.json').read_text(encoding='utf-8'))
    baseline=json.loads((RESEARCH/'baseline.json').read_text())
    national=DATA/'derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv'
    assert hashlib.sha256(national.read_bytes()).hexdigest()==baseline['national_sha256']
    for relative,digest in baseline['protected_files'].items():assert hashlib.sha256((ROOT/relative).read_bytes()).hexdigest()==digest,relative
    sources=research['sources'][:]
    sources.append({'source_id':'demo-composition-policy-v0_2','title':'Explicit demo composition role policy','creator_or_publisher':'Plantscapes research prototype','source_type':'synthetic_demonstration_policy','publication_or_release_date':DATE,'edition_or_version':'0.2.0','url_or_identifier':'dataset/build_demo_dataset_v0_2.py#demo-role-policy','licence_or_rights':'Original project demonstration policy; rights ownership not assessed.','permitted_use':'Prototype composition simulation only; contains no botanical evidence.','attribution_text':'Plantscapes demo research layer','access_date':DATE,'review_notes':'Only functional_layer and community_roles have synthetic values. Real fields remain null. No trial spacing or hydrology is invented.','geographic_scope':'simulation only','rights_status':'internal_reference_only','rights_evidence_url':'','content_sha256':''})
    source_map={s['source_id']:s for s in sources};assert len(source_map)==len(sources)
    profiles=[];claims=[];gaps=[];decisions=[]
    def claim(profile,o,index,synthetic_details=None):
        source=source_map[o['source_id']]
        identifier=profile['fixture_id']+'-claim-'+str(index).zfill(4)
        value={'fixture_id':profile['fixture_id'],'field':o['field'],'origin':o['origin'],'real_value':None if synthetic_details else o['value'],'demo_value':o['value'] if synthetic_details else None,'resolution_priority':o['resolution_priority'],'resolution_status':'demo_only' if synthetic_details else 'candidate_evidence','interpretation':o['qualifier']}
        if synthetic_details:value['synthetic_derivation']=synthetic_details
        claims.append({'claim_id':identifier,'taxon':{'taxon_id':profile['plant_id'],'scientific_name':profile['accepted_scientific_name'] or profile['fixture_scientific_name'],'vernacular_nl':profile['vernacular_nl'],'synonyms':profile['synonyms'] or [],'taxonomic_authority':profile['taxonomic_authority']},'trait':TRAIT_MAP.get(o['field'],'other'),'value':value,'unit':UNITS[o['field']],'qualifier':o['qualifier'],'geographic_scope':o['geographic_scope'],'evidence':{'source_id':o['source_id'],'locator':o['locator'],'edition_or_version':source['edition_or_version'],'rights_status':source['rights_status'],'accessed_on':DATE,'verbatim_note':None},'review':{'status':'unreviewed' if synthetic_details else 'needs_second_review','reviewer':None,'reviewed_on':None,'confidence':'unknown' if synthetic_details else 'medium','notes':'Research extraction and source-scope QA completed by Codex; independent botanical/legal/rights sign-off not performed.'},'record_status':'synthetic' if synthetic_details else 'provisional'})
        return identifier
    group_for={f:g for g,fields in GROUPS.items() for f in fields.split()}
    for p in research['plants']:
        profile={f:None for f in FIELDS};profile.update(p['fixture']);profile.update({k:p[k] for k in ['plant_id','taxon_match_type','identity_status','catalogue_candidate_ids']})
        origins={f:'unknown' for f in FIELDS};field_claims={f:[] for f in FIELDS};field_gaps={};demo={};obs=defaultdict(list)
        for o in p['observations']:obs[o['field']].append(o)
        for field,candidates in obs.items():
            assert field in FIELDS,field
            candidates.sort(key=lambda o:o['resolution_priority']); chosen=candidates[0]
            profile[field]=chosen['value'];origins[field]=chosen['origin']
            if field=='toxic_parts':profile[field]=sorted({part for o in candidates for part in o['value']})
        # Withheld values expose conflicting/source-scope uncertainty; never average the bounds.
        conflicts={}
        if profile['fixture_scientific_name']=='Quercus robur':
            for f in ['mature_height_min_m','mature_height_max_m','growth_rate']:
                conflicts[f]='Dutch botanical register and Dutch forestry profile describe different envelopes or growth phases. Keep all source claims; no age/site-specific resolution or average.'
        if profile['fixture_scientific_name'] in ('Rudbeckia fulgida','Frangula alnus'):
            conflicts['evergreen_status']='Deciduous and evergreen foliage descriptions remain unresolved across/in the source records; climate and plant-part retention need review.'
        if profile['fixture_scientific_name']=='Viburnum opulus':
            for f in ['edible_parts','edibility_evidence_status']:
                conflicts[f]='NCSU reports fruit use while the Dutch Heukels/FLORON compilation reports toxic berries. Part/maturity/dose/preparation scope has not been reconciled. No edible resolved value is released.'
        for field,reason in conflicts.items():
            if obs[field]:profile[field]=None;origins[field]='conflicting'
        # Each physical dimension is handled as a paired envelope from ONE preferred source.
        # Open categories do not acquire a maximum from another source.
        for prefix,flag in [('mature_height','height_upper_bound_open'),('mature_spread','spread_upper_bound_open')]:
            lower=prefix+'_min_m';upper=prefix+'_max_m'
            if lower in conflicts:continue
            if obs[lower]:
                selected=obs[lower][0];same=[o for o in obs[upper] if o['source_id']==selected['source_id'] and o['resolution_priority']==selected['resolution_priority']]
                profile[upper]=same[0]['value'] if same else None
                origins[upper]=same[0]['origin'] if same else 'unknown'
                flags=[o for o in obs[flag] if o['source_id']==selected['source_id']]
                profile[flag]=flags[0]['value'] if flags else None;origins[flag]=flags[0]['origin'] if flags else 'unknown'
        if obs['mature_height_min_m']:
            sid=obs['mature_height_min_m'][0]['source_id']
            contexts=[o for o in obs['dimension_context'] if o['source_id']==sid]
            if contexts:profile['dimension_context']=contexts[0]['value'];origins['dimension_context']=contexts[0]['origin']
        # Claims retain each source separately, including supplementary or conflicting candidates.
        index=0
        for field in FIELDS:
            for o in obs[field]:
                index+=1;cid=claim(profile,o,index);field_claims[field].append(cid)
                if origins[field]=='conflicting':claims[-1]['value']['resolution_status']='conflicting_unresolved'
                elif profile[field]==o['value']:claims[-1]['value']['resolution_status']='selected_provisional'
                elif field=='toxic_parts':claims[-1]['value']['resolution_status']='selected_positive_part_union'
                else:claims[-1]['value']['resolution_status']='retained_alternative_scope'
        # A role assignment is a design example, never a botanical or suitability fact.
        layer,role={
            'Trees':('canopy','structural'),'Shrubs':('shrub','structural'),
            'Flowers & herbs':('herb','flowering'),'Grasses, sedges & rushes':('graminoid','matrix'),
            'Climbers':('climber','vertical'),'Aquatic & marginal plants':('water_margin','water_edge'),
        }[profile['fixture_group']]
        for field,value in [('functional_layer',[layer]),('community_roles',[role])]:
            assert not obs[field], 'Sourced design-role evidence must take precedence.'
            detail={'plant_id':profile['plant_id'],'trait':field,'synthetic_value':value,'unit':UNITS[field],'rationale':'Exercise future prototype composition grouping, without asserting a botanical design role.','bounding_basis':'Existing explicitly synthetic fixture group: '+profile['fixture_group']+'. This is a demonstration design-policy mapping, not growth-form trait evidence.','sources_searched':[s['url'] for s in p['searches']],'reason_evidence_insufficient':'Opened species records provide botanical/horticultural facts, but no reviewed Plantscapes community plan for the target site.','risk_if_treated_as_real':'Could place a species in an inappropriate design layer or mixture; does not establish compatibility, quantities or safety.','future_reviewer_required':'Planting designer and ecologist for a specified site and community.'}
            index+=1;o={'field':field,'value':value,'source_id':'demo-composition-policy-v0_2','origin':'synthetic_fallback','locator':'dataset/build_demo_dataset_v0_2.py#demo-role-policy','qualifier':'Synthetic composition example only. The actual trait value remains unknown.','geographic_scope':'simulation only','resolution_priority':999}
            field_claims[field].append(claim(profile,o,index,detail));origins[field]='synthetic_fallback';demo[field]=value
        for field in FIELDS:
            if origins[field] not in ['unknown','conflicting','synthetic_fallback']:continue
            group=group_for[field]; relevant=[s for s in p['searches'] if group in s['areas'] or (group=='growth' and 'dimensions' in s['areas']) or (group=='identity' and any(k in s['areas'] for k in ['identity','nl_status','legal','invasive','occurrence'])) or (group=='maintenance' and any(k in s['areas'] for k in ['maintenance','establishment']))]
            searched=[s['url']+' ['+s['result']+']' for s in relevant]
            reason=conflicts.get(field,'Opened taxon-specific source records did not support this exact field with adequate identity, measurement, geographic or use scope. Bounded research is not proof the trait is absent.')
            if field.startswith('soil_ph_') and field!='soil_ph_classes':reason='Only broad qualitative pH descriptions/classes were found; no supported numeric physiological limits. Category boundaries are not tolerance endpoints.'
            if field=='flower_end_month' and profile['flower_start_month'] is not None:reason='Selected Dutch botanical register provides a seasonal/ambiguous endpoint or no numeric endpoint; no month inferred from autumn.'
            if field in ['spacing_min_m','spacing_max_m','density_min_per_m2','density_max_per_m2']:reason='Horticultural size/available-space descriptors are not planting density or trial spacing evidence for an authored community. No universal density inferred.'
            if field in ['regional_occurrence_status','establishment_status_nl']:reason='National taxonomy and distribution/phenology page examined. No dated regional occurrence export or explicit establishment assessment obtained. No aggregate counts, map absence or native status used as a substitute.'
            if field=='invasive_status':reason='NVWA Union List and species pages examined. A name absent from the Union List is not a general invasive assessment; US invasive reports are not Dutch status.'
            if field=='protected_status_nl':reason='Dutch species status and NVWA legal list examined; historical Red List does not establish current statutory protection. A current taxon-specific legal assessment remains required.'
            if field=='provenance_requirement':reason='Species identity/status and any seed-source notes examined. No project-specific authority/policy requirement can be inferred from native status or nursery propagation.'
            if field in SAFETY:reason+=' Safety/legal/identity inference and synthetic replacement are prohibited.'
            synthetic=field in demo;gap_id=profile['fixture_id']+'-gap-'+field
            field_gaps[field]=gap_id
            conflict_basis=field_claims['toxicity_status']+field_claims['toxic_parts'] if profile['fixture_scientific_name']=='Viburnum opulus' and field in ['edible_parts','edibility_evidence_status'] else []
            gaps.append({'gap_id':gap_id,'fixture_id':profile['fixture_id'],'plant_id':profile['plant_id'],'accepted_scientific_name':profile['accepted_scientific_name'],'trait':field,'value_origin':origins[field],'real_resolved_value':None,'what_was_searched':searched,'search_record':'dataset/research/demo-v0_2/source-observations.json#'+profile['fixture_id'],'why_evidence_insufficient':reason,'synthetic_fallback_created':synthetic,'synthetic_value':demo.get(field),'unit':UNITS[field],'fallback_rationale':'Illustrate composition grouping only; no source-based site-specific design role.' if synthetic else '', 'bounding_information':'Original synthetic fixture group '+profile['fixture_group'] if synthetic else '', 'risk_if_treated_as_real':'Unsuitable grouping or ecological competition; prototype only.' if synthetic else 'Unknown must not be treated as absence, zero, tolerance, safe use or legal clearance.', 'required_future_review':'Independent botanist/toxicologist/competent legal or provenance authority, as appropriate.' if field in SAFETY else 'Planting designer/ecologist; source-specific measurement and NL/site applicability review.', 'blocking_real_world_use':field in REQUIRED_PRODUCTION or synthetic,'retained_claim_ids':field_claims[field],'supporting_conflict_claim_ids':conflict_basis})
        profile.update({'record_status':'conflicting' if conflicts else 'provisional','production_eligible':False,'evidence_confidence':'conflicting' if conflicts else 'provisional','reviewed_by':None,'reviewed_on':None,'source_claim_ids':[cid for ids in field_claims.values() for cid in ids],'synthetic_field_names':list(demo),'unresolved_field_names':[f for f in FIELDS if profile[f] is None],'record_notes':' | '.join(p['taxonomic_notes']+['Independent botanical, safety, legal, rights and site review pending; no real-world use. Ornamental track denotes fixture purpose, never Dutch native/establishment status.']),'field_origins_json':origins,'field_claim_ids_json':field_claims,'field_gap_ids_json':field_gaps,'demo_fallback_values_json':demo})
        profiles.append(profile)
        for f in FIELDS:decisions.append({'fixture_id':profile['fixture_id'],'trait':f,'origin':origins[f],'selected_value':profile[f],'claim_ids':field_claims[f],'gap_id':field_gaps.get(f),'resolution_rule':conflicts.get(f,'Lower source-specific resolution_priority preferred; retain other geographic/cultivation scopes. Hazard parts combine only explicit positive source reports. Open dimension endpoints use one source.'),'demo_value':demo.get(f)})
    write_csv(PROFILE,profiles,ADMIN+FIELDS)
    CLAIMS.parent.mkdir(exist_ok=True)
    CLAIMS.write_text(''.join(json.dumps(c,ensure_ascii=False,separators=(',',':'))+'\n' for c in claims),encoding='utf-8')
    write_csv(LEDGER,sources)
    write_csv(GAPS,gaps)
    save_json(DATA/'schemas/demo-plant-profile-v0_2.schema.json',profile_schema())
    save_json(RESEARCH/'resolved-profiles.json',profiles)
    save_json(RESEARCH/'resolution-decisions.json',decisions)
    save_json(DATA/'schemas/demo-plant-claim-value-v0_2.schema.json',{'$schema':'https://json-schema.org/draft/2020-12/schema','title':'Additional value contract; every claim ALSO validates against unchanged plant-claim.schema.json','type':'object','required':['fixture_id','field','origin','real_value','demo_value','resolution_priority','resolution_status','interpretation'],'properties':{'fixture_id':{'type':'string'},'field':{'enum':FIELDS},'origin':{'enum':ORIGINS},'real_value':{},'demo_value':{},'resolution_priority':{'type':'integer'},'resolution_status':{'enum':['demo_only','candidate_evidence','selected_provisional','selected_positive_part_union','retained_alternative_scope','conflicting_unresolved']},'interpretation':{'type':'string'},'synthetic_derivation':{'type':'object','required':['plant_id','trait','synthetic_value','unit','rationale','bounding_basis','sources_searched','reason_evidence_insufficient','risk_if_treated_as_real','future_reviewer_required']}},'additionalProperties':False})
    value_schema_path=DATA/'schemas/demo-plant-claim-value-v0_2.schema.json'
    value_schema=json.loads(value_schema_path.read_text(encoding='utf-8'))
    value_schema['properties']['occurrence_context']={'type':'object','required':['geographic_level','area_identifier','start_year','end_year','spatial_resolution_m','date_basis','sensitivity_or_generalisation'],'properties':{'geographic_level':{'enum':['national','province','municipality','grid','site','point']},'area_identifier':{'type':'string'},'start_year':{'type':['integer','null'],'minimum':1},'end_year':{'type':['integer','null'],'minimum':1},'spatial_resolution_m':{'type':['number','null'],'minimum':0},'date_basis':{'type':'string'},'sensitivity_or_generalisation':{'type':'string'}},'additionalProperties':False,'description':'Required for future occurrence claims. Null dates/resolution explicitly retain gaps; no map absence interpretation.'}
    value_schema['properties']['measurement_context']={'type':'object','properties':{'life_stage':{'type':['string','null']},'cultivar_or_stock':{'type':['string','null']},'original_value':{},'original_unit':{'type':['string','null']},'measurement_method':{'type':['string','null']},'target_age_year':{'type':['number','null'],'minimum':0}},'additionalProperties':False}
    value_schema['allOf']=[{'if':{'properties':{'field':{'const':'regional_occurrence_status'}},'required':['field']},'then':{'required':['occurrence_context']}}]
    save_json(value_schema_path,value_schema)
    def summary(records):
        counts=Counter(origin for p in records for origin in p['field_origins_json'].values());total=len(records)*len(FIELDS)
        sourced=sum(counts[o] for o in ORIGINS[:3]);provisional=sourced+counts['expert_inference']
        safety_sourced=sum(p['field_origins_json'][f] in ORIGINS[:3] for p in records for f in SAFETY)
        nls=sum(any(c['claim_id'] in p['field_claim_ids_json'][f] and c['geographic_scope']=='NL' and c['value']['resolution_status'] in ['selected_provisional','selected_positive_part_union'] for c in claims) for p in records for f in FIELDS if p[f] is not None)
        return {'trait_slots':total,'origin_counts':{o:counts[o] for o in ORIGINS},'sourced_count':sourced,'sourced_percentage':round(sourced/total*100,2),'provisional_count':provisional,'provisional_percentage':round(provisional/total*100,2),'synthetic_percentage':round(counts['synthetic_fallback']/total*100,2),'unknown_percentage':round(counts['unknown']/total*100,2),'conflicting_percentage':round(counts['conflicting']/total*100,2),'reviewed_percentage':0,'safety_field_slots':len(records)*len(SAFETY),'safety_sourced_count':safety_sourced,'safety_sourced_percentage':round(safety_sourced/(len(records)*len(SAFETY))*100,2),'safety_reviewed_percentage':0,'netherlands_evidence_field_count':nls,'netherlands_evidence_percentage_of_all_fields':round(nls/total*100,2)}
    stats=summary(profiles)
    stats['denominator_note']='Evidence-bearing A-F fields and documented extensions only; administrative IDs/flags excluded. Sourced and provisional overlap: every sourced value is provisional. Synthetic slots have NULL real values and are not counted again as unknown origin. Safety includes identity/policy and all D fields.'
    stats['by_plant']={p['fixture_id']:{'name':p['accepted_scientific_name'],**summary([p])} for p in profiles}
    stats['by_field']={}
    for f in FIELDS:
        counts=Counter(p['field_origins_json'][f] for p in profiles);sourced=sum(counts[o] for o in ORIGINS[:3]);nls=sum(any(c['claim_id'] in p['field_claim_ids_json'][f] and c['geographic_scope']=='NL' and c['value']['resolution_status'] in ['selected_provisional','selected_positive_part_union'] for c in claims) for p in profiles if p[f] is not None)
        stats['by_field'][f]={'records':len(profiles),'origin_counts':{o:counts[o] for o in ORIGINS},'sourced_percentage':round(sourced/len(profiles)*100,2),'provisional_percentage':round(sourced/len(profiles)*100,2),'synthetic_percentage':round(counts['synthetic_fallback']/len(profiles)*100,2),'unknown_percentage':round(counts['unknown']/len(profiles)*100,2),'conflicting_percentage':round(counts['conflicting']/len(profiles)*100,2),'netherlands_evidence_percentage':round(nls/len(profiles)*100,2)}
    stats['plants_with_nl_evidence']=sum(any(c['claim_id'] in p['source_claim_ids'] and c['geographic_scope']=='NL' for c in claims) for p in profiles)
    save_json(STATS,stats)
    manifest={'dataset_name':'Plantscapes 60-fixture botanical research and separate demonstration values','version':'0.2.0','created_on':DATE,'record_count':60,'fixture_counts':{'core':54,'ornamental':6},'claim_count':len(claims),'data_gap_count':len(gaps),'source_count':len(sources),'evidence_trait_field_count':len(FIELDS),'national_backbone_sha256':baseline['national_sha256'],'national_backbone_record_count':2443,'protected_input_sha256':baseline['protected_files'],'production_eligible_count':0,'required_production_fields':REQUIRED_PRODUCTION,'source_summary':dict(Counter(s['creator_or_publisher'] for s in sources)),'licences':sorted({s['licence_or_rights'] for s in sources}),'field_completeness':stats['by_field'],'synthetic_field_count':stats['origin_counts']['synthetic_fallback'],'unresolved_field_count':sum(len(p['unresolved_field_names']) for p in profiles),'unknown_origin_field_count':stats['origin_counts']['unknown'],'conflicting_field_count':stats['origin_counts']['conflicting'],'taxonomy_unresolved_fixtures':[p['fixture_id'] for p in profiles if p['identity_status'] in ['unresolved','ambiguous']],'catalogue_unmatched_fixtures':[p['fixture_id'] for p in profiles if p['identity_status']=='resolved_external'],'limitations':['No independent expert/rights/legal approval: all sourced values provisional.','Current provincial occurrence, establishment, provenance and statutory protection remain unknown.','Historical Red List 2012 values are not current legal statuses.','Source rights unresolved or restricted except GBIF and NVWA; no combined open redistribution licence asserted.','National flora heights are not age-standardised; oak height/growth and foliage conflicts withheld.','UK/US horticultural attributes do not prove NL ecological suitability; source scopes retained.','Qualitative pH and hydrology never receive invented numeric endpoints.','Only design roles have synthetic fallbacks; real role fields remain NULL.','No application integration or recommendation/location engine edits.'],'files':{},'all_profiles_blocked_by_safety_or_legal_unknowns':True}
    for path in [PROFILE,CLAIMS,GAPS,LEDGER,STATS,DATA/'schemas/demo-plant-profile-v0_2.schema.json',DATA/'schemas/demo-plant-claim-value-v0_2.schema.json',RESEARCH/'source-observations.json',RESEARCH/'resolution-decisions.json',RESEARCH/'fixtures.json']:
        manifest['files'][str(path.relative_to(ROOT)).replace('\\','/')]=hashlib.sha256(path.read_bytes()).hexdigest()
    save_json(MANIFEST,manifest)
    print(json.dumps({k:manifest[k] for k in ['record_count','claim_count','source_count','evidence_trait_field_count','synthetic_field_count','unresolved_field_count','conflicting_field_count']},indent=2))

if __name__=='__main__':build()
