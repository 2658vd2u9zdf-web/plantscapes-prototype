# Community plans and optional AI — implementation handoff

## Implemented

- `website/community-engine.js` estimates communities over the **whole** plantable extent, rather than stopping at 12,000 individuals. Trees remain individually checked; understorey and shrub quantities use area, count shares and a synthetic spacing-derived density. Overlapping beds are counted once; drawn open areas, paths, water and boundary exclusions apply. Areas use centre-point quadrature, not exact polygon clipping. The step size and uncertainty are recorded.
- A bounded, area-stratified preview samples every community. Its symbols are **not** counted as all plants. Percentage recipes, legend quantities, CSV quantities and SVG quantities use the estimated totals. A 15,000 m² test estimates 57,726 plants with 2,398 preview symbols and reaches both ends of the site.
- Per-community manual percentages support recipes such as 40/20/40, with count totals allocated using largest remainders. Estimated density uses `1 / sum(fraction × spacing²)`; this is a deliberately simplified fixture, not reviewed planting density or ground cover. Formal mode uses preview bands; naturalistic mode scatters a stable sample.
- The interface retains the top map legend. Community percentages are collapsed by default. One short refinement input and Ask AI button introduce optional advice; a proposal must be explicitly applied and can be undone. Preview plants are distinguished from manually specified individual plants.
- Illustrations appear **directly on Plantscapes** after the API returns. The schematic is rasterised locally and sent as a reference, with the community recipes and season. Images are matched to the plan content, viewpoint, season and age. Changing these does not silently reuse an unrelated picture. Imported ChatGPT images can also appear directly in the page and persist in browser IndexedDB.
- API image files and conservative request reservations persist in `.plantscapes-local/`, which is Git-ignored and excluded from the static server. Browser requests do not contain the API key. The local server binds to loopback, verifies Host/Origin and a session nonce, bounds request sizes, validates eligible taxa/shares, caches successful responses and makes no automatic provider retries.

## Subscription and $3 allowance

The standalone website cannot consume ChatGPT subscription image allowances as a general-purpose API. The manual route uses the subscription: download a reference PNG, create an image in ChatGPT, import the result into the current Plantscapes view. The automatic route uses a separately billed API.

The user approved a **$3 test allowance**. The bridge caps its configured allowance at $3 and reserves $0.50 per image request and $0.05 per advice request before contacting the provider. These are conservative local reservations, not actual prices or an account balance. Reservations persist across restarts. New provider 401/403 rejections release their reservation; a 401 blocks further provider calls until restart. Other errors retain their reservation conservatively because billing is unverified. There are no automatic retries. Historical reservations are not silently rewritten. Cached successful requests do not reserve again. Concurrent AI requests are rejected. See [authentication and viewpoint update](AI-AUTH-AND-VIEWPOINT-UPDATE.md).

These are conservative local request reservations, **not a guaranteed provider billing cap or an actual invoice**. Model pricing, tokenisation and account billing are controlled by the provider. Request sizes, text output and image dimensions/quality are bounded; review provider usage as well. Changing configured models requires revisiting the reserves. Do not reset/delete the ledger to bypass the agreed budget.

No API key was available during implementation. No paid requests were made. The default is AI disabled. The image and feedback paths were verified using explicitly labelled test-provider fixtures, not live model outputs. Image fidelity and ecological reliability remain unvalidated.

## Run locally

From this package directory:

```powershell
node server.mjs
```

Open `http://127.0.0.1:4182/website/index.html?v=communities-ai-5`.

For real generation, configure `OPENAI_API_KEY` privately in the launching process and set `PLANTSCAPES_AI_ENABLED=1`, then restart this server. Never paste the key into chat, commit it, store it in website JavaScript, or publish it in a screenshot. `.env.example` is documentation; it is **not** automatically loaded. Default model IDs are `gpt-image-2` and `gpt-5.4-mini`; account access must be checked at connection time. Do not expose this prototype server to the public internet; a public service needs authentication, per-user isolation, operational monitoring and deployment hardening.

Windows shortcut: run `./Start-Plantscapes.ps1 -EnableAI -Port 4183` in your own terminal. It asks for the key with hidden input and passes it only to the process; it does not write the key to a file or shell history. Port 4183 avoids an already-running 4182 preview. Without `-EnableAI`, it starts with AI off. If local script policy blocks it, use your normal approved script-running procedure; do not weaken system security settings just for this prototype.

Static file serving still supports local design and image import, but cannot provide API generation. The separate `dist` preview is frontend-only.

## AI decision boundaries

Advice uses the Responses API with a strict JSON schema. Its proposed species must belong to that community's allowed IDs; shares must be finite, unique and total 100. Server-side eligibility and zone checks use local fixtures, not client-supplied trait claims. The user sees the explanation, proposed shares and warnings before applying anything. AI does not override native policy, hazards, hydrology or geometry and cannot add a new plant from outside the eligible pool.

The image service uses the Images edit endpoint with a PNG of the selected schematic. The image is illustrative, not authoritative geometry or a botanical specification. A mask/reference cannot guarantee that paths, plants or camera geometry remain unchanged; a designer must review the result. Seasonal depiction still relies on largely synthetic group-level records.

## Reference and evaluation data

Start with three synthetic test cases (sunny/dry, shaded/fresh, wet edge), each with four seasons. Keep one site out of prompt development. Record the plan revision, recipe, view, season, model/prompt version, output, reviewer and accept/reject reasons. Compare path/water/tree preservation, height layers, mixture character and seasonal plausibility. Real photographs/plant assets require traceable reuse rights. This is evaluation/reference material, **not fine-tuning or a trained custom model**. The template is `dataset/illustration-evaluation-template.json`.

## Verification

- `node tests/smoke.mjs`: legacy individual geometry and approved-rulebook regressions.
- `node tests/communities.mjs`: full-site coverage, >12,000 estimated plants, bounded preview, 40/20/40 shares, exact integer allocation, overlap/exclusion handling and deterministic regeneration.
- `node tests/ai-server.mjs`: local test server plus mocked provider; schema/eligibility validation, feedback cache, image delivery, private-file denial, CSRF guard and exhausted allowance blocking. No real API calls.
- `node tests/browser-walkthrough.mjs`: full workflow, actual map drawing, individual/manual edits, map/view export, mobile width and four seasonal glyph views.
- `node tests/ai-browser.mjs`: percentages and undo, unavailable-AI state, import and per-season image matching, mocked proposal/review/apply, direct in-page test image and saved-image reuse.

The ui-ux-pro-max skill guided labelled controls, local status/error feedback and progressive disclosure. The existing green identity was retained; setup, imports and detailed percentages remain secondary.

## Official implementation references

- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
- https://developers.openai.com/api/reference/resources/images/methods/edit
- https://learn.chatgpt.com/docs/image-generation
- https://learn.chatgpt.com/docs/pricing
