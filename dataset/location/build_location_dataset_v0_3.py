"""Build the transparent v0.3 pilot location layer without touching application files.

The flat ``evaluation_payload`` values intentionally use the authoritative plant
v0.3 contract.  The surrounding evidence records keep sourced facts separate
from the operational values used for the demonstration.
"""
from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent
ROOT = DATA.parent
DATE = "2026-10-13"
VERSION = "0.3.0"

PLANT_CONTRACT_PATH = DATA / "scoring/plant-location-contract-v0_3.json"
PLANT_RULES_PATH = DATA / "scoring/plant-suitability-rules-v0_3.json"
PLANTS_PATH = DATA / "derived/plantscapes_demo_matching_ready_v0_3.csv"

ALLOWED_ORIGINS = [
    "site_survey",
    "user_confirmed_observation",
    "official_spatial_dataset",
    "official_regional_proxy",
    "documented_inference",
    "synthetic_fallback",
    "explicit_unknown",
]
ORIGIN_CONFIDENCE = {
    "site_survey": 1.00,
    "user_confirmed_observation": 0.90,
    "official_spatial_dataset": 0.85,
    "official_regional_proxy": 0.65,
    "documented_inference": 0.50,
    "synthetic_fallback": 0.30,
    "explicit_unknown": 0.00,
}

PDOK = {
    "pijnacker": ("Pijnacker", "Pijnacker-Nootdorp", "Zuid-Holland", "Brink van Dik Trom 12, 2641BS Pijnacker", 10.76, "adr-2d908f8ec592087984ccc2a21d2f0bac", "4e669108d6fea8e390801dd2c9e25ebebefe74bfd73709075c4a9edc898410e7"),
    "delft": ("Delft", "Delft", "Zuid-Holland", "Oude Delft 91M, 2611BD Delft", 14.88, "adr-09c76d214743374f8568ae7ca194785d", "dcd8965a3eccc903e51f85e47f10242d68e2207f21cd137737deced27fdb5572"),
    "rotterdam": ("Rotterdam", "Rotterdam", "Zuid-Holland", "Weena 8, 3012CM Rotterdam", 36.81, "adr-6466e43a6997cb64edd6beb09362826f", "b844edff5672a406095493c29c34cc39b18ff3a3ac79b7a0a7a77e92dffb4b7c"),
    "the_hague": ("'s-Gravenhage", "'s-Gravenhage", "Zuid-Holland", "Binnenhof 14, 's-Gravenhage", 55.79, "adr-e3f35bd2cecc0fd85df7c8390a292c38", "deade3be6eb59e4affa9016e3ba6ef0165f3b0d58191c55078217b2f0c7ac0c5"),
    "leiden": ("Leiden", "Leiden", "Zuid-Holland", "Hooglandse Kerksteeg 9, 2312HR Leiden", 11.63, "adr-87a40c4f473dfe1306acdd874444c3a9", "19feac6e68854a683b4b327ad552710476349cf4c855e550c6aa6d13118c5f89"),
    "utrecht": ("Utrecht", "Utrecht", "Utrecht", "Korte Nieuwstraat 2, 3512NM Utrecht", 6.22, "adr-b6add48f0b4f8f2f3f44f4146e0d475e", "74cfbec05174562ec377e36e713b88100d84d69d8483c6e987b616c4c6ae1ec4"),
    "amsterdam": ("Amsterdam", "Amsterdam", "Noord-Holland", "Valkenburgerstraat 238, 1011ND Amsterdam", 6.45, "adr-9b57571df2a08ed441b03df2f638b227", "1621958d5eb9845e2909bb7e7d4958c515ab60df880f3341abce9720e3d4e4f7"),
    "groningen": ("Groningen", "Groningen", "Groningen", "Grote Markt 18, 9712HT Groningen", 6.30, "adr-e99bf36affe94e50ab446a93cc205ffb", "0844680da9dc45db404f4d65a86eea970c1565c46b1239ad79988f26472bd01c"),
}

# Coordinates and the three broad fields are preserved from website/data/demo-data.js.
# They are not interpreted as surveyed citywide conditions.
PRESET_INPUTS = [
    ("pijnacker", "Pijnacker", 52.020, 4.440, "peat", "wet", "seasonal", "mixed", "yes", "moderate", "no", "no"),
    ("delft", "Delft", 52.009, 4.358, "clay", "fresh", "none", "mixed", "yes", "high", "yes", "no"),
    ("rotterdam", "Rotterdam", 51.924, 4.477, "clay", "fresh", "none", "sun", "no", "high", "yes", "no"),
    ("the_hague", "The Hague", 52.080, 4.313, "sand", "dry", "none", "sun", "no", "high", "yes", "no"),
    ("leiden", "Leiden", 52.160, 4.494, "peat", "wet", "seasonal", "mixed", "yes", "moderate", "no", "yes"),
    ("utrecht", "Utrecht", 52.090, 5.122, "clay", "fresh", "none", "mixed", "yes", "high", "yes", "no"),
    ("amsterdam", "Amsterdam", 52.369, 4.904, "peat", "fresh", "none", "mixed", "yes", "high", "yes", "no"),
    ("groningen", "Groningen", 53.219, 6.566, "clay", "fresh", "none", "mixed", "yes", "moderate", "no", "no"),
]

ZONE_NOTES = {
    "soil": "Broad pilot substrate class; requires a zone soil observation, test or intersected soil evidence.",
    "moisture": "Broad pilot moisture class; not a measurement and requires seasonal site confirmation.",
    "hydrology": "Broad pilot hydroperiod class; no depth, duration or groundwater measurement is claimed.",
    "light": "Broad pilot exposure class; requires user observation or a geometry/time-specific study.",
    "canopy": "Context only. It explains light and is deliberately not scored a second time.",
    "disturbance": "Broad demonstration disturbance class; traffic proximity alone is not a measured stress response.",
    "hardscape": "Demonstration adjacency flag; requires mapped zone geometry and feature intersection.",
    "waterEdge": "Demonstration edge flag used by the marginal-plant gate; absence is not inferred from map silence.",
    "source": "The authoritative scorer value is demo because all matching inputs in this fixture are synthetic.",
    "path_edge": "Demonstration placement context; requires mapped path geometry before real use.",
    "available_width_m": "Plausible clear-width fixture, not a measurement of the named location.",
    "available_length_m": "Plausible clear-length fixture, not a measurement of the named location.",
    "plantable_area_m2": "Plausible usable-area fixture, not parcel or city area.",
    "max_plant_height_m": "Demonstration visibility envelope; a project decision, not a mapped fact.",
    "support_length_m": "Demonstration usable support length; requires mapped support geometry.",
}

