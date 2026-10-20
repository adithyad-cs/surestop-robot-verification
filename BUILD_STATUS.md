# Build status

**Updated:** 2026-10-20.
**Branch:** `feature/surestop-prototype`. `main` is untouched.
**Done:** phases A–F, the final audit (2026-10-19), audit remediation and the UI redesign
(2026-10-20).
**Not done:** deployment. There are no Vercel credentials in this environment.

## Implemented

**Perception (Gate 1 passed).**
- COCO-SSD 2.2.3 runs on real Three.js renders, with a pixel-aligned depth pass and a noise model.
- Report: `PERCEPTION_FEASIBILITY.md`; raw outputs: `docs/feasibility/`.

**Verification engine.**
- Per-view evidence: relief above noise, plus a two-plane check.
- Viewpoint cells: one vote per 0.75 m × 30° cell.
- Outcomes: CONFIRMED, REJECTED (flat, or not reproducible) and UNCONFIRMED.
- A bounded re-observation planner.
- Single-frame and persistence baselines.

**Mission.**
- Seven seeded scenarios, A* navigation and a browser RGB-D sensor with real inference.
- A separate evaluator module scores each mission.

**Experiments.**
- Calibration v1: 660 missions.
- Calibration v2: 770 missions. The raw batches for both runs are preserved byte for byte in
  `docs/experiments/raw/`.
- Held-out evaluation: 560 missions, seeds 1001–1020, in `public/data/eval-runs.json`.

**UI (redesigned 2026-10-20).** The research and decision record is in `docs/UI_RESEARCH.md`,
`docs/UI_DESIGN_BRIEF.md` and `docs/VISUAL_QA.md`.
- `/`: an evidence "motion poster" built from one recorded mission.
  - A camera/depth comparison with one restrained sweep.
  - Route draw-on.
  - Viewpoint roses.
  - The whole recorded set with denominators and path cost.
- `/console`: a frame scrubber drives the camera, depth, verifier and candidate evidence; each
  candidate gets a viewpoint rose and a per-view table; reframed overview camera.
- `/lab`: scenario-set control (All 7 / Original 6 / Photo board only); a path-cost plot; roses in
  trial traces; the dated protocol correction next to the recorded text.
- `/method`: results computed at build time, a chronology, a worked rose example, and the
  limitations added during remediation.
- `/diagnostics/*` returns 404 unless the app is built with `npm run build:diagnostics`.

## Checks run on the final build (2026-10-20)

| Command or check | Result |
|---|---|
| `npx eslint .` | pass |
| `npx tsc --noEmit` | pass |
| `npx vitest run` | 67/67 pass |
| `npm run build` | pass (8 static routes; `/diagnostics/*` → 404) |
| `npx playwright test` against the production build | 11/11 pass (2.7 min); test assertions unchanged |
| axe-core 4.10.2, WCAG 2.0/2.1 A and AA plus best practice | 0 violations on `/`, `/console`, `/lab` and `/method` at 1440 and 390 px (initial states) |
| Horizontal overflow at 1440, 1024, 390 and 360 px | 0 px on all routes |
| Error states | No WebGL → "Unsupported browser"; blocked weights → "Something failed: Failed to fetch"; missing Lab data → message. Run is disabled in each case |
| Lab CSV/JSON export against the records | 560 rows, 8,400 field checks, 0 mismatches |
| Mission Control replay versus records (4 trials) | Trajectory, target-class observations, decisions and evaluator score identical. 2 of 92 other-class detections differ in the 4th decimal. The pre-redesign build is identical to the new one in all 4 |
| README reproduction commands, reduced seeds, clean copy | 77/77 calibration and 28/28 evaluation runs identical to the records apart from wall-clock timing |
| `public/data/*.json` | byte-identical to the audited files (SHA-256) |

## Headline results (held-out; see `docs/RESULTS.md`)

| | All 7 scenarios | Original 6 scenarios |
|---|---|---|
| SureStop false arrivals | 0/85 | 0/65 |
| Tuned single-frame (τ = 0.9) false arrivals | 16/85 | 0/65 |
| SureStop completion | 140/140 | — |
| Mean path, SureStop vs single-frame | 36.2 m vs 23.7 m | — |

All 16 single-frame false arrivals occur on `photo-board-decoy`, which was added after
calibration v1.

## Known limitations

- Category-level task only; COCO-SSD does not identify instances.
- Depth cannot reject a consistently detected 3-D look-alike.
- Simulation only: our own decoys and layout, 20 seeds per cell.
- SureStop was debugged on calibration seeds.
- The persistence baseline is weak by design.
- The map prior contains the candidates; the route was written knowing the object slots.
- Mission-level abstention was never observed on held-out seeds.
- Software WebGL only. Experiments used WASM; GPU timings were not measured.
- `/console` downloads about 41 MB on a cold load (weights and GLB assets used by the
  experiments).

## Waiting on the owners

- Choose a project licence. None is set; see `THIRD_PARTY_NOTICES.md`.
- Approve merging `feature/surestop-prototype` into `main`.
- Approve deployment: import into Vercel (steps in the README), then smoke-test the URL.
