# SureStop UI design brief

**Revised:** 2026-10-20, after the final audit and a research pass (`docs/UI_RESEARCH.md`).

**What it replaces:** the 2026-10-19 brief. Its working conventions are kept: colour encodes
meaning only, every status has a text label, and every panel states its provenance.

## 1. Users and the critical journey

**Primary user:** a hackathon judge evaluating a technical browser prototype in a few minutes.
**Secondary user:** a technically curious visitor.

**Journey:**
1. Understand the problem: a convincing flat decoy versus a real 3-D target.
2. Enter the simulation.
3. Run or inspect a mission.
4. Understand the evidence and the terminal decision.
5. Compare the recorded results.
6. Read the method and its limitations.

**What each kind of data is, and where it appears:**

| Data | Where | Label |
|---|---|---|
| Live mission (real rendering, real COCO-SSD in this browser) | `/console`, Lab "Runs in this browser" | none needed; the phase is shown |
| Recorded simulation (`public/data/eval-runs.json`, 560 missions) | `/lab` recorded tab, landing poster | "Recorded simulation" plus scenario, seed, method |
| Model prediction (boxes, scores) | camera panels | `MODEL PREDICTION` |
| Sensor measurement (depth, noise) | depth panels | `SENSOR MEASUREMENT` |
| Verifier evidence (per-view verdicts, votes) | evidence panels, viewpoint rose | `VERIFIER EVIDENCE` |
| Evaluator ground truth | console after the mission ends, Lab | `EVALUATOR · GROUND TRUTH`, never shown during a run |

## 2. Current UI review (A)

Captured on 2026-10-20 from a production build at 1440, 1024 and 390 px. A live mission was
captured with real inference (`photo-board-decoy`, seed 1001, SureStop).

**Already excellent; keep:**
- Real camera frames with real detector boxes.
- A depth view that is aligned with the camera frame.
- Per-frame verifier notes and an event log with reasons.
- Status chips that combine text and a glyph.
- Provenance labels on every panel.
- The Lab's counts with denominators, its Wilson intervals and its dot-plus-interval plot.
- Export, replay and the trial decision trace.
- One dominant ENTER SYSTEM action.
- Honest scope notes.

**The five biggest defects:**
1. **The landing page is not memorable.**
   - It uses a generic two-column hero.
   - The decisive comparison (photo board versus plant) is a small 2×2 thumbnail grid.
   - There is no motion and no sense of the robot moving or re-observing. On mobile the evidence
     sits below the fold.
2. **Evidence is scattered in Mission Control.**
   - The reason for a candidate decision is split across the candidates list (left), the
     per-frame evidence (bottom right) and the timeline table (bottom centre).
   - Nothing shows *which viewpoints* the verifier used, which is the core idea.
3. **No shared time control.**
   - The camera, depth and evidence panels follow a tiny ‹ #n › stepper.
   - The event table links frames, but there is no overview of the mission's frames: when the
     robot searched, verified and arrived.
4. **The 3-D scene is poorly framed.** About 15–20 % of the scene canvas is empty bands above
   and below the room at 1440 × 900.
5. **Labels are microscopic.** Panel labels are 10.5–11 px uppercase monospace, which is hard to
   read under motion and drifts toward a "HUD" look.

**Also:**
- The Lab's first viewport is mostly prose.
- The Lab offers the "original six" scenario set only as one option inside the scenario
  dropdown, although every honest reading of the results depends on it. It needs to be a
  first-class control.
- The Lab shows no view of movement cost next to the false-arrival intervals.
- The Method page has no results and no chronology figure.

## 3. Three directions compared

**A. Current implementation**

The running UI described above.

**B. Master-prompt direction**

- A restrained research instrument.
- An editorial, cinematic entry: a "motion poster" made from genuine frames, with a route trace
  that draws itself, an RGB-to-depth reveal and a terminal-state transition.
- A dense workstation console, a scientific Lab and a transparent Method page.
- A graphite and mineral palette: amber for verification, cyan for sensing.

**C. Externally researched direction**

Built from the readable sources in `docs/UI_RESEARCH.md`: an *inspection instrument* in the
manner of Rerun and Foxglove.
- **One time index drives every view** (Rerun [R], Foxglove sync [S]). A frame scrubber drives
  the camera, depth and evidence panels; events select frames.
