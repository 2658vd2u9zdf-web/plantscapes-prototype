# Plantscapes prototype — v0.3 operational demonstration

Plantscapes explores planting concepts for a Dutch site. **All 60 operational records are `production_eligible=false`.** A palette or plan is a research demonstration, not a planting, procurement, public-safety, or food recommendation.

## Run and rebuild

From the repository root:

```powershell
python dataset/build_runtime_v0_3.py
node server.mjs
```

Open `http://127.0.0.1:4182/website/index.html`. The generated [operational bundle](website/data/operational-v0.3.generated.js) is included for direct browser loading. Rebuild it after an authoritative v0.3 CSV or JSON change; the builder only reads source files and emits deterministic JavaScript. No API key is needed for the website, community plans, local image imports, or browser validation. Optional AI uses the local server and private environment configuration described in [community and AI notes](project-information/COMMUNITIES-AND-AI-IMPLEMENTATION.md). Private keys and local ledgers are never browser assets.

In the Site step, type a Dutch place or address and choose a search result to move the map, or use **Starting area** if the external search is unavailable. Then draw or confirm the plot boundary. The nearby water/road map check uses a separate external service; if it says unavailable, location search and boundary drawing still work, and site features must be confirmed manually. A searched address positions the map but does not supply soil or other observed site conditions.

## Runtime data flow

The authoritative inputs are [matching-ready records](dataset/derived/plantscapes_demo_matching_ready_v0_3.csv), the [location/project contract](dataset/scoring/plant-location-contract-v0_3.json), and the [suitability rules](dataset/scoring/plant-suitability-rules-v0_3.json). The saved [Python evaluator](dataset/score_demo_suitability_v0_3.py) and [180 canonical results](dataset/research/demo-v0_3/example-results/all-plant-zone-evaluations.jsonl) define parity. The [handover](dataset/PLANT-DATA-PILOT-HANDOVER-v0.3.md), [field mapping](dataset/research/demo-v0_3/application-adapter-mapping.csv), and [derivation ledger](dataset/research/demo-v0_3/operational-derivations.jsonl) explain evidence limits.

`dataset/build_runtime_v0_3.py` decodes the CSV and packages all 60 profiles, field origins, confidence values, resolutions, warnings, derivations, contract, and rules into `website/data/operational-v0.3.generated.js`. [suitability-v0.3.js](website/suitability-v0.3.js) computes the same plant–zone–project result in browser and Node. [runtime-adapter-v0.3.js](website/runtime-adapter-v0.3.js) maps UI values and operational placement fields. The local [server](server.mjs) uses the same bundle/evaluator and recomputes AI community eligibility from submitted project, zone, and mapped bed context. `website/data/demo-data.js` supplies legacy map place presets only; its plant rows do not determine operational candidates, traits, scores, spacing, safety, or server AI eligibility. The national [name catalogue](website/data/catalogue.js) and case-study names are taxonomy/exploration records, not operational profiles.

## Reading results

Suitability is a weighted compatibility score for one plant, zone, and project. The raw score is shown alongside the score after caps and hard gates. `conditional_match` permits a **simulation** while evidence or policy review is unresolved; `excluded` has a triggered hard gate; `unsuitable` is below the pilot threshold. Evidence confidence is a separate 0–100 index based on field origins, site certainty, source, and unresolved policy. A high raw fit with weak evidence remains low-confidence and conditional. Neither score certifies local suitability.

Expanded cards and CSV exports show the class, raw/capped score, confidence, gate states, field origins, warnings, and `production_eligible=false`. Unknown safety and policy statuses stay unknown. City profile suggestions are marked `synthetic_fallback` and evaluated with a demo source factor until the site fields are individually changed; selecting a survey label alone cannot turn synthetic defaults into observations. If clear zone dimensions, path context, support length, or visibility limit is missing, the evaluator records a gap and caps results. Project maintenance, public access/harvest, sightlines, support, and spread control are explicit UI choices.

Disturbance starts as `unknown`: a city name or mapped nearby road does not establish root-zone or traffic stress. Set low, moderate, or high only from site evidence. The current operational tree records all list low disturbance tolerance, so explicitly marking a zone high excludes them from the demonstration palette. “Mostly open landscape” omits trees from the generated plan even when trees remain visible as diagnostic candidates. See the [Netherlands site test report](project-information/NETHERLANDS-SITE-TEST-REPORT-v0.3.md) for varied plot and location outcomes.

`SPACE-01` spacing and stock capacity are synthetic pilot assumptions. Single-species capacity is not a mixed planting quantity, nursery order, seed rate, or horticulturally exact density. Community recipes estimate whole-site quantities from the mapped plan using these pilot spacings. Polygon containment, paths, water margins, exclusions, neighbours, tree crowns, and camera/render geometry remain separate checks. Climbers may appear in the diagnostic palette, but generic bed/community placement omits them until mapped support placement is implemented. Actual soil, hydrology/depth, provenance, hazards, legal status, public contact, harvesting, root space, and seasonal appearance still need specialist and site review.

The approved spatial design policy remains in [the rulebook](project-information/PLANTING-PLAN-RULEBOOK-v0.1.md). Paths are optional. Community percentages are editable; render-scene export, seasonal schematic previews, imported images, and optional AI advice/illustration remain available. The preview is a concept sketch, not a construction document.

## Validation and tests

Run from the repository root:

```powershell
python dataset/validate_demo_matching_v0_3.py
python dataset/location/validate_location_dataset_v0_3.py
node tests/suitability-v0.3.mjs
node tests/runtime-integration-v0.3.mjs
node tests/smoke.mjs
node tests/communities.mjs
node tests/ai-server.mjs
node tests/workflow-clean.mjs
node tests/browser-walkthrough.mjs
node tests/ai-browser.mjs
node tests/v03-browser.mjs
```

`tests/suitability-v0.3.mjs` compares every field of all 180 JavaScript results with the saved Python outputs. `tests/runtime-integration-v0.3.mjs` checks candidate ranking, uncertainty, synthetic source handling, and server-side AI revalidation without a provider call. `tests/ai-server.mjs` uses a mocked provider and a temporary localhost server; it makes no paid requests. Run the four browser tests with the local server running, Edge installed, and `NODE_PATH` pointing to a Node installation with Playwright. The browser AI test builds context and imports a local image without contacting a paid endpoint. See the baseline and final test record in [implementation notes](project-information/V03-RUNTIME-IMPLEMENTATION.md).

Location validation currently reports three authoritative dependency-hash errors; the v0.3 matching validator also reports an existing protected v0.2 file hash mismatch. These are separate baseline validation issues and are not silently rebuilt here.
