"""Deterministic offline validation. Requires jsonschema>=4.26,<5.
Usage: python dataset/validate_demo_dataset_v0_2.py [--self-test]
Exit 0 only when all schemas, cross-file invariants and protected input hashes pass.
"""
import copy, csv, hashlib, json, subprocess, sys
from collections import Counter, defaultdict
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
sys.path.insert(0,str(Path(__file__).parent/'research/demo-v0_2'))
from model import ADMIN, BOOL, DATE, FIELDS, MULTI, NUMERIC, ORIGINS, ROOT, SAFETY, UNITS, VOCAB
from build_demo_dataset_v0_2 import REQUIRED_PRODUCTION

DATA=ROOT/'dataset';R=DATA/'research/demo-v0_2'

def read_csv(path):return list(csv.DictReader(path.open(encoding='utf-8-sig',newline='')))
def read_json(path):return json.loads(path.read_text(encoding='utf-8'))

def decode(row):
    result={}
    for key,value in row.items():
        if key.endswith('_json'):result[key]=json.loads(value)
        elif key in MULTI or key in ['source_claim_ids','synthetic_field_names','unresolved_field_names','catalogue_candidate_ids']:
            result[key]=(value.split('|') if value else None) if key in FIELDS else (value.split('|') if value else [])
        elif key in NUMERIC:result[key]=None if value=='' else int(value) if key.endswith('_month') or key=='dimension_target_year' else float(value)
        elif key in BOOL or key=='production_eligible':
            assert value in ['true','false',''],f'Boolean {key} invalid: {value}'
            result[key]=None if value=='' else value=='true'
        elif key in FIELDS or key in ['reviewed_by','reviewed_on']:result[key]=value if value!='' else None
        else:result[key]=value
    return result

def assert_true(test,message):
    if not test:raise AssertionError(message)