- **Annotations are a separate, toggleable layer** over sensor data (Foxglove [S],
  streetscape.gl [R]).
- **The landing page is an interactive evidence inspector.** It uses a split RGB/depth "wipe" of
  the same recorded frames, adapted from three.js `webgl_multiple_scenes_comparison` [R], rather
  than a cinematic poster.
- Dot-plus-interval charts with denominators; no bars (uncertainty literature [S]).
- Motion limited to essential state changes; transforms are dropped under reduced motion
  (WCAG 2.3.3 [R], MDN [R], Motion [S]).

### Scores (same criteria and weights for all three)

| Criterion (weight) | A: current | B: master prompt | C: researched |
|---|---|---|---|
| Product and robotics-domain fit (20) | **15**: real perception and depth; the panel layout resembles robotics tools; but the decision logic is not visible as a spatial idea | **17**: instrument framing; uses real frames; no specific mechanism for linking evidence over time | **19**: shared timeline, layered annotations and synchronised panels are the conventions of the robotics debugging tools read (Rerun, Foxglove, streetscape.gl) |
| Information hierarchy and usability (15) | **10**: decision reasons in three places; 10.5 px labels; long mobile stack | **12**: hierarchy per route is defined, but it is a brief, not a mechanism | **13**: "what did it see at frame n, and what did that make the verifier do" is answerable from one control; risk that a tool-first entry overwhelms first-time visitors |
| Distinctive identity and artistic quality (15) | **7**: tidy, but reads as a generic dark dashboard plus hero | **12**: editorial and cinematic poster; risk of the generic "cinematic dark tech" look if not tied to the data | **10**: a credible tool aesthetic, but close to a Foxglove clone; little to remember |
| Landing impact and motion direction (15) | **6**: static thumbnails; no motion | **13**: route draw-on and RGB→depth reveal tell the story; depends on execution quality | **10**: the wipe explains the mechanism but needs the user to act; weaker as a static screenshot |
| Clarity of simulation, evidence and decisions (10) | **7**: everything present but scattered | **8**: a calm decision panel; frame–evidence linking not specified | **10**: per-frame sync plus a wipe that shows "same picture, different depth" |
| Accessibility and responsive (10) | **8**: keyboard, reduced motion and overflow tested; small labels | **8**: specified; a cinematic poster carries motion load | **9**: range inputs are keyboard-native; opacity-only motion |
| Performance and feasibility (10) | **8**: landing 1.5 MB; console 41 MB (model and assets) | **8**: CSS/SVG is light; "cinematic" tempts video | **9**: CSS `clip-path` on 4 existing JPEGs (58 KB); the scrubber reuses frames already in memory |
| Licensing and provenance (5) | **3** as audited: Apache text missing (since fixed in Phase B) | **5**: own captures only | **5**: techniques only; no third-party assets |
| **Total (100)** | **64** | **83** | **85** |

The evidence for A comes from the captured screenshots. B and C are scored as proposals; the
largest risk to each is noted in its cells rather than assumed away.

## 4. Super-judge gate

**First winner: C (85).** It is reviewed against the ten questions:

1. **Suited to robotics and computer-vision research?** Yes. A shared timeline and layered
   annotations are the domain's own conventions.
2. **Communicates the purpose more clearly?** In the console, yes. On the landing page, only
   after interaction. **Fails** as a first impression.
3. **Memorable without being theatrical?** **Fails.** A wipe alone is a utility, not an image.
4. **Visuals explain the product?** Yes; every pixel is a recorded frame.
5. **Mission Control readable while moving?** Yes, provided the scrubber follows the latest frame
   while running and only holds a selection when the user picks one.
6. **Verification outcome and evidence easier to understand?** Partly. The timeline answers
   *when*, not *from where*. The core idea, *distinct viewpoints*, is still not shown.
   **Fails.**
7. **Lab results easier to compare?** Unchanged unless the scenario set is a first-class control.
8. **Distinctive identity?** **Weak.** It risks looking like a generic robotics-tool clone.
9. **Assets licensed and practical?** Yes.
10. **Responsive, accessible, performant?** Yes.

