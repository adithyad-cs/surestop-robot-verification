# UI research notes

_Research pass: 2026-10-20. Bounded to about an hour, as the release prompt asks._

## How the sources were reached

The build environment's network policy blocks most external sites. Its proxy answers
`CONNECT tunnel failed, response 403` for `pinterest.com`, `foxglove.dev`, `docs.foxglove.dev`,
`rerun.io`, `threejs.org`, `lucide.dev`, `motion.dev`, `developer.mozilla.org`, `w3.org`,
`dribbble.com`, `behance.net`, `awwwards.com` and every robotics product site tried. The
separate page-fetch tool also failed DNS for those hosts. The source was reached in one of
three ways instead:

- **[R] Read directly:** repository files and documentation sources via
  `raw.githubusercontent.com`, or a GitHub page via the fetch tool.
- **[S] Search summary:** a web-search engine's summary of the page, with the URL it cited. I
  did not open the page myself, so these are second-hand and marked as such.
- **[B] Blocked:** not read at all. Nothing is claimed about the content.

Observations (what the source says) are kept separate from **Interpretation** (what I take
from it for SureStop).

## Sources

### Robotics visualisation

**Rerun: https://github.com/rerun-io/rerun [R]**
- Observation (README):
  - "The built-in viewer renders everything in sync, in realtime: scrub episodes, compare
    sensors side-by-side, watch CV pipelines run live."
  - Data is logged against a named timeline (`rr.set_time("frame", sequence=42)`) under
    hierarchical entity paths.
  - For robot debugging it suggests logging the RGB feed, depth, the 3-D map, and "all the
    objects the robot has detected (or thinks it has detected) … its confidence", so you can
    "go back and pinpoint exactly what went wrong, when and why".
  - Licence: MIT and Apache-2.0 (`LICENSE-MIT`, `LICENSE-APACHE` present).
- Interpretation:
  - One shared time index should drive every view.
  - In SureStop: one frame scrubber should drive the robot camera, the depth image and the
    evidence panel.
  - Detections should be logged in the same space as the sensor data, so the scene view and
    the camera view agree.
- Not transferable: the data platform, columnar storage and a native viewer.

**Rerun docs: https://rerun.io/docs/concepts/visualization/blueprints and related pages [S]**
- Observation (search summary):
  - A timeline panel at the bottom "controls the current point in time being viewed".
  - Views (2-D and 3-D spatial, time series, text log) are arranged by "blueprints".
- Interpretation: a bottom timeline is a familiar convention for this kind of tool.
- **Blocked:** `rerun.io/docs/howto/visualization` and `rerun.io/` [B].

**Foxglove Studio repository: https://github.com/foxglove/studio [R]**
- Observation: the README describes "a visualization and observability platform for robotics
  development". The open-source studio repository is the older one; the current product is
  documented at docs.foxglove.dev.
- Interpretation: treat it as a UX reference only, not as a dependency.

**Foxglove docs: Image panel, 3D panel, layouts [S]**
- Pages: https://docs.foxglove.dev/docs/visualization/panels/image,
  https://docs.foxglove.dev/docs/visualization/panels/3d and
  https://foxglove.dev/product/visualization.
- Observation (search summaries):
  - Image annotations use pixel coordinates and are published as a separate annotation stream
    over the base image.
  - A "Sync timestamps" option renders a frame only when every participating topic has a
    message with the same timestamp.
  - The 3D panel can show an image as a plane projection or a depth map.
  - Layouts combine 3D, Image, Plot, Map and Table panels, with "synchronized playback across
    panels".
- Interpretation:
  1. Keep sensor pixels and annotations visibly separate. The detector boxes are an overlay on
     the camera frame, not part of it.
  2. Never show a depth image from one frame next to the RGB image of another; every panel
     follows the selected frame.
  3. Use split panes, not floating cards.
- **Blocked:** the three docs URLs in the release prompt, and `foxglove.dev` [B].

**streetscape.gl (Uber AVS): https://github.com/uber/streetscape.gl [R]**
- Observation:
  - "A toolkit for visualizing autonomous and robotics data in the XVIZ protocol", built on
    React and vis.gl. MIT licence.
  - The repository docs list playback with seeking forwards and backwards, "turn on/off
    primitive streams", and "select objects to display additional annotation".
- Interpretation:
  - Toggleable layers (path, candidates, ground truth) plus a seekable timeline make a minimal
    and sufficient model.
  - XVIZ and the geo base-map do not transfer.

### Web 3-D and implementation

**three.js examples index: https://github.com/mrdoob/three.js/blob/dev/examples/files.json [R]**
- Also read: the sources of `webgl_multiple_scenes_comparison.html` and `webgl_camera.html`.
- Observation:
  - The comparison example renders two scenes into one canvas with `setScissor`, split at a
    draggable `.slider` (`pointerdown`/`pointermove`, `touch-action: none`).
  - `webgl_camera` renders an overview and the camera's own view side by side, with a
    `CameraHelper` frustum.
  - MIT licence.
- Interpretation:
  1. A **split "wipe" comparison** is a standard, low-cost way to compare two renderings of the
     same view. For SureStop the two renderings are RGB and depth of the same recorded frame.
     It can be done with CSS `clip-path` over two `<img>` elements, with no WebGL on the landing
     page, and driven by an `<input type="range">` so it works by keyboard.
  2. The console already pairs an overview with the robot's own view, the same idea as
     `webgl_camera`.
- **Blocked:** `threejs.org/examples` and `threejs.org/docs` [B]. The `WebGLRenderer` notes come
  from the installed source (`node_modules/three/src/renderers/WebGLRenderer.js`:
  `setAnimationLoop`).

