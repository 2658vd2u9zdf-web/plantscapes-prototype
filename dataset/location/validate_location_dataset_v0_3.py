"""Validate the v0.3 location layer and its complete 60 × 3 demonstration."""
from __future__ import annotations

import csv
import copy
import hashlib
import importlib.util
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent
ROOT = DATA.parent
ERRORS = []
PASSES = []


def check(condition, message):
    if condition:
        PASSES.append(message)
    else:
        ERRORS.append(message)


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def read_csv(path):
    return list(csv.DictReader(Path(path).open(encoding="utf-8-sig", newline="")))


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


def result_signature(results):
    fields = ["fixture_id", "zone_id", "raw_suitability_score", "final_suitability_score", "evidence_confidence_score", "eligibility_state", "eligible_for_demo_ranking", "component_scores", "hard_gate_results", "warnings"]
    return json.dumps([{f: r[f] for f in fields} for r in results], sort_keys=True, separators=(",", ":"))


def evaluate_all(scorer, plants, zone, project):
    return [scorer.evaluate(plant, copy.deepcopy(zone), copy.deepcopy(project)) for plant in plants]


def change_exists(scorer, plants, zone_a, project_a, zone_b, project_b):
    a = evaluate_all(scorer, plants, zone_a, project_a)
    b = evaluate_all(scorer, plants, zone_b, project_b)
    for left, right in zip(a, b):
        sig_left = (left["raw_suitability_score"], left["final_suitability_score"], left["eligibility_state"], left["eligible_for_demo_ranking"])
        sig_right = (right["raw_suitability_score"], right["final_suitability_score"], right["eligibility_state"], right["eligible_for_demo_ranking"])
        if sig_left != sig_right:
            return left["fixture_id"], sig_left, sig_right
    return None


