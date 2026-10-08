# Plantscapes planting-plan rulebook — approved design policy 0.1.1

**Purpose.** This is the approved design logic for a *concept* planting plan in the Netherlands. The project owner approved this policy for website implementation on 8 October 2026. The companion [machine-readable rules](../dataset/planting-plan-rules.v0.1.json) use the same rule IDs. Species traits, provisional spacing values and public-space requirements still require validation; the prototype uses clearly labelled synthetic records for testing.

## Project-owner decisions incorporated (8 October 2026)

- **First use case:** public spaces and parks. Calibrate route edges, public contact, maintenance access and municipal review here before adapting the generator to private or productive gardens.
- **First layout mode:** structured naturalistic patches and drifts. This is an implementation choice because the current role-and-zone rules support it; it is **not** a claim that naturalistic planting is ecologically superior or always more successful. A more formal arrangement remains a selectable design variant using the same eligibility and safety gates.
- **Designer input:** draw the site boundary and paths before plan generation. The designer need not draw sightlines. The tool identifies likely visibility-sensitive locations from path junctions, entrances and crossings, shows them as *review prompts*, and accepts any municipality-supplied visibility requirements. It must not claim to have certified sightlines automatically.
- **Review:** the landscape architect reviews the planting concept, assumptions and changes; the municipality reviews public-space constraints and maintenance compatibility. The tool must explain its choices clearly enough for a landscape architect who is not a planting specialist, while unresolved botanical or safety claims still go to a relevant specialist.
- **Non-native plants:** permitted as explicitly labelled options in non-rewilding projects if otherwise eligible; **excluded from automatic rewilding recommendations**. This is a project policy. Native/local plants remain the first search pool, and known invasive plants are excluded in every mode.

## The main idea

A planting plan is not a random distribution of a palette. It is a spatial argument: what must remain open; where water, shade, soil and disturbance change; what kind of plant community belongs in each zone; what forms frame movement and views; and how that community will change under a realistic management regime. The resulting plan must show both *placement* and *why it was placed there*.

The Dutch evidence points in two complementary directions. FLORON advises retaining existing valuable vegetation, using local native material where appropriate, avoiding invasive species, and encouraging spontaneous establishment rather than reflexively reseeding existing verges and banks [S1]. WUR describes woodland-edge structure as a transition from short grassy/herbaceous vegetation through taller herbs and shrub mantle to trees, with enough light and space for each layer [S2]. This supports a **gradient**, not a mandatory “low flower–medium shrub–high tree” formula for every project. For a meadow or open sightline, the correct plan may have no trees or shrubs at all.

Oudolf's work is an inspiration for **composition over time**, not an ecological stamp. Vitra describes his plant “communities” as combining different strengths, flowering periods and life cycles for year-round experience [S3]. The High Line describes hardy perennials, grasses, shrubs and trees selected for changing texture and colour across four seasons [S4]. LOLA's Leiden Meelfabriek garden, developed with Oudolf, is deliberately framed so each season reveals different colours and shapes [S5]. These projects include cultivated and sometimes non-native plants; their look cannot be copied into restoration areas without a separate native/provenance test.

## Decision order — rules that later stages cannot overrule

