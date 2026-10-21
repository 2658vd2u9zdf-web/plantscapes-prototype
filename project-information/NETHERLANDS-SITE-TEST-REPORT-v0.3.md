# Netherlands site and tree-placement audit — v0.3

Tested 20 October 2026 against the local website in headless Microsoft Edge with AI disabled. These are **simulated scenario inputs**, not surveys or planting recommendations. All 60 operational plants remain `production_eligible=false`. Counts below are approximate pilot quantities from synthetic spacing, never procurement numbers.

Each scenario used a rectangular geographic plot and a full-plot planting bed. “Path: yes” means the example cross-path was added. The browser generated candidates, then generated a community plan. The scripts and raw JSON results are in `tests/`.

| Test | Plot | Conditions | Candidates (trees) | Plan | Trees placed | Approx. plants |
| --- | ---: | --- | ---: | --- | ---: | ---: |
| Delft courtyard | 200 m² | clay; fresh; disturbance moderate; mosaic | 39 (2) | Generated | 1 | 100 |
| Rotterdam neighbourhood green | 1,600 m² | clay; fresh; disturbance high; mosaic | 29 (0) | Generated | 0 | 3,789 |
| Rotterdam mapped path, zone away from edge | 1,600 m² | clay; fresh; disturbance high; mosaic | 29 (0) | Generated | 0 | 3,789 |
| Rotterdam moderate stress with path edge | 1,600 m² | clay; fresh; disturbance moderate; mosaic | 45 (8) | Generated | 5 | 671 |
| Rotterdam moderate stress away from path | 1,600 m² | clay; fresh; disturbance moderate; mosaic | 45 (8) | Generated | 5 | 696 |
| Groningen wet peat 1500 m2 | 1,500 m² | peat; wet; disturbance low; mosaic | 18 (4) | Generated | 4 | 971 |
| Groningen wet peat 1500 m2 open character | 1,500 m² | peat; wet; disturbance low; open | 18 (4) | Generated | 0 | 5,026 |
| Leeuwarden fresh clay 10000 m2 | 10,000 m² | clay; fresh; disturbance low; mosaic | 45 (8) | Generated | 8 | 4,878 |
| Utrecht small dry urban plot | 600 m² | sand; dry; disturbance high; mosaic | 18 (0) | Generated | 0 | 1,443 |
| Maastricht large fresh sheltered plot | 12,000 m² | clay; fresh; disturbance low; enclosed | 46 (8) | Generated | 8 | 5,324 |
| Pijnacker screenshot-size reproduction | 11,472 m² | city synthetic fallback; city synthetic fallback; disturbance unknown; mosaic | 13 (2) | Generated | 2 | 4,215 |

## Findings

- Final run: all 11 browser scenarios generated a plan. Delft, Pijnacker, Groningen, Leeuwarden, Maastricht, and moderate-stress Rotterdam placed trees. Explicit high-disturbance Rotterdam and Utrecht excluded every tree; this follows the v0.3 records, whose eight tree disturbance tolerances are all `low`. The Utrecht case also marked hardscape `yes`, conflicting with each tree’s `avoid` tolerance.
- The earlier city presets assigned synthetic `high` disturbance to several urban locations. The website now starts disturbance at `unknown` and asks for a site-based choice. A mapped road alone no longer asserts high plant stress. Explicitly choosing `high` still excludes the operational trees.
- “Mostly open landscape” intentionally places no trees. The first Groningen open-plan run failed because the community engine applied path-edge thorn clearance to pathless interior cells; this was fixed. Its final run produced a low planting plan without trees.
- The preview no longer displays species with an estimated quantity of zero. Small beds may fit only the smallest tree crowns; the 6 × 6 m unit check correctly placed none, while a compatible 100 × 100 m bed placed five.
- The map and public location services require network access. The final geographic browser runs waited for the scaled map and succeeded; the Maastricht search returned “Gemeente Maastricht.” The optional nearby water/road lookup can fail without blocking location selection or plan generation.

## Per-test results

### 1. Delft courtyard

**Input:** delft; 10 × 20 m (200 m²); soil clay, moisture fresh, hydrology none, light sun, disturbance moderate, hardscape no; spatial character mosaic; path no. Scaled map loaded.

**Candidate list (39):**