def validate():
    required = [
        "demo-location-presets-v0_3.json", "canonical-test-zones-v0_3.json", "location-zone-contract-v0_3.json",
        "location-claims-v0_3.jsonl", "location-source-ledger-v0_3.csv", "location-data-gaps-v0_3.csv",
        "location-field-use-matrix-v0_3.csv", "plant-location-crosswalk-v0_3.csv", "build_location_dataset_v0_3.py",
        "validate_location_dataset_v0_3.py", "canonical-scoring-inputs-v0_3.json",
        "evaluations/all-plant-zone-evaluations-v0_3.jsonl", "evaluations/all-plant-zone-scores-v0_3.csv",
        "evaluations/zone-rankings-and-explanations-v0_3.json", "application-integration-mapping-v0_3.csv",
    ]
    for rel in required:
        check((HERE / rel).is_file(), f"required output exists: {rel}")
    check((DATA / "LOCATION-DATA-PILOT-HANDOVER-v0.3.md").is_file(), "handover exists")

    contract = read_json(HERE / "location-zone-contract-v0_3.json")
    plant_contract = read_json(DATA / "scoring/plant-location-contract-v0_3.json")
    rules = read_json(DATA / "scoring/plant-suitability-rules-v0_3.json")
    presets_doc = read_json(HERE / "demo-location-presets-v0_3.json")
    canonical_doc = read_json(HERE / "canonical-test-zones-v0_3.json")
    presets = presets_doc["presets"]
    canonical = canonical_doc["zones"]
    all_zones = [p["default_demonstration_zone"] for p in presets] + canonical

    check(len(presets) == 8, "all eight presets exist")
    check({p["preset_id"] for p in presets} == {"pijnacker", "delft", "rotterdam", "the_hague", "leiden", "utrecht", "amsterdam", "groningen"}, "preset IDs match the requested eight")
    check(len(canonical) == 3, "all three canonical zones exist")
    check({z["zone_id"] for z in canonical} == {"dry_sunny_sand", "fresh_clay_mixed", "wet_water_edge"}, "canonical IDs match plant v0.3 examples")
    zone_ids = [z["zone_id"] for z in all_zones]
    check(len(zone_ids) == len(set(zone_ids)), "zone IDs are unique")
    check(len({p["preset_id"] for p in presets}) == 8, "preset IDs are unique")

    for preset in presets:
        coord = preset["administrative_evidence"]["centre_coordinate"]["operational_value"]
        check(isinstance(coord, list) and len(coord) == 2 and -90 <= coord[0] <= 90 and -180 <= coord[1] <= 180, f"valid WGS84 coordinate: {preset['preset_id']}")
        check("not citywide truth" in preset["non_authoritative_statement"], f"non-authoritative city statement: {preset['preset_id']}")
        check("confirm every matching field" in preset["user_confirmation_requirement"], f"user confirmation required: {preset['preset_id']}")

    allowed_origins = set(contract["allowed_operational_origins"])
    allowed_scopes = set(contract["spatial_scopes"])
    source_rows = read_csv(HERE / "location-source-ledger-v0_3.csv")
    source_ids = {r["source_id"] for r in source_rows}
    required_zone_fields = set(plant_contract["zone_required"]) - {"zone_id"}
    required_project_fields = set(plant_contract["project_required"])
    all_evidence = []
    for zone in all_zones:
        check(set(zone["field_evidence"]) == required_zone_fields, f"complete zone fields: {zone['zone_id']}")
        check(set(zone["project_context_evidence"]) == required_project_fields, f"complete project fields: {zone['zone_id']}")
        check(set(zone["evaluation_payload"]["zone"]) == required_zone_fields | {"zone_id"}, f"exact scorer zone payload: {zone['zone_id']}")
        check(set(zone["evaluation_payload"]["project"]) == required_project_fields, f"exact scorer project payload: {zone['zone_id']}")
        check(zone["confidence"]["zone_evidence_confidence"] == 0.3, f"synthetic evidence confidence is 0.30: {zone['zone_id']}")
        for layer in [zone["field_evidence"], zone["project_context_evidence"]]:
            for field, ev in layer.items():
                all_evidence.append((zone["zone_id"], field, ev))
                check(ev["operational_value"] is not None and ev["operational_value"] != "", f"nonblank operational value: {zone['zone_id']}/{field}")
                check(ev["operational_value_origin"] in allowed_origins, f"allowed origin: {zone['zone_id']}/{field}")
                check(ev["operational_value_confidence"] == contract["origin_confidence"][ev["operational_value_origin"]], f"origin confidence aligned: {zone['zone_id']}/{field}")
                check(bool(ev["source_or_derivation_note"]), f"source/derivation note exists: {zone['zone_id']}/{field}")
                check(ev["source_ledger_reference"] in source_ids, f"source reference exists: {zone['zone_id']}/{field}")
                check(ev["spatial_scope"] in allowed_scopes, f"explicit allowed spatial scope: {zone['zone_id']}/{field}")
                check(bool(ev["temporal_scope"]), f"explicit temporal scope: {zone['zone_id']}/{field}")
                check(bool(ev["verification_status"]), f"verification status exists: {zone['zone_id']}/{field}")
                if ev["operational_value_origin"] in {"synthetic_fallback", "documented_inference"}:
                    check(len(ev["source_or_derivation_note"]) > 25, f"inferred/synthetic derivation is substantive: {zone['zone_id']}/{field}")
                if ev["operational_value_origin"] in {"official_spatial_dataset", "official_regional_proxy"}:
                    check(ev["source_ledger_reference"].startswith(("PDOK", "BRO", "AHN")), f"official value cites official ledger: {zone['zone_id']}/{field}")
                check(not (ev["spatial_scope"] in {"municipality", "regional proxy"} and ev["operational_value_origin"] == "site_survey"), f"regional scope is never site survey: {zone['zone_id']}/{field}")

        zpayload = zone["evaluation_payload"]["zone"]
        for field, vocab in plant_contract["zone_vocabulary"].items():
            check(zpayload[field] in vocab, f"zone vocabulary valid: {zone['zone_id']}/{field}")
        for field in plant_contract["zone_numeric_or_unknown"]:
            check(isinstance(zpayload[field], (int, float)) and not isinstance(zpayload[field], bool) and math.isfinite(zpayload[field]) and zpayload[field] >= 0, f"numeric zone input resolved: {zone['zone_id']}/{field}")
        ppayload = zone["evaluation_payload"]["project"]
        for field, vocab in plant_contract["project_vocabulary"].items():
            check(ppayload[field] in vocab, f"project vocabulary valid: {zone['zone_id']}/{field}")
        for field in plant_contract["project_booleans"]:
            check(type(ppayload[field]) is bool, f"project boolean valid: {zone['zone_id']}/{field}")

    admin_evidence = [ev for p in presets for ev in p["administrative_evidence"].values()]
    for ev in admin_evidence:
        check(ev["operational_value_origin"] in allowed_origins, "administrative origin allowed")
        check(ev["source_ledger_reference"] in source_ids, "administrative source reference exists")
        check(ev["spatial_scope"] == "nearby point", "preset metadata is scoped as nearby point")
    check(sum(ev["operational_value_origin"] == "official_spatial_dataset" for ev in admin_evidence) == 32, "32 official administrative metadata values")
    check(sum(ev["operational_value_origin"] == "documented_inference" for ev in admin_evidence) == 8, "8 documented approximate centre coordinates")
    check(all(ev["operational_value_origin"] == "synthetic_fallback" for _, _, ev in all_evidence), "all current matching/project values explicitly synthetic")

    check(contract["score_weight_total"] == 100, "score weights total 100")
    check(sum(v["weight"] for v in rules["components"].values()) == 100, "authoritative plant weights total 100")
    check(set(contract["score_components"]) == set(rules["components"]), "location contract uses identical component set")
    check(contract["zone_scoring_fields"]["available_width_m"]["unit"] == "m", "width unit explicit")
    check(contract["zone_scoring_fields"]["plantable_area_m2"]["unit"] == "m2", "area unit explicit")

    claims = [json.loads(line) for line in (HERE / "location-claims-v0_3.jsonl").read_text(encoding="utf-8").splitlines() if line]
    check(len(claims) == 370, "370 field-level claims recorded")
    check(len({c["claim_id"] for c in claims}) == len(claims), "claim IDs unique")
    check(sum(c["record_type"] != "preset_administrative_metadata" for c in claims) == 330, "330 complete matching/project claims")
    check(sum(c["value"]["operational_value_origin"] == "explicit_unknown" for c in claims) == 0, "no explicit unknown operational fixtures")

    matrix = read_csv(HERE / "location-field-use-matrix-v0_3.csv")
    retained = [r for r in matrix if r["v0_3_status"] == "retained"]
    check(all(r["consumer"] and r["consumer"] != "none" for r in retained), "every retained field has a consumer")
    check({r["location_field"] for r in retained} == required_zone_fields | required_project_fields, "field-use matrix covers every scorer input exactly")
    crosswalk = read_csv(HERE / "plant-location-crosswalk-v0_3.csv")
    check(all(r["corresponding_plant_field"] and r["comparison_method"] and r["score_weight_or_gate"] for r in crosswalk), "crosswalk rows identify plant side, method and consumer")

    check(all(r["licence_and_reuse_status"] for r in source_rows), "all sources have licence/reuse notes")
    check(all(r["access_date"] and r["exact_url_or_endpoint"] and r["exact_query_coordinate_polygon_or_feature"] and r["geographic_scope"] and r["temporal_scope"] and r["limitations"] for r in source_rows), "source ledger has required provenance and limitations")
    pdok = [r for r in source_rows if r["source_id"].startswith("PDOK-LOC-")]
    check(len(pdok) == 8 and all(len(r["response_sha256"]) == 64 for r in pdok), "eight query-specific PDOK response hashes recorded")

    # The exact authoritative files used at build time still match their recorded hashes.
    for key, item in contract["authoritative_dependencies"].items():
        check(sha256(ROOT / item["path"]) == item["sha256"], f"authoritative dependency unchanged: {key}")

    scorer = load_module("plantscapes_v03_scorer_validate", DATA / "score_demo_suitability_v0_3.py")
    plants = scorer.load_plants()
    check(len(plants) == 60, "plant matching-ready input has 60 records")
    generated = []
    for zone in canonical:
        generated.extend(evaluate_all(scorer, plants, zone["evaluation_payload"]["zone"], zone["evaluation_payload"]["project"]))
    generated_again = []
    for zone in canonical:
        generated_again.extend(evaluate_all(scorer, plants, zone["evaluation_payload"]["zone"], zone["evaluation_payload"]["project"]))
    check(len(generated) == 180, "all 60 plants evaluated in all three zones")
    check(result_signature(generated) == result_signature(generated_again), "same inputs produce identical results")
    saved = [json.loads(line) for line in (HERE / "evaluations/all-plant-zone-evaluations-v0_3.jsonl").read_text(encoding="utf-8").splitlines() if line]
    check(len(saved) == 180, "saved full evaluation JSONL has 180 records")
    check(Counter(r["zone_id"] for r in saved) == Counter({z["zone_id"]: 60 for z in canonical}), "no plant omitted from any canonical zone")
    for r in saved:
        check(isinstance(r["raw_suitability_score"], (int, float)) and isinstance(r["final_suitability_score"], (int, float)) and isinstance(r["evidence_confidence_score"], (int, float)), f"numeric scores/confidence: {r['zone_id']}/{r['fixture_id']}")
        check(set(r["component_scores"]) == set(rules["components"]), f"complete component trace: {r['zone_id']}/{r['fixture_id']}")
        check(len(r["hard_gate_results"]) == len(rules["hard_gates"]), f"complete hard-gate trace: {r['zone_id']}/{r['fixture_id']}")
        if any(g["triggered"] for g in r["hard_gate_results"]):
            check(r["final_suitability_score"] == 0 and not r["eligible_for_demo_ranking"], f"hard gate cannot be overridden by preference: {r['zone_id']}/{r['fixture_id']}")
    check(all(v == 0 for matrix_name in ["soil", "moisture", "hydrology", "light", "disturbance", "hardscape"] for plant_row in rules["compatibility_matrices"][matrix_name].values() for k, v in plant_row.items() if k == "unknown"), "unknown never yields confirmed compatibility")

    # Sensitivity: each input changes score or eligibility for at least one appropriate plant.
    base_zone = copy.deepcopy(canonical[0]["evaluation_payload"]["zone"])
    base_project = copy.deepcopy(canonical[0]["evaluation_payload"]["project"])
    sensitivity = {}

    def test_zone(name, changes_a, changes_b, project_changes=None):
        za, zb = copy.deepcopy(base_zone), copy.deepcopy(base_zone)
        pa, pb = copy.deepcopy(base_project), copy.deepcopy(base_project)
        za.update(changes_a); zb.update(changes_b)
        if project_changes:
            pa.update(project_changes[0]); pb.update(project_changes[1])
        sensitivity[name] = change_exists(scorer, plants, za, pa, zb, pb)

    test_zone("soil", {"soil": "sand"}, {"soil": "clay"})
    test_zone("moisture", {"moisture": "dry"}, {"moisture": "wet"})
    test_zone("hydrology", {"hydrology": "none"}, {"hydrology": "permanent"})
    test_zone("light", {"light": "sun"}, {"light": "shade"})
    test_zone("disturbance", {"disturbance": "low"}, {"disturbance": "high"})
    test_zone("hardscape", {"hardscape": "no"}, {"hardscape": "yes"})
    test_zone("water_edge", {"hydrology": "edge", "waterEdge": "no"}, {"hydrology": "edge", "waterEdge": "yes"})
    test_zone("available_area_or_width", {"available_width_m": 30, "available_length_m": 30, "plantable_area_m2": 900}, {"available_width_m": 0.1, "available_length_m": 0.1, "plantable_area_m2": 0.01})
    test_zone("maximum_height", {"path_edge": "yes", "max_plant_height_m": 100}, {"path_edge": "yes", "max_plant_height_m": 0.1}, ({"sightlines": True}, {"sightlines": True}))
    test_zone("climbing_support", {}, {}, ({"support": True}, {"support": False}))
    test_zone("maintenance", {}, {}, ({"maintenance": "high", "vigourControl": "no"}, {"maintenance": "low", "vigourControl": "no"}))
    test_zone("public_access", {}, {}, ({"publicAccess": False}, {"publicAccess": True}))
    test_zone("rewilding_policy", {}, {}, ({"publicAccess": False, "rewilding": False}, {"publicAccess": False, "rewilding": True}))
    for name, witness in sensitivity.items():
        check(witness is not None, f"sensitivity proven: {name}" + (f" via {witness[0]}" if witness else ""))

    report = {
        "version": "0.3.0",
        "validated_at": "2026-10-13",
        "status": "passed" if not ERRORS else "failed",
        "checks_passed": len(PASSES),
        "errors": ERRORS,
        "headline": {"presets": len(presets), "zones_total": len(all_zones), "canonical_zones": len(canonical), "plants": len(plants), "evaluations": len(saved), "matching_fields_per_zone": len(required_zone_fields) + len(required_project_fields)},
        "sensitivity_witnesses": {k: {"fixture_id": v[0], "before": v[1], "after": v[2]} if v else None for k, v in sensitivity.items()},
    }
    (HERE / "location-validation-v0_3.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    handover_path = DATA / "LOCATION-DATA-PILOT-HANDOVER-v0.3.md"
    handover = handover_path.read_text(encoding="utf-8")
    start = "<!-- VALIDATION_RESULT_START -->"
    end = "<!-- VALIDATION_RESULT_END -->"
    result_text = (f"Latest validation result: **{'PASS' if not ERRORS else 'FAIL'}** — {len(PASSES)} checks passed"
                   + ("; no errors." if not ERRORS else f"; {len(ERRORS)} errors. See `dataset/location/location-validation-v0_3.json`."))
    before, remainder = handover.split(start, 1)
    _, after = remainder.split(end, 1)
    handover_path.write_text(before + start + "\n" + result_text + "\n" + end + after, encoding="utf-8")
    if ERRORS:
        print(f"FAILED: {len(ERRORS)} error(s), {len(PASSES)} checks passed")
        for error in ERRORS:
            print("-", error)
        raise SystemExit(1)
    print(f"PASS: {len(PASSES)} checks; 8 presets; 11 zones; 60 plants × 3 canonical zones = 180 evaluations")
    for name, witness in sensitivity.items():
        print(f"  sensitivity {name}: {witness[0]}")


if __name__ == "__main__":
    validate()