**Strongest objections to C, and their resolution:**
- *(Q2, Q3, Q8) The entry is not memorable.*
  - Adopt B's editorial poster composition, with the C mechanism inside it.
  - Large typographic thesis; the two recorded candidates side by side as RGB/depth wipes.
  - The divider performs one restrained sweep on load (camera → depth), then hands control to
    the user.
  - Below the fold, B's route trace draws itself from the *recorded* trajectory.
  - A static screenshot of the final state shows camera and depth halves and both verdicts.
- *(Q6) Viewpoints are invisible.*
  - Add a **viewpoint rose**: the candidate at the centre, each recorded observation plotted at
    its bearing and range, glyph-coded FLAT / VOLUMETRIC / not re-detected / inconclusive.
  - It is drawn only from recorded `EvidenceRecord`s, in the console, the Lab trace and the
    landing poster.
  - This is my own design proposal, not taken from a source.
- *(Q7) The Lab under-exposes the honest reading.* Promote "All 7 / Original 6 / photo board
  only" from a dropdown option to a first-class control. Add a path-cost view under the
  false-arrival intervals.
- *Weakness found in B: a cinematic poster can mislead about liveness.*
  - Every poster element is labelled "Recorded simulation · photo-board-decoy · seed 1001 ·
    SureStop".
  - No numbers are animated (no counters).
- *Weakness found in the rose: it could become decoration.*
  - It is shown only when a candidate has evidence, always next to the per-view table it
    summarises, with counts in text.
  - Clicking a view selects its frame (console).
- *Risk of overloading the console.*
  - The scrubber replaces the ‹ #n › stepper rather than adding a control.
  - The evidence block replaces the long candidate cards.

