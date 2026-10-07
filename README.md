# Plantscapes test package — interactive simulation

This prototype is for evaluating the workflow, **not for choosing plants for a real site**. It accepts Dutch projects and runs seven stages: project aim → locate and outline → confirm suggested conditions → explore palette → review selection → choose output → concept-plan workspace. Site-fit values, example profiles, quantities and generated arrangements are simulated.

## Open the prototype

Serve this folder locally and visit `http://127.0.0.1:4180/website/index.html`. From the package directory, run:

```powershell
python -m http.server 4180
```

The national name catalogue, simulated species layer and case-study/rule data are bundled in `website/data/`; source datasets and documentation are in `dataset/`. No app server or API key is required. Leaflet, the XLSX reader and the Kadaster/PDOK background map are loaded from external services, so map use and XLSX upload need an internet connection. If Leaflet cannot load, drawing falls back to a schematic board. CSV inventory uploads work locally.

## What to test

- In step 2, choose a starting town, outline a plot with three or more clicks, and finish the boundary. “Use example plot” is a shortcut. This is not address geocoding or a cadastral boundary.
- In step 3, inspect prefilled soil, moisture, hydrology, light, canopy, disturbance, hardscape and water-edge values. These are **synthetic suggestions** from the selected demo area and feature toggles. Correct them and choose a confirmation basis; “Accept synthetic suggestion for test” is deliberately distinct from observation or survey.
- In step 4, inspect the simulated candidates. A separate 54-name fixture contains invented traits and fit scores; it is never merged into the 2,443-name national taxonomy catalogue. Expanded cards show simulated size, flowering months and blossom colour, and warnings. The flower graphic is a generic illustration, not a species photograph.
- In step 5, review the selected and excluded candidates before approving. In step 6, download a CSV explicitly marked **SYNTHETIC** or continue to the plan workspace.
- In step 7, the step-2 boundary appears automatically. Draw paths, open ground, planting zones and water, then choose **Generate demo plan**. The simulation places two or more individual plants/m² in eligible planting zones (subject to its safety cap and tree buffers), then displays species-coded hatch masses and individual tree/accent symbols. The SVG plan is aggregated to keep it readable; its species key retains the simulated quantities. Counts, placements, spacing and mature footprints are placeholders, not reviewed planting rules.
- Select an individual tree/accent symbol on the map or in the sidebar to change its species, move it or remove it. Use “＋ Plant symbol” to add one. Hatch masses are aggregate notation, not individual plants. Editing an individual updates the plan and schematic view; changing a space sketch calls for regeneration.
- The sidebar identifies selected taxa that the demonstration rule did not place. A selected palette is not silently treated as fully planted.
- The view has discrete direction, season and age controls. It is a vector illustration linked to the 2D symbols. Flowering, size, season and growth are invented demonstration values—not a photorealistic rendering or ecological forecast.
- The mock plan and current schematic view can each be downloaded as SVG. Both files are labelled as demonstrations and are not construction documents. Hatch rendering reduces repeated SVG marks but does not reduce the underlying simulated quantities.

## Evidence and safety limits

All site profiles, ecological traits, fit scores, size and flowering information in `website/data/demo-data.js` are mock records invented solely for interface evaluation. They may be wrong for any actual location or species. Do **not** use them for planting, harvesting, toxicity, procurement, or public-access decisions. The real national CSV is retained as a taxonomy/name catalogue only. Uploaded inventory names remain “verify on site”; no name-only removal advice is given.

The workspace is a concept sketch. Its generated arrangement and view are functional **mockups** only, not construction placement or a validated season/growth simulation. The uploaded image is a visual underlay, not georeferenced.

## Data model and decision logic

The landing page now links the evidence foundation (FLORON, Traitbase and NDFF) and downloads for the source, plant-claim and annotated-case templates. Machine-readable schemas and the full data/decision model are in `dataset/schemas/` and `dataset/PLANTSCAPES-DATA-AND-DECISION-MODEL.md`.

The palette demo now shows explicit screening, site-fit reasons and area-based layer caps. Each included demo plant has an expandable decision trace; screened candidates include a reason and remain visible for audit and CSV export. The versioned rule sequence is eligibility → zone-fit score → project constraints → layer caps → designer review. Its inputs, thresholds and scores are still synthetic fixtures. The app does not yet consume the plant-claim records or planting-community templates as production recommendations.

The annotated case-study template is ready for the project team's Dutch examples. The package contains no invented case studies. Plans with missing scale, quantities or plant identity should keep those values unknown until reviewed.

## Checks and data location

Run the smoke checks from the package directory with `node tests/smoke.mjs`. The real source CSV is `dataset/derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv`; its browser export is `website/data/catalogue.js`. The synthetic fixtures are in `website/data/demo-data.js` so they can be replaced without contaminating the real catalogue.