PROJECT_NOTES = {
    "type": "Explicit test-fixture project type; never inferred from maps.",
    "maintenance": "Explicit test-fixture maintenance capacity; must be supplied by the project team.",
    "character": "Explicit test-fixture spatial character; a design preference, not site evidence.",
    "vigourControl": "Explicit test-fixture containment commitment; not inferred from maintenance capacity.",
    "evaluation_stage": "The fixture runs placement-stage hard gates.",
    "publicAccess": "Explicit test-fixture policy; never inferred from public-space mapping.",
    "publicHarvest": "Explicit test-fixture policy; never inferred from project type.",
    "sightlines": "Explicit test-fixture policy; mapped path geometry is still needed for real use.",
    "rewilding": "Explicit test-fixture native-only policy; never inferred from ecology or maps.",
    "support": "Explicit test-fixture support availability; requires user confirmation and mapped support for real use.",
    "restorationOrnamentals": "Explicit test-fixture restoration exception policy.",
    "area": "Demonstration project-area envelope; not a cadastral or surveyed area.",
    "anchorColours": "Optional demonstration design preference; never overrides a gate.",
    "desiredFlowerMonths": "Optional demonstration design preference; never supplies suitability points.",
    "priorities": "Optional demonstration output preference; never overrides a gate.",
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv(path: Path, rows, headers=None):
    rows = list(rows)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers or list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def evidence(value, *, origin="synthetic_fallback", real=None, note, spatial_scope="synthetic demonstration profile", temporal_scope=None, verification_status=None, source_ref="DERIVATION-DEMO-001"):
    if origin not in ALLOWED_ORIGINS:
        raise ValueError(origin)
    return {
        "real_value": real,
        "operational_value": value,
        "operational_value_origin": origin,
        "operational_value_confidence": ORIGIN_CONFIDENCE[origin],
        "source_or_derivation_note": note,
        "source_ledger_reference": source_ref,
        "spatial_scope": spatial_scope,
        "temporal_scope": temporal_scope or f"not observed; fixture generated {DATE}",
        "verification_status": verification_status or ("requires_user_confirmation" if origin in {"synthetic_fallback", "documented_inference", "official_regional_proxy"} else "source_checked"),
    }


def project_values(area=1000):
    return {
        "type": "landscape",
        "maintenance": "moderate",
        "character": "mosaic",
        "vigourControl": "no",
        "evaluation_stage": "placement",
        "publicAccess": True,
        "publicHarvest": False,
        "sightlines": False,
        "rewilding": False,
        "support": True,
        "restorationOrnamentals": False,
        "area": area,
        "anchorColours": ["purple", "yellow"],
        "desiredFlowerMonths": [6, 7, 8],
        "priorities": ["pollinators"],
    }


def evidence_map(values, notes, scope):
    return {field: evidence(value, note=notes[field], spatial_scope=scope) for field, value in values.items()}


def operational(field_evidence):
    return {field: item["operational_value"] for field, item in field_evidence.items()}


def confidence_summary(zone_fields, project_fields):
    zc = lambda *fields: sum(zone_fields[f]["operational_value_confidence"] for f in fields) / len(fields)
    pc = lambda *fields: sum(project_fields[f]["operational_value_confidence"] for f in fields) / len(fields)
    terms = {
        "soil": zc("soil"),
        "moisture": zc("moisture"),
        "hydrology": zc("hydrology"),
        "light": zc("light"),
        "disturbance_hardscape": zc("disturbance", "hardscape"),
        "spatial": zc("available_width_m", "available_length_m", "plantable_area_m2", "max_plant_height_m", "path_edge", "support_length_m"),
        "maintenance_vigour": pc("maintenance", "vigourControl"),
    }
    weights = {"soil": 15, "moisture": 20, "hydrology": 15, "light": 15, "disturbance_hardscape": 10, "spatial": 15, "maintenance_vigour": 10}
    score = sum(terms[k] * weights[k] for k in weights) / 100
    return {"zone_evidence_confidence": round(score, 4), "component_confidence": {k: round(v, 4) for k, v in terms.items()}, "formula": "weighted mean of location/project field confidence, kept separate from compatibility"}


def make_zone(site_id, zone_id, zone_name, values, *, fixture_kind, area=1000):
    scope = "synthetic demonstration profile" if fixture_kind == "preset" else "synthetic canonical test fixture"
    zfields = evidence_map(values, ZONE_NOTES, scope)
    pfields = evidence_map(project_values(area), PROJECT_NOTES, scope)
    return {
        "site_id": site_id,
        "zone_id": zone_id,
        "zone_name": zone_name,
        "fixture_kind": fixture_kind,
        "boundary_or_polygon_reference": None,
        "zone_geometry_or_reference": None,
        "field_evidence": zfields,
        "project_context_evidence": pfields,
        "evaluation_payload": {"zone": {"zone_id": zone_id, **operational(zfields)}, "project": operational(pfields)},
        "confidence": confidence_summary(zfields, pfields),
        "user_corrections": [],
        "survey_replacements": [],
        "date_of_observation": None,
        "stale_data": True,
        "warnings": [
            "TEST FIXTURE — not surveyed site conditions.",
            "Every matching value requires user confirmation, intersecting map evidence, or survey evidence before real use.",
            "Complete operational values make the pilot scoreable; they do not make the evidence high-confidence.",
        ],
    }


def build_contract(plant_contract, rules):
    zone_fields = {}
    for field in plant_contract["zone_required"]:
        spec = {"required": True, "unit": "m" if field.endswith("_m") else "m2" if field.endswith("_m2") else "categorical"}
        if field in plant_contract["zone_vocabulary"]:
            spec["allowed_values"] = plant_contract["zone_vocabulary"][field]
        elif field != "zone_id":
            spec["value_rule"] = "non-negative number or literal unknown; pilot fixtures resolve to a number"
        zone_fields[field] = spec
    project_fields = {}
    for field in plant_contract["project_required"]:
        spec = {"required": True, "unit": "m2" if field == "area" else "categorical_or_boolean"}
        if field in plant_contract["project_vocabulary"]:
            spec["allowed_values"] = plant_contract["project_vocabulary"][field]
        elif field in plant_contract["project_booleans"]:
            spec["allowed_values"] = [True, False]
        elif field in plant_contract["project_array_vocabulary"]:
            spec["allowed_values"] = plant_contract["project_array_vocabulary"][field]
        project_fields[field] = spec
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "version": VERSION,
        "status": "pilot_only_not_production_ready",
        "authoritative_dependencies": {
            "plant_location_contract": {"path": "dataset/scoring/plant-location-contract-v0_3.json", "sha256": sha256(PLANT_CONTRACT_PATH)},
            "plant_suitability_rules": {"path": "dataset/scoring/plant-suitability-rules-v0_3.json", "sha256": sha256(PLANT_RULES_PATH)},
            "plant_matching_ready_data": {"path": "dataset/derived/plantscapes_demo_matching_ready_v0_3.csv", "sha256": sha256(PLANTS_PATH)},
        },
        "contract_rule": "evaluation_payload uses the plant-side contract verbatim; evidence envelopes must not silently replace real_value with operational_value",
        "site_model": ["Site", "one boundary or reference", "one or more independently matchable zones", "field evidence per zone", "operational values per zone", "separate user corrections and survey replacements"],
        "field_evidence_required": ["real_value", "operational_value", "operational_value_origin", "operational_value_confidence", "source_or_derivation_note", "source_ledger_reference", "spatial_scope", "temporal_scope", "verification_status"],
        "allowed_operational_origins": ALLOWED_ORIGINS,
        "origin_confidence": ORIGIN_CONFIDENCE,
        "spatial_scopes": ["exact site or polygon", "site zone", "nearby point", "neighbourhood", "municipality", "regional proxy", "synthetic demonstration profile", "synthetic canonical test fixture"],
        "zone_scoring_fields": zone_fields,
        "project_scoring_fields": project_fields,
        "score_components": rules["components"],
        "hard_gates": rules["hard_gates"],
        "score_weight_total": sum(item["weight"] for item in rules["components"].values()),
        "confidence_rule": "Evidence confidence is independent of suitability. Compatibility is never inferred from confidence, and unknown has zero evidence confidence.",
        "canopy_rule": rules["canopy_rule"],
        "dynamic_update_rule": "Preserve original suggestion, append user correction or survey replacement with timestamp and actor/basis, recompute operational value, and flag stale evidence without deleting history.",
        "non_goals": ["no website integration", "no citywide environmental truth", "no production planting advice", "no safety or legal decision on the location side"],
    }


