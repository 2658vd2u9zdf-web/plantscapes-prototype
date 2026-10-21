"""Deterministic projection of the preserved v0.2 archive; no new botanical facts."""
import ast,csv,hashlib,json,math,re
from collections import Counter
from pilot_model import *

HERE=Path(__file__).parent
ARCHIVE=DATA/'research/demo-v0_2/resolved-profiles.json'
CLAIMS=DATA/'claims/plantscapes_demo_plant_claims_v0_2.jsonl'
def fixtures():
    text=(ROOT/'website/data/demo-data.js').read_text(encoding='utf-8')
    result=[]
    for section,track in [('plants','core'),('ornamentals','ornamental')]:
        block=re.search(r'\b'+section+r':\s*\[(.*?)\n\s*\]',text,re.S).group(1)
        for i,line in enumerate(block.splitlines()):
            if line.strip().startswith('['):
                value=ast.literal_eval(line.strip().rstrip(','))
                result.append((track,value))
    assert len(result)==60 and Counter(t for t,v in result)=={'core':54,'ornamental':6}
    assert len({v[0] for t,v in result})==60
    return result

def preserve_baseline():
    target=HERE/'protected-inputs.json'
    if target.exists():return
    paths=[p for folder in [DATA,ROOT/'website'] for p in folder.rglob('*') if p.is_file() and 'demo-v0_3' not in p.parts and 'v0_3' not in p.name and 'v0.3' not in p.name and '__pycache__' not in p.parts]
    write_json(target,{'note':'SHA-256 captured before v0.3 output creation, including every existing v0.2 file and website/location file.','files':{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}})