**Revised winner: C+B ("evidence instrument with an editorial entry").** It is re-scored only
where the revision changes the evidence:
- Identity: 13 (the poster and the rose are specific to SureStop's question).
- Landing: 13 (a static frame that works, plus one sweep and the route draw-on).
- Hierarchy: 14.
- Clarity: 10.
- All other criteria as for C.
- **Total: 92**, against A 64 and B 83.

The rose and scrubber must be verified in the real build. If either fails review, it is
removed, not kept for show.

**Implementation check (2026-10-20, production build):**
- **Kept: the scrubber.**
  - A keyboard test moved frame 30 → 2; the camera, depth, verifier and candidate evidence
    followed it.
  - The selection is held while a run continues, with "Follow live" to return.
- **Kept: the rose.**
  - It is drawn from recorded `EvidenceRecord`s only.
  - It is always shown next to its per-view table.
  - axe-core reports no violations.
- **Not built:** the 3-D scene does not mark the robot's pose at a past frame.

See `docs/VISUAL_QA.md`.

## 5. Visual system

**Palette:** graphite and mineral, slightly deeper and cooler than before. Contrast ratios are
WCAG relative-luminance values, computed for these hex values. All accent colours are
≥ 6.2:1 on every surface. The meanings are
unchanged, so existing recorded frames (amber boxes) stay consistent.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b0d10` | page |
| `--panel` / `--panel-2` / `--panel-3` | `#111419` / `#161a20` / `#1c2128` | surfaces |
| `--line` / `--line-strong` | `#232830` / `#323943` | hairlines |
| `--text` | `#e9ebee` | body: 16.3:1 on `--bg`, 14.6:1 on `--panel-2` |
| `--muted` | `#a3abb5` | secondary: 8.4:1 on `--bg`, 7.5:1 on `--panel-2` |
| `--faint` | `#7c858f` | tertiary, ≥ 12 px only: 5.2:1 on `--bg`, 4.7:1 on `--panel-2` |
| `--cyan` | `#4cc3f2` | sensing and navigation: depth, path, pose |
| `--amber` | `#f2a93b` | model predictions and verification in progress |
| `--violet` | `#c3b6f7` | verifier evidence labels |
| `--green` | `#3ecf8e` | CONFIRMED and ARRIVED only |
| `--red` | `#f47272` | REJECTED and false arrival only |
| `--ice` | `#e6f3fa` | the single primary action (ENTER SYSTEM, Run): neutral, so colour stays semantic |

**Type:**
- Geist Sans for UI and display; Geist Mono for numbers, ids and reasons. Both are bundled; no
  new fonts.
- Display: `clamp(44px, 6.2vw, 88px)`, weight 600, tracking −0.035em.
- Body: 15 px on the landing and Method pages, 14 px in the app.
- Technical labels: 11.5–12 px minimum (previously 10.5).

**Grid and spacing:**
- 4 px scale (4, 8, 12, 16, 24, 32, 48, 64).
- Landing max width 1360 px with 32–48 px gutters (16 px on mobile).
- Prose measure ≤ 72ch.

**Borders and radii:** 1 px hairlines; 4 px controls; 6 px panels; no shadows except focus.

**Icons:** inline SVG, 1.5 px stroke, 16 px box, used only for state glyphs. No icon library.

**Component states:**
- Hover lightens the surface by one step.
- Focus: a 2 px `--cyan` outline with 2 px offset.
- Active (selected or current page): `--panel-3` plus a text weight change.
- Disabled: 45 % opacity with `not-allowed`.
- Loading: a real stage text.
- Error: a `role=alert` box with recovery.

**Motion tokens:**
- Durations: `--t-fast` 120 ms (hover), `--t-med` 240 ms (panel state), `--t-slow` 1400 ms (the
  one landing sweep), 1800 ms (route draw-on).
- Easing: `cubic-bezier(.2,.7,.2,1)`.
- Under `prefers-reduced-motion: reduce`: no sweep or draw-on (final state shown immediately); no
  transform transitions; robot movement in the console becomes jump cuts (existing).
- No looping animation anywhere.

## 6. Route architecture

**`/` Entry (motion poster)**
1. Header (quiet).
2. Thesis block. The h1 reads "Find. Verify. Then arrive." with the statement "Robots should
   verify the intended target before reporting arrival." Below it, one sentence on what the
   prototype is, ENTER SYSTEM, and one line of quiet links to the Lab and the Method.
3. **Evidence poster.** The two recorded candidates from one mission, side by side:
   - C1, the life-size photo board: detector 0.97, depth relief 0 mm → FLAT → REJECTED.
   - C2, the plant: 0.98, 164 mm → VOLUMETRIC → CONFIRMED.
   - Each frame is an RGB/depth wipe on one shared range control.
   - Under each frame: the viewpoint rose of that candidate's recorded views.
4. **Route.** The recorded trajectory over the floor plan, drawing on, with the candidate
   decisions and the arrival point.
5. **Find → Verify → Arrive**, with the exact values from the same run.
6. **What the recorded runs show.** Both scenario sets, with denominators and path cost, a link
   to the Lab and the scope note.

**`/console` Mission Control**
- Left: setup, run controls, mission state and outcome, candidates (compact rows), then the
  **evidence block** for the selected candidate: rose, per-view table, decision reason.
- Centre: the 3-D scene (reframed to fill the canvas), then the **frame scrubber**, then the
  event timeline.
- Right: camera (model prediction), depth (sensor measurement) and per-frame verifier evidence,
  all following the scrubber.
- Evaluator ground truth only after the mission ends.

**`/lab` Verification Lab**
- Scenario-set control first ("All 7 / Original 6 / single scenario"), then the mission-level
  table.
- Intervals for false arrivals and completion, plus a path-cost view (median and IQR per trial,
  labelled as descriptive).
- Trials, then the trace (now with roses), runner and calibration.

**`/method`**
- Task contract, architecture, verification policy (rule cards plus an explanation of the rose),
  baselines, protocol.
- **Results** (both scenario sets, computed at build time from the recorded file).
- **Chronology** (Phase A → development → calibration v1 → changes → calibration v2 → τ →
  held-out evaluation → audit), sensing, prior work, limitations, reproduce.

## 7. Responsive behaviour and acceptance

**Breakpoints:**
- **≥ 1280 px:** the layouts above.
- **768–1279 px:**
  - Landing: thesis above the poster, two frames side by side.
  - Console: the scene spans the full width; the scrubber stays under the scene.
- **< 768 px:**
  - Landing recomposes: thesis, then frames stacked with a single shared wipe control, then
    route.
  - Console stacks: setup → scene → scrubber → camera → evidence → timeline.

**Acceptance:**
- No horizontal page scroll at 1440, 1024, 390 and 360 px.
- Every control is reachable by keyboard with a visible focus ring.
- The wipe and scrubber are native range inputs with labels.
- Reduced motion shows the final poster state and no transforms.
- The landing page loads no model, no simulator chunk and no GLB.
- Every number on screen comes from a recorded or live run, and its provenance is labelled.
- The e2e suite passes against the production build.
