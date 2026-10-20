# Render scene basis

The spatial view now includes a local plan for camera placement. Select Camera position, click a path, then click a target. Position snaps onto the nearest path. Moving the camera preserves its direction until a new target is selected. Keyboard-accessible path and highlight presets remain available. Camera edits do not regenerate planting or call an AI provider.

Export render scene downloads `plantscapes-render-scene.json`. Schema `plantscapes-render-scene/1` contains:

- Local metres: X east, Y north, Z up; WGS84 origin in latitude/longitude order.
- Perspective camera at 1.6 m, horizontal target, near plane and pixel intrinsics matching the path schematic (900 × 550, focal length 550 px, principal point 450,260).
- Boundary, paths with 1.5 m width, planting, open ground and water geometry.
- Plant identifiers, dimensions, flowering months and explicit empty asset slots.
- Individual positions and separately labelled display samples.
- Full-area community cell polygons, density, species count shares and estimated quantities.

This is a renderer handoff, not a Blender scene or a photorealistic renderer. Export camera describes path perspective even if the user is inspecting a side/elevated preview; the selected preview is recorded separately.

## Next renderer contract

1. Import metre geometry on a flat ground plane. Surveyed terrain can replace the explicit flat-ground assumption later.
2. Assign reviewed species assets by plant ID. Keep approximate assets labelled. Store licensing and source information alongside assets.
3. Retain individual tree positions. Generate deterministic, seeded instances inside community cells according to count shares, spacing and exclusions. Do not treat display samples as complete planting quantities or add them on top of fully instanced communities. Current quadrature cells approximate edges: clip to exact boundary and exclusions before instancing.
4. Persist generated instance IDs and positions across cameras and seasons. Do not redraw the arrangement for each image.
5. Produce RGB, depth and species/region masks from the same camera. Use those as optional image-edit guidance; any AI output remains illustrative and needs comparison against geometry.
6. Validate a small reference bed across four seasonal states before increasing scale. Existing height, spread, flowering and growth fixtures are not a reviewed seasonal asset library.

No API key is exported and no paid calls are required. The JSON does include the site's geographical origin; treat it as project data when sharing.
