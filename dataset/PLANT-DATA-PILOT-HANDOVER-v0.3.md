# Plantscapes plant-data pilot handover v0.3

Created 2026-10-13. DATA ONLY. All 60 fixture records are operationally complete and fully scoreable; none is production eligible or independently verified. This version projects the preserved v0.2 evidence archive into a small simulation contract. It does not add new botanical research or integrate with the website.

## Scope and counts

There are 54 core and 6 ornamental fixtures, with unchanged fixture/taxon keys. The CSV has **33 profile fields plus 7 trace columns (40 columns)**. Of the 33 fields, 20 are non-safety operational fields, 4 identify/display the taxon, 8 are policy/safety fields (including the deliberately retained thorn evidence), and one is the fixed production-eligibility policy.

All **1,200 non-safety operational values are populated**: 429 sourced (35.75%), 108 documented expert-style inferences (9.00%), 663 synthetic (55.25%). “Expert inference” names a derivation class; it does not mean a human specialist supplied or reviewed it. Across all 1,980 profile slots: 738 sourced, 108 inferred, 663 synthetic, 277 explicit unknown, 133 not reviewed, 1 conflicting, and 60 fixed policy values. There are **405 unresolved/unknown/unreviewed policy or safety values out of 480**. Dutch-name unknowns are counted separately from safety. Populated does not mean supported or cleared.

For the 180 example evaluations, confidence ranges 11.0775–22.1625, median 18.785, mean 18.4877. All 180 are below 25. The demonstration source factor is 0.5 and outstanding policy reviews further reduce confidence; these scores do not certify Dutch environmental suitability. Confirmed survey data would change confidence, not biological compatibility. Every record remains `production_eligible=false`.

## Decision-pipeline audit

The audit read app.js, planting-engine.js, demo-data.js, planting-plan-rules.v0.1.json, and the complete v0.2 profiles, claims, gaps, field dictionary, ledger and report. The archived fixture names match the current source file exactly. The approved rulebook is v0.1.1 despite its filename.

Current shortlist: `demoCandidates()` starts at 3 and adds/subtracts invented soil, moisture, light, water-edge, whole-project size, sightline, hardscape and restoration-group bonuses. It invents soils from fixture moisture, gives unknown/variable moisture positive points, assigns native status by fixture index, filters boolean zone fits, then uses a >=4 cutoff. These are the formulas to replace with the v0.3 evaluator later. Native-first ordering also needs explicit policy evidence rather than core/ornamental fixture track.

Current gates: engine.eligibility checks taxon/policy/spread/invasion/native policy/public safety/support, but demonstration flags bypass several review checks and defaults create not_invasive_fixture/native_fixture. engine.zoneFit handles confirmed location fields, broad soil/moisture/light, permanent water, aquatic edge and vigorous low-maintenance use. Made ground bypasses soil compatibility. Its `project.support` is not supplied by app.project(), so current climber filtering lacks a usable support input. v0.3 replaces these assumptions with explicit states and documented gates without editing either file.

Current placement: group branches, height, spread, spacing, vigorous/thorny flags and light affect crown fit, path/void checks, water polygons, shoreline distance, edge/transition height, future shade and neighbour distances. Spread is generated from height; herb spacing is spread×0.83; vigour and thorns come from caution regexes. These should receive explicit operational inputs and evidence-aware adapters. The general placement loop skips climbers even if support is approved; mapped support placement needs a later implementation.

Current composition: tree/open-character rule, grass/shrub/flower mix weights, patch sampling and anchor colour affect layout. App height >=1.1 and engine height >=1.3 use inconsistent structural-role heuristics. Group weights are sampling preferences, not target counts. Composition roles and colours belong outside ecological suitability.

Current outputs: names, group, dimensions, months, colour, role, native status, caution and rule traces appear in cards, seasonal views and exports. Generic seedheads/seasonal graphics are unsupported design assumptions; do not promote them to researched traits. Unused pH, nutrient gradients, salinity thresholds, detailed roots, occurrence, Red List details and other research traits stay in v0.2. Safety/allergen/sap context is exposed only as review warnings, not used as biological points or blanket clearance.

[Field-use matrix](derived/plantscapes_demo_field-use-matrix_v0_3.csv) lists every retained field and every excluded v0.2 trait, its consuming rule, corresponding site/project input and synthetic permission. No retained field is a speculative future database field.

## Record contract and provenance

