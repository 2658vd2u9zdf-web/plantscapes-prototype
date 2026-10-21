# Project-demo recommender and plain-language candidate cards

Date: 2026-10-20. Builds on `RECOMMENDER-SYSTEM-AUDIT.md` (v0.3.1). No paid AI call was made.

## Purpose

This version is a project demonstration. Its job is to show how a transparent plant–location recommendation system would work once reliable plant and site data become available. It is not a planting specification.

The normal interface therefore treats a complete set of demonstration values as the working facts of the prototype. Internally, every value keeps its real origin (sourced, inferred, synthetic or unknown). Every record stays `production_eligible=false`. The app already says it is a simulation, so candidates no longer repeat the disclaimer.

## 1. Two separate data experiences

| | Normal demonstration | Missing-information showcase |
|---|---|---|
| Records | the 60 v0.3 plants | 10 variants of 10 of those plants |
| Decision fields | all complete | chosen fields set to `unknown` |
| Where it appears | palette, plans, communities, renders, CSV | only when "Show missing-information examples" is ticked, in its own group, unless the designer chooses **Add anyway** |
| Can be placed? | yes, if it fits | only after **Add anyway**, and only if its size is known |

**Build.** Run `python dataset/project-demo/build_project_demo_v0_3.py`. It reads the v0.3 CSV and `dataset/project-demo/project-demo-fill-rules-v0_3.json`, and writes:
- `website/data/project-demo-v0.3.generated.js`: the view. It holds only the filled values, plus the origin and rule ID of each fill.
- `dataset/project-demo/plantscapes_project_demo_view_v0_3.csv`: every decision field with its value, origin and rule, for reviewers.
- `dataset/project-demo/archive-hashes-v0_3.json`: SHA-256 hashes (LF-normalised) of the 25 research-archive files. The tests check them.

**What was filled.** Environmental fields were already complete in v0.3 and are not changed. 465 values were filled, only where v0.3 has `unknown`, `not_reviewed`, `not_assessed` or `conflicting`. One field is new: regional occurrence.

| Field | Rule (origin) |
|---|---|
| Native status (7 unknown) | Core track becomes native, ornamental track becomes introduced (`demo_inference`) |
| Invasive / legal | Not listed, not protected (`synthetic_demo`) |
| Provenance | Native plants use regional stock, introduced plants use nursery stock (`demo_inference`) |
| Regional occurrence (new field) | Native plants occur widely (`synthetic_demo`); introduced plants occur only where planted |
| Toxicity (41 unknown) | No known hazard (`synthetic_demo`); archived hazards are kept |
| Thorns (57 unknown) | Rhamnus cathartica has thorns (`demo_inference`); the rest are thornless (`synthetic_demo`) |
| Public contact | Thorny or strongly toxic plants are suitable with care; the rest are suitable |
| Edible use | 9 commonly gathered plants have edible parts reported; the rest are not food plants |

**Add anyway (designer override).** Each example card offers an **Add anyway** button whenever the only problem is missing information. This applies to the states Requires review, Needs information and Excluded: information missing, and to fits that only carry an information note.

What happens after Add anyway:
- The plant joins the selection in its normal group. Its card is tagged "Added by you" and still shows its real state, for example "? Requires review". It is never re-labelled as a fit and never ranked with the normal plants.
- A plant whose mature size is known can be used in communities and individual tree placement.
- A plant with an unknown size stays in the list but is never placed. The plan's "Unplaced taxa" list says why.
- Remove takes it out of the selection again.

An override cannot lift a known environmental mismatch, a physical gate or a project-rule exclusion. In those cases the example card says it cannot be added anyway.

The overrides travel with the project as `overrideIds`:
- They are part of the AI context, so the server accepts exactly the same plants.
- They survive a palette rebuild. If a project change now excludes an overridden plant for a known reason, it is dropped and the palette log says why.
- They are marked in the CSV "Fit" column.

**The ten examples:**
1. Native status (Pijpenstrootje)
2. Invasive/legal (Gewone brunel)
3. Public contact (Wilde lijsterbes)
4. Toxicity (Dagkoekoeksbloem)
5. Thorns (Sporkehout)
6. Water levels/hydrology (Moerasspirea)
7. Spread and spacing (Ruwe berk)
8. Provenance (Gewoon reukgras)
9. Regional occurrence (Echte valeriaan)
10. Water levels, light, size and native status together (Zwarte els)

The base plants were chosen because they tolerate most site types, so each example shows its own missing fact rather than a soil mismatch.

## 2. Five stages (`website/recommender-stages.js`)

