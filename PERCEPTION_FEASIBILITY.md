# Perception feasibility report (Gate 1)

Date: 2026-10-19. Every number below comes from real runs of the harness at
`/diagnostics/perception`, driven headlessly by `scripts/feasibility.mjs`. Raw per-frame outputs
are in `docs/feasibility/*.json`; sample frames (with real detector boxes drawn) are in
`docs/feasibility/frames/`.

## What was tested

- **Renderer.** Three.js r186 WebGL renders of the robot camera: 640×480, 50° vertical FOV,
  mounted 1.0 m high with a 10° down-tilt.
- **Scene.** A furnished 10 × 10 m room, with PBR lighting from an environment map, a
  directional light and shadows.
- **Detector.** TensorFlow.js COCO-SSD 2.2.3, `lite_mobilenet_v2` base, tfjs 4.22.0. Weights
  are self-hosted in `public/models/coco-ssd/` and the detector runs on the rendered pixels
  (`ImageData`).
- **Depth.** A second render pass produces pixel-aligned linear depth (metres along the
  optical axis). The pass honours alpha-masked foliage and skips transmissive glass. A seeded
  noise model is applied, with σ(z) = 2 mm + 0.004·z² m.
- **Assets.** Khronos glTF Sample Assets (CC0 / CC-BY-4.0; see `src/sim/assets.ts`):
  - DiffuseTransmissionPlant (potted plant)
  - GlassVaseFlowers
  - SheenChair
  - ChairDamaskPurplegold
  - GlamVelvetSofa
  - SheenWoodLeatherSofa
  - SpecularSilkPouf
  - CommercialRefrigerator
- **Decoys.** A framed print hung flat on the wall, and a display showing an image. In both,
  the image is a studio render of the same plant asset.
- **Conditions:**
  - 4 distances × 6 bearings for each object
  - posters and screens at 3 distances × 4 off-normal angles
  - partial occlusion behind a crate
  - frame truncation
  - dim lighting
  - empty-room negatives

## Results: real detector output, score ≥ 0.5 / ≥ 0.3 matched to the object's projected box

| Asset / condition | COCO class | n | ≥ 0.5 | ≥ 0.3 | mean best score |
|---|---|---|---|---|---|
| **3-D potted plant**, 1.2–4.2 m, 6 bearings | potted plant | 24 | **23** | 24 | 0.85 |
| plant, dim light (30 %) | potted plant | 3 | 3 | 3 | 0.98 |
| plant, partially occluded by crate | potted plant | 8 | 4 | 4 | 0.50 |
| plant, half out of frame | potted plant | 4 | 2 | 2 | 0.30 |
| **flat print of the plant** on a wall | potted plant | 12 | **4** | 7 | 0.37 |
| **display showing the plant** | potted plant | 12 | **4** | 7 | 0.34 |
| print of the plant, crate in front | potted plant | 8 | 8 | 8 | 0.80 |
| SheenChair | chair | 24 | 18 | 19 | 0.66 |
| ChairDamaskPurplegold | chair | 24 | 9 | 12 | 0.37 |
| print of SheenChair | chair | 12 | 0 | 0 | 0.02 |
| GlamVelvetSofa / SheenWoodLeatherSofa | couch | 24 / 24 | 1 / 11 | 1 / 13 | 0.03 / 0.41 |
| CommercialRefrigerator | refrigerator | 24 | 7 | 8 | 0.25 |
| SpecularSilkPouf | (no COCO class) | 24 | 0 | 0 | — |
| empty room, 12 views | any class ≥ 0.3 | 12 | — | 0 | — |

**Decoy behaviour.**
- Plant prints and displays are detected as "potted plant" at up to **0.86** (print) and
  **0.80** (display) from 1.2–2 m and ≤ 60° off-normal.
- They are not detected at 75° (grazing) or at most angles from 3 m.
- So they are realistic decoys for a threshold rule.

**Look-alike.**
- The glass vase with flowers is labelled **"potted plant" in 10 of 24 views at ≥ 0.5** (up to
  0.82). It is labelled "vase" in none of them at ≥ 0.5.