1. **Draw and verify the usable geometry (G01).** Require the designer to draw a scaled boundary and paths before the design starts. Record known existing plants and roots, buildings, services, entrances, water, open spaces and maintenance routes. **Do not require the designer to draw sightlines.** Unscaled sketches can produce only an illustrative layout. A tree is not justified by a project's total square metres alone: its *mature* crown, rootable volume, shade, utilities and maintenance access must work in its actual location [S6, S7].
2. **Divide the site into real ecological zones (G02).** Confirm soil texture/fertility, moisture regime, seasonal flooding/water levels, light, canopy, disturbance and hardscape for *each zone*. A mapped estimate is a prompt for checking, not an observation. The zone boundary may be gradual; encode an uncertain transition as a band, not a sharp line. STOWA specifically identifies water quality, soil and hydrology as determinants of a nature-friendly bank [S8].
3. **Keep, protect, or verify what exists (G03).** Existing native vegetation, established trees, seed banks and valuable structures may be more important than new planting. “Listed in an uploaded inventory” is not evidence to remove. Record an existing plant as **retain / site-verify / removal proposed with reason and approval**. FLORON emphasises that better management of established verges and banks may bring more biodiversity than replanting them [S1].
4. **Screen candidates before composing (G04).** A plant is eligible only when identity, provenance/native status (where required), site tolerance, mature size, hazards and invasive status are sufficiently reviewed. Red-list rarity is never a reason to plant it automatically; introduction or reintroduction requires a specialist process [S1, S9]. A missing decisive trait creates a **data gap**, not a fabricated recommendation.
5. **Let project type change the rules (G05).** In a project labelled **rewilding**, recommend only eligible native plants with reviewed provenance, and favour retention/natural regeneration before new introduction. In other projects, search local/native plants first but allow a clearly labelled non-native alternative if it is non-invasive and passes site and safety checks; never disguise it as ecologically equivalent. A designed public landscape can use deliberate structure and rhythm but must still pass ecology and public-access checks. A productive garden additionally needs verified edible part, preparation, contamination and harvest-access information. Never transfer a cultivar's trait to a wild species, or the reverse.

## Spatial composition

### Start with the voids (S01)

After the designer draws the paths, reserve them alongside play or gathering areas, water flow and maintenance access before placing plants. The apparently empty space is a designed part of the plan. For a public path, show a **mature-growth clearance envelope**. The tool can flag likely visibility-sensitive places—junctions, bends, crossings, entrances and driveways—from geometry, but this is a *screening prompt*, not a certified sightline calculation. Import any municipality-supplied visibility envelope where available. CROW says vegetation beside cycle routes must preserve sight in bends, junctions and driveways [S10]. There is no universal Dutch “safe plant height” in this rulebook; the applicable route and authority must supply it.

### Make transitions, not uniform stripes (S02)

For a path bordering a deep planting area, the default *visual* sequence is **walkable edge → low, legible herb/grass layer → medium flowering and textural layer → taller structural forbs/grasses and/or shrubs → trees only where space and character call for them**. The low edge is about safe movement, visibility and maintenance; the middle can be permeable and “fluffy” rather than a hard wall; denser/higher masses may create shelter or enclosure farther in. On an island bed viewed from all sides, arrange around multiple viewing edges rather than putting every tall plant at one “back.” RHS similarly locates larger plants at the back of a one-sided border but at the centre of an island bed [S11].

This is a **soft compositional default**. A transparent tall plant may cross the foreground if it does not obscure required views or encroach on the route. A dense low shrub can block a view more than a taller open-stemmed plant. For restoration, follow the actual habitat gradient: WUR's herbaceous margin → tall herb fringe → shrub mantle → woodland is one relevant pattern [S2], not a template for dry meadow, dune or fen.

### Use masses and gaps deliberately (S03)

For the first public-park generator, place recurring species as *readable naturalistic patches or drifts* that relate to path bends, viewing points and zone shape. Scatter a few accents through them, but do not randomise each individual independently. Keep enough open ground and microhabitat where habitat goals demand it; do not force every square metre into a dense ornamental matrix. Repetition gives continuity; local variation prevents a carpet from becoming mechanically uniform. A **formal** variant may use bands or geometric blocks, but it must pass the same site, competition, safety and maintenance checks. This is a Plantscapes design hypothesis inspired by observed designed landscapes, **not a measured Oudolf formula**. No fixed count of drifts or universal tree:shrub:flower percentage is asserted.

### Build layers by function, not by quotas (S04)

| Layer | Typical job | Placement test |
|---|---|---|
| Trees | Canopy, shade, long-distance structure, habitat | Mature crown/root space and future shade fit; protect existing trees first. No tree is a valid outcome. |
| Shrubs/hedge | Edge, shelter, enclosure, fruit/flower structure | Do not erase sightlines, maintenance access or lower-layer light without intent. |
| Structural tall forbs/grasses | Rhythm, transparency, winter silhouettes | Test lodging, self-seeding, visibility and maintenance. |
| Companion flowers/herbs | Seasonal colour, host/nectar roles, texture | Match zone and competition; avoid relying only on peak summer bloom. |
| Ground/matrix species | Soil cover and connective texture | Match spreading behaviour to neighbours; a vigorous matrix can suppress weaker plants. |
| Bulbs/ephemerals | Early/short seasonal pulse | Place where later foliage or management permits; treat separately from perennial density. |
| Climbers | Vertical layer | Require actual support and reviewed maintenance/safety. |
| Marginal/aquatic plants | Wetness gradient and water habitat | Require confirmed water level, quality, depth and water-management permission. |

