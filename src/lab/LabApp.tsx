"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import { SCENARIOS } from "@/scenarios/layout";
import { candidateMetrics, groupBy, METRIC_DEFINITIONS, missionMetrics, type Rate } from "@/eval/metrics";
import { experimentToJson, trialsToCsv } from "@/eval/export";
import type { RunRecord } from "@/experiments/engine";
import { clearRuns, loadRuns, saveRun } from "@/lib/runStore";
import { METHOD_LABELS, type MethodId } from "@/policies/types";
import styles from "./LabApp.module.css";

interface RecordedFile {
  schema: string;
  generatedAt: string;
  environment: Record<string, string>;
  protocol: Record<string, unknown>;
  runs: RunRecord[];
}

type Source = "recorded" | "local";

const RUNNABLE: Array<{ spec: string; label: string }> = [
  { spec: "surestop", label: METHOD_LABELS.surestop },
  { spec: "single-frame", label: METHOD_LABELS["single-frame"] },
  { spec: "persistence", label: METHOD_LABELS.persistence },
  { spec: "surestop-1view", label: METHOD_LABELS["surestop-1view"] },
];

function pct(r: Rate): string {
  return r.value === null ? "—" : `${(r.value * 100).toFixed(0)}%`;
}

function download(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function LabApp() {
  const [recorded, setRecorded] = useState<RecordedFile | null>(null);
  const [recordedError, setRecordedError] = useState<string | null>(null);
  const [local, setLocal] = useState<RunRecord[]>([]);
  const [source, setSource] = useState<Source>("recorded");
  const [scenario, setScenario] = useState<string>("all");
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    fetch("/data/eval-runs.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: RecordedFile) => setRecorded(d))
      .catch((e) => setRecordedError(String(e)));
    void loadRuns().then(setLocal);
  }, []);

  const runs = useMemo(() => {
    const rs = source === "recorded" ? recorded?.runs ?? [] : local;
    rememberThresholds(rs);
    return rs;
  }, [source, recorded, local]);
  const filtered = useMemo(() => (scenario === "all" ? runs : runs.filter((r) => r.result.scenarioId === scenario)), [runs, scenario]);

  return (
    <>
      <AppHeader />
      <main className={styles.page}>
        <header className={styles.intro}>
          <h1>Verification Lab</h1>
          <p>
            Every number below is computed in your browser from recorded mission runs (real rendering + real COCO-SSD inference, ground truth used only by the
            evaluator). Re-run any seed here or in Mission Control to reproduce it.
          </p>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="Dataset">
            <button role="tab" aria-selected={source === "recorded"} className={styles.tab} onClick={() => { setSource("recorded"); setSelected(null); }}>
              Recorded reference runs {recorded ? `(${recorded.runs.length})` : ""}
            </button>
            <button role="tab" aria-selected={source === "local"} className={styles.tab} onClick={() => { setSource("local"); setSelected(null); }}>
              Runs in this browser ({local.length})
            </button>
          </div>
          <div className="field">
            <label htmlFor="scen-filter">Scenario</label>
            <select id="scen-filter" className="select" value={scenario} onChange={(e) => { setScenario(e.target.value); setSelected(null); }}>
              <option value="all">All scenarios</option>
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.exports}>
            <button className="btn" disabled={!filtered.length} onClick={() => download(`surestop-trials-${source}-${scenario}.csv`, trialsToCsv(filtered.map((r) => r.score)), "text/csv")}>
              Export CSV
            </button>
            <button
              className="btn"
              disabled={!filtered.length}
              onClick={() => download(`surestop-runs-${source}-${scenario}.json`, experimentToJson(filtered, `${source} dataset, scenario filter: ${scenario}`), "application/json")}
            >
              Export JSON
            </button>
          </div>
        </div>

        {source === "recorded" && recorded && <Provenance file={recorded} />}
        {source === "recorded" && !recorded && (
          <p className={styles.note}>{recordedError ? `Recorded dataset could not be loaded (${recordedError}).` : "Loading recorded runs…"}</p>
        )}

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <h2>No runs {source === "local" ? "in this browser yet" : "for this filter"}</h2>
            <p>Use “Run an experiment” below. Each mission renders the scene, runs the detector on every observation and is scored by the evaluator afterwards.</p>
          </div>
        ) : (
          <>
            <Summary runs={filtered} />
            <TrialTable runs={filtered} selected={selected} onSelect={setSelected} />
            {selected !== null && filtered[selected] && <TrialDetail run={filtered[selected]} onClose={() => setSelected(null)} />}
          </>
        )}

        <Runner
          onRun={(r) => {
            setLocal((l) => [...l, r]);
            void saveRun(r);
          }}
          onClear={async () => {
            await clearRuns();
            setLocal([]);
          }}
          localCount={local.length}
          onShowLocal={() => setSource("local")}
        />
        {source === "recorded" && <Calibration />}
      </main>
    </>
  );
}

