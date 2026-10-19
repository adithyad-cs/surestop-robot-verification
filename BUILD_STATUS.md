# Build status

_Last updated 2026-10-19. Phases A–F are done. Phase G (deployment) is blocked: there are no
Vercel credentials in this environment._

## Implemented
- **Phase A, perception (Gate 1 passed).** COCO-SSD 2.2.3 runs on real Three.js renders, with
  a pixel-aligned depth pass and a noise model. Report: `PERCEPTION_FEASIBILITY.md`.
- **Phase B, verification engine:**
  - per-view evidence (relief above noise, two-plane RANSAC)
  - viewpoint-cell deduplication
  - SureStop verifier: CONFIRMED, REJECTED (flat or not reproducible) and UNCONFIRMED
  - bounded re-observation planner
  - baselines: single-frame and persistence (K of N)
- **Phase C, end-to-end mission:**
  - seven seeded scenarios
  - world builder with a label-free occupancy map
  - A* navigation
  - browser RGB-D sensor with real inference and WASM/WebGL auto-selection
  - mission runner with candidate- and mission-level event logs
  - evaluator, the only robot-adjacent code that reads ground truth
- **Phase D, experiments:**
  - calibration v1 (660 missions, superseded)
  - calibration v2 (770 missions)
  - held-out evaluation (560 missions, seeds 1001–1020)
  - generated `docs/RESULTS.md`
  - Lab data: `public/data/eval-summary.json` (0.65 MB, loaded first) and
    `public/data/eval-runs.json` (10.9 MB, fetched on demand)
- **Phase E, UI:**
  - `/`: real mission frames, one ENTER SYSTEM action
  - `/console`: Mission Control
  - `/lab`: Verification Lab
  - `/method`
  - design brief: `UI_DESIGN_BRIEF.md`

## Commands actually run (latest results)
| Command | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npx eslint .` | pass |
| `npx vitest run` | pass: 67 tests in 6 files |
| `npx next build` | pass |
| `npx playwright test` against the production build | **11/11 pass** (2.8 min): routes and refresh, keyboard ENTER SYSTEM, a real mission end to end, reduced motion, Lab export and inspect, live Lab batch, no overflow at 1024 and 390 px |
| Clean `npm ci` from the lockfile | pass (418 packages) |
| `npm audit --omit=dev` | 0 vulnerabilities (5 high in the dev-only ESLint chain via `braces`; the only fix is a breaking downgrade, not applied) |
| Visual review of `/`, `/console`, `/lab`, `/method` at 1440, 1024 and 390 px | done; defects fixed (cut-away walls, mobile camera fit, label sizes, plot label overlap, tab wrapping) |

## Headline results (held-out seeds; see `docs/RESULTS.md`)
- SureStop: false-arrival rate **0/85**; correct confirmation **120/120**; completion
  **140/140**; mean path 36.2 m.
- Tuned single-frame (τ = 0.9): 16/85, 101/120, 121/140; path 23.7 m.
- On the original six scenarios the tuned single-frame threshold also had **0/65** false
  arrivals. The gap comes from the post-hoc `photo-board-decoy` scenario.
- The vase look-alike ended UNCONFIRMED through view inconsistency, not depth.

## Known limitations
- Category-level task only; COCO-SSD cannot identify instances.
- Depth cannot reject a 3-D look-alike that is consistently detected.
- Simulation only:
  - decoys and scenarios designed by us
  - 20 trials per cell
  - SureStop was debugged on calibration seeds
  - the photo board was added after calibration v1
- Software WebGL in this container. Experiments used WASM inference; GPU timings were not
  measured.
- No deployment and no public URL verified.

## Remaining (user actions)
- Merge `feature/surestop-prototype` into `main`, so the default branch shows this work.
- Import the repo into Vercel (steps in the README), then smoke-test the deployed URL.
- Choose a project licence.
