# Recommender system audit (plant–location scoring, v0.3.0 → v0.3.1)

Date: 2026-10-20. Scope: the plant–zone evaluator, its hard gates, caps, ranking, and the step from individual scores to community recipes, in the browser, the local server and the Python reference. This is a software, scoring-logic and testing change. No plant fact, location value, evidence origin, weight, compatibility matrix, cap value or threshold was changed, and no UI/CSS file was edited. All 60 records stay `production_eligible=false`, and every scenario below is synthetic. Nothing in this document is a planting recommendation.

## 1. Outcome in brief

The calculator was internally consistent where it is scored: known conflicts always capped the score, hard exclusions could not be recovered by design preferences, and unknown inputs never earned points. The problems were in how results were **labelled and ordered**, and in places where **browser, server and Python disagreed**:

1. **Missing information was labelled "unsuitable".** When several site or project inputs were unknown, every plant fell below 50 and was shown as `unsuitable`. That is the same word used for a proven mismatch. Now these records get a separate `data_gap` state.
2. **Gate traces said "passed" when the input was unknown or the failure was already known.** Examples: permanent water with unknown hydrology, high vigour with unknown maintenance capacity, a thorny plant beside an unmapped path, a known thorny plant at a mapped path during palette screening, and an unknown native status in a restoration project. These now read `requires_review`. No score changed.
3. **A known maintenance mismatch had no review state.** The approved rulebook (W03) treats it as a hard gate requiring plan revision. It is now an explicit review gate, H12. Points are unchanged; whether it should cap or exclude is listed as a policy question.
4. **An unknown native status ranked like a sourced native one.** The top candidate in both canonical land zones was *Panicum virgatum*, whose native status is unknown. It won only on colour and month preference, over sourced-native plants with identical scores. Ranking now has an explicit native-evidence stage, applied only when suitability ties.
5. **Server and browser disagreed on community membership.** The server's AI check accepted terrestrial plants in water-bed communities, and tall plants in open-character interiors, which the browser excludes. Both now call one shared function.
6. **JavaScript and Python differed in the 4th decimal of evidence confidence** for some inputs. Python 3.12+ `sum()` uses compensated summation, and fixture-ID tie-breaks in JavaScript depended on the browser's locale. Both now use one defined summation and code-point ordering.

Canonical-zone suitability states and scores are unchanged. Ranking order changed only where native-evidence ties were broken differently.

## 2. Repository state and method

- **Git:** `main` with teammates' uncommitted changes in 17 tracked files and a large untracked v0.3 tree. Nothing was reset, cleaned, stashed or reformatted. Before any edit, a full byte copy of `dataset/`, `website/`, `server.mjs` and `tests/` was taken. It is the "baseline engine" all before-results come from.
- **Pipeline audited:**
  - **Bundle:** `plantscapes_demo_matching_ready_v0_3.csv` plus the rules and contract JSON become `website/data/operational-v0.3.generated.js` (built by `python dataset/build_runtime_v0_3.py`).
  - **Evaluators:** `website/suitability-v0.3.js` is shared by the browser and the server. `dataset/score_demo_suitability_v0_3.py` is the Python reference.
  - **Adapter:** `website/runtime-adapter-v0.3.js` handles UI input conversion and ranks each plant by its best zone.
  - **Engines:** `planting-engine.js` handles individual trees; `community-engine.js` builds count-share recipes, re-evaluating every plant per bed at the placement stage.
  - **Server:** `server.mjs` re-checks AI recipe proposals.
- **Policy sources for expectations:**
  - `plant-suitability-rules-v0_3.json` and `plant-location-contract-v0_3.json`.
  - The plant and location pilot handovers.
  - The approved planting rulebook `dataset/planting-plan-rules.v0.1.json` (review state `design_policy_approved_species_validation_pending`). Rules used: G02, G04, G05, W02, W03, D04, S04, plus `first_release_policy` and `priority_order`.

## 3. Phase 1: baseline behaviour

`project-information/recommender-audit/baseline-rules-v0.3.0.json` records, for the three canonical zones and all benchmark scenarios, for every plant:
- rank, raw score, final score, eligibility state;
- every non-passed gate, the caps applied and the exclusion reasons;
- evidence confidence;
- quantity (capacity, pre-eligibility capacity, state) and placement state;
- warnings;
- community consequences on a 24 × 20 m bed with a path, so edge, transition and interior bands exist.