Flat CSV fields are **operational values**, the only inputs the evaluator uses. Arrays are pipe-separated; lengths are metres, areas square metres, flowering endpoints integer months 1–12. The typed profile schema validates the decoded CSV record. JSON trace columns are compact JSON objects. Each field in `field_resolutions_json` has `real_value`, `real_value_origin`, `operational_value`, `operational_value_origin`, `operational_value_confidence`, `evidence_class`, exact archived claim IDs/source locators and a derivation/source note. A real research value may be null; its operational counterpart never is for non-safety fields. Safety unknowns are controlled strings, never blank or fabricated clearance.

Renamings: `scientific_name`/`dutch_name` project accepted_scientific_name/vernacular_nl. `soil_tolerance`, `moisture_tolerance` and `light_tolerance` align directly to site categories. `mature_height_m` and `mature_spread_m` are upper-endpoint/proxy planning scalars with the original source ranges/context retained separately. `composition_role` replaces community_roles. `protected_or_legal_status` is an explicit incomplete joint policy screen, not legal certification. `provenance_status`, `public_contact_status`, `edible_use_status` are use-specific review states, not trait absence statements. Added `thorns_or_spines` is consumed by path-edge placement and contact explanations; added `field_resolutions_json` is necessary to keep real and operational values separate.

There are no new accepted taxon matches. National IDs and all external IDs retain v0.2 reconciliation. Nepeta × faassenii remains a hybrid, not reduced to a parent species. Missing Dutch names stay unknown; the adapter may show the scientific name as a display fallback. Ornamental track does not prove non-native status. Regional occurrence is outside this pilot and is never used as suitability, establishment or absence evidence.

The shared contract contains the existing eight site categories plus source context and explicitly needed clear geometry/support/visibility fields. New geometry is an adapter requirement, not invented location data. Made ground remains uncertain (ratio 0.25) until actual substrate is confirmed and the site soil category is updated. Archive `moist` maps to `fresh`; `loam`→clay and sandy_loam→sand are coarse documented expert transfers to the existing site labels. Other soil classes are not wildcards. Canopy supplies light context and warnings; it never scores a second time. Hydro `edge` has an unspecified regime and maximum compatibility 0.5.

## Resolution and pilot assumptions

The builder first reads the selected archived value, then checks retained alternative dimension claims, then uses a documented inference or a synthetic simulation rule. It does not re-run or mutate v0.2 research. Archive gaps supply the search record. The [operational derivation ledger](research/demo-v0_3/operational-derivations.jsonl) has one row per inferred/synthetic field, including real value, bounds, deterministic rule, uncertainty, risk and future review. The same information appears per plant in synthetic_derivations_json, which despite its short name includes **both** inferred and synthetic values; the origin remains distinct.

Group classification reuses literal sourced architecture when available, selects one documented multi-architecture design role by inference, or retains the synthetic fixture group when source life-form labels do not establish architecture. Support is inferred only from documented climbing architecture; negative support requirements in other design groups are explicit synthetic assumptions.

**SPACE-01**, the single spacing method: trees/shrubs use operational mature spread; climbers use max(1m,spread); herbs, graminoids and aquatic groups use max(0.30m,0.90×spread), rounded **up** to 0.05m. All 60 spacing values are synthetic pilot assumptions, including those bounded by sourced spread. Missing spread uses SPREAD-02's explicit group/height envelope; this is a simulation footprint, not a biological mature-size claim. Source target year, cultivar, growth conditions and open bounds remain visible in v0.2.

Hydrology uses the two recorded inundation descriptions where relevant; otherwise HYDRO-02 assigns a broad demonstration regime from the pilot group/moisture. Aquatic fixture groups can receive synthetic permanent-water tolerance to exercise demonstration gates, **without asserting real depth or duration suitability**. In particular wet terrestrial plants never automatically receive permanent-water tolerance. Before actual aquatic planting, replace these synthetic regimes with species-specific Dutch depth/hydroperiod evidence and mapped water bands.

Disturbance transfers documented moderate trampling only by inference; other disturbance/hardscape values are conservative simulation categories. Foreign weediness becomes a high-vigour management proxy, not Dutch invasive status. Missing maintenance uses a group-sensitive pilot demand. Missing exact flowering endpoints or colours use labelled fixture values. Multiple colours become one explicit design swatch. `pilot_potential` pollinator output is synthetic and cannot be described as a researched ecological benefit.

## Suitability and confidence specification

Suitability belongs to the **plant–zone–project pair**, never a universal plant score. [Rules and full matrices](scoring/plant-suitability-rules-v0_3.json) are authoritative numeric configuration. Soil 15, moisture 20, hydrology 15, light 15, disturbance/hardscape 10, spatial 15, maintenance/vigour 10 total 100. Matching arrays choose the best explicitly represented category. Ratios are 1 compatible, 0.5 conditional/adjacent, 0 conflict; made soil is the declared 0.25 exception. The detailed matrix defines every combination, including unknowns.

Disturbance and hardscape share their component equally. Spatial fit is 80% clear footprint and 20% project visibility constraint. Height checking is inactive when no visibility requirement applies; missing required context gets zero. A square footprint is a conservative screen: woody spread, others spacing. Climbers also need mapped support length >= pilot spacing to pass the spatial screen; unknown support length is unresolved geometry. Maintenance demand and vigour share their component equally. High vigour with low capacity requires explicit control to avoid exclusion; with control it remains conditional and capped at 64.

Unknown site category or needed geometry/capacity scores zero, produces a site/project gap warning, reduces confidence and caps the final result at 64; it is not described as a proven environmental conflict. Known zero compatibility in soil/moisture/hydrology/light/disturbance/hardscape caps final at 49. Known geometry/visibility impossibility caps at 49 and woody geometry failure excludes at placement time. Thus a small component or design preference cannot hide a known environmental conflict.

Final thresholds: 80–100 strong_match, 65–<80 suitable, 50–<65 conditional_match, <50 unsuitable; hard exclusion overrides to excluded/final=0. Decimal thresholds avoid gaps between integer labels. Final caps only reduce raw suitability: outstanding applicable policy/safety review 64, unreviewed public-contact use 59, unreviewed native status in native-only mode 54. These conservative pilot policy caps are **not calibrated biological thresholds or certifications**. All current records have policy gaps, so none reaches suitable/strong_match in the saved public-access examples.

Hard gates H01–H11 cover identity, known invasive/legal prohibition, required water edge, permanent water, climbing support, known public-contact-unsuitable use, woody placement geometry, uncontrolled high vigour under low maintenance, known introduced native-only policy, restoration ornamental exception and documented path-edge thorns. Gates return passed/requires_review/excluded, with exact reasons. A passed known-exclusion check means its trigger was not found; it never asserts general safety. Unknown identity, missing mandatory edge or support excludes; unknown policy generally allows conditional simulation only. Protected status without permission requires review. Public harvesting is always blocked for these production-ineligible records, with a specific warning; provisional edible-part evidence does not approve a food use.

Raw scores are still calculated for all excluded plants. Eligible ranking excludes unsuitable and excluded records. Ranking orders final score, raw diagnostic score, then separate design-preference score, then evidence confidence and stable fixture ID. Colour/month/pollinator/role preferences cannot increase ecological suitability, erase conflict or override gates. Raw tie-breaking is necessary because conditional policy caps can tie otherwise different biological scores.

Origin confidence scale: reviewed source 100 (unused), official unreviewed 85, institutional secondary 70, documented inference 55, synthetic 30, conflicting/unknown/not_reviewed 0. Primary institutional evidence is not independently reviewed merely because it was found. Weighted component confidence uses the same scored operational fields and weights, multiplied by corresponding site-certainty factors, the documented site-source factor, and max(0.5,1−0.05×unresolved applicable policy count). Compound components average their named field confidences; footprint/height context is weighted 80/20. This final policy penalty records unresolved gates without adding/subtracting biological suitability. It is a transparent simulation confidence index, not a statistical probability.

## Placement and approximate quantity

Every result returns height, spread, spacing, clear footprint, fit/visibility states, layer, role, support, vigour, thorns and origins. Single-species stock capacity is min(floor(width/spacing)×floor(length/spacing),floor(zone_area/spacing²),floor(project_area/spacing²) when known). Climber stock requires mapped support length and uses floor(length/spacing). Unresolved geometry/support returns numeric capacity zero **with an unresolved state**, not a claim that no plants can ever fit. Excluded/unsuitable candidates have placement stock zero and preserve diagnostic pre-eligibility capacity. Open-character trees are omitted by a design rule; no environmental score changes.

These are separate per-species capacities, **not** a plan containing all 60 capacities or a seed-rate estimate. Actual polygon containment, paths, water depth/shoreline, existing assets, neighbouring plants, root space, future shade and seed-versus-plug establishment remain separate placement/management checks. The square bounding screen can conservatively exclude feasible irregular spaces and cannot guarantee crown fit in a concave polygon. Quantity does not imply nursery availability, provenance clearance or approved establishment method.

## Completeness by field

Unknown/unreviewed column also includes conflicting safety values; production_eligible is a fixed policy field rather than sourced evidence. Full tables by field and plant are under research/demo-v0_3.

