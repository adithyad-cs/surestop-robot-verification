"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import ViewpointRose from "@/components/ViewpointRose";
import { SCENARIOS } from "@/scenarios/layout";
import { METHOD_LABELS, type MethodId } from "@/policies/types";
import { ConsoleController, type ConsoleState, type FrameView, type Speed } from "./controller";
import FrameScrubber from "./FrameScrubber";
import styles from "./ConsoleApp.module.css";

const METHODS: MethodId[] = ["surestop", "single-frame", "persistence", "surestop-1view"];
const SPEEDS: Speed[] = [1, 4, 16, "instant"];

function readParams() {
  const q = new URLSearchParams(window.location.search);
  const scenario = SCENARIOS.some((s) => s.id === q.get("scenario")) ? q.get("scenario")! : "poster-decoy";
  const seedN = Number(q.get("seed"));
  const seed = Number.isInteger(seedN) && seedN >= 0 ? seedN : 1;
  const method = (METHODS as string[]).includes(q.get("method") ?? "") ? (q.get("method") as MethodId) : "surestop";
  return { scenario, seed, method, backend: q.get("backend") };
}

export default function ConsoleApp() {
  // The controller is SSR-safe; browser-only work starts in boot().
  const [ctl] = useState(() => new ConsoleController({ scenarioId: "poster-decoy", seed: 1, method: "surestop" }));
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = readParams();
    if (sceneRef.current) void ctl.boot(sceneRef.current, p.backend, { scenarioId: p.scenario, seed: p.seed, method: p.method });
    (window as unknown as { __surestopConsole?: ConsoleController }).__surestopConsole = ctl;
    return () => ctl.dispose();
  }, [ctl]);

  return (
    <>
      <AppHeader status={<DetectorStatus ctl={ctl} />} />
      <main className={styles.grid}>
        <h1 className="visually-hidden">Mission Control</h1>
        <section className={styles.scene} aria-label="3-D simulation view">
          <div ref={sceneRef} className={styles.sceneCanvas} />
          <SceneOverlay ctl={ctl} />
        </section>
        <Panels ctl={ctl} />
      </main>
    </>
  );
}

function useCtl(ctl: ConsoleController): ConsoleState {
  return useSyncExternalStore(ctl.subscribe, ctl.getState, ctl.getState);
}

function DetectorStatus({ ctl }: { ctl: ConsoleController }) {
  const s = useCtl(ctl);
  if (!s.detector) return <span className={styles.headerNote}>Detector: {s.phase === "error" ? "failed to load" : "loading…"}</span>;
  return (
    <span className={styles.headerNote} title={s.backend?.reason ?? ""}>
      COCO-SSD {s.detector.packageVersion} · {s.detector.base} · <strong>{s.detector.backend}</strong>
    </span>
  );
}

function SceneOverlay({ ctl }: { ctl: ConsoleController }) {
  const s = useCtl(ctl);
  const busy = s.phase === "booting" || s.phase === "preparing";
  return (
    <>
      <div className={styles.sceneHud}>
        <span className="provenance prov-sensor">Simulation · overview camera</span>
        {s.mode && <span className={styles.modeTag}>{s.mode}</span>}
        <span className="mono">t = {s.simTime.toFixed(1)} s</span>
      </div>
      <div className={styles.legend} aria-label="Map legend">
        <span><i className={styles.legRobot} /> robot + camera FOV</span>
        <span><i className={styles.legPath} /> planned path</span>
        <span><i className={styles.legCand} /> candidate (status in label)</span>
      </div>
      {busy && (
        <div className={styles.loading} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          {s.stage}…
        </div>
      )}
      {(s.phase === "error" || s.phase === "unsupported") && (
        <div className={styles.errorBox} role="alert">
          <strong>{s.phase === "unsupported" ? "Unsupported browser" : "Something failed"}</strong>
          <p>{s.error}</p>
          <p className={styles.muted}>No simulated or fake output is substituted. Try a current desktop Chrome, Edge or Firefox.</p>
          <button className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )}
    </>
  );
}

function Panels({ ctl }: { ctl: ConsoleController }) {
  const s = useCtl(ctl);
  const frame = useMemo(() => s.frameViews.find((f) => f.frameId === s.selectedFrameId) ?? s.frameViews[s.frameViews.length - 1] ?? null, [s.frameViews, s.selectedFrameId]);
  return (
    <>
      <aside className={styles.left} aria-label="Mission setup and decision">
        <Setup ctl={ctl} s={s} />
        <MissionStatus s={s} />
        <Candidates ctl={ctl} s={s} frame={frame} />
        {s.phase === "done" && <Evaluator ctl={ctl} s={s} />}
      </aside>
      <aside className={styles.right} aria-label="Robot camera and evidence">
        <CameraPanel frame={frame} />
      </aside>
      <section className={styles.scrub} aria-label="Frame timeline">
        <FrameScrubber
          frames={s.frameViews}
          events={s.events}
          selectedFrameId={frame?.frameId ?? null}
          followLive={s.followLive}
          running={s.phase === "running" || s.phase === "paused"}
          onSelect={(frameId) => ctl.select({ frameId })}
          onFollow={() => ctl.followLatest()}
        />
      </section>
      <section className={styles.timeline} aria-label="Event timeline">
        <Timeline ctl={ctl} s={s} />
      </section>
    </>
  );
}

