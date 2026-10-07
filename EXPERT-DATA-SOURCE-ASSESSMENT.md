# Expert assessment of candidate plant data sources

**Reviewed:** 10 September 2026  
**Purpose:** assess whether the proposed websites/datasets cover the plant scope needed by Plantscapes, and whether their data can responsibly be accessed or incorporated.

## Decision in one sentence

The experts want a **federated evidence stack**, not one giant plant list. The Dutch Vegetation Database/GBIF is the strongest listed starting point for Dutch vegetation context; TRY adds functional traits; EURISCO and the EU Plant Variety Portal help with crop/heritage-cultivar discovery. None is sufficient for the product’s recommendations by itself, and several cannot legally or technically be copied into a bundled website database.

## What the five expert perspectives require

| Expert need | Minimum evidence needed | Listed sources that help | What remains absent |
|---|---|---|---|
| Wetland and tidal-restoration ecology | Dutch occurrence/community data, water-depth/duration, salinity, soil chemistry, provenance, establishment and invasive-risk evidence | Dutch Vegetation Database via GBIF; TRY for selected traits | Hydrological tolerance at usable resolution, restoration method and local provenance/sourcing |
| Public-realm landscape design | Regionally appropriate taxa, salt/compaction/drought tolerance, height/spread, toxicity/thorns/allergens, maintenance, density and public-contact risk | GBIF/TRY provide partial ecological context | A curated Dutch safety and horticultural-performance dataset; no listed source supplies this fully |
| Food-forest and community harvest | Edible part/preparation, toxic look-alikes, allergens, cultivar/rootstock, pollination, yield, harvest and supplier availability | EURISCO; EU Plant Variety Portal; historical sources for interpretation | Public-food safety, companion planting, practical availability and harvest management |
| Heritage orchard | Cultivar identity, accession/passport data, status, rootstock, bloom group, disease, training and conservation source | EURISCO and EU Plant Variety Portal | Orchard-design and cultivar-performance records; nursery availability |
| Education and in-field inventory | Reliable identification support, images, accepted names, local distribution and clear licensing | Flora Incognita app; Plant Atlas; EOL; GBIF | A public, reusable, Dutch-specific plant-identification API with a professional verification workflow |

## Source-by-source verdict

| Source | Plant scope and value | Access / reuse position | Expert verdict |
|---|---|---|---|
| **Dutch Vegetation Database on GBIF** | Dutch vegetation sampling-event data published by Wageningen Environmental Research. It is valuable for community composition, co-occurrence exploration and Dutch ecological context. | The GBIF dataset is CC BY 4.0 and delivered as a Darwin Core Archive. GBIF also supports occurrence/species APIs; record quality, sampling bias and taxonomic interpretation must be retained. | **Use as a core evidence source**, after a local ecological-data review. Do not turn occurrence frequency into a recommendation or a claim of local absence. |
| **Flora Batava dataset** (Open Humanities Data, DOI `10.5334/johd.497`) | A digitised historical Dutch flora (1800–1934), with modernised identifications/nomenclature and geocoding. Excellent for heritage interpretation, historical species stories and education. | The article says the dataset is fully available through an open repository; verify the repository licence and the licence of each derivative/image before ingestion. | **Use as an interpretive/history layer only.** It does not establish current site suitability, safety or local availability. |
| **Digital Plant Atlas** | High-quality photographs of seeds, fruits and vegetative parts, verified scientific names and a botanical reference collection catalogue. Strong for identification/education, especially material evidence. | Its open-data notice is CC BY-NC-SA 3.0 NL; commercial use requires contact. | **Do not bundle into a commercial or potentially commercial product without permission.** Use links/attribution or seek a licence; not a traits/recommendation database. |
| **Go Botany** | Identification keys, teaching tools and more than 3,000 New England plants. | Content/images are copyrighted by Native Plant Trust or rights holders; its scope is New England. | **Do not use for Dutch recommendations.** It is a good interaction-design reference for keys and teaching, not a Netherlands dataset. |
| **Encyclopedia of Life (EOL)** | Broad global taxonomy, text/media, ecological interactions and organism attributes. Helpful as a secondary taxonomy/enrichment layer. | Classic APIs remain available; structured data requires a key. EOL says users must honour per-material licences/attribution, and API registration is required under its terms. | **Use only as an attributed, provenance-preserving enrichment service.** Never treat it as a verified Dutch suitability or safety authority. |
| **EURISCO** | European ex-situ plant genetic-resource catalogue: accession/passport data. Relevant for discovering germplasm, conservation material and some crop/heritage leads. | Public search catalogue; current documentation indicates ongoing API development/partner services, not a simple unrestricted production API to assume. Verify its current terms and endpoint access with EURISCO before building on it. | **Use for accession discovery, not plant recommendations.** It cannot replace cultivar performance, orchard design, nursery stock or native occurrence evidence. |
| **TRY Plant Trait Database** | Global functional plant traits, directly valuable for trait-based screening and restoration/ecology research. | Data are obtained through registration/request. TRY’s policy says data must not be redistributed through another website/database, even where public download is available; attribution and data-custodian conditions apply. | **Use only after a data-governance decision.** Do not copy TRY records into the client-side catalogue. A controlled server-side workflow, derived values, citations and legal review may be possible. |
| **Flora Incognita** | Photo-based identification of 30,000+ vascular plant species, fact sheets including distribution/protection information, and personal observation exports (CSV/GPX). | The public material confirms an app workflow and export of a user’s own observations. I found no documented general public identification/database API suitable for automatically powering this website. | **Use as optional field-survey support, not as an automatic source of truth.** Ask Flora Incognita about a research/partner API; require botanist verification for consequential records. |
| **Early Modern Dutch food-consumption study** | The linked Groningen research concerns 97 edible taxa from 51 Dutch urban archaeological cesspit datasets (AD 1500–1850). Useful for interpretive “forgotten food plants” narratives. | It is a scholarly article/poster context, not a maintained recommendation or cultivar database. | **Use as a curated historical-story source with citations**, never as evidence of safe modern edibility, cultivar identity or site suitability. |
| **EU Plant Variety Portal** | Official EU registers for agricultural, vegetable and fruit varieties; useful for variety identity, official registration/description and market traceability. | The portal is searchable. The Commission describes current catalogue supplements; open-data downloads exist for some catalogue material. Confirm endpoint, update cadence and applicable reuse terms for the precise register needed. | **Use for cultivar status/discovery and traceability.** It is not an orchard planner and does not supply local performance, pollination, rootstocks, cultural meaning or availability. |

