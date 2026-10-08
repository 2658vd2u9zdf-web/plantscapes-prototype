# Plantscapes test package — interactive simulation

The project owner's **approved design policy** is implemented in the prototype. See [the readable rulebook](project-information/PLANTING-PLAN-RULEBOOK-v0.1.md) and its [machine-readable companion](dataset/planting-plan-rules.v0.1.json). Plant traits and numeric trial defaults remain synthetic and need expert validation.

This prototype is for evaluating the workflow, **not for choosing plants for a real site**. It accepts Dutch projects and runs seven stages: project aim → locate and outline → confirm suggested conditions → explore palette → review selection → choose output → concept-plan workspace. Site-fit values, example profiles, quantities and generated arrangements are simulated.

## Open the prototype

Serve this folder locally and visit `http://127.0.0.1:4181/website/index.html`. From the package directory, run:

```powershell
python -m http.server 4181 --bind 127.0.0.1
```

The national name catalogue, simulated species layer and case-study/rule data are bundled in `website/data/`; source datasets and documentation are in `dataset/`. No app server or API key is required. Leaflet, the XLSX reader and the Kadaster/PDOK background map are loaded from external services, so map use and XLSX upload need an internet connection. If Leaflet cannot load, drawing falls back to a schematic board. CSV inventory uploads work locally.

## What to test

- In step 2, choose a starting town, outline a plot with three or more clicks, and finish the boundary. “Use example plot” is a shortcut. This is not address geocoding or a cadastral boundary.
- In step 3, inspect prefilled soil, moisture, hydrology, light, canopy, disturbance, hardscape and water-edge values. These are **synthetic suggestions** from the selected demo area and feature toggles. Correct them and choose a confirmation basis; “Accept synthetic suggestion for test” is deliberately distinct from observation or survey.
- In step 4, inspect the simulated candidates. The separate 54-name native fixture and six ornamental alternatives contain invented traits, native-status assumptions, fit scores, mature spread and spacing; they remain separate from the 2,443-name national taxonomy catalogue. Rewilding excludes the ornamental fixtures. Restoration requires a visible designer override for ornamental alternatives. Expanded cards show dimensions, flowering months and warnings. Choose naturalistic patches or formal bands, and optionally choose recurring flower colours. The flower graphic is a generic illustration.
- In step 5, review the selected and excluded candidates before approving. In step 6, download a CSV explicitly marked **SYNTHETIC** or continue to the plan workspace.
- In step 7, draw and finish **paths first**, then draw planting areas linked to step-3 conditions and choose **Generate concept**. Paths default to a fixed 1.5 m prototype width. The legend is above the map. Naturalistic mode intermingles species within drifts using adjustable relative selection weights; formal blocks remain available. The approved policy places low planting at path edges and taller compatible structure inward, reserves open spaces and water, and tests tree canopy space. Marginal species require compatible confirmed wet conditions and mapped water. Quantities follow per-species spread/spacing fixtures, without a universal species quota or plants/m² minimum.
- Select an individual tree/accent symbol or hatch strip to inspect its placement reason and rule IDs. Change, move, add or remove a plant; changes are rechecked and **Undo plant edit** restores the previous state. A space sketch or mixture-weight change disables stale exports and calls for regeneration. The inspector appears only after selecting a plant.
- The sidebar identifies selected taxa that the demonstration rule did not place. A selected palette is not silently treated as fully planted.
- The design review shows approximate flowering coverage in four seasons, possible winter structure, municipal visibility-review prompts at path ends/bends/crossings, and reasons for missing placements. Designers do not have to draw sightlines. Those prompts are not automatically certified visibility envelopes.
- The view offers side and elevated projections, with discrete direction, season and age controls. It is a vector illustration linked to the actual 2D plan coordinates. Flowering, grass tufts, seedheads, size, season and growth are invented demonstration values—not a photorealistic rendering or ecological forecast. See [the latest workspace and intermingling notes](project-information/WORKSPACE-AND-INTERMINGLING-UPDATE.md) for the algorithm and remaining seasonal-data requirements.
- The mock plan and current schematic view can each be downloaded as SVG. Both files are labelled as demonstrations and are not construction documents. Hatch rendering reduces repeated SVG marks but does not reduce the underlying simulated quantities.

## Evidence and safety limits

All site profiles, ecological traits, fit scores, size and flowering information in `website/data/demo-data.js` are mock records invented solely for interface evaluation. They may be wrong for any actual location or species. Do **not** use them for planting, harvesting, toxicity, procurement, or public-access decisions. The real national CSV is retained as a taxonomy/name catalogue only. Uploaded inventory names remain “verify on site”; no name-only removal advice is given.

The workspace is a concept sketch. Its generated arrangement and view are functional **mockups** only, not construction placement or a validated season/growth simulation. The uploaded image is a visual underlay, not georeferenced.

## Data model and decision logic

The landing page now links the evidence foundation (FLORON, Traitbase and NDFF) and downloads for the source, plant-claim and annotated-case templates. Machine-readable schemas and the full data/decision model are in `dataset/schemas/` and `dataset/PLANTSCAPES-DATA-AND-DECISION-MODEL.md`.

The versioned decision sequence is geometry and paths → eligibility/native policy → confirmed-zone fit → functional patches → mature-spread spacing and competition → seasonal/maintenance review. The browser loads the canonical rulebook through a local JavaScript bundle, so it also works from a file URL when its external map library can load. The executable spatial logic is in `website/planting-engine.js`. Rebuild the rule bundle with `node dataset/build_rulebook_bundle.mjs` after changing the canonical JSON. Name-only and Oudolf-precedent records remain available for manual shortlist exploration but cannot be automatically placed. CSV exports include rule/source references, native-status/spread/spacing fixtures and generated plan traces when available.

The annotated case-study template is ready for the project team's Dutch examples. The package contains no invented case studies. Plans with missing scale, quantities or plant identity should keep those values unknown until reviewed.

## Checks and data location

Run the smoke checks from the package directory with `node tests/smoke.mjs`. The real source CSV is `dataset/derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv`; its browser export is `website/data/catalogue.js`. The synthetic fixtures are in `website/data/demo-data.js` so they can be replaced without contaminating the real catalogue.

The full browser walkthrough uses Playwright and installed Microsoft Edge: `node tests/browser-walkthrough.mjs` with the local server running on port 4181. Screenshots and its check report are saved under `project-information/implementation-checks/`.
