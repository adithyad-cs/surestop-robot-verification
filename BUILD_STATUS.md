# Build status

_Last updated: 2026-10-19 (Phase A complete; Phase B core in progress)._

## Implemented
- Next.js 16 / React 19 / TypeScript project scaffold; Three.js r186; TF.js 4.22 COCO-SSD 2.2.3 (self-hosted weights).
- Robot-camera sensor renderer: 640×480 RGB + pixel-aligned linear depth pass (alpha-mask aware), seeded depth-noise model.
- Depth feature extractor (plane-fit relief above noise, two-plane RANSAC, truncation, validity).
- Perception feasibility harness (`/diagnostics/perception`, `scripts/feasibility.mjs`).
- Verification engine (pure TS): per-view evidence assessment, viewpoint-cell deduplication, SureStop candidate verifier
  (CONFIRMED / REJECTED / UNCONFIRMED), bounded viewpoint planner; single-frame and temporal-persistence baselines.
- Occupancy grid + A* path planner.

## Commands actually run (results)
| Command | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npx eslint .` | pass (0 problems) |
| `npx vitest run` | pass — 51 tests in 6 files |
| `npx next build` | pass |
| `node scripts/feasibility.mjs` (WebGL, 282 frames; WASM, 107 + 203 frames) | completed; see PERCEPTION_FEASIBILITY.md |

## Gate 1 (perception): PASSED — see PERCEPTION_FEASIBILITY.md

## Limitations known now
- Category-level task only (physical potted plant); no instance identity.
- A 3-D look-alike that COCO-SSD mislabels (vase with flowers) cannot be rejected by depth evidence.
- Software-rendered WebGL in this container: inference measured with WASM (140 ms median) and SwiftShader WebGL (784 ms).

## Remaining
- Phase C: world/scenarios, mission runner, browser sensor, end-to-end mission.
- Phase D: experiment runner, metrics, exports, recorded runs.
- Phase E: UI design brief and routes. Phase F/G: QA, README, deployment.