| Canonical zone | Conditional | Unsuitable | Excluded | First candidate (raw / final / confidence) | JS = Python |
|---|---:|---:|---:|---|---|
| dry_sunny_sand | 43 | 8 | 9 | *Panicum virgatum* 100 / 59 / 19.30 | identical (all fields) |
| fresh_clay_mixed | 47 | 5 | 8 | *Panicum virgatum* 100 / 59 / 19.30 | identical |
| wet_water_edge | 4 | 2 | 54 | *Butomus umbellatus* 97.5 / 59 / 17.87 | identical |

Observations that the agreement between implementations did **not** make correct:
- **Final scores carry no ranking information.** Every record has at least one unresolved policy field, so every final score is capped at 64, or 59 with public access. Ranking among eligible plants is therefore decided by raw score and then by the tie-breakers. In dry sand, 19 plants tie at final 59 / raw 100, and their order was set entirely by colour, month and pollinator preference.
- **Confidence was the last tie-breaker.** Canonical confidence ranges from 11.08 to 22.16. *Lotus corniculatus* (confidence 15.17, native status unknown) ranked 2nd because of colour preference.
- **Parity outside the canonical zones was not exact.** An 80-case sweep over the whole contract vocabulary found 2 JavaScript/Python mismatches in the 4th decimal of evidence confidence (for example 27.4406 vs 27.4405). Cause: Python 3.12+ `sum()` uses compensated summation; JavaScript adds left to right.
- **Climbers are never placed.** They rank as candidates (*Lonicera periclymenum* ranked 6th in dry sand) but are never placed: no community and no individual position. This is documented as unimplemented mapped-support placement.
- **Shrubs dominate recipe area while showing a small share.** In community recipes they are mixed with herbs at count shares under 1% each, but together they take about 85% of the synthetic spacing footprint (see §5G).

## 4. Phase 2: recommendation benchmark

**File:** `dataset/benchmark/recommender-benchmark-v0_3.json` (benchmark version 1.0.0, tied to the rules file).

**Format:** 19 synthetic scenarios with a full zone and project input each. Every expectation:
- names its policy basis;
- selects plants **by their operational fields**, never by hand-picked IDs, so the expected outcome follows from data plus policy;
- has a minimum match count, so it cannot pass with an empty selection.

**Adversarial variants:** these are in-memory copies with one changed value (for example `native_status_nl=introduced`). They exercise gates that no real record currently triggers, and they are never written to data.

| # | Scenario id(s) | Required behaviour checked |
|---|---|---|
| 1 | B01 dry sunny sand | Soil and moisture conflicts are capped and named. Required-edge records are excluded. Unreviewed public contact means review and ≤ 59. Design preference only breaks ties. Native-first ordering applies at equal suitability. |
| 2 | B02 fresh clay, mixed light, canopy | Clay conflicts. Sun-only records under mixed light score 0.5 and are not a conflict. Canopy never changes the score. |
| 3 | B03 permanent water | Records without permanent tolerance are excluded (including wet terrestrial plants). The synthetic hydrology assumption is disclosed. |
| 4 | B04 wet, seasonal, not permanent | H04 never fires. Required edge still needs an edge. Dry-only records conflict. Wet terrestrial herbs stay conditional. |
| 5 | B05 public playground or school edge | Contact review and ≤ 59 for all. Known thorns are excluded at the path; unknown thorns need review. Toxicity warnings stay visible. Disturbance, hardscape and visibility conflicts apply. |
| 6 | B06 / B06b narrow path edge (placement / candidate) | Woody geometry excludes at placement. At candidate stage the woody result is unsuitable and the trace is not "passed". Known thorns are not "passed" at candidate stage. |
| 7 | B07 / B07b low-maintenance municipal (without / with control) | Uncontrolled high vigour is excluded. Demand above capacity needs review (W03). Declared control lifts the exclusion but keeps the cap and the warning. |
| 8 | B08 native-only rewilding | Unknown native status needs review and is capped at 54. Sourced native passes. A known introduced copy is excluded despite favourable preferences. |
| 9 | B09 small courtyard (3 × 4 m, 2.5 m height) | Wide woody records are excluded. Plants over the height limit are not eligible. Capacity stays within area ÷ spacing² and is labelled as a SPACE-01 estimate. |
| 10 | B10a / B10b / B10c climber with support, without support, unknown support length | Support passes or excludes as appropriate. Capacity = floor(support ÷ spacing). A support that is too short means not eligible. An unknown length is a geometry gap: capped, warned, no exclusion. |
| 11 | B11 / B11b restoration (restricted / with override) | Unknown native status needs review. An introduced copy is excluded without the override; with the override it is admitted but stays under review and is disclosed. |
| 12 | B12 / B12b / B12c several unknowns, a single unknown, unverified source | Unknowns never earn points and are never called conflicts. The state is `data_gap` rather than `unsuitable`. A missing mandatory edge excludes. H04, H07, H08, H11 and H12 go to review. Confidence is lower. One unknown still allows a conditional result. An unverified source gives zero confidence. |

