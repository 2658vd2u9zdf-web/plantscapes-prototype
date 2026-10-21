# Bug, reliability, performance and code-quality audit

Date: 2026-10-21. Base commit: `130130e feat: integrate v0.3 recommender and project prototype`. All changes are uncommitted for review. No paid AI request was made: AI stayed off on the local server, and every test that reaches the AI route either mocks the provider or fails if the provider is contacted.

No plant fact, weight, matrix, cap, threshold, hard gate, project policy, protected hash or research archive was changed.

## 1. Summary

The main workflow works end to end in a real browser: project, site search and outline, conditions, candidates (expand, remove, undo, missing-information examples, Add anyway), plan generation, recipe editing, seasons, camera, render-scene export. Seven defects were confirmed and fixed. Every fix has a regression test, or, for browser-only behaviour, a reproducible check run in the real app.

| # | Severity | Problem | Status |
|---|---|---|---|
| 1 | P1 | A crafted AI request could put excluded plants into the provider prompt | Fixed |
| 2 | P1 | After moving the site, old plan shapes made plan generation impossible | Fixed |
| 3 | P2 | The Leaflet stylesheet was blocked by a wrong integrity hash | Fixed |
| 4 | P2 | Zero-area and self-crossing outlines were accepted | Fixed |
| 5 | P2 | Keyboard focus was lost after Remove and Undo removal | Fixed |
| 6 | P3 | Malformed requests returned HTTP 500 instead of 400/404 | Fixed |
| 7 | P3 | The protected-hash validator depended on line endings and stopped at the first file | Fixed; six intentional changes still need an owner decision |

Section 6 lists problems that were found but deliberately not changed.

## 2. Baseline

**Git.** Branch `main`, clean working tree, up to date with `origin/main`. HEAD `130130e`. One existing stash, `pre-teammate-update-backup-2026-10-20`, was left untouched.

**Environment.** Windows 11, Node 24.16.0, Python 3.14.2, Git `core.autocrlf=true` with no `.gitattributes`. Microsoft Edge 155 is installed. Playwright is not installed anywhere on the machine, and the repository has no `package.json` declaring it. It was not installed.

**Runtime flow and authoritative files.**

```text
Project/site inputs     app.js project(), site(), defaultConditions(); site-context.js (PDOK search, Overpass check)
→ site conditions       runtime-adapter-v0.3.js zone()  (synthetic_fallback origins keep the source at "demo")
→ project policies      project-policies.js (data only), interpreted by recommender-stages.js projectFit()
→ plant suitability     recommender-stages.js siteFit() using the v0.3 matrices and weights from the generated bundle
→ hard gates            recommender-stages.js evaluate(): severity 6–8 rows become gates and states
→ ranking               recommender-stages.js ranking(): state, site score, priority tiers, design score, id
→ candidate cards       candidate-card.js (plain text; ?debug=1 shows the trace)
→ community generation  community-engine.js, calling PlantscapesRecommender.communityFit()
→ quantities            community-engine.js recipes (count shares, SPACE-01 spacing); planting-engine.js trees
→ camera/render output  plan-graphics.js, dense-view.js, render-basis.js (scene export)
→ optional AI           ai-ui.js context() → server.mjs validateContext()/validateProposal() → provider
```

Authoritative inputs: `dataset/derived/plantscapes_demo_matching_ready_v0_3.csv`, `dataset/scoring/plant-location-contract-v0_3.json`, `dataset/scoring/plant-suitability-rules-v0_3.json` and `dataset/project-demo/project-demo-fill-rules-v0_3.json`. The reference evaluator is `dataset/score_demo_suitability_v0_3.py`.

Generated files, not edited here: `website/data/operational-v0.3.generated.js` (`dataset/build_runtime_v0_3.py`), `website/data/project-demo-v0.3.generated.js` (`dataset/project-demo/build_project_demo_v0_3.py`), the rulebook bundles (`dataset/build_rulebook_bundle.mjs`) and `website/data/catalogue.js` (`dataset/build_browser_catalogue.mjs`).

