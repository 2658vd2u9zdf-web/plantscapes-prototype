"""Shared typed CSV contract for the v0.3 simulation, independent of application code."""
import csv,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
DATA=ROOT/'dataset'
VERSION='0.3.0'
DATE='2026-10-13'
IDENTITY=['fixture_id','plant_id','scientific_name','dutch_name']
POLICY=['native_status_nl','invasive_status','protected_or_legal_status','provenance_status','public_contact_status','toxicity_status','edible_use_status','thorns_or_spines']
MATCH=['soil_tolerance','moisture_tolerance','hydrology_tolerance','light_tolerance','disturbance_tolerance','hardscape_tolerance','water_edge_requirement']
SPATIAL=['mature_height_m','mature_spread_m','pilot_spacing_m','functional_layer','composition_role','climbing_support_required','vigour_or_spread_risk']
DESIGN=['flower_start_month','flower_end_month','flower_colour','pollinator_value']
# Pollinator value + both month endpoints + colour = four output fields (not a fifth unused trait).
NONSAFETY=['group']+MATCH+SPATIAL+['maintenance_demand']+DESIGN
FIELDS=IDENTITY+['group']+MATCH+SPATIAL+['maintenance_demand']+POLICY+['production_eligible']+DESIGN
TRACE=['field_origins_json','field_confidence_json','synthetic_derivations_json','unresolved_safety_or_policy_json','evidence_claim_ids_json','field_resolutions_json','record_notes']
ARRAY=set(['soil_tolerance','moisture_tolerance','hydrology_tolerance','light_tolerance','disturbance_tolerance'])
NUMBER=set(['mature_height_m','mature_spread_m','pilot_spacing_m'])
INTEGER=set(['flower_start_month','flower_end_month'])
BOOLEAN=set(['climbing_support_required','production_eligible'])
VOCAB={
 'group':['Trees','Shrubs','Flowers & herbs','Grasses, sedges & rushes','Climbers','Aquatic & marginal plants'],
 'soil_tolerance':['sand','clay','peat'],
 'moisture_tolerance':['dry','fresh','wet'],
 'hydrology_tolerance':['none','seasonal','long','permanent','edge'],
 'light_tolerance':['sun','mixed','shade'],
 'disturbance_tolerance':['low','moderate','high'],
 'hardscape_tolerance':['avoid','conditional','tolerant'],
 'water_edge_requirement':['required','preferred','not_required'],
 'functional_layer':['canopy','shrub','herb','graminoid','climber','water_margin'],
 'composition_role':['woody_framework','matrix','structural_perennial','seasonal_accent','community_patch'],
 'vigour_or_spread_risk':['low','moderate','high'],
 'maintenance_demand':['low','moderate','high'],
 'native_status_nl':['native_original','native_archaeophyte','introduced','unknown','not_reviewed'],
 'invasive_status':['listed_nl','listed_eu','invasive_elsewhere','not_assessed','unknown','not_reviewed'],
 'protected_or_legal_status':['legally_prohibited','protected','not_protected_snapshot','unknown','not_reviewed'],
 'provenance_status':['reviewed_for_project','unknown','not_reviewed'],
 'public_contact_status':['reviewed_for_project','suitable_with_conditions','unsuitable','unknown','not_reviewed'],
 'toxicity_status':['toxic_reported','weakly_toxic_reported','strongly_toxic_reported','harmful_to_dogs_reported','no_hazard_reviewed_for_use','unknown','not_reviewed'],
 'edible_use_status':['reviewed_for_requested_use','prohibited','conflicting','unknown','not_reviewed'],
 'thorns_or_spines':['thorns_present','prickles_present','absent_reported','unknown','not_reviewed'],
 'flower_colour':['white','red','pink','purple','blue','yellow','green','brown','cream','transparent','orange'],
 'pollinator_value':['nectar_reported','pollinator_visitation_reported','pilot_potential','not_assessed'],
}
ORIGINS=['sourced','expert_inference','synthetic_fallback','unknown','conflicting','not_reviewed','policy_rule']
ORIGIN_CONF={'independently_reviewed':100,'official_unreviewed':85,'institutional_secondary':70,'expert_inference':55,'synthetic_fallback':30,'unknown':0,'conflicting':0,'not_reviewed':0,'policy_rule':0}

