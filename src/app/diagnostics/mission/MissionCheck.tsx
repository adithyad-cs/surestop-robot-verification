"use client";

import { useEffect, useState } from "react";
import type { RunRecord } from "@/experiments/engine";
import type { MethodId } from "@/policies/types";

let started = false;

declare global {
  interface Window {
    __SURESTOP_MISSIONS__?: { runs: RunRecord[]; backend: unknown; detector: unknown; wallMs: number } | { error: string };
    __SURESTOP_SNAP__?: { images: Record<string, string> } | { error: string };
  }
}

/** Headless batch runner used for end-to-end checks: /diagnostics/mission?run=1&scenarios=..&seeds=..&methods=.. */
export default function MissionCheck() {
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("run") !== "1" || started) return;
    started = true;
    const scenarios = (q.get("scenarios") ?? "poster-decoy").split(",");
    const seeds = (q.get("seeds") ?? "1").split(",").map(Number);
    const methods = (q.get("methods") ?? "single-frame,surestop").split(",") as MethodId[];
    const t0 = performance.now();
    if (q.get("snap") === "1") {
      (async () => {
        try {
          const { snapshot } = await import("@/diagnostics/snapshot");
          window.__SURESTOP_SNAP__ = { images: await snapshot(scenarios[0], seeds[0], q.get("backend")) };
          setLog((l) => [...l, "snapshot done"]);
        } catch (e) {
          window.__SURESTOP_SNAP__ = { error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) };
        }
      })();
      return;
    }
    (async () => {
      try {
        const { ExperimentEngine } = await import("@/experiments/engine");
        const engine = await ExperimentEngine.create(q.get("backend"));
        setLog((l) => [...l, `backend ${engine.detector.info.backend} (${engine.backend.reason})`]);
        const runs = await engine.runBatch(
          { scenarios, seeds, methods },
          {
            onRun: (r, d, t) =>
              setLog((l) => [
                ...l,
                `[${d}/${t}] ${r.result.scenarioId} seed ${r.result.seed} ${r.result.method}: ${r.result.outcome} — ${r.result.reason} | eval: correct=${r.score.correctArrival} false=${r.score.falseArrival} frames=${r.result.stats.frames}`,
              ]),
          },
        );
        window.__SURESTOP_MISSIONS__ = { runs, backend: engine.backend, detector: engine.detector.info, wallMs: performance.now() - t0 };
      } catch (e) {
        const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
        window.__SURESTOP_MISSIONS__ = { error: msg };
        setLog((l) => [...l, `ERROR ${msg}`]);
      }
    })();
  }, []);
  return (
    <main style={{ padding: 24, fontFamily: "monospace", fontSize: 12 }}>
      <h1 style={{ fontSize: 16 }}>Mission batch check</h1>
      <pre data-testid="log">{log.join("\n")}</pre>
    </main>
  );
}