**Baseline tests.**

| Test | Result | Time |
|---|---|---|
| `project-demo-data` | pass (60 plants, 465 fills, 10 examples, 25 archives) | 312 ms |
| `candidate-card` | pass (169 cards) | 346 ms |
| `recommender-stages` | pass (6,053 checks) | 758 ms |
| `recommender-benchmark` | pass (123) | 1,035 ms |
| `recommender-parity` | pass (6,843 evaluations, 117 rankings) | 3,556 ms |
| `suitability-v0.3` | pass (180) | 252 ms |
| `runtime-integration-v0.3` | pass | 174 ms |
| `communities` | pass | 872 ms |
| `smoke` | pass | 1,156 ms |
| `tree-placement` | pass | 625 ms |
| `ai-server` (mocked provider) | pass | 283 ms |
| `validate_location_dataset_v0_3.py` | **pass**, 4,458 checks | |
| `validate_demo_matching_v0_3.py` | **fail**: "Protected file changed: dataset/build_demo_dataset_v0_2.py" | |
| `workflow-clean`, `browser-walkthrough`, `ai-browser`, `v03-browser` | not run: `Cannot find module 'playwright'` | |

The browser console showed this on every page load: `Failed to find a valid digest in the 'integrity' attribute for resource 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' … The resource has been blocked.` No other runtime errors occurred.

## 3. Investigations requested

### Protected hash mismatch (`dataset/build_demo_dataset_v0_2.py`)

The file was not modified. Its bytes are CRLF in the working copy and LF in the Git index (`git ls-files --eol`: `i/lf w/crlf`), because `core.autocrlf=true` converts on checkout. The LF-normalised SHA-256 equals the recorded hash exactly (`a5aebc23…`).

The validator stopped at the first mismatch, which hid the full picture. Of the 66 protected files:
- **19** differ only by line endings. The hashes in `protected-inputs.json` were captured on an LF checkout.
- **6** have genuinely different content: `dataset/README.md`, `website/app.js`, `website/index.html`, `website/plan-graphics.js`, `website/planting-engine.js` and `website/styles.css`. All six match the `pre-teammate-update-backup-2026-10-20` stash (and older commits). They differ from the teammate merge commits `6dc2019`/`c54205f` and from `130130e`. They are **intentional historical changes** made by later UI and documentation work, not accidental modifications.
- The separate "national baseline hash" in the same validator has the opposite problem: it was captured on a CRLF checkout, so it would fail on an LF checkout.

No hash was updated. The validator now compares content regardless of LF/CRLF and lists every changed file (fix 7). Whether to re-baseline the six files is a decision for the data owner.

### Leaflet CSS integrity

Still present at baseline. The browser computed `sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=`, which is the hash Leaflet publishes for 1.9.4. `index.html` carried `…miZyoK1zxk1K1jT+o=`, so the stylesheet was blocked (fix 3).

## 4. Fixed issues

### Fix 1 (P1, security / gate bypass): excluded plants could reach AI prompts

- **Reproduce:** POST `/api/illustration` (or `/api/feedback`) with a valid context whose `communities[0].rows`, `species` or `trees` names a plant the project excludes, for example *Rhamnus cathartica* (Not suitable on the test site). Before: HTTP 200, and the excluded plant's name and traits were in the provider prompt (checked with a mocked provider).
- **Root cause:** `validateContext` re-evaluated only `communities[].allowedIds`. The `rows`, `species` and `trees` arrays are also sent to the provider, but none of them were checked.
- **Fix (`server.mjs`):**
  - Recipe rows may only name the community's checked `allowedIds`, with finite 0–100 shares.
  - Each placed tree or designer-added plant is re-evaluated at the placement stage in the mapped bed that contains it, using the same bed order as the engines.
  - Every other species must pass the candidate-stage palette screen in one of the supplied zones.
  - The bed-geometry calculation was extracted into one helper shared by the community and placed-plant checks.