| Field | Sourced | Inferred | Synthetic | Unknown/unreviewed/conflicting | Populated |
|---|---:|---:|---:|---:|---|
| fixture_id | 60 | 0 | 0 | 0 | 60/60 |
| plant_id | 60 | 0 | 0 | 0 | 60/60 |
| scientific_name | 60 | 0 | 0 | 0 | 60/60 |
| dutch_name | 54 | 0 | 0 | 6 | 60/60 |
| group | 26 | 11 | 23 | 0 | 60/60 |
| soil_tolerance | 3 | 47 | 10 | 0 | 60/60 |
| moisture_tolerance | 56 | 0 | 4 | 0 | 60/60 |
| hydrology_tolerance | 0 | 2 | 58 | 0 | 60/60 |
| light_tolerance | 58 | 0 | 2 | 0 | 60/60 |
| disturbance_tolerance | 0 | 1 | 59 | 0 | 60/60 |
| hardscape_tolerance | 0 | 0 | 60 | 0 | 60/60 |
| water_edge_requirement | 0 | 0 | 60 | 0 | 60/60 |
| mature_height_m | 59 | 1 | 0 | 0 | 60/60 |
| mature_spread_m | 37 | 1 | 22 | 0 | 60/60 |
| pilot_spacing_m | 0 | 0 | 60 | 0 | 60/60 |
| functional_layer | 0 | 0 | 60 | 0 | 60/60 |
| composition_role | 0 | 0 | 60 | 0 | 60/60 |
| climbing_support_required | 0 | 4 | 56 | 0 | 60/60 |
| vigour_or_spread_risk | 2 | 20 | 38 | 0 | 60/60 |
| maintenance_demand | 37 | 2 | 21 | 0 | 60/60 |
| native_status_nl | 53 | 0 | 0 | 7 | 60/60 |
| invasive_status | 0 | 0 | 0 | 60 | 60/60 |
| protected_or_legal_status | 0 | 0 | 0 | 60 | 60/60 |
| provenance_status | 0 | 0 | 0 | 60 | 60/60 |
| public_contact_status | 0 | 0 | 0 | 60 | 60/60 |
| toxicity_status | 19 | 0 | 0 | 41 | 60/60 |
| edible_use_status | 0 | 0 | 0 | 60 | 60/60 |
| thorns_or_spines | 3 | 0 | 0 | 57 | 60/60 |
| production_eligible | 0 | 0 | 0 | 0 | 60/60 |
| flower_start_month | 58 | 0 | 2 | 0 | 60/60 |
| flower_end_month | 48 | 0 | 12 | 0 | 60/60 |
| flower_colour | 23 | 19 | 18 | 0 | 60/60 |
| pollinator_value | 22 | 0 | 38 | 0 | 60/60 |

| Safety/policy field | Unresolved records | Operational statuses |
|---|---:|---|
| native_status_nl | 7 | native_original, unknown |
| invasive_status | 60 | unknown |
| protected_or_legal_status | 60 | not_reviewed |
| provenance_status | 60 | unknown |
| public_contact_status | 60 | not_reviewed |
| toxicity_status | 41 | strongly_toxic_reported, toxic_reported, unknown, weakly_toxic_reported |
| edible_use_status | 60 | conflicting, not_reviewed, unknown |
| thorns_or_spines | 57 | prickles_present, thorns_present, unknown |

All 60 remain blocked for real use by legal/invasive/provenance/public-contact review. Source-positive toxicity is a hazard, not a clearance. The one conflicting edible-use record remains conflicting. No record has received independent specialist verification.

## Difficult-record inspection

Manual inspection checked the full operational resolutions and archived claim scopes for tree Quercus robur, thorny shrub Crataegus monogyna, herb/spreading Mentha aquatica, graminoid/vigorous Carex pendula, toxic climber Hedera helix, marginal Iris pseudacorus, hybrid Nepeta × faassenii, limited Dutch evidence Lotus corniculatus and ornamental Hakonechloa macra.

Quercus robur is the deep conflict case: real height remains null/conflicting. Retained flora/forestry/UK/US claims remain separate in v0.2; the pilot chooses the maximum retained endpoint, 40m, as expert inference. Open-ended >8m spread is not turned into an invented biological maximum. The retained US closed spread endpoint 21.336m becomes a context-transfer planning proxy, inference confidence 55; spacing uses the explicitly synthetic SPACE-01 method. The resulting large footprint excludes it at placement in the 20m/15m example spaces while leaving raw diagnostics available. It is not silently flattened to the old height×0.42 formula.

Crataegus retains sourced thorns and a reported toxicity status, with unresolved public-contact/food assessment. Path-edge placement triggers a specific thorn exclusion; unknown thorns on other plants never become absent. Hedera retains strongly_toxic_reported and archived allergen context, needs climbing support, has a very large sourced spread proxy and receives no public-safe or edible assertion. Iris retains weakly_toxic_reported; permanent-water placement in the demonstration depends on explicitly synthetic hydrology, not an approved depth band. Carex's sourced vigorous report remains distinct from unknown Dutch invasive status. Mentha has synthetic missing spread and broad terrestrial wet regime, so the permanent-water gate excludes it rather than inferring aquatic suitability from its name. Nepeta retains the hybrid identity and unknown Dutch native status; rewilding cannot borrow core-track native defaults. Lotus/Hakonechloa use horticultural evidence with unresolved Dutch status; unknowns remain visible.

