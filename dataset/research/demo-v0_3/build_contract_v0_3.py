"""Materialize explicit matrices, input contract, field-use audit and example inputs."""
from pilot_model import *
HERE=Path(__file__).parent
COMPONENTS={
 'soil':(15,['soil_tolerance'],['soil']),
 'moisture':(20,['moisture_tolerance'],['moisture']),
 'hydrology':(15,['hydrology_tolerance'],['hydrology']),
 'light':(15,['light_tolerance'],['light']),
 'disturbance_hardscape':(10,['disturbance_tolerance','hardscape_tolerance'],['disturbance','hardscape']),
 'spatial':(15,['mature_height_m','mature_spread_m','pilot_spacing_m','group','climbing_support_required'],['available_width_m','available_length_m','plantable_area_m2','support_length_m','max_plant_height_m','path_edge','sightlines']),
 'maintenance_vigour':(10,['maintenance_demand','vigour_or_spread_risk'],['maintenance','vigourControl'])}

def build():
    zone_vocab={'soil':['sand','clay','peat','made','unknown'],'moisture':['dry','fresh','wet','variable','unknown'],'hydrology':['none','seasonal','long','permanent','edge','unknown'],'light':['sun','mixed','shade','unknown'],'canopy':['yes','no','unknown'],'disturbance':['low','moderate','high','unknown'],'hardscape':['yes','no','unknown'],'waterEdge':['yes','no','unknown'],'source':['demo','observation','survey','document','unverified','unknown'],'path_edge':['yes','no','unknown']}
    geometry=['available_width_m','available_length_m','plantable_area_m2','max_plant_height_m','support_length_m']
    project_vocab={'type':['restoration','landscape','productive','other'],'maintenance':['low','moderate','high','unknown'],'character':['mosaic','open','enclosed'],'vigourControl':['yes','no','unknown'],'evaluation_stage':['candidate','placement']}
    project_bool=['publicAccess','publicHarvest','sightlines','rewilding','support','restorationOrnamentals']
    contract={'version':VERSION,'units':{'length':'m','area':'m2','month':'integer 1–12','score':'points 0–100'},'zone_vocabulary':zone_vocab,'zone_numeric_or_unknown':geometry,'zone_required':['zone_id']+list(zone_vocab)+geometry,'project_vocabulary':project_vocab,'project_booleans':project_bool,'project_required':list(project_vocab)+project_bool+['area','anchorColours','desiredFlowerMonths','priorities'],
      'project_array_vocabulary':{'anchorColours':VOCAB['flower_colour'],'desiredFlowerMonths':list(range(1,13)),'priorities':['pollinators']},
      'defaults':{'missing_zone_category':'unknown','missing_geometry':'unknown','missing_project_boolean':False,'missing_project_maintenance':'unknown','missing_project_area':'unknown','missing_support':False},
      'added_inputs':{'available_width_m':'Conservative clear plantable width from mapped geometry; not plot width.','available_length_m':'Conservative clear length excluding paths/voids.','plantable_area_m2':'Usable zone area, never geographic whole-plot area by default.','max_plant_height_m':'Project-specific visibility clearance only when sightlines and path_edge=yes.','path_edge':'Mapped path-edge context; unknown never clears thorn/visibility restrictions.','support_length_m':'Usable mapped climbing support length; used only for climber quantity.','support':'Explicit project support boolean; current app does not supply it.','vigourControl':'Explicit active containment/management arrangement, not assumed from capacity.','evaluation_stage':'candidate screening versus placement hard gate.','desiredFlowerMonths':'Optional design output preference; no environmental score.'},
      'normalizations':{'moist':'fresh','loam':'clay (coarse expert transfer: current clay label includes loam)','sandy_loam':'sand (coarse expert transfer)','full_sun':'sun','partial_shade':'mixed','shade':'shade','made':'Uncertain substrate; score 0.25, never automatic soil compatibility.','edge':'Hydroperiod unspecified at the edge; maximum compatibility 0.5.','canopy':'Context/explanation only. Light is scored once; canopy does not add or subtract points.'},
      'non_goals':['No website integration','No professional root-volume or seed-rate specification','No reviewed safety or food advice','No hydrological depth model','No universal per-plant suitability score']}
    contract['added_inputs']['support_length_m']='Usable mapped climbing support length; checks the climber spatial screen and estimates stock capacity.'
    contract['current_ui_priority_adapter']='Keep pollinators in the design-priority subset; use rewilding as its separate policy boolean. habitat/seasonal/beauty/food/learning/climate remain annotations unless a separately defined input/rule uses them. desiredFlowerMonths is optional, absent→[].'
    write_json(DATA/'scoring/plant-location-contract-v0_3.json',contract)
    matrices={}
    matrices['soil']={p:{s:1 if s==p else .25 if s=='made' else 0 for s in zone_vocab['soil']} for p in VOCAB['soil_tolerance']}
    seq=['dry','fresh','wet'];matrices['moisture']={p:{s:1 if s==p else .5 if s=='variable' or s in seq and abs(seq.index(s)-seq.index(p))==1 else 0 for s in zone_vocab['moisture']} for p in seq}
    seq=['sun','mixed','shade'];matrices['light']={p:{s:1 if s==p else .5 if s in seq and abs(seq.index(s)-seq.index(p))==1 else 0 for s in zone_vocab['light']} for p in seq}
    hydro={'none':[1,.5,0,0,.5,0],'seasonal':[.5,1,.5,0,.5,0],'long':[0,.5,1,.5,.5,0],'permanent':[0,.5,.5,1,.5,0],'edge':[0,.5,.5,0,.5,0]}
    matrices['hydrology']={p:dict(zip(zone_vocab['hydrology'],values)) for p,values in hydro.items()}
    matrices['disturbance']={p:dict(zip(zone_vocab['disturbance'],v)) for p,v in {'low':[1,.5,0,0],'moderate':[1,1,.5,0],'high':[1,1,1,0]}.items()}
    matrices['hardscape']={p:dict(zip(zone_vocab['hardscape'],v)) for p,v in {'avoid':[0,1,0],'conditional':[.5,1,0],'tolerant':[1,1,0]}.items()}
    matrices['maintenance']={p:dict(zip(['low','moderate','high','unknown'],v)) for p,v in {'low':[1,1,1,0],'moderate':[.5,1,1,0],'high':[0,.5,1,0]}.items()}
    matrices['vigour']=matrices['maintenance']
    matrices['spatial_footprint']={'fits':1,'does_not_fit':0,'unknown_geometry':0}
    matrices['spatial_height']={'inactive':1,'fits':1,'exceeds_visibility_limit':0,'unknown_required_height_limit':0}
    gates={
     'H01_IDENTITY':'Unknown scientific identity or plant_id excludes.',
     'H02_INVASIVE_LEGAL':'Any explicit positive invasive status (listed_nl, listed_eu, invasive_elsewhere) or legally_prohibited excludes; unknown/nonlisting never clears. Foreign weediness alone is not assigned an invasive status.',
     'H03_WATER_EDGE':'Required edge demands waterEdge=yes AND hydrology seasonal|long|permanent|edge.',
     'H04_PERMANENT_WATER':'Permanent zone excludes plant lacking explicit operational permanent tolerance.',
     'H05_SUPPORT':'Climbing support required but support=false excludes.',
     'H06_PUBLIC_CONTACT':'Public access and known unsuitable public contact excludes.',
     'H07_WOODY_GEOMETRY':'Tree/shrub cannot fit full spread square and area: exclusion at placement, unsuitable candidate.',
     'H08_VIGOUR':'Low maintenance plus high vigour and no explicit active control excludes; control=yes conditional.',
     'H09_NATIVE_POLICY':'Rewilding known introduced excludes. Unknown native in rewilding caps final at 54.',
     'H10_RESTORATION_POLICY':'Restoration known introduced needs explicit ornamental override; remains separately disclosed.',
     'H11_PATH_THORNS':'Known thorns/prickles at path edge excludes placement; unknown thorns never clears public-contact use.'}
    rules={'version':VERSION,'components':{k:{'weight':w,'plant_fields':pf,'site_or_project_fields':sf} for k,(w,pf,sf) in COMPONENTS.items()},'compatibility_matrices':matrices,'combination':'Best supported operational tolerance category; arrays do not mean all site categories are compatible.',
     'component_aggregation':{'disturbance_hardscape':'Mean of disturbance and hardscape ratios.','spatial':'0.8 footprint ratio + 0.2 visibility-height ratio.','maintenance_vigour':'Mean demand and vigour ratios; explicit control makes high vigour conditional (0.5) under low capacity.'},
     'hard_gates':gates,'hard_gate_plant_fields':{'H01_IDENTITY':['scientific_name','plant_id'],'H02_INVASIVE_LEGAL':['invasive_status','protected_or_legal_status'],'H03_WATER_EDGE':['water_edge_requirement','hydrology_tolerance'],'H04_PERMANENT_WATER':['hydrology_tolerance'],'H05_SUPPORT':['climbing_support_required'],'H06_PUBLIC_CONTACT':['public_contact_status'],'H07_WOODY_GEOMETRY':['group','mature_spread_m'],'H08_VIGOUR':['vigour_or_spread_risk'],'H09_NATIVE_POLICY':['native_status_nl'],'H10_RESTORATION_POLICY':['native_status_nl'],'H11_PATH_THORNS':['thorns_or_spines']},'thresholds':{'strong_match':80,'suitable':65,'conditional_match':50,'unsuitable':0},
     'final_score_caps':{'unknown_policy':64,'unknown_site':64,'active_vigour_control_required':64,'unreviewed_public_contact':59,'unknown_native_rewilding':54,'known_environmental_conflict':49,'spatial_impossibility':49,'hard_exclusion':0},
     'unknown_site_rule':{'ratio':0,'confidence_multiplier':0,'warning':'site_data_gap','conflict':False},
     'site_uncertainty_factors':{'known':1,'made':.25,'variable':.5,'edge_hydroperiod':.5,'unknown':0},
     'site_source_factors':{'survey':1,'document':1,'observation':.85,'demo':.5,'unverified':0,'unknown':0},
     'confidence_origin_scale':ORIGIN_CONF,'confidence_formula':'Weighted component field confidence × corresponding site-certainty factor × site-source factor × policy factor. Component spatial averages height/spread/spacing/group/support requirement; maintenance and disturbance each average their two fields. Policy factor=max(0.5,1−0.05 per unresolved applicable policy); safety never supplies biological suitability points.',
     'policy_confidence_fields':['invasive_status','protected_or_legal_status','provenance_status','toxicity_status','public_contact_status','edible_use_status','native_status_nl','thorns_or_spines'],
     'no_verified_records':True,'design_preference':'0–100 separate preference average of active colour, month, pollinator and spatial-character/role terms. Sorting: final score, raw score, design preference, confidence, fixture_id. Never include excluded/unsuitable plants.',
     'placement':'Square clear footprint: woody mature spread, others pilot spacing. Climbers also require support_length>=spacing to pass the spatial screen. Approximate single-species stock capacity=min(floor(width/spacing)×floor(length/spacing),floor(zone_area/spacing²),floor(project_area/spacing²) if known). Climber stock=floor(mapped support_length/spacing). No allocation across species or seed quantities; polygon/path packing remains separate.',
     'space_rule':'SPACE-01: tree/shrub spread; climber max(1,spread); herb/graminoid/aquatic ceil(max(0.30,0.90spread)/0.05)×0.05.',
     'environmental_conflict_rule':'Known ratio 0 for soil/moisture/hydrology/light/disturbance/hardscape caps final at 49. Unknown values have ratio 0 but warn as gaps, not proven conflicts.',
     'canopy_rule':'Context only; no independent effect or doubled light points.'}
    write_json(DATA/'scoring/plant-suitability-rules-v0_3.json',rules)
    # Every retained field is assigned a concrete consuming rule.
    uses={f:('score',k,','.join(sf),','.join(pf),w) for k,(w,pf,sf) in COMPONENTS.items() for f in pf}
    extras={
     'fixture_id':('output','O01_IDENTITY','zone_id'),'plant_id':('hard_gate|output','H01_IDENTITY','none (intrinsic identity)'), 'scientific_name':('hard_gate|output','H01_IDENTITY','none (intrinsic identity)'), 'dutch_name':('output','O01_IDENTITY','none (display)'),
     'water_edge_requirement':('hard_gate|placement','H03_WATER_EDGE','waterEdge|hydrology'), 'climbing_support_required':('hard_gate|score|quantity','H05_SUPPORT|spatial','support|support_length_m'),
     'functional_layer':('composition|output','C01_LAYER','character'),'composition_role':('composition|design_preference','C02_ROLE','character'),
     'native_status_nl':('hard_gate|explanation','H09_NATIVE_POLICY|H10_RESTORATION_POLICY','rewilding|type|restorationOrnamentals'), 'invasive_status':('hard_gate','H02_INVASIVE_LEGAL','none (intrinsic legal hazard)'), 'protected_or_legal_status':('hard_gate|explanation','H02_INVASIVE_LEGAL|P01_REVIEW','type'), 'provenance_status':('explanation','P01_REVIEW','type'), 'public_contact_status':('hard_gate','H06_PUBLIC_CONTACT','publicAccess'), 'toxicity_status':('explanation','P02_TOXICITY','publicAccess|publicHarvest'), 'edible_use_status':('action_gate|explanation','P03_HARVEST','publicHarvest'), 'thorns_or_spines':('hard_gate|placement','H11_PATH_THORNS','path_edge|publicAccess'), 'production_eligible':('explanation|output','P01_REVIEW','all project conditions'),
     'flower_start_month':('design_preference|output','T02_MONTHS','desiredFlowerMonths'),'flower_end_month':('design_preference|output','T02_MONTHS','desiredFlowerMonths'),'flower_colour':('design_preference|output','T01_COLOUR','anchorColours'),'pollinator_value':('design_preference|explanation','T03_POLLINATOR','priorities'),
     'field_origins_json':('confidence|explanation','E01_ORIGIN','all scored site/project fields'),'field_confidence_json':('confidence','E02_CONFIDENCE','all scored site/project fields'),'synthetic_derivations_json':('explanation','E03_DERIVATION','none (evidence display)'),'unresolved_safety_or_policy_json':('explanation','P02_TOXICITY','publicAccess|publicHarvest'),'evidence_claim_ids_json':('explanation','E04_CLAIMS','none (evidence display)'),'field_resolutions_json':('explanation','E03_DERIVATION','none (real/operational display)'),'record_notes':('output','O02_NOTES','none (display)')}
    for f,(purpose,rule,site) in extras.items():uses[f]=(purpose,rule,site,'',0)
    olddict=list(csv.DictReader((DATA/'derived/plantscapes_demo_field_dictionary_v0_2.csv').open(encoding='utf-8-sig')))
    oldfields=list(read_json(DATA/'research/demo-v0_2/resolved-profiles.json')[0]['field_origins_json'])
    source_map={'scientific_name':'accepted_scientific_name','dutch_name':'vernacular_nl','group':'growth_form','soil_tolerance':'soil_textures','moisture_tolerance':'moisture_regimes','hydrology_tolerance':'inundation_duration|moisture_regimes','light_tolerance':'light_regimes','disturbance_tolerance':'compaction_tolerance','hardscape_tolerance':'none','water_edge_requirement':'moisture_regimes','mature_height_m':'mature_height_max_m','mature_spread_m':'mature_spread_max_m','pilot_spacing_m':'mature_spread_min_m|mature_spread_max_m','functional_layer':'functional_layer','composition_role':'community_roles','climbing_support_required':'growth_form','protected_or_legal_status':'protected_status_nl|eu_union_concern_status','provenance_status':'provenance_requirement','public_contact_status':'public_contact_suitability','edible_use_status':'edibility_evidence_status'}
    rows=[]
    source_map['unresolved_safety_or_policy_json']='allergen_risk|irritant_sap|contact_irritation_status'
    for f in FIELDS+TRACE:
        purpose,rule,site,_,weight=uses[f]
        rows.append({'proposed_v0_3_field':f,'purpose':purpose,'corresponding_location_or_project_field':site,'consumer':purpose,'weight_or_rule':str(weight) if weight else rule,'rule_identifier':rule,'synthetic_fallback_permitted':f in NONSAFETY,'source_field_v0_2':source_map.get(f,f),'status':'retained','reason':'Consumed explicitly by '+rule+'; trace metadata exposes evidence without adding ecological points.'})
    used={x for row in rows for x in row['source_field_v0_2'].split('|')}
    for f in oldfields:
        if f not in used:
            rows.append({'proposed_v0_3_field':f,'purpose':'archive_only','corresponding_location_or_project_field':'none','consumer':'none','weight_or_rule':'0','rule_identifier':'ARCHIVE','synthetic_fallback_permitted':False,'source_field_v0_2':f,'status':'excluded','reason':'No corresponding current pilot comparison/placement/output rule. Preserve full evidence in v0.2. Hazard context for allergen/irritant fields remains in review metadata only.'})
    write_csv(DATA/'derived/plantscapes_demo_field-use-matrix_v0_3.csv',rows)
    project={'type':'landscape','area':1000,'maintenance':'moderate','publicAccess':True,'publicHarvest':False,'sightlines':False,'rewilding':False,'support':True,'character':'mosaic','restorationOrnamentals':False,'vigourControl':'no','evaluation_stage':'placement','anchorColours':['purple','yellow'],'desiredFlowerMonths':[6,7,8],'priorities':['pollinators']}
    zones=[]
    for zid,soil,moist,hydro,light,edge,w,l,a in [('dry_sunny_sand','sand','dry','none','sun','no',20,15,300),('fresh_clay_mixed','clay','fresh','none','mixed','no',20,20,400),('wet_water_edge','peat','wet','permanent','sun','yes',12,8,96)]:
        zones.append({'zone_id':zid,'soil':soil,'moisture':moist,'hydrology':hydro,'light':light,'canopy':'no' if light=='sun' else 'yes','disturbance':'low','hardscape':'no','waterEdge':edge,'source':'demo','available_width_m':w,'available_length_m':l,'plantable_area_m2':a,'max_plant_height_m':'unknown','path_edge':'no','support_length_m':10})
    write_json(HERE/'example-inputs.json',{'project':project,'zones':zones,'note':'Invented demonstration zones; no existing location records modified.'})

if __name__=='__main__':build();print('Wrote contract, explicit matrices, field-use audit and three example zones.')
