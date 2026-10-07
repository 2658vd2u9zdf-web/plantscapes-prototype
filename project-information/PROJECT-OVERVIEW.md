# Plantscapes — project overview

## Purpose

Plantscapes supports landscape architects in the Netherlands through early planting design. It separates design intent from ecological context, asks the designer to confirm site zones, and keeps the evidence limits visible. Final plant choices, field checks and specialist sign-off remain with the designer.

## Current workflow

1. **Project aim:** type of project, area, audience, three priorities, maintenance, spatial character and hard constraints.
2. **Locate and outline:** user-entered site name, a selectable demo map area, click-to-create plot polygon, description, observed features, named zones and optional existing-plant inventory. There is no live geocoding or cadastral lookup.
3. **Confirm conditions:** an invented regional profile and site-feature inputs prefill soil, moisture, wetness regime, light, canopy, disturbance, hardscape and water edge by zone. The designer corrects each value and identifies whether confirmation is for testing only, observation, survey/test or an existing document.
4. **Planting palette:** a separate synthetic trait fixture produces a test candidate list grouped by layer. Every entry can be expanded, removed and restored. The national taxonomy list remains a name-search catalogue only.
5. **Review selection:** a standalone summary makes selected and excluded candidates, zones and unresolved checks visible before approval.
6. **Output choice:** immediate CSV candidate-review download, explicitly marked synthetic, or an interactive spatial sketch.
7. **Plan workspace:** the step-2 boundary carries forward onto a complete illustrative local basemap. Draw paths, open ground, planting zones and water, then generate a deterministic symbolic placement from the approved demo taxa. Select, move, add, remove or change symbols; the linked vector view updates immediately. Direction, season and age are labelled mock snapshots. Both mock plan and view can be exported as SVG. An optional uploaded image remains a non-georeferenced underlay.

## Data policy

The included 2,443 records are a **national vascular-plant taxonomy list**, not a site-suitability dataset. A separate 54-name fixture in `website/data/demo-data.js` invents conditions, traits and scores for interaction testing only. All resulting candidates are labelled simulated, not evidence-based recommendations. Local occurrence, native status, hydrology, dimensions, safety, food use and planting density remain unverified. No existing plant is advised for removal from a name alone.

Before an evidence-based recommender is enabled, the team needs locally reviewed occurrence and native-status records, cited habitat tolerances, public-contact hazards, source licences and reviewer/version metadata. The current plan generator is a simulation; a real one needs surveyed geometry, spatial constraints, spacing/density and establishment rules. A realistic visualisation would need licensed plant imagery and validated phenology/growth milestones.

## Expert-review questions

1. Does the separation of purpose, site description and confirmed conditions match how you begin a real project?
2. Are the zone fields sufficient for your project type? Which missing variable would change your decision?
3. Is the distinction between a taxonomy name and a recommendation unmistakable?
4. Does the CSV make unresolved verification work clear enough for handover?
5. Would you sketch over a map, an uploaded drawing or both? What spatial scale and precision would you require?
6. Which rule and source would you trust for turning a confirmed zone into a plant arrangement?