The benchmark test also checks the following in every scenario, for every record:
- production and harvesting stay false;
- a triggered gate always gives `excluded`, final 0, and no ranking;
- final ≤ raw, and eligibility agrees with state;
- unknown categories score 0 and are never called conflicts;
- results are identical under two opposite design-preference sets;
- evaluation is deterministic;
- ranking does not depend on input order.

## 5. Phase 3: audit findings

### A. Compatibility scoring

| Component | Finding | Verdict |
|---|---|---|
| Soil | 1 match / 0 conflict; made ground is 0.25 and warned; unknown is 0 and warned, never a conflict. | Consistent. |
| Moisture | Adjacent classes 0.5, opposite classes 0; `variable` is 0.5 for every plant and warned. | Consistent. |
| Hydrology | Adjacent regimes 0.5. `edge` is at most 0.5 for every plant. A wet terrestrial plant never gets permanent tolerance (H04). | Consistent. Before this change, unknown hydrology passed H04 silently; fixed (review). |
| Light | Sun↔shade 0, mixed adjacent 0.5; canopy never scores twice (tested). | Consistent. |
| Disturbance | A tolerance ceiling: a plant tolerant of moderate scores 1 on low-disturbance sites. Only 'low'-only records on 'high' sites conflict. | Consistent, and directional on purpose. |
| Hardscape | avoid + yes = 0 (conflict); conditional = 0.5. | Consistent. |
| Spatial | Footprint 80% plus visibility 20%. A known misfit or exceeded height caps at 49. Unknown geometry scores 0, caps at 64 and warns. A climber needs support length ≥ spacing. | Consistent. Before this change, a woody misfit at candidate stage showed H07 as passed while the plant was unsuitable for that reason; fixed (review). |
| Maintenance | Demand above capacity gives ratio 0, but **it is not on the conflict-cap list**. A known mismatch cost only 2.5–5 points, with no gate or state change. | The score is not changed (a policy decision; see Q2). It now carries an H12 review gate per approved rule W03. |
| Vigour | High vigour + low maintenance + no control → excluded (H08). With control → 0.5 and capped at 64. | Consistent. Before this change, unknown maintenance with high vigour read as passed; fixed (review). |

Every row of every matrix gives 0 for `unknown`, and only the values 0, 0.25, 0.5 and 1 occur.

### B. Weights (15 / 20 / 15 / 15 / 10 / 15 / 10)

**No weight was changed.** Every known zero in soil, moisture, hydrology, light, disturbance or hardscape, and every known spatial or visibility impossibility, caps the final score at 49. So no combination of strong minor matches can hide an environmental mismatch, and the benchmark found no counter-example in any scenario or in the 80-case sweep.

Two weight-related effects remain, and both are recorded as policy questions rather than changed:
- The only known zero that is *not* capped is maintenance (Q2).
- Because all final scores are capped at 59 or 64, ranking is decided by raw score. Most raw differences come from components whose plant values are mostly synthetic: hydrology 58 of 60, disturbance 59 of 60, hardscape 60 of 60 records (Q3).

### C. Hard gates