## Full example evaluations

All three invented zones use demonstration source confidence 0.5, public access, moderate maintenance, explicitly available climbing support and placement-stage geometry. Dry sunny sand is 20×15m/300m²; fresh clay mixed light 20×20m/400m²; wet edge is 12×8m/96m² with permanent shallow-water demonstration regime. No real location data was edited.

| Zone | Eligible conditional candidates | Excluded | Unsuitable | First simulated candidate | Raw / final / confidence |
|---|---:|---:|---:|---|---|
| dry_sunny_sand | 43 | 9 | 8 | Panicum virgatum | 100.0 / 59 / 19.3025 |
| fresh_clay_mixed | 47 | 8 | 5 | Panicum virgatum | 100.0 / 59 / 19.3025 |
| wet_water_edge | 4 | 54 | 2 | Butomus umbellatus | 97.5 / 59 / 17.8675 |

The first simulated candidate is an illustration of the declared ranking, not a planting recommendation. The high raw scores can coexist with very low confidence and conditional final scores. Full 60-row coverage per zone is in [all-plant-zone-scores.csv](research/demo-v0_3/example-results/all-plant-zone-scores.csv) and [all-plant-zone-evaluations.jsonl](research/demo-v0_3/example-results/all-plant-zone-evaluations.jsonl). The JSONL includes all component scores/origins, gates, reasons, warnings, placement, quantity and evidence traces. [Zone rankings and explanations](research/demo-v0_3/example-results/zone-rankings-and-explanations.json) contains every eligible rank, every exclusion with reason, all unsuitable records and top-five candidate explanations/synthetic components. It does not conceal the other 55 plants.

## Validation and sensitivity

Stdlib-only commands, from repository root:

```powershell
python dataset/research/demo-v0_3/build_matching_v0_3.py
python dataset/research/demo-v0_3/build_contract_v0_3.py
python dataset/score_demo_suitability_v0_3.py
python dataset/validate_demo_matching_v0_3.py
python dataset/research/demo-v0_3/write_handover_v0_3.py
```

The evaluator API is `evaluate(typed_plant, zone, project)`. `load_plants()` decodes CSV pipes, booleans, numbers and JSON; do not pass raw CSV strings directly to evaluate. Missing site/project fields normalize to explicit unknown/false defaults. Unknown numeric geometry is the string `unknown`, never zero or null. Zero dimensions mean genuinely unavailable space. Invalid categories/types/nonfinite/negative dimensions fail clearly. `--inputs` and `--output-dir` support independent batches without touching the website.

Validation **PASS**: exactly 60 unique records and 54/6 tracks, all schema/type/enums/units/required origins, same taxon IDs, claim-to-ledger traceability, complete derivations, prohibited synthetic/inferred safety fields, weights=100, all 180 numeric deterministic outputs, actual evaluator field consumption, saved results equal freshly evaluated results, unknown site/made ground rules, canopy non-duplication, evidence-versus-suitability separation, diagnostic raw scores, hard-gate precedence, harvest blocking, placement-stage geometry, visibility, and all twelve sensitivity inputs. 66 preserved file hashes match, including all existing v0.2 files and website/location data. National catalogue still has 2,443 rows and SHA-256 `167256ade50af4cf4ce5af9a186ac1867212e237f26311631f7eaaf17e5de739`.

| Changed input | Actual plants with changed score or state | Example | Before → after (raw / final / state) |
|---|---:|---|---|
| soil | 41 | Achillea millefolium | 97.5 / 64 / conditional_match → 82.5 / 49 / unsuitable |
| moisture | 43 | Achillea millefolium | 97.5 / 64 / conditional_match → 87.5 / 64 / conditional_match |
| hydrology | 60 | Achillea millefolium | 97.5 / 64 / conditional_match → 82.5 / 0 / excluded |
| light | 55 | Achillea millefolium | 97.5 / 64 / conditional_match → 90.0 / 64 / conditional_match |
| disturbance | 60 | Achillea millefolium | 97.5 / 64 / conditional_match → 95.0 / 64 / conditional_match |
| hardscape | 60 | Achillea millefolium | 97.5 / 64 / conditional_match → 95.0 / 64 / conditional_match |
| water_edge | 6 | Lythrum salicaria | 95.0 / 64 / conditional_match → 95.0 / 0 / excluded |
| maintenance_capacity | 60 | Achillea millefolium | 92.5 / 0 / excluded → 100.0 / 64 / conditional_match |
| available_spatial_dimensions | 24 | Achillea millefolium | 85.5 / 49 / unsuitable → 97.5 / 64 / conditional_match |
| climbing_support | 4 | Lonicera periclymenum | 100.0 / 0 / excluded → 100.0 / 64 / conditional_match |
| public_access | 48 | Achillea millefolium | 97.5 / 64 / conditional_match → 97.5 / 59 / conditional_match |
| rewilding_policy | 7 | Lotus corniculatus | 90.0 / 64 / conditional_match → 90.0 / 54 / conditional_match |

