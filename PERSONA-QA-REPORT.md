# Verdant persona QA report

**Test date:** 10 September 2026  
**Tested packages:** `planting-palette-assistant/dist` and `Verdant-Test-Package/website`  
**Scope:** critical expert review of the site-brief, context and palette workflow. The two supplied builds contain matching HTML and JavaScript, so the findings apply to both.

## Executive verdict

**Not satisfactory for professional planning in any of the five scenarios.** The prototype is a clear, calm and review-oriented *catalogue browser*, but it is not yet a site-responsive planting-palette assistant. In an end-to-end reflooded-wetland run, I entered a peat/wet/water-edge context and received **100 candidates (20 in every category)**, including dry meadow plants, woodland/urban species and 20 trees. The stated site conditions, site type, area, brief and priorities do not presently determine the generated list.

The disclosure that this is an early prototype and must be checked against a site survey is responsible. It does not compensate for a result labelled “Your regional planting palette” that contains known context mismatches. Experts would use it only as an untrusted browsing list, not as a basis for a specification.

## Method and evidence

I completed the visible three-step workflow using a demanding reflooded-wetland brief: 1,200 m², peat, wet/periodically inundated, sunny, water edge, no hardscape and no open-sightline constraint. The application displayed “100 regional candidates” with all five categories at 20 candidates. Examples visibly retained despite the wet context were duizendblad (*Achillea millefolium*), knoopkruid (*Centaurea jacea*), rood zwenkgras (*Festuca rubra*), trilgras (*Briza media*), beuk (*Fagus sylvatica*) and other dry/fresh or non-wet candidates.

I also inspected the delivered interaction logic and data. The generation action copies the entire catalogue into the result; its existing `eligible()` filter is never used. Consequently the scenario findings below are behavioural findings, not speculative comments. “Prototype candidate” records also use broad placeholder traits such as “See species record” and “Check species record”, so their suitability cannot be professionally assessed in-app.

## Persona findings

### 1. Wetland rewilding specialist — reflooded dried wetland, Netherlands

**Need:** A zoned native palette for a formerly dry wetland after rewetting: open-water/shallow margin, saturated edge, wet meadow and transitional higher ground; hydrological tolerance, provenance, colonisation strategy and control of vigorous dominants are essential.

**Result:** **Not satisfactory.** Useful wetland candidates appear, including grote kattenstaart, gele lis, moerasspirea, watermunt, oeverzegge and zwarte els. However, they are mixed with dry-ground species and a fixed full tree/shrub catalogue. The default 10/25/65 composition is not appropriate for a reflooding project without explicit zones or a woodland target. It offers no water-depth/inundation-duration field, no nutrient/peat-acidity input, no seed-vs-plug strategy, no native-origin control and no invasive/colonisation risk assessment.

**Critical improvements:** add hydrological zones and water depth/duration; filter and rank by each zone; show peat/soil chemistry and restoration objectives; separate donor-material, seed and plug recommendations; flag vigorous species and require a monitoring/control plan. Do not offer a global layer ratio as a wetland default.

### 2. Rewilding specialist — former agricultural fields, Biesbosch, forest plus half-open land

**Need:** A landscape-scale mosaic with flood dynamics, former agricultural nutrient legacy, succession targets, grazing/management, open-versus-wooded percentages, native regional provenance and ecological connectivity.

**Result:** **Not satisfactory.** The package is explicitly a Pijnacker–Delft pilot for small public planting areas, so it is outside its stated geographic and scale scope. It cannot distinguish Biesbosch riverine conditions from a Delft urban park; “Biesbosch” in the location box does not change the context or species. A fixed 10% trees/25% shrubs/65% herbaceous ratio conflicts with the requested site-specific mosaic and risks closing habitat that should remain open.

**Critical improvements:** block or clearly route out-of-region projects until regional data are available; support hectares, habitat polygons and target mosaic percentages; incorporate flood regime, soil history, grazing/mowing and successional stage; offer separate community palettes for woodland, scrub edge, wet grassland and pioneer river margin; include provenance and legal/ecological-restoration constraints.

### 3. Landscape architect — Delft park beside a busy road with a creek, meadow, dense zones and water planting

**Need:** A spatially resolved urban palette: salt/compaction/air-pollution tolerance by road edge, sightlines and safety, creek-bank moisture bands, robust meadow composition, dense habitat blocks, maintenance and plant spacing/quantities.

**Result:** **Partly satisfactory as an inspiration list; not satisfactory as a design output.** The pilot geography is relevant, the context-confirmation step is useful, and plant cards expose height, flowering and cautions. Yet road disturbance, hardscape, sightlines, canopy and site type do not drive the result. The site has no spatial-plan output (explicitly marked future), so the requested meadow/dense/creek zones cannot be assigned plants, quantities or interfaces. “Low toxicity” can be selected but has no observed effect, which is problematic for a public park.

**Critical improvements:** introduce drawn/uploaded zones and zone-specific filters; include road salt, compaction, pollution, root volume, visibility and path-setback parameters; give mature spread, planting density, maintenance regime and failure risk; calculate quantities and a zone schedule; make the safety/toxicity option a real exclusion or clearly remove it until implemented.

### 4. Landscape designer — neighbourhood farmers’ park with edible crops and local honey plants

**Need:** A productive, safe, legible food landscape containing fruit, vegetables, nuts, herbs and berries, complemented by local forage through the season; food-safety, harvest calendar, management, access and pollination relationships matter.

