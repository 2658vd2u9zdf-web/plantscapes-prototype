# Workspace and intermingling update

8 October 2026 — implemented from the user's step-7 feedback.

## Workspace

Map-first layout, existing forest-green / pond-blue identity and system typography retained. The persistent symbol legend and collapsible species key now precede the map. Generate and Download are compact header actions with one inline status, rather than a separate arrangement bar. Paths use a fixed 1.5 m prototype width.

Removed the camera tool, Add demo path & generate, example-space button, centre-placement button, large introduction/path-width box and the redundant spatial-view subtitle. View choices are Side view and Elevated view. Full design-review notes are below the visual in a disclosure.

The condition selector assigns a confirmed step-3 zone to the **next** drawn planting or water polygon. It neither measures soil nor creates water. A persistent explanation and a link back to the condition screen now say this directly. Species to add selects one plant for the Add plant map tool, with an explicit helper line.

An inactive plant inspector is hidden. Selecting a placed plant exposes actual replace/move/remove controls; replacement options are filtered for that position's fit and spacing and failures are displayed locally. Undo plant edit follows the editor. Mixture settings, layers/underlay and unplaced taxa are progressively disclosed.

The requested ui-ux-pro-max skill informed labels, feedback, top-positioned legends, visible focus, grouped controls and progressive disclosure. Its first search was off-topic; the narrower form search returned applicable labels/feedback guidance. Progressive disclosure and legend placement came from its full quick-reference rules. Frontend-design reinforced retaining the established site identity and cutting redundant copy and panel decoration.

## Mixed planting algorithm

- Naturalistic mode now intermingles species at individual positions, using deterministic coordinate-derived seeds. Points are jittered rather than aligned as a regular lattice.
- Nearby drift cells retain a leading species for 55% of selection trials; other trials use a weighted selection from compatible species. This is a prototype clustering setting, not a claim about an Oudolf recipe.
- Default weights are 45 grasses/sedges, 45 flowers/herbs and 10 structural perennials/shrubs. They are **relative trial weights**, not guaranteed planting quantities, canopy percentages or ground cover. Each role weight is divided across its available species. If no positive-weight role fits a particular position, eligible plants receive equal fallback weight rather than leaving an artificial void. Final actual non-tree count percentages are reported separately.
- Mature spread/spacing, exclusions, path-edge height, shade, soil and hydrology gates still take priority. Trees remain separately allocated with crown-clearance checks. Formal blocks retain the previous single-species grouping option.
- Shared map cells use count-proportional hatch strips instead of overlapping full-cell hatches. These show cell composition, not literal single-species beds or verified cover. The spatial illustration draws actual individual coordinates, without checkerboard species-fill rectangles.
- Engine algorithm version: `intermingled-fixtures-v0.3`. The approved ecological rulebook remains unchanged; mixture settings are separate prototype inputs.

Primary design reference: [Planting Fields Foundation, Domes in the Matrix](https://plantingfields.org/domes-in-the-matrix/), 26 August 2026, describes the Oudolf garden's interwoven grass matrix and repeated flowering groups. It supports the design direction, **not** the numerical weights or jitter defaults used here.

## Seasonal depiction and rendering decision

Grasses use multi-blade tufts and seedheads. Flowering uses mock month ranges; autumn/winter grass colour and seedheads use group-level fixtures. Winter trees use bare branch diagrams. The same plan coordinates persist across all seasons. Year multipliers apply to woody geometry, not repeated relocation of plants. These generic glyphs do not depict species-specific habits reliably.

A lightweight 3D renderer is technically feasible now for **schematic** geometry and orbiting views; the imperfect ecological dataset does not prevent a labelled mock. Three.js supports efficient repeated geometry through [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html). No new rendering dependency was installed in this change: the user asked to assess whether it is needed, not to choose or install one.

Before credible species-specific four-season rendering, add reviewed height/spread and habit; basal foliage versus flowering-stem dimensions; spring emergence/dormancy; evergreen/deciduous state; flowering colour/window; autumn foliage; seedhead persistence and collapse; maintenance/cutting dates; planting age and growth stages; plus traceable rights for any plant meshes/textures. Site terrain/elevation, geometry, units, lighting and camera calibration are separate requirements. Better graphics cannot validate unsuitable species, invented traits or growth predictions.

## Verification

Smoke tests include deterministic regeneration, mixed species within small cells, role-weight effects, no aquatic placement without water, spacing, geometry and ecological gates. Headless Edge tests exercise direct map drawing (no demo shortcut), selection editor/undo, top legend, mix-change invalidation, mobile width, all four seasons, grass tuft symbols, and stable coordinates while switching seasons. Screenshots and exported examples are in `implementation-checks/`.
