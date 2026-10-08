# Spatial view and legend update

Implemented following the screenshot feedback, 8 October 2026.

- Nine pattern families (both diagonals, horizontal, vertical, grid, crossed diagonals, chevrons, broken lines and dots) combine with taxon colours. The map, sidebar key and SVG export share one pattern renderer. Numbers mark a representative patch; trees are numbered in the export.
- A visible symbol key explains tree centres, shrub centres, sampled perennial positions, mature crown envelopes, visibility-review prompts and drawn ground surfaces. These are plan notation, not blossom colours. Quantities retain all generated positions, not just visible sampled dots.
- The export has a dynamically sized, two-column species key with separate Dutch-name and Latin-name lines. Plan proportions now share one metric scale rather than stretching latitude and longitude independently. It is still not construction documentation.
- The elevated oblique view uses the actual boundary, path width, planting polygons, water and open-ground polygons. Direction and lower-angle controls change the projection. All woody placements and sampled perennials are drawn in depth order. A single vertical scale preserves relative fixture heights; it does not predict actual growth or simulate terrain.
- The camera marker is shown when drawn. This oblique diagram is **not** a calibrated camera-perspective rendering. Seasonal months and age multipliers remain mock snapshots.
- Water drawings link to a confirmed condition zone. Marginal plants require compatible wet conditions and mapped water. They are no longer spread across ordinary land beds. Terrestrial species cannot go in the water. The mock shoreline uses a 1.2 m band on either side of the edge; this is a horizontal geometric assumption, not surveyed depth or a planting prescription.
- Aquatic notation includes the current marginal species. Deep-water, floating and submerged planting is not implemented: there are no reviewed depth, hydroperiod, flow or water-quality tolerances in the current fixture set. The interior remains open and the limitation is reported; the tool does not silently substitute wet-edge plants for deep-water species.
- The design review explains tree numbers. The existing generator tests **at most one tree per selected tree taxon per bed**, with full mature crown clearance from excluded areas and paths. Open spatial character omits trees. Low counts can reflect this sampling limit as well as plot dimensions; there is no justified universal tree percentage. Rootable soil volume, infrastructure clearance and canopy targets remain unresolved.

## Verification

`node tests/smoke.mjs` verifies shoreline-only marginal placement, no terrestrial water placements, no aquatic planting without mapped water, nine hatch patterns and all three ground surfaces in the view, alongside the existing approved-rulebook tests.

`node tests/browser-walkthrough.mjs` runs the seven-stage flow in headless Edge, checks the pattern/symbol key, angle controls, exports, reversible edits, stale-plan protection and mobile width. Its explicit synthetic 2,000 m² wet-park fixture generated 309 marginal positions and displayed paths, open ground and water without browser JavaScript errors. Screenshots and the SVG sample are in `implementation-checks/`.

Frontend-design guidance informed the shared visual notation, geometry-linked illustration and accessible, persistent legend while retaining the existing green-and-blue identity.