def read_json(path):return json.loads(Path(path).read_text(encoding='utf-8'))
def write_json(path,data):
    Path(path).parent.mkdir(parents=True,exist_ok=True)
    Path(path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def encode(value):
    if isinstance(value,(dict,list)):
        return '|'.join(str(x) for x in value) if isinstance(value,list) else json.dumps(value,ensure_ascii=False,separators=(',',':'))
    if isinstance(value,bool):return str(value).lower()
    return '' if value is None else str(value)
def write_csv(path,rows,headers=None):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('w',encoding='utf-8',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=headers or list(rows[0]),lineterminator='\n');writer.writeheader()
        for row in rows:writer.writerow({k:encode(v) for k,v in row.items()})
def load_plants(path=None):
    path=path or DATA/'derived/plantscapes_demo_matching_ready_v0_3.csv'
    plants=[]
    for row in csv.DictReader(Path(path).open(encoding='utf-8-sig',newline='')):
        plant={}
        for key,value in row.items():
            if key.endswith('_json'):plant[key]=json.loads(value)
            elif key in ARRAY:plant[key]=value.split('|') if value else []
            elif key in NUMBER:plant[key]=float(value)
            elif key in INTEGER:plant[key]=int(value)
            elif key in BOOLEAN:
                if value not in ['true','false']:raise ValueError('Invalid boolean '+key)
                plant[key]=value=='true'
            else:plant[key]=value
        plants.append(plant)
    return plants

def plant_schema():
    props={}
    for f in FIELDS:
        if f in ARRAY:props[f]={'type':'array','items':{'enum':VOCAB[f]},'minItems':1,'uniqueItems':True}
        elif f in NUMBER:props[f]={'type':'number','exclusiveMinimum':0}
        elif f in INTEGER:props[f]={'type':'integer','minimum':1,'maximum':12}
        elif f in BOOLEAN:props[f]={'type':'boolean'}
        else:props[f]={'type':'string','minLength':1,**({'enum':VOCAB[f]} if f in VOCAB else {})}
    props['production_eligible']={'type':'boolean','const':False,'description':'This pilot never clears construction, safety, harvesting or procurement.'}
    for f in TRACE:props[f]={'type':'string','minLength':1} if f=='record_notes' else {'type':'object'}
    props['field_origins_json']={'type':'object','required':FIELDS,'properties':{f:{'enum':ORIGINS} for f in FIELDS},'additionalProperties':False}
    props['field_confidence_json']={'type':'object','required':FIELDS,'properties':{f:{'type':'number','minimum':0,'maximum':100} for f in FIELDS},'additionalProperties':False}
    props['evidence_claim_ids_json']={'type':'object','required':FIELDS,'properties':{f:{'type':'array','items':{'type':'string','minLength':1},'uniqueItems':True} for f in FIELDS},'additionalProperties':False}
    derivation_keys=['fixture_id','plant_id','field','operational_value','real_value','source_values_or_bounding_facts','derivation_rule','rationale','uncertainty','risk_if_wrong','future_verification_needed','evidence_claim_ids','archive_gap_reference','origin']
    derivation={'type':'object','required':derivation_keys,'properties':{f:{} for f in derivation_keys},'additionalProperties':False}
    for f in ['fixture_id','plant_id','field','derivation_rule','rationale','uncertainty','risk_if_wrong','future_verification_needed','archive_gap_reference']:derivation['properties'][f]={'type':'string','minLength':1}
    derivation['properties']['origin']={'enum':['expert_inference','synthetic_fallback']}
    derivation['properties']['evidence_claim_ids']={'type':'array','items':{'type':'string','minLength':1},'uniqueItems':True}
    props['synthetic_derivations_json']={'type':'object','properties':{f:derivation for f in NONSAFETY},'additionalProperties':False}
    hazard={'type':'object','required':['status','origin','confidence','note'],'properties':{'status':{},'origin':{'enum':['sourced','unknown','not_reviewed','conflicting']},'confidence':{'type':'number','minimum':0,'maximum':100},'note':{'type':'string','minLength':1},'claim_ids':{'type':'array','items':{'type':'string','minLength':1}}},'additionalProperties':False}
    props['unresolved_safety_or_policy_json']={'type':'object','properties':{f:hazard for f in POLICY+['allergen_risk','irritant_sap','contact_irritation_status']},'additionalProperties':False}
    resolution={'type':'object','required':['real_value','real_value_origin','operational_value','operational_value_origin','operational_value_confidence','evidence_class','derivation_or_source_note','v0_2_fields','claim_ids','source_locator'],
      'properties':{'real_value':{},'real_value_origin':{'type':'string'},'operational_value':{},'operational_value_origin':{'enum':ORIGINS},'operational_value_confidence':{'type':'number','minimum':0,'maximum':100},'evidence_class':{'enum':list(ORIGIN_CONF)},'derivation_or_source_note':{'type':'string','minLength':1},'v0_2_fields':{'type':'array','items':{'type':'string'}},'claim_ids':{'type':'array','items':{'type':'string'}},'source_locator':{'type':'string'}},'additionalProperties':False}
    props['field_resolutions_json']={'type':'object','required':FIELDS,'properties':{f:resolution for f in FIELDS},'additionalProperties':False}
    return {'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'https://plantscapes.local/schemas/demo-matching-ready-v0_3.schema.json','title':'Plantscapes complete pilot operational profile v0.3','description':'Flat fields are operational values. Original real values, origins and derivations are separate metadata. No non-safety operational input is null.','type':'object','required':FIELDS+TRACE,'properties':props,'additionalProperties':False}
