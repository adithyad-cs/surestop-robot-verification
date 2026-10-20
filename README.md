# SureStop: Find. Verify. Then arrive.

**Robots should verify the intended target before reporting arrival.**

SureStop is a browser-based robot simulation for the Hack in Hills ’26 *Vision-Based Autonomous
Robot* track (Team Nexora4).
- A simulated robot searches a two-room floor. A real object detector (TensorFlow.js COCO-SSD)
  runs on the pixels its camera renders.
- A terminal-verification layer decides whether a candidate is a **physical, three-dimensional
  potted plant** or only looks like one, such as a framed print or a display.
- It decides by collecting depth evidence from distinct viewpoints, and it abstains when the
  evidence stays insufficient.
- A separate evaluator module scores every mission against ground truth the robot never sees.

> Scope: a category-level task in simulation. No real-robot, safety, instance-identity,
> novelty or statistical-guarantee claims.
> See [`/method`](src/app/method/page.tsx) and [PERCEPTION_FEASIBILITY.md](PERCEPTION_FEASIBILITY.md).

## What works (tested)

| Area | Implemented |
|---|---|
| Simulation | Three.js r186 scene, 14 × 10 m two-room layout, CC0/CC-BY glTF assets, seeded scenarios, robot kinematics, A* on an occupancy grid |
| Sensor | 640×480 robot camera tied to the robot pose; pixel-aligned depth pass validated against ray casting (median error 0.08 mm); seeded noise σ(z) = 2 mm + 0.004·z² m |
| Perception | COCO-SSD 2.2.3 (`lite_mobilenet_v2`, self-hosted weights) on the rendered pixels; WebGL backend on GPUs, WASM when WebGL is software-rendered |
| Verification | Per-view evidence (relief above noise, two-plane check), one vote per viewpoint cell, CONFIRMED / REJECTED / UNCONFIRMED, bounded planned re-observation (≤ 4 viewpoints) |
| Baselines | Single-frame threshold (VLFM-style), temporal persistence (K of N frames), a single-view SureStop ablation |
| Mission | Shared search route, candidate tracks, approach and stop, budgets, candidate-level and mission-level event log |
| Evaluation | Ground-truth evaluator kept separate from the robot; mission metrics with numerators, denominators and Wilson 95 % intervals; CSV/JSON export |
| UI | `/` entry, `/console` Mission Control, `/lab` Verification Lab, `/method` methodology |

## The task and why this target

- **Goal:** the robot gets the COCO class `potted plant` and must stop at a real 3-D one.
- **Why not the PPT's fire extinguisher:** COCO-SSD has no fire-extinguisher class, so the
  prototype uses a detector-supported class. That is narrower than the deck, and disclosed.
- **Phase A evidence** ([report](PERCEPTION_FEASIBILITY.md)):
  - Measured on real renders, the detector finds the 3-D plant in 23/24 viewpoints at ≥ 0.5.
  - It also labels framed prints and displays of the plant as "potted plant" (up to 0.86 and
    0.80).
  - Depth separates the two: 0.10–0.19 m of relief for the plant against ≤ 0.012 m for the
    pictures.
- **Known limitation:** a 3-D vase of flowers is also called "potted plant", and depth cannot
  reject it. The `lookalike-3d` scenario shows this failure on purpose.

## Results (preliminary, simulation)

**Data.** 560 recorded missions on held-out seeds 1001–1020: 7 scenarios × 4 methods × 20 seeds.
Every mission used real rendering and real COCO-SSD inference. Ground truth was used only by the
evaluator.

**Threshold selection.** Baseline thresholds were chosen beforehand on calibration seeds 101–110,
using a fixed rule. The full tables are generated from the data in
[`docs/RESULTS.md`](docs/RESULTS.md), and the **Verification Lab** (`/lab`) recomputes them in the
browser.

| Method | False-arrival rate (all 7) | Completion (all 7) | False-arrival rate (original 6) | Completion (original 6) | Mean path (all 7) |
|---|---|---|---|---|---|
| Single-frame, τ = 0.9 (tuned) | 19% (16/85) | 86% (121/140) | **0% (0/65)** | 98% (117/120) | 23.7 m |
| Persistence, τ = 0.8 (tuned) | 39% (33/85) | 59% (83/140) | 42% (27/65) | 58% (70/120) | 21.7 m |
| SureStop, one-view ablation | 8% (7/85) | 95% (133/140) | 11% (7/65) | 94% (113/120) | 28.8 m |
| SureStop | **0% (0/85)** | **100% (140/140)** | **0% (0/65)** | 100% (120/120) | 36.2 m |