- Trees: Wilde lijsterbes (demo-core-47), Ruwe berk (demo-core-44).
- Shrubs: Rode kornoelje (demo-core-33), Sleedoorn (demo-core-38), Hazelaar (demo-core-36), Gelderse roos (demo-core-35), Gewone vlier (demo-core-40), Sporkehout (demo-core-42), Wegedoorn (demo-core-41), Grauwe wilg s.l. (demo-core-34).
- Flowers & herbs: Gewone margriet (demo-core-03), Duizendblad (demo-core-01), Gewone brunel (demo-core-04), Beemdkroon (demo-core-08), Beemdooievaarsbek (demo-core-14), Rode klaver (demo-core-16), Echinacea purpurea (demo-ornamental-01), Rudbeckia fulgida (demo-ornamental-02), Echte valeriaan (demo-core-13), Knoopkruid (demo-core-02), Dagkoekoeksbloem (demo-core-11), Blauwe knoop (demo-core-12), Stijf ijzerhard (demo-ornamental-03), Peen (demo-core-15), Moerasspirea (demo-core-06), Look-zonder-look (demo-core-10), Lotus corniculatus (demo-core-05), Grasklokje (demo-core-09), Watermunt (demo-core-07), Nepeta × faassenii (demo-ornamental-04).
- Grasses, sedges & rushes: Panicum virgatum (demo-ornamental-05), Gewoon reukgras (demo-core-32), Ruwe smele (demo-core-26), Pijpenstrootje (demo-core-29), Hakonechloa macra (demo-ornamental-06), Bevertjes (demo-core-28), Zeegroene zegge (demo-core-31), Oeverzegge (demo-core-24), Pitrus (demo-core-25).

**Plan:** Generated; 1 tree; 100 approximate plants. 100 estimated plants · 31 species

**Placed species and approximate quantities:**

- Trees: Wilde lijsterbes 1.
- Shrubs: Rode kornoelje 1, Sleedoorn 1.
- Flowers & herbs: Gewone margriet 2, Duizendblad 4, Gewone brunel 4, Beemdkroon 2, Beemdooievaarsbek 4, Rode klaver 2, Echinacea purpurea 1, Rudbeckia fulgida 4, Echte valeriaan 1, Knoopkruid 1, Dagkoekoeksbloem 3, Blauwe knoop 2, Stijf ijzerhard 1, Peen 2, Look-zonder-look 3, Lotus corniculatus 2, Grasklokje 3, Watermunt 3, Nepeta × faassenii 3.
- Grasses, sedges & rushes: Panicum virgatum 6, Gewoon reukgras 6, Ruwe smele 6, Pijpenstrootje 6, Hakonechloa macra 6, Bevertjes 5, Zeegroene zegge 5, Oeverzegge 5, Pitrus 5.

**Checks:** No browser script errors. 7 plan warnings; the full warning text is in the raw result file.

### 2. Rotterdam neighbourhood green

**Input:** rotterdam; 40 × 40 m (1,600 m²); soil clay, moisture fresh, hydrology none, light sun, disturbance high, hardscape no; spatial character mosaic; path yes. Scaled map loaded.

**Candidate list (29):**

- Flowers & herbs: Gewone margriet (demo-core-03), Duizendblad (demo-core-01), Gewone brunel (demo-core-04), Beemdkroon (demo-core-08), Beemdooievaarsbek (demo-core-14), Rode klaver (demo-core-16), Echinacea purpurea (demo-ornamental-01), Rudbeckia fulgida (demo-ornamental-02), Echte valeriaan (demo-core-13), Knoopkruid (demo-core-02), Dagkoekoeksbloem (demo-core-11), Blauwe knoop (demo-core-12), Stijf ijzerhard (demo-ornamental-03), Peen (demo-core-15), Moerasspirea (demo-core-06), Look-zonder-look (demo-core-10), Lotus corniculatus (demo-core-05), Grasklokje (demo-core-09), Watermunt (demo-core-07), Nepeta × faassenii (demo-ornamental-04).
- Grasses, sedges & rushes: Panicum virgatum (demo-ornamental-05), Gewoon reukgras (demo-core-32), Ruwe smele (demo-core-26), Pijpenstrootje (demo-core-29), Hakonechloa macra (demo-ornamental-06), Bevertjes (demo-core-28), Zeegroene zegge (demo-core-31), Oeverzegge (demo-core-24), Pitrus (demo-core-25).

**Plan:** Generated; 0 trees; 3,789 approximate plants. 3,789 estimated plants · 29 species

**Placed species and approximate quantities:**

