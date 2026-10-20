# Compact workflow — 19 October 2026

Visible stages: Project, Site, Conditions & colours, Candidates, Output, Planting plan, Camera & render. Internal historical stage IDs remain 1,2,3,4,6,7,8 so existing application hooks still work.

Removed productive/other project choices, audience, maintenance capacity, project notes, constraints, food/learning priorities, distinct site zone UI, separate shortlist review, composition controls and design review. One internal site profile remains for the engine. Maintenance is recorded as unknown rather than silently treating a hidden default as a designer choice. Food harvesting is not requested or enabled; edible information in records remains informational. Restoration stays native-only without the previous ornamental override control.

Conditions are accepted by the Confirm & explore candidates button, retaining synthetic provenance. Removing the source selector does not promote synthetic soil estimates to surveyed evidence. Recurring flower colours live on this screen.

Location search: type a place and press Enter, choose a PDOK result. Boundary toolbar has labelled icon controls; Enter closes a boundary or drawing when focus is on the drawing surface. Roads and water are queried from OpenStreetMap using the boundary bounding box plus 10 m, followed by local geometric checks for intersections, containment and segment proximity. Individual polygons and relation member geometry are supported. Very large sites (>2 km²) and failed lookups require manual confirmation. Relation holes and ways whose vertices fall outside the query extent can limit completeness. No detection is not proof of absence. Soil remains simulated. Live PDOK search succeeded; Overpass live checks returned HTTP 406 (main instance) and 500 (alternative), so live water/road detection has not been verified. Geometry behavior was tested with fixtures.

Camera screen shows only the plot's geometry and plants, clipped to its boundary. Perspective only; seasons and age milestones remain. Render with AI is visible and opens setup if disconnected. Local key setup remains in Start-Plantscapes.ps1, never browser storage. No paid requests were made for this change.

Schematic plants now use volume and flowering colour. Repeatable display instances follow community density and count shares within cells, validated against planting geometry. The 65 m view radius and 14,000 display-instance cap are rendering limits, not planting quantity caps. Close cells are prioritized. Assets and growth remain illustrative; higher visual density is not a botanical validation. Species mixture edits apply to the entire selected community, not one sampled dot; the UI names that scope. Individual trees and manual plants retain individual editing.

AI reference is cropped to 900 × 415, with all annotation text and legend swatches removed. It preserves the current eye-level camera. The existing provider output is a square low-quality draft and may reinterpret composition; it is not a geometry-accurate renderer. No new model training or plant asset library was added.

Checks: tests/workflow-clean.mjs covers visible stages, geocoding fixtures, 10 m spatial matching, Enter completion, no-path generation, mix remove/undo, stable seasonal positions, denser preview, crop dimensions, mock on-page image generation and 375 px layout. tests/ai-server.mjs checks private key handling, schema gates, cache and allowance with mocked provider calls. Older walkthrough scripts target the superseded workflow and are not the acceptance test for this redesign.

Sources: https://www.pdok.nl/-/oude-url-s-pdok-locatieserver-per-vandaag-uit-productie ; https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL ; https://developers.openai.com/api/docs/guides/image-prompting
