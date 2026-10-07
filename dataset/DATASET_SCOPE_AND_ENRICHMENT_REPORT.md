# Dataset scope and enrichment report — v0.2

Generated: 2026-09-10

## Outcome

`plantscapes_nl_vascular_plant_decision_traits_v0_2.csv` contains **2,436 unique Dutch vascular-plant taxa**. It provides a practical national taxonomy backbone while staying compact: the entire `dataset` directory is approximately **5.5 MB**, well below the 15 GB project limit.

The table adds scientific names, Dutch names, scientific authorship, family, a stable Verspreidingsatlas taxon number, source-page link, NDFF identity link, retrieval date and curation status. It also contains **1,580 exact accepted-name matches** to the existing Dutch Vegetation Database / GBIF compact seed, with its aggregate record count and GBIF species key.

The package additionally contains a separate **1,552-record historic-fruit-cultivar module** from the CGN/WUR Oranje Lijst: 725 apples, 494 pears, 162 plums and 171 cherries. It is a register of cultivars grown in the Netherlands from 1850 to the Second World War. These records are not treated as wild species and are marked `edible_parts = fruit` at crop level. Apple, pear and plum are mapped only at the crop level to `Malus domestica`, `Pyrus communis` and `Prunus domestica`; historic cherry records remain `Prunus spp.` pending identity review.

## Sources and what they support

| Source | Used for | Not used to infer |
|---|---|---|
| Verspreidingsatlas public `vaatplanten` taxonomy feed | National vascular taxonomy, Dutch vernacular names, family, authorship and stable source links | South Holland occurrence, native status, planting suitability, traits or safety |
| GBIF Dutch Vegetation Database (dataset `740df67d-5663-41a2-9d12-33ec33876c47`) | Taxonomic cross-link and aggregate source-dataset occurrence count | Abundance, local availability, provenance, current occurrence, ecology or recommendation |
| CGN/WUR Oranje Lijst, apple/pear/plum/cherry filters | Historic cultivar name, synonyms, historic use type, historic date text, trade/genebank snapshot fields | Dutch origin, current availability, cultivar identity, food safety, site suitability or pollination compatibility |

No map images, raw plot records or individual occurrences are copied. The Verspreidingsatlas feed labels its map objects CC BY-NC-SA 3.0; the local package stores links only.

## Critical limitations

1. This is a national vascular-plant *taxonomy list*, not a verified list of plants occurring in Zuid-Holland. Every `south_holland_presence_status` cell is empty.
2. The sources include taxa that can be cultivated, introduced, casual, historical, rare, legally sensitive or simply wrong for a project. A taxon appearing in the table must never auto-enable a recommendation.
3. Ecological, horticultural and safety fields are empty. Filling them through name-based assumptions would create dangerous false precision, especially for edible planting, wetland restoration and public landscapes.
4. GBIF counts are historical dataset record counts. They are neither abundance nor a current distribution measure.
5. `edible_parts` is intentionally not populated across the vascular table by guesswork. Every core taxon is labelled `edibility_evidence_status = not_assessed` for triage. The apple-cultivar module has crop-level fruit evidence only; it does not mean every plant part is safe or that fruit can be eaten without variety-level checks.
6. The core has a known coverage bias: its original sources underrepresent horticultural, casual, cultivated and low-frequency taxa, and may use different accepted names or hybrid symbols. Seven requested test-gap taxa were added through a clearly labelled GBIF Netherlands-occurrence candidate layer. This corrects known gaps but is not a complete audit of all omitted taxa.

## Required next data layer for a real South Holland recommender

Acquire or license a taxon-level South Holland occurrence extract with documented use rights (for example through the NDFF/Natuurloket route), then record the source, query date, spatial unit, recency rule and reviewer for each populated value. Keep a separate status for native/established, introduced/casual, extinct/historical and cultivation-only taxa. Only after that step should the application filter default recommendations to South Holland.

## Application guardrails

- Load/filter/paginate records; do not render all taxa as plant cards.
- Exclude `not_recommendable_until_expert_curation` from default recommendations.
- Present source links and evidence state in any expert-facing view.
- Require reviewed values for food safety, public-contact safety, site hydrology, salinity, planting density and ecological compatibility.