function Setup({ ctl, s }: { ctl: ConsoleController; s: ConsoleState }) {
  const locked = s.phase === "running" || s.phase === "booting" || s.phase === "preparing";
  const scenario = SCENARIOS.find((x) => x.id === s.scenarioId)!;
  const updateUrl = (patch: Record<string, string>) => {
    const q = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => q.set(k, v));
    window.history.replaceState(null, "", `?${q.toString()}`);
  };
  return (
    <div className={styles.block}>
      <h2 className={styles.blockTitle}>Mission setup</h2>
      <div className="field">
        <label htmlFor="scenario">Scenario</label>
        <select
          id="scenario"
          className="select"
          value={s.scenarioId}
          disabled={locked}
          onChange={(e) => {
            updateUrl({ scenario: e.target.value });
            void ctl.configure({ scenarioId: e.target.value });
          }}
        >
          {SCENARIOS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
            </option>
          ))}
        </select>
        <p className={styles.help}>{scenario.summary}</p>
      </div>
      <div className={styles.row2}>
        <div className="field">
          <label htmlFor="method">Stopping method</label>
          <select
            id="method"
            className="select"
            value={s.method}
            disabled={locked}
            onChange={(e) => {
              updateUrl({ method: e.target.value });
              void ctl.configure({ method: e.target.value as MethodId });
            }}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="seed">Seed</label>
          <input
            id="seed"
            className="input mono"
            type="number"
            min={0}
            step={1}
            value={s.seed}
            disabled={locked}
            onChange={(e) => {
              const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
              updateUrl({ seed: String(v) });
              void ctl.configure({ seed: v });
            }}
          />
        </div>
      </div>
      <div className="field">
        <span className="label" id="speed-label">
          Playback
        </span>
        <div className={styles.segmented} role="radiogroup" aria-labelledby="speed-label">
          {SPEEDS.map((sp) => (
            <button
              key={String(sp)}
              role="radio"
              aria-checked={s.speed === sp}
              aria-label={sp === "instant" ? "Maximum speed (skip animation)" : `${sp} times real time`}
              className={styles.seg}
              onClick={() => ctl.setSpeed(sp)}
            >
              {sp === "instant" ? "Max" : `${sp}×`}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.controls}>
        {s.phase === "running" ? (
          <button className="btn" onClick={() => ctl.pause()}>
            Pause
          </button>
        ) : s.phase === "done" ? (
          <button className="btn btn-primary" onClick={() => void ctl.reset().then(() => ctl.start())}>
            Run again
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => ctl.start()} disabled={!(s.phase === "ready" || s.phase === "paused")}>
            {s.phase === "paused" ? "Resume" : "Run mission"}
          </button>
        )}
        <button className="btn" onClick={() => ctl.step()} disabled={!(s.phase === "ready" || s.phase === "paused")} title="Run one mission step, then pause">
          Step
        </button>
        <button className="btn" onClick={() => void ctl.reset()} disabled={s.phase === "booting" || s.phase === "preparing"} title="Rebuild this scenario and seed; clears the current mission">
          Reset
        </button>
        {(s.phase === "running" || s.phase === "paused") && (
          <button className="btn btn-ghost" onClick={() => ctl.abort()}>
            Abort
          </button>
        )}
      </div>
    </div>
  );
}

function MissionStatus({ s }: { s: ConsoleState }) {
  const outcome = s.result?.outcome;
  return (
    <div className={styles.block}>
      <h2 className={styles.blockTitle}>Mission state</h2>
      <dl className={styles.kv}>
        <dt>Phase</dt>
        <dd>
          <span className={styles.phase} data-phase={s.phase}>
            {s.phase.toUpperCase()}
          </span>
        </dd>
        <dt>Mode</dt>
        <dd className="mono">{s.mode ?? "—"}</dd>
        <dt>Sim time</dt>
        <dd className="mono">{s.simTime.toFixed(1)} s</dd>
        <dt>Frames</dt>
        <dd className="mono">{s.frames}</dd>
        <dt>Path</dt>
        <dd className="mono">{s.pathLength.toFixed(1)} m</dd>
        <dt>Pose</dt>
        <dd className="mono">{s.pose ? `x ${s.pose.x.toFixed(2)}  z ${s.pose.z.toFixed(2)}  θ ${((s.pose.theta * 180) / Math.PI).toFixed(0)}°` : "—"}</dd>
      </dl>
      {outcome && (
        <div className={styles.outcome}>
          <div className={styles.outcomeHead}>
            <span className="label">Mission outcome (robot)</span>
            <StatusBadge status={outcome} />
          </div>
          <p className={styles.reason}>{s.result?.reason}</p>
        </div>
      )}
    </div>
  );
}

