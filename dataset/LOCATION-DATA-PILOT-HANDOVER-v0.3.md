# Location-data pilot handover v0.3

## Outcome and limits

This layer contains **8 low-confidence presets**, each with one default demonstration zone, plus **3 canonical test zones**. It is complete enough to produce numeric pilot outputs for all 60 plants in every canonical zone, but it is **not production-ready** and contains **no surveyed site**. Repository inspection found no site survey, polygon/location pack, soil report or coordinate set for a real project.

The city labels are navigation/start-profile labels only. They are never claims that an entire city has one soil, moisture, hydrology, light or disturbance condition. The PDOK responses verify nearby administrative context for the approximate preset centres; they do not verify environmental conditions.

## Contract and field counts

- Exact plant scorer contract: `dataset/scoring/plant-location-contract-v0_3.json` (15 zone inputs including `source`, plus 15 project inputs).
- Matching/project field evidence records: 330 (11 zones × 30 fields).
- Administrative preset metadata records: 40.
- Site-specific evidenced matching values: 0.
- Official regional-proxy matching values: 0.
- User-confirmed matching values: 0.
- Synthetic matching/project values: 330.
- Official spatial administrative values: 32 (place/municipality/province/nearest-address context only).
- Documented-inference administrative values: 8 (existing approximate centre coordinates).
- Explicit unknown operational values: 0.

Every required score input is populated. Complete operational values and low evidence confidence deliberately coexist.

## Cross-evaluation

| Zone | Plants | Strong | Suitable | Conditional | Unsuitable | Excluded | Zone evidence confidence / 100 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `dry_sunny_sand` | 60 | 0 | 0 | 43 | 8 | 9 | 30.0 |
| `fresh_clay_mixed` | 60 | 0 | 0 | 47 | 5 | 8 | 30.0 |
| `wet_water_edge` | 60 | 0 | 0 | 4 | 2 | 54 | 30.0 |

The JSONL evaluation contains the full component trace, all gates, warnings, inclusion/exclusion reasons and plant evidence trace for all 180 plant–zone pairs. The compact CSV exposes the same required headline scores and JSON traces. No plant is omitted.

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
Latest validation result: **PASS** — 4458 checks passed; no errors.
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
