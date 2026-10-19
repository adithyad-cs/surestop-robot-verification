# Third-party notices

## 3D assets: Khronos glTF Sample Assets
Source: https://github.com/KhronosGroup/glTF-Sample-Assets (files in `public/assets/models/`, unmodified).

| File | Licence | Attribution |
|---|---|---|
| DiffuseTransmissionPlant.glb | CC0-1.0 (original asset) + CC-BY-4.0 (materials) | Original by Rico Cilliers (CC0); materials © 2024 Eric Chadwick / Darmstadt Graphics Group GmbH, CC BY 4.0 |
| GlassVaseFlowers.glb | CC0-1.0 | Eric Chadwick (vase), Rico Cilliers (flowers) |
| SheenChair.glb | CC0-1.0 | Eric Chadwick / Wayfair, LLC |
| ChairDamaskPurplegold.glb | CC-BY-4.0 | © 2021 Eric Chadwick / Wayfair, CC BY 4.0 |
| GlamVelvetSofa.glb | CC-BY-4.0 | © 2021 Eric Chadwick / Wayfair, LLC, CC BY 4.0 |
| SpecularSilkPouf.glb | CC-BY-4.0 | © 2023 Eric Chadwick / Wayfair, LLC, CC BY 4.0 |

CC BY 4.0: https://creativecommons.org/licenses/by/4.0/. The poster and display images shown in
the simulation are renders of `DiffuseTransmissionPlant.glb` produced at runtime.

## Detector: TensorFlow.js COCO-SSD
- `@tensorflow-models/coco-ssd` 2.2.3, Apache-2.0 (https://github.com/tensorflow/tfjs-models).
- Weights in `public/models/coco-ssd/lite_mobilenet_v2/` are the unmodified `ssdlite_mobilenet_v2`
  TF.js graph model published by the TensorFlow.js team at
  `https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/`, distributed under Apache-2.0.
- `public/tfjs-wasm/*.wasm` are from `@tensorflow/tfjs-backend-wasm` 4.22.0, Apache-2.0.

## Libraries
three.js (MIT), Next.js (MIT), React (MIT), TensorFlow.js (Apache-2.0). See `package.json` / `package-lock.json`.