def source_ledger_rows():
    rows = []
    coords = {x[0]: (x[2], x[3]) for x in PRESET_INPUTS}
    for pid, details in PDOK.items():
        official_place, municipality, province, nearest, distance, lookup_id, digest = details
        lat, lon = coords[pid]
        reverse = f"https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse?lat={lat:.3f}&lon={lon:.3f}&rows=1"
        lookup = f"https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?id={lookup_id}"
        rows.append({
            "source_id": f"PDOK-LOC-{pid.upper()}", "title": "PDOK Locatieserver reverse and lookup response", "publisher": "PDOK / source registrations including BAG", "dataset_or_service_identifier": "locatieserver search v3_1", "version_or_publication_date": "API v3_1; live service", "access_date": DATE, "exact_url_or_endpoint": reverse, "exact_query_coordinate_polygon_or_feature": f"reverse lat={lat:.3f}, lon={lon:.3f}, rows=1; lookup id={lookup_id}; {lookup}", "geographic_scope": "nearest registered address to approximate preset centre", "spatial_resolution_or_distance": f"nearest result {distance:.2f} m", "temporal_scope": f"live response accessed {DATE}", "licence_and_reuse_status": "BAG-derived address data is open; Public Domain Mark 1.0 metadata applies to BAG products. PDOK service conditions and current dataset metadata must also be respected.", "interpretation": f"Confirms administrative context only: place={official_place}; municipality={municipality}; province={province}; nearest={nearest}.", "limitations": "The query point is an approximate UI preset centre, not a site boundary. It does not evidence soil, hydrology, light, canopy, disturbance, hardscape or water edge.", "response_sha256": digest, "applied_to_fields": "official_place_name|municipality|province|nearest_address|nearest_distance_m"
        })
    rows += [
        {"source_id": "BRO-SGM-RESEARCH", "title": "Bodemkaart van Nederland (SGM)", "publisher": "Basisregistratie Ondergrond; bronhouder LNV; supplier Wageningen Environmental Research", "dataset_or_service_identifier": "SGM 1.2 / Bodemkaart 1:50,000", "version_or_publication_date": "SGM catalogue 1.2; production since 2024", "access_date": DATE, "exact_url_or_endpoint": "https://basisregistratieondergrond.nl/inhoud-bro/registratieobjecten/modellen/bodemkaart-sgm/", "exact_query_coordinate_polygon_or_feature": "Documentation review only; no polygon supplied and no feature query made", "geographic_scope": "national to regional", "spatial_resolution_or_distance": "map scale 1:50,000; not suitable alone for parcel/local application", "temporal_scope": "model version documented at access date", "licence_and_reuse_status": "Open government model distributed through BRO/PDOK; confirm the current model metadata licence with any future download and preserve attribution/conditions.", "interpretation": "Potential future regional soil proxy after zone intersection and legend interpretation.", "limitations": "Official guidance says little/no coverage in urban areas and explicitly advises additional data for local/parcel use.", "response_sha256": "", "applied_to_fields": "none_research_only"},
        {"source_id": "PDOK-BGT-RESEARCH", "title": "Basisregistratie Grootschalige Topografie (OGC API)", "publisher": "Kadaster (LV-BGT) via PDOK", "dataset_or_service_identifier": "BGT OGC API v1", "version_or_publication_date": "live; daily updates", "access_date": DATE, "exact_url_or_endpoint": "https://api.pdok.nl/kadaster/bgt/ogc/v1", "exact_query_coordinate_polygon_or_feature": "Landing-page/collections review only; no site polygon supplied and no feature intersection made", "geographic_scope": "Netherlands; object-level topography", "spatial_resolution_or_distance": "large-scale mapped physical objects", "temporal_scope": "live service; daily update frequency", "licence_and_reuse_status": "CC0 1.0; PDOK service conditions also apply", "interpretation": "Potential future evidence for mapped water, hardscape and vegetation objects after zone intersection.", "limitations": "Map presence is not hydrology duration, rooting volume, light, public access or disturbance; absence is not proof of absence without coverage/feature review.", "response_sha256": "", "applied_to_fields": "none_research_only"},
        {"source_id": "AHN6-RESEARCH", "title": "Actueel Hoogtebestand Nederland 6", "publisher": "AHN programme / Dutch water authorities and Rijkswaterstaat", "dataset_or_service_identifier": "AHN6 DTM/DSM and point cloud", "version_or_publication_date": "AHN6 release programme 2025–2027", "access_date": DATE, "exact_url_or_endpoint": "https://www.ahn.nl/dataroom", "exact_query_coordinate_polygon_or_feature": "Documentation review only; no site polygon, raster request or flight-line identifier supplied", "geographic_scope": "Netherlands, staged coverage", "spatial_resolution_or_distance": "0.5 m raster source products; 1 km tiles for AHN6 downloads", "temporal_scope": "acquisition date varies by tile/flight line and must be captured for a real query", "licence_and_reuse_status": "CC BY 4.0 for AHN6; attribution required", "interpretation": "Potential future geometry/elevation context; DSM–DTM may support cautious canopy/obstacle inference only with validation.", "limitations": "Elevation does not directly establish soil, hydroperiod, usable width, rooting space or observed light; coverage date must be checked.", "response_sha256": "", "applied_to_fields": "none_research_only"},
        {"source_id": "DERIVATION-DEMO-001", "title": "Plantscapes v0.3 transparent demonstration fallback", "publisher": "Plantscapes prototype", "dataset_or_service_identifier": "internal deterministic fixture rule", "version_or_publication_date": VERSION, "access_date": DATE, "exact_url_or_endpoint": "repository:dataset/location/build_location_dataset_v0_3.py", "exact_query_coordinate_polygon_or_feature": "No external query; values are explicit test assumptions", "geographic_scope": "synthetic demonstration profile or canonical fixture", "spatial_resolution_or_distance": "not measured", "temporal_scope": f"generated {DATE}; no observation date", "licence_and_reuse_status": "Repository-local generated data; project terms apply", "interpretation": "Supplies complete score inputs where no site evidence exists.", "limitations": "Never measured, surveyed, mapped or citywide truth; requires confirmation before real use.", "response_sha256": "", "applied_to_fields": "all matching and project fields in current fixtures"},
    ]
    return rows