function Candidates({ ctl, s, frame }: { ctl: ConsoleController; s: ConsoleState; frame: FrameView | null }) {
  // Show the explicitly selected candidate; otherwise the one the current frame is about, else
  // the most recently opened. Only an explicit choice marks a row as pressed.
  const focusId = frame?.focusTrackId ?? frame?.targets.find((t) => t.trackId)?.trackId ?? null;
  const shown = s.tracks.find((t) => t.id === s.selectedTrackId) ?? s.tracks.find((t) => t.id === focusId) ?? s.tracks[s.tracks.length - 1] ?? null;
  return (
    <div className={styles.block}>
      <h2 className={styles.blockTitle}>
        Candidates <span className="provenance prov-verifier">verifier</span>
      </h2>
      {s.tracks.length === 0 ? (
        <p className={styles.muted}>No candidate yet. A candidate opens when the detector reports “potted plant” ≥ 0.30 with valid depth.</p>
      ) : (
        <ul className={styles.candList}>
          {s.tracks.map((t) => (
            <li key={t.id}>
              <button
                className={styles.cand}
                aria-pressed={t.id === s.selectedTrackId}
                data-shown={t.id === shown?.id}
                onClick={() => ctl.select({ trackId: t.id === s.selectedTrackId ? null : t.id })}
              >
                <span className="mono">{t.id}</span>
                <StatusBadge status={t.status} />
                <span className={`mono ${styles.muted}`}>
                  {t.decision.distinctViews} view{t.decision.distinctViews === 1 ? "" : "s"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {shown && (
        <div className={styles.evidence}>
          <p className={styles.evidenceReason}>
            <b className="mono">{shown.id}</b> {shown.decision.reason}
          </p>
          {shown.evidence.length > 0 && (
            <ViewpointRose
              id={shown.id}
              status={shown.status}
              views={shown.evidence.map((e) => ({ ...e }))}
              selectedFrameId={frame?.frameId ?? null}
              size={196}
            />
          )}
          <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={`Evidence table for candidate ${shown.id}`}>
            <table className={styles.table}>
              <caption className="visually-hidden">Evidence for candidate {shown.id}</caption>
              <thead>
                <tr>
                  <th scope="col">Frame</th>
                  <th scope="col">Range</th>
                  <th scope="col">Score</th>
                  <th scope="col">Relief</th>
                  <th scope="col">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {shown.evidence.map((e, i) => (
                  <tr key={i} data-counted={e.counted} data-current={e.frameId === frame?.frameId} title={`${e.reason}${e.note ? ` — ${e.note}` : ""}`}>
                    <td>
                      <button className={styles.linkBtn} onClick={() => ctl.select({ frameId: e.frameId })} aria-label={`Show frame ${e.frameId}`}>
                        #{e.frameId}
                      </button>
                    </td>
                    <td className="mono" title={`bearing ${Math.round(e.bearingDeg)}° from the candidate`}>
                      {e.range.toFixed(2)}
                    </td>
                    <td className="mono">{e.score === null ? "miss" : e.score.toFixed(2)}</td>
                    <td className="mono">{e.excessRelief === null ? "—" : `${Math.round(e.excessRelief * 1000)} mm`}</td>
                    <td className={styles.verdictCell} data-verdict={e.verdict}>
                      {e.verdict === "INCONCLUSIVE" && e.score === null ? "not re-detected" : e.verdict.toLowerCase()}
                      {!e.counted && <span className={styles.muted}> (not counted)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.help}>One vote per viewpoint cell (0.75 m × 30° around the candidate). Select a frame number to see that view.</p>
        </div>
      )}
    </div>
  );
}

function Evaluator({ ctl, s }: { ctl: ConsoleController; s: ConsoleState }) {
  const sc = s.score;
  if (!sc) return null;
  const verdict = sc.correctArrival ? "Correct arrival" : sc.falseArrival ? "False arrival" : sc.correctTerminal ? "Correct: no arrival declared" : sc.abstained ? "Abstained (unresolved)" : "Target not reached";
  return (
    <div className={`${styles.block} ${styles.evalBlock}`}>
      <h2 className={styles.blockTitle}>
        Evaluator <span className="provenance prov-eval">ground truth</span>
      </h2>
      <p className={styles.evalNote}>Scored after the mission ended. Never available to the robot or verifier.</p>
      <p className={styles.evalVerdict} data-good={sc.correctArrival || (sc.correctTerminal && !sc.targetPresent)} data-bad={sc.falseArrival}>
        {verdict}
      </p>
      <ul className={styles.gtList}>
        {sc.trackLabels.map((l) => (
          <li key={l.trackId}>
            <span className="mono">{l.trackId}</span> → {l.label} <span className={styles.muted}>({l.kind}, {l.status})</span>
          </li>
        ))}
      </ul>
      <label className={styles.check}>
        <input type="checkbox" checked={s.showGroundTruth} onChange={(e) => ctl.toggleGroundTruth(e.target.checked)} />
        Show ground-truth labels in the scene
      </label>
    </div>
  );
}

function CameraPanel({ frame }: { frame: FrameView | null }) {
  return (
    <>
      <div className={styles.block}>
        <div className={styles.camHead}>
          <h2 className={styles.blockTitle}>Robot camera</h2>
          <span className={`mono ${styles.muted}`}>{frame ? `#${frame.frameId} · t ${frame.t.toFixed(1)} s` : "—"}</span>
        </div>
        <span className="provenance prov-model">Model prediction · COCO-SSD on these pixels</span>
        <div className={styles.cam}>
          {frame?.rgbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL of the rendered sensor frame
            <img src={frame.rgbUrl} alt={`Robot camera frame ${frame.frameId} with detector boxes`} />
          ) : (
            <p className={styles.camEmpty}>The camera image appears with the first observation.</p>
          )}
        </div>
        {frame && (
          <p className={styles.caption}>
            {frame.purpose ?? "—"} · t {frame.t.toFixed(1)} s · {frame.cached ? "memoised pose" : `inference ${frame.inferenceMs.toFixed(0)} ms`} · {frame.detections.filter((d) => d.score >= 0.3).length} detections ≥ 0.30
          </p>
        )}
      </div>
      <div className={styles.block}>
        <span className="provenance prov-sensor">Sensor measurement · depth (noisy)</span>
        <div className={styles.cam}>
          {frame?.depthUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL of the rendered depth frame
            <img src={frame.depthUrl} alt="Depth image from the robot's range sensor; brighter is nearer" />
          ) : (
            <p className={styles.camEmpty}>No depth frame yet.</p>
          )}
        </div>
        <p className={styles.caption}>Brighter = nearer. Dashed box: region sampled for evidence. Noise σ(z) = 2 mm + 0.004·z² m.</p>
      </div>
      <div className={styles.block}>
        <span className="provenance prov-verifier">Verifier evidence · this frame</span>
        {frame && frame.targets.length ? (
          <ul className={styles.readout}>
            {frame.targets.map((t, i) => (
              <li key={i}>
                <div className={`mono ${styles.readNums}`}>
                  <span>{t.trackId ?? "—"}</span>
                  <span>score {t.score.toFixed(2)}</span>
                  <span>range {t.range?.toFixed(2) ?? "—"} m</span>
                  <span>relief {t.relief === null ? "—" : `${Math.round(t.relief * 1000)} mm`}</span>
                  <span>σ {t.noise === null ? "—" : `${Math.round(t.noise * 1000)} mm`}</span>
                  <span>2-plane {t.twoPlane === null ? "—" : `${Math.round(t.twoPlane * 100)}%`}</span>
                </div>
                <p className={styles.readNote}>{t.note || "—"}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>No “potted plant” detection ≥ 0.30 in this frame.</p>
        )}
      </div>
    </>
  );
}

function Timeline({ ctl, s }: { ctl: ConsoleController; s: ConsoleState }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (s.phase === "running" && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [s.events.length, s.phase]);
  return (
    <>
      <div className={styles.tlHead}>
        <h2 className={styles.blockTitle}>Event timeline</h2>
        <span className={styles.muted}>{s.events.length} events · candidate and mission transitions with reasons</span>
      </div>
      <div className={styles.tlBody} ref={ref} tabIndex={0} aria-label="Event list">
        {s.events.length === 0 ? (
          <p className={styles.muted}>Run a mission to see state transitions here.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">t (s)</th>
                <th scope="col">Frame</th>
                <th scope="col">Level</th>
                <th scope="col">Transition</th>
                <th scope="col">Message</th>
              </tr>
            </thead>
            <tbody>
              {s.events.map((e, i) => (
                <tr key={i} data-kind={e.kind}>
                  <td className="mono">{e.t.toFixed(1)}</td>
                  <td>
                    {e.frameId ? (
                      <button className={styles.linkBtn} onClick={() => ctl.select({ frameId: e.frameId!, trackId: e.trackId ?? undefined })}>
                        #{e.frameId}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="mono">{e.kind}</td>
                  <td className="mono">{e.to ? `${e.from ?? ""}→${e.to}` : ""}</td>
                  <td>{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