def validate(profiles,claims,ledger,gaps,manifest,check_files=True):
    profile_schema=read_json(DATA/'schemas/demo-plant-profile-v0_2.schema.json')
    claim_schema=read_json(DATA/'schemas/plant-claim.schema.json')
    value_schema=read_json(DATA/'schemas/demo-plant-claim-value-v0_2.schema.json')
    validators=[Draft202012Validator(s,format_checker=FormatChecker()) for s in [profile_schema,claim_schema,value_schema]]
    for schema in [profile_schema,claim_schema,value_schema]:Draft202012Validator.check_schema(schema)
    assert_true(len(profiles)==60,'Exactly 60 profiles required')
    assert_true(Counter(p['fixture_track'] for p in profiles)=={'core':54,'ornamental':6},'54/6 fixture split required')
    assert_true(len({p['fixture_id'] for p in profiles})==60,'Duplicate fixture ID')
    assert_true(len({c['claim_id'] for c in claims})==len(claims),'Duplicate claim ID')
    assert_true(len({s['source_id'] for s in ledger})==len(ledger),'Duplicate source ID')
    assert_true(len({g['gap_id'] for g in gaps})==len(gaps),'Duplicate gap ID')
    fixture_script="const fs=require('fs'),vm=require('vm');const window={};vm.runInNewContext(fs.readFileSync('website/data/demo-data.js','utf8'),{window});console.log(JSON.stringify([...window.PLANTSCAPES_DEMO.plants.map((p,i)=>['demo-core-'+String(i+1).padStart(2,'0'),p[0]]),...window.PLANTSCAPES_DEMO.ornamentals.map((p,i)=>['demo-ornamental-'+String(i+1).padStart(2,'0'),p[0]])]))"
    original=dict(json.loads(subprocess.check_output(['node','-e',fixture_script],cwd=ROOT,encoding='utf-8')))
    assert_true({p['fixture_id']:p['fixture_scientific_name'] for p in profiles}==original,'Not the exact source fixtures')
    catalogue=read_csv(DATA/'derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv');cat={p['plant_id']:p for p in catalogue}
    source_map={s['source_id']:s for s in ledger};claim_map={c['claim_id']:c for c in claims};gap_map={g['gap_id']:g for g in gaps};profile_map={p['fixture_id']:p for p in profiles}
    for source in ledger:
        for field in ['title','creator_or_publisher','source_type','publication_or_release_date','edition_or_version','url_or_identifier','licence_or_rights','permitted_use','access_date','rights_status']:
            assert_true(bool(source[field]),f'Source rights/version/locator metadata missing: {source["source_id"]} / {field}')
        assert_true(source['rights_status'] in ['open','permission_granted','internal_reference_only','unknown','restricted'],'Undocumented rights status')
        assert_true(source['access_date']==DATE,'Source access date mismatch')
    for c in claims:
        validators[1].validate(c);validators[2].validate(c['value'])
        value=c['value'];f=value['field'];fid=value['fixture_id'];p=profile_map.get(fid)
        assert_true(not (f in SAFETY and value['origin']=='expert_inference'),'Safety/legal/identity inference prohibited')
        assert_true(p is not None,'Claim references missing fixture')
        assert_true(c['taxon']['taxon_id']==p['plant_id'] and c['taxon']['scientific_name']==p['accepted_scientific_name'],'Claim taxon mismatch')
        assert_true(c['evidence']['source_id'] in source_map,'Claim references missing source')
        source=source_map[c['evidence']['source_id']]
        assert_true(c['evidence']['rights_status']==source['rights_status'],'Claim rights differs from ledger')
        assert_true(c['unit']==UNITS[f],f'Incorrect unit: {c["claim_id"]}')
        assert_true(c['claim_id'] in p['field_claim_ids_json'][f],'Unlinked claim')
        if value['origin']=='synthetic_fallback':
            assert_true(f not in SAFETY,'Synthetic safety/legal/identity field prohibited')
            assert_true(value['real_value'] is None and value['demo_value'] is not None,'Synthetic value contaminated real slot')
            assert_true(c['record_status']=='synthetic','Synthetic status hidden')
            assert_true(f in p['field_gap_ids_json'],'Synthetic value missing gap')
            assert_true(value['synthetic_derivation']['plant_id']==p['plant_id'],'Synthetic derivation plant mismatch')
            validators[0].evolve(schema=profile_schema['properties'][f]).validate(value['demo_value'])
        else:
            assert_true(value['demo_value'] is None,'Sourced claim has demo value')
            validators[0].evolve(schema=profile_schema['properties'][f]).validate(value['real_value'])
        if c['review']['status']=='reviewed' or c['record_status']=='verified':
            assert_true(bool(c['review']['reviewer']) and bool(c['review']['reviewed_on']),'Reviewed claim missing reviewer/date')
            assert_true(c['review']['status']=='reviewed','Verified requires reviewed claim')
    names=defaultdict(list)
    for p in profiles:
        validators[0].validate(p)
        names[p['accepted_scientific_name']].append(p)
        assert_true(p['accepted_scientific_name'] is not None or p['identity_status'] in ['unresolved','ambiguous'],'Identity neither resolved nor explicitly unknown')
        if p['identity_status']=='resolved_catalogue':
            assert_true(p['plant_id'] in cat,'Catalogue plant_id not preserved')
            assert_true(p['fixture_scientific_name'] in [cat[p['plant_id']]['scientific_name'],cat[p['plant_id']]['canonical_name']],'Invalid catalogue rank/name reduction')
        if '×' in p['fixture_scientific_name']:assert_true('×' in p['accepted_scientific_name'] and p['taxon_match_type']=='cultivar or hybrid match','Hybrid silently flattened')
        for f in FIELDS:
            origin=p['field_origins_json'][f];ids=p['field_claim_ids_json'][f];v=p[f]
            assert_true(origin in ORIGINS,'Undocumented value origin')
            for cid in ids:assert_true(cid in claim_map and claim_map[cid]['value']['field']==f and claim_map[cid]['value']['fixture_id']==p['fixture_id'],'Invalid field-to-claim link')
            if origin in ORIGINS[:4]:
                assert_true(v is not None and bool(ids),'Sourced resolved value missing value or claim')
                if f=='toxic_parts':
                    parts={x for cid in ids for x in (claim_map[cid]['value']['real_value'] or [])}
                    assert_true(set(v)<=parts,'Resolved hazard part unsupported')
                else:assert_true(any(claim_map[cid]['value']['real_value']==v for cid in ids),'Resolved sourced value does not match any exact claim')
            else:
                assert_true(v is None,'Unknown/conflicting/synthetic real value must remain NULL')
                assert_true(f in p['field_gap_ids_json'],'Unresolved or synthetic field missing gap')
                gap=gap_map[p['field_gap_ids_json'][f]]
                assert_true(gap['trait']==f and gap['fixture_id']==p['fixture_id'] and gap['value_origin']==origin,'Gap does not correspond to field')
                assert_true(bool(gap['what_was_searched']) and bool(gap['why_evidence_insufficient']) and bool(gap['required_future_review']),'Gap lacks documented search/review')
                if origin=='conflicting':
                    supporting=gap['supporting_conflict_claim_ids'].split('|') if gap['supporting_conflict_claim_ids'] else []
                    for cid in supporting:assert_true(cid in claim_map and claim_map[cid]['value']['fixture_id']==p['fixture_id'],'Invalid cross-trait conflict basis')
                    assert_true(len(set(ids+supporting))>=2,'Conflict must retain multiple claims, including related toxicity evidence where edibility conflicts')
                if origin=='synthetic_fallback':assert_true(f not in SAFETY and f in p['demo_fallback_values_json'] and gap['synthetic_fallback_created']=='true','Synthetic value missing explicit fallback/gap or prohibited')
        assert_true(set(p['source_claim_ids'])=={cid for ids in p['field_claim_ids_json'].values() for cid in ids},'Incomplete record claim index')
        assert_true(set(p['synthetic_field_names'])==set(p['demo_fallback_values_json']),'Synthetic fields list inconsistent')
        assert_true(set(p['unresolved_field_names'])=={f for f in FIELDS if p[f] is None},'Unknown field list inconsistent')
        for lo,hi in [('soil_ph_min','soil_ph_max'),('inundation_depth_min_cm','inundation_depth_max_cm'),('mature_height_min_m','mature_height_max_m'),('mature_spread_min_m','mature_spread_max_m'),('spacing_min_m','spacing_max_m'),('density_min_per_m2','density_max_per_m2')]:
            if p[lo] is not None and p[hi] is not None:assert_true(p[lo]<=p[hi],f'Reversed bounds: {p["fixture_id"]} {lo}')
        if p['nutrient_tolerance_min'] and p['nutrient_tolerance_max']:assert_true(VOCAB['nutrient_tolerance_min'].index(p['nutrient_tolerance_min'])<=VOCAB['nutrient_tolerance_max'].index(p['nutrient_tolerance_max']),'Reversed nutrient gradient')
        for f in FIELDS:
            if f.endswith('_month') and p[f] is not None:assert_true(1<=p[f]<=12,'Flower/harvest month out of range')
        if p['record_status']=='reviewed' or p['evidence_confidence']=='reviewed':assert_true(p['reviewed_by'] and p['reviewed_on'],'Reviewed profile lacks reviewer/date')
        blockers=[f for f in REQUIRED_PRODUCTION if p['field_origins_json'][f] not in ORIGINS[:3] or not p['field_claim_ids_json'][f] or not all(claim_map[cid]['review']['status']=='reviewed' for cid in p['field_claim_ids_json'][f])]
        rights_blocked=any(source_map[claim_map[cid]['evidence']['source_id']]['rights_status'] not in ['open','permission_granted'] for f in REQUIRED_PRODUCTION for cid in p['field_claim_ids_json'][f])
        if blockers or rights_blocked or p['synthetic_field_names'] or p['record_status']!='reviewed' or not p['reviewed_by'] or not p['reviewed_on']:assert_true(p['production_eligible'] is False,'Ineligible record marked production eligible')
    for name,duplicates in names.items():
        if len(duplicates)>1:assert_true(all('duplicate' in p['record_notes'].lower() for p in duplicates),'Unexplained duplicate accepted names')
    assert_true(manifest['record_count']==len(profiles) and manifest['claim_count']==len(claims) and manifest['source_count']==len(ledger) and manifest['data_gap_count']==len(gaps),'Manifest count mismatch')
    origin_counts=Counter(o for p in profiles for o in p['field_origins_json'].values())
    assert_true(manifest['synthetic_field_count']==origin_counts['synthetic_fallback'] and manifest['conflicting_field_count']==origin_counts['conflicting'],'Manifest trait count mismatch')
    assert_true(manifest['unresolved_field_count']==sum(len(p['unresolved_field_names']) for p in profiles),'Manifest unresolved count mismatch')
    stats=read_json(DATA/'derived/plantscapes_demo_completeness_v0_2.json')
    assert_true(stats['origin_counts']=={o:origin_counts[o] for o in ORIGINS},'Completeness total mismatch')
    for f in FIELDS:
        counts=Counter(p['field_origins_json'][f] for p in profiles)
        assert_true(stats['by_field'][f]['origin_counts']=={o:counts[o] for o in ORIGINS},'Field completeness mismatch')
    if check_files:
        assert_true(len(catalogue)==2443,'National backbone count changed')
        assert_true(hashlib.sha256((DATA/'derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv').read_bytes()).hexdigest()==manifest['national_backbone_sha256'],'National backbone modified')
        baseline=read_json(R/'baseline.json')
        assert_true(baseline['national_sha256']==manifest['national_backbone_sha256'],'Initial checksum baseline changed')
        for relative,digest in baseline['protected_files'].items():assert_true(hashlib.sha256((ROOT/relative).read_bytes()).hexdigest()==digest,'Protected application/schema input changed: '+relative)
        for relative,digest in manifest['files'].items():assert_true(hashlib.sha256((ROOT/relative).read_bytes()).hexdigest()==digest,'Versioned output hash mismatch: '+relative)
    return {'status':'PASS','profiles':len(profiles),'core':54,'ornamental':6,'claims':len(claims),'sources':len(ledger),'gaps':len(gaps),'profile_schema_objects_validated':len(profiles),'claim_schema_objects_validated':len(claims),'claim_value_schema_objects_validated':len(claims),'production_eligible':sum(p['production_eligible'] for p in profiles),'national_backbone_records':len(catalogue),'national_backbone_sha256':manifest['national_backbone_sha256'],'checks':'Schemas; exact fixtures; taxonomic rank/hybrid handling; resolved claim support; source/rights references; separate synthetic values and gaps; vocabularies; SI units; numeric bounds; months; review metadata; eligibility; completeness; preserved inputs.'}

