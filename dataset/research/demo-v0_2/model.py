"""Versioned field contract. Trait fields are evidence-bearing; administrative fields are not biology."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
DATE='2026-10-13'
ORIGINS=['sourced_primary','sourced_official_database','sourced_secondary','expert_inference','conflicting','synthetic_fallback','unknown']
GROUPS={
 'identity': 'accepted_scientific_name canonical_name vernacular_nl family scientific_name_authorship synonyms taxonomic_authority gbif_species_key verspreidingsatlas_taxon_number native_status_nl establishment_status_nl regional_occurrence_status invasive_status eu_union_concern_status protected_status_nl red_list_status_nl provenance_requirement',
 'environment': 'soil_textures soil_ph_min soil_ph_max nutrient_tolerance_min nutrient_tolerance_max moisture_regimes drainage_tolerance light_regimes canopy_compatibility inundation_depth_min_cm inundation_depth_max_cm inundation_duration inundation_frequency seasonal_drawdown_tolerance salinity_tolerance drought_tolerance compaction_tolerance road_salt_tolerance pollution_tolerance wind_tolerance heat_tolerance soil_ph_classes',
 'growth': 'growth_form lifecycle mature_height_min_m mature_height_max_m mature_spread_min_m mature_spread_max_m dimension_context dimension_target_year growth_rate root_space_class root_behaviour suckering_or_spreading_method vigour_or_spread_risk competition_strength water_band functional_layer community_roles suitable_habitats incompatible_conditions height_upper_bound_open spread_upper_bound_open',
 'safety': 'toxicity_status toxic_parts irritant_sap thorns_or_spines allergen_risk fruit_drop_risk public_contact_suitability school_or_play_suitability edible_parts edibility_evidence_status preparation_required food_safety_note contact_irritation_status',
 'seasonal': 'flower_start_month flower_end_month flowering_context flower_colour flower_form evergreen_status autumn_interest winter_structure seedhead_persistence pollinator_value host_species_or_group other_habitat_functions',
 'maintenance': 'suitable_establishment_methods spacing_min_m spacing_max_m spacing_context density_min_per_m2 density_max_per_m2 density_context establishment_watering establishment_notes mowing_or_cutback_regime maintenance_demand maintenance_notes management_warnings seed_or_plant_source_notes',
}
FIELDS=[f for group in GROUPS.values() for f in group.split()]
SAFETY=set(GROUPS['safety'].split())|set('accepted_scientific_name canonical_name vernacular_nl family scientific_name_authorship synonyms taxonomic_authority gbif_species_key verspreidingsatlas_taxon_number native_status_nl establishment_status_nl regional_occurrence_status invasive_status eu_union_concern_status protected_status_nl red_list_status_nl provenance_requirement'.split())
ADMIN='fixture_id fixture_track fixture_scientific_name fixture_vernacular_nl fixture_group plant_id taxon_match_type identity_status catalogue_candidate_ids record_status production_eligible evidence_confidence reviewed_by reviewed_on source_claim_ids synthetic_field_names unresolved_field_names record_notes field_origins_json field_claim_ids_json field_gap_ids_json demo_fallback_values_json'.split()
NUMERIC=set('soil_ph_min soil_ph_max inundation_depth_min_cm inundation_depth_max_cm mature_height_min_m mature_height_max_m mature_spread_min_m mature_spread_max_m spacing_min_m spacing_max_m density_min_per_m2 density_max_per_m2 dimension_target_year flower_start_month flower_end_month'.split())
BOOL={'height_upper_bound_open','spread_upper_bound_open'}
VOCAB={
 'native_status_nl':['native_original','native_archaeophyte','introduced','uncertain'],
 'establishment_status_nl':['established','casual','cultivated_only','uncertain'],
 'regional_occurrence_status':['reported_presence','historical_presence','uncertain'],
 'invasive_status':['listed_nl','listed_eu','invasive_elsewhere','not_assessed'],
 'eu_union_concern_status':['listed_snapshot','not_listed_snapshot'],
 'protected_status_nl':['protected','not_protected_snapshot'],
 'red_list_status_nl':['not_threatened_2012','sensitive_2012','vulnerable_2012','endangered_2012','critically_endangered_2012','extinct_nl_2012'],
 'soil_textures':['sand','loam','clay','peat','loess','sandy_loam','calcareous_substrate','rocky','unspecified_multiple'],
 'soil_ph_classes':['acid','slightly_acid','neutral','alkaline','calcareous'],
 'nutrient_tolerance_min':['low','moderately_low','moderate','high','very_high'],
 'nutrient_tolerance_max':['low','moderately_low','moderate','high','very_high'],
 'moisture_regimes':['very_dry','dry','moist','wet','shallow_water','standing_water_unspecified_depth'],
 'drainage_tolerance':['well_drained','moist_drained','poorly_drained','periodically_wet','standing_water','periodic_flooding','very_dry'],
 'light_regimes':['full_sun','partial_shade','shade','dappled_shade'],
 'canopy_compatibility':['dappled_canopy_shade_reported'],
 'inundation_duration':['prolonged_qualitative','temporary_qualitative'],
 'inundation_frequency':['occasional_qualitative','frequent_qualitative'],
 'seasonal_drawdown_tolerance':['tolerates_if_substrate_stays_wet'],
 'salinity_tolerance':['brackish_reported','weak_brackish_reported','salt_tolerant_unquantified','freshwater_association_only'],
 'drought_tolerance':['tolerant_unquantified','tolerant_once_established'],
 'compaction_tolerance':['moderate_trampling_reported'],
 'road_salt_tolerance':['low_sensitivity_reported'],
 'pollution_tolerance':['tolerant_unquantified'],
 'wind_tolerance':['tolerant_unquantified'],
 'heat_tolerance':['tolerant_unquantified'],
 'growth_form':['tree','shrub','climber','herb','grass_sedge_rush','aquatic_herb','phanerophyte','hemicryptophyte','geophyte','helophyte','hydrophyte','woody_chamaephyte'],
 'lifecycle':['annual','biennial','perennial','long_lived'],
 'growth_rate':['slow','moderate','rapid'],
 'root_space_class':['small','medium','large'],
 'suckering_or_spreading_method':['rhizomes','root_suckers','runners','self_seeding'],
 'vigour_or_spread_risk':['vigorous_reported','weedy_reported'],
 'competition_strength':['low','moderate','high'],
 'water_band':['margin','shallow_water','open_water'],
 'functional_layer':['canopy','shrub','herb','graminoid','climber','water_margin'],
 'community_roles':['structural','matrix','flowering','vertical','water_edge'],
 'toxicity_status':['toxic_reported','weakly_toxic_reported','strongly_toxic_reported','harmful_to_dogs_reported'],
 'toxic_parts':['whole_plant','berries','bark','leaves','young_leaves','unripe_acorns','seeds','stems','roots','flowers','sap','fruits','twigs','unripe_berries'],
 'irritant_sap':['reported'],
 'thorns_or_spines':['thorns_present','prickles_present','absent_reported'],
 'allergen_risk':['reported'],
 'fruit_drop_risk':['reported'],
 'public_contact_suitability':['specialist_review_required','suitable_with_conditions','unsuitable'],
 'school_or_play_suitability':['specialist_review_required','suitable_with_conditions','unsuitable'],
 'edible_parts':['fruit_flesh','berries','leaves','flowers','root','seeds','herbaceous_parts','whole_plant','nuts','fruit','fruiting_cones','sap'],
 'edibility_evidence_status':['part_specific_provisional'],
 'preparation_required':['remove_seeds','cook_required','conditional_preparation'],
 'contact_irritation_status':['reported','not_reported_by_this_source'],
 'flower_colour':['white','red','pink','purple','blue','yellow','green','brown','cream','transparent','orange'],
 'flower_form':['head','umbel','corymb','spike','panicle','cyme','raceme','catkin','pea','tubular','lipped','insignificant'],
 'evergreen_status':['deciduous','evergreen','semi_evergreen'],
 'autumn_interest':['foliage_colour_reported'],
 'winter_structure':['persistent_stems_reported','persistent_foliage_reported','persistent_seedheads_reported'],
 'seedhead_persistence':['winter_reported','long_lasting_reported'],
 'pollinator_value':['nectar_reported','pollinator_visitation_reported'],
 'other_habitat_functions':['bird_seed_food_reported','stem_nesting_bees_reported','wildlife_shelter_reported'],
 'suitable_establishment_methods':['seed','division','stem_cuttings','root_cuttings','layering','grafting'],
 'mowing_or_cutback_regime':['no_pruning_required','cut_after_flowering','late_winter_cutback','cut_back_faded_stems','autumn_optional_cutback','hedge_trim_after_flowering_or_autumn','remove_flower_stems_to_limit_seeding'],
 'maintenance_demand':['low','moderate','high'],
 'management_warnings':['weedy_us_scope','vigorous_growth_reported','contact_irritation_handling','oak_processionary_monitoring','avoid_water_stagnation'],
}
MULTI=set('synonyms soil_textures soil_ph_classes moisture_regimes drainage_tolerance light_regimes growth_form lifecycle suckering_or_spreading_method functional_layer community_roles suitable_habitats incompatible_conditions toxic_parts edible_parts flower_colour flower_form autumn_interest winter_structure pollinator_value host_species_or_group other_habitat_functions suitable_establishment_methods maintenance_demand management_warnings growth_rate'.split())
UNITS={f:('m' if f.endswith('_m') else 'cm' if f.endswith('_cm') else 'plants/m2' if f.endswith('_per_m2') else 'month' if f.endswith('_month') else 'year' if f=='dimension_target_year' else 'pH' if f in ('soil_ph_min','soil_ph_max') else None) for f in FIELDS}
TRAIT_MAP={'native_status_nl':'native_status','regional_occurrence_status':'regional_occurrence','soil_textures':'soil_texture','soil_ph_min':'soil_ph','soil_ph_max':'soil_ph','soil_ph_classes':'soil_ph','nutrient_tolerance_min':'nutrient_level','nutrient_tolerance_max':'nutrient_level','moisture_regimes':'moisture','light_regimes':'light','salinity_tolerance':'salinity','mature_height_min_m':'mature_height','mature_height_max_m':'mature_height','mature_spread_min_m':'mature_spread','mature_spread_max_m':'mature_spread','flower_start_month':'flowering_start','flower_end_month':'flowering_end','flower_colour':'flower_colour','toxicity_status':'toxicity','toxic_parts':'toxicity','edible_parts':'edible_part','root_behaviour':'root_behaviour','suitable_establishment_methods':'establishment','maintenance_demand':'maintenance','spacing_min_m':'spacing','spacing_max_m':'spacing'}

def profile_schema():
    properties={}
    for f in FIELDS:
        if f in MULTI:
            items={'type':'string'}
            if f in VOCAB: items['enum']=VOCAB[f]
            prop={'type':['array','null'],'items':items,'uniqueItems':True,'minItems':1}
        elif f in NUMERIC:
            prop={'type':['integer' if f in ('flower_start_month','flower_end_month','dimension_target_year') else 'number','null'],'minimum':0}
            if f.endswith('_month'): prop.update(minimum=1,maximum=12)
            if f in ('soil_ph_min','soil_ph_max'): prop['maximum']=14
        elif f in BOOL: prop={'type':['boolean','null']}
        else:
            prop={'type':['string','null'],'minLength':1}
            if f in VOCAB: prop['enum']=VOCAB[f]+[None]
        prop['description']=f+'; null means unresolved. Unit: '+str(UNITS[f])
        properties[f]=prop
    for f in ADMIN: properties[f]={'type':'string'}
    properties['production_eligible']={'type':'boolean'}
    for f in ['source_claim_ids','synthetic_field_names','unresolved_field_names','catalogue_candidate_ids']: properties[f]={'type':'array','items':{'type':'string'},'uniqueItems':True}
    properties['reviewed_by']={'type':['string','null']};properties['reviewed_on']={'type':['string','null'],'format':'date'}
    for f in ['field_claim_ids_json','field_gap_ids_json','demo_fallback_values_json']: properties[f]={'type':'object'}
    properties['field_origins_json']={'type':'object','required':FIELDS,'properties':{f:{'enum':ORIGINS} for f in FIELDS},'additionalProperties':False}
    properties['fixture_track']={'enum':['core','ornamental']}
    properties['taxon_match_type']={'enum':['exact','accepted-name match','synonym match','cultivar or hybrid match','ambiguous','unmatched']}
    properties['identity_status']={'enum':['resolved_catalogue','resolved_external','ambiguous','unresolved']}
    properties['record_status']={'enum':['provisional','conflicting','unknown','reviewed']}
    properties['evidence_confidence']={'enum':['provisional','conflicting','unreviewed','reviewed']}
    return {'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'https://plantscapes.local/schemas/demo-plant-profile-v0_2.schema.json','title':'Resolved botanical profile, real values only; demo values are separate','type':'object','required':ADMIN+FIELDS,'properties':properties,'additionalProperties':False}