function Provenance({ file }: { file: RecordedFile }) {
  return (
    <details className={styles.prov}>
      <summary>
        Provenance: recorded {new Date(file.generatedAt).toISOString().slice(0, 16).replace("T", " ")} UTC · {String(file.environment.detector ?? "")} · backend{" "}
        {String(file.environment.backend ?? "")}
      </summary>
      <dl>
        {Object.entries(file.environment).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{String(v)}</dd>
          </div>
        ))}
        {Object.entries(file.protocol).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{typeof v === "string" ? v : JSON.stringify(v)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function RateCell({ r }: { r: Rate }) {
  return (
    <td title={r.ci95 ? `95% Wilson interval ${(r.ci95[0] * 100).toFixed(0)}–${(r.ci95[1] * 100).toFixed(0)}%` : "no eligible trials"}>
      <span className={styles.rate}>{pct(r)}</span>
      <span className={styles.frac}>
        {r.num}/{r.den}
      </span>
    </td>
  );
}

function Summary({ runs }: { runs: RunRecord[] }) {
  const byVariant = useMemo(() => [...groupBy(runs, (r) => r.variant).entries()].sort(([a], [b]) => a.localeCompare(b)), [runs]);
  const rows = byVariant.map(([variant, rs]) => ({ variant, m: missionMetrics(rs.map((r) => r.score)), c: candidateMetrics(rs.map((r) => r.score)) }));
  const small = rows.some((r) => r.m.trials < 20);
  return (
    <section className={styles.section} aria-labelledby="summary-h">
      <div className={styles.sectionHead}>
        <h2 id="summary-h">Mission-level comparison</h2>
        <p className={styles.note}>
          Unit of analysis: one seeded mission (trial). Cells show rate and numerator/denominator; hover for the 95% Wilson interval.
          {small && " Some groups have fewer than 20 trials: treat as preliminary."}
        </p>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Method</th>
              <th scope="col">Trials</th>
              <th scope="col" title={METRIC_DEFINITIONS.falseArrivalRate}>False-arrival rate ↓</th>
              <th scope="col" title={METRIC_DEFINITIONS.correctConfirmationRate}>Correct confirmation ↑</th>
              <th scope="col" title={METRIC_DEFINITIONS.abstentionRate}>Abstention</th>
              <th scope="col" title={METRIC_DEFINITIONS.completionRate}>Completion ↑</th>
              <th scope="col">Frames / mission</th>
              <th scope="col">Path (m)</th>
              <th scope="col">Sim time (s)</th>
              <th scope="col">Nav failures</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ variant, m }) => (
              <tr key={variant}>
                <th scope="row">{labelFor(variant)}</th>
                <td>{m.trials}</td>
                <RateCell r={m.falseArrivalRate} />
                <RateCell r={m.correctConfirmationRate} />
                <RateCell r={m.abstentionRate} />
                <RateCell r={m.completionRate} />
                <td>{m.meanFrames.toFixed(1)}</td>
                <td>{m.meanPathLength.toFixed(1)}</td>
                <td>{m.meanSimTime.toFixed(0)}</td>
                <td>{m.navFailures}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <IntervalPlot rows={rows.map((r) => ({ label: labelFor(r.variant), far: r.m.falseArrivalRate, comp: r.m.completionRate }))} />
      <details className={styles.defs}>
        <summary>Metric definitions and candidate-level counts</summary>
        <ul>
          {Object.entries(METRIC_DEFINITIONS).map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong>: {v}
            </li>
          ))}
        </ul>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.note}>Candidate level: one encounter = one candidate track (verification episode), not one frame.</caption>
            <thead>
              <tr>
                <th scope="col">Method</th>
                <th scope="col">Candidate kind (ground truth)</th>
                <th scope="col">Encounters</th>
                <th scope="col">Confirmed</th>
                <th scope="col">Rejected</th>
                <th scope="col">Unconfirmed</th>
                <th scope="col">Not engaged</th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap(({ variant, c }) =>
                Object.entries(c.byKind).map(([kind, k]) => (
                  <tr key={variant + kind}>
                    <td>{labelFor(variant)}</td>
                    <td>{kind}</td>
                    <td>{k.encounters}</td>
                    <td>{k.confirmed}</td>
                    <td>{k.rejected}</td>
                    <td>{k.unconfirmed}</td>
                    <td>{k.notEngaged}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

const thresholdOf = new Map<string, number>();

/** Display name for a variant; baselines always show their threshold τ (from the run's recorded config). */
function labelFor(variant: string): string {
  const [m, p] = variant.split("@");
  const base = METHOD_LABELS[m as MethodId] ?? m;
  const tau = p ?? thresholdOf.get(variant)?.toString();
  return tau ? `${base} (τ=${tau})` : base;
}

function rememberThresholds(runs: RunRecord[]) {
  for (const r of runs) {
    const c = r.result.config;
    if (r.result.method === "single-frame") thresholdOf.set(r.variant, c.singleFrame.threshold);
    if (r.result.method === "persistence") thresholdOf.set(r.variant, c.persistence.threshold);
  }
}

function IntervalPlot({ rows }: { rows: Array<{ label: string; far: Rate; comp: Rate }> }) {
  const rowH = 30;
  const left = 230;
  const width = 760;
  const plotW = width - left - 20;
  const h = rows.length * rowH + 44;
  const x = (v: number) => left + v * plotW;
  return (
    <figure className={styles.plot}>
      <figcaption className={styles.note}>
        Mission-level rates with 95% Wilson intervals. <span className={styles.keyFar}>■</span> false-arrival rate (lower is better) ·{" "}
        <span className={styles.keyComp}>■</span> completion rate (higher is better). n = denominator shown at right.
      </figcaption>
      <svg viewBox={`0 0 ${width} ${h}`} role="img" aria-label="Interval plot of false-arrival and completion rates by method">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={10} y2={h - 26} className={styles.grid} />
            <text x={x(t)} y={h - 10} textAnchor="middle" className={styles.axis}>
              {t * 100}%
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = 22 + i * rowH;
          const mark = (rate: Rate, cls: string, dy: number) =>
            rate.value === null || !rate.ci95 ? null : (
              <g className={cls}>
                <line x1={x(rate.ci95[0])} x2={x(rate.ci95[1])} y1={y + dy} y2={y + dy} strokeWidth={2} />
                <circle cx={x(rate.value)} cy={y + dy} r={4} />
              </g>
            );
          return (
            <g key={r.label}>
              <text x={left - 10} y={y + 4} textAnchor="end" className={styles.rowLabel}>
                {r.label}
              </text>
              {mark(r.far, styles.farMark, -5)}
              {mark(r.comp, styles.compMark, 5)}
              <text x={width - 4} y={y + 4} textAnchor="end" className={styles.axis}>
                n={r.far.den}/{r.comp.den}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function verdictOf(r: RunRecord): string {
  const s = r.score;
  if (s.correctArrival) return "correct arrival";
  if (s.falseArrival) return `FALSE ARRIVAL (${s.arrivedAtKind})`;
  if (!s.targetPresent && s.outcome === "NOT_FOUND") return "correct: no arrival";
  if (s.abstained) return "abstained";
  return "target not reached";
}

function TrialTable({ runs, selected, onSelect }: { runs: RunRecord[]; selected: number | null; onSelect: (i: number | null) => void }) {
  const [onlyFailures, setOnlyFailures] = useState(false);
  const idx = runs.map((r, i) => ({ r, i })).filter(({ r }) => !onlyFailures || !r.score.correctTerminal);
  return (
    <section className={styles.section} aria-labelledby="trials-h">
      <div className={styles.sectionHead}>
        <h2 id="trials-h">Trials</h2>
        <label className={styles.check}>
          <input type="checkbox" checked={onlyFailures} onChange={(e) => setOnlyFailures(e.target.checked)} /> Show only trials without the correct terminal outcome
        </label>
      </div>
      <div className={`${styles.tableWrap} ${styles.trials}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Scenario</th>
              <th scope="col">Seed</th>
              <th scope="col">Method</th>
              <th scope="col">Robot outcome</th>
              <th scope="col">Evaluator verdict</th>
              <th scope="col">Candidates</th>
              <th scope="col">Frames</th>
              <th scope="col">Path (m)</th>
              <th scope="col"><span className="visually-hidden">Inspect</span></th>
            </tr>
          </thead>
          <tbody>
            {idx.map(({ r, i }) => (
              <tr key={i} aria-selected={selected === i} data-bad={r.score.falseArrival}>
                <td>{r.result.scenarioId}</td>
                <td className="mono">{r.result.seed}</td>
                <td>{labelFor(r.variant)}</td>
                <td>
                  <StatusBadge status={r.result.outcome} />
                </td>
                <td>{verdictOf(r)}</td>
                <td className="mono">{r.score.trackLabels.map((l) => `${l.trackId}:${l.status[0]}`).join(" ") || "—"}</td>
                <td className="mono">{r.result.stats.frames}</td>
                <td className="mono">{r.result.stats.pathLength.toFixed(1)}</td>
                <td>
                  <button className={styles.linkBtn} onClick={() => onSelect(selected === i ? null : i)} aria-expanded={selected === i}>
                    {selected === i ? "Close" : "Inspect"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TrialDetail({ run, onClose }: { run: RunRecord; onClose: () => void }) {
  const r = run.result;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), [run]);
  const consoleLink = !run.variant.includes("@") ? `/console?scenario=${r.scenarioId}&seed=${r.seed}&method=${r.method}` : null;
  return (
    <section className={styles.detail} ref={ref} aria-label="Trial decision trace">
      <div className={styles.sectionHead}>
        <h2>
          {r.scenarioId} · seed {r.seed} · {labelFor(run.variant)}
        </h2>
        <div className={styles.exports}>
          {consoleLink && (
            <a className="btn" href={consoleLink}>
              Replay in Mission Control
            </a>
          )}
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <p>
        <StatusBadge status={r.outcome} /> {r.reason}
      </p>
      <p className={styles.evalLine}>
        <span className="provenance prov-eval">Evaluator</span> {verdictOf(run)} ·{" "}
        {run.score.trackLabels.map((l) => `${l.trackId} = ${l.label} (${l.status})`).join("; ") || "no candidates"}
      </p>
      <div className={styles.detailGrid}>
        <div>
          <h3>Candidates and evidence</h3>
          {r.tracks.map((t) => (
            <div key={t.id} className={styles.track}>
              <p>
                <strong className="mono">{t.id}</strong> <StatusBadge status={t.status} /> {t.decision.reason}
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Frame</th>
                      <th scope="col">Cell</th>
                      <th scope="col">Range</th>
                      <th scope="col">Score</th>
                      <th scope="col">Relief</th>
                      <th scope="col">Verdict / reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.evidence.map((e, i) => (
                      <tr key={i} data-counted={e.counted}>
                        <td className="mono">#{e.frameId}</td>
                        <td className="mono">{e.cell}</td>
                        <td className="mono">{e.range.toFixed(2)}</td>
                        <td className="mono">{e.score === null ? "miss" : e.score.toFixed(2)}</td>
                        <td className="mono">{e.excessRelief === null ? "—" : `${Math.round(e.excessRelief * 1000)} mm`}</td>
                        <td>
                          {e.verdict !== "INCONCLUSIVE" || r.method.startsWith("surestop") ? `${e.verdict}: ` : ""}
                          {e.reason}
                          {e.note ? <span className={styles.noteInline}> — {e.note}</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <div>
          <h3>Event history</h3>
          <ol className={styles.events}>
            {r.events.map((e, i) => (
              <li key={i}>
                <span className="mono">{e.t.toFixed(1)} s</span> <span className={styles.kind}>{e.kind}</span> {e.message}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Runner({ onRun, onClear, localCount, onShowLocal }: { onRun: (r: RunRecord) => void; onClear: () => Promise<void>; localCount: number; onShowLocal: () => void }) {
  const [scen, setScen] = useState<string[]>(["poster-decoy"]);
  const [variants, setVariants] = useState<string[]>(["surestop", "single-frame"]);
  const [seedStart, setSeedStart] = useState(1);
  const [seedCount, setSeedCount] = useState(2);
  const [status, setStatus] = useState<{ running: boolean; done: number; total: number; msg: string; error?: string }>({ running: false, done: 0, total: 0, msg: "" });
  const stop = useRef(false);
  const total = scen.length * variants.length * seedCount;

  const run = useCallback(async () => {
    stop.current = false;
    setStatus({ running: true, done: 0, total, msg: "Loading detector and scene…" });
    try {
      const { ExperimentEngine, parseVariant } = await import("@/experiments/engine");
      const engine = await ExperimentEngine.shared(new URLSearchParams(window.location.search).get("backend"));
      const seeds = Array.from({ length: seedCount }, (_, i) => seedStart + i);
      await engine.runBatch(
        { scenarios: scen, seeds, variants: variants.map(parseVariant) },
        {
          shouldStop: () => stop.current,
          onRun: (r, done, tot) => {
            onRun(r);
            setStatus({ running: true, done, total: tot, msg: `${r.result.scenarioId} seed ${r.result.seed} ${r.variant}: ${r.result.outcome}` });
          },
        },
      );
      setStatus((s) => ({ ...s, running: false, msg: stop.current ? `Stopped after ${s.done} of ${s.total} runs.` : `Finished ${s.done} runs.` }));
    } catch (e) {
      setStatus((s) => ({ ...s, running: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [scen, variants, seedStart, seedCount, total, onRun]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <section className={styles.section} aria-labelledby="run-h">
      <div className={styles.sectionHead}>
        <h2 id="run-h">Run an experiment</h2>
        <p className={styles.note}>Runs in this tab with real rendering and inference. Results are saved in this browser only (IndexedDB) and never mixed into the recorded dataset.</p>
      </div>
      <div className={styles.runGrid}>
        <fieldset className={styles.fieldset}>
          <legend>Scenarios</legend>
          {SCENARIOS.map((s) => (
            <label key={s.id} className={styles.check}>
              <input type="checkbox" checked={scen.includes(s.id)} onChange={() => toggle(scen, setScen, s.id)} disabled={status.running} /> {s.title}
            </label>
          ))}
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend>Methods</legend>
          {RUNNABLE.map((m) => (
            <label key={m.spec} className={styles.check}>
              <input type="checkbox" checked={variants.includes(m.spec)} onChange={() => toggle(variants, setVariants, m.spec)} disabled={status.running} /> {m.label}
            </label>
          ))}
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend>Seeds</legend>
          <div className={styles.seedRow}>
            <div className="field">
              <label htmlFor="seed-start">First seed</label>
              <input id="seed-start" className="input mono" type="number" min={0} value={seedStart} disabled={status.running} onChange={(e) => setSeedStart(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
            </div>
            <div className="field">
              <label htmlFor="seed-count">Count</label>
              <input id="seed-count" className="input mono" type="number" min={1} max={50} value={seedCount} disabled={status.running} onChange={(e) => setSeedCount(Math.min(50, Math.max(1, Math.floor(Number(e.target.value) || 1))))} />
            </div>
          </div>
          <p className={styles.note}>{total} missions. Expect roughly 5–30 s each depending on your GPU.</p>
        </fieldset>
      </div>
      <div className={styles.runBar}>
        {status.running ? (
          <button className="btn" onClick={() => (stop.current = true)}>
            Stop after current mission
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => void run()} disabled={!total}>
            Run {total} mission{total === 1 ? "" : "s"}
          </button>
        )}
        <div className={styles.progress} role="status" aria-live="polite">
          {status.total > 0 && (
            <>
              <progress max={status.total} value={status.done} aria-label="Missions completed" />
              <span className="mono">
                {status.done}/{status.total}
              </span>
            </>
          )}
          <span className={styles.note}>{status.error ? `Error: ${status.error}` : status.msg}</span>
        </div>
        <div className={styles.exports}>
          <button className="btn" onClick={onShowLocal} disabled={!localCount}>
            View browser runs ({localCount})
          </button>
          <button
            className="btn btn-ghost"
            disabled={!localCount || status.running}
            onClick={() => {
              if (window.confirm(`Delete all ${localCount} runs stored in this browser? The recorded reference dataset is not affected.`)) void onClear();
            }}
          >
            Clear browser runs
          </button>
        </div>
      </div>
    </section>
  );
}

interface CalibFile {
  generatedAt: string;
  seeds: number[];
  rule: string;
  selected: Record<string, number>;
  rows: Array<{ variant: string; trials: number; completion: Rate; far: Rate; ccr: Rate }>;
}

function Calibration() {
  const [cal, setCal] = useState<CalibFile | null>(null);
  useEffect(() => {
    fetch("/data/calibration.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setCal)
      .catch(() => setCal(null));
  }, []);
  if (!cal) return null;
  return (
    <section className={styles.section} aria-labelledby="cal-h">
      <div className={styles.sectionHead}>
        <h2 id="cal-h">Baseline threshold calibration</h2>
        <p className={styles.note}>
          Seeds {cal.seeds[0]}–{cal.seeds[cal.seeds.length - 1]} (disjoint from the evaluation seeds). {cal.rule}
        </p>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Variant</th>
              <th scope="col">Trials</th>
              <th scope="col">Completion</th>
              <th scope="col">False-arrival rate</th>
              <th scope="col">Correct confirmation</th>
            </tr>
          </thead>
          <tbody>
            {cal.rows.map((r) => (
              <tr key={r.variant} data-selected={Object.entries(cal.selected).some(([m, t]) => r.variant === `${m}@${t}`)}>
                <th scope="row">
                  {labelFor(r.variant)}
                  {Object.entries(cal.selected).some(([m, t]) => r.variant === `${m}@${t}`) && <span className={styles.sel}> selected</span>}
                </th>
                <td>{r.trials}</td>
                <RateCell r={r.completion} />
                <RateCell r={r.far} />
                <RateCell r={r.ccr} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