German perennial-mix research and practice distinguishes structural, companion, filler, ground-cover and bulb roles in an actual mixture, with quantities specific to that mixture and site [S12]. Borrow the **role vocabulary**, not its quantities or non-Dutch species list.

## Density and spacing — what the software can calculate (D01–D04)

**Density has three different meanings:** stems/plants per m² at installation, projected foliage/ground cover after establishment, and visual density/opacity at eye level. The website must not treat these as interchangeable. A single tree may dominate canopy cover while being one plant; a meadow may contain many stems without being visually closed.

- **D01 — Use mature spread first.** For planted perennials, start with verified mature spread and a species-specific spacing recommendation. The RHS example is a 60 cm spread planted about 50 cm apart to knit together [S13]. Plantscapes may offer `spacing ≈ 0.83 × mature spread` only as a *reviewable draft*, never a universal rule. Without spread/spacing evidence, do not calculate a purchase quantity.
- **D02 — Calculate by zone and planting method.** A planted border, seeded meadow, hedge and woodland do not share a density. Record method (`planted`, `seeded`, `existing/regeneration`), area, target year and management. A seeded meadow uses seed-mix composition and g/m² from its reviewed supplier/project; do not convert that to perennial plugs per m². Cruydt-Hoeck explicitly ties establishment to soil and management, and warns that vigorous grasses can dominate flowers on fertile or poorly managed sites [S14].
- **D03 — Model competition and vertical overlap.** For each neighbouring pair, compare light demand, mature spread, rooting/moisture demand, growth rate and likely self-seeding. Allow canopy-over-understorey *only if* the understorey fits future shade. Flag high-competition neighbours for designer review; there is no simple “cannot be next to X” universal table.
- **D04 — Do not fill to a quota.** The number of species is an outcome of area, zonal diversity, ecology and maintenance, not a target. A 20-species palette may be useful for selection while a single coherent patch may use far fewer. Conversely a large diverse park can justify many communities. Separate **palette richness** from **species actually placed per patch**.

For a first *quantity preview* only, a 60 cm mature-spread perennial at the RHS's illustrative 50 cm centre spacing yields roughly **4 plants/m² on a square grid** (`1 / 0.5²`), before bed edges, paths, bulbs, shrubs or species-specific adjustments. A German researched **dry, low, 20–40 cm ornamental mix** instead specifies **14 perennials plus 26 bulbs/m²** for its particular 5–20 m² use case [S17]. That is valuable proof that density is *community- and size-specific*, not a Netherlands-wide default; its cultivar list and preparation method must not be imported automatically into Dutch restoration. An actual purchase count should be `usable patch area × reviewed per-species stocking rate`, rounded and edited against real patch geometry, with a separate establishment and year-2/3 review.

## Colour, form and the year (T01–T03)

Design a **seasonal score**, not a static bloom collage. For every candidate, keep sourced month-level flowering *range and uncertainty*, blossom colour, foliage colour/texture, autumn change, seed-head persistence and winter form. Then inspect at least four **labelled states**: spring, summer, autumn and winter. Never simulate an exact future date or height when the data are only approximate.

- **T01 — Colour hierarchy.** Choose a small recurring set of anchor tones for the *whole route* and let accents shift by zone and season. Plantscapes proposes “one or two recurring colours plus local accents” as a **design hypothesis** for review, not an Oudolf rule. A restoration plan may instead display the colour arising from the eligible local community. Avoid forcing bloom colour ahead of site fit.
- **T02 — Composition beyond petals.** Compare flower-head shape, leaf texture, grass movement, seed heads, stems and silhouettes. A design can have a strong autumn/winter scene without winter flowers. Vitra and the High Line describe this four-season structural approach in Oudolf's projects [S3, S4].
- **T03 — Check ecological continuity.** Where pollinator support is a goal, flag known gaps in flowering periods and flower forms across the growing season; RHS explicitly recommends a range of flowering times and shapes [S15]. A gap warning is not permission to insert a non-local or site-incompatible species. Flowering dates vary with weather and locality, so use ranges and no claim of guaranteed month-by-month bloom [S15].