| Gate | Excludes when | Review when (v0.3.1) | Problem found | Change |
|---|---|---|---|---|
| H01 identity | name or plant_id unknown | – | none (schema forbids blanks) | none |
| H02 invasive/legal | listed_nl, listed_eu, invasive_elsewhere, or legally_prohibited | unknown/not_reviewed/protected | none | none |
| H03 water edge | edge required and no confirmed compatible edge (unknown edge also excludes) | – | none | none |
| H04 permanent water | permanent zone and no permanent tolerance | **hydrology unknown and no permanent tolerance** | unknown hydrology read as passed | review state |
| H05 support | support required, none supplied | – | none | none |
| H06 public contact | public access and `unsuitable` | unknown/not_reviewed (cap 59) | none | none |
| H07 woody geometry | woody misfit at placement | geometry unknown; **known misfit at candidate stage** | candidate misfit read as passed | review state |
| H08 vigour | low maintenance + high vigour + no explicit control | **high vigour, maintenance unknown, no control** | unknown capacity read as passed | review state |
| H09 native-only | rewilding and introduced | unknown native (cap 54) | none | none |
| H10 restoration | restoration + introduced + no override | **unknown native; introduced with override (plus disclosure warning)** | unknown read as passed; override admitted silently although the rules say "remains separately disclosed" | review state + `restoration_ornamental_exception` warning |
| H11 path thorns | known thorns at a mapped path edge, placement stage | unknown thorns at a path edge or unknown edge; **known thorns at unknown edge, or at a mapped edge during candidate screening** | known thorns at an unmapped edge, or during screening, read as passed | review state |
| H12 maintenance capacity (new) | never | **known demand above capacity, or unknown capacity** | approved hard gate W03 had no trace | new review gate |

A test triggers every exclusion with *favourable* colour, month, pollinator and character preferences, and checks that the final score stays 0, the record stays unranked and raw diagnostics are kept. Known introduced plants outside rewilding now also carry a `non_native_label` warning, as rulebook G05 requires that they are "explicitly labelled".

### D. Unknown information

| Requirement | Status after v0.3.1 | Test |
|---|---|---|
| Never safe | Unknown contact means H06 review plus cap 59; unknown thorns never clear a path edge. | `unknown/policy-values`, B05 |
| Never non-invasive | Unknown invasive status means H02 review plus cap 64. | B01, `review/H02` |
| Never native | Rewilding: review plus cap 54. Restoration: H10 review. Ranking: below sourced natives at equal suitability. | B08, B11, B01 ranking |
| Never hydrologically compatible | Ratio 0; H04 review. | B12, `review/H04` |
| Never full points | Every unknown category has ratio 0; unknown geometry gives spatial 0.2 at most. | B12, `unknown/zone-*` |
| Reduces confidence | The site factor is 0 for the unknown field; the policy factor drops 0.05 per unresolved policy field (floor 0.5). | B12 `lower_than_under`, `unknown/zone-*` |
| Warning or review | `site_data_gap`, `site_geometry_gap`, `project_data_gap`, `policy_or_safety_review_required`, and gate review states. | B12 |
| Not a biological conflict | Unknowns never produce an "Environmental conflict" reason or cap. **New:** a record that is below 50 only because of unknown inputs is `data_gap` instead of `unsuitable`. | B12, `unknown/all-inputs-blank`, `unknown/known-conflict-still-unsuitable` |

### E. Suitability versus evidence confidence

The two are computed independently. Tests change field confidences and the site source, and check that suitability does not move. They are never combined into one number. With demonstration sites, confidence is 11–22 out of 100; with a `survey` source the same plants reach 24–44. Confidence was and remains a **ranking stage, not a multiplier**. It now sits in an explicit, documented `ranking_stages` list in the rules file (see F).

A plant with good compatibility and weak evidence is distinguishable in the result object (`evidence_confidence_score`, `confidence_factors`, `component_value_origins`, per-field origins). However, design preference still orders tied candidates *before* confidence does. Whether confidence should come before design preference, or whether confidence bands should be introduced, needs a design-policy decision (Q4). I did not invent thresholds for it.

### F. Ranking

**v0.3.1 stages** (rules `ranking_stages`, identical in Python and JavaScript):
1. Final score.
2. Raw score.
3. **Native-evidence tier.** Sourced native or archaeophyte first, then unknown/not reviewed, then known introduced.
4. Design preference.
5. Evidence confidence.
6. `fixture_id` by Unicode code point.

