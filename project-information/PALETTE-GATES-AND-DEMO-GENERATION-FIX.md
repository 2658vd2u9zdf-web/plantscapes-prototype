# Palette eligibility and demo generation fix — 8 October 2026

## Reported issues and causes

1. Aquatic/marginal species could enter the palette without water. The preference score gave a positive aquatic bonus for seasonal wetness **or** a water edge. That was weaker than the placement engine's ecological gate. A high score could therefore suggest plants which could not be placed.
2. In the inspected workspace, the designer had completed a planting polygon and an open-ground polygon, but **zero paths**. The approved path-first generator intentionally stopped. The existing instruction was not sufficiently actionable for someone expecting a quick demo.
3. During verification, the localhost preview server was no longer running. It was restarted on port 4181, bound to 127.0.0.1 only.

## Changes

- Palette candidates must pass engine eligibility and at least one confirmed zone's soil, moisture, light, water-regime and maintenance checks. Preference scoring ranks candidates only after these hard gates pass. The displayed suggested zone is one that actually passes the gate.
- Aquatic/marginal records require a confirmed water edge plus a compatible wet regime. Seasonal wetness alone does not enable them. Drawing a water feature in the plan still does not silently change confirmed ecological conditions.
- Clicking Generate without a path or planting bed displays a direct explanation and **Add demo path & generate** next to the generation controls. The explicit demo action adds only missing example paths/beds, preserves existing completed spaces, then runs generation. It refuses to discard an unfinished shape. These example spaces remain mock geometry, not design advice.
- The normal generator still requires finished paths before planting; the approved rulebook has not been weakened.

## Checks

Smoke tests passed. The full headless Edge walkthrough passed with 44 candidates in the fresh/clay test, zero aquatic candidates despite seasonal wetness, and an assertion that every candidate fits a confirmed zone. The missing-path prompt and explicit demo action produced a plan. The separate synthetic wet-park scenario still generated 305 marginal positions with no browser JavaScript errors.

Screenshots and `browser-check.json` are in `implementation-checks/`. These results test software logic, not ecological accuracy. All synthetic trait tolerances still require dataset review.

Existing open tabs contain the previous JavaScript in memory. Use the updated `?v=palette-gates-3` preview and recreate the project to apply the repaired palette filtering.
