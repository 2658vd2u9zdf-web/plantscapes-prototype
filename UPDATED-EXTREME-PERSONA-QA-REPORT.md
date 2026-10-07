# Plantscapes — extreme expert persona re-test

**Test date:** 10 September 2026  
**Builds checked:** `Verdant-Test-Package/website` and `planting-palette-assistant/dist`  
**Review stance:** experts who can design these palettes without the tool, and who will reject a result whenever its trace, data or safeguards cannot be defended in a planning meeting.

## Bottom line

**The update materially improves the prototype, but it is still not safe to call a professional recommendation tool.** It has become a useful constrained candidate-list demonstrator for small South Holland sites. It is not yet a reliable decision-support system: the critical safety filter contradicts its own output, key controls remain decorative, hydrology is over-simplified, and the evidence layer is largely generic.

### What demonstrably improved

- The whole-catalogue failure is fixed: a tested Delft road-edge/public-contact brief returned **11 context-matched candidates**, not 100.
- The result explains some exclusions and labels itself “Candidate review only,” rather than a specification.
- The interface now stops an out-of-scope location: a Biesbosch, Noord-Brabant request visibly returned the South Holland pilot-scope warning.
- Inputs now include zones, nutrient status, wetness duration, management intent, road stress and public contact. This is a much better professional vocabulary.

### Release decision

**No-go for professional or public-safety use.** Resolve the P0 issues below, test them with independent botanical and accessibility review, and only then consider a limited pilot as a *curated candidate-screening* tool.

## Test method

I used five invented expert personas and deliberately hostile briefs. I exercised the live three-step interface for the school-roadside scenario and the out-of-scope landscape scenario, and audited the updated filtering/data behaviour against the supplied build for the remaining targeted combinations. A finding marked **observed** occurred in the rendered interface; **logic-confirmed** means it follows directly from the delivered filter and record logic.

## Persona results

### 1. Dr. Mara Veldt — tidal freshwater restoration ecologist

**Case:** Restore a former quay-side polder inlet at Dordrecht into a tidal freshwater reedbed, wet meadow and shallow marginal-water mosaic. The brief requires salinity screening, inundation frequency/depth, erosion resistance, succession control, protected-species constraints and native local provenance.

**Verdict: fail — not fit for restoration specification.**

The new wet-meadow and wet-margin zones are welcome, as is the check that prevents a non-wet moisture value from being paired with inundation. But all non-`none` hydrology settings are treated identically: seasonal wetness, long wetness and shallow permanent water simply require the same broad `wet` trait (**logic-confirmed**). There is no tidal regime, water depth, drawdown, salinity, flow velocity, bank gradient, sediment chemistry, donor material or establishment method. A wet-margin selection is also restricted to the `Water-edge plants` category, excluding wet-compatible sedges, rushes and herbs from the very transition this persona needs unless other zones are separately selected.

**Required correction:** model a hydrological gradient as zones with depth, duration, frequency, salinity and flow; attach species-level tolerance ranges and provenance; output a restoration establishment/monitoring plan rather than a flat shortlist.

### 2. Ivo Smit — public-realm ecologist for school and mobility corridors

**Case:** A 360 m², dry, sunny, compacted and salt-affected roadside strip beside a Delft primary school. Children touch plants; sightlines must remain open. The client needs robust native pollinator planting with no thorn, poison, hazardous sap or unacceptable maintenance risk.

**Verdict: fail — safety claim is contradicted by the output.**

This was run end to end in the interface with road stress, public contact, dry conditions and road-edge zone selected. The tool rendered **11 candidates** and its filter trace stated: “toxic or thorny candidates withheld: public-contact edge.” Yet the displayed shrub list included **sleedoorn (*Prunus spinosa*)** and **hondsroos (*Rosa canina*)**, both thorny. This is a P0 defect: a professional could wrongly trust the explicit safety trace.

The road-stress trait is also not a species trait. It is assigned broadly to any non-tree that is not classified as wet, so its use does not establish salt, compaction, splash, drought, pollution or root-zone tolerance (**logic-confirmed**). The resulting five shrubs are generic woody-edge candidates, not substantiated road-edge choices.