- Flowers & herbs: Gewone margriet 114, Duizendblad 114, Gewone brunel 114, Beemdkroon 114, Beemdooievaarsbek 114, Rode klaver 114, Echinacea purpurea 76, Rudbeckia fulgida 114, Echte valeriaan 76, Knoopkruid 76, Dagkoekoeksbloem 114, Blauwe knoop 114, Stijf ijzerhard 76, Peen 114, Moerasspirea 76, Look-zonder-look 114, Lotus corniculatus 114, Grasklokje 114, Watermunt 113, Nepeta × faassenii 113.
- Grasses, sedges & rushes: Panicum virgatum 189, Gewoon reukgras 189, Ruwe smele 189, Pijpenstrootje 189, Hakonechloa macra 189, Bevertjes 189, Zeegroene zegge 189, Oeverzegge 189, Pitrus 189.

**Checks:** No browser script errors. 5 plan warnings; the full warning text is in the raw result file.

### 3. Rotterdam mapped path, zone away from edge

**Input:** rotterdam; 40 × 40 m (1,600 m²); soil clay, moisture fresh, hydrology none, light sun, disturbance high, hardscape no; spatial character mosaic; path yes. Scaled map loaded. Mapped path-edge context: no.

**Candidate list (29):**

- Flowers & herbs: Gewone margriet (demo-core-03), Duizendblad (demo-core-01), Gewone brunel (demo-core-04), Beemdkroon (demo-core-08), Beemdooievaarsbek (demo-core-14), Rode klaver (demo-core-16), Echinacea purpurea (demo-ornamental-01), Rudbeckia fulgida (demo-ornamental-02), Echte valeriaan (demo-core-13), Knoopkruid (demo-core-02), Dagkoekoeksbloem (demo-core-11), Blauwe knoop (demo-core-12), Stijf ijzerhard (demo-ornamental-03), Peen (demo-core-15), Moerasspirea (demo-core-06), Look-zonder-look (demo-core-10), Lotus corniculatus (demo-core-05), Grasklokje (demo-core-09), Watermunt (demo-core-07), Nepeta × faassenii (demo-ornamental-04).
- Grasses, sedges & rushes: Panicum virgatum (demo-ornamental-05), Gewoon reukgras (demo-core-32), Ruwe smele (demo-core-26), Pijpenstrootje (demo-core-29), Hakonechloa macra (demo-ornamental-06), Bevertjes (demo-core-28), Zeegroene zegge (demo-core-31), Oeverzegge (demo-core-24), Pitrus (demo-core-25).

**Plan:** Generated; 0 trees; 3,789 approximate plants. 3,789 estimated plants · 29 species

**Placed species and approximate quantities:**

- Flowers & herbs: Gewone margriet 114, Duizendblad 114, Gewone brunel 114, Beemdkroon 114, Beemdooievaarsbek 114, Rode klaver 114, Echinacea purpurea 76, Rudbeckia fulgida 114, Echte valeriaan 76, Knoopkruid 76, Dagkoekoeksbloem 114, Blauwe knoop 114, Stijf ijzerhard 76, Peen 114, Moerasspirea 76, Look-zonder-look 114, Lotus corniculatus 114, Grasklokje 114, Watermunt 113, Nepeta × faassenii 113.
- Grasses, sedges & rushes: Panicum virgatum 189, Gewoon reukgras 189, Ruwe smele 189, Pijpenstrootje 189, Hakonechloa macra 189, Bevertjes 189, Zeegroene zegge 189, Oeverzegge 189, Pitrus 189.

**Checks:** No browser script errors. 5 plan warnings; the full warning text is in the raw result file.

### 4. Rotterdam moderate stress with path edge

**Input:** rotterdam; 40 × 40 m (1,600 m²); soil clay, moisture fresh, hydrology none, light sun, disturbance moderate, hardscape no; spatial character mosaic; path yes. Scaled map loaded. Mapped path-edge context: yes.

**Candidate list (45):**

- Trees: Wilde lijsterbes (demo-core-47), Spaanse aak (demo-core-49), Winterlinde (demo-core-46), Zomereik (demo-core-45), Ratelpopulier (demo-core-50), Ruwe berk (demo-core-44), Zwarte els (demo-core-43), Schietwilg (demo-core-48).
- Shrubs: Rode kornoelje (demo-core-33), Sleedoorn (demo-core-38), Hazelaar (demo-core-36), Gelderse roos (demo-core-35), Gewone vlier (demo-core-40), Sporkehout (demo-core-42), Wegedoorn (demo-core-41), Grauwe wilg s.l. (demo-core-34).
- Flowers & herbs: Gewone margriet (demo-core-03), Duizendblad (demo-core-01), Gewone brunel (demo-core-04), Beemdkroon (demo-core-08), Beemdooievaarsbek (demo-core-14), Rode klaver (demo-core-16), Echinacea purpurea (demo-ornamental-01), Rudbeckia fulgida (demo-ornamental-02), Echte valeriaan (demo-core-13), Knoopkruid (demo-core-02), Dagkoekoeksbloem (demo-core-11), Blauwe knoop (demo-core-12), Stijf ijzerhard (demo-ornamental-03), Peen (demo-core-15), Moerasspirea (demo-core-06), Look-zonder-look (demo-core-10), Lotus corniculatus (demo-core-05), Grasklokje (demo-core-09), Watermunt (demo-core-07), Nepeta × faassenii (demo-ornamental-04).
- Grasses, sedges & rushes: Panicum virgatum (demo-ornamental-05), Gewoon reukgras (demo-core-32), Ruwe smele (demo-core-26), Pijpenstrootje (demo-core-29), Hakonechloa macra (demo-ornamental-06), Bevertjes (demo-core-28), Zeegroene zegge (demo-core-31), Oeverzegge (demo-core-24), Pitrus (demo-core-25).

