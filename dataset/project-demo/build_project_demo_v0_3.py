"""Build the project-demo view: 60 operationally complete plants plus 10 controlled uncertainty examples.

Run: python dataset/project-demo/build_project_demo_v0_3.py

Reads the v0.3 matching-ready CSV and the fill rules; never writes to the v0.2 archive or the v0.3 CSV.
Writes only:
  website/data/project-demo-v0.3.generated.js
  dataset/project-demo/plantscapes_project_demo_view_v0_3.csv
  dataset/project-demo/archive-hashes-v0_3.json
"""
import csv
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / 'dataset/research/demo-v0_3'))
from pilot_model import load_plants, write_csv, write_json  # noqa: E402

HERE = ROOT / 'dataset/project-demo'
RULES = json.loads((HERE / 'project-demo-fill-rules-v0_3.json').read_text(encoding='utf-8'))
# Every field the five-stage recommender consumes. All must be usable for the 60 normal plants.
DECISION_FIELDS = [
    'soil_tolerance', 'moisture_tolerance', 'hydrology_tolerance', 'light_tolerance', 'disturbance_tolerance',
    'hardscape_tolerance', 'water_edge_requirement', 'mature_height_m', 'mature_spread_m', 'pilot_spacing_m',
    'functional_layer', 'composition_role', 'maintenance_demand', 'vigour_or_spread_risk', 'climbing_support_required',
    'native_status_nl', 'invasive_status', 'protected_or_legal_status', 'public_contact_status', 'toxicity_status',
    'thorns_or_spines', 'provenance_status', 'regional_occurrence_nl', 'edible_use_status',
    'flower_start_month', 'flower_end_month', 'flower_colour', 'pollinator_value',
]
UNKNOWN = set(RULES['fill_when_value_in'])
# Research archives this view must never change. Hashed with LF line endings so CRLF checkouts compare equal.
ARCHIVES = sorted(
    [p for p in (ROOT / 'dataset/research/demo-v0_2').rglob('*') if p.is_file()]
    + list((ROOT / 'dataset/claims').glob('*v0_2*'))
    + list((ROOT / 'dataset/derived').glob('plantscapes_demo_*_v0_2.*'))
    + [ROOT / 'dataset/source-ledger-demo-v0_2.csv', ROOT / 'dataset/dataset_manifest_demo_v0_2.json',
       ROOT / 'dataset/derived/plantscapes_demo_matching_ready_v0_3.csv'])


def digest(path):
    return hashlib.sha256(path.read_bytes().replace(b'\r\n', b'\n')).hexdigest()


def matches(when, plant):
    for key, allowed in when.items():
        if key == 'any':
            if not any(matches(option, plant) for option in allowed):
                return False
        elif key == 'track':
            if plant['fixture_id'].split('-')[1] != allowed:
                return False
        elif plant[key] not in allowed:
            return False
    return True


def complete(plant):
    values, origins, rules = {}, {}, {}
    current = {**plant, 'regional_occurrence_nl': 'unknown'}
    for field in RULES['field_order']:
        if current[field] not in UNKNOWN:
            continue
        rule = next(r for r in RULES['rules'] if r['field'] == field and matches(r['when'], current))
        current[field] = values[field] = rule['set']
        origins[field], rules[field] = rule['origin'], rule['rule_id']
    return current, {'fixture_id': plant['fixture_id'], 'values': values, 'origins': origins, 'rules': rules}


plants = load_plants(ROOT / RULES['base_dataset'])
assert len(plants) == 60 and all(p['production_eligible'] is False for p in plants)
views, completed = [], {}
for plant in plants:
    record, view = complete(plant)
    missing = [f for f in DECISION_FIELDS
               if record[f] in ('', None, []) or not isinstance(record[f], list) and record[f] in UNKNOWN]
    assert not missing, (plant['fixture_id'], missing)
    views.append(view)
    completed[plant['fixture_id']] = record

examples = []
for spec in RULES['uncertainty_examples']:
    base = completed[spec['base_fixture_id']]
    assert all(f in DECISION_FIELDS for f in spec['unknown_fields'])
    examples.append({**spec, 'base_scientific_name': base['scientific_name'], 'base_dutch_name': base['dutch_name']})
assert len(examples) == 10 and len({e['example_id'] for e in examples}) == 10

# Sources behind each decision field, for the card's "?" panels: claim -> (source, locator), source -> citation.
claims = {}
for line in (ROOT / 'dataset/claims/plantscapes_demo_plant_claims_v0_2.jsonl').read_text(encoding='utf-8').splitlines():
    if line.strip():
        claim = json.loads(line)
        claims[claim['claim_id']] = claim['evidence']
with (ROOT / 'dataset/source-ledger-demo-v0_2.csv').open(encoding='utf-8-sig', newline='') as handle:
    ledger = {row['source_id']: row for row in csv.DictReader(handle)}
claim_sources, sources = {}, {}
for plant in plants:
    for field, resolution in plant['field_resolutions_json'].items():
        if field not in DECISION_FIELDS:
            continue
        for claim_id in resolution['claim_ids']:
            evidence = claims[claim_id]
            source = ledger[evidence['source_id']]
            claim_sources[claim_id] = [evidence['source_id'], evidence.get('locator') or source['url_or_identifier']]
            sources[evidence['source_id']] = {'title': source['title'], 'publisher': source['creator_or_publisher'],
                                              'url': source['url_or_identifier'], 'accessed': source['access_date'],
                                              'type': source['source_type']}

payload = {
    'version': RULES['version'],
    'base_version': '0.3.0',
    'purpose': RULES['purpose'],
    'production_eligible': False,
    'decision_fields': DECISION_FIELDS,
    'origin_vocabulary': RULES['origin_vocabulary'],
    'demo_value_vocabulary': RULES['demo_value_vocabulary'],
    'rules': {r['rule_id']: {'field': r['field'], 'set': r['set'], 'origin': r['origin'], 'note': r['note']} for r in RULES['rules']},
    'plants': views,
    'uncertainty_examples': examples,
    'claim_sources': claim_sources,
    'sources': sources,
}
out = ROOT / 'website/data/project-demo-v0.3.generated.js'
out.write_text('/* Generated by python dataset/project-demo/build_project_demo_v0_3.py. Do not edit. */\n'
               '(function(root){root.PLANTSCAPES_PROJECT_DEMO='
               + json.dumps(payload, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
               + ';})(typeof window!=="undefined"?window:globalThis);\n', encoding='utf-8')

rows = []
for plant in plants:
    record, view = completed[plant['fixture_id']], next(v for v in views if v['fixture_id'] == plant['fixture_id'])
    row = {'fixture_id': plant['fixture_id'], 'scientific_name': plant['scientific_name'], 'dutch_name': plant['dutch_name']}
    for field in DECISION_FIELDS:
        row[field] = record[field]
        row[field + '__origin'] = view['origins'].get(field, plant['field_origins_json'].get(field, 'new_field'))
        row[field + '__rule'] = view['rules'].get(field, '')
    rows.append(row)
write_csv(HERE / 'plantscapes_project_demo_view_v0_3.csv', rows)
write_json(HERE / 'archive-hashes-v0_3.json', {
    'note': 'SHA-256 (LF-normalised) of research archives read but never written by the project-demo build.',
    'files': {p.relative_to(ROOT).as_posix(): digest(p) for p in ARCHIVES},
})
filled = sum(len(v['values']) for v in views)
print(f'Built {out.relative_to(ROOT)}: 60 complete plants ({filled} demo-filled values), {len(examples)} uncertainty examples, {len(ARCHIVES)} archive hashes')
