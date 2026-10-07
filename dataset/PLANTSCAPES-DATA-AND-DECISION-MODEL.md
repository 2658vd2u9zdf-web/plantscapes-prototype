# Plantscapes data and decision model

This model supports a traceable expert workflow for Dutch planting design. The web demo currently runs on synthetic ecological traits. Do not treat its ranks or mock plans as site advice.

## Separate the evidence types

1. **Taxon identity:** accepted scientific name, Dutch names, synonyms, taxonomic authority and stable identifiers.
2. **Plant claims:** one sourced claim per trait (for example flowering start, soil pH, light or mature spread), including source, page/URL, edition or dataset version, rights/licence, reviewer, review date, confidence and geographic scope. Never let a taxonomic name record imply ecological traits.
3. **Occurrence:** where and when a taxon was recorded, with spatial resolution, sensitivity/generalisation, source and licence. Presence-only records must not be interpreted as absence.
4. **Site evidence:** geometry and zones, observed and measured conditions, map estimates, date, source and confidence. Keep these evidence bases visibly distinct.
5. **Planting community:** an expert-designed mix for a defined condition envelope. Record functional layer, target proportion or plants/m², spacing, spatial pattern, seasonal roles, establishment, maintenance and exclusions.
6. **Case study:** a drawn plan with scale, legend, site context, zones, species and quantities, design rationale and maintenance. Link each digitised annotation to its exact page/figure and rights status. Case studies are pending project-team input; none are fabricated in this package.

Templates live in `dataset/templates/`. Add rows only when the source can be cited and its reuse terms are recorded. Use `synthetic` only for clearly labelled prototype fixtures.

## Source order for evidence

- Start with FLORON's Dutch species lists and Traitbase for names, trait and habitat records.
- Use NDFF/Verspreidingsatlas for occurrence context, respecting its spatial generalisation and the rule that a missing record is not evidence of absence.
- Use BRO/PDOK and other mapped layers as provisional spatial evidence, with dataset date, scale/resolution and known limitations recorded.
- Use flora books and field guides as cited expert references. Scans can help transcribe records, but OCR output requires page-by-page checking; access to a copy does not itself settle reproduction or redistribution rights.
- Use field surveys, soil tests, water-level information and existing vegetation inventories to confirm local conditions.
- Keep cultivated, heritage-fruit and edible taxa in a distinct track from wild native taxa. Require reviewed edible-part, preparation and safety claims before displaying harvesting advice.

## Recommendation logic

The demo follows this explainable sequence:

1. **Eligibility:** screen out candidates that conflict with confirmed hard constraints (for example aquatic layer without a wet edge, or demo tree-layer area/root-space limits).
2. **Site fit:** score soil, moisture and light evidence by zone; lower or withhold the score when a condition is unknown.
3. **Project fit:** apply small, visible adjustments for project aim, spatial character, maintenance and sightlines.
4. **Composition limits:** apply area-dependent layer caps and preserve all screened-out reasons for review/export.
5. **Designer decision:** allow removal, restoration and manual additions. Manual name additions are explicitly not presented as site recommendations.

The current weights and thresholds are interaction fixtures only. Replace them with expert-reviewed ranges and planting-community rules. Do not add a minimum species count to force a result. Each production recommendation must retain a machine-readable trace of eligible checks, scored evidence, hard exclusions, uncertainty and rule/data versions.

The plan workspace currently adds a small illustrative composition grammar: selected taxa are placed in loose drifts by layer, with more separation for woody symbols, within the plot and user-drawn planting areas, while avoiding open-ground and water sketches. The drift radii and counts are arbitrary UI fixtures. They do not account for real scale, mature spread, density, soil capacity, establishment or sightline geometry. The next rule layer should read reviewed planting-community templates and annotated cases to set those values and spatial patterns.

## How annotated plans will be used

Annotated Dutch cases will become structured precedents and tests. Extract site and zone geometry, scale, paths and sightlines, plant groups/layers, species, counts or densities, spacing, pattern, seasonal intent, maintenance and designer rationale. Record uncertain or illegible annotations as unknown rather than guessing. Use precedents first for retrieval and validating templates; derive general rules only after comparison across multiple independently reviewed cases. Keep the original scan, extracted annotation and derived rule as distinct objects with provenance and rights metadata.

## Review and validation

Every trait claim and planting-community template needs a named reviewer, review date, evidence link and confidence. Evaluate rules against held-out sites and plans with a botanist and planting designer. Check ecological fit, spatial composition, establishment and maintenance separately. A visually plausible diagram is not evidence of a viable plan.

## Current limits

The browser demo's local list provides a useful taxonomic name catalogue, while its site conditions, trait values, suitability scores, image placeholders, densities and generated plan symbols are synthetic. It has no connected Netherlands soil or habitat lookup. Nationwide project entry is supported, but evidence coverage is not nationwide. The CSV labels simulated decisions and unresolved checks.
