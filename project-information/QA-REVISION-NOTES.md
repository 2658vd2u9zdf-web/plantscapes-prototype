# QA revision notes — Plantscapes

This package responds directly to the persona QA report dated 10 September 2026.

## Implemented in this revision

- Candidate generation applies confirmed moisture, light, habitat-zone, site-area, water-edge, public-contact, edible, low-toxicity, road-stress and sightline constraints before rendering.
- The candidate list is expanded with a curated Dutch native-flora reference set. Records remain candidates, not a substitute for a live occurrence or procurement database.
- The review screen exposes an inclusion trace and explicit explanations when trees, shrubs or riskier species are withheld.
- Step 2 adds nutrient status, wetness duration, maintenance intent, road stress and public-contact conditions. These respond to the report’s finding that the first context form did not adequately describe wetland, roadside and public-realm constraints.
- Navigation now uses a consistent left-side back action on all workflow screens; the wordmark returns to Home.
- Export is labelled `candidate review`, includes the confirmed context and carries a non-specification warning.

## Deliberately still out of scope

- Live municipal / provincial distribution querying and a verified provenance or nursery-availability feed.
- Zone polygons, plant quantities, densities, costs and construction drawings.
- Rewilding at landscape scale, heritage orchard mode and cultivar/rootstock planning.
- Definitive retain/remove recommendations from uploaded inventories.

## Quality-control prompt

Test the default Pijnacker brief and at least one wet-margin and one road-edge brief. Check that every displayed species matches the chosen filters and that withheld structural layers have a comprehensible explanation. Treat a low result count as a data-coverage or context-validation signal, never as permission to add mismatched plants.