**Required correction:** make public-contact safety a verified, structured species attribute that includes thorns, toxicity by plant part, irritant sap, allergens, ingestion risk and mature maintenance hazards. Add a regression test asserting that blackthorn and dog rose cannot pass a public-contact filter. Replace the generic road flag with cited tolerance data and score it transparently.

### 3. Noor El-Karim — ecological landscape architect for a low-input cemetery park

**Case:** A shaded, mature-canopy remembrance park in Leiden with compacted paths, damp leaf-litter pockets and a quiet wildflower understory. It requires shade-tolerant, long-lived local species, root-zone protection, seasonal legibility and a low-disturbance maintenance prescription.

**Verdict: fail — the controls overstate ecological resolution.**

The UI can collect shade, canopy, soil character, disturbance and management intent, but canopy, soil character and disturbance do not influence eligibility (**logic-confirmed**). “Meadow” management only removes trees and shrubs; it does not alter species suitability, mowing dates, cut removal, leaf-litter treatment, establishment or visitor access. Pollinator and seasonal-interest checkboxes likewise do not filter or rank anything. A polished interface therefore implies a fine-grained ecological assessment that the implementation does not perform.

Many supplemental entries have mechanically generated, broad roles, heights, seasons and cautions. This cannot support a planting decision under a mature canopy, where competitive ability, mycorrhizal association, dry-shade survival and planting establishment matter.

**Required correction:** either wire every displayed input to evidence-based rules or remove/label it as “record only.” Add species-level shade, canopy/root-zone, soil, disturbance, mowing and seasonal traits. A result should reveal which fields affected the decision and which did not.

### 4. Lotte van Aken — community food-forest and public-health designer

**Case:** A 1,800 m² public food garden in Zoetermeer, combining berries, herbs, nuts, edible perennials and bee forage, with a play route, volunteer maintenance and seasonal harvest events. The palette needs safe edible parts, allergens, harvesting windows, pollination partners, yield/maintenance, rootstock/cultivar choice and local source availability.

**Verdict: fail — “edible” is a loose text screen, not a food-landscape mode.**

The edible option now actively filters, which is better than the previous build. It still classifies “edibility” from short record text and includes records described as “Edible part possible — verify preparation and identification”; that is unacceptable for a public harvest setting. There is no separation of plant part, raw/cooked status, toxic look-alikes, dosage, allergen, cultivar, rootstock, pollination group, fruiting age, harvest calendar or food-safety context. The free-text refinement can further filter by the word “edible,” but it is not explainable planning logic.

The tool also does not calculate a bee-forage gap, companion/competition relationship, area allocation or harvest-route safety. It cannot test the requested mixture of productive and local ecological planting.

**Required correction:** create a distinct, data-governed edible-landscape mode. Use structured food-safety attributes, cultivar/rootstock and pollination data; distinguish public harvesting from display planting; include harvest, forage and maintenance calendars; default to exclusion where safety evidence is absent.

### 5. Hendrik Bos — heritage orchard curator and nursery adviser

**Case:** A 3,200 m² educational orchard on former market-garden land near Westland, using rare Dutch apple, pear, plum and cherry cultivars with teaching labels and a climate-resilient replacement strategy. The client needs cultivar provenance, collection status, grafting/rootstock, disease risk, bloom compatibility, training system, final spacing, harvest sequence and availability.

**Verdict: fail — species-level wild-fruit entries cannot answer a cultivar-level heritage brief.**

The South Holland location/area is accepted, which is appropriate for a pilot. But “wilde appel,” “wilde peer” and generic cherries are not forgotten cultivars. The tool cannot distinguish a heritage cultivar from a wild species, evaluate pollination compatibility or design orchard geometry. Its generic tree height of 8–25 m for supplemental trees is especially unusable for rootstock-dependent orchard planning. The output contains no spacing, quantities, training, pruning, disease, fruit quality, collection source or procurement data.