1. **Site fit: can it grow here?** Soil, moisture, water levels, light, water edge, use and paving, mature size against the measured space, spacing, maintenance and vigour. It uses the v0.3 matrices and weights. This stage never reads project type or policy flags. A site input that wasn't entered shows as "Not entered" and is left out of the score instead of counting as zero. The site score (0–100) gives the level: Strong ≥ 80, Good ≥ 65, otherwise Partial.
2. **Project fit: does it suit this project?** Configured policies in `website/project-policies.js` (see below).
3. **Safety and legal gates: must it not be used here?** These outcomes come from the policies and from the physical gates in stage 1:
   - `not_suitable`: environmental mismatch, water edge missing, permanent water, too large, invasive or prohibited, climbing support missing;
   - `project_rule`: the plant is excluded by a project policy;
   - `missing_mandatory`: required information is missing.
4. **Design preference.** Colour, months, pollinators, and character/role use the v0.3 formula. They only reorder acceptable plants.
5. **Data status.** `result.data` records the missing fields, the origin of every decision field, the demo-filled fields, and `production_eligible:false`. It is never folded into the score.

**States, from best to worst:**
1. Strong fit
2. Good fit
3. Partial fit
4. Requires review
5. Needs information (cannot be ranked yet)
6. Excluded: information missing
7. Excluded by project rule
8. Not suitable

Only the first three can be placed. A partial match in project fit, such as "not native", caps the state at Good fit.

**Ranking order:**
1. state
2. site score
3. project priority tiers (native first; with rewilding or restoration, also provenance and then occurrence)
4. design preference
5. fixture ID

## 3. Project policies are configuration

Each policy has an activation condition and maps each value to an outcome, the text shown, and a message.

| Policy | Activated by | What it does |
|---|---|---|
| Every project | always | Invasive/legal status is mandatory; native plants rank first; provenance gaps go to review; climbing support is required |
| Public access | public access | Public contact, toxicity and thorns; thorns beside a mapped path are excluded |
| Children and schools | audience "students" | Toxic or thorny plants are excluded; unknown values exclude. The current compact UI hides the audience field |
| Rewilding | Rewilding priority | Introduced plants are excluded; unknown native status needs information; regional provenance and occurrence are preferred and ranked |
| Restoration | project type restoration | Ornamental (introduced) plants are excluded unless the ornamental exception is on |
| Low maintenance | maintenance = low | High-demand plants are excluded; high vigour without spread control is excluded |
| Open views | "Preserve open views" or open character | Plants above the height limit are excluded. The limit is 1.3 m, the same as the planting-engine transition height |
| Public harvesting | food harvesting | Toxic plants are excluded; edible use is shown |

Rewilding never changes soil, moisture, light or water-level compatibility. The tests check this for all 60 plants, 3 zones and 10 project variants.

## 4. Candidate cards (`website/candidate-card.js`, `candidate-card.css`)

**Collapsed row:**
- initial;
- common and scientific name;
- one role line, for example "Small native tree for woody structure.";
- one state badge with an icon and text;
- an expand button: chevron with `aria-expanded`, `aria-controls`, and the label "Show details for …" or "Hide details for …";
- a separate remove button with a dashed outline and the label "Remove … from the palette".

**Expanded card:**
1. "Why it fits / needs attention / is not suitable / is excluded" sentence.
2. At most one constraint panel: Important, Information needed, Requires review, Not suitable, or Excluded.
3. Criteria in four groups: Growing conditions, Space and care, Project fit, Safety and rules. Each row has a label, an icon (✓ ~ × ? —), status text, and an optional plain detail.
4. Flowering: the month range in words, a labelled swatch ("Flower colour: yellow"), and the month strip. Highlighted months have a dark border and bold initial, a caption explains the colour, and the strip has a text alternative.
5. Size and role: height, spread, spacing, role and maintenance, with sensible rounding.

**Where each value comes from ("?" buttons).** Every criterion row, and the flowering block, has a round "?" button. It opens a small panel under the row showing, for each plant field behind that row:
- a tag: **From published sources**, **Derived from published sources**, **Demo placeholder**, **Demo assumption** or **Not provided**;
- one plain sentence explaining what the tag means. For the 465 demo fills, this is the fill rule's note;
- what the source itself says, for example "sand, loam, peat" or "9 m";
- the sources as links, with publisher and access date. For placeholders, the list is labelled "Related sources consulted (they do not state this value)";
- whether the site value was entered by you or is a suggested starting value.

Policy rows say which project choice they come from. The data comes from the v0.3 field resolutions and the v0.2 claims and source ledger. The build copies 1,064 claim-to-source links and 106 source citations into `website/data/project-demo-v0.3.generated.js`, and still writes nothing to the archives.