def field_use_rows(plant_contract, rules):
    components = rules["components"]
    consumers = {}
    for component, spec in components.items():
        for field in spec["site_or_project_fields"]:
            consumers.setdefault(field, []).append(f"score:{component} ({spec['weight']} points)")
    gate_map = {
        "waterEdge": "H03_WATER_EDGE", "hydrology": "H03_WATER_EDGE|H04_PERMANENT_WATER", "support": "H05_SUPPORT", "publicAccess": "H06_PUBLIC_CONTACT|H11_PATH_THORNS", "available_width_m": "H07_WOODY_GEOMETRY", "available_length_m": "H07_WOODY_GEOMETRY", "plantable_area_m2": "H07_WOODY_GEOMETRY", "maintenance": "H08_VIGOUR", "vigourControl": "H08_VIGOUR", "rewilding": "H09_NATIVE_POLICY", "type": "H10_RESTORATION_POLICY", "restorationOrnamentals": "H10_RESTORATION_POLICY", "path_edge": "H11_PATH_THORNS|visibility", "max_plant_height_m": "visibility", "publicHarvest": "harvest_warning", "support_length_m": "climber_quantity", "area": "quantity_capacity", "evaluation_stage": "H07_WOODY_GEOMETRY|H11_PATH_THORNS", "character": "placement_quantity|design_preference"
    }
    app_map = {"type": "project().type", "area": "project().area", "maintenance": "project().maintenance", "character": "project().character", "publicAccess": "project().publicAccess", "publicHarvest": "project().publicHarvest", "sightlines": "project().sightlines", "rewilding": "project().rewilding", "restorationOrnamentals": "project().restorationOrnamentals", "anchorColours": "project().anchorColours", "priorities": "project().priorities", "waterEdge": "zone.conditions.waterEdge"}
    rows = []
    all_fields = [f for f in plant_contract["zone_required"] if f != "zone_id"] + plant_contract["project_required"]
    for field in all_fields:
        consumer = "|".join(consumers.get(field, []) + ([gate_map[field]] if field in gate_map else [])) or ("explanation_only" if field == "canopy" else "confidence/input validation" if field == "source" else "design_preference/output")
        rows.append({"location_field": field, "current_app_field": app_map.get(field, f"zone.conditions.{field}" if field in plant_contract["zone_required"] else "not_collected"), "v0_3_status": "retained", "used_in_score": str(field in consumers).lower(), "used_by_hard_gate_or_placement": str(field in gate_map).lower(), "interface_or_explanation_only": str(field in {"canopy", "anchorColours", "desiredFlowerMonths", "priorities", "character"}).lower(), "current_collection_state": "user-confirmable" if field in {"soil", "moisture", "hydrology", "light", "canopy", "disturbance", "hardscape", "waterEdge", "maintenance", "publicAccess", "publicHarvest", "sightlines", "rewilding"} else "derived_from_geometry" if field == "area" else "missing_from_current_app" if app_map.get(field, "not_collected") == "not_collected" else "collected", "synthetic_from_city_or_fixture": str(field in {"soil", "moisture", "hydrology", "light", "canopy", "disturbance", "hardscape", "waterEdge"}).lower(), "consumer": consumer, "reason": "Retained because it has an explicit v0.3 consumer; complete evidence envelope required."})
    rows += [
        {"location_field": "site_id|zone_id|zone_name", "current_app_field": "state.zones[].id|name plus site form", "v0_3_status": "identity", "used_in_score": "false", "used_by_hard_gate_or_placement": "false", "interface_or_explanation_only": "true", "current_collection_state": "partly_collected", "synthetic_from_city_or_fixture": "true", "consumer": "evaluation key|display|export", "reason": "Stable identity for independent zone matching and traceability."},
        {"location_field": "zone.note", "current_app_field": "zone.conditions.note", "v0_3_status": "research_notes_only", "used_in_score": "false", "used_by_hard_gate_or_placement": "false", "interface_or_explanation_only": "true", "current_collection_state": "user_confirmed_free_text", "synthetic_from_city_or_fixture": "false", "consumer": "visible explanation/export", "reason": "Preserve outside numeric matching fields."},
        {"location_field": "audience", "current_app_field": "project().audience", "v0_3_status": "excluded", "used_in_score": "false", "used_by_hard_gate_or_placement": "false", "interface_or_explanation_only": "true", "current_collection_state": "collected_but_ignored_by_v0_3", "synthetic_from_city_or_fixture": "false", "consumer": "none", "reason": "No plant comparison, gate or placement rule."},
        {"location_field": "project.notes", "current_app_field": "project().notes", "v0_3_status": "research_notes_only", "used_in_score": "false", "used_by_hard_gate_or_placement": "false", "interface_or_explanation_only": "true", "current_collection_state": "collected_but_ignored_by_v0_3", "synthetic_from_city_or_fixture": "false", "consumer": "visible explanation/export", "reason": "Keep as notes, not a matching input."},
        {"location_field": "site.reference|site.description", "current_app_field": "site().reference|site().description", "v0_3_status": "research_notes_only", "used_in_score": "false", "used_by_hard_gate_or_placement": "false", "interface_or_explanation_only": "true", "current_collection_state": "collected_but_ignored_by_v0_3", "synthetic_from_city_or_fixture": "false", "consumer": "site identity/output", "reason": "Useful provenance context but not compatibility."},
        {"location_field": "city preset soil|moisture|disturbance", "current_app_field": "demo.places.*", "v0_3_status": "low_confidence_start_only", "used_in_score": "true", "used_by_hard_gate_or_placement": "false", "interface_or_explanation_only": "false", "current_collection_state": "synthesized_from_city_preset", "synthetic_from_city_or_fixture": "true", "consumer": "prefill only; must become zone evidence", "reason": "Never treat as citywide or surveyed truth."},
    ]
    return rows


