# Expert QA response 2 — Plantscapes

This response addresses `UPDATED-EXTREME-PERSONA-QA-REPORT.md`.

## Corrected in the prototype

| Report issue | Change |
| --- | --- |
| Thorny candidates passed a public-contact screen | A structured hazard list now excludes blackthorn, dog rose, hawthorn and the other listed hazardous records whenever public contact or low toxicity is selected. Hazard tags remain visible when the screen is not active. |
| Wet margin excluded wet-compatible herbs, rushes and sedges | Wet-margin and wet-meadow zones now use the wet trait rather than a category gate. |
| Hydrology, road stress, food forests and heritage orchards overstated the prototype | These briefs are now blocked with a specific specialist-data hand-off rather than a misleading shortlist. |
| Decorative controls implied false resolution | Soil character, canopy, disturbance, pollinator aim and seasonal aim are explicitly marked record-only. The result trace distinguishes them from active screening factors. |
| “Map-informed” was unsupported | Replaced with “User-confirmed prototype context.” |
| Inventory promised removal advice | Copy now promises field verification only. |
| Refinement was irreversible | Review edits now carry a visible change log and Reset changes restores the generated set. |

## Not fixed because a defensible dataset is required

1. **Record-level evidence and versioning.** The prototype carries a curated static list, not individual Traitbase/Verspreidingsatlas records with licence, date and regional occurrence. Needed: an export/API with stable taxon IDs, source URLs, release date, licence, native status, Red List status and South Holland occurrence grid.
2. **Road-edge tolerance.** Needed: reviewed fields for de-icing salt, splash, compaction, drought, pollution, root volume and maintenance tolerance. The current system deliberately routes these briefs out.
3. **Hydrological restoration.** Needed: species-level depth, duration, frequency, seasonal drawdown, salinity, flow, sediment and bank-gradient ranges, plus establishment and monitoring guidance. A wet/not-wet flag is not sufficient.
4. **Food landscapes and heritage orchards.** Needed: a food-safety and cultivar dataset with edible part, preparation, allergens, toxic look-alikes, rootstock, bloom group, pollination compatibility, harvest, training, disease, supplier and availability fields.
5. **Site-scale soils.** PDOK/BRO is valuable national context, but its own guidance says it is not suitable alone for local/perceel decisions and urban ground can differ materially from mapped soil. It must be combined with a site survey and soil tests.

## Geography decision

The interface remains a **South Holland small-site pilot**. FLORON’s standard Dutch flora list and Traitbase can support a future Netherlands-scale *catalogue*, but a national boundary does not provide the missing local traits, provenance, safety or site survey. Geographic expansion is therefore deferred until the data model is complete.

## Validation completed

- JavaScript syntax checked for both the source build and this packaged copy.
- Safety regression checked: `Prunus spinosa`, `Rosa canina`, `Crataegus monogyna` and `Digitalis purpurea` all fail the public-contact / low-toxicity screen.
- The default small, sunny Pijnacker example remains a candidate-review flow; it is not a validation of road, restoration, food or orchard suitability.

## Required inputs for the next build

- A licensed, versioned Traitbase/Verspreidingsatlas extract or API access with stable species identifiers and field definitions.
- A botanist-reviewed hazard ontology for public-facing plantings.
- A hydrology/restoration trait table and a road-edge tolerance table.
- If food/heritage modes are desired: a Dutch cultivar/rootstock and food-safety source approved for reuse.