- **Regression tests:** `tests/server-validation.mjs` (new). It builds the context the way `ai-ui.js` does, then rejects tampered rows, species, trees, shares and placed climbers, both directly and over HTTP. It fails on the original code ("Missing expected exception: excluded plant in a recipe row"). `tests/recommender-benchmark.mjs` now sends `species` as the browser does: the benchmark's v0.3 reference pool contained 19 plants that the open-views rule excludes, and the server now correctly refuses to forward them.
- **Cost:** `validateContext` on a 6-community, 124-entry context takes 4.30 ms before and 4.57 ms after.

### Fix 2 (P1, broken workflow): plan shapes from a previous plot

- **Reproduce:**
  1. Generate a plan in Pijnacker.
  2. Choose Groningen as the starting area, then **Use example plot**.
  3. Continue to the plan and draw a new bed inside the new plot.
  4. Generate. Before, it always failed with "No compatible planting positions were found…". The old path and bed (194 km away) were still in the plan, so the camera, AI context and scene export also referred to them.
- **Root cause:**
  - Drawn plan shapes survive a boundary change.
  - Both engines sized their sampling grid from every drawn bed rather than from the plot, although every valid position must lie inside the plot. A 194 km extent gave a quadrature step of about 1 km, so no cell landed in the real bed.
- **Fix:**
  - `community-engine.js` takes its grid extent from the plot boundary.
  - `planting-engine.js` clips the bed extent to the plot.
  - For every existing scenario, outputs are byte-identical to the baseline (`tree-placement`, `communities`, `smoke`).
  - `app.js` `dropShapesOutsidePlot()` removes plan shapes whose extent lies wholly outside a newly saved boundary and says so in the plan status. Overlapping shapes are kept.
- **Regression tests:** `tests/communities.mjs` adds a bed 190 km away and asserts identical community and individual plans; both assertions fail on the original code. `tests/audit-browser.mjs` covers the UI path (not executable here; see section 7). In the real app after the fix, the moved site reported "2 drawn shapes were outside the new plot boundary and have been removed from the plan" and generated 256 plants of 28 species.

### Fix 3 (P2): Leaflet stylesheet blocked

- **Fix:** corrected the integrity value in `website/index.html`. `styles.css` already duplicates core Leaflet layout rules, so the map worked, but the zoom and attribution controls were unstyled and every load logged an error.
- **Verification:** after the fix the stylesheet is in `document.styleSheets` with rules and the console is empty. Screenshots: `project-information/bug-audit-screenshots/before-leaflet-css-blocked.jpg` and `after-leaflet-css-loaded.jpg`.

### Fix 4 (P2): invalid outlines accepted

- **Reproduce:** draw three corners on one line, or a bow-tie. Before, the plot was saved as "0 m²", the project area became 0 and the workflow continued. Beds had the same gap.
- **Fix (`app.js` `outlineProblem()`):** the plot boundary and any planting, water or open-ground outline must not cross itself and must enclose at least 1 m². Paths are unaffected. The draft is kept so the user can undo corners, and a clear message is shown in the existing site error box or the map instruction line.
- **Verification:** in the real app, a collinear plot showed "The outline encloses almost no area…", and a bow-tie showed "The outline crosses itself…" with all 4 corners kept. A valid rectangle saved. Covered in `tests/audit-browser.mjs`.

### Fix 5 (P2, accessibility): focus lost after Remove and Undo removal

- **Reproduce:** focus a card's Remove button and press it. Focus fell to `<body>`, because the palette is re-rendered.
- **Fix:** focus moves to **Undo removal** after a removal, and to the restored card's expand button after an undo. This follows the existing pattern for Show examples and Add anyway.
- **Verification:** in the real app, focus is on `#undoPlant` after Remove and back on the restored card after Undo. Covered in `tests/audit-browser.mjs`.

