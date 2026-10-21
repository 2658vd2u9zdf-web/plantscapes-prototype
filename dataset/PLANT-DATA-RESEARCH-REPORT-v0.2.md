# Plantscapes demo plant-data research handover v0.2

Created 2026-10-13. Dataset version 0.2.0. Plant data only; no website, recommendation engine or location-model integration.

## Release status and counts

This release has **60 unique resolved fixture profiles: 54 core and 6 ornamental**, **2,811 separate claims**, **169 source-ledger entries** and **3,780 gap entries**. Every one of the 99 evidence-bearing fields on every profile has an origin and either claim links or a gap link. Administrative fixture IDs and review/index metadata are not counted as biological traits.

All sourced values are **provisional, pending independent expert review**. No claim is marked verified merely because a source was retrieved. `review.status = needs_second_review`, reviewer/date are null, and every `production_eligible` is false. Manual source-scope QA below is an inspection, not botanical, toxicological or legal certification.

The immutable national catalogue remains **2,443 records**, SHA-256 `167256ade50af4cf4ce5af9a186ac1867212e237f26311631f7eaaf17e5de739`. Its original contents, the fixture JavaScript, planting engine and original plant-claim schema are checked against the initial saved baseline. Existing datasets and application code were not edited.

## Files and evidence architecture

Required outputs:

- `derived/plantscapes_demo_plant_traits_v0_2.csv`: wide typed-profile export; exactly one row per fixture.
- `claims/plantscapes_demo_plant_claims_v0_2.jsonl`: individual evidence objects; each validates against the **unchanged** original `schemas/plant-claim.schema.json` and the stricter demo value contract.
- `source-ledger-demo-v0_2.csv`: source records, editions, exact retrieval URLs, access dates, rights, permitted-use limits and notes.
- `derived/plantscapes_demo_data_gaps_v0_2.csv`: one row for each unknown, conflicting or demo-fallback field; real value remains null.
- `dataset_manifest_demo_v0_2.json`: counts, rights, completeness, blockers, limitations and file/input hashes.
- `schemas/demo-plant-profile-v0_2.schema.json`, `schemas/demo-plant-claim-value-v0_2.schema.json`: typed field, controlled vocabulary and provenance contracts.
- `build_demo_dataset_v0_2.py`, `validate_demo_dataset_v0_2.py`: deterministic offline build and validation.

Additional handover material:

- `derived/plantscapes_demo_completeness_v0_2.json` and the `..._by_field_v0_2.csv` / `..._by_plant_v0_2.csv` exports.
- `derived/plantscapes_demo_field_dictionary_v0_2.csv`: every required field and extension, type, unit, definition, vocabulary and unknown encoding.
- `research/demo-v0_2/source-observations.json`: reproducible short facts, scoped interpretations, priority decisions and genuine URL attempts/errors for each plant.
- `research/demo-v0_2/resolution-decisions.json`, `resolved-profiles.json`, `fixtures.json`, `baseline.json`, `manual-review-checklist.csv`.
- `research/demo-v0_2/collect_sources.py`, `collect_horticulture.py`, `supplement_sources.py`, `prepare_observations.py`, `model.py`, `inspect_sources.py`, `requirements.txt`: retrieval and interpretation workflow.

JSONL stays compatible with the original strict claim schema by putting the demo-specific contract **inside `value`**, which the original schema deliberately leaves extensible. `value.field` identifies the precise wide-table field; the original top-level `trait` retains its vocabulary and uses `other` for identity or newly supported fields. Each value includes origin, real_value, separate demo_value and resolution status. Multiple sources remain distinct claim objects, including rejected-for-resolution alternative scopes. No schema permissions were loosened.

## Methodology and source hierarchy

Before edits, all requested repository documents, templates, manifest, schema, fixture definitions and planting engine were read. The full national CSV was parsed, checked at 2,443 rows and its complete fields retained for reconciliation. Fixtures were extracted by evaluating the actual data file in an isolated Node VM: 54 core + 6 ornamental, 60 unique scientific-name fixture records.

Research order was: exact taxonomic reconciliation → direct Dutch species page → direct international horticulture and hazard page → targeted difficult-record sources → claim extraction → explicit resolution/gap decisions → manual scope QA → schema and cross-file validation. GBIF strict match failures did not trigger fuzzy acceptance. URL failures were logged and never became claims.

