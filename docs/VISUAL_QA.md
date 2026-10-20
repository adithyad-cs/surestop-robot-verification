# Visual and UX QA record

_2026-10-20. Production build (`next build` + `next start`), headless Chromium 141 with
SwiftShader. These scores are an internal design review aid, not user-testing results._

## Before and after

The screenshots are compressed JPEGs in [`visual-qa/`](visual-qa/). The "before" set was
captured from the audited UI (`27c50ad`, plus text-only remediation), the "after" set from this
build.

| Route | Before | After |
|---|---|---|
| `/` 1440 | `landing-1440-before.jpg` | `landing-1440-after.jpg`, full page `landing-1440-after-full.jpg`, reduced motion `landing-1440-reduced-motion.jpg` |
| `/` 390 | `landing-390-before.jpg` | `landing-390-after.jpg` |
| `/console` 1440, mission done (photo-board-decoy, seed 1001, SureStop, real inference) | `console-1440-done-before.jpg` | `console-1440-frame2-after.jpg`: frame 2 selected with the keyboard; camera, depth, verifier and candidate evidence all follow it |
| `/lab` 1440 | `lab-1440-before.jpg` | `lab-1440-after.jpg` |
| `/method` 1440 | `method-1440-before.jpg` | `method-1440-after-results.jpg` |

## Review passes

**Pass 1: dev server, first render.** Defects found and fixed:
- **Landing route map empty.** The draw-on was not triggered because the capture jumped past
  the map. I changed the capture to scroll through the page and lowered the observer threshold.
- **Route labels collided with the path.** Labels now sit above the candidates and to the left
  of the arrival point.
- **Rose ring labels about 7 px.** Raised to 9.5 px; the roses are now larger.
- **Too much empty space below the hero.**
- **Mobile poster control far below the first frame.** It now comes first on mobile.

**Pass 2: console during a real mission.** Defects found and fixed:
- **Decision label clipped at the right edge of the scrubber.**
- **Evidence table clipped in the left column.** I dropped the bearing column, which the rose
  shows, and widened the column to 320 px.
- **Table headers wrapping.**
- **Path-plot labels in the Lab inheriting the marker stroke.**

**Pass 3: production build, every route at 1440, 1024, 390 and 360 px.** Defects found and
fixed:
- **Mobile console scene canvas too tall for the room.** Its height is now
  `clamp(240px, 78vw, 52vh)`.
- **Lab plots unreadable at 390 px.** They now keep a 620 px minimum width and scroll inside
  their figure.
- **Method results table scrolled at 1440 px.** It now uses a grouped two-row header.

**Pass 4: axe-core 4.10.2 scan.** Found and fixed:
- A scroll region that keyboard users could not focus.
- A missing `h1` on `/console`.
- Duplicate region labels in the Lab.
- Plot figures that scrolled but could not be focused.

The fix for the duplicate labels introduced a label containing "Count", which the e2e suite
caught as an ambiguous `getByLabel("Count")`. I changed my label, not the test.

**Horizontal overflow** (`scrollWidth − clientWidth`) after the passes: 0 px on all four routes
at 1440, 1024, 390 and 360 px.

## Quality review (1–5)

| Category | Score | Evidence |
|---|---|---|
| Distinct product identity | 4 | The poster, the viewpoint rose and the frame scrubber all come from SureStop's own question (flat versus volumetric, seen from several viewpoints) rather than from a template. The dark technical palette is shared with many developer tools. |
| Landing memorability and comprehension | 4 | The first viewport shows both the thesis and the core contrast: "same detector confidence, different geometry", with 0.97 versus 0.98 and 0 mm versus 164 mm. The static and reduced-motion states show the full message. Long-form explanation sits below the fold. |
| Mission state and evidence clarity | 4 | One scrubber drives the camera, depth, verifier and candidate evidence (keyboard test: frame 30 → 2 updated all four). The rose and table explain each decision. **Not done:** the selected frame's robot pose is not shown in the 3-D scene. At 900 px height the rose needs a scroll of the left column. |
| Consistency, typography and spacing | 4 | One token set; labels at least 11.5 px (previously 10.5); a neutral ice primary action. The console still uses many uppercase monospace provenance labels, deliberately. |
| Interaction completeness and recoverability | 4 | All previous controls kept; "Follow live" added; error states (no WebGL, blocked weights, missing Lab data) verified. Exports verified field by field. |
| Responsive | 4 | No overflow at 360–1440 px. The mobile console is a long single column, ordered scene → frames → controls. |
| Accessibility and reduced motion | 4 | axe-core reports 0 violations (WCAG 2.0/2.1 A and AA plus best practice) on all routes at 1440 and 390 px, initial states only. The keyboard tests passed. Reduced motion shows the final poster state and disables the route draw-on. No screen-reader session was run, so this is not a certification. |
| Perceived and measured performance | 3 | The landing page went from 1.48 to 1.62 MB decoded and still loads no model, simulator chunk or GLB. `/console` is unchanged at about 41.4 MB: 17 MB of weights and about 20 MB of GLBs. **Blocker for improving it:** those assets feed the recorded experiments and must not be compressed or replaced (release prompt §9). The scene already loads only the assets its scenario uses. |

## Measurements (cold browser context, decoded bytes until network idle)

| Route | Before (`27c50ad`) | After |
|---|---|---|
| `/` | 29 requests, 1.48 MB (JS 1.23 MB) | 29 requests, 1.62 MB (JS 1.25 MB); no model, GLB or WASM |
| `/console` | 39 requests, 41.29 MB (JS 2.38 MB) | 39 requests, 41.38 MB (JS 2.41 MB) |
| `/lab` | 27 requests, 2.12 MB | 27 requests, 2.21 MB |
| `/method` | 25 requests, 1.49 MB | 25 requests, 1.61 MB |

**Method:** a Playwright `response` listener summing `body().length` per route, in a fresh
context. These are decoded sizes, not compressed transfer sizes. The audit scripts are
`a9_states.mjs` and `a15_axe.mjs`, kept in the session scratchpad.

## Remaining visual defects and limits

- The 3-D scene does not mark the robot's pose at the selected (past) frame. Only the camera,
  depth and evidence panels follow the scrubber.
- In the console, scene labels use CSS2D elements, which can overlap when two candidates are
  close.
- The landing poster shows one recorded mission, chosen because it contains both a decoy and the
  plant. It is labelled as such and linked to all 560 recorded missions.