**Plan:** Generated; 5 trees; 671 approximate plants. 671 estimated plants · 41 species

**Placed species and approximate quantities:**

- Trees: Wilde lijsterbes 1, Spaanse aak 1, Winterlinde 1, Zomereik 1, Ruwe berk 1.
- Shrubs: Rode kornoelje 7, Hazelaar 7, Gelderse roos 6, Gewone vlier 5, Sporkehout 5, Wegedoorn 5, Grauwe wilg s.l. 2.
- Flowers & herbs: Gewone margriet 9, Duizendblad 27, Gewone brunel 27, Beemdkroon 9, Beemdooievaarsbek 27, Rode klaver 9, Echinacea purpurea 7, Rudbeckia fulgida 27, Echte valeriaan 7, Knoopkruid 7, Dagkoekoeksbloem 27, Blauwe knoop 9, Stijf ijzerhard 7, Peen 9, Moerasspirea 7, Look-zonder-look 27, Lotus corniculatus 9, Grasklokje 27, Watermunt 27, Nepeta × faassenii 27.
- Grasses, sedges & rushes: Panicum virgatum 33, Gewoon reukgras 33, Ruwe smele 33, Pijpenstrootje 33, Hakonechloa macra 33, Bevertjes 33, Zeegroene zegge 33, Oeverzegge 33, Pitrus 33.

**Checks:** No browser script errors. 8 plan warnings; the full warning text is in the raw result file.

### 5. Rotterdam moderate stress away from path

**Input:** rotterdam; 40 × 40 m (1,600 m²); soil clay, moisture fresh, hydrology none, light sun, disturbance moderate, hardscape no; spatial character mosaic; path yes. Scaled map loaded. Mapped path-edge context: no.

**Candidate list (45):**

- Trees: Wilde lijsterbes (demo-core-47), Spaanse aak (demo-core-49), Winterlinde (demo-core-46), Zomereik (demo-core-45), Ratelpopulier (demo-core-50), Ruwe berk (demo-core-44), Zwarte els (demo-core-43), Schietwilg (demo-core-48).
- Shrubs: Rode kornoelje (demo-core-33), Sleedoorn (demo-core-38), Hazelaar (demo-core-36), Gelderse roos (demo-core-35), Gewone vlier (demo-core-40), Sporkehout (demo-core-42), Wegedoorn (demo-core-41), Grauwe wilg s.l. (demo-core-34).
- Flowers & herbs: Gewone margriet (demo-core-03), Duizendblad (demo-core-01), Gewone brunel (demo-core-04), Beemdkroon (demo-core-08), Beemdooievaarsbek (demo-core-14), Rode klaver (demo-core-16), Echinacea purpurea (demo-ornamental-01), Rudbeckia fulgida (demo-ornamental-02), Echte valeriaan (demo-core-13), Knoopkruid (demo-core-02), Dagkoekoeksbloem (demo-core-11), Blauwe knoop (demo-core-12), Stijf ijzerhard (demo-ornamental-03), Peen (demo-core-15), Moerasspirea (demo-core-06), Look-zonder-look (demo-core-10), Lotus corniculatus (demo-core-05), Grasklokje (demo-core-09), Watermunt (demo-core-07), Nepeta × faassenii (demo-ornamental-04).
- Grasses, sedges & rushes: Panicum virgatum (demo-ornamental-05), Gewoon reukgras (demo-core-32), Ruwe smele (demo-core-26), Pijpenstrootje (demo-core-29), Hakonechloa macra (demo-ornamental-06), Bevertjes (demo-core-28), Zeegroene zegge (demo-core-31), Oeverzegge (demo-core-24), Pitrus (demo-core-25).

**Plan:** Generated; 5 trees; 696 approximate plants. 696 estimated plants · 42 species

**Placed species and approximate quantities:**

