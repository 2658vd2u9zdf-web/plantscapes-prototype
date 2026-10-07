# Data-source assessment

## Appropriate primary integration path

- **FLORON / NDFF Verspreidingsatlas / Traitbase:** use for Dutch plant taxonomy, distribution, habitat and trait context. FLORON explicitly identifies Traitbase as an API for species traits and habitat types, and publishes a standard list of the Dutch flora as an Excel file.
- **PDOK/BRO:** use official government geodata for national soil and subsurface context. Treat map output as a broad initial hypothesis, not an on-site soil diagnosis.

## Useful reference sources, not bulk-imported into the prototype

- **Flora van Nederland:** useful for educational material, plant index and identification context. Confirm reuse rights before storing any text, images or video.
- **Permacultuur Nederland:** useful for scoping a future edible-plant mode because it exposes filters for edible uses, growth layers, light, native status and bee value. Confirm licence, field definitions and safety verification before ingestion.
- **Flora Incognita:** potential future identification input only; do not use an image identification result as a planting recommendation without expert review.

## Not a primary data source

- **ResearchGate soil-map figure:** image is copyright-controlled and is secondary to official PDOK/BRO data.
- **The supplied ArcGIS StoryMap:** useful as a conceptual reference, but not yet a documented structured data endpoint for this prototype.
- **NDFF policy page:** the policy is important for use conditions, but the page currently blocks automated fetching. Obtain an explicit permitted dataset/API route before integrating NDFF records.