Much of the data is published. Light is sourced for 58 of 60 plants, moisture for 56, mature height for 59 and native status for 53. Soil is derived from sources for 47 plants. Water levels are a placeholder for 58 plants, and their panels say so. The "?" source button is an outlined circle on the right of the row; it is separate from the filled "?" status icon, which means information is needed.

**What lime means.** Lime marks an open (expanded) card only. The same state is also shown by the chevron pointing up, `aria-expanded="true"`, the button label and a green left accent on the card. Flower colour only ever appears in the labelled swatch and in the month blocks the caption describes. Fit states use icons and words as well as colour.

**Removed from the normal UI, kept internally:**
- v0.3 version labels;
- raw and capped scores;
- evidence-confidence decimals;
- `production_eligible`;
- "no real-world clearance";
- synthetic/fallback wording;
- field origins and rule IDs;
- hard-gate codes;
- machine state names.

All of these remain in `item.recommendation`, `item.evaluation` (the full v0.3 reference trace), `item.demoValueOrigins` and `item.demoFillRules`. They are also in the CSV export: plain columns come first, then the v0.3 technical columns. Add `?debug=1` to the URL to see a "Technical details (developer view)" disclosure on each card.

**Also on the palette:** a "plants not shown" disclosure gives one reason per hidden plant, a "Show missing-information examples" checkbox, and an **Add anyway** button on addable examples.

## 5. Integration with the visualisation work

- `community-engine.js` and the server's AI check (`server.mjs`) call the same `PlantscapesRecommender.communityFit`. Tree placement (`planting-engine.js`) uses the recommender's placement-stage result. Plants that are not placeable never reach communities, trees or renders, and this is tested for public, rewilding and low-maintenance plans.
- `ai-ui.js` sends `PlantscapesRecommender.project(...)`, which includes the audience, so browser and server activate the same policies.
- Recipe rows have a "Why this plant" button that reveals the plant's state and reason. Shares are labelled as percentages of plant count, not ground cover, and totals are labelled as prototype estimates. `spacingAreaShare` is unchanged and still not described as cover.
- The camera, render geometry, seasonal positions and illustration labels are unchanged.
- When the recommender is not loaded (the audited benchmark harness), the engines fall back to the v0.3 runtime, so `recommender-benchmark` and `recommender-parity` still measure the reference engine.

## 6. Screenshots

**Before:** screenshots 1–3 supplied with the request. They show a technical summary line, a wall of policy text, and an ambiguous lime button.

**After** (rendered from the shipped modules with headless Edge, in `project-information/project-demo-screenshots/`):

| File | Shows |
|---|---|
| `after-collapsed.png` | Calm collapsed rows |
| `after-expanded.png` | Summary, criteria grid, flowering and size |
| `after-uncertainty-examples.png` | Requires review and Excluded: information missing |
| `after-not-shown-rewilding.png` | One reason per excluded plant |
| `after-source-panels.png` | "?" source panels: a derived value with linked sources, and a placeholder |

The 375 px layout was checked in the browser pane at a true 375 px viewport: no horizontal scroll, 44 px buttons, and criteria in one column. Headless Edge cannot render narrower than about 500 px, so there is no screenshot for it.

## 7. Tests

New:
- `tests/project-demo-data.mjs`: completeness, origins, examples, separation, archive hashes.
- `tests/recommender-stages.mjs`: 6,053 checks covering the Add anyway override, site/project separation, alignment with the v0.3 reference, policies, gates against preferences, reordering, uncertainty states, and browser/server/community/tree alignment.
- `tests/candidate-card.mjs`: 169 rendered cards checked for plain text, the grid, colour labels, accessibility attributes, the toggle and the debug view.
- `tests/project-demo-harness.mjs`: shared loader for the three tests above.

Updated for the new UI (these need Playwright):
- `tests/v03-browser.mjs`: keyboard, examples and 375 px checks added.
- `tests/browser-walkthrough.mjs`.

## 8. Open decisions

1. The fill values are placeholders. Replace them with researched values field by field. The origin column shows what to replace.
2. The open-view height limit (1.3 m) excludes all trees and shrubs under open character. Confirm this is intended.
3. "Toxic if eaten" is a Partial fit under public access. Decide whether that is too strict for common park plants.
4. The children's policy exists, but the compact workflow hides the audience field.
5. The Python reference implements the v0.3 evaluator only. The new policy and state layer is JavaScript only and shared by the browser and server; a Python port would be needed for three-way parity.
6. Several v0.3 synthetic values look odd when shown as facts (for example *Briza media* "prefers a water edge"). They appear as a quiet "~ Prefers a water edge" row and never as a constraint.