**React Three Fiber: https://github.com/pmndrs/react-three-fiber [R]**
- Also checked: `pmndrs/react-three-examples` [R via the fetch tool].
- Observation:
  - MIT licence.
  - "A React renderer for threejs"; `@react-three/fiber@9` pairs with React 19.
  - `react-three-examples` is a WebGPU-first port that pins three 0.185 and calls itself alpha.
- Interpretation: there is no reason to migrate. SureStop already drives Three.js directly
  and renders only when the mission advances.

**shadcn/ui: https://github.com/shadcn-ui/ui [R]**
- Observation: MIT; "Composable, accessible components"; built on Radix / Base UI and Tailwind.
- Interpretation:
  - Its principle (native, accessible primitives with owned source) already holds in SureStop:
    native `<select>`, `<input type="range">`, `<details>`, `role="radiogroup"`.
  - Adopting it would bring in Tailwind and Radix for little gain.

**Lucide: https://github.com/lucide-icons/lucide/blob/main/LICENSE [R]**
- Observation: ISC licence.
- Interpretation:
  - The app needs about five glyphs, so inline SVG with one stroke width is enough.
  - No icon dependency is added.
- **Blocked:** `lucide.dev/guide/react` [B].

### Motion and accessibility

**WCAG 2.1 SC 2.3.3 "Animation from Interactions"**
- Read from the source:
  https://github.com/w3c/wcag/blob/main/understanding/21/animation-from-interactions.html [R].
- Observation:
  - "Support user preferences for motion, and eliminate unnecessary motion effects."
  - It cites parallax and "scaling or panning large objects" as triggers.
  - "Animation that is essential to the functionality or information … is allowed."
  - Honouring `prefers-reduced-motion` is one listed solution.
- Interpretation:
  - Robot movement in Mission Control is essential information, so it stays.
  - It is already turned into jump cuts under reduced motion.
  - The landing animation is non-essential, so it is removed under reduced motion and the final
    state is shown.

**MDN `prefers-reduced-motion`**
- Read from the source:
  https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/at-rules/@media/prefers-reduced-motion/index.md
  [R].
- Observation:
  - The user setting asks to minimise "non-essential motion".
  - Scaling or panning large objects can be a vestibular trigger.
  - The example replaces a scaling animation with a "dissolve".
- Interpretation: under reduced motion, positional sweeps become opacity changes, or nothing.

**Motion for React accessibility guide: https://motion.dev/docs/react-accessibility [S]**
- Observation (search summary):
  - With `reducedMotion="user"`, "all motion components will automatically disable transform
    and layout animations, while preserving the animation of other values like opacity".
- Interpretation:
  - Use the same rule in CSS: transforms and positional movement off, opacity allowed.
  - No Motion dependency is needed for the few effects planned.

### Evidence and result visualisation

**Uncertainty-visualisation literature, found through web search [S]**
- Sources:
  - https://arxiv.org/pdf/2007.14516
  - https://ww2.amstat.org/meetings/proceedings/2019/data/assets/pdf/1199549.pdf
  - https://r-statistics.co/Visualizing-Uncertainty-in-R.html
- Observation (search summaries):
  - Interval displays are often misread.
  - Bars with error bars "visually overemphasize the point estimates".
  - Dot-plus-interval and quantile dot plots are recommended alternatives.
- Interpretation:
  - Keep the Lab's dot-plus-interval plot; never use bars.
  - Always print numerator/denominator next to the rate.

**NVIDIA DRIVE IX perception visualisation (https://blogs.nvidia.com/?p=41542) [S]**
- Observation (search summary): five progressive views: camera feed, then labelled bounding
  boxes, then lane lines, then planned path, then control graphs.
- Interpretation: use progressive disclosure. The landing page shows camera → detection →
  depth → decision in that order.
- **Blocked:** the page itself [B].

### Pinterest and inspiration boards [B]

All five Pinterest URLs in the release prompt were blocked (proxy 403; the fetch tool reported
DNS failure):
- https://www.pinterest.com/ideas/robotic-app-interface-design/908025947728/
- https://www.pinterest.com/ideas/robotics-website-design-examples/922213512299/
- https://www.pinterest.com/ideas/robot-panel-design/897072978963/
- https://www.pinterest.com/davina5361/industrial-ui/
- https://www.pinterest.com/ideas/modern-robotic-interface-design/920600519718/

Dribbble, Behance and Awwwards were also blocked. **No Pinterest or design-gallery content was
seen**, and no visual idea below is attributed to one.

### Product landing pages [B]

All of these were blocked: Formant, Viam, Applied Intuition, NVIDIA Isaac Sim, Skydio,
Boston Dynamics Orbit, Waymo Driver, Anduril, the Foxglove homepage and the Rerun homepage. No
claims are made about their composition.

## Lessons applied

**Supported by a source I could read:**
- **One time index drives every evidence view:** Rerun [R]; Foxglove sync [S]. → A frame
  scrubber in Mission Control.
- **Annotations are a separate layer over the sensor data:** Foxglove [S]; streetscape.gl [R].
  → Boxes and sampled regions drawn as overlays, labelled as model output.
- **Split comparison of two renderings of the same view:** three.js example [R]. → RGB / depth
  wipe on the landing page.
- **Remove non-essential motion; turn positional moves into fades:** WCAG [R], MDN [R], Motion
  [S]. → Implemented in CSS.
- **Dot plus interval with counts, no bars:** uncertainty literature [S]. → Kept in the Lab;
  added a cost-versus-false-arrival view in the same form.

**My own design judgement, not taken from a source:**
- The editorial typography.
- The viewpoint "rose" that plots each verification view around a candidate.
- The specific palette refinements.