- **Native-evidence tier.** The rulebook's `first_release_policy` says "native/local-first in all modes", and the handover says native-first ordering needs evidence rather than fixture track. The tier uses the sourced `native_status_nl` field. It sits *after* raw score, so it never overrides suitability.
- **Fixture-ID tie-break.** It used `localeCompare`, whose result depends on the browser's locale and differs from Python (`demo_a, demo-a, Demo-a` vs Python `Demo-a, demo-a, demo_a`). It now compares by code point.
- **Checked:** excluded, unsuitable and data-gap records are never ranked; ranking is independent of input order; identical inputs give identical output.

### G. Community recommendations

| Question | Finding |
|---|---|
| Can excluded plants enter a community? | No. Each bed re-evaluates every plant at the placement stage with bed geometry; recipe overrides and AI proposals can only use those plants, and the server re-checks. Tested on three plans. |
| Do low-confidence plants dominate? | Recipes ignore confidence entirely: every eligible plant in a role gets an equal count share. No plant dominates through confidence, but nothing prefers better-evidenced plants either (Q4). |
| Are percentages understandable? | `percentage` is a **plant-count share** (the AI prompt already says so). It was not labelled in the result. Communities now carry `shareBasis: 'plant_count'`, and each row has `spacingAreaShare`, the share of the synthetic SPACE-01 spacing footprint. |
| Count share confused with ground cover? | Yes, a real risk. In the dry-sand interior recipe, 9 shrubs hold 6.9% of the plant count but 87% of the spacing footprint, which also cuts the herb count to about 141 plants on 301 m² (Q5). |
| Functional layers and roles | Recipes use the role mix (matrix 45 / flowers 45 / structure 10) divided equally within each role. They match S04 (no layer quotas, zero is valid). |
| Trees | Placed individually with a full-canopy check; never in count recipes; omitted under the open-character preference. |
| Shrubs | Mixed into count recipes at their full spread as spacing (see the row above, Q5). |
| Climbers | Ranked as candidates but never placed (no mapped support placement). |
| Aquatics | Allowed only within 1.2 m of a mapped water polygon. Before this change the server accepted terrestrial plants in water-bed communities; fixed. |
| Herbaceous | No record has `thorns_or_spines=absent_reported`, so the edge and transition bands are **always empty**. On the 24 × 20 m test bed, 67 of 479 m² beside the path has no recipe (Q6). |
| Design preferences overriding eligibility | No. Colour only changes sampling weights among already eligible plants in individual mode; recipes ignore colour. |
| Quantities labelled as estimates? | Yes. Plan warnings say quantities are estimates from synthetic spacing; per-species capacity is `approximate_stock_capacity` with `SPACE-01` and the spacing origin. |

## 6. Changes made (each with its failing example and regression test)

**1. `data_gap` state and `points_withheld_for_unknown_inputs`.**
- **Failing example:** B12 (several unknowns). Before, 50 of 60 records were `unsuitable`. For example *Achillea millefolium* scored raw 38 / final 38 with the reason "No known hard exclusion…". 62 of its 100 points were withheld only because inputs were unknown.
- **Why it was wrong:** the label claimed a mismatch that the evaluator never found. Rulebook G02 says a missing decisive condition "returns zone_data_gap rather than an assumed fit".
- **Correction:** if the final score is below 50, no known-conflict or impossibility cap applies, and raw + withheld points ≥ 50, then the state is `data_gap`: not ranked, quantity 0, reason "Data gap: 62.0 points withheld…".
- **After:** 49 records → `data_gap`. *Carex pendula* stays `unsuitable` because of a known light conflict (sun vs shade-only).
- **Tests:** B12-gap-not-unsuitable, `unknown/all-inputs-blank`, `unknown/known-conflict-still-unsuitable`, and the validator check "Unknown inputs labelled as a known conflict".

**2. Review states for H04 / H07 / H08 / H10 / H11.**
- **Failing examples:**
  - B12: 54 records showed H04 passed and 22 showed H08 passed.
  - B06b: *Crataegus monogyna* showed H07 and H11 passed at a 1 m path edge.
  - B11: 7 unknown-native records showed H10 passed.
- **Correction:** these gates now give `requires_review`. Scores and exclusions are unchanged.
- **After:** see the gate table in `BEFORE-AFTER-v0.3.0-to-v0.3.1.md`.
- **Tests:** `review/*` and the B06b, B11, B12 expectations.

