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
- An independent evaluator scores every mission against ground truth the robot never sees.

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
- **Original six scenarios.** The tuned single-frame threshold also had no false arrivals. Our
  prints and displays score below the real plant (≤ 0.77 against 0.90–0.99), so a threshold
  separates them. Here SureStop's measurable differences are 3 extra completions (occluded
  target) and a cost of about 39 % more path on those six (36.1 m against 25.9 m).
- **Where false arrivals differ.** The gap comes from `photo-board-decoy`, a free-standing
  life-size photo that the detector scores 0.96–0.99. On that scenario single-frame falsely
  arrives in 16/20 trials and SureStop in 0/20.
  - We added this scenario *after* the first calibration run exposed the score gap (see
    `/method`).
  - It shows the mechanism, which is that flat-surface evidence does not depend on the
    detector score. It does not show how common such decoys are.
- **The vase look-alike was not rejected by depth.** It is volumetric. The vase became a
  candidate in 18 of 20 trials, and all 18 ended UNCONFIRMED, because the detector did not label the vase "potted plant" consistently
  from two distinct viewpoints. The one-view ablation falsely arrived 7/20. A look-alike that
  is detected consistently would be confirmed.
- **Abstention never occurred on held-out seeds.** The UNCONFIRMED path is exercised in unit
  tests and appeared in calibration v1.
- **Caveats.**
  - These are our scenarios and our decoys, in simulation, with 20 trials per cell.
  - SureStop was debugged on the calibration seeds of these scenarios.
  - Our persistence baseline may be weaker than other persistence designs.

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
- Calibration seeds are 101–110, used only to pick baseline thresholds.
- Evaluation seeds are 1001–1020, held out.

```bash
npm run build && npx next start -p 3100 &
# calibration sweep of baseline thresholds
node scripts/missions.mjs http://localhost:3100 "run=1&scenarios=clear-target,poster-decoy,screen-decoy,decoys-only,occluded-target,lookalike-3d&seeds=101,102,103,104,105,106,107,108,109,110&methods=single-frame@0.5,single-frame@0.6,single-frame@0.7,single-frame@0.8,single-frame@0.9,persistence@0.5,persistence@0.6,persistence@0.7,persistence@0.8,surestop,surestop-1view" calib.json
npm run aggregate -- calibration calib.json public/data/calibration.json
# held-out evaluation
node scripts/missions.mjs http://localhost:3100 "run=1&scenarios=…&seeds=1001,…,1020&methods=single-frame,persistence,surestop,surestop-1view" eval.json
npm run aggregate -- evaluation eval.json public/data/eval-runs.json
```

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
- The detector weights and TF.js are Apache-2.0.
- Fonts are Geist (SIL OFL).
- Details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- The project's own licence has not been chosen by the team yet.

## Related work

The [Method page](src/app/method/page.tsx) lists prior work and the contribution boundary:
- VLFM (ICRA 2024)
- PSG-Nav (ICML 2026)
- Uncertainty-Informed Active Perception for Open-Vocabulary ObjectNav (arXiv:2506.13367)

We did not reproduce any of these systems and make no comparative claims against them.
