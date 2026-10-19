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

## Results

The recorded comparison on held-out seeds is shown in the **Verification Lab** (`/lab`). It is
computed in the browser from `public/data/eval-runs.json`. Headline numbers and their caveats
are summarised in [`docs/RESULTS.md`](docs/RESULTS.md).

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