def main():
    profiles=[decode(p) for p in read_csv(DATA/'derived/plantscapes_demo_plant_traits_v0_2.csv')]
    stored=read_json(R/'resolved-profiles.json');assert_true(profiles==stored,'CSV and canonical typed profile snapshot differ')
    lines=(DATA/'claims/plantscapes_demo_plant_claims_v0_2.jsonl').read_text(encoding='utf-8').splitlines()
    claims=[json.loads(line) for line in lines];assert_true(all(isinstance(c,dict) for c in claims),'Each JSONL line must be an individual object')
    ledger=read_csv(DATA/'source-ledger-demo-v0_2.csv');gaps=read_csv(DATA/'derived/plantscapes_demo_data_gaps_v0_2.csv');manifest=read_json(DATA/'dataset_manifest_demo_v0_2.json')
    report=validate(profiles,claims,ledger,gaps,manifest)
    if '--self-test' in sys.argv:
        tests={}
        def reject(name,mutate):
            ps,cs,ls,gs=copy.deepcopy(profiles),copy.deepcopy(claims),copy.deepcopy(ledger),copy.deepcopy(gaps);mutate(ps,cs,ls,gs)
            try:validate(ps,cs,ls,gs,manifest,check_files=False)
            except Exception:tests[name]='rejected';return
            raise AssertionError('Validator failed to reject '+name)
        reject('duplicate_fixture_id',lambda ps,cs,ls,gs:ps[1].update(fixture_id=ps[0]['fixture_id']))
        reject('missing_source_reference',lambda ps,cs,ls,gs:cs[0]['evidence'].update(source_id='missing'))
        reject('synthetic_toxicity',lambda ps,cs,ls,gs:cs[0]['value'].update(field='toxicity_status',origin='synthetic_fallback',real_value=None,demo_value='toxic_reported'))
        reject('inferred_safety',lambda ps,cs,ls,gs:cs[0]['value'].update(field='toxicity_status',origin='expert_inference',real_value='toxic_reported'))
        reject('invented_real_value',lambda ps,cs,ls,gs:ps[0].update(mature_height_min_m=999))
        reject('invalid_month',lambda ps,cs,ls,gs:ps[0].update(flower_start_month=13))
        reject('unknown_controlled_value',lambda ps,cs,ls,gs:ps[0].update(light_regimes=['invented_light']))
        reject('unreviewed_production_eligibility',lambda ps,cs,ls,gs:ps[0].update(production_eligible=True))
        reject('missing_gap',lambda ps,cs,ls,gs:gs.pop(0))
        reject('fabricated_review',lambda ps,cs,ls,gs:cs[0]['review'].update(status='reviewed',reviewer=None,reviewed_on=None))
        reject('hybrid_reduction',lambda ps,cs,ls,gs:ps[57].update(accepted_scientific_name='Nepeta faassenii'))
        reject('unrecorded_source_rights',lambda ps,cs,ls,gs:ls[0].update(licence_or_rights=''))
        report['negative_self_tests']=tests
    (DATA/'derived/plantscapes_demo_validation_v0_2.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=True,indent=2))

if __name__=='__main__':main()