**3. H12 maintenance capacity (rulebook W03).**
- **Failing example:** B07 low-maintenance municipal. *Frangula alnus*, *Betula pendula* and *Salix alba* (high demand, moderate vigour) were conditional (final 59), with only a warning.
- **Correction:** H12 review gate; points unchanged.
- **After:** 18 records per low-maintenance scenario show `H12: requires_review`.
- **Tests:** B07-demand-exceeds-capacity, B07-demand-within-capacity, `review/H12`.

**4. Restoration override disclosure and non-native labelling (G05).**
- **Failing example:** B11b. An introduced copy of *Knautia arvensis* was admitted with H10 passed and no disclosure.
- **After:** H10 `requires_review` plus the `restoration_ornamental_exception` warning. Introduced records outside rewilding carry `non_native_label`.
- **Tests:** B11b-override-disclosed, `review/H10 override warning`, `policy/G05 non-native label`.

**5. Explicit ranking stages with a native-evidence tier.**
- **Failing example:** in canonical dry sand, *Panicum virgatum* (native status unknown) ranked 1st and *Lotus corniculatus* (unknown) 2nd, above *Knautia arvensis* (sourced native) at identical final 59 / raw 100, purely through colour and month preference. In benchmark scenario B01 (same zone and preferences) there were 58 such unknown-before-native pairs.
- **After:** *Knautia arvensis* 1st, *Briza media* 2nd. *Panicum virgatum* moves to 15th and *Lotus corniculatus* to 16th; their scores are unchanged.
- **Test:** B01-native-first-ordering.

**6. Code-point fixture-ID tie-break.**
- **Failing example:** JavaScript sorted `demo_a, demo-a, Demo-a, demo-b, demo-B`; Python sorts `Demo-a, demo-B, demo-a, demo-b, demo_a`.
- **Test:** `ranking/codepoint-fixture-tie-break`.

**7. Defined summation.**
- **Failing example:** sweep case 19, *Daucus carota*: JavaScript 27.4406 vs Python 27.4405, because Python's compensated `sum()` gives 37.98 where JavaScript gives 37.980000000000004.
- **Correction:** both add left to right from 0 (rules `numeric_summation`).
- **Related fix:** duplicate desired months were counted twice in JavaScript but once in Python; JavaScript now de-duplicates.
- **Test:** `tests/recommender-parity.mjs` (6,843 evaluations, 117 rankings).

**8. One shared community-fit function.**
- **Failing example:** with a pond in the bed, the server accepted 33 terrestrial plant/community combinations in water-bed communities. With open character it accepted 13 tall records (for example *Panicum virgatum* at 2.13 m, *Salix cinerea* at 10 m) that the browser keeps out of the interior.
- **Correction:** `PlantscapesRuntimeV03.communityFit` is used by `community-engine.js` and `server.mjs`.
- **Behaviour check:** on a fixed plant pool, all 18 scenario plans are byte-identical to the old engine.
- **Remaining difference:** the server still cannot check shoreline distance (positional), so aquatics in land beds are allowed whenever water exists.
- **Tests:** `community/*`.

**9. Recipe share labelling.**
- **Change:** `shareBasis` and `spacingAreaShare` added to community output. No quantity or percentage changed.
- **Test:** `community/*`.

## 7. What changed for users, in plain words

- In dry sand and fresh clay, the first candidates are now sourced-native plants (*Knautia arvensis*, *Briza media*; *Tilia cordata*, *Prunella vulgaris*). The ornamentals with unknown native status (*Panicum virgatum*, *Rudbeckia fulgida*, *Echinacea purpurea*, *Hakonechloa macra*, *Lotus corniculatus*) are still conditional candidates with the same scores, just lower in the list.
- On a site where soil, hydrology, disturbance, maintenance and dimensions are not yet known, the palette is still empty. Each plant now says "data gap" instead of "unsuitable", and states how many points are waiting on confirmation.
- A hawthorn (*Crataegus monogyna*) next to a mapped path is flagged for review already when the palette is built, not only at placement.
- High-demand plants in a low-maintenance project carry a visible review flag asking for plan revision.
- AI recipe proposals are now accepted or rejected on exactly the same plant set the browser offers.

## 8. Unresolved policy questions (need expert or design judgment)