- Trees: Wilde lijsterbes 1, Spaanse aak 1, Winterlinde 1, Zomereik 1, Ruwe berk 1.
- Shrubs: Rode kornoelje 5, Sleedoorn 5, Hazelaar 5, Gelderse roos 5, Gewone vlier 5, Sporkehout 5, Wegedoorn 5, Grauwe wilg s.l. 2.
- Flowers & herbs: Gewone margriet 10, Duizendblad 29, Gewone brunel 29, Beemdkroon 10, Beemdooievaarsbek 29, Rode klaver 10, Echinacea purpurea 5, Rudbeckia fulgida 29, Echte valeriaan 5, Knoopkruid 5, Dagkoekoeksbloem 29, Blauwe knoop 10, Stijf ijzerhard 5, Peen 10, Moerasspirea 5, Look-zonder-look 28, Lotus corniculatus 9, Grasklokje 28, Watermunt 27, Nepeta × faassenii 27.
- Grasses, sedges & rushes: Panicum virgatum 35, Gewoon reukgras 35, Ruwe smele 35, Pijpenstrootje 35, Hakonechloa macra 35, Bevertjes 35, Zeegroene zegge 35, Oeverzegge 35, Pitrus 35.

**Checks:** No browser script errors. 8 plan warnings; the full warning text is in the raw result file.

### 6. Groningen wet peat 1500 m2

**Input:** Groningen; 30 × 50 m (1,500 m²); soil peat, moisture wet, hydrology seasonal, light sun, disturbance low, hardscape no; spatial character mosaic; path no. Scaled map loaded.

**Candidate list (18):**

- Trees: Wilde lijsterbes (demo-core-47), Zwarte els (demo-core-43), Ratelpopulier (demo-core-50), Ruwe berk (demo-core-44).
- Shrubs: Grauwe wilg s.l. (demo-core-34), Sporkehout (demo-core-42).
- Flowers & herbs: Blauwe knoop (demo-core-12), Watermunt (demo-core-07), Rode klaver (demo-core-16), Echte valeriaan (demo-core-13), Moerasspirea (demo-core-06), Gewone brunel (demo-core-04), Dagkoekoeksbloem (demo-core-11).
- Grasses, sedges & rushes: Gewoon reukgras (demo-core-32), Pijpenstrootje (demo-core-29), Oeverzegge (demo-core-24), Pitrus (demo-core-25), Zeegroene zegge (demo-core-31).

**Plan:** Generated; 4 trees; 971 approximate plants. 971 estimated plants · 18 species

**Placed species and approximate quantities:**

- Trees: Wilde lijsterbes 1, Zwarte els 1, Ratelpopulier 1, Ruwe berk 1.
- Shrubs: Grauwe wilg s.l. 11, Sporkehout 29.
- Flowers & herbs: Blauwe knoop 38, Watermunt 120, Rode klaver 38, Echte valeriaan 28, Moerasspirea 28, Gewone brunel 120, Dagkoekoeksbloem 120.
- Grasses, sedges & rushes: Gewoon reukgras 87, Pijpenstrootje 87, Oeverzegge 87, Pitrus 87, Zeegroene zegge 87.

**Checks:** No browser script errors. 7 plan warnings; the full warning text is in the raw result file.

### 7. Groningen wet peat 1500 m2 open character

**Input:** Groningen; 30 × 50 m (1,500 m²); soil peat, moisture wet, hydrology seasonal, light sun, disturbance low, hardscape no; spatial character open; path no. Scaled map loaded.

**Candidate list (18):**

- Trees: Wilde lijsterbes (demo-core-47), Zwarte els (demo-core-43), Ratelpopulier (demo-core-50), Ruwe berk (demo-core-44).
- Shrubs: Grauwe wilg s.l. (demo-core-34), Sporkehout (demo-core-42).
- Flowers & herbs: Blauwe knoop (demo-core-12), Watermunt (demo-core-07), Rode klaver (demo-core-16), Echte valeriaan (demo-core-13), Moerasspirea (demo-core-06), Gewone brunel (demo-core-04), Dagkoekoeksbloem (demo-core-11).
- Grasses, sedges & rushes: Gewoon reukgras (demo-core-32), Pijpenstrootje (demo-core-29), Oeverzegge (demo-core-24), Pitrus (demo-core-25), Zeegroene zegge (demo-core-31).

**Plan:** Generated; 0 trees; 5,026 approximate plants. 5,026 estimated plants · 11 species

**Placed species and approximate quantities:**