def crosswalk_rows(rules):
    rows = []
    for component, spec in rules["components"].items():
        for site in spec["site_or_project_fields"]:
            rows.append({"location_or_project_field": site, "corresponding_plant_field": "|".join(spec["plant_fields"]), "comparison_method": rules["component_aggregation"].get(component, f"best matrix compatibility from {component} matrix"), "score_weight_or_gate": str(spec["weight"]), "consumer": f"score:{component}", "reason_needed": f"Supplies the location/project side of the {component} component."})
    gates = {"waterEdge": ("water_edge_requirement|hydrology_tolerance", "yes plus compatible hydrology", "H03_WATER_EDGE"), "hydrology": ("hydrology_tolerance|water_edge_requirement", "matrix plus permanent/edge gates", "H03|H04"), "support": ("climbing_support_required", "boolean requirement", "H05"), "publicAccess": ("public_contact_status|thorns_or_spines", "policy activation", "H06|H11"), "available_width_m|available_length_m|plantable_area_m2": ("mature_spread_m|pilot_spacing_m|group", "clear square footprint", "H07"), "maintenance|vigourControl": ("maintenance_demand|vigour_or_spread_risk", "matrix and explicit-control gate", "H08"), "rewilding": ("native_status_nl", "native-only policy", "H09"), "type|restorationOrnamentals": ("native_status_nl", "restoration exception", "H10"), "path_edge|max_plant_height_m|sightlines": ("mature_height_m|thorns_or_spines", "visibility and thorn placement", "H11|spatial"), "source": ("field_confidence_json", "scorer source factor", "confidence"), "canopy": ("light_tolerance", "explanation only; light scored once", "warning"), "support_length_m": ("pilot_spacing_m|climbing_support_required", "floor support length / spacing", "quantity")}
    for location, (plant, method, consumer) in gates.items():
        rows.append({"location_or_project_field": location, "corresponding_plant_field": plant, "comparison_method": method, "score_weight_or_gate": consumer, "consumer": consumer, "reason_needed": "Required for the stated gate, placement, quantity or visible explanation."})
    return rows


def integration_rows():
    return [
        ("soil", "zone.conditions.soil", "none", "nearest demo place or made-ground toggle", "user/survey/future BRO polygon intersection", "soil score", "Regional or synthetic suggestion—confirm on site."),
        ("moisture", "zone.conditions.moisture", "none", "nearest demo place or wet/dry toggle", "user/survey", "moisture score", "Seasonal moisture has not been measured."),
        ("hydrology", "zone.conditions.hydrology", "none", "feature toggle/profile rule", "survey/user; map only as supporting context", "hydrology score; H03/H04", "Confirm duration/depth; mapped water is not hydroperiod."),
        ("light", "zone.conditions.light", "none", "canopy toggle", "user observation/geometry study", "light score", "Confirm season and time-of-day scope."),
        ("canopy", "zone.conditions.canopy", "none", "canopy toggle", "map/user", "warning only", "Canopy is not a second light score."),
        ("disturbance", "zone.conditions.disturbance", "none", "nearest demo place or road toggle", "user/project/survey", "disturbance score", "Road proximity alone is not measured disturbance."),
        ("hardscape", "zone.conditions.hardscape", "none", "hardscape toggle", "BGT/geometry plus user confirmation", "hardscape half-component", "Confirm actual rooting/edge context."),
        ("waterEdge", "zone.conditions.waterEdge", "snake_case water_edge only at domain boundary", "water toggle", "BGT/geometry plus user/survey", "H03 and aquatic fit", "Map absence is not proof of absence."),
        ("source", "zone.conditions.source", "map UI bases to scorer demo|observation|survey|document", "unverified until user selection", "evidence workflow", "confidence factor/current confirmation gate", "Basis labels evidence, not compatibility."),
        ("available_width_m", "not collected", "derive conservative clear width", "none", "zone geometry", "spatial score/H07", "Usable width is not whole-plot width."),
        ("available_length_m", "not collected", "derive conservative clear length", "none", "zone geometry", "spatial score/H07", "Exclude paths, water and voids."),
        ("plantable_area_m2", "project().area only", "derive per-zone usable area", "whole plot area currently substituted", "zone geometry", "spatial score/H07/quantity", "Do not use site area as zone plantable area."),
        ("max_plant_height_m", "not collected", "none", "unknown", "project input", "visibility spatial term", "Required only when sightline policy is active."),
        ("path_edge", "derived during placement but not zone input", "yes/no/unknown", "geometry proximity", "zone/path geometry", "H11/visibility", "Unknown cannot clear thorn placement."),
        ("support_length_m", "not collected", "metres", "none", "mapped support geometry", "climber quantity", "Support availability and length are separate."),
        ("support", "not collected", "boolean", "false in v0.3 scorer default", "user/project input", "H05", "Must not be inferred from map alone."),
        ("vigourControl", "not collected", "yes/no/unknown", "unknown in v0.3 scorer default", "user/project input", "maintenance/vigour score and H08", "Active control commitment must be explicit."),
        ("desiredFlowerMonths", "not collected", "integer month array", "empty", "user preference", "design tie-breaker only", "Never overrides a hard gate."),
    ]