## Answer on Flora Incognita specifically

You are right that Flora Incognita provides species information and distribution/protection information in the app, and it can export an individual user’s confirmed observation list—with images, species names and coordinates—as CSV or GPX. It is useful for building a field inventory.

However, that is **not the same as an openly documented API or a reusable database licence**. I could not verify a public general-purpose API for sending images to Flora Incognita or bulk-importing its plant/distribution dataset into Plantscapes. The responsible route is to contact the Flora Incognita team for a research or product partnership, and design the tool so every app-derived identification stays marked *unverified* until a competent surveyor confirms it.

## Recommended data architecture

1. **Taxonomy and local-context layer:** maintain accepted scientific names and an occurrence/community evidence link per species. Start with GBIF/Dutch Vegetation Database, but retain dataset ID, date, coordinate precision, licence and uncertainty.
2. **Curated Dutch decision-trait layer:** commission or build a small, reviewable dataset for the exact Plantscapes decisions: hydrology gradient, soil/fertility, salt/compaction, mature size/spread, vigour, management, public-contact hazards, edible parts, native provenance and source confidence. This is the missing product-critical layer.
3. **Specialist modules:** keep heritage cultivars/accessions (EURISCO/EU portal), historical interpretation (Flora Batava/archaeobotany) and plant identification (Flora Incognita) separate from native-plant recommendations.
4. **Evidence at card level:** every visible claim needs source, source version/date, licence, confidence, and whether it is a measured trait, a local occurrence, an expert-curated rule or a user observation.
5. **Do not redistribute restricted data:** before importing TRY or image collections, document licence, API/permission status, redistribution allowance, attribution and deletion/update process.

## Priority next steps

- Contact GBIF/Dutch Vegetation Database and verify the fields, sampling design and suitable use of the CC BY 4.0 archive for a South Holland pilot.
- Request a written data-use decision from TRY before any integration; assume client-side redistribution is prohibited until confirmed otherwise.
- Contact Flora Incognita about an API/research partnership rather than scraping or reverse-engineering the app.
- Treat EURISCO and the EU Portal as discovery sources, then validate candidate cultivars with Dutch heritage orchards, gene banks and nurseries.
- Convene a Dutch botanist, restoration ecologist, public-safety/horticulture specialist and heritage-fruit curator to define the curated trait schema before collecting more data.

## Sources checked

- [GBIF — Dutch Vegetation Database](https://www.gbif.org/dataset/740df67d-5663-41a2-9d12-33ec33876c47/download)
- [Flora Batava dataset article](https://openhumanitiesdata.metajnl.com/en/articles/10.5334/johd.497)
- [Digital Plant Atlas](https://www.plantatlas.eu/)
- [Go Botany](https://gobotany.nativeplanttrust.org/)
- [EOL data services](https://api.eol.org/docs/what-is-eol/data-services)
- [TRY data-use policy](https://www.try-db.org/TryWeb/DataUsePolicy.php)
- [Flora Incognita app](https://floraincognita.com/flora-incognita-app/)
- [EU plant-variety catalogues](https://food.ec.europa.eu/plants/plant-reproductive-material/plant-variety-catalogues-databases-information-systems_en)