- Flowers & herbs: Blauwe knoop 452, Watermunt 452, Rode klaver 452, Echte valeriaan 251, Moerasspirea 251, Gewone brunel 452, Dagkoekoeksbloem 452.
- Grasses, sedges & rushes: Gewoon reukgras 566, Pijpenstrootje 566, Oeverzegge 566, Zeegroene zegge 566.

**Checks:** No browser script errors. 7 plan warnings; the full warning text is in the raw result file.

### 8. Leeuwarden fresh clay 10000 m2

**Input:** Leeuwarden; 100 × 100 m (10,000 m²); soil clay, moisture fresh, hydrology none, light sun, disturbance low, hardscape no; spatial character mosaic; path no. Scaled map loaded. Map navigated to the test coordinates.

**Candidate list (45):**

- Trees: Wilde lijsterbes (demo-core-47), Winterlinde (demo-core-46), Zomereik (demo-core-45), Ratelpopulier (demo-core-50), Spaanse aak (demo-core-49), Ruwe berk (demo-core-44), Schietwilg (demo-core-48), Zwarte els (demo-core-43).
- Shrubs: Rode kornoelje (demo-core-33), Sleedoorn (demo-core-38), Hazelaar (demo-core-36), Sporkehout (demo-core-42), Gelderse roos (demo-core-35), Gewone vlier (demo-core-40), Wegedoorn (demo-core-41), Grauwe wilg s.l. (demo-core-34).
- Flowers & herbs: Gewone brunel (demo-core-04), Beemdkroon (demo-core-08), Beemdooievaarsbek (demo-core-14), Echinacea purpurea (demo-ornamental-01), Rudbeckia fulgida (demo-ornamental-02), Knoopkruid (demo-core-02), Dagkoekoeksbloem (demo-core-11), Blauwe knoop (demo-core-12), Gewone margriet (demo-core-03), Duizendblad (demo-core-01), Rode klaver (demo-core-16), Echte valeriaan (demo-core-13), Stijf ijzerhard (demo-ornamental-03), Peen (demo-core-15), Moerasspirea (demo-core-06), Lotus corniculatus (demo-core-05), Grasklokje (demo-core-09), Watermunt (demo-core-07), Nepeta × faassenii (demo-ornamental-04), Look-zonder-look (demo-core-10).
- Grasses, sedges & rushes: Panicum virgatum (demo-ornamental-05), Gewoon reukgras (demo-core-32), Ruwe smele (demo-core-26), Pijpenstrootje (demo-core-29), Hakonechloa macra (demo-ornamental-06), Bevertjes (demo-core-28), Zeegroene zegge (demo-core-31), Oeverzegge (demo-core-24), Pitrus (demo-core-25).

**Plan:** Generated; 8 trees; 4,878 approximate plants. 4,878 estimated plants · 45 species

**Placed species and approximate quantities:**

- Trees: Wilde lijsterbes 1, Winterlinde 1, Zomereik 1, Ratelpopulier 1, Spaanse aak 1, Ruwe berk 1, Schietwilg 1, Zwarte els 1.
- Shrubs: Rode kornoelje 38, Sleedoorn 38, Hazelaar 38, Sporkehout 38, Gelderse roos 38, Gewone vlier 38, Wegedoorn 38, Grauwe wilg s.l. 31.
- Flowers & herbs: Gewone brunel 163, Beemdkroon 121, Beemdooievaarsbek 163, Echinacea purpurea 38, Rudbeckia fulgida 163, Knoopkruid 38, Dagkoekoeksbloem 163, Blauwe knoop 121, Gewone margriet 121, Duizendblad 163, Rode klaver 121, Echte valeriaan 38, Stijf ijzerhard 38, Peen 121, Moerasspirea 38, Lotus corniculatus 121, Grasklokje 163, Watermunt 163, Nepeta × faassenii 163, Look-zonder-look 162.
- Grasses, sedges & rushes: Panicum virgatum 244, Gewoon reukgras 244, Ruwe smele 244, Pijpenstrootje 244, Hakonechloa macra 243, Bevertjes 243, Zeegroene zegge 243, Oeverzegge 243, Pitrus 243.

**Checks:** No browser script errors. 7 plan warnings; the full warning text is in the raw result file.

### 9. Utrecht small dry urban plot

**Input:** utrecht; 20 × 30 m (600 m²); soil sand, moisture dry, hydrology none, light sun, disturbance high, hardscape yes; spatial character mosaic; path yes. Scaled map loaded.

**Candidate list (18):**