def build():
    plant_contract = read_json(PLANT_CONTRACT_PATH)
    rules = read_json(PLANT_RULES_PATH)
    write_json(HERE / "location-zone-contract-v0_3.json", build_contract(plant_contract, rules))

    presets = []
    all_zones = []
    for pid, label, lat, lon, soil, moisture, hydro, light, canopy, disturbance, hardscape, edge in PRESET_INPUTS:
        place, municipality, province, nearest, distance, lookup_id, _ = PDOK[pid]
        zone_values = {"soil": soil, "moisture": moisture, "hydrology": hydro, "light": light, "canopy": canopy, "disturbance": disturbance, "hardscape": hardscape, "waterEdge": edge, "source": "demo", "path_edge": "no", "available_width_m": 12.0, "available_length_m": 10.0, "plantable_area_m2": 120.0, "max_plant_height_m": 3.0, "support_length_m": 0.0}
        zone = make_zone(f"site_preset_{pid}", f"zone_preset_{pid}_default", f"{label} default demonstration zone", zone_values, fixture_kind="preset", area=500)
        source_ref = f"PDOK-LOC-{pid.upper()}"
        admin = {
            "centre_coordinate": evidence([lat, lon], origin="documented_inference", real=[lat, lon], note="Inherited approximate centre from the existing UI preset and used as the PDOK reverse-query input; it is not a site point.", spatial_scope="nearby point", temporal_scope="existing prototype coordinate; checked 2026-10-13", source_ref=source_ref),
            "official_place_name": evidence(place, origin="official_spatial_dataset", real=place, note="Returned by lookup for the nearest address to the approximate preset centre.", spatial_scope="nearby point", temporal_scope=f"live response accessed {DATE}", source_ref=source_ref),
            "municipality": evidence(municipality, origin="official_spatial_dataset", real=municipality, note="Returned by PDOK lookup; administrative context only.", spatial_scope="nearby point", temporal_scope=f"live response accessed {DATE}", source_ref=source_ref),
            "province": evidence(province, origin="official_spatial_dataset", real=province, note="Returned by PDOK lookup; administrative context only.", spatial_scope="nearby point", temporal_scope=f"live response accessed {DATE}", source_ref=source_ref),
            "nearest_address": evidence(nearest, origin="official_spatial_dataset", real=nearest, note=f"Nearest reverse-geocoder result ({distance:.2f} m); not a project address.", spatial_scope="nearby point", temporal_scope=f"live response accessed {DATE}", source_ref=source_ref),
        }
        presets.append({"preset_id": pid, "label": label, "profile_status": "regional_or_synthetic_starting_suggestion_only", "administrative_evidence": admin, "default_demonstration_zone": zone, "non_authoritative_statement": "This preset is not citywide truth and is not a verified site survey.", "user_confirmation_requirement": "Draw or supply the actual site/zone, then confirm every matching field with user observation, map intersection or survey evidence before real use."})
        all_zones.append(zone)
    write_json(HERE / "demo-location-presets-v0_3.json", {"version": VERSION, "generated": DATE, "preset_count": len(presets), "warning": "Approximate low-confidence starting profiles only; never surveyed city conditions.", "presets": presets})

    canonical_specs = [
        ("dry_sunny_sand", "Dry sunny sandy zone", {"soil": "sand", "moisture": "dry", "hydrology": "none", "light": "sun", "canopy": "no", "disturbance": "low", "hardscape": "no", "waterEdge": "no", "source": "demo", "path_edge": "no", "available_width_m": 20.0, "available_length_m": 15.0, "plantable_area_m2": 300.0, "max_plant_height_m": 3.0, "support_length_m": 10.0}),
        ("fresh_clay_mixed", "Fresh-to-moist clay zone with mixed light", {"soil": "clay", "moisture": "fresh", "hydrology": "none", "light": "mixed", "canopy": "yes", "disturbance": "low", "hardscape": "no", "waterEdge": "no", "source": "demo", "path_edge": "no", "available_width_m": 20.0, "available_length_m": 20.0, "plantable_area_m2": 400.0, "max_plant_height_m": 3.0, "support_length_m": 10.0}),
        ("wet_water_edge", "Wet water-edge zone", {"soil": "peat", "moisture": "wet", "hydrology": "permanent", "light": "sun", "canopy": "no", "disturbance": "low", "hardscape": "no", "waterEdge": "yes", "source": "demo", "path_edge": "no", "available_width_m": 12.0, "available_length_m": 8.0, "plantable_area_m2": 96.0, "max_plant_height_m": 3.0, "support_length_m": 10.0}),
    ]
    canonical = []
    for zid, name, vals in canonical_specs:
        zone = make_zone("site_canonical_fixtures", zid, name, vals, fixture_kind="canonical", area=1000)
        canonical.append(zone)
        all_zones.append(zone)
    write_json(HERE / "canonical-test-zones-v0_3.json", {"version": VERSION, "generated": DATE, "fixture_statement": "All three zones and project contexts are synthetic test fixtures, not real locations.", "zone_count": len(canonical), "zones": canonical})

    claims = []
    for zone in all_zones:
        for layer, values in (("zone", zone["field_evidence"]), ("project", zone["project_context_evidence"])):
            for field, ev in values.items():
                claims.append({"claim_id": f"loc-v03-{zone['zone_id']}-{layer}-{field}", "record_type": f"{layer}_operational_field", "site_id": zone["site_id"], "zone_id": zone["zone_id"], "field": field, "value": ev, "corresponding_plant_or_rule": "See plant-location-crosswalk-v0_3.csv"})
    for preset in presets:
        for field, ev in preset["administrative_evidence"].items():
            claims.append({"claim_id": f"loc-v03-{preset['preset_id']}-administrative-{field}", "record_type": "preset_administrative_metadata", "site_id": f"site_preset_{preset['preset_id']}", "zone_id": preset["default_demonstration_zone"]["zone_id"], "field": field, "value": ev, "corresponding_plant_or_rule": "display/provenance only; no suitability points"})
    (HERE / "location-claims-v0_3.jsonl").write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in claims), encoding="utf-8")

    write_csv(HERE / "location-source-ledger-v0_3.csv", source_ledger_rows())
    gaps = []
    for preset in presets:
        zone = preset["default_demonstration_zone"]
        for group, fields, risk, confirm in [
            ("soil", "soil", "Wrong substrate class can materially change 15 points.", "zone soil survey/test or defensible intersected BRO evidence plus ground truth"),
            ("water_regime", "moisture|hydrology|waterEdge", "Wrong water regime changes up to 35 points and aquatic/permanent-water gates.", "seasonal observation, levels/depths and mapped zone-water relationship"),
            ("light_canopy", "light|canopy", "Wrong exposure changes 15 points.", "season/time-scoped observation or validated geometry study"),
            ("urban_context", "disturbance|hardscape", "Wrong context changes up to 10 points.", "zone observation and mapped feature intersection"),
            ("geometry", "available_width_m|available_length_m|plantable_area_m2|max_plant_height_m|path_edge|support_length_m", "Wrong clear geometry changes spatial score, gates and quantities.", "drawn zone/path/support geometry and project clearance decision"),
            ("project_policy", "all project fields", "Wrong assumptions change maintenance, safety and native-policy gates.", "explicit project-team confirmation"),
        ]:
            gaps.append({"gap_id": f"gap-{preset['preset_id']}-{group}", "site_id": zone["site_id"], "zone_id": zone["zone_id"], "field_or_group": fields, "current_operational_resolution": "synthetic fallback", "risk_if_wrong": risk, "confirmation_needed": confirm, "priority": "required_before_real_use", "blocks_production_use": "yes"})
    gaps.append({"gap_id": "gap-repository-site-pack", "site_id": "all", "zone_id": "all", "field_or_group": "site survey|coordinates/polygon|soil report|location pack", "current_operational_resolution": "No real site survey or location pack found in the repository file inventory.", "risk_if_wrong": "All named-place environmental and geometry values remain demonstration assumptions.", "confirmation_needed": "Provide a real boundary/zone geometry and evidence pack, then replace values field by field without deleting suggestion history.", "priority": "required_before_real_use", "blocks_production_use": "yes"})
    write_csv(HERE / "location-data-gaps-v0_3.csv", gaps)
    write_csv(HERE / "location-field-use-matrix-v0_3.csv", field_use_rows(plant_contract, rules))
    write_csv(HERE / "plant-location-crosswalk-v0_3.csv", crosswalk_rows(rules))
    write_csv(HERE / "application-integration-mapping-v0_3.csv", [dict(zip(["v0_3_location_field", "current_app_js_field", "required_vocabulary_conversion", "current_synthetic_default_to_replace", "future_value_source", "scoring_or_gate_consumer", "displayed_warning"], row)) for row in integration_rows()])

    # Canonical scorer input is deliberately the same shape as the plant v0.3 example input.
    scoring_input = {"project": canonical[0]["evaluation_payload"]["project"], "zones": [z["evaluation_payload"]["zone"] for z in canonical], "note": "Synthetic canonical fixtures with complete operational values; evidence envelopes are in canonical-test-zones-v0_3.json."}
    write_json(HERE / "canonical-scoring-inputs-v0_3.json", scoring_input)
    run_cross_evaluation(canonical)
    write_handover(presets, canonical, claims)
    print(f"Built {len(presets)} presets, {len(canonical)} canonical zones and {len(claims)} traceable claims.")