The sensitivity ledger records exact before/after inputs. Rewilding changes the seven unresolved-native records through the stricter review cap; no plant is fabricated as non-native to manufacture this test. Separate adversarial policy fixtures test known introduced/listed/prohibited/public-unsuitable/unknown identity exclusions. Design preferences are set favourable in those tests and still cannot override exclusion. [Validation/completeness JSON](research/demo-v0_3/validation-and-completeness.json) is the reproducible machine handover.

## Exact future application adapter

This table documents future integration only. No application files were edited. A machine-readable copy is [application-adapter-mapping.csv](research/demo-v0_3/application-adapter-mapping.csv).

| v0.3 field/result | Existing expectation | Required adapter/rule |
|---|---|---|
| fixture_id | id | Stable fixture ID replaces positional demo-i; update palettes, species toggles and saved plans through a deliberate adapter. |
| plant_id | plant_id (new export/lookup property) | Preserve national or external taxon key; never regenerate from a display name. |
| scientific_name | scientific_name | Direct; preserve × and accepted hybrid scope. |
| dutch_name | vernacular_nl | Unknown stays unknown in data; display scientific name as a labelled display fallback. |
| group | group | Direct existing six group labels; grouping origins remain visible. |
| soil_tolerance | soils | Array adapter. Replace old made-ground bypass with evaluator; never invent soils from moisture. |
| moisture_tolerance | moisture | Legacy field is scalar. Do not collapse multi-value tolerances for matching; route all matching through evaluator. Display pipe set; moist archive value normalizes to fresh. |
| hydrology_tolerance | no current plant property; zone.hydrology | New matching adapter; no wet-moisture shorthand for permanent water. |
| light_tolerance | light | Legacy scalar becomes display set. Evaluator uses direct sun/mixed/shade vocab; future tree shade remains a separate placement scenario. |
| disturbance_tolerance | no current plant property; zone.disturbance | New weighted comparator; current shortlist mostly ignores this location input. |
| hardscape_tolerance | no current plant property; zone.hardscape | Explicit comparator replaces blanket tree -2 score; preserve independent path/root clearance checks. |
| water_edge_requirement | group / engine.zoneFit water rule | Explicit required/preferred/not_required gate. Actual mapped water polygon, shoreline distance and depth approval remain placement responsibilities. |
| mature_height_m | height | Upper-endpoint/proxy scalar with original range/context in field_resolutions_json and v0.2; visibility/future-shade consumers must preserve origin. |
| mature_spread_m | spread | Direct operational proxy; remove engine.enrich height-to-spread fallback. Crown containment still needs polygon geometry. |
| pilot_spacing_m | spacing | Direct SPACE-01 assumption; remove hidden ×0.83 spacing. Placement must not reinterpret the number as reviewed horticultural specification. |
| functional_layer | no current property; group-derived placement branches | New composition/output property; preserve group-specific crown/support/water placement. |
| composition_role | compositionRole | Direct; replace inconsistent >=1.1 app / >=1.3 engine role heuristics with one explicit role. |
| climbing_support_required | project.support / climber branch | Requires explicit support input and mapped support length. app.project() currently supplies neither; engine general placement also skips climbers. |
| vigour_or_spread_risk | vigorous | No boolean that treats unknown as low risk. Keep ordered class and active-control rule; remove caution-regex inference. |
| maintenance_demand | no current plant property; project.maintenance | Demand comparator is separate from vigour, which the legacy engine alone filters. |
| native_status_nl | nativeStatus | Remove fixture-index native/non-native defaults. native_original/archaeophyte are supported status labels; unknown never maps to native_fixture. |
| invasive_status | invasiveStatus | Remove not_invasive_fixture default. Known Dutch/EU listing gates; foreign weediness is not Dutch invasive evidence. |
| protected_or_legal_status | no complete current property | Policy review metadata and gate; EU non-listing alone never gives legal clearance. |
| provenance_status | provenanceStatus | Explicit unknown/not_reviewed; no automatic regional-origin approval. |
| public_contact_status | safetyStatus | Keep controlled status and public-access gate; remove demo bypass of public safety. Not a simple safe boolean. |
| toxicity_status | caution | Generate precise hazard warning from sourced status plus claim scope; no invented absence or genus-based hazard. |
| edible_use_status | no current approved food property; publicHarvest | Harvest action stays blocked for these records; provisional parts evidence never becomes edible=true. |
| thorns_or_spines | thorny | Tri-state evidence-aware adapter; unknown is not false. Replace caution regex, preserve path-edge placement exclusion. |
| production_eligible | evidenceStatus / source / demo | Always false; keep demonstration badge and disable real-use claims. Do not pass real to legacy gate to disguise review status. |
| flower_start_month | from | Direct numeric month plus origin for chart/export. |
| flower_end_month | to | Direct numeric month plus origin. Demonstration endpoint is labelled synthetic. |
| flower_colour | colour | Single design swatch with choice origin; affects separate preference/composition only. |
| pollinator_value | no current evidence-backed property | Output/preference only; pilot_potential cannot be advertised as researched biodiversity benefit. |
| field_origins_json | evidenceStatus / explanation panel (adapter) | Per-field origin badges; do not compress into verified. |
| field_confidence_json | no current property | Publish field confidence and separate evaluator confidence; never add confidence to suitability. |
| synthetic_derivations_json | no current property | Expose all inferred/synthetic derivations in evidence details and exports. |
| unresolved_safety_or_policy_json | caution / explanation panel (adapter) | Expose unresolved fields and documented allergen/sap context; no blanket public-safe badge. |
| evidence_claim_ids_json | no current property | Trace to preserved v0.2 JSONL and source ledger. |
| field_resolutions_json | no current property | Real versus operational values are separate; keep null real evidence and nonblank operational input. |
| record_notes | caution / exports | Display simulation/review limitations alongside individual warnings. |
| raw_suitability_score | score / demoCandidates() | Replace ad hoc score starting at 3 with 100-point diagnostic score; do not use the old >=4 cutoff. |
| final_suitability_score | score / shortlist ranking | Use capped/gated final score, retaining raw score in explanation; final=0 on hard exclusion. |
| evidence_confidence_score | no current field | Separate 0–100 display/export column. |
| eligibility_state | engine.eligibility() / engine.zoneFit() | Use full per-zone result before ranking; never hide excluded records from diagnostic exports. |
| component_scores | demoCandidates local score clauses | Replace soil/moisture/light/hydro/size clauses with explicit weighted matrices. |
| component_value_origins | no current field | Mark components that depend on inference/synthesis in shortlist explanations. |
| hard_gate_results | eligibility reasons / zoneFit boolean | Structured exact rule IDs; keep separate from design preferences. |
| warnings|inclusion_reasons|exclusion_reasons | caution / validation notes / rule traces | Human-readable per-zone reasons; do not replace with generic native/public-safety claims. |
| placement | engine.generate / height / spread / spacing | Provide dimensions, layer, role and support requirements. Continue polygon, path, void, asset and neighbour checks separately. |
| quantity | plan.cells and counts / exports | Approximate capacity for a single-species zone only. Final mixed-plan quantities must come from actual packing; no seed-rate conversion. |
| design_preference_score | anchor colour / group preference ranking | Tie-break only after final and raw suitability; no environmental or hard-gate override. |
| harvesting_allowed | publicHarvest / productive project | Always false for this pilot; add specific harvest-review warnings. |
| eligible_for_demo_ranking | candidate filter | Only strong/suitable/conditional results enter eligible ranking. Complete results retain all plants. |
| zone clear dimensions|support_length_m|path_edge|max_plant_height_m | scaled drawing / paths / water polygon / support geometry | Adapter must compute/use actual clear space or explicit unknown. Never use whole geographic project area as bed dimensions. |
| project.support|vigourControl|evaluation_stage | missing support; maintenance; generate phase | New explicit contract fields; support is currently referenced but not supplied by app.project(). |
| zone.canopy | zone.canopy / futureShade logic | Current observed canopy is light context only; future tree shade remains a separate placement scenario, not a second score. |
| project.priorities|desiredFlowerMonths | priorities / seasonal chart | Adapter keeps only pollinators in the v0.3 design-priority array; rewilding maps to its separate policy boolean. Other UI priorities remain annotations, not ecological points. desiredFlowerMonths is an optional new preference input, absent→empty array. Never submit unsupported UI priority strings directly to the strict evaluator. |
| project.area | project.area (geographic polygon area or legacy 0) | Use m2 only when actually measured. Legacy 0 meaning no drawn geographic polygon maps to unknown, not confirmed empty land. Project area caps stock capacity; clear zone geometry supplies spatial scoring, never the old whole-project <180m2 tree shortcut. |