## Water edges, public access and management (W01–W03)

- **W01 — Wetness bands.** Distinguish submerged water, emergent/marginal planting, periodically flooded bank, moist upper bank and dry top. Do not place a generic “water plant” across all bands. Water quality, level fluctuation, flow, shade, bank profile and access determine eligibility [S8, S16]. An aquatic plan also needs the relevant water authority's conditions; the Waterschap Rivierenland examples are *local rules*, not nationwide dimensions [S16].
- **W02 — Public contact.** Check poisonous/irritant parts, thorns, fruit drop, slipping, allergens where documented, and harvest claims near paths, schools and play spaces. Missing safety evidence should trigger a relevant specialist review, not a “safe” label. Show required clearances and municipality-supplied visibility requirements in the plan; flag inferred visibility-sensitive locations for municipal review [S10].
- **W03 — Management is part of form.** Declare who can weed, water during establishment, cut back, mow and remove biomass; then choose communities that can persist under that schedule. FLORON's advice for existing verges and Cruydt-Hoeck's meadow guidance both tie outcomes to management [S1, S14]. If no credible care regime exists, return “plan needs revision” rather than a beautiful but unmaintainable rendering.

## How a generation pass should work

1. **Inputs:** designer-drawn scaled boundary and paths + confirmed per-zone conditions + project aim/constraints + existing-plant survey + reviewed species records and provenance. Other known site features may be drawn or imported; sightlines need not be drawn.
2. **Hard screening:** freeze protected/existing elements and access; reject unsupported, invasive or unsuitable taxa; leave explicit data-gap markers.
3. **Spatial skeleton:** reserve paths and other voids; flag likely visibility-sensitive path locations for review and apply municipality-supplied envelopes; place existing and viable new tree/shrub structures only where justified; draw ecological transition bands.
4. **Community assembly:** assign structural, companion, ground/matrix, filler and seasonal roles *within each zone*; use patch/drift geometry; check competition and maintenance.
5. **Quantities:** calculate from reviewed species spread/spacing and the applicable establishment method, not from a universal plants/m² setting. Show target year and assumptions.
6. **Seasonal inspection:** inspect four discrete states and pollinator-gap warnings; change the *2D plan* before the visualisation updates.
7. **Output:** label every element as `reviewed`, `designer assumption`, or `unresolved`; explain changes, exclusions, quantities and source links in accessible planting language. Permit undo. Route the concept to landscape-architect review, public-space/maintenance checks to the municipality, and unresolved ecological, botanical or safety claims to a relevant specialist.

The future visualisation is an illustration derived from the accepted 2D plan, never evidence that plants will achieve that form. A prompt must propose explicit plan edits for confirmation before it changes the rendered view.

## Three quick stress tests

| Site | Expected structure | Red flag |
|---|---|---|
| Narrow dry urban verge with bike sightline | Maintain low/open visibility envelope; dry-site herb/grass community; trees only if rooting and clearance are proven. | A “lush” hedge at junction or fixed 20% trees. |
| Shaded residential green | Protect existing canopy; test shade-tolerant understorey and lighter edge; avoid forcing sun meadow species beneath trees. | Fake full-sun flower succession or excessive new trees. |
| Dutch creek/bank | Check fluctuating water level and water authority; compose wetness bands, with management access. | One uniform aquatic strip or planting into a maintenance corridor. |

## Remaining checks before implementation

The website now implements the approved design policy for concept testing. Its numeric experiment defaults are recorded in `prototype_parameters` in the machine-readable rulebook: 1.2 m path-edge depth, 3 m transition depth, 0.6/1.3 m trial height limits and a 3 m grouping scale. These values and the simulated species spreads are awaiting field calibration; they are not municipal standards. The checks below remain prerequisites for real-site specifications.