**Required correction:** do not imply heritage-orchard support until a separate cultivar dataset exists. Add a cultivar-level source authority, bloom/pollination matrix, rootstock, mature size, training, pruning, disease, harvest and supplier/availability data. Until then, route this case to a specialist rather than produce a palette.

## Defects and recommendations

| Severity | Finding | Evidence | Required action |
|---|---|---|---|
| **P0** | Public-contact safeguard returns thorny species while saying they were withheld. | **Observed:** blackthorn and dog rose were displayed in the tested school-roadside result; its filter trace claimed thorny plants were withheld. | Correct the safety ontology and add automated regression tests for every flagged hazard. Suppress the reassuring trace until it is true. |
| **P0** | Hydrology is a binary wet/not-wet filter despite four user-visible water-duration choices. | **Logic-confirmed:** any non-none setting only requires a `wet` fit. | Introduce depth, duration, frequency, seasonal timing, salinity and flow traits; distinguish marginal, emergent, wet-meadow and drawdown assemblages. |
| **P0** | Several visible context controls do not affect results. | **Logic-confirmed:** canopy, soil character, disturbance, pollinator priority and seasonal-interest priority are not eligibility/ranking criteria. | Wire controls to verified data or remove them from the decision interface. Show an auditable input-to-output trace. |
| **P0** | Expert-facing data are not sufficiently validated. | Supplemental traits are generated with name-matching rules and generic descriptions; source fields are broad rather than record-level. | Replace heuristic traits with a versioned, reviewed species database; cite record-level sources, dates, licences and uncertainty. |
| **P1** | Road-edge suitability is inferred from category/absence of wetness, not verified tolerance. | **Logic-confirmed:** the road flag broadly includes non-trees that are not wet. | Add cited salt, drought, compaction, pollution, splash and root-volume tolerance fields. |
| **P1** | Zone logic is category-led and cannot represent ecological interfaces. | **Logic-confirmed:** wet margin accepts only the water-edge category. | Use species traits and mapped gradient bands, not category gates. Allow each species to carry one or more suitable bands. |
| **P1** | The written brief is collected but not interpreted. | **Logic-confirmed:** no brief text is used by candidate eligibility/ranking. | Either implement constrained, explainable brief interpretation with reviewable extracted constraints or call the field “project notes for export.” |
| **P1** | “Map-informed · confidence: medium” has no shown map lookup or evidence. | UI claim and static front-end implementation. | Replace with “user-confirmed prototype context” unless a data service and provenance trace are actually connected. |
| **P1** | Inventory UI promises retain/remove/verify but implementation returns verify only. | **Logic-confirmed:** every uploaded entry is classified `VERIFY`. | Change the copy or implement evidence-backed, field-survey-safe review states. Never automate removal advice from a name alone. |
| **P2** | Free-text refine logic is brittle and destructive. | It recognizes a few keywords and filters the current result without explaining trade-offs or allowing reversal. | Replace with saved structured filters, an undo/reset action and a visible change log. |
| **P2** | Export is still too easy to misread downstream. | It includes a disclaimer but has no quantities, zones, density, version ID or source-record identifiers. | Give export a persistent “candidate review” watermark and include data version, rule version, applied filters, exclusions and verification state. |

## What should be retained

- The narrow pilot boundary and the observed out-of-scope warning are responsible product decisions.
- The reduced, context-matched result and filter trace are the right interaction direction.
- The “candidate review only” wording and roadmap treatment are much more honest than presenting unbuilt outputs as buttons.
- Individual removal, Dutch/Latin naming and an export that includes a disclaimer are valuable foundations.

## Minimum acceptance criteria for the next re-test

1. A public-contact+low-toxicity case returns no known thorny, toxic or otherwise forbidden records, with automated tests and a human-reviewed hazard list.
2. Changing every visible context/priority control produces either a traceable change in selection/ranking or an explicit “not used” label.
3. Seasonal, long-duration and permanent hydrology inputs generate demonstrably different, ecologically defensible candidate sets.
4. Every candidate has a record-level source, data version, provenance status and explicit uncertainty; heuristic filler traits are removed from professional output.
5. At least five independent field cases are reviewed by relevant practitioners before any claim of professional decision support.