Keep approved geometric mapping, path/void containment, existing-asset protection, W01 manual water-depth/band approval, phased placement, neighbour spacing checks, D04 absence of numeric composition quotas, patch sampling and seasonal exports as separate concerns. Their prototype parameters remain visibly assumptions. Remove later the old shortlist arithmetic, positive unknown-moisture bonus, made-ground bypass, moisture-derived soils, index-derived native status, unreviewed invasion/safety defaults, height-derived spread, hidden spacing multiplier, caution-regex thorns/vigour and demo safety bypass. Route shortlist scoring through the complete per-zone evaluator; route placement through actual geometry and the returned explicit operational traits. Tie-break design only after compatible candidate selection. A future adapter must preserve field-level origins and warnings, not translate unknown into false/safe/native.

## Sources, rights and limitations

This projection links 1193 archived claim IDs from 167 distinct source records (plus the preserved local fixture/taxon-key projection). That count includes the legacy synthetic composition policy and its 120 demonstration claims; these are not factual research evidence. Source families are GBIF taxonomy, NDFF Verspreidingsatlas/FLORON Dutch flora facts, RHS horticultural records, NC State Extension institutional horticulture, the Dutch tree-variety source, archived competent-authority Union List snapshots, the local backbone and the internal demonstration policy. Exact URLs, access dates, versions, scope and rights remain in [v0.2 source ledger](source-ledger-demo-v0_2.csv). The source-use/build manifest lists the precise subset and rights strings. No external page was re-fetched and no new factual citation fabricated in v0.3.

