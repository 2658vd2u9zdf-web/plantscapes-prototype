# Plantscapes local dataset — Netherlands vascular-plant master scaffold

This directory is an intentionally small, auditable Netherlands vascular-plant taxonomy backbone for Plantscapes. It is not a South Holland occurrence inventory, a planting specification, a trait database, or a substitute for field survey.

## Contents

- `raw/verspreidingsatlas_nl_vascular_taxa.csv` — 2,436 Dutch vascular-plant taxonomy records from the public Verspreidingsatlas feed, including Dutch names, family, scientific authorship, taxon IDs and source links.
- `raw/gbif_dutch_vegetation_all_available_species_facet_taxa.csv` — all 3,370 species keys returned by the Dutch Vegetation Database GBIF species facet, with GBIF taxonomic lookup fields and aggregate record counts.
- `derived/plantscapes_nl_vascular_plant_decision_traits_v0_2.csv` — the website-ready vascular-plant curation table. It joins the Dutch taxonomy backbone to exact accepted-name GBIF matches where available. Ecology, suitability, safety and provincial occurrence fields remain blank until they have source-specific evidence.
- `raw/oranje_lijst_historic_fruit_cultivars.csv` — 1,552 historic apple, pear, plum and cherry cultivar records from the CGN/WUR Oranje Lijst, including historic use type, date text, trade/genebank snapshot fields and source links.
- `derived/plantscapes_heritage_fruit_cultivars_v0_1.csv` — a separate cultivar module for historic fruit. Each record is marked `edible_parts = fruit` at crop level. It is not merged into the wild-species table.
- `dataset_manifest_v0_2.json` — version, sources, licence notes, selection method and limitations.
- `DATASET_SCOPE_AND_ENRICHMENT_REPORT.md` — what was added, what was deliberately not inferred, and the next South Holland data requirement.
- `PLANTSCAPES-DATA-AND-DECISION-MODEL.md` — evidence separation, source order, recommendation logic and Dutch case-study intake.
- `templates/` — spreadsheet-ready templates for source provenance, individual plant claims, planting communities and annotated case studies.
- `schemas/` — JSON Schemas for traceable plant claims and annotated planting-plan cases.
- `build_gbif_dutch_vegetation_seed.mjs` — reproducible builder for the compact sources.

The older `v0_1` files are retained for traceability. New application work should use `v0_2`.

## Geographic coverage and safe use

The v0.2 table is a near-complete *national vascular taxonomy working list*, not a statement that every listed taxon occurs in South Holland. `south_holland_presence_status` is blank by design. A national taxonomy list, a nationwide map URL, and an aggregate GBIF count do not establish a provincial record, recency, establishment status, or suitability for a site.

The source taxonomy includes taxa that may be planted, casual, cultivated, introduced, rare, historical or otherwise unsuitable for a particular project. Therefore `review_status` is set to `not_recommendable_until_expert_curation`; the website must not treat a record’s presence in this table as a recommendation.

## Coverage-gap logic

The original core was assembled from a historical vegetation-plot dataset and the Verspreidingsatlas vascular-taxa feed. It is therefore strongest for mapped flora and weakest for garden ornamentals, casual plants, cultivated taxa, low-frequency records, cultivars and names affected by taxonomic changes. It can also appear to miss a taxon where the source writes `x` rather than `×`, or uses a different accepted name.

The test-gap review added *Chamerion angustifolium*, *Calamagrostis arundinacea*, *Lathyrus odoratus*, *Salix × sepulcralis*, *Ceanothus thyrsiflorus*, *Tridens flavus* and *Coreopsis verticillata* from GBIF taxonomy plus a bounded Netherlands occurrence query. These seven are labelled `supplementary_gbif_netherlands_occurrence_candidate` and remain blocked from automatic recommendations. A zero GBIF count for *Tridens flavus* is retained as an explicit user-requested record, not treated as evidence of Dutch occurrence.

## Edibility and heritage-cultivar handling

The national vascular table now has `edibility_evidence_status`. It is set to `not_assessed` unless a taxon has source-specific edibility evidence. An empty `edible_parts` cell means **unknown in this dataset**, never “inedible.”

Historic fruit varieties are stored separately because a cultivar is not a wild species. The CGN/WUR Oranje Lijst module contains 725 apple, 494 pear, 162 plum and 171 cherry records that were recorded as cultivated in the Netherlands between 1850 and the Second World War. `edible_parts = fruit` is supported at crop level, but it does not establish cultivar identity, raw-edibility, allergy profile, preparation, current availability, disease resistance, pollination compatibility or suitability for South Holland. The historic cherry entries are conservatively labelled `Prunus spp.` until their botanical identity is reviewed. Do not automatically recommend these records.

## Why the raw vegetation archive is not copied

The Dutch Vegetation Database contains 675,000+ vegetation descriptions and GBIF reported more than 11 million occurrence records during this build. The source is useful, but copying raw plots would create a large, stale duplicate and would not by itself answer the website’s practical questions (salt tolerance, public-contact safety, density, provenance, maintenance or edible use). The compact taxon seed is typically measured in kilobytes/megabytes, not gigabytes, and remains safely below the 15 GB cap. It should be filtered and paginated before displaying cards; never render every taxon at once.

## Rules for editing

1. Never infer a trait from a plant name, genus, habitat label or occurrence count.
2. Populate each decision field only from a specific, cited source; preserve source URL, licence, retrieval date and reviewer.
3. Keep `evidence_confidence` as `unreviewed`, `provisional`, `reviewed`, or `conflicting`.
4. Do not import TRY records into this local database unless a written data-governance review confirms that the intended local storage and website delivery are permitted.
5. Treat historical, cultivar and image resources as separate modules; do not mix them into native-site suitability fields.

## Recommended next curation order

1. Obtain a licensed/open, taxon-level South Holland occurrence export and populate `south_holland_presence_status` with source, date and evidence—not with a map inference.
2. Add a reviewed native/established status and exclude unsuitable or non-local taxa from default recommendations.
3. Add the public-contact hazard layer before any edible or public-space recommendation is enabled.
4. Add moisture/hydrology, salinity, soil and mature-dimension evidence by habitat zone.
5. Add maintenance, provenance and supplier/availability fields last; all should remain visibly incomplete until verified.
6. Enrich `edible_parts` one taxon at a time from sources with explicit reuse rights; separately review hazardous lookalikes, toxic plant parts, allergens and preparation requirements.
