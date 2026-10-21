"""Stdlib-only deterministic structural, provenance, scoring and sensitivity checks.

Run from repository root: python dataset/validate_demo_matching_v0_3.py
Validation writes only versioned v0.3 statistics/test results, never protected inputs.
"""
import copy,csv,hashlib,json,math,statistics,sys
from collections import Counter
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).parent/'research/demo-v0_3'))
from pilot_model import *
from build_matching_v0_3 import fixtures
from score_demo_suitability_v0_3 import evaluate,rank,RULES,CONTRACT,UNKNOWN
HERE=DATA/'research/demo-v0_3'

def check(condition,message):
    if not condition:raise AssertionError(message)

def unchanged(path,digest):
    """Same content as the recorded hash. Hashes were captured on checkouts with different line endings
    (Git core.autocrlf), so LF and CRLF forms of the same bytes both count as unchanged."""
    if not path.is_file():return False
    data=path.read_bytes();lf=data.replace(b'\r\n',b'\n')
    return digest in {hashlib.sha256(x).hexdigest() for x in (data,lf,lf.replace(b'\n',b'\r\n'))}

def schema_check(value,schema,path='$'):
    """Validate every keyword used in the published profile schema (no dependencies)."""
    if 'const' in schema:check(value==schema['const'],path+' const')
    if 'enum' in schema:check(value in schema['enum'],path+' enum')
    kind=schema.get('type')
    valid={'object':lambda:isinstance(value,dict),'array':lambda:isinstance(value,list),'string':lambda:isinstance(value,str),'number':lambda:isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value),'integer':lambda:isinstance(value,int) and not isinstance(value,bool),'boolean':lambda:isinstance(value,bool)}
    if kind:check(valid[kind](),path+' type '+kind)
    if kind=='object':
        check(all(k in value for k in schema.get('required',[])),path+' required')
        if schema.get('additionalProperties') is False:check(set(value)<=set(schema.get('properties',{})),path+' unexpected properties')
        for k,s in schema.get('properties',{}).items():
            if k in value:schema_check(value[k],s,path+'.'+k)
    if kind=='array':
        check(len(value)>=schema.get('minItems',0),path+' minItems')
        if schema.get('uniqueItems'):check(len({json.dumps(v,sort_keys=True) for v in value})==len(value),path+' uniqueItems')
        for v in value:schema_check(v,schema.get('items',{}),path+'[]')
    if kind=='string':check(len(value)>=schema.get('minLength',0),path+' minLength')
    if kind in ['number','integer']:
        if 'minimum' in schema:check(value>=schema['minimum'],path+' minimum')
        if 'maximum' in schema:check(value<=schema['maximum'],path+' maximum')
        if 'exclusiveMinimum' in schema:check(value>schema['exclusiveMinimum'],path+' exclusiveMinimum')

def numeric_result(r):
    for f in ['raw_suitability_score','final_suitability_score','evidence_confidence_score','design_preference_score']:
        check(isinstance(r[f],(int,float)) and math.isfinite(r[f]) and 0<=r[f]<=100,'Invalid score '+f)
    check(set(r['component_scores'])==set(RULES['components']),'Incomplete components')
    for k,v in r['component_scores'].items():check(isinstance(v,(int,float)) and 0<=v<=RULES['components'][k]['weight'],'Invalid component '+k)
    check(abs(sum(r['component_scores'].values())-r['raw_suitability_score'])<.0002,'Raw sum')
    check(r['eligibility_state'] in RULES['eligibility_states'],'Missing state')
    check(len(r['hard_gate_results'])==len(RULES['hard_gates']),'Incomplete gate trace')
    check(r['final_suitability_score']<=r['raw_suitability_score'],'Final cannot increase raw')
    if any(g['triggered'] for g in r['hard_gate_results']):check(r['eligibility_state']=='excluded' and r['final_suitability_score']==0 and not r['eligible_for_demo_ranking'],'Hard gate not enforced')
    check(bool(r['inclusion_reasons']) and bool(r['exclusion_reasons']),'Unexplained result')