**Result:** **Not satisfactory.** Checking “Edible” does not alter generation. The text command “edible” can reduce the visible list, but it relies on loose text labels and leaves entries whose records say “Check species record”, “Not for casual consumption”, or potentially unsafe/toxic material rather than a verified food-system shortlist. The catalogue has a few edible shrubs/trees and aromatic herbs, but no vegetable crops, cultivars/rootstocks, harvest timing, planting combinations, yield, allergens, food safety or maintenance guidance. The use of toxic and thorny species cannot be evaluated against paths, play or harvesting areas.

**Critical improvements:** replace the free-text edible filter with verified food categories (fruit, nut, berry, herb, vegetable); explicitly distinguish edible parts, preparation and toxicity; add cultivar/provenance, rootstock, pollination partners, harvest window, yield, allergen and food-safety data; provide a bee-forage calendar and flag forage gaps; support companion planting and exclude unsafe species from selected public-harvest zones by default.

### 5. Gardener and heritage-fruit specialist — educational park of forgotten fruit varieties

**Need:** Historic Dutch fruit cultivars and species, accurate identity and provenance, compatible pollination groups, rootstock and mature dimensions, disease resilience, orchard spacing/training/pruning, harvest and interpretation material.

**Result:** **Not satisfactory.** The generic species entries for wilde appel, wilde peer and zoete/wilde kers are not heritage-fruit planning data. No cultivar names, conservation status, nursery availability, grafting/rootstock information, flowering/pollination compatibility, disease information, harvest dates or educational content is present. A 10% tree rule and small-public-area framing are unsuitable orchard-design logic.

**Critical improvements:** create a dedicated heritage-orchard mode with cultivar-level, source-cited records; add bloom group/pollination matrix, rootstock, training form, spacing, age/maturity, pruning and disease-resilience fields; include heritage nurseries/collections and an availability date; support an interpretive route and labels. Do not present a generic wild-fruit selection as an answer to this persona’s brief.

## Cross-persona issues to fix

| Priority | Finding | Impact | Recommended resolution |
|---|---|---|---|
| P0 | Generation ignores the entered site brief, moisture, soil, site type, area, priorities and most observed features. | Every persona receives a misleadingly broad list. | Apply the existing eligibility concept before rendering; then rank by site and priority with transparent inclusion/exclusion reasons. |
| P0 | The pilot scope is Pijnacker–Delft/small public areas, while two requested cases are landscape-scale or out of region. | False geographic authority. | Geo-fence/reroute unsupported projects and show coverage, data date and confidence at species level. |
| P0 | No spatial zoning or planting-plan output. | Cannot solve mixed habitat, creek, road-edge, orchard or food-park briefs. | Make zones a core step, not a future card; produce a zone palette, quantities, density and interfaces. |
| P0 | “Edible” and “Low toxicity” are presented as priorities but do not function in the generated palette. | Safety and trust risk. | Implement them as explicit, auditable filters; otherwise mark unavailable and remove from the active form. |
| P1 | Catalogue records are uneven: many are labelled prototype candidates with generic traits, and duplicates occur (for example, *Leucanthemum vulgare*, *Myosotis scorpioides*, *Briza media*, *Prunus avium*). | Weak variety, unclear evidence and possible double counting. | Curate/de-duplicate the data, attach traits and citations per record, and make the source/date/version inspectable. |
| P1 | Fixed layer balance is framed as a starting point but remains unchanged across highly different ecosystems. | Ecologically inappropriate defaults shape novice decisions. | Calculate or let the user set balance per habitat/zone; explain when it is not applicable. |
| P1 | Refinement only recognises a few words (“low”, “late”, “edible”) and removes plants rather than explaining trade-offs. | Brittle, opaque interaction; cannot answer specialist briefs. | Use structured filters plus natural-language interpretation that reports what changed and why. |
| P1 | Plant cards omit spread/density, establishment, maintenance, provenance/availability, compatibility and zone placement. | Experts cannot turn candidates into a buildable palette. | Add those fields and a compatibility/competition view, with seasonal and management calendars. |
| P2 | Reference images come from a generic image service and are explicitly unsuitable for identification. | Visual confidence may exceed botanical confidence. | Use licensed, verified images or make the card image-free; label image provenance clearly. |
| P2 | CSV export is available, but it exports the unfiltered list and no quantities or zones. | Can propagate an invalid shortlist into downstream work. | Disable/export as “candidate review only” until filtering works; include criteria, exclusions, version and zone/quantity columns. |

## Functions assessed

**Useful and worth retaining**

- Clear three-step structure and the explicit “provisional, not a field survey” warning.
- Candidate cards with Dutch and Latin names, flowering window, height, cautions and an individual remove control.
- An inventory-review concept and CSV/XLSX import route, provided its classifications become evidence-based.
- Visible provenance intent (FLORON/NDFF, Traitbase and PDOK/BRO) and a reminder that the designer remains responsible.

**Missing or insufficient**

- Actual contextual filtering/ranking, zone planning, robust species traits and compatibility logic.
- Geographic/scale support, hydrology/restoration inputs, productive-landscape/orchard modes and safety logic.
- Quantities, densities, costs/availability, maintenance, establishment and monitoring outputs.
- An explainable recommendation trace: why each plant is included, excluded, or weakly supported.

**Unnecessary or misleading in the current release**

- A universal-looking 10/25/65 layer balance for radically different habitat types.
- Active “Edible” and “Low toxicity” controls before they actually affect the palette.
- The “Generate a reviewed palette” label while generation returns the complete catalogue.
- Future-feature cards styled as buttons if they do not yet take the user anywhere; present them as a roadmap instead.

## Release recommendation

Do not position Verdant as a recommendation tool to the target professional group until the P0 issues are resolved and reviewed against real field cases. In the meantime, position it plainly as a **regional candidate catalogue and review prototype**, limit it to Pijnacker–Delft small public sites, and require a specialist/site-survey hand-off before export or specification use.