def load_scorer():
    spec = importlib.util.spec_from_file_location("plantscapes_v03_scorer", DATA / "score_demo_suitability_v0_3.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


def run_cross_evaluation(canonical):
    scorer = load_scorer()
    plants = scorer.load_plants()
    all_results = []
    summaries = {}
    for zone in canonical:
        z = zone["evaluation_payload"]["zone"]
        p = zone["evaluation_payload"]["project"]
        results = []
        for plant in plants:
            result = scorer.evaluate(plant, z, p)
            result["zone_evidence_confidence_score"] = round(zone["confidence"]["zone_evidence_confidence"] * 100, 4)
            result["zone_evidence_origin_statement"] = "synthetic fixture; confidence is independent of compatibility"
            results.append(result)
        all_results.extend(results)
        ranked = scorer.rank(results)
        summaries[z["zone_id"]] = {
            "record_count": len(results),
            "eligible_count": len(ranked),
            "excluded_count": sum(r["eligibility_state"] == "excluded" for r in results),
            "unsuitable_count": sum(r["eligibility_state"] == "unsuitable" for r in results),
            "ranked_eligible_candidates": [{"rank": i + 1, **{k: r[k] for k in ["fixture_id", "scientific_name", "raw_suitability_score", "final_suitability_score", "evidence_confidence_score", "zone_evidence_confidence_score", "eligibility_state"]}} for i, r in enumerate(ranked)],
            "excluded_plants": [{"fixture_id": r["fixture_id"], "scientific_name": r["scientific_name"], "reasons": [g for g in r["hard_gate_results"] if g["triggered"]]} for r in results if r["eligibility_state"] == "excluded"],
        }
    out = HERE / "evaluations"
    (out / "all-plant-zone-evaluations-v0_3.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n" for r in all_results), encoding="utf-8")
    score_rows = []
    for r in all_results:
        score_rows.append({"zone_id": r["zone_id"], "fixture_id": r["fixture_id"], "scientific_name": r["scientific_name"], "raw_suitability_score": r["raw_suitability_score"], "final_suitability_score": r["final_suitability_score"], "plant_and_scorer_evidence_confidence_score": r["evidence_confidence_score"], "zone_evidence_confidence_score": r["zone_evidence_confidence_score"], "eligibility_state": r["eligibility_state"], "eligible_for_demo_ranking": str(r["eligible_for_demo_ranking"]).lower(), "component_scores_json": json.dumps(r["component_scores"], separators=(",", ":")), "hard_gates_json": json.dumps(r["hard_gate_results"], separators=(",", ":")), "warnings_json": json.dumps(r["warnings"], separators=(",", ":")), "exclusion_reasons_json": json.dumps(r["exclusion_reasons"], separators=(",", ":"))})
    write_csv(out / "all-plant-zone-scores-v0_3.csv", score_rows)
    write_json(out / "zone-rankings-and-explanations-v0_3.json", {"version": VERSION, "total_evaluations": len(all_results), "zone_summaries": summaries, "warning": "All location inputs are synthetic canonical fixtures; rankings are a scoring demonstration only."})