1. **Unknown decisive site inputs.** Rulebook G02 says to *block* zone recommendations when soil, moisture, light or disturbance is missing. The v0.3 rules allow a conditional result capped at 64 when one input is unknown. v0.3.1 keeps the v0.3 behaviour, with `data_gap` when the score falls below 50. Which rule should win?
2. **Maintenance mismatch.** W03 is an approved hard gate. Should known demand above capacity cap the score at 49, exclude, or stay conditional with review (the current v0.3.1 behaviour)?
3. **Ranking driven by synthetic values.** Because every final score is capped, ranking is decided by raw-score differences, and most of those come from synthetic hydrology, disturbance and hardscape values. Should raw differences from synthetic-only components be ignored for ranking, or shown as such?
4. **Confidence versus design preference.** Should evidence confidence (or confidence bands, which would need defined thresholds) come before colour, month and pollinator preference? Currently a lower-confidence plant can rank above a better-evidenced one at equal suitability purely on preference.
5. **Shrubs in count recipes.** Shrubs are mixed with herbs at count shares but take about 79–89% of the spacing footprint, which shrinks herb quantities. Should woody plants be placed individually like trees, or kept as a separate layer?
6. **Empty path-edge bands.** Unknown thorn evidence blocks every record from the edge and transition bands, so all path-adjacent planting is empty (14% of the test bed). Is that the intended interpretation of W02, or should herbaceous records with unknown thorns be allowed with review?
7. **Strength of native-first.** The tier currently applies only when final and raw scores tie. Should sourced native status outrank a higher raw score?
8. **Children and toxicity.** There is no playground or school input. Toxic records (*Hedera helix* is `strongly_toxic_reported`) are only warned about under public access. Is a children's-site gate needed?
9. **Archaeophytes.** `native_archaeophyte` currently counts as native for rewilding and native-first ordering. Confirm this.
10. **Restoration cap.** Unknown native status is capped at 54 in rewilding but only flagged for review (cap 64) in restoration without rewilding. Should restoration share the 54 cap?
11. **Climbers.** They are ranked but never placed. Should they be hidden from the palette until mapped-support placement exists?

## 9. Test results

| Test | Result |
|---|---|
| `node tests/recommender-benchmark.mjs` (new) | **pass**: 123 checks. On the baseline engine: 27 failing checks, saved in `recommender-audit/baseline-benchmark-output.txt`. |
| `node tests/recommender-parity.mjs` (new) | **pass**: 6,843 evaluations, all result fields; 117 rankings. Baseline: 2 confidence mismatches. |
| `node tests/suitability-v0.3.mjs` | pass (180 saved canonical evaluations, regenerated) |
| `node tests/runtime-integration-v0.3.mjs` | pass |
| `node tests/communities.mjs` | pass. Its estimate changed from 83,664 to 91,504 because the test takes the first three ranked herbs and native-first ranking picks different species (same area). |
| `node tests/smoke.mjs` | pass |
| `node tests/tree-placement.mjs` | pass |
| `node tests/ai-server.mjs` | pass (mocked provider, no paid calls) |
| `python dataset/location/validate_location_dataset_v0_3.py` | **PASS**, 4,458 checks |
| `python dataset/validate_demo_matching_v0_3.py` | All scoring, sensitivity, adversarial and saved-output checks pass. It then stops on the **pre-existing** protected-file hash for `dataset/build_demo_dataset_v0_2.py`, a v0.2 file this work did not touch; that failure is identical on the baseline copy. It writes nothing when it stops. |
| Browser tests (`v03-browser`, `ai-browser`, `browser-walkthrough`, `workflow-clean`) | **not run**: Playwright is not installed in this environment (missing dependency). A manual check in the built-in browser loaded the page and built the palette (13 candidates, 12 gates each, all production-ineligible, no script errors). |

Unrelated issue seen during the manual check: the committed `website/index.html` has the wrong Subresource-Integrity hash for `leaflet@1.9.4/dist/leaflet.css`. The browser blocks the stylesheet, which can break map display. It was not changed here because it is a UI file.

Environment: Node 24.16.0, Python 3.14.2, Windows.

## 10. Files changed

