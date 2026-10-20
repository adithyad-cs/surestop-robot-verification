# Experiment data

| File | What it is |
|---|---|
| `public/data/calibration.json` | Calibration v2 summary: seeds 101–110, all 7 scenarios × 11 method variants = 770 real-inference missions. It holds the selection rule and the selected baseline thresholds. The Lab's calibration table reads this file. |
| `public/data/eval-runs.json` | Held-out evaluation: seeds 1001–1020, 7 scenarios × 4 methods = 560 missions. Each run is stored in full (frames, candidate evidence, events, trajectory, evaluator score). The Lab computes every metric from this file. |
| `docs/experiments/calibration-v1-summary.json` | The first calibration run (commit 2c5200c). It led to two SureStop fixes and the photo-board scenario (see `/method`, "Changes made after the first calibration run"). Superseded; kept for transparency. |
| `docs/experiments/raw/calib-v1.json.gz`, `docs/experiments/raw/calib2.json.gz` | The original raw calibration batch outputs (660 and 770 complete mission records), preserved byte for byte as gzip, plus the batch console logs. Checksums, provenance and the exact commands are in `docs/experiments/raw/MANIFEST.md`. |
| `docs/RESULTS.md` | Tables generated from the two files above by `npm run aggregate -- report`. Not hand-edited. |

How the data was produced:
- `scripts/missions.mjs` drives `/diagnostics/mission` in headless Chromium against `next start`.
- It runs two processes in parallel, then `scripts/merge-batches.mjs` combines them.
- `npm run aggregate` summarises the result.

Rendering is software WebGL (SwiftShader). Inference uses the TF.js WASM backend, selected
automatically, and the backend is recorded in each file.
