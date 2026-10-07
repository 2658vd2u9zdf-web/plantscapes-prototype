# Response to persona QA report

## Implemented remediation

- Replaced whole-catalogue generation with contextual filtering.
- Filtered by Pijnacker–Delft pilot coverage, site area, site type, confirmed light and moisture, selected habitat zones, edible preference, and low-toxicity preference.
- Excluded generic “prototype candidate” padding records from recommendations.
- Added open meadow, dense habitat edge, wet meadow, wet-margin, and road-edge zone inputs.
- Removed the global tree/shrub/herbaceous ratio; the output reports the actual woody versus herbaceous candidate count instead.
- Reframed the output and export as a candidate review rather than a planting specification.
- Changed existing-inventory decisions to verification-only; the prototype no longer tells a user to remove a plant.
- Removed generic plant images, which were unsuitable for identification.
- Turned future-feature buttons into non-interactive roadmap items.

## Still blocked by data or scope

- Species-level spread, density, establishment, maintenance, provenance, supplier availability, compatibility, and cited trait records.
- Site-plan drawing, polygons, quantities, and zone schedule generation.
- Hydrology depth/duration, soil chemistry, restoration, grazing, and monitoring logic.
- Productive landscape, heritage orchard, cultivar, rootstock, pollination, and harvest data.
- Landscape-scale or out-of-region support.

## Data requested for the next iteration

1. A licensed, Pijnacker–Delft-relevant species dataset with scientific and Dutch names, native/provenance status, soil/moisture/light traits, mature spread, density, height, flowering, toxicity/edibility, maintenance, and source/version.
2. A compact zone-based test case for one real pilot site, including zone polygons or a simple plan, soil observations, water regime, and target vegetation/management intent.
3. If food or orchard modes are in scope: a cultivar-level dataset with rootstock, pollination group, harvest period, disease resilience, availability, and verified safety/allergen fields.