The preferred hierarchy is Dutch official/scientific status and flora information, then European competent-authority policy, then accepted international taxonomic records, then recognised horticultural institutions. Actual evidence used here:

- Plantscapes / NDFF / GBIF: 1 source-ledger records.
- NVWA: 2 source-ledger records.
- GBIF Secretariat: 61 source-ledger records.
- NDFF / FLORON; section-specific contributors: 54 source-ledger records.
- NC State University / N.C. Cooperative Extension: 40 source-ledger records.
- Royal Horticultural Society: 9 source-ledger records.
- Rassenlijst Bomen / Centre for Genetic Resources, the Netherlands (CGN): 1 source-ledger records.
- Plantscapes research prototype: 1 source-ledger records.

The direct Dutch [Verspreidingsatlas Quercus record](https://www.verspreidingsatlas.nl/1037) demonstrates the section-specific sourcing: native status references Standaardlijst 2020, Red List references 2012, height/flowering refer to Botanisch Basisregister with additions, ecological narrative credits Wilde-planten/Klaas Dijkstra and/or René van Moorsel, and hazards reference Heukels 24th edition 2020 with FLORON additions. A single page is not treated as one uniformly licensed primary experiment.

[RHS species profiles](https://www.rhs.org.uk/plants/14294/quercus-robur/details) and [NC State Extension species profiles](https://plants.ces.ncsu.edu/plants/iris-pseudacorus/) supply supplemental horticultural and hazard facts. Their UK/US conditions are retained. Commercial nursery results, generated search summaries, genus descriptions, fixture cautions and LLM memory were not used as botanical evidence. No primary experimental measurements were obtained in this release (`sourced_primary = 0`); official databases and secondary institutional compilations dominate.

The [NVWA displayed Union List](https://www.nvwa.nl/onderwerpen/plant/invasieve-exoten/unielijst-invasieve-exoten) plant tables were opened and checked, including the August 2025 additions. Fixture/accepted names plus the first five returned GBIF synonyms were screened. `not_listed_snapshot` records this exact bounded check. It does **not** mean non-invasive, unregulated, currently absent, native or safe. A complete nomenclatural and consolidated legal review remains pending.

## Taxonomic reconciliation

All 60 fixture names have an authority-attributed accepted taxon record; no accepted identity was invented. **53 existing national plant IDs are preserved**. Seven species/hybrid fixtures use separate `demo-taxon:gbif:<accepted-key>` identities because there is no defensible same-rank national match:

Lotus corniculatus; Myosotis scorpioides; Echinacea purpurea; Rudbeckia fulgida; Nepeta × faassenii; Panicum virgatum; Hakonechloa macra.

`taxon_match_type` describes catalogue reconciliation, while `identity_status` distinguishes resolved_catalogue from resolved_external. Consequently unmatched does not necessarily mean that the accepted taxon itself is unknown. There are **zero unresolved/ambiguous accepted-name records** in this release, but all identity interpretations are provisional and do not identify physical planting stock.

- Lotus corniculatus is not silently assigned to the national variety records. Species-level RHS/GBIF evidence is used; Dutch species native/Red List status stays unknown.
- Myosotis scorpioides is not silently assigned to a national subspecies. Its separate species-level Dutch page 0844 is retained; the fixture's narrower Dutch label cannot identify subsp. scorpioides.
- Nepeta × faassenii remains a hybrid with no named cultivar. GBIF's canonical name omits the multiplication sign and its scientific-name string contains an encoding artefact. The [RHS exact hybrid record](https://www.rhs.org.uk/plants/52221/nepeta-%C3%97-faassenii/details) corroborates the hybrid identity; the accepted name retains the sign. No species/cultivar substitution is made.
- Salix alba's strict GBIF match returned multiple equal matches. The existing catalogue key 5372513 was opened directly and confirmed as accepted Salix alba L.; no ambiguous API result was silently accepted.
- Caltha palustris, Salix cinerea, Centaurea jacea, Festuca rubra, Valeriana officinalis and Rosa canina require attention to broad/aggregate or variable taxon concepts and stock identity.
- The current preferred GBIF family for Viburnum opulus/Sambucus nigra differs from the older national family assignment. Both family claims remain; authority priority is documented rather than overwriting the backbone.
- Ornamentals remain tagged as cultivated-demo fixture purpose. Verbena bonariensis preserves an existing national ID but its ornamental fixture track remains separate. This track is not evidence of Dutch native or establishment status.

## Field definitions, units and matching semantics

The field dictionary is the complete specification. All A–G requested fields exist. Additional fields preserve original fixture labels/group, reconciliation status, explicit pH classes, open dimension bounds and source-specific contact irritation.

Wide-table arrays use `|` consistently. Numeric unknowns are empty CSV cells and typed JSON null, never zero. Administrative empty arrays remain empty arrays; evidence-bearing empty arrays are normalised to null. JSON metadata columns need JSON parsing, but essential trait matching is in explicit numeric/range/category columns rather than buried in notes.

SI lengths are metres, with requested water-depth fields in centimetres; planting density is plants/m². NCSU feet/inches use exact 1 inch = 0.0254 m conversion. Extra decimal places reflect unit conversion, **not measurement precision**. Flower months are integers 1–12. No fruit-harvest window is asserted. A source's autumn-only flowering endpoint does not become October or November.

Environmental vocabularies are intentionally coarse. `loam` maps an explicitly named leem/Loam (Silt) descriptor, not a quantified Dutch soil texture triangle. `calcareous_substrate` is carbonate-related substrate, not automatically alkaline pH. `unspecified_multiple` is not a wildcard accepting every site soil. Qualitative pH classes do not generate numeric pH endpoints. Nutrient descriptors are an ordered categorical scale, not laboratory units or Ellenberg numbers.

Ranges described as dry-to-wet or sun-to-shade include intermediate categories where the source explicitly describes a gradient. Rare/sometimes conditions remain provisional in the envelope and the original qualifier should be inspected before a future scoring decision. Excluded substrates and explicitly extra-Netherlands clauses are not added to a preferred Dutch tolerance envelope. These coarse conversions need an ecologist's review before production matching.

Height and spread retain separate measurement/cultivation qualifiers. Dutch floristic heights are not standardised mature landscape-tree predictions; small/large life stages and forms can share the source envelope. Spread is never derived from height. An open-ended RHS width preserves its lower threshold, open flag and unknown upper bound. Numeric dimensions are paired from one source; an upper limit from an incompatible source is not attached to a lower limit from another.

`growth_form` retains a directly stated architecture class where available; some records contain explicit botanical life-form codes instead. Those do not silently imply tree/shrub/grass architecture. Root space, competition strength, habitat suitability and water-band placement are not inferred from those codes or from habitat names.

For future national enrichment, the profile contract is taxon-level and the validator's 60-fixture cardinality belongs to this release only. The claim value schema already supports structured `occurrence_context` (geographic level, area identifier, time bounds, spatial resolution and sensitivity/generalisation) and optional `measurement_context` (stage, cultivar/stock, original units and target age). Claims about regional occurrence require this context. National record enrichment can reuse those contracts without turning occurrence into suitability.

## Resolving evidence and conflicts

Source-specific priority selects a provisional application value, usually Dutch flora for ecology, preferred GBIF for current accepted taxonomic usage, RHS before US horticultural dimensions where available. Priorities and every alternative are in the observations/decisions files. Source disagreements are not averaged. Different countries, taxonomic concepts, cultivated forms and age contexts are retained as alternative-scope claims; not every numerical difference is a biological contradiction.

Seven resolved field slots are explicitly conflicting:

- Quercus robur: both height endpoints and growth_rate.
- Rudbeckia fulgida and Frangula alnus: evergreen_status.
- Viburnum opulus: edible_parts and edibility_evidence_status, with its Dutch toxicity claims linked as the cross-trait conflict basis.

Toxic plant parts combine **only direct positive source reports**; omission of a part never clears that part. Preparation-required remains unknown unless the source expressly supplies a requirement. A source's use of fruit in jam or medicinal preparations does not establish raw safety, necessary cooking, dose or allergy safety.

## Synthetic fallback policy

There are exactly **120 separately stored demonstration values: functional_layer and community_roles on each of 60 fixtures**. They exercise future composition grouping. The opened species records did not provide an expert-authored Plantscapes community plan for a defined site; the original synthetic fixture group supplies an explicitly synthetic design-policy mapping. This is not a botanical inference from plant group.

For these fields the actual profile value and claim `real_value` remain null. The separate `demo_fallback_values_json` / claim `demo_value` contain the example. Each has a gap record and derivation containing plant ID, trait, value, unit, rationale, fixture bounding basis, sources searched, reason for insufficiency, risk if treated as real and required designer/ecologist review. No geometry, spacing, hydrology, identity, legal, occurrence, toxicity, allergy or food value is invented. Production eligibility remains false.

## Completeness

The denominator is **5,940 slots = 60 plants × 99 evidence-bearing fields**. Sourced means a resolved value is traceably supported; all sourced values remain provisional. Sourced and provisional percentages therefore **overlap**, rather than forming separate buckets.

| Category | Resolved slots | Percentage |
|---|---:|---:|
| Sourced, all provisional | 2,160 | 36.36% |
| Synthetic demo values, real value null | 120 | 2.02% |
| Unknown origin | 3,653 | 61.5% |
| Conflicting, real value null | 7 | 0.12% |
| Independently reviewed | 0 | 0% |

Real null/unresolved fields total **3,780**, including unknown, conflicting and synthetic-origin slots. The source claims total is larger than the resolved sourced count because alternative sources, scopes and synthetic demonstrations remain separate claims.

| Domain | Slots | Sourced | Synthetic | Unknown | Conflicting |
|---|---:|---:|---:|---:|---:|
| identity | 1020 | 690 | 0 | 330 | 0 |
| environment | 1320 | 425 | 0 | 895 | 0 |
| growth | 1260 | 527 | 120 | 610 | 3 |
| safety | 780 | 97 | 0 | 681 | 2 |
| seasonal | 720 | 311 | 0 | 407 | 2 |
| maintenance | 840 | 110 | 0 | 730 | 0 |

| Field | Sourced/provisional | Unknown | Conflicting |
|---|---:|---:|---:|
| accepted_scientific_name | 100.0% | 0.0% | 0.0% |
| native_status_nl | 88.33% | 11.67% | 0.0% |
| light_regimes | 96.67% | 3.33% | 0.0% |
| soil_textures | 95.0% | 5.0% | 0.0% |
| moisture_regimes | 93.33% | 6.67% | 0.0% |
| mature_height_min_m | 98.33% | 0.0% | 1.67% |
| mature_spread_min_m | 63.33% | 36.67% | 0.0% |
| flower_start_month | 96.67% | 3.33% | 0.0% |
| flower_end_month | 80.0% | 20.0% | 0.0% |
| toxicity_status | 31.67% | 68.33% | 0.0% |
| public_contact_suitability | 0.0% | 100.0% | 0.0% |
| protected_status_nl | 0.0% | 100.0% | 0.0% |
| regional_occurrence_status | 0.0% | 100.0% | 0.0% |
| spacing_min_m | 0.0% | 100.0% | 0.0% |

Combined identity/policy/safety fields: 787/1800 sourced (43.72%), **0% independently safety-reviewed**. The D-only safety/use domain has 97/780 sourced (12.44%), also with no safety clearance. This distinction prevents strong taxonomy coverage from disguising weak contact/food safety evidence.

Dutch evidence supports 1119 non-null resolved field slots (18.84% of all slots). **54/60 plants** have at least one Netherlands-specific claim. EU-wide NVWA list screens are reported separately, not counted as Dutch plant ecology. Field/plant percentage tables include sourced, provisional, synthetic, unknown, conflicting, safety and Dutch coverage; all machine totals are checked by validation.

## Occurrence and safety blockers

No raw occurrence records, map imagery or GBIF aggregate occurrence counts were copied. Source species pages' national distribution/phenology sections were inspected, but they did not provide a licensed, dated regional occurrence export that meets this application's requirements. Regional occurrence and establishment therefore remain unknown on all 60 records. The general NDFF 2000–2021 phenology model is not reused as a time window for provincial presence.

All 60 plants are blocked by unknown/current-unreviewed statutory protection, Dutch invasive assessment, provenance, regional/establishment and public-contact/play suitability. A species not on the displayed Union List is not certified unregulated. Historical Red List categories are not protection law. Hazard-positive plants are not reduced to generic safe/unsafe labels; toxin parts, contact irritation, allergens and food preparation are separate fields with independent gaps.

Rights are also blockers. The combined dataset has no single asserted open licence. Reading a source and knowing an image licence do not establish text/database redistribution rights.

## Manual quality review

The checks below were performed after opening the relevant source records and inspecting extracted and resolved values. Reviewer: Codex source-scope QA, 2026-10-13. Independent botanical/toxicological/planting-design/legal reviewers remain pending. Detailed claim IDs are in `research/demo-v0_2/manual-review-checklist.csv`.

| Plant | Required groups / difficult cases | Review result |
|---|---|---|
| Quercus robur | tree; deep test | Dutch 15–30 m botanical range, Dutch forestry 30–40 m and UK 20–40 m remain separate. Height endpoints and growth rate withheld. RHS spread >8 m retains NULL upper endpoint. Native and historic Red List evidence do not establish local occurrence/provenance. Young leaves/unripe acorns hazard preserved; human/contact safety unknown. |
| Prunus spinosa | shrub; thorny; public contact | Thorns and toxic bark/leaves/seeds are sourced. Suckering/spacing/public-contact suitability stay unknown rather than copied from the synthetic caution. Thorniness is species morphology, not a genus assumption. |
| Achillea millefolium | flower/herb | NL register reports June–November, not the fixture June–September. Floristic height 0.15–0.50 m differs from US horticultural size and both claims remain. Food-use statements stay provisional; allergy and public-contact safety remain unknown. |
| Carex pendula | grass/sedge/rush; vigorous | NL shaded wet conditions retained separately from broader UK light conditions. RHS vigorous/self-seeding warning and removal of flowering stems are sourced. Native status does not make it low-maintenance or Dutch non-invasive. |
| Clematis vitalba | climber; vigorous; contact sensitive | Species-specific vigorous climbing and skin-irritation warnings retained. Dutch floristic and RHS horticultural dimensions remain separate claims. No generic safe climber or support-based safety clearance. |
| Iris pseudacorus | aquatic/marginal; toxic | Whole-plant toxicity preserved. US source 10-inch depth converted to 25.4 cm with US qualifier. No minimum depth, exact duration or safe water-band placement inferred. US invasiveness does not fill Dutch invasive_status. |
| Nepeta × faassenii | ornamental; hybrid | Hybrid multiplication sign retained and no cultivar named. GBIF canonical sign omission/mojibake noted; RHS hybrid page corroborates identity. UK 0.1–0.5 m dimensions do not absorb the larger US envelope or named cultivars. Dutch native status and safety stay unknown. |
| Rosa canina | limited applicable evidence; prickles | Narrow Hondsroos s.s. substrate narrative and missing broad source entries are retained as gaps. Species-specific prickles sourced. No genus-level toxicity, edible hips, broad pH or growth form inferred. |
| Viburnum opulus | toxic fruit / contradictory food use | Dutch hazard claim identifies berries, bark and leaves. NCSU fruit-use statement is preserved separately; resolved edible_parts and edibility_evidence_status withheld as conflicting, with cross-trait toxicity claim links in the gaps. |
| Caltha palustris | aggregate identity; preparation | Species aggregate retained; no subspecies identity assumed from Dotterbloem. NCSU raw-ingestion prohibition retained with preparation method unresolved. Vague spring-greens wording does not identify an edible part. |

## Source rights and permitted use

- GBIF Backbone taxonomy: **CC BY 4.0** as explicitly recorded in the [dataset metadata](https://api.gbif.org/v1/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c). This does not license unrelated GBIF occurrence datasets.
- NVWA web text: **CC0 except specified exclusions**, supported by its [copyright notice](https://www.nvwa.nl/copyright). Photos/video/logos and third-party exceptions are not copied.
- Verspreidingsatlas pages: mixed rights. Wilde-planten/Klaas Dijkstra ecology credits CC BY-NC-SA 3.0 NL; some René van Moorsel contributions credit CC BY-SA 3.0. These notices are not extended to taxonomy/status/BBR/Heukels content whose reuse rights remain unresolved. Restricted/internal research treatment retained; no source maps or imagery copied.
- RHS: copyright, with no open text/database redistribution licence established here. Only small factual summaries and exact citations are retained for research; public redistribution clearance remains pending.
- NC State Extension: text/database reuse rights **unknown**. Individual photo licences are not assigned to the page text. A rights-policy URL attempt returned 404 and is logged; imagery is not copied.
- Rassenlijst Bomen: text reuse rights **unknown**; species facts retained provisionally with exact page/section citation.
- Local inherited catalogue and new synthetic policy: provenance documented; no licence/ownership is invented. An explicit combined-data reuse decision is still required.

No extensive source paragraphs, scans, map tiles, images or occurrence archives enter this release. Full page working copies are in the operating-system temporary research folder only. The repository handover holds short facts, generated scope notes, checksums and locators. Online pages can change; observation snapshots and source access dates make the selected evidence auditable, but copyright-limited working copies are not a permanent redistributable archive.

## Validation and reproducibility

From the repository root, with Node available and Python dependencies installed in an isolated environment:

```powershell
python -m pip install -r dataset/research/demo-v0_2/requirements.txt
python dataset/build_demo_dataset_v0_2.py
python dataset/write_demo_handover_v0_2.py
python dataset/validate_demo_dataset_v0_2.py --self-test
```

The normal build/validation are **offline** and use the committed observations, not live pages. This run used the bundled Python executable and temporary dependency target recorded in the runtime validation notes. `derived/plantscapes_demo_validation_v0_2.json` records PASS, all profile/claim schema checks and the negative mutation tests. The original claim schema is hash-checked and unmodified.

Checks cover exactly 60/54/6; fixture IDs/names against JavaScript; accepted-name duplicates; exact catalogue IDs and no rank/hybrid reduction; every sourced resolved value's claim; each claim's source/rights; each synthetic value's gap and prohibited-field exclusion; all documented vocabularies; unit consistency; lower/upper ordering; month limits; reviewer metadata; eligibility blockers; field completeness and initial protected hashes. Negative tests must reject duplicated fixtures, missing sources/gaps, synthetic toxicity, unsupported dimensions, invalid months/vocabularies, premature eligibility, fabricated review, hybrid reduction and blank rights.

To refresh online research, run the three collectors then prepare_observations.py, inspect the affected source facts and priorities, rebuild and revalidate. The temporary cache is deliberately reused and is not a latest-data guarantee; create a new dated research directory/cache for a later release rather than rewriting this source snapshot. Preserve conflicting claims and unknowns. Do not edit the national file or wire these records into the website during research.

## Known limitations and next research priorities

1. Appoint a botanist and contact/food-safety specialist to review identity scope, hazards and contradictory food claims before any public-space/harvest feature. Start with Iris, Caltha, Hedera, Viburnum, Sambucus, Daucus, Corylus and thorny shrubs; no unknown allergy is a negative result.
2. Obtain a current competent-authority legal/protection and Dutch invasive-status review, with full accepted-name/synonym coverage. Retain dated 2012 Red List categories separately.
3. Obtain an appropriately licensed dated regional NDFF occurrence export, with spatial resolution/generalisation and establishment status. Presence is not suitability, abundance, availability or absence elsewhere.
4. Review broad species/aggregate identity and source stock: Lotus variety, Myosotis subspecies, Caltha and Salix concepts, cultivated selections and the unnamed Nepeta hybrid. Preserve separate cultivated fixture purpose.
5. Resolve Quercus height/growth and foliage conflicts using explicit age, site, management and cultivar/stock context. Replace broad horticultural dimensions with Dutch landscape measurements where available.
6. Prioritise hydrology, salinity, drought, root behaviour, competition, road salt/heat/pollution and numerical pH evidence. Most thresholds remain unknown; qualitative tags do not establish physiological limits.
7. Commission authored planting-community/establishment/maintenance trials for a defined site. Measure spacing, density and water demand. Replace the separate composition demo values only with reviewed design evidence.
8. Complete source text/database rights review before public redistribution. Taxonomy and NVWA CC licences do not make every ecology/horticulture record open.

This is a traceable, structurally complete **research release**, not a fully populated or production-ready plant database. It demonstrates conservative handling of supported, provisional, conflicting, unknown and explicitly separate synthetic values while exposing the research that remains.