def tests(plants,examples):
    base=copy.deepcopy(examples['zones'][1]);base.update(available_width_m=40,available_length_m=40,plantable_area_m2=1600,light='sun',source='survey',canopy='no')
    project=copy.deepcopy(examples['project']);project.update(publicAccess=False,area=2000,evaluation_stage='placement')
    changes={
     'soil':({'soil':'sand'},{'soil':'peat'},None,None),
     'moisture':({'moisture':'dry'},{'moisture':'wet'},None,None),
     'hydrology':({'hydrology':'none'},{'hydrology':'permanent'},None,None),
     'light':({'light':'sun'},{'light':'shade'},None,None),
     'disturbance':({'disturbance':'low'},{'disturbance':'high'},None,None),
     'hardscape':({'hardscape':'no'},{'hardscape':'yes'},None,None),
     'water_edge':({'hydrology':'permanent','waterEdge':'yes','moisture':'wet'},{'hydrology':'permanent','waterEdge':'no','moisture':'wet'},None,None),
     'maintenance_capacity':(None,None,{'maintenance':'low'},{'maintenance':'high'}),
     'available_spatial_dimensions':({'available_width_m':1,'available_length_m':1,'plantable_area_m2':1},{'available_width_m':40,'available_length_m':40,'plantable_area_m2':1600},None,None),
     'climbing_support':(None,None,{'support':False},{'support':True}),
     'public_access':(None,None,{'publicAccess':False},{'publicAccess':True}),
     'rewilding_policy':(None,None,{'rewilding':False},{'rewilding':True})}
    sensitivity=[]
    for key,(za,zb,pa,pb) in changes.items():
        found=[]
        for plant in plants:
            a=evaluate(plant,{**base,**(za or {})},{**project,**(pa or {})});b=evaluate(plant,{**base,**(zb or {})},{**project,**(pb or {})})
            numeric_result(a);numeric_result(b)
            if any(a[f]!=b[f] for f in ['raw_suitability_score','final_suitability_score','eligibility_state']):found.append({'fixture_id':plant['fixture_id'],'scientific_name':plant['scientific_name'],'before':{f:a[f] for f in ['raw_suitability_score','final_suitability_score','eligibility_state']},'after':{f:b[f] for f in ['raw_suitability_score','final_suitability_score','eligibility_state']}})
        check(found,'Unused sensitivity input '+key)
        sensitivity.append({'input':key,'changed_plants':len(found),'zone_before':za or {},'zone_after':zb or {},'project_before':pa or {},'project_after':pb or {},'example':found[0]})
    # Boundary, uncertainty, non-double-counting and adversarial policy tests.
    plant=plants[0]
    unknown=evaluate(plant,{'zone_id':'unknown_zone'},{})
    numeric_result(unknown)
    for k in ['soil','moisture','hydrology','light','disturbance_hardscape']:check(unknown['component_scores'][k]==0,'Unknown site counted as compatible')
    check(unknown['evidence_confidence_score']==0,'Unknown site confidence')
    check(unknown['eligibility_state']=='data_gap' and not unknown['eligible_for_demo_ranking'],'Unknown inputs labelled as a known conflict')
    made=evaluate(plant,{**base,'soil':'made'},project);check(made['component_ratios']['soil']==.25,'Made ground cleared as compatible')
    ca=evaluate(plant,{**base,'canopy':'yes'},project);cb=evaluate(plant,{**base,'canopy':'no'},project)
    check(ca['raw_suitability_score']==cb['raw_suitability_score'] and ca['component_scores']==cb['component_scores'],'Canopy doubles light')
    high=copy.deepcopy(plant);high['vigour_or_spread_risk']='high'
    check(evaluate(high,base,{**project,'maintenance':'low','vigourControl':'no'})['eligibility_state']=='excluded','High vigour rule')
    controlled=evaluate(high,base,{**project,'maintenance':'low','vigourControl':'yes'});check(not next(g for g in controlled['hard_gate_results'] if g['gate_id']=='H08_VIGOUR')['triggered'],'Explicit control did not resolve vigour gate')
    known_gates=[('invasive_status','listed_eu','H02_INVASIVE_LEGAL',{}),('invasive_status','invasive_elsewhere','H02_INVASIVE_LEGAL',{}),('protected_or_legal_status','legally_prohibited','H02_INVASIVE_LEGAL',{}),('public_contact_status','unsuitable','H06_PUBLIC_CONTACT',{'publicAccess':True}),('native_status_nl','introduced','H09_NATIVE_POLICY',{'rewilding':True}),('scientific_name','unknown','H01_IDENTITY',{})]
    for field,value,gateid,extra in known_gates:
        altered=copy.deepcopy(plant);altered[field]=value
        r=evaluate(altered,base,{**project,**extra,'anchorColours':[plant['flower_colour']],'desiredFlowerMonths':list(range(1,13)),'priorities':['pollinators']})
        numeric_result(r);check(next(g for g in r['hard_gate_results'] if g['gate_id']==gateid)['triggered'],'Missed gate '+gateid);check(r['final_suitability_score']==0 and not rank([r]),'Design overrode hard gate')
        check(r['raw_suitability_score']>0,'Lost diagnostic score')
    harvest=evaluate(plant,base,{**project,'publicHarvest':True});check(not harvest['harvesting_allowed'] and any(w['code']=='harvesting_not_recommended' for w in harvest['warnings']),'Unreviewed harvesting approved')
    narrow=next(p for p in plants if len(p['soil_tolerance'])<3)
    incompatible=next(s for s in VOCAB['soil_tolerance'] if s not in narrow['soil_tolerance'])
    conflict=evaluate(narrow,{**base,'soil':incompatible},{**project,'anchorColours':[narrow['flower_colour']],'desiredFlowerMonths':list(range(narrow['flower_start_month'],narrow['flower_end_month']+1))})
    check(conflict['component_scores']['soil']==0 and conflict['final_suitability_score']<=49 and not rank([conflict]),'Design overrode environmental conflict')
    # Confidence changes independently of compatibility.
    alternative=copy.deepcopy(plant)
    for f in NONSAFETY:alternative['field_confidence_json'][f]=30;alternative['field_origins_json'][f]='synthetic_fallback'
    a=evaluate(plant,base,project);b=evaluate(alternative,base,project)
    check(a['raw_suitability_score']==b['raw_suitability_score'] and a['final_suitability_score']==b['final_suitability_score'],'Evidence contaminated biological score')
    check(a['evidence_confidence_score']!=b['evidence_confidence_score'],'Evidence confidence unused')
    # Candidate versus placement and explicit height gate remain separate.
    tree=next(p for p in plants if p['group']=='Trees')
    tight={**base,'available_width_m':.1,'available_length_m':.1,'plantable_area_m2':.01}
    check(next(g for g in evaluate(tree,tight,{**project,'evaluation_stage':'placement'})['hard_gate_results'] if g['gate_id']=='H07_WOODY_GEOMETRY')['triggered'],'Placement geometry gate')
    check(not next(g for g in evaluate(tree,tight,{**project,'evaluation_stage':'candidate'})['hard_gate_results'] if g['gate_id']=='H07_WOODY_GEOMETRY')['triggered'],'Placement gate flattened into candidate gate')
    tall=evaluate(tree,{**base,'path_edge':'yes','max_plant_height_m':.1},{**project,'sightlines':True});check(tall['component_scores']['spatial']<15,'Visibility height unused')
    climber=next(p for p in plants if p['climbing_support_required'])
    short=evaluate(climber,{**base,'support_length_m':.01},project)
    check(short['final_suitability_score']<=49 and short['quantity']['approximate_stock_capacity']==0,'Impossible support span passed spatial screen')
    thorny=next(p for p in plants if p['thorns_or_spines']=='thorns_present')
    check(next(g for g in evaluate(thorny,{**base,'path_edge':'yes'},project)['hard_gate_results'] if g['gate_id']=='H11_PATH_THORNS')['triggered'],'Known thorn gate unused')
    unknown_safety=copy.deepcopy(plant)
    for f in POLICY:unknown_safety[f]='unknown'
    check(evaluate(unknown_safety,base,{**project,'publicAccess':True})['final_suitability_score']<=59,'Unknown safety cleared')
    # All compatibility matrix entries are in the supported numeric domain.
    for name,matrix in RULES['compatibility_matrices'].items():
        for vals in matrix.values():
            for v in vals.values() if isinstance(vals,dict) else [vals]:check(v in [0,.25,.5,1],'Undocumented matrix ratio '+name)
    return sensitivity