- Flowers & herbs: Echinacea purpurea (demo-ornamental-01), Rudbeckia fulgida (demo-ornamental-02), Nepeta × faassenii (demo-ornamental-04), Beemdkroon (demo-core-08), Lotus corniculatus (demo-core-05), Knoopkruid (demo-core-02), Grasklokje (demo-core-09), Blauwe knoop (demo-core-12), Gewone brunel (demo-core-04), Beemdooievaarsbek (demo-core-14), Dagkoekoeksbloem (demo-core-11).
- Grasses, sedges & rushes: Panicum virgatum (demo-ornamental-05), Gewoon reukgras (demo-core-32), Bevertjes (demo-core-28), Zeegroene zegge (demo-core-31), Rood zwenkgras (demo-core-27), Pijpenstrootje (demo-core-29), Hakonechloa macra (demo-ornamental-06).

**Plan:** Generated; 0 trees; 1,443 approximate plants. 1,443 estimated plants · 18 species

**Placed species and approximate quantities:**

- Flowers & herbs: Echinacea purpurea 72, Rudbeckia fulgida 72, Nepeta × faassenii 72, Beemdkroon 72, Lotus corniculatus 72, Knoopkruid 72, Grasklokje 72, Blauwe knoop 72, Gewone brunel 72, Beemdooievaarsbek 72, Dagkoekoeksbloem 72.
- Grasses, sedges & rushes: Panicum virgatum 93, Gewoon reukgras 93, Bevertjes 93, Zeegroene zegge 93, Rood zwenkgras 93, Pijpenstrootje 93, Hakonechloa macra 93.

**Checks:** No browser script errors. 5 plan warnings; the full warning text is in the raw result file.

### 10. Maastricht large fresh sheltered plot

**Input:** Maastricht; 100 × 120 m (12,000 m²); soil clay, moisture fresh, hydrology none, light mixed, disturbance low, hardscape no; spatial character enclosed; path yes. Scaled map loaded. Location lookup: Map moved to Gemeente Maastricht. Draw or confirm your plot boundary.

**Candidate list (46):**

- Trees: Wilde lijsterbes (demo-core-47), Winterlinde (demo-core-46), Zomereik (demo-core-45), Spaanse aak (demo-core-49), Ruwe berk (demo-core-44), Schietwilg (demo-core-48), Zwarte els (demo-core-43), Ratelpopulier (demo-core-50).
- Shrubs: Rode kornoelje (demo-core-33), Sleedoorn (demo-core-38), Hazelaar (demo-core-36), Sporkehout (demo-core-42), Gelderse roos (demo-core-35), Gewone vlier (demo-core-40), Wegedoorn (demo-core-41), Grauwe wilg s.l. (demo-core-34).
- Flowers & herbs: Gewone brunel (demo-core-04), Beemdooievaarsbek (demo-core-14), Echinacea purpurea (demo-ornamental-01), Rudbeckia fulgida (demo-ornamental-02), Knoopkruid (demo-core-02), Dagkoekoeksbloem (demo-core-11), Duizendblad (demo-core-01), Echte valeriaan (demo-core-13), Stijf ijzerhard (demo-ornamental-03), Moerasspirea (demo-core-06), Look-zonder-look (demo-core-10), Beemdkroon (demo-core-08), Blauwe knoop (demo-core-12), Gewone margriet (demo-core-03), Rode klaver (demo-core-16), Grasklokje (demo-core-09), Watermunt (demo-core-07), Nepeta × faassenii (demo-ornamental-04), Peen (demo-core-15), Lotus corniculatus (demo-core-05).
- Grasses, sedges & rushes: Panicum virgatum (demo-ornamental-05), Gewoon reukgras (demo-core-32), Ruwe smele (demo-core-26), Pijpenstrootje (demo-core-29), Hakonechloa macra (demo-ornamental-06), Bevertjes (demo-core-28), Zeegroene zegge (demo-core-31), Oeverzegge (demo-core-24), Pitrus (demo-core-25), Hangende zegge (demo-core-30).

**Plan:** Generated; 8 trees; 5,324 approximate plants. 5,324 estimated plants · 46 species

**Placed species and approximate quantities:**