Authoritative rules and shared logic:
- `dataset/scoring/plant-suitability-rules-v0_3.json`. Version 0.3.1 adds `eligibility_states`, `data_gap_rule`, H12, `native_evidence_tiers`, `ranking_stages`, `numeric_summation` and a `changelog`, and revises the text of H04/H07/H08/H10/H11. Weights, matrices, caps and thresholds are unchanged.
- `dataset/score_demo_suitability_v0_3.py`: Python reference.
- `website/suitability-v0.3.js`: browser/server evaluator.
- `website/runtime-adapter-v0.3.js`: new `communityFit`.
- `website/community-engine.js`: uses `communityFit`; adds `shareBasis` and `spacingAreaShare`.
- `server.mjs`: `communityResult` uses `communityFit`.
- `dataset/validate_demo_matching_v0_3.py`: accepts the states and gates listed in the rules; checks that unknown inputs give `data_gap`.

Regenerated with the documented commands (derived outputs only):
- `website/data/operational-v0.3.generated.js`
- `dataset/research/demo-v0_3/example-results/*` (3 files)
- `dataset/location/evaluations/*` (3 files)
- `dataset/location/location-zone-contract-v0_3.json`. Only its copy of the gate text and the rules hash changed. The other location files were rewritten byte-identically, and the location handover was restored by the validator.

Documentation:
- `project-information/V03-RUNTIME-IMPLEMENTATION.md`: one ranking sentence.
- This file.

New:
- `dataset/benchmark/recommender-benchmark-v0_3.json`
- `dataset/benchmark/run_recommender_benchmark.py`
- `tests/recommender-harness.mjs`
- `tests/recommender-benchmark.mjs`
- `tests/recommender-parity.mjs`
- `tests/recommender-audit-snapshot.mjs`
- `tests/recommender-audit-compare.mjs`
- `project-information/recommender-audit/` (baseline and after snapshots, benchmark outputs, `BEFORE-AFTER-v0.3.0-to-v0.3.1.md`)

Not changed: plant CSV, location presets and zones, the v0.2 archive, both pilot handovers, UI/CSS/HTML, `app.js`, `planting-engine.js`.

## 11. Notes for the UI/UX teammate

- **New `eligibility_state` value `data_gap`.** It means "cannot screen: inputs missing", not "bad match". Like `unsuitable` and `excluded`, it is never in the palette (`eligible_for_demo_ranking=false`). Suggested wording: "Needs site data", not "Unsuitable". Its `exclusion_reasons` entry starts with `Data gap:`.
- **New result fields.**
  - `points_withheld_for_unknown_inputs` (0–100): how many points confirmation could still resolve. It is never part of any score; don't present it as a potential score.
  - `native_evidence_tier`: 0 sourced native, 1 unknown/unreviewed, 2 introduced. It explains ranking position.
- **`hard_gate_results` now has 12 entries.** The new one is `H12_MAINTENANCE_CAPACITY`. More gates now show `requires_review` instead of `passed`. Cards that list non-passed gates will show more review items; this is intended.
- **New warning codes:** `restoration_ornamental_exception`, `non_native_label`.
- **Ranking order** is now defined in `rules.ranking_stages`. Display ranking through `PlantscapesSuitabilityV03.ranking`, not a local comparator.
- **Community recipes.** `community.shareBasis === 'plant_count'`. Each row has `percentage` (count share) and `spacingAreaShare` (share of the synthetic spacing footprint). Neither is visible ground cover, and both are estimates.
- **Unchanged terminology:** `conditional_match` still means "simulation may proceed with disclosed review items", and confidence stays a separate 0–100 index, not a probability.
- **Wider effects:** `runtime.candidates()` order changed for tied plants. Any UI test that picks "the first N candidates" may now pick different species.

## 12. How to reproduce

```
python dataset/build_runtime_v0_3.py
python dataset/score_demo_suitability_v0_3.py
python dataset/location/build_location_dataset_v0_3.py
python dataset/location/validate_location_dataset_v0_3.py
node tests/recommender-benchmark.mjs
node tests/recommender-parity.mjs
node tests/recommender-audit-snapshot.mjs project-information/recommender-audit/after-rules-v0.3.1.json "after"
node tests/recommender-audit-compare.mjs project-information/recommender-audit/baseline-rules-v0.3.0.json project-information/recommender-audit/after-rules-v0.3.1.json project-information/recommender-audit/BEFORE-AFTER-v0.3.0-to-v0.3.1.md
```

Set `PLANTSCAPES_ENGINE_ROOT=<folder>` to run the benchmark, parity or snapshot scripts against another copy of the engine, for example a pre-change checkout.