def main():
    plants=load_plants();schema=read_json(DATA/'schemas/demo-matching-ready-v0_3.schema.json');examples=read_json(HERE/'example-inputs.json')
    check(len(plants)==60 and len({p['fixture_id'] for p in plants})==60,'Exactly 60 unique profiles required')
    check(len({p['plant_id'] for p in plants})==60,'Duplicate taxon identities require explanation')
    check(Counter('ornamental' if 'ornamental' in p['fixture_id'] else 'core' for p in plants)=={'core':54,'ornamental':6},'54/6 fixture split')
    fixture_names={v[0] for track,v in fixtures()}
    old=read_json(DATA/'research/demo-v0_2/resolved-profiles.json');check(fixture_names=={p['fixture_scientific_name'] for p in old},'Fixture reconciliation changed')
    check({p['fixture_id']:p['plant_id'] for p in plants}=={p['fixture_id']:p['plant_id'] for p in old},'Taxon IDs changed')
    check(len({p['scientific_name'] for p in plants})==60,'Duplicate accepted names require explanation')
    claims={c['claim_id']:c for c in (json.loads(x) for x in (DATA/'claims/plantscapes_demo_plant_claims_v0_2.jsonl').read_text(encoding='utf-8').splitlines())}
    ledger=list(csv.DictReader((DATA/'source-ledger-demo-v0_2.csv').open(encoding='utf-8-sig')));sources={r['source_id'] for r in ledger}
    derived=[json.loads(x) for x in (HERE/'operational-derivations.jsonl').read_text(encoding='utf-8').splitlines()];dkeys={(d['fixture_id'],d['field']) for d in derived}
    check(len(dkeys)==len(derived),'Duplicate operational derivation records')
    counts=Counter();byfield={f:Counter() for f in FIELDS};byp=[]
    for plant in plants:
        schema_check(plant,schema,plant['fixture_id'])
        expected_derivations={f for f in FIELDS if plant['field_origins_json'][f] in ['expert_inference','synthetic_fallback']}
        check(set(plant['synthetic_derivations_json'])==expected_derivations,'Extra/missing per-record derivation')
        check(plant['flower_start_month']<=plant['flower_end_month'],'Unexplained wrapping flowering range')
        per=Counter()
        for f in FIELDS:
            value=plant[f];r=plant['field_resolutions_json'][f];origin=plant['field_origins_json'][f]
            check(value is not None and value!='' and value!=[],'Blank operational field '+f)
            check(r['operational_value']==value and r['operational_value_origin']==origin,'Inconsistent resolution '+f)
            check(r['operational_value_confidence']==plant['field_confidence_json'][f]==ORIGIN_CONF[r['evidence_class']],'Inconsistent confidence '+f)
            check(r['evidence_class']!='independently_reviewed','Unreviewed pilot labelled independently reviewed')
            if f in IDENTITY+POLICY:check(origin not in ['expert_inference','synthetic_fallback'],'Prohibited synthesized/inferred '+f)
            if origin in ['expert_inference','synthetic_fallback']:
                check(f in plant['synthetic_derivations_json'] and (plant['fixture_id'],f) in dkeys,'Missing derivation '+f)
                d=plant['synthetic_derivations_json'][f]
                for key in ['derivation_rule','rationale','uncertainty','risk_if_wrong','future_verification_needed','archive_gap_reference']:check(bool(d[key]),'Incomplete derivation '+key)
            if origin=='sourced':check(bool(r['source_locator']),'Missing source locator '+f)
            if origin=='sourced' and f not in ['fixture_id','plant_id']:check(bool(r['claim_ids']),'Sourced trait without claim '+f)
            for cid in r['claim_ids']:
                check(cid in claims and claims[cid]['evidence']['source_id'] in sources,'Untraceable claim '+cid)
                check(claims[cid]['value']['fixture_id']==plant['fixture_id'] and claims[cid]['taxon']['taxon_id']==plant['plant_id'],'Cross-plant claim '+cid)
                claimfield=claims[cid]['value']['field']
                if claimfield in ['mature_height_min_m','mature_height_max_m','mature_spread_min_m','mature_spread_max_m']:check(claims[cid]['unit']=='m','Dimension claim unit mismatch')
                if claimfield in ['flower_start_month','flower_end_month']:check(claims[cid]['unit']=='month','Flower claim unit mismatch')
            counts[origin]+=1;byfield[f][origin]+=1;per[origin]+=1
        check(not plant['production_eligible'],'Pilot cannot be production eligible')
        for f,hazard in plant['unresolved_safety_or_policy_json'].items():
            check(hazard['origin'] not in ['expert_inference','synthetic_fallback'],'Inferred safety-context warning '+f)
            for cid in hazard.get('claim_ids',[]):check(cid in claims and claims[cid]['evidence']['source_id'] in sources,'Untraceable public hazard context')
        byp.append({'fixture_id':plant['fixture_id'],'scientific_name':plant['scientific_name'],**{o:per[o] for o in ORIGINS},'non_safety_completeness_pct':100})
    check(all(r['licence_or_rights'] and r['permitted_use'] for r in ledger),'Source rights not recorded')
    check(dkeys=={(p['fixture_id'],f) for p in plants for f in FIELDS if p['field_origins_json'][f] in ['expert_inference','synthetic_fallback']},'Derivation ledger mismatch')
    check(sum(spec['weight'] for spec in RULES['components'].values())==100,'Weights must total 100')
    for name,spec in RULES['components'].items():
        for f in spec['site_or_project_fields']:check(f in CONTRACT['zone_required']+CONTRACT['project_required'],'Scored criterion has no site/project input '+f)
    matrix=list(csv.DictReader((DATA/'derived/plantscapes_demo_field-use-matrix_v0_3.csv').open(encoding='utf-8-sig')))
    retained={r['proposed_v0_3_field']:r for r in matrix if r['status']=='retained'}
    check(set(retained)==set(FIELDS+TRACE),'Field-use coverage missing')
    check(all(r['consumer']!='none' and r['rule_identifier']!='ARCHIVE' for r in retained.values()),'Unused retained field')
    results=[];consumed=set()
    for zone in examples['zones']:
        zone_results=[]
        for plant in plants:
            a=evaluate(plant,zone,examples['project']);b=evaluate(plant,copy.deepcopy(zone),copy.deepcopy(examples['project']))
            numeric_result(a);check(a==b,'Nondeterministic evaluation');consumed.update(a['consumed_fields']);zone_results.append(a)
        check(len(zone_results)==60,'Not all plants evaluated');results+=zone_results
    check(consumed==set(FIELDS+TRACE),'Actual evaluator failed field consumption: '+str(set(FIELDS+TRACE)-consumed))
    output=[json.loads(x) for x in (HERE/'example-results/all-plant-zone-evaluations.jsonl').read_text(encoding='utf-8').splitlines()]
    check(output==results,'Saved example outputs are stale')
    sensitivity=tests(plants,examples)
    baseline=read_json(HERE/'protected-inputs.json');checked=0
    changed=[path for path in baseline['files'] if not unchanged(ROOT/path,baseline['files'][path])];checked=len(baseline['files'])
    check(not changed,'Protected files changed ('+str(len(changed))+'): '+', '.join(changed))
    national=DATA/'derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv'
    check(len(list(csv.DictReader(national.open(encoding='utf-8-sig'))))==2443,'National identity backbone count')
    check(unchanged(national,'167256ade50af4cf4ce5af9a186ac1867212e237f26311631f7eaaf17e5de739'),'National baseline hash')
    noncounts=Counter(p['field_origins_json'][f] for p in plants for f in NONSAFETY)
    safety_unknown=sum(p[f] in UNKNOWN for p in plants for f in POLICY)
    confidence=[r['evidence_confidence_score'] for r in results]
    stats={'version':VERSION,'date':DATE,'profiles':60,'core':54,'ornamental':6,'operational_field_count':len(FIELDS),'non_safety_field_count':len(NONSAFETY),'policy_safety_field_count':len(POLICY),'identity_field_count':len(IDENTITY),'trace_columns':len(TRACE),'csv_column_count':len(FIELDS+TRACE),'all_field_origin_counts':dict(counts),'non_safety_origin_counts':dict(noncounts),'safety_or_policy_unknown_values':safety_unknown,'field_completeness':{f:{'populated':60,'percentage':100,'origins':dict(v),'sourced_pct':round(v['sourced']/60*100,2),'inferred_pct':round(v['expert_inference']/60*100,2),'synthetic_pct':round(v['synthetic_fallback']/60*100,2),'unknown_or_unreviewed_pct':round((v['unknown']+v['not_reviewed']+v['conflicting'])/60*100,2)} for f,v in byfield.items()},'evidence_confidence_distribution':{'count':len(confidence),'min':min(confidence),'median':round(statistics.median(confidence),4),'mean':round(statistics.mean(confidence),4),'max':max(confidence),'bands':dict(Counter('0–24.99' if v<25 else '25–49.99' if v<50 else '50–74.99' if v<75 else '75–100' for v in confidence))},'example_states':dict(Counter(r['eligibility_state'] for r in results)),'all_records_production_eligible':False,'protected_files_hash_checked':checked,'validation':'PASS','sensitivity_tests':sensitivity}
    write_json(HERE/'validation-and-completeness.json',stats)
    write_csv(HERE/'completeness-by-plant.csv',byp)
    write_csv(HERE/'completeness-by-field.csv',[{'field':f,**{k:v for k,v in s.items() if k!='origins'},**{o:s['origins'].get(o,0) for o in ORIGINS}} for f,s in stats['field_completeness'].items()])
    print('PASS: 60 profiles; 180 complete deterministic results; 12 actual-dataset sensitivity inputs; safety/provenance/gate/matrix/schema checks;',checked,'protected file hashes unchanged; national rows=2443.')
    print('Non-safety origins:',dict(noncounts));print('Safety/policy explicit unknown or unreviewed values:',safety_unknown);print('Confidence:',stats['evidence_confidence_distribution'])
    return stats

if __name__=='__main__':main()