- Trees: Wilde lijsterbes 1, Winterlinde 1, Zomereik 1, Spaanse aak 1, Ruwe berk 1, Schietwilg 1, Zwarte els 1, Ratelpopulier 1.
- Shrubs: Rode kornoelje 42, Sleedoorn 42, Hazelaar 42, Sporkehout 41, Gelderse roos 41, Gewone vlier 41, Wegedoorn 41, Grauwe wilg s.l. 34.
- Flowers & herbs: Gewone brunel 177, Beemdooievaarsbek 177, Echinacea purpurea 42, Rudbeckia fulgida 176, Knoopkruid 41, Dagkoekoeksbloem 176, Duizendblad 176, Echte valeriaan 41, Stijf ijzerhard 41, Moerasspirea 41, Look-zonder-look 176, Beemdkroon 135, Blauwe knoop 135, Gewone margriet 135, Rode klaver 135, Grasklokje 176, Watermunt 176, Nepeta × faassenii 176, Peen 135, Lotus corniculatus 135.
- Grasses, sedges & rushes: Panicum virgatum 239, Gewoon reukgras 239, Ruwe smele 239, Pijpenstrootje 239, Hakonechloa macra 239, Bevertjes 239, Zeegroene zegge 239, Oeverzegge 239, Pitrus 239, Hangende zegge 239.

**Checks:** No browser script errors. 8 plan warnings; the full warning text is in the raw result file.

### 11. Pijnacker screenshot-size reproduction

**Input:** Pijnacker; 114.72 × 100 m (11,472 m²); soil city synthetic fallback, moisture city synthetic fallback, hydrology city synthetic fallback, light city synthetic fallback, disturbance unknown, hardscape city synthetic fallback; spatial character mosaic; path yes. Scaled map loaded. Uses the browser’s synthetic Pijnacker defaults; reproduces an approximately 11,472 m² outline.

**Candidate list (13):**

- Trees: Wilde lijsterbes (demo-core-47), Zwarte els (demo-core-43).
- Shrubs: Sporkehout (demo-core-42), Grauwe wilg s.l. (demo-core-34).
- Flowers & herbs: Moerasspirea (demo-core-06), Rode klaver (demo-core-16), Echte valeriaan (demo-core-13), Blauwe knoop (demo-core-12), Watermunt (demo-core-07).
- Grasses, sedges & rushes: Gewoon reukgras (demo-core-32), Oeverzegge (demo-core-24), Pijpenstrootje (demo-core-29), Pitrus (demo-core-25).

**Plan:** Generated; 2 trees; 4,215 approximate plants. 4,215 estimated plants · 13 species

**Placed species and approximate quantities:**

- Trees: Wilde lijsterbes 1, Zwarte els 1.
- Shrubs: Sporkehout 107, Grauwe wilg s.l. 100.
- Flowers & herbs: Moerasspirea 107, Rode klaver 599, Echte valeriaan 107, Blauwe knoop 599, Watermunt 698.
- Grasses, sedges & rushes: Gewoon reukgras 474, Oeverzegge 474, Pijpenstrootje 474, Pitrus 474.

**Checks:** No browser script errors. 9 plan warnings; the full warning text is in the raw result file.

## Untouched urban city defaults — candidate-only checks

These four checks used 30 × 30 m map plots, left the site fields at their initial values, and stopped at the candidate palette. No plan was generated in these diagnostic checks; the 11 full scenarios above cover plan generation. Each city now starts disturbance at `unknown` with origin `unknown`, rather than assuming a level of road stress.

| City | Disturbance | Tree candidates | Tree list | Plan |
| --- | --- | ---: | --- | --- |
| delft | unknown (unknown) | 8 | Wilde lijsterbes, Ruwe berk, Spaanse aak, Winterlinde, Zomereik, Zwarte els, Schietwilg, Ratelpopulier | Not run in this candidate-only check |
| rotterdam | unknown (unknown) | 8 | Wilde lijsterbes, Ruwe berk, Spaanse aak, Winterlinde, Zomereik, Zwarte els, Schietwilg, Ratelpopulier | Not run in this candidate-only check |
| utrecht | unknown (unknown) | 8 | Wilde lijsterbes, Ruwe berk, Spaanse aak, Winterlinde, Zomereik, Zwarte els, Schietwilg, Ratelpopulier | Not run in this candidate-only check |
| amsterdam | unknown (unknown) | 4 | Wilde lijsterbes, Ruwe berk, Zwarte els, Ratelpopulier | Not run in this candidate-only check |

## Reproduce

Start `node server.mjs` from the repository root. Set `NODE_PATH` to the bundled Playwright dependency directory on this machine, then run `node tests/west-location-audit.mjs`, `node tests/north-sites-investigation.mjs`, `node tests/east-south-scenarios.mjs`, `node tests/pijnacker-repro.mjs`, and `node tests/tree-placement.mjs`. The browser scripts print JSON results; `node tests/build-site-report.mjs` rebuilds this report from the saved JSON outputs.

Raw results: [west](../tests/west-sites-results.jsonl), [north](../tests/north-sites-results.jsonl), [east/south](../tests/east-south-results.jsonl), [Pijnacker](../tests/pijnacker-results.json), [city defaults](../tests/city-default-results.jsonl).