### Fix 6 (P3): HTTP 500 for malformed input

- **Before:**
  - `GET /website/%E0%A4%A` returned 500 (URIError).
  - `GET /website/data` returned 500 (EISDIR).
  - Bodies of `null`, `[]` or `42` returned 500 or a misleading 400.
  - A null community, a text project flag or an invalid zone value returned 500.
- **After:** 400 for client errors and 404 for directories, with plain messages and no paths. Crafted evaluation errors are wrapped as "Invalid project or zone conditions."
- **Test:** `tests/server-validation.mjs`.

### Fix 7 (P3): protected-hash validator

- **Fix (`dataset/validate_demo_matching_v0_3.py`):** an `unchanged()` helper accepts the LF and CRLF forms of the same bytes for both the protected-file check and the national baseline check. All changed files are listed in one message.
- **Result:** "Protected files changed (6): dataset/README.md, website/app.js, website/index.html, website/plan-graphics.js, website/planting-engine.js, website/styles.css". This is the true state; see section 3. The validator writes nothing when it stops.

## 5. Performance

All figures were measured in the built-in browser (Chromium-based) at 1440 px, or in Node 24.

| Measurement | Before | After |
|---|---|---|
| Page DOMContentLoaded (local server) | 202 ms | unchanged |
| Largest scripts | operational bundle 2.13 MB, catalogue 318 KB, xlsx 269 KB, project-demo 206 KB, app 104 KB | unchanged |
| `recommender.screen` (60 plants, 1 zone) | 4.6 ms | unchanged |
| Palette render (46 candidates + 10 examples) | 30 ms; 23,147 DOM nodes, 1.4 MB HTML | unchanged |
| Card expand/collapse | < 1 ms | unchanged |
| Plan on 173 m² | 68 ms; 10 regenerations 315 ms; Leaflet layers stable at 189 after 20 | unchanged |
| Plan on 1.6 ha (`generatePlan`) | 394 ms: engine 147, spatial view 131, map layers 55, dense view 16 (4,216 instances, 39,856 cells) | unchanged |
| Plan after moving the site | impossible (fails at any size) | generates normally |
| 8 season switches | 65 ms | unchanged |
| JS heap after 10 regenerations | 18 → 44 MB (no forced GC; no layer growth) | not re-measured |
| Server `validateContext` | 4.30 ms | 4.57 ms |
| Mocked feedback round trip (AI off, validation then 503) | n/a | 7–9 ms |
| `tests/communities.mjs` | 872 ms | 1,233 ms (two added checks) |

No speed optimisation was made. The only measured hotspot is described in section 6 (item 2), and changing it would alter a browser-test contract that cannot be run here. The engine change was made for correctness. Its plan outputs are byte-identical for all existing scenarios.

## 6. Found but not changed

