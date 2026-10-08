# Approved rulebook implementation — 8 October 2026

The website now consumes the project owner's approved rulebook, version `0.1.1-approved-design-policy`. The canonical JSON is in `dataset/planting-plan-rules.v0.1.json`; `dataset/build_rulebook_bundle.mjs` creates the local browser bundle. `website/planting-engine.js` implements the spatial checks.

## Behaviour now available

- Define a public-park project, outline a Dutch site, confirm conditions and explore the test palette.
- Select structured naturalistic patches or formal bands/blocks. Optional anchor colours influence composition after site eligibility; rewilding does not apply aesthetic colour preferences.
- Native fixtures are considered first. Non-native fixtures are allowed in ordinary designed landscapes, require an explicit restoration override, and are excluded from rewilding. Name-only and case-study records remain manual shortlist entries and cannot be automatically placed.
- Draw and finish paths before generation. Set their actual design width. Draw each planting zone against the relevant confirmed conditions. Overlapping zones use the most recently drawn zone at a location.
- Reserve paths, open ground and drawn water. Low planting is preferred at path edges; taller compatible planting is available deeper inside. Trees must fit their simulated mature canopy in usable space; no area-based tree quota applies.
- Quantities depend on per-species spacing. The previous blanket two-plants/m² minimum has been removed. Ground planting can coexist with compatible future tree shade; climbers require a mapped support before automatic placement.
- Inspect each symbol's placement reason and rule IDs. Changing species or moving/adding a plant reruns zone, path-edge and spacing checks. Removal and other individual edits can be undone.
- Geometry changes require regeneration before downloading the plan or linked view. Four seasonal states show flowering coverage and a winter-structure review prompt.
- Path endpoints, bends and crossings carry municipal visibility-review prompts. The designer does not draw sightlines, and the prototype does not certify visibility.
- CSV exports include the rule version, source references, spacing/native-status fixtures and generated plan traces when available. Plan and view SVG exports remain concept demonstrations.

## Verification

`node tests/smoke.mjs` passed the native policy, canonical-rulebook consistency, path-first gate, mature-spacing quantity changes, path width, low edge planting, soil/moisture/light and wet-edge gates, climber-support gate and name-only exclusion checks.

`node tests/browser-walkthrough.mjs` completed the seven stages in Microsoft Edge with **51 visible candidates for the Delft test** and no JavaScript errors. It checked expanding/removing/restoring plants, CSV download, the path gate, plant drawing on the map, the linked view, individual plant removal/undo, SVG download, disabling stale output and mobile width. Its report and screenshots are in `implementation-checks/`.

Two existing runtime errors were fixed: undefined `color` and `renderer` variables in plant-map rendering. The map also now permits close zoom for small plots; background tiles are enlarged above their native zoom.

## Data and implementation limits

The numeric edge widths, height limits and patch sizes in `prototype_parameters` are experiment defaults. Mature spread, spacing, native-status labels, ecological fit, flowering and growth of the 60 fixtures are simulated. None has been upgraded to reviewed botanical evidence by approving this rulebook.

The current ground layers use aggregate hatch cells and a sample of individual accents. Their shapes approximate the underlying positions; the quantity key retains every generated plant. Large sites have a 12,000-placement preview limit and need subdivision for complete quantities.

Existing inventory names remain site-verification items. A surveyed existing-tree/root-protection geometry workflow, municipal visibility-envelope import, seed-mixture rates, verified edible-use records, structural support mapping, and validated species-level competition/seasonal persistence data remain to be added. The current implementation gives review prompts or withholds automatic placement for these gaps. Productive-garden use still cannot certify harvesting.

Map-library loading and XLSX imports need the external libraries to be reachable. If the map library cannot load, the fallback is unscaled and cannot generate a metric planting layout. All rule and trait bundles themselves are local, so file-URL use does not need a backend or API key.
