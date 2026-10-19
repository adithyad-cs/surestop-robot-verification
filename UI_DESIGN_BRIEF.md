# SureStop UI design brief

## Users and what they need
- **Judges and technical reviewers.** Within a few minutes they need to see that a robot really
  navigates and perceives. They need to see why it stops or refuses to stop, and they need to
  check the comparison against baselines and reproduce it.
- **The team, during the demo.** They need to run a specific scenario, seed and method, step
  through it, and point at the evidence.

## The one journey that matters
1. `/` → **ENTER SYSTEM**.
2. `/console`: pick a scenario, method and seed, then **Run**.
3. Watch the robot search, see real detections on the camera image, and watch the verifier
   move to new viewpoints.
4. Read the terminal decision and its reason, then compare it with the evaluator's
   ground-truth verdict, which is shown only after the mission ends.
5. `/lab`: inspect the recorded comparison, open a failure, re-run seeds, export CSV/JSON.

## Visual thesis
An instrumented robotics test bench: calm, precise, and legible under motion.
- **Palette.** Graphite and slate surfaces let the live 3-D scene and the camera image carry
  the visual weight.
- **Colour encodes meaning only:**
  - cyan: sensors and navigation (paths, depth, pose)
  - amber: verification in progress or unresolved evidence
  - green and red: CONFIRMED and REJECTED outcomes only
- **Every status carries a text label**, so colour is never the only signal.
- **Type.** One sans (Geist) for UI and one mono (Geist Mono) for numbers, coordinates, frame
  IDs and reasons.
- **No decoration** that is not data: no glow, gradients, particles, fake HUD or animated
  counters.

## Information hierarchy
**`/` Entry**
- Thesis line.
- Find → Verify → Arrive in three short lines.
- A real frame captured from the simulator, labelled as a capture.
- One action: ENTER SYSTEM.
- One scope note.

**`/console` Mission Control**
- **Layout:** setup and decision (left), 3-D scene (centre, largest), camera and evidence
  (right), event timeline (bottom).
- **Provenance is labelled in every panel:**
  - `MODEL PREDICTION` (COCO-SSD boxes)
  - `SENSOR MEASUREMENT` (depth image and noise)
  - `VERIFIER EVIDENCE` (per-view verdict and reason)
  - `EVALUATOR · GROUND TRUTH` (shown only after the mission ends, with the note "never
    available to the robot")

**`/lab` Verification Lab**
- Recorded held-out results come first, with counts and denominators visible: a method ×
  metric table and an interval plot.
- A trial table with filters; selecting a trial opens its decision trace.
- Run controls: scenarios, variants, seed range, live progress, stop.
- Run history saved in this browser, kept separate from the recorded dataset.
- CSV/JSON export for each dataset.
- Calibration evidence for the baseline thresholds.

**`/method`**
- Architecture and boundaries.
- State machine and parameters, read from code constants.
- Metric definitions.
- Prior work and the contribution boundary.
- Limitations and known failure modes.

## Tokens and conventions
**Colours**

| Token | Value |
|---|---|
| `--bg` | #0e1013 |
| `--panel` | #14171b |
| `--panel-2` | #1a1e23 |
| `--line` | #262b31 |
| `--text` | #e7e9ec |
| `--muted` | #9aa3ad |
| `--cyan` | #38bdf8 |
| `--amber` | #f5a524 |
| `--green` | #34d399 |
| `--red` | #f87171 |

**Spacing.** A 4 px scale (4, 8, 12, 16, 24, 32).

**Radii.** 4 px for controls, 6 px for panels, nothing larger.

**Borders.** 1 px hairlines; regions are separated by dividers, not cards inside cards.

**Controls.** 32 px tall (36 px on touch); a visible 2 px cyan focus ring; disabled at 45 %
opacity with `cursor: not-allowed`.

**Status badges.** Uppercase mono text plus a shape:
- ● CONFIRMED
- ✕ REJECTED
- ◌ UNCONFIRMED
- … PENDING

## States
**Loading:** "Loading detector (17 MB, cached after first visit)…", with real stages
(detector, scene, assets).

**Unsupported:** if WebGL2 or float render targets are missing, explain what is needed. Never
substitute fake output.

**Error:** model or asset fetch failure, shown with a Retry button.

**Empty Lab:** "No runs in this browser yet." Explain how to run the first batch. Recorded data
is still shown when available.

**Mission states:**
- idle
- running
- paused
- done, one of: ARRIVED, NOT_FOUND, UNRESOLVED, NAV_FAILURE or ABORTED

## Responsive behaviour
- **≥ 1280 px:** three columns plus a bottom timeline.
- **768–1279 px:** the scene spans the full width; camera and evidence sit beside the setup
  panel; the timeline goes below.
- **< 768 px:** a stacked flow: setup → scene → camera → decision → timeline. Tables scroll
  horizontally inside their own container. The page never scrolls horizontally.

## Acceptance checks
- **Keyboard:** the full console journey works with the keyboard alone, with visible focus.
- **Reduced motion:** with `prefers-reduced-motion`, the robot jumps segment-by-segment and
  does not animate.
- **Direct loads:** `/console`, `/lab` and `/method` load directly and on refresh.
- **Screenshots:** reviewed at 1440×900, 1024×768 and 390×844, checking for clipping and
  overflow.
- **Data honesty:** every number on screen comes from a recorded or live run, and every panel
  states its provenance.