1. **No site information still gives a full palette (P2, policy).** With every site condition set to Unknown, 50 plants show as "Partial fit" with "Why it fits: Fits the site conditions entered so far." This follows the documented project-demo rule (unentered inputs are left out of the score). The v0.3 evaluator and rulebook G02 call this `data_gap` instead. Next action: decide which rule wins and, if needed, add a minimum number of entered site conditions.
2. **Hidden spatial view re-rendered on every plan change (P2, performance).** `renderVisualization()` builds the stage-8 SVG during stage-7 generation, plant edits and recipe edits: 131 of 394 ms on 1.6 ha. Entering stage 8 renders it again anyway. It was not changed because `tests/v03-browser.mjs` asserts the SVG exists while still on stage 7. Next action: render only on stage 8 and move that assertion after `#toCamera`, with Playwright available to verify.
3. **Large palette DOM (P3).** Every card pre-renders all hidden "?" source panels (about 23k nodes). Rendering is still 30 ms. Next action: build source panels on first open if the palette grows.
4. **`xlsx.full.min.js` (269 KB) loads on every page** but is only used for XLSX inventory upload (P3). Next action: load it on file selection.
5. **Recipe overrides persist across palette rebuilds (P3).** `state.recipeOverrides` is keyed by community id, which includes the eligible-set hash. A custom mix is silently re-applied after a project change if the same community reappears. Next action: confirm whether that is intended.
6. **Each recipe edit or undo asks "Regenerate the concept?" (P3, UI).** `generatePlan()` confirms whenever a plan exists, and recipe edits call it. Next action: skip the confirm when no individual plant edits exist.
7. **Draw progress is not announced (P3, accessibility).** The compact workflow hides `#plotStatus` (role=status), so corner-count updates are not announced.
8. **Latent: flowering ranges that wrap the year** (for example November to February) would be mis-drawn by the season review and the spatial view. No current record wraps, so nothing is wrong today.
9. **Restored plants move to the end of their group after Undo removal (P3).**
10. **Security notes, no action needed:**
    - Path traversal (`../`, `%2e%2e`, `%2f`, `%5c`) and private files (`.env`, `.plantscapes-local`) return 403/404.
    - A foreign Host header returns 403; posts without the page origin and token return 403.
    - The server binds to 127.0.0.1, responses are `no-store`/`nosniff`, and no key appears in `/api/status`.
    - `/dataset/` is served whole, but it contains only public repository data.
    - Project flags such as public access come from the client by design. The server cannot know the true project, so a user can change them, as in the UI.
11. **External services:** the Overpass water/road check timed out in the test browser and degraded as designed ("Nearby water/road check unavailable…"). Failed PDOK search is covered by the existing `tests/location-search.mjs` (Playwright).

Layout was checked at 375, 768 and 1440 px on every stage, including with all cards expanded and source panels open. There was no horizontal overflow and no undersized buttons, and keyboard focus styles exist (`:focus-visible`). No raw JSON, gate IDs or field names appeared in the normal palette text.

## 7. Tests after the changes

| Test | Result |
|---|---|
| `project-demo-data`, `candidate-card`, `recommender-stages` (6,053), `recommender-benchmark` (123), `recommender-parity` (6,843 / 117), `suitability-v0.3`, `runtime-integration-v0.3`, `communities`, `smoke`, `tree-placement`, `ai-server` | all pass |
| `server-validation` (new) | pass |
| `validate_location_dataset_v0_3.py` | pass, 4,458 checks |
| `validate_demo_matching_v0_3.py` | fails, listing the six intentional content changes (section 3) |
| Playwright tests (`workflow-clean`, `browser-walkthrough`, `ai-browser`, `v03-browser`, new `audit-browser`) | **not run**: Playwright is not installed or declared |

`tests/audit-browser.mjs` was not executed by Playwright. Its `page.evaluate` steps reproduce the browser-pane session in which every fix was verified (Leaflet rules loaded, both invalid outlines refused, focus kept, stale shapes removed, plan regenerated, empty console).

## 8. Files changed

- `server.mjs`: AI context validation (rows, species, placed plants), 400/404 handling
- `website/app.js`: outline validation, removal of shapes outside a new plot, palette focus
- `website/community-engine.js`, `website/planting-engine.js`: sampling extent limited to the plot
- `website/index.html`: Leaflet stylesheet integrity
- `dataset/validate_demo_matching_v0_3.py`: line-ending-independent hashes, full mismatch list
- `tests/communities.mjs`: stale far-away bed checks
- `tests/recommender-benchmark.mjs`: browser-shaped `species`
- `tests/server-validation.mjs` (new), `tests/audit-browser.mjs` (new)
- `README.md`: test list and validator note
- `project-information/BUG-PERFORMANCE-AUDIT.md` (this file), `project-information/bug-audit-screenshots/` (2 images)