def project():
    original=read_json(ARCHIVE)
    claims=[json.loads(line) for line in CLAIMS.read_text(encoding='utf-8').splitlines()]
    byclaim={c['claim_id']:c for c in claims}
    fixturemap={v[0]:(t,v) for t,v in fixtures()}
    plants=[];derivations=[]
    for old in original:
        track,fixture=fixturemap[old['fixture_scientific_name']]
        p={};res={};synthetic={};ids={}
        def put(field,value,source=None,origin=None,note='',rule=None,bounds=None):
            fields=[source] if isinstance(source,str) else source or []
            real=old.get(fields[0]) if len(fields)==1 else {f:old.get(f) for f in fields} if fields else None
            cid=list(dict.fromkeys(c for f in fields for c in old['field_claim_ids_json'].get(f,[])))
            oldorig=old['field_origins_json'].get(fields[0],'unknown') if fields else 'unknown'
            if field in ['fixture_id','plant_id']:
                real=old[field];oldorig='sourced_secondary'
            if origin is None:origin='sourced' if oldorig.startswith('sourced_') and real is not None else 'unknown'
            evidence='official_unreviewed' if origin=='sourced' and oldorig in ['sourced_primary','sourced_official_database'] else 'institutional_secondary' if origin=='sourced' else origin
            conf=ORIGIN_CONF[evidence]
            loc='; '.join(byclaim[c]['evidence']['locator'] for c in cid)
            if field in IDENTITY and field in ['fixture_id','plant_id']:
                loc='dataset/derived/plantscapes_demo_plant_traits_v0_2.csv#'+old['fixture_id']+'/'+field
            p[field]=value;ids[field]=cid
            res[field]={'real_value':real,'real_value_origin':oldorig,'operational_value':value,'operational_value_origin':origin,'operational_value_confidence':conf,'evidence_class':evidence,'derivation_or_source_note':note or 'Literal projection of the selected provisional v0.2 value; no independent specialist review.','v0_2_fields':fields,'claim_ids':cid,'source_locator':loc}
            if origin in ['expert_inference','synthetic_fallback']:
                d={'fixture_id':old['fixture_id'],'plant_id':old['plant_id'],'field':field,'operational_value':value,'real_value':real,'source_values_or_bounding_facts':bounds if bounds is not None else real,'derivation_rule':rule or note,'rationale':note,'uncertainty':'Context transfer or simulation assumption; not independently reviewed.','risk_if_wrong':'Incorrect candidate ranking, footprint, quantity or design output; never a safety clearance.','future_verification_needed':'Plant-specific Dutch horticultural/site evidence and independent specialist review.','evidence_claim_ids':cid,'archive_gap_reference':'dataset/derived/plantscapes_demo_data_gaps_v0_2.csv#'+old['fixture_id'],'origin':origin}
                derivations.append(d);synthetic[field]=d
        put('fixture_id',old['fixture_id'],'fixture_id',origin='sourced',note='Stable administrative fixture key in the archived projection, not a new accepted-taxon assertion.')
        put('plant_id',old['plant_id'],'plant_id',origin='sourced',note='Preserve archived taxon reconciliation; external/cultivated IDs remain distinct. Source locator is the original resolved archive row.')
        put('scientific_name',old['accepted_scientific_name'] or 'unknown','accepted_scientific_name')
        put('dutch_name',old['vernacular_nl'] or 'unknown','vernacular_nl')
        group=fixture[2]
        forms=old.get('growth_form') or []
        markers={'Trees':['tree'],'Shrubs':['shrub'],'Flowers & herbs':['herb'],'Grasses, sedges & rushes':['grass_sedge_rush'],'Climbers':['climber'],'Aquatic & marginal plants':['aquatic_herb','helophyte']}[group]
        matches=any(f in markers for f in forms)
        group_origin='sourced' if matches and len(forms)==1 else 'expert_inference' if matches else 'synthetic_fallback'
        put('group',group,'growth_form',group_origin,'GROUP-01: literal sourced architecture mapped to design group where unambiguous; select the fixture design role from multiple reported architectures by inference; otherwise retain a labelled fixture category. Life-form labels alone do not prove architecture.','GROUP-01: exact architecture map, multi-architecture design choice, otherwise fixture group',{'source_growth_forms':forms,'fixture_group':group})
        maps={'soil_tolerance':('soil_textures',{'sand':'sand','sandy_loam':'sand','loam':'clay','clay':'clay','peat':'peat'}),'moisture_tolerance':('moisture_regimes',{'very_dry':'dry','dry':'dry','moist':'fresh','wet':'wet','shallow_water':'wet','standing_water_unspecified_depth':'wet'}),'light_tolerance':('light_regimes',{'full_sun':'sun','partial_shade':'mixed','dappled_shade':'mixed','shade':'shade'})}
        for field,(source,mapping) in maps.items():
            value=sorted({mapping[x] for x in old.get(source) or [] if x in mapping},key=VOCAB[field].index)
            if value:
                # Loam and sandy-loam normalization are broad, explicitly uncertain transfers.
                infer=field=='soil_tolerance' and any(x in ['loam','sandy_loam'] for x in old.get(source) or [])
                put(field,value,source,'expert_inference' if infer else None,'VOCAB-01: '+str(mapping)+'; omit untranslatable categories rather than creating wildcard tolerance.', 'VOCAB-01')
            else:
                default={'soil_tolerance':{'dry':['sand'],'fresh':['clay'],'wet':['clay','peat']}[fixture[3]],'moisture_tolerance':[fixture[3]],'light_tolerance':[fixture[4]]}[field]
                put(field,default,source,'synthetic_fallback','Archive lacks a usable category after checking selected and alternative claims; narrowly scoped original demonstration category.','ENV-01: fixture moisture/light; dry→sand, fresh→clay, wet→clay|peat',fixture[3:5])
        height=old.get('mature_height_max_m')
        if height is not None:put('mature_height_m',height,'mature_height_max_m',note='Selected source upper endpoint used as a pilot planning dimension; original range/context remains in v0.2.')
        else:
            cs=[c for c in claims if c['value']['fixture_id']==old['fixture_id'] and c['value']['field']=='mature_height_max_m' and isinstance(c['value']['real_value'],(int,float))]
            if cs:put('mature_height_m',max(c['value']['real_value'] for c in cs),'mature_height_max_m','expert_inference','HEIGHT-01: largest retained source endpoint used as conservative pilot envelope; incompatible source contexts and conflict remain unresolved.','HEIGHT-01: max documented upper endpoints',[{'value':c['value']['real_value'],'scope':c['geographic_scope'],'claim_id':c['claim_id']} for c in cs])
            else:put('mature_height_m',fixture[5],'mature_height_max_m','synthetic_fallback','No defensible closed dimension; original fixture dimension for simulation only.','HEIGHT-02: fixture height',fixture[5])
        spread=old.get('mature_spread_max_m')
        if spread is not None:put('mature_spread_m',spread,'mature_spread_max_m',note='Selected closed source upper spread endpoint; not a guarantee at a target year.')
        else:
            cs=[c for c in claims if c['value']['fixture_id']==old['fixture_id'] and c['value']['field']=='mature_spread_max_m' and isinstance(c['value']['real_value'],(int,float))]
            if cs:put('mature_spread_m',max(c['value']['real_value'] for c in cs),'mature_spread_max_m','expert_inference','SPREAD-01: closed alternative source endpoint supplies a conservative planning proxy; source geography/life-stage transfer is provisional.','SPREAD-01: max retained closed alternative',[{'value':c['value']['real_value'],'scope':c['geographic_scope'],'claim_id':c['claim_id']} for c in cs])
            else:
                h=p['mature_height_m'];value={'Trees':max(5,.6*h),'Shrubs':max(1.5,.9*h),'Climbers':2,'Grasses, sedges & rushes':max(.4,min(1.25,.5*h)),'Aquatic & marginal plants':max(.5,min(1.25,.5*h)),'Flowers & herbs':max(.35,min(1.25,.5*h))}[group]
                put('mature_spread_m',round(value,3),'mature_spread_max_m','synthetic_fallback','SPREAD-02: no closed plant-specific spread in archive; group-sensitive simulation footprint, not actual mature spread.','SPREAD-02: tree max(5,0.6H); shrub max(1.5,0.9H); climber 2; graminoid clamp(0.5H,0.4,1.25); aquatic clamp(0.5H,0.5,1.25); herb clamp(0.5H,0.35,1.25)',{'group':group,'operational_height_m':h,'real_spread_min_m':old.get('mature_spread_min_m')})
        s=p['mature_spread_m'];spacing=s if group in ['Trees','Shrubs'] else max(1,s) if group=='Climbers' else math.ceil(max(.3,.9*s)*20-1e-9)/20
        put('pilot_spacing_m',round(spacing,3),['mature_spread_min_m','mature_spread_max_m'],'synthetic_fallback','SPACE-01: one pilot method; woody spacing=spread, climber=max(1,spread), others=max(0.30,0.90spread) rounded upward to 0.05m. No professional density claim.','SPACE-01',{'operational_spread_m':s,'group':group})
        layer={'Trees':'canopy','Shrubs':'shrub','Flowers & herbs':'herb','Grasses, sedges & rushes':'graminoid','Climbers':'climber','Aquatic & marginal plants':'water_margin'}[group]
        role='woody_framework' if group in ['Trees','Shrubs'] else 'matrix' if group=='Grasses, sedges & rushes' else 'community_patch' if group=='Aquatic & marginal plants' else 'structural_perennial' if group=='Climbers' or p['mature_height_m']>=1.1 else 'seasonal_accent'
        put('functional_layer',layer,'functional_layer','synthetic_fallback','COMPOSITION-01: group-to-layer design categorization.','COMPOSITION-01',group)
        put('composition_role',role,'community_roles','synthetic_fallback','COMPOSITION-02: fixture group and operational height >=1.1m identify a structural design role.','COMPOSITION-02',{'group':group,'height_m':p['mature_height_m']})
        put('climbing_support_required',group=='Climbers','growth_form','expert_inference' if group=='Climbers' and 'climber' in forms else 'synthetic_fallback','SUPPORT-01: documented climbing architecture requires mapped vertical support. SUPPORT-02: non-climber fixture categories have no pilot support requirement; that negative design assumption is synthetic, not botanical proof.','SUPPORT-01' if group=='Climbers' and 'climber' in forms else 'SUPPORT-02',{'source_growth_forms':forms,'design_group':group})
        comp=old.get('compaction_tolerance')
        put('disturbance_tolerance',['low','moderate'] if comp=='moderate_trampling_reported' or group in ['Flowers & herbs','Grasses, sedges & rushes'] else ['low'],'compaction_tolerance','expert_inference' if comp=='moderate_trampling_reported' else 'synthetic_fallback','DIST-01: moderate trampling supports conditional pilot disturbance transfer; otherwise herb/graminoid low|moderate, other groups low. Disturbance is not compaction or road-salt evidence.','DIST-01',{'group':group,'trampling':comp})
        put('hardscape_tolerance','avoid' if group=='Trees' else 'conditional',origin='synthetic_fallback',note='HARD-01: trees avoid unspecified hardscape; other groups conditional. Actual rooting substrate and clearances remain unknown.',rule='HARD-01: tree→avoid; other→conditional',bounds=group)
        hydro=old.get('inundation_duration');wet='wet' in p['moisture_tolerance']
        if hydro:
            htext=str(hydro);vals=['none','seasonal','long','edge'] if 'prolong' in htext else ['none','seasonal','edge']
            if group=='Aquatic & marginal plants':vals=['seasonal','long','permanent','edge']
            put('hydrology_tolerance',vals,['inundation_duration','moisture_regimes'],'expert_inference','HYDRO-01: documented inundation description plus moisture context mapped to broad pilot regimes; no depth/duration precision.','HYDRO-01',{'duration':hydro,'moisture':old.get('moisture_regimes'),'group':group})
        else:
            vals=['seasonal','long','permanent','edge'] if group=='Aquatic & marginal plants' else ['none','seasonal','edge'] if wet else ['none','seasonal'] if 'fresh' in p['moisture_tolerance'] else ['none']
            put('hydrology_tolerance',vals,['inundation_duration','moisture_regimes'],'synthetic_fallback','HYDRO-02: archive lacks directly comparable hydroperiod; aquatic demonstration regime or narrow terrestrial moisture proxy. Wet soil does not imply permanent-water compatibility.','HYDRO-02: aquatic seasonal|long|permanent|edge; wet terrestrial none|seasonal|edge; fresh none|seasonal; dry none',{'group':group,'operational_moisture':p['moisture_tolerance']})
        put('water_edge_requirement','required' if group=='Aquatic & marginal plants' else 'preferred' if wet else 'not_required',origin='synthetic_fallback',note='EDGE-01: aquatic pilot group requires confirmed edge; wet terrestrial prefers edge; others do not require it. Demonstration placement constraint only.',rule='EDGE-01',bounds={'group':group,'moisture':p['moisture_tolerance']})
        risk=old.get('vigour_or_spread_risk')
        put('vigour_or_spread_risk','high' if risk in ['vigorous_reported','weedy_reported'] else 'moderate','vigour_or_spread_risk','sourced' if risk=='vigorous_reported' else 'expert_inference' if risk=='weedy_reported' else 'synthetic_fallback','VIGOUR-01: vigorous report→high; non-Dutch weediness→high conservative management proxy, never Dutch invasive status; unknown→moderate pilot risk.','VIGOUR-01',risk)
        maint=old.get('maintenance_demand') or []
        val=max(maint,key=['low','moderate','high'].index) if maint else 'high' if group in ['Climbers','Aquatic & marginal plants'] else 'moderate'
        put('maintenance_demand',val,'maintenance_demand','expert_inference' if len(maint)>1 else None if maint else 'synthetic_fallback','MAINT-01: highest explicitly reported demand when sources differ; otherwise climber/aquatic high, other groups moderate. No maintenance task prescription.','MAINT-01',maint or group)
        put('native_status_nl',old.get('native_status_nl') or 'unknown','native_status_nl')
        put('invasive_status',old.get('invasive_status') or 'unknown','invasive_status')
        put('protected_or_legal_status','not_reviewed',['protected_status_nl','eu_union_concern_status'],'not_reviewed','EU snapshot non-listing is not comprehensive Dutch legal/protected clearance. Independent current policy review required.')
        put('provenance_status','unknown','provenance_requirement')
        put('public_contact_status','not_reviewed','public_contact_suitability','not_reviewed','No project-specific public-contact assessment. Toxicity and thorn evidence are separate hazards, never clearance.')
        put('toxicity_status',old.get('toxicity_status') or 'unknown','toxicity_status')
        edible=old.get('edibility_evidence_status')
        put('edible_use_status','conflicting' if old['field_origins_json'].get('edibility_evidence_status')=='conflicting' else 'not_reviewed' if edible else 'unknown','edibility_evidence_status','conflicting' if old['field_origins_json'].get('edibility_evidence_status')=='conflicting' else 'not_reviewed' if edible else 'unknown','Provisional part-specific archive evidence does not approve harvesting, preparation or public consumption.')
        put('thorns_or_spines',old.get('thorns_or_spines') or 'unknown','thorns_or_spines')
        put('production_eligible',False,origin='policy_rule',note='All pilot records require independent identity/safety/legal/provenance/rights/site review before real-world use.')
        for f,index in [('flower_start_month',6),('flower_end_month',7)]:
            value=old.get(f)
            put(f,value if value is not None else fixture[index],f,None if value is not None else 'synthetic_fallback','FLOWER-01: selected month, or original demonstration endpoint if archive lacks an exact month; not a Netherlands seasonal prediction.','FLOWER-01',fixture[index] if value is None else value)
        colours=old.get('flower_colour') or []
        colour=colours[0] if colours else 'yellow' if fixture[8]=='gold' else fixture[8]
        put('flower_colour',colour,'flower_colour','expert_inference' if len(colours)>1 else None if colours else 'synthetic_fallback','COLOUR-01: single representative design swatch; first documented colour when multiple, else original fixture palette (gold→yellow).','COLOUR-01',colours or fixture[8])
        poll=old.get('pollinator_value') or []
        put('pollinator_value',poll[0] if poll else 'pilot_potential','pollinator_value',None if poll else 'synthetic_fallback','POLL-01: positive report retained literally; missing evidence→pilot_potential design placeholder, never an ecological-benefit claim.','POLL-01',poll)
        unresolved={f:{'status':p[f],'origin':res[f]['operational_value_origin'],'confidence':res[f]['operational_value_confidence'],'note':res[f]['derivation_or_source_note']} for f in POLICY if p[f] in ['unknown','not_reviewed','conflicting']}
        for f in ['allergen_risk','irritant_sap','contact_irritation_status']:
            orig=old['field_origins_json'].get(f,'unknown')
            unresolved[f]={'status':old.get(f) or 'unknown','origin':'sourced' if orig.startswith('sourced_') else orig,'confidence':85 if orig in ['sourced_primary','sourced_official_database'] else 70 if orig=='sourced_secondary' else 0,'claim_ids':old['field_claim_ids_json'].get(f,[]),'note':'Visible public-contact warning context only; no safety clearance.'}
        p.update(field_origins_json={f:res[f]['operational_value_origin'] for f in FIELDS},field_confidence_json={f:res[f]['operational_value_confidence'] for f in FIELDS},synthetic_derivations_json=synthetic,unresolved_safety_or_policy_json=unresolved,evidence_claim_ids_json=ids,field_resolutions_json=res,record_notes='Track='+track+'; source contexts and taxon decisions retained in v0.2. Simulation only; no verified or production-ready records.')
        plants.append(p)
    plants.sort(key=lambda p:p['fixture_id'])
    write_csv(DATA/'derived/plantscapes_demo_matching_ready_v0_3.csv',plants,FIELDS+TRACE)
    (HERE/'operational-derivations.jsonl').write_text(''.join(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n' for d in derivations),encoding='utf-8')
    write_json(DATA/'schemas/demo-matching-ready-v0_3.schema.json',plant_schema())
    return plants

if __name__=='__main__':
    preserve_baseline();plants=project();print('Projected',len(plants),'plants;',len(NONSAFETY),'non-safety operational fields;',len(FIELDS),'profile fields.')