1. Confirm with at least one municipality how it wants path visibility, accessibility and maintenance constraints supplied or approved. The tool should not invent a clearance standard.
2. Ask planting specialists to calibrate spacing, competition, native/provenance evidence and maintenance for the first public-park test cases. The architect and municipality can review an understandable concept, but neither should be silently treated as the source of missing species traits.
3. Decide whether a project labelled **ecological restoration** but not **rewilding** should also forbid non-native plants. For now the strict native-only gate follows the explicit *rewilding* label; restoration otherwise remains native-first and requires an explicit, explained override for a non-native option.

## Sources and status

Primary Dutch sources are preferred. Neighbouring German and British material is used only for transferable design/planting logic. **“Source-supported” means the source supports the principle; it does not validate the provisional numeric or algorithmic implementation.**

- **S1** FLORON, [Plantadvies](https://www.floron.nl/plantadvies): native/local provenance, existing vegetation, invasives and management.
- **S2** Wageningen University & Research, [Paradijs door ecologisch groenbeheer](https://edepot.wur.nl/390725): layers and edge transitions in ecological planting.
- **S3** Vitra, [Oudolf Garten](https://www.vitra.com/en-as/campus/oudolf-garten): communities, life cycles and year-round structure.
- **S4** Friends of the High Line, [Oudolf Garden Collection / horticulture](https://shop.thehighline.org/collections/piet-oudolf): four-season grasses, perennials, shrubs and trees.
- **S5** LOLA Landscape Architects, [De Meelfabriek Garden, Leiden](https://lola.land/project/de-meelfabriek/): Dutch project and seasonally framed composition with Oudolf.
- **S6** WUR, [Onderhoudsbewust ontwerpen voor stedelijk groen](https://edepot.wur.nl/656549): design must account for long-term management and growing place.
- **S7** RHS, [Trees near buildings](https://www.rhs.org.uk/plants/types/trees/near-buildings): mature tree/root context is site-specific, not an area-only decision.
- **S8** STOWA, [Handreiking Natuurvriendelijke Oevers](https://www.stowa.nl/publicaties/handreiking-natuurvriendelijke-oevers-een-standplaatsbenadering): bank siting by water quality, soil and hydrology.
- **S9** FLORON, [Digital publications / position on introduction](https://www.floron.nl/publicaties/digitaal): threatened-species introduction needs special consideration.
- **S10** CROW, [Bermen en groen](https://kennisbank.crow.nl/public/gastgebruiker/WOBU/Ontwerpwijzer_fietsverkeer/Bermen_en_groen/32999): preserve sight at bends, crossings and driveways.
- **S11** RHS, [How to create a border](https://www.rhs.org.uk/garden-design/how-to-create-a-border): viewed side, mature size and placement.
- **S12** Bund deutscher Staudengärtner, [Staudenmischungen](https://stauden.de/flyer-staudenmischungen.html): structural, companion and filler roles; linked trial mixtures.
- **S13** RHS, [Perennials: planting](https://www.rhs.org.uk/plants/types/perennials/planting): spacing from mature spread; 60/50 cm example.
- **S14** Cruydt-Hoeck, [Veelgestelde vragen over bloemenweides](https://www.cruydthoeck.nl/openbare-ruimte/aanleg-en-beheer/veelgestelde-vragen-over-bloemenweides/): establishment and management affect meadow composition.
- **S15** RHS, [Perennial borders: choosing plants](https://www.rhs.org.uk/plants/types/perennials/for-borders): seasons, flower forms, and weather variability.
- **S16** Waterschap Rivierenland, [Natuurvriendelijke oever](https://www.waterschaprivierenland.nl/natuurvriendelijke-oever): example of site-specific water-authority conditions and native wet vegetation.
- **S17** Bund deutscher Staudengärtner, [Pflanzkonzepte für trockene bis mäßig trockene Freiflächen](https://www.stauden.de/files/download/flyer/Broschuere_Trockenflaechen.pdf): a tested, *specific* small dry-bed example with 14 perennials and 26 bulbs/m²; not a general density standard.