- COCO-SSD therefore confuses this 3-D object with the target class.

**False positives.**
- "potted plant" never fires at ≥ 0.5 on the chairs, sofas, pouf or refrigerator.
- The floor–wall junction occasionally produces "bench" (up to 0.73). That is not the target
  class.

## Depth separates flat pictures from the 3-D plant

Excess relief is the RMS distance to the best-fit plane above sensor noise, computed inside
the detection box (20 % inset) with sensor noise applied:

| | range | excess relief |
|---|---|---|
| 3-D plant | ≤ 2 m | 0.12–0.19 m |
| 3-D plant | 3 m | 0.14–0.16 m |
| 3-D plant | 4.2 m | 0.10–0.14 m |
| print / display | ≤ 2 m | 0.000–0.005 m |
| print / display | 3 m | ≤ 0.012 m |

A deterministic two-plane RANSAC check distinguishes "volumetric" from "two flat layers": for
example, a crate in front of a picture, or a wall corner.
- For the plant within 2 m, two planes explain ≤ 64 % of points.
- A synthetic crate-over-picture case is fully explained by two planes (unit test).

**Depth/ray alignment.**
- Depth is checked against Three.js ray-casting through the same pixel centres on 2,436
  pixels.
- Median absolute error is 0.08 mm, and 100 % of pixels are within 1 cm on every opaque
  asset.
- The only mismatches (≤ 0.57 m on 4 % of refrigerator pixels) come from its glass door. The
  depth pass deliberately does not return transmissive glass, as many RGB-D sensors behave.

## Latency (this container: 4 vCPU, no GPU, Chromium with SwiftShader software WebGL)

| Backend | model load | inference median | p95 |
|---|---|---|---|
| WebGL (SwiftShader) | 8.0 s | 784 ms | 964 ms |
| WASM (SIMD) | 0.54 s | **140 ms** | 203 ms |
| CPU (pure JS) | 3.4 s | 3,236 ms | 4,020 ms |

- WASM and WebGL produce the same scores (matching to ~1e-7).
- On machines with a hardware GPU, WebGL is expected to be faster. I have not measured that
  here.
- *Planned (not yet implemented at the time of this report):* the application picks WebGL
  when a hardware GPU is reported and WASM otherwise, and records the backend in every run.
- The `lite_mobilenet_v2` weights are 17 MB, self-hosted, and loaded once.

## Decision: target and task definition

- **Task (category-level):** stop at a *physical, three-dimensional potted plant*. Pictures or
  displays of plants are not valid targets.
- **No instance-level identity is claimed.** COCO-SSD predicts a class; it does not identify a
  specific plant.
- **What the robot knows:**
  - the target class name ("potted plant")
  - its own pose
  - RGB and aligned depth images
  - a prior occupancy map for navigation (free/occupied cells only)
  - a fixed search route
- **Evidence that can separate target from decoy:**
  - detector class and score (resemblance only)
  - surface relief above sensor noise from distinct viewpoints (a picture is flat; the plant
    is not)
  - re-detection from more than one viewpoint
- **What cannot be separated, and is reported as a limitation, not hidden:**
  - A 3-D object that the detector mislabels as the target class, such as the vase with
    flowers. Depth shows it is volumetric, so SureStop is expected to confirm it, i.e. a false
    arrival.
  - Transparent targets (depth returns the background).
  - Pictures printed on curved or relief surfaces.
  - Pictures spanning a wall corner (partly mitigated by the two-plane check).
- **Why not the PPT's fire extinguisher:** COCO-SSD has no such class, and no open-vocabulary
  model could be loaded in this environment or within the deadline. The prototype's scope is
  narrower than the deck's, and is disclosed as such.
- **Why not a chair:** chair prints are never detected as chairs (0/12), so a picture decoy
  could not be demonstrated honestly.

## Gate 1 status: **PASSED**

Real inference on real renders works for the selected target. Decoys are genuinely detected
as the target class. Depth evidence separates flat decoys from the target on these assets.
Known failure modes are documented above.