What this does and does not show:
- **Original six scenarios.** The tuned single-frame threshold also had no false arrivals
  (0/65).
  - Seen from the search route, our prints and displays scored below the real plant. Across
    all held-out route views, the best print score was 0.78 and the best display score 0.44.
  - The plant's best score per encounter in single-frame runs was 0.80–0.99 (median 0.98);
    101 of 104 encounters reached 0.9.
  - Closer views score higher. When the persistence baseline stepped towards them, prints
    reached 0.95 and displays 0.98. So the threshold works here partly because of where the
    route sees the decoys from.
  - SureStop's measurable differences on these six:
    - 3 extra completions (occluded target). These are not distinguishable at 20 seeds: exact
      paired test p = 0.25.
    - About 39 % more path (36.1 m against 25.9 m).
- **Where false arrivals differ.** All 16 single-frame false arrivals come from
  `photo-board-decoy`, a free-standing, life-size photo of the plant.
  - In single-frame runs, the board's best score per encounter was 0.87–0.99 (median 0.97), and
    16 of 20 encounters reached τ = 0.9. SureStop falsely arrived in 0/20.
  - We added this scenario *after* the first calibration run showed the score gap (see
    `/method`). It also moved the selected persistence threshold from 0.6 to 0.8.
  - It demonstrates the mechanism: flat-surface evidence does not depend on the detector score.
    It does not show how common such decoys are.
- **The vase look-alike was not rejected by depth.** It is volumetric.
  - The vase became a candidate in 18 of 20 trials, and all 18 ended UNCONFIRMED. That happened
    because the detector did not label it "potted plant" consistently from two distinct
    viewpoints.
  - The one-view ablation falsely arrived in 7/20. A look-alike that is detected consistently
    would be confirmed.
- **Mission-level abstention never occurred on held-out seeds.** The UNCONFIRMED path is covered
  by unit tests and appeared in calibration v1, but its held-out frequency is not validated.
- **Caveats.**
  - These are our scenarios and our decoys, in simulation, with 20 trials per cell.
  - SureStop's planner and decision rules were revised after inspecting calibration v1 on the
    calibration seeds; the baselines only had a threshold sweep.
  - Our persistence baseline is one simple design and is weak here:
    - it approaches every candidate at the 0.3 detection floor
    - close views inflate decoy scores
    - three consecutive frames below τ reject a candidate permanently; this rejected 24 of 99
      real-plant candidates

    Its results do not generalise to temporal-persistence methods.
  - Idealised setup: the robot's prior occupancy map contains the candidate objects'
    footprints, and the fixed route was written knowing where the object slots are.

## Run locally

Requirements: Node ≥ 20.9 and a browser with WebGL2 (desktop Chrome, Edge or Firefox).

```bash
npm ci
npm run dev            # http://localhost:3000
# or a production build
npm run build && npm start
```

There is no backend, database, API key or account. The detector weights (17 MB) and 3-D
assets are served from `public/`.

## Tests

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Vitest unit tests: verifier, depth features, planner, baselines,
                    # mission runner, metrics, export, ground-truth isolation
npm run build
npm run test:e2e    # Playwright: routes, a real mission, Lab export/batch, responsive,
                    # keyboard, reduced motion. Starts `next start` on :3200 (build first).
