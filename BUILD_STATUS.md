# Build status

_Last updated 2026-10-19, during Phase D/E: calibration v2 running; evaluation pending._

## Implemented
- **Phase A, perception:** COCO-SSD 2.2.3 runs on real Three.js renders, with a pixel-aligned
  depth pass and a noise model. Gate 1 **passed** (see PERCEPTION_FEASIBILITY.md).
- **Phase B, verification engine:**
  - per-view evidence: relief above noise, plus a two-plane RANSAC check
  - viewpoint-cell deduplication
  - SureStop verifier: CONFIRMED, REJECTED (flat or not reproducible) and UNCONFIRMED
  - bounded re-observation planner
  - baselines: single-frame and persistence (K of N)
- **Phase C, end-to-end mission:**
  - seven seeded scenarios
  - world builder with a label-free occupancy map
  - A* navigation
  - browser RGB-D sensor with real inference
  - mission runner with candidate-level and mission-level event logs
  - evaluator that reads ground truth, kept separate from the robot
- **Phase D, experiments:**
  - batch engine with threshold variants
  - seed protocol: calibration 101–110, held-out evaluation 1001–1020
  - aggregation, calibration selection and the generated report
  - CSV/JSON export
- **Phase E, UI:**
  - `/`: entry page using real mission frames
  - `/console`: live 3-D view, camera, depth, verifier readout, candidates, timeline,
    post-mission evaluator panel
  - `/lab`: recorded and browser datasets, metrics with denominators and CIs, interval plot,
    trial traces, live batches, exports, calibration table
  - `/method`: parameters read from code, prior work, limitations

## Commands actually run
| Command | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npx eslint .` | pass |
| `npx vitest run` | pass: 67 tests |
| `npx next build` | pass |
| Feasibility harness (WebGL 282 frames; WASM 107 + 203 + 9 frames) | completed |
| Mission batches with real inference: seed smoke runs; calibration v1, 660 missions, 39 min, 0 console errors | completed |
| Playwright console run (poster-decoy, seed 1, SureStop): ARRIVED at the plant after REJECTING the print | completed |
| Screenshots of `/`, `/method`, `/console` at 1440 / 1024 / 390 px: no horizontal overflow | completed |

## Findings that changed the plan, reported as they happened
- **Calibration v1:** single-frame with a tuned τ = 0.9 matched or beat SureStop. Prints,
  displays and the vase never scored above 0.86, while the plant scored 0.90–0.99.
- **Two defects fixed after v1:**
  - Planner rings were too close, so views of the plant were truncated.
  - There was no rejection path for non-reproducible detections.
- **New stress-test scenario:** `photo-board-decoy` was added, a life-size photo that scores
  0.96–0.99. It was added after v1 and is reported separately.

## Known limitations
- Category-level task only.
- A 3-D look-alike (vase of flowers) cannot be rejected by depth.
- Simulation only; decoys designed by us; 20 trials per cell; preliminary.
- Software WebGL in this container (inference measured: WASM 140 ms median).

## Remaining
- Calibration v2, then setting the default baseline thresholds, then the held-out evaluation
  (7 scenarios × 20 seeds × 4 methods).
- Generate `docs/RESULTS.md` and `public/data/eval-runs.json`.
- Run the Playwright end-to-end suite against the production build, then final QA.
- Deployment: no Vercel credentials here, so manual steps are in the README.