| Rights string carried forward from v0.2 | Linked source records |
|---|---:|
| unknown | 1 |
| CC0 except expressly excluded materials | 1 |
| CC BY 4.0 | 60 |
| Mixed rights: Wilde-planten/Klaas Dijkstra ecology CC BY-NC-SA 3.0 NL; some René van Moorsel contributions CC BY-SA 3.0; taxonomy, BBR, Red List and hazard compilation reuse rights unresolved. | 54 |
| unknown; per-image licences do not establish text/database reuse rights. | 40 |
| Copyright RHS; no open text/database redistribution licence verified. | 9 |
| unknown; no reuse licence established. | 1 |
| Original project demonstration policy; rights ownership not assessed. | 1 |

All original rights restrictions carry forward. No new blanket dataset licence, source-reuse right or public redistribution permission is asserted. GBIF public taxon access does not imply a universal licence for every upstream dataset; NDFF/FLORON, RHS, Extension and other source-specific restrictions/unknown rights remain as recorded. Operational facts are paraphrased/normalized, not copied source prose. Licence/reuse review remains a real-use/distribution blocker and is never synthesized.

The matching model is coarse and uncalibrated. Loam/category transfer, foreign horticultural context, geometry scalars, synthetic hydroperiod, negative support assumptions, disturbance/hardscape classes, spacing, phenology endpoints and pollinator placeholders are visible limitations. Hydrology does not know depth; square space does not know polygon shape; geometry does not know root volume; maintenance classes do not prescribe tasks. Native/protection/invasion snapshots are incomplete and not updated by this build. No cultivation/soil suitability is inferred from occurrence. There are no harvest approvals, no claimed allergen absence and no production-ready records. Evidence confidence is an index, not an uncertainty interval or probability.

Next research priorities: (1) current Dutch invasive/protected/legal and provenance checks for all 60, plus project-specific public-contact assessment; (2) actual water-depth/hydroperiod evidence for the six marginal fixtures and Dutch canopy/soil context where foreign evidence was transferred; (3) missing spread and spacing trials for placement-sensitive plants, including the Quercus context conflict; (4) plant-specific disturbance/hardscape/maintenance evidence only where these pilot components can change a decision; (5) verified local flowering and pollinator evidence for visible design outputs; (6) licence/reuse and independent specialist review. Maintain unknowns until evidence supports the exact scope. New evidence should enter a separately versioned research layer, with source claims/rights intact, before rebuilding the lean projection. Do not expand v0.3 with unused chemistry or speculative professional fields.

## Files created

The eight requested files are the v0.3 CSV, resolved-profile schema, location contract, suitability rules, field-use matrix, evaluator, validator and this handover. Supporting files under research/demo-v0_3 contain shared typing, three deterministic builders, protection hashes, inputs, derivation ledger, adapter mapping, source-use manifest, field/plant completeness, validation statistics and three full result artifacts. No existing file was changed. Rebuilding v0.3 writes only its own versioned files.