```

In a container without a GPU, the end-to-end suite uses SwiftShader. A full mission takes
about 1–2 minutes there.

## Reproduce experiments

Seeds:
- Calibration seeds are 101–110. They were used to pick the baseline thresholds and, in
  calibration v1, to debug SureStop (see `/method`).
- Evaluation seeds are 1001–1020, held out.

These are the commands that produced the committed data. They were recovered from the build
session and checked again with a reduced seed list (see `docs/FINAL_AUDIT_REPORT.md`). Each
batch runs real rendering and inference in headless Chromium against a production server. The
batch harness `/diagnostics/mission` is only included in a build made with
`SURESTOP_DIAGNOSTICS=1`.

**Times** on a 4-vCPU container without a GPU (SwiftShader + WASM), with two processes in
parallel:

| Run | Missions | Time |
|---|---|---|
| Calibration v2 | 770 | about 32 min |
| Evaluation | 560 | about 56 min |

**Setup:**

```bash
npm ci
npm run build:diagnostics           # = SURESTOP_DIAGNOSTICS=1 next build
npx next start -p 3100 &
mkdir -p repro
```

**Calibration v2.** Seeds 101–110, all 7 scenarios, 11 variants: 770 missions.

```bash
SEEDS=$(seq -s, 101 110)
V="single-frame@0.5,single-frame@0.6,single-frame@0.7,single-frame@0.8,single-frame@0.9,persistence@0.5,persistence@0.6,persistence@0.7,persistence@0.8,surestop,surestop-1view"
node scripts/missions.mjs http://localhost:3100 "run=1&scenarios=clear-target,poster-decoy,screen-decoy,decoys-only&seeds=$SEEDS&methods=$V" repro/calib2a.json &
node scripts/missions.mjs http://localhost:3100 "run=1&scenarios=occluded-target,photo-board-decoy,lookalike-3d&seeds=$SEEDS&methods=$V" repro/calib2b.json &
wait
node scripts/merge-batches.mjs repro/calib2.json repro/calib2a.json repro/calib2b.json
npm run aggregate -- calibration repro/calib2.json repro/calibration.json   # prints the selected τ
```

**Held-out evaluation.** Seeds 1001–1020, 7 scenarios, 4 methods: 560 missions.

```bash
SEEDS=$(seq -s, 1001 1020)
M="single-frame,persistence,surestop-1view,surestop"
node scripts/missions.mjs http://localhost:3100 "run=1&scenarios=clear-target,poster-decoy,screen-decoy,decoys-only&seeds=$SEEDS&methods=$M" repro/evala.json &
node scripts/missions.mjs http://localhost:3100 "run=1&scenarios=occluded-target,photo-board-decoy,lookalike-3d&seeds=$SEEDS&methods=$M" repro/evalb.json &
wait
node scripts/merge-batches.mjs repro/eval.json repro/evala.json repro/evalb.json
npm run aggregate -- evaluation repro/eval.json repro/eval-runs.json         # also writes repro/eval-summary.json
```

**Compare with the committed records.**

```bash
node scripts/compare-runs.mjs repro/eval-runs.json public/data/eval-runs.json
node scripts/compare-runs.mjs repro/calib2.json docs/experiments/raw/calib2.json.gz
```

The script matches runs by scenario, seed and variant. It ignores wall-clock timing (inference
and load times), which differs on every machine. Everything else must match: every frame,
detector score, depth measurement, decision and evaluator score.

`result.config` is reported separately. The original calibration records were made before the
baseline thresholds were selected, so they carry the old default τ for the *other* methods'
unused settings.

**Reduced-seed check, 2026-10-20.** These exact commands were run from a clean copy with seed
101 (77 calibration runs) and seed 1001 (28 evaluation runs). All 105 runs matched the records
apart from timing (see `docs/FINAL_AUDIT_REPORT.md`).

Notes:
- `npm run aggregate -- report public/data/eval-runs.json docs/RESULTS.md` regenerates the
  results tables.
- Writing to `public/data/` would overwrite the committed records, so the commands above write to
  `repro/` instead.
- The original raw calibration batches (v1 and v2) are preserved in `docs/experiments/raw/`, with
  checksums in its `MANIFEST.md`.
- Repeatability has been checked only on the recorded stack: headless Chromium, SwiftShader,
  TF.js WASM. Other browsers or GPUs can give slightly different detector scores.

Any single trial can be replayed in Mission Control: `/console?scenario=<id>&seed=<n>&method=<id>`.

## Deploy (Vercel)

The app is static and client-side, so any Next.js-capable host works.

1. Push this repository to GitHub.
2. On vercel.com, choose **Add New → Project**, import the repository and keep the defaults
   (framework Next.js, build `next build`, Node 20+). `.npmrc` sets `legacy-peer-deps=true`
   for the install.
3. Deploy, then open `/`, `/console`, `/lab` and `/method` directly on the deployment URL. Run
   one mission and one Lab export to confirm the model weights load from the deployment.

**Status:** no deployment has been made or verified from this environment, because there
were no Vercel credentials.

## Repository layout

```
src/sim/          scene, assets, sensor renderer (RGB + depth), world builder
src/perception/   COCO-SSD wrapper, backend selection
src/sensing/      depth features (relief, two-plane RANSAC)
src/verify/       evidence rules, viewpoint cells, SureStop verifier, re-observation planner
src/policies/     single-frame, persistence, SureStop policies
src/mission/      mission runner (search, verify, approach), browser sensor
src/nav/          occupancy grid, A*
src/scenarios/    layout and scenarios (ground truth: evaluator and world builder only)
src/eval/         evaluator, metrics, export
src/experiments/  batch engine, seed protocol
src/console/ src/lab/ src/app/   UI
tests/unit/ tests/e2e/           Vitest and Playwright
scripts/          feasibility, mission batches, aggregation, screenshots
docs/             feasibility data, results
```

## Licences and attribution

- 3-D assets are from the Khronos glTF Sample Assets (CC0 / CC-BY-4.0).
- The detector weights, the TF.js WASM binaries and TF.js itself are Apache-2.0.
- The bundled fonts are Geist (SIL OFL 1.1).
- Libraries such as three.js, React and Next.js are MIT.
- Attributions are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); full licence texts are
  in [`LICENSES/`](LICENSES/).
- **The project's own licence has not been chosen yet.** Until the owners choose one, no reuse
  rights are granted for SureStop's own code.

## Related work

The [Method page](src/app/method/page.tsx) lists prior work and the contribution boundary:
- VLFM (ICRA 2024)
- PSG-Nav (ICML 2026)
- Uncertainty-Informed Active Perception for Open-Vocabulary ObjectNav (arXiv:2506.13367)

We did not reproduce any of these systems and make no comparative claims against them.