def write_handover(presets, canonical, claims):
    counts = Counter(c["value"]["operational_value_origin"] for c in claims)
    eval_rows = list(csv.DictReader((HERE / "evaluations/all-plant-zone-scores-v0_3.csv").open(encoding="utf-8")))
    zone_stats = []
    for zid in [z["zone_id"] for z in canonical]:
        rows = [r for r in eval_rows if r["zone_id"] == zid]
        state_counts = Counter(r["eligibility_state"] for r in rows)
        zone_stats.append(f"| `{zid}` | {len(rows)} | {state_counts.get('strong_match', 0)} | {state_counts.get('suitable', 0)} | {state_counts.get('conditional_match', 0)} | {state_counts.get('unsuitable', 0)} | {state_counts.get('excluded', 0)} | 30.0 |")
    text = f"""# Location-data pilot handover v0.3

## Outcome and limits

This layer contains **{len(presets)} low-confidence presets**, each with one default demonstration zone, plus **{len(canonical)} canonical test zones**. It is complete enough to produce numeric pilot outputs for all 60 plants in every canonical zone, but it is **not production-ready** and contains **no surveyed site**. Repository inspection found no site survey, polygon/location pack, soil report or coordinate set for a real project.

The city labels are navigation/start-profile labels only. They are never claims that an entire city has one soil, moisture, hydrology, light or disturbance condition. The PDOK responses verify nearby administrative context for the approximate preset centres; they do not verify environmental conditions.

## Contract and field counts

- Exact plant scorer contract: `dataset/scoring/plant-location-contract-v0_3.json` (15 zone inputs including `source`, plus 15 project inputs).
- Matching/project field evidence records: {sum(c['record_type'] != 'preset_administrative_metadata' for c in claims)} ({len(presets) + len(canonical)} zones × 30 fields).
- Administrative preset metadata records: {sum(c['record_type'] == 'preset_administrative_metadata' for c in claims)}.
- Site-specific evidenced matching values: 0.
- Official regional-proxy matching values: 0.
- User-confirmed matching values: 0.
- Synthetic matching/project values: {counts['synthetic_fallback']}.
- Official spatial administrative values: {counts['official_spatial_dataset']} (place/municipality/province/nearest-address context only).
- Documented-inference administrative values: {counts['documented_inference']} (existing approximate centre coordinates).
- Explicit unknown operational values: {counts['explicit_unknown']}.

Every required score input is populated. Complete operational values and low evidence confidence deliberately coexist.

## Cross-evaluation

| Zone | Plants | Strong | Suitable | Conditional | Unsuitable | Excluded | Zone evidence confidence / 100 |
|---|---:|---:|---:|---:|---:|---:|---:|
{chr(10).join(zone_stats)}

The JSONL evaluation contains the full component trace, all gates, warnings, inclusion/exclusion reasons and plant evidence trace for all {len(eval_rows)} plant–zone pairs. The compact CSV exposes the same required headline scores and JSON traces. No plant is omitted.

## Confidence

All matching and project values currently use `synthetic_fallback = 0.30`, so every preset and canonical zone has a separately reported zone evidence-confidence score of **0.30 (30/100)**. This confidence never changes compatibility. Suitability and plant-side evidence confidence remain the scorer's separate outputs.

## Sources and licence conditions

- PDOK Locatieserver v3_1: eight exact reverse/lookup query pairs with response hashes; administrative context only. BAG-derived open-data terms and PDOK service conditions apply; recheck current metadata for future reuse.
- BRO Bodemkaart SGM 1:50,000: investigated but not applied because no site polygon exists and official guidance says it is not suitable alone for parcel/local use, with limited urban coverage. Confirm current model-download licence metadata when used.
- BGT OGC API v1: CC0 1.0; investigated for future water/hardscape/vegetation intersections, not applied without zone geometry.
- AHN6: CC BY 4.0, attribution required; investigated for future geometry/elevation context, not interpreted as soil, hydroperiod or observed light.

Full identifiers, URLs, access dates, queries, scopes, limitations and response hashes are in `location-source-ledger-v0_3.csv`.

## Current-system audit and future integration

- Can remain: zone-by-zone confirmation UI; the eight categorical vocabularies; visible evidence basis/note; drawn site boundary; multiple named zones; current hard warning for unconfirmed conditions.
- Remove as authority: nearest-city environmental assumptions and any implication that a preset represents citywide conditions. They may remain only as visibly synthetic prefill.
- Currently collected but outside matching: audience, project notes and site free text. Keep them as notes/output, not score inputs.
- Needs UI confirmation: soil, moisture, hydrology, light, canopy, disturbance, hardscape, water edge, maintenance, public access/harvest, sightlines, rewilding, active vigour control and project support.
- Geometry-derived after drawing: site/project area, per-zone plantable area, conservative clear width/length, path-edge relation and mapped support length. A geometry derivation must preserve its method and uncertainty.
- Must remain user/project supplied: policy intentions, maintenance capacity, support availability, height/sightline limits and design preferences.
- Future external lookups: intersect actual zone polygons with BGT and defensible soil/water/elevation sources, then retain feature IDs/query parameters and require ground truth where the source is generalized.

The exact per-field mapping, current default, conversion, consumer and warning is in `application-integration-mapping-v0_3.csv`. No application file was changed.

## Validation

<!-- VALIDATION_RESULT_START -->
Validation has not yet been run after this build.
<!-- VALIDATION_RESULT_END -->

Run from the repository root:

```powershell
python dataset/location/build_location_dataset_v0_3.py
python dataset/location/validate_location_dataset_v0_3.py
```

The validator checks counts, IDs, coordinates, value envelopes, origin/source integrity, vocabulary, units/scopes, score weights, field consumers, preset warnings, deterministic 180-result evaluation, no preference-over-gate behavior, and sensitivity for soil, moisture, hydrology, light, disturbance, hardscape, water edge, width/area, maximum height, climbing support, maintenance, public access and rewilding policy.

## Remaining limitations

1. No real site boundary, zone geometry, observation, survey or soil report was available.
2. No environmental matching value is supported by official site-intersecting evidence.
3. Current v0.3 plant records remain pilot-only and include unresolved legal/safety/provenance evidence; location data cannot clear those plant-side gates.
4. BRO, BGT and AHN are documented candidates, not silently converted into site facts.
5. The canonical zones and all rankings are deterministic test fixtures, not recommendations.
6. User corrections and survey replacements are modelled as append-only arrays but are empty until evidence is supplied.
7. Stale-data flags are true because there is no observation date.

## Files created

- `dataset/location/demo-location-presets-v0_3.json`
- `dataset/location/canonical-test-zones-v0_3.json`
- `dataset/location/location-zone-contract-v0_3.json`
- `dataset/location/location-claims-v0_3.jsonl`
- `dataset/location/location-source-ledger-v0_3.csv`
- `dataset/location/location-data-gaps-v0_3.csv`
- `dataset/location/location-field-use-matrix-v0_3.csv`
- `dataset/location/plant-location-crosswalk-v0_3.csv`
- `dataset/location/application-integration-mapping-v0_3.csv`
- `dataset/location/canonical-scoring-inputs-v0_3.json`
- `dataset/location/evaluations/all-plant-zone-evaluations-v0_3.jsonl`
- `dataset/location/evaluations/all-plant-zone-scores-v0_3.csv`
- `dataset/location/evaluations/zone-rankings-and-explanations-v0_3.json`
- `dataset/location/location-validation-v0_3.json`
- `dataset/location/build_location_dataset_v0_3.py`
- `dataset/location/validate_location_dataset_v0_3.py`
- `dataset/LOCATION-DATA-PILOT-HANDOVER-v0.3.md`
"""
    (DATA / "LOCATION-DATA-PILOT-HANDOVER-v0.3.md").write_text(text, encoding="utf-8")


if __name__ == "__main__":
    build()
