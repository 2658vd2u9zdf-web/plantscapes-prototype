window.PLANTSCAPES_DESIGN_RULES = {
  "schema_version": "0.1.0",
  "dataset_id": "plantscapes_oudolf_case_study_rules",
  "title": "Naturalistic planting composition patterns from the supplied case studies",
  "status": "research prototype; human review required",
  "purpose": "Translate observable composition patterns in the supplied plans into explainable design prompts and checks. This is not a plant suitability catalogue, a planting recipe, or a reconstruction of any source plan.",
  "scope": {
    "region_for_product": "Netherlands",
    "design_reference_style": "Naturalistic, seasonally legible, matrix-and-drift composition",
    "source_cases": [
      "Vlinderhof, Utrecht (book scan, printed pp. 152-153)",
      "Leuvehoofd / Ichtushof / Westerkade, Rotterdam (book scan, printed pp. 100-106)",
      "Private garden planting plans, printed pp. 222-223 (project.pdf)"
    ],
    "transfer_warning": "The plans include ornamentals and cultivars that may not be native to the Netherlands. Transfer compositional principles only; every plant must independently pass Plantscapes' locality, ecological, safety, availability and site-condition checks."
  },
  "evidence_sources": [
    {
      "id": "local-vlinderhof",
      "type": "user-provided scanned plan and accompanying printed caption",
      "file": "../de Vlinderhof Utrecht.pdf",
      "pages": "PDF p. 2; printed pp. 152-153",
      "use": "Source observations about shade zoning, unequal species distribution, persistent structure and short flowering accents."
    },
    {
      "id": "local-leuvehoofd",
      "type": "user-provided scanned planting plans and captions",
      "file": "../Leuvenhoofd, Ichtushof en westerkade.pdf",
      "pages": "PDF pp. 2, 5-6; printed pp. 101, 105-106",
      "use": "Source observations about matrix planting, species-count variation, separate bulb layer, spacing notes and patch/grass-matrix composition."
    },
    {
      "id": "local-private-garden",
      "type": "user-provided scanned planting plans and legends",
      "file": "../project.pdf",
      "pages": "PDF pp. 2-3; printed pp. 222-223",
      "use": "Source observations about edge/underplanting, circulation, tree-shrub framework, repeated species patches and different planting communities."
    },
    {
      "id": "local-plant-reference",
      "type": "user-provided photographed plant reference book",
      "file": "../Plant database.pdf",
      "pages": "PDF pp. 2-20; printed pages visible in scan",
      "use": "Visual cross-check for selected plant names and example trait descriptions; not treated as a complete or machine-verified trait dataset."
    },
    {
      "id": "oudolf-interview-vitra",
      "type": "external interview",
      "url": "https://www.design-museum.de/en/ueber-design/interviews/detailseiten/interview-with-piet-oudolf.html",
      "use": "Designer describes community relationships, year-round plant qualities, basic structural plants, and starting from movement/circulation before composing."
    },
    {
      "id": "asla-hauser-wirth",
      "type": "professional landscape architecture source",
      "url": "https://www.asla.org/news-insights/the-field/piet-oudolfs-garden-for-hauser-wirth",
      "use": "Describes large sweeps/drifts, blocks of colour and texture, repeated clumps, and combinations of perennials, grasses and groundcovers."
    },
    {
      "id": "oudolf-own-books",
      "type": "designer bibliography",
      "url": "https://oudolf.com/books-media",
      "use": "Bibliographic context for Oudolf's own planting-design publications; supports treating these plans as a distinct design corpus, not universal ecological prescriptions."
    },
    {
      "id": "rhs-wild-swan",
      "type": "horticultural plant profile",
      "url": "https://www.rhs.org.uk/plants/281271/anemone-wild-swan-macane001/details",
      "use": "Cross-check for the Vlinderhof legend's Anemone 'Wild Swan' identification."
    },
    {
      "id": "chicago-botanic-amsonia-blue-ice",
      "type": "botanical garden plant profile",
      "url": "https://www.chicagobotanic.org/plant-information/plant-finder/amsonia-tabernaemontana-blue-ice-blue-ice-blue-star",
      "use": "Cross-check for the private-garden plan's Amsonia 'Blue Ice'; parentage is not encoded more specifically than the evidence supports."
    },
    {
      "id": "rhs-geranium-claridge-druce",
      "type": "horticultural plant profile",
      "url": "https://www.rhs.org.uk/plants/97345/geranium-claridge-druce/details",
      "use": "Cross-check for Geranium 'Claridge Druce' cultivar identity."
    },
    {
      "id": "molinia-edith-dudszus",
      "type": "horticultural nursery reference",
      "url": "https://e-katalogroslin.pl/plants/4102%2Ctrzeslica-modra-edith-dudszus_molinia-caerulea-edith-dudszus",
      "use": "Cross-check for Molinia caerulea 'Edith Dudszus'."
    }
  ],
  "cases": [
    {
      "case_id": "vlinderhof-utrecht",
      "source_id": "local-vlinderhof",
      "context": "Multi-bed public garden planting plan with several named beds, a separate high border and a tree list.",
      "observations": [
        "The printed caption says the shadier areas are beds 2, 4 and 5; shade plants are deliberately concentrated there.",
        "The caption describes nearly one hundred species/cultivars, explicitly not distributed evenly.",
        "The caption says the plant mass is mostly composed of plants that retain good structure for a long time; short but abundant bloom is secondary, though it creates episodic high-interest patches.",
        "The drawing uses repeated symbols and coloured patches within beds, rather than a uniform one-species-per-bed scheme.",
        "Trees are individually listed apart from the perennial palette; the drawing does not imply that every bed needs a tree."
      ],
      "design_implications": [
        "condition-specific subzones",
        "uneven role-based abundance",
        "long-lived structure plus ephemeral accents",
        "repeated but varied drifts"
      ]
    },
    {
      "case_id": "rotterdam-leuvehoofd-matrix",
      "source_id": "local-leuvehoofd",
      "context": "Urban public planting beds beside hardscape and water/transport infrastructure.",
      "observations": [
        "Printed caption identifies matrix planting in several beds and names Sporobolus heterolepis as a frequent matrix grass.",
        "The plan repeats a limited set of matrix and structural plants across separate bed shapes, with flowering accents interspersed.",
        "Trees and shrubs are shown as a distinct vertical framework in the broader site imagery and plan context."
      ],
      "design_implications": [
        "matrix continuity",
        "repeat a restrained backbone across discontinuous beds",
        "use accents to interrupt rather than erase the matrix"
      ]
    },
    {
      "case_id": "rotterdam-ichtushof-bulbs",
      "source_id": "local-leuvehoofd",
      "context": "Ichtushof near a metro entrance; perennial/tree plan and bulb plan are shown separately.",
      "observations": [
        "The printed caption says the design uses comparatively few species relative to much of Oudolf's work.",
        "The upper plan combines perennials with trees; a second plan overlays the bulb layer as a distinct seasonal component.",
        "The legend includes explicit group quantities and spacing instructions for bulb groups; these are source-specific annotations, not general rates."
      ],
      "design_implications": [
        "palette complexity can be intentionally low",
        "model bulbs as an overlay/layer",
        "store density and quantity with source and units"
      ]
    },
    {
      "case_id": "rotterdam-leuvehoofd-patch-plan",
      "source_id": "local-leuvehoofd",
      "context": "A later planting plan composed of irregular named patches within a grass-dominated matrix, with individual tree symbols.",
      "observations": [
        "A grass matrix is retained between larger, irregular perennial patches.",
        "Several patches recur as plant communities; the patch edges are varied and interlocking, not a regular grid.",
        "The key gives exact point/group densities for selected taxa, illustrating that planting density can vary by role and species."
      ],
      "design_implications": [
        "patch-and-matrix mode",
        "irregular geometry",
        "density attached to plant-level evidence",
        "trees as discrete canopy anchors"
      ]
    },
    {
      "case_id": "private-garden-plans-222-223",
      "source_id": "local-private-garden",
      "context": "Domestic garden plan around buildings, paths, a pool and garden edges; sheets distinguish underplanting, planted borders and individual plants/groups.",
      "observations": [
        "Planting is composed around circulation and built-space edges rather than as an isolated palette.",
        "Trees and shrubs form an upper layer/edge framework; named shade-tolerant underplanting occurs beneath or beside that framework.",
        "The legend distinguishes group planting from individually placed plants; the plan uses repeated irregular patches and scattered focal marks.",
        "The two sheets show distinct plant communities and spatial treatments, rather than one uniform recipe for the whole garden."
      ],
      "design_implications": [
        "start from geometry and movement",
        "support canopy/understory relations",
        "differentiate mass planting from specimen placement",
        "compose per micro-site"
      ]
    }
  ],
  "planting_roles": [
    {
      "role_id": "matrix",
      "meaning": "A repeated, space-occupying base that visually and spatially links a bed or a set of beds.",
      "typical_traits": [
        "persistent cover",
        "compatible growth habit",
        "reliable structure"
      ],
      "must_not_assume": "Matrix role does not mean grass by default; use a locally appropriate graminoid or herbaceous matrix only when traits and site permit."
    },
    {
      "role_id": "structural_perennial",
      "meaning": "Long-duration form that anchors composition beyond peak bloom.",
      "typical_traits": [
        "strong habit",
        "persistent foliage or stems/seedheads",
        "winter or shoulder-season interest"
      ]
    },
    {
      "role_id": "drift",
      "meaning": "An elongated or flowing repeated mass of one taxon, used to carry rhythm through space.",
      "typical_traits": [
        "clear visual identity",
        "repeatable at site scale"
      ]
    },
    {
      "role_id": "community_patch",
      "meaning": "An irregular, interlocking patch of a small compatible group, repeated or varied as needed.",
      "typical_traits": [
        "shared site tolerances",
        "contrasting but compatible forms/phenology"
      ]
    },
    {
      "role_id": "seasonal_accent",
      "meaning": "A taxon with a concentrated period of bloom, colour or movement that punctuates a more persistent framework.",
      "typical_traits": [
        "distinct seasonal event",
        "may be visually quiet outside its event"
      ]
    },
    {
      "role_id": "scatter_or_specimen",
      "meaning": "A low-frequency individual/group mark used as a focal point, vertical punctuation or naturalistic interruption.",
      "typical_traits": [
        "recognizable silhouette",
        "suitable mature size and sightline impact"
      ]
    },
    {
      "role_id": "bulb_overlay",
      "meaning": "A distinct seasonal layer under or between perennials, represented with its own timing, quantity and spatial pattern.",
      "typical_traits": [
        "seasonal emergence/dormancy",
        "compatible planting depth and disturbance regime"
      ]
    },
    {
      "role_id": "woody_framework",
      "meaning": "Trees and shrubs that define canopy, enclosure, shade and long-term spatial structure.",
      "typical_traits": [
        "mature dimensions",
        "canopy footprint",
        "understory light/moisture effect"
      ]
    }
  ],
  "composition_modes": [
    {
      "mode_id": "matrix_accent",
      "label": "Matrix + accents",
      "description": "A repeated ground layer links the planted area; seasonal and structural plants recur as visible groups within it.",
      "layout_hint": "Keep the matrix spatially continuous where conditions allow; group accents rather than spacing all taxa evenly.",
      "rule_ids": [
        "R03_choose_a_composition_mode",
        "R04_repeat_to_create_rhythm",
        "R05_use_role_and_density_not_equal_shares"
      ]
    },
    {
      "mode_id": "repeated_drifts",
      "label": "Repeated drifts",
      "description": "Use elongated, flowing masses that recur across a bed or a sequence of linked beds.",
      "layout_hint": "Repeat the visual rhythm at varied scales; interrupt drifts only where paths, sightlines, existing vegetation or ecological constraints require it.",
      "rule_ids": [
        "R03_choose_a_composition_mode",
        "R04_repeat_to_create_rhythm",
        "R06_layer_height_around_view_and_canopy"
      ]
    },
    {
      "mode_id": "community_patches",
      "label": "Irregular plant communities",
      "description": "Compose irregular, interlocking patches of compatible plants, with a recurring matrix where appropriate.",
      "layout_hint": "Use site-specific patches rather than a grid; group plants that share confirmed conditions and avoid making every patch identical.",
      "rule_ids": [
        "R03_choose_a_composition_mode",
        "R04_repeat_to_create_rhythm",
        "R09_allow_local_abiotic_subzones"
      ]
    }
  ],
  "rules": [
    {
      "rule_id": "R01_site_and_movement_first",
      "category": "sequence",
      "priority": "required",
      "rule": "Resolve the site geometry, access, use, sightlines and micro-sites before composing the plant palette.",
      "implementation": "Build planting zones from confirmed site conditions and circulation constraints; then filter the plant list; only then assign composition roles and draw patches.",
      "evidence_ids": [
        "local-private-garden",
        "oudolf-interview-vitra"
      ],
      "confidence": 0.93,
      "confidence_basis": "Explicit movement-first process in the interview and site geometry visibly organized around paths/buildings in the supplied plans."
    },
    {
      "rule_id": "R02_ecology_is_a_hard_gate",
      "category": "eligibility",
      "priority": "required",
      "rule": "Design style may rank only plants that already pass hard ecological, geographic, safety and physical-site constraints.",
      "implementation": "eligible = native_or_explicitly_approved AND region_evidence_passes AND abiotic_tolerances_pass AND size_clearance_pass AND toxicity/public_use_constraints_pass; score style only after this filter.",
      "evidence_ids": [
        "local-vlinderhof",
        "local-leuvehoofd",
        "local-private-garden"
      ],
      "confidence": 1,
      "confidence_basis": "Product requirement and explicit transfer limitation; Oudolf plans are ornamental design precedent, not evidence of Dutch native status."
    },
    {
      "rule_id": "R03_choose_a_composition_mode",
      "category": "spatial",
      "priority": "preference",
      "rule": "Offer at least three composition modes: matrix-and-accent, repeated drifts, or irregular community patches. They can be mixed by zone.",
      "implementation": "For each zone store composition_mode; do not globally force one mode. Matrix mode defines a background role; drift mode defines connected elongated groups; patch mode defines interlocking irregular groups.",
      "evidence_ids": [
        "rotterdam-leuvehoofd-matrix",
        "rotterdam-ichtushof-bulbs",
        "rotterdam-leuvehoofd-patch-plan",
        "local-private-garden"
      ],
      "confidence": 0.91,
      "confidence_basis": "Distinct spatial strategies are visible in the plan set and the captions explicitly name matrix planting."
    },
    {
      "rule_id": "R04_repeat_to_create_rhythm",
      "category": "spatial",
      "priority": "preference",
      "rule": "Repeat a manageable set of visual signals across a bed or linked beds, while varying patch size and spacing to avoid a mechanical grid.",
      "implementation": "Track occurrences of each role/species across zones; use repeated patches as the default for accents and drifts; permit exceptions for solitary focal specimens and small spaces.",
      "evidence_ids": [
        "local-vlinderhof",
        "rotterdam-leuvehoofd-matrix",
        "rotterdam-leuvehoofd-patch-plan",
        "local-private-garden",
        "asla-hauser-wirth"
      ],
      "confidence": 0.87,
      "confidence_basis": "Recurring symbols, named plant groups and repeated drifts are observable; exact ideal repetition counts are not established."
    },
    {
      "rule_id": "R05_use_role_and_density_not_equal_shares",
      "category": "density",
      "priority": "required",
      "rule": "Do not distribute species or planting area evenly. Allocate area by role (matrix, structural, accent, ground layer) and use reviewed mature spread/spacing to calculate quantities.",
      "implementation": "area_share is a designer-controlled target per role/zone; plant_count = usable_patch_area / validated_spacing_area. Require spacing_source and unit; never infer counts from a symbol legend without a scale/quantity note.",
      "evidence_ids": [
        "local-vlinderhof",
        "rotterdam-ichtushof-bulbs",
        "rotterdam-leuvehoofd-patch-plan"
      ],
      "confidence": 0.96,
      "confidence_basis": "Vlinderhof caption explicitly says taxa are not evenly distributed; other plans annotate plant-specific quantities/densities."
    },
    {
      "rule_id": "R06_layer_height_around_view_and_canopy",
      "category": "vertical_structure",
      "priority": "required",
      "rule": "Compose low, middle and tall forms in relation to viewpoint, desired sightlines, path edges, buildings and tree canopy; do not apply a universal tallest-at-back rule.",
      "implementation": "Evaluate mature_height and width against camera/view corridors and clearance envelopes; allow tall see-through stems where sightlines matter; model tree shade as a zone-changing canopy effect.",
      "evidence_ids": [
        "local-vlinderhof",
        "rotterdam-ichtushof-bulbs",
        "local-private-garden",
        "oudolf-interview-vitra"
      ],
      "confidence": 0.82,
      "confidence_basis": "Layered tree/understory relationships are legible, but full height dimensions are not encoded consistently in the plans."
    },
    {
      "rule_id": "R07_design_for_full_lifecycle",
      "category": "seasonality",
      "priority": "required",
      "rule": "Score each candidate across emergence, foliage, flowering, fruit/seed, senescence and winter form; do not optimize only for peak flower.",
      "implementation": "Store month ranges separately for bloom, foliage interest, seedhead persistence and winter structure. Portfolio review should show seasonal gaps and overlaps, not require flowers every month.",
      "evidence_ids": [
        "local-vlinderhof",
        "oudolf-interview-vitra",
        "asla-hauser-wirth"
      ],
      "confidence": 0.96,
      "confidence_basis": "Vlinderhof's caption explicitly prioritizes durable structure over short bloom; interview directly confirms all-season plant qualities and skeletons."
    },
    {
      "rule_id": "R08_colour_is_a_layer_not_the_primary_filter",
      "category": "colour_and_texture",
      "priority": "preference",
      "rule": "Build a restrained, recurring colour language from the project brief, then create visual interest through contrast in form, foliage texture, inflorescence and movement; treat flower colour as seasonal and temporary.",
      "implementation": "Represent colour by plant part and month (flower, foliage, fruit/seed, senescent form); compare adjacent patches for both harmony and contrast. Never infer compatibility from colour alone. Treat hand-coloured plan marks as legend identifiers unless the drawing explicitly states that they encode flower colour.",
      "evidence_ids": [
        "local-vlinderhof",
        "oudolf-interview-vitra",
        "asla-hauser-wirth"
      ],
      "confidence": 0.85,
      "confidence_basis": "The supplied plan marks are primarily symbol/legend codes and cannot safely be read as bloom colours. The designer interview states plant interaction/character matters beyond bloom; exact colour proportions are not evidenced."
    },
    {
      "rule_id": "R09_allow_local_abiotic_subzones",
      "category": "site_specificity",
      "priority": "required",
      "rule": "Split a planting area when shade, moisture, soil or disturbance materially changes; select shade and moisture guilds per subzone instead of averaging conditions across the whole polygon.",
      "implementation": "Create subzones where confirmed conditions differ; candidate eligibility and composition role resolve per subzone. If data are provisional, expose the assumption and ask for confirmation.",
      "evidence_ids": [
        "local-vlinderhof",
        "rotterdam-leuvehoofd-patch-plan",
        "local-private-garden"
      ],
      "confidence": 0.94,
      "confidence_basis": "Vlinderhof labels specific shaded beds; the other plans also articulate distinct bed/community contexts."
    },
    {
      "rule_id": "R10_model_bulbs_as_an_overlay",
      "category": "seasonality_and_layers",
      "priority": "optional",
      "rule": "Treat bulbs as a separately scheduled, spatially placed layer under or between perennials, with independent planting depth, density, disturbance and seasonal checks.",
      "implementation": "Use a bulb_overlay layer linked to the host perennial zone; validate phenology and maintenance compatibility; retain the bulb plan as its own visible layer in editor/export.",
      "evidence_ids": [
        "rotterdam-ichtushof-bulbs"
      ],
      "confidence": 0.95,
      "confidence_basis": "The source explicitly presents a separate bulb plan beneath the perennial/tree plan."
    },
    {
      "rule_id": "R11_woody_plants_are_spatial_infrastructure",
      "category": "woody_structure",
      "priority": "conditional",
      "rule": "Add trees or shrubs only when site area, canopy purpose, mature size, utilities, access and desired shade/enclosure justify them; represent their future influence on underplanting.",
      "implementation": "Use mature canopy radius and shade footprint as geometry constraints; re-evaluate understory light/moisture and sightlines at establishment and mature milestones.",
      "evidence_ids": [
        "local-vlinderhof",
        "rotterdam-ichtushof-bulbs",
        "rotterdam-leuvehoofd-patch-plan",
        "local-private-garden"
      ],
      "confidence": 0.89,
      "confidence_basis": "Plans separate tree symbols/lists from ground layers and show trees only in selected positions, not uniformly."
    },
    {
      "rule_id": "R12_keep_uncertainty_and_provenance_visible",
      "category": "explainability",
      "priority": "required",
      "rule": "Every plant, trait and design suggestion must retain its source and confidence; uncertain handwritten names and inferred design patterns must never silently become facts.",
      "implementation": "Use evidence_level (direct_plan_note, visually_read, external_reference, inferred_pattern, mock_value), confidence, source_ref and reviewer_status fields. Suppress unresolved names from the production species catalogue while retaining them in an audit queue.",
      "evidence_ids": [
        "local-plant-reference",
        "oudolf-own-books",
        "rhs-wild-swan"
      ],
      "confidence": 1,
      "confidence_basis": "Provenance requirement for safe expert assistance."
    }
  ],
  "plant_trait_schema": {
    "required_for_composition": [
      "accepted_scientific_name",
      "cultivar",
      "mature_height_cm",
      "mature_spread_cm",
      "habit_form",
      "foliage_texture",
      "inflorescence_form",
      "flower_colour_by_month",
      "foliage_interest_by_season",
      "seedhead_or_winter_structure",
      "phenology_confidence",
      "growth_or_spread_behaviour",
      "site_tolerances",
      "role_affinities",
      "density_or_spacing_value",
      "density_unit",
      "density_source"
    ],
    "recommended_trait_vocabularies": {
      "habit_form": [
        "tuft",
        "clump",
        "mat",
        "rosette",
        "upright_spire",
        "branched_veil",
        "arching_fountain",
        "structural_sculptural",
        "shrub",
        "tree",
        "climber",
        "unknown"
      ],
      "foliage_texture": [
        "fine",
        "medium",
        "bold",
        "filigree",
        "strappy",
        "broad_leaf",
        "feathery",
        "evergreen",
        "seasonal",
        "unknown"
      ],
      "inflorescence_form": [
        "daisy",
        "umbel",
        "spike",
        "panicle",
        "button",
        "plume",
        "globular",
        "bell",
        "open_spray",
        "none_or_inconspicuous",
        "unknown"
      ],
      "role_affinities": [
        "matrix",
        "structural_perennial",
        "drift",
        "community_patch",
        "seasonal_accent",
        "scatter_or_specimen",
        "bulb_overlay",
        "woody_framework"
      ]
    },
    "do_not_guess": [
      "native_status",
      "local_occurrence",
      "toxicity_or_edibility",
      "abiotic_tolerance",
      "invasiveness",
      "quantitative_planting_density"
    ]
  },
  "implementation_sequence": [
    "1. Split site into confirmed ecological and use zones.",
    "2. Hard-filter the plant catalogue by geography, native status policy, abiotic tolerances, safety and mature-size constraints.",
    "3. Ask the designer to choose or accept a zone-level composition mode and target character.",
    "4. Assign feasible species to compositional roles using reviewed morphology and phenology traits.",
    "5. Generate repeated, irregular spatial groups constrained by geometry, accessibility and sightlines.",
    "6. Add any bulb layer separately and validate seasonal/maintenance interaction.",
    "7. Show seasonal/height review, rationale, uncertainty, sources, and designer override controls.",
    "8. Export quantities only where density/spacing is sourced or explicitly selected by the designer."
  ],
  "anti_patterns": [
    "Do not force one fixed trees:shrubs:flowers percentage; the plans demonstrate context-specific structure, not a universal ratio.",
    "Do not maximize species count or spread every species evenly over the site.",
    "Do not choose plants by flower colour alone or require a flower in every calendar month.",
    "Do not auto-place plants from a list without first establishing bed geometry, movement and sightlines.",
    "Do not present the Oudolf source palette as Dutch-native, rewilding-suitable, non-toxic or locally available without separate evidence.",
    "Do not turn visual symbol counts into quantities unless the legend supplies a scale, group count or spacing note."
  ]
};