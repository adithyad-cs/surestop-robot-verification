// Turns raw batch output (scripts/missions.mjs) into the Lab's data files.
//   calibration: node .cache/aggregate.mjs calibration <in.json> public/data/calibration.json
//   evaluation:  node .cache/aggregate.mjs evaluation <in.json> public/data/eval-runs.json
// The threshold-selection rule below was fixed before the calibration results were inspected.
import fs from "node:fs";
import { groupBy, missionMetrics } from "@/eval/metrics";
import type { RunRecord } from "@/experiments/engine";

interface BatchFile {
  runs: RunRecord[];
  backend: { backend: string; reason: string; glRenderer: string | null };
  detector: { name: string; packageVersion: string; tfjsVersion: string; base: string; backend: string };
  wallMs: number;
}

export const SELECTION_RULE =
  "For each baseline, choose the threshold τ with the highest completion rate over all six scenarios; ties go to the lower false-arrival rate, then to the lower τ.";

const [mode, input, output] = process.argv.slice(2);
if (!mode || !input || !output) {
  console.error("usage: aggregate <calibration|evaluation> <in.json> <out.json>");
  process.exit(2);
}
const batch = JSON.parse(fs.readFileSync(input, "utf8")) as BatchFile;

if (mode === "calibration") {
  const rows = [...groupBy(batch.runs, (r) => r.variant).entries()]
    .map(([variant, rs]) => {
      const m = missionMetrics(rs.map((r) => r.score));
      return { variant, trials: m.trials, completion: m.completionRate, far: m.falseArrivalRate, ccr: m.correctConfirmationRate, abstention: m.abstentionRate };
    })
    .sort((a, b) => a.variant.localeCompare(b.variant, undefined, { numeric: true }));
  const selected: Record<string, number> = {};
  for (const method of ["single-frame", "persistence"]) {
    const cands = rows
      .filter((r) => r.variant.startsWith(`${method}@`))
      .map((r) => ({ ...r, tau: Number(r.variant.split("@")[1]) }))
      .sort((a, b) => (b.completion.value ?? 0) - (a.completion.value ?? 0) || (a.far.value ?? 0) - (b.far.value ?? 0) || a.tau - b.tau);
    if (cands.length) selected[method] = cands[0].tau;
  }
  const seeds = [...new Set(batch.runs.map((r) => r.result.seed))].sort((a, b) => a - b);
  const out = { generatedAt: new Date().toISOString(), seeds, rule: SELECTION_RULE, selected, detector: batch.detector, backend: batch.backend.backend, rows };
  fs.writeFileSync(output, JSON.stringify(out, null, 1));
  console.log("selected thresholds:", selected);
  for (const r of rows)
    console.log(
      `${r.variant.padEnd(22)} n=${r.trials}  completion ${r.completion.num}/${r.completion.den}  FAR ${r.far.num}/${r.far.den}  CCR ${r.ccr.num}/${r.ccr.den}  abst ${r.abstention.num}/${r.abstention.den}`,
    );
} else if (mode === "evaluation") {
  const seeds = [...new Set(batch.runs.map((r) => r.result.seed))].sort((a, b) => a - b);
  const out = {
    schema: "surestop.recorded/1",
    generatedAt: new Date().toISOString(),
    environment: {
      detector: `${batch.detector.name} ${batch.detector.packageVersion} (${batch.detector.base}), tfjs ${batch.detector.tfjsVersion}`,
      backend: `${batch.detector.backend} (${batch.backend.reason})`,
      gl: batch.backend.glRenderer ?? "n/a",
      browser: "Chromium (Playwright headless shell 1194), software WebGL (SwiftShader)",
      machine: "Cloud container, 4 vCPU, no GPU",
      wallClock: `${(batch.wallMs / 60000).toFixed(1)} min for ${batch.runs.length} missions`,
    },
    protocol: {
      seeds: `${seeds[0]}–${seeds[seeds.length - 1]} (${seeds.length} held-out seeds, disjoint from calibration seeds)`,
      scenarios: [...new Set(batch.runs.map((r) => r.result.scenarioId))].join(", "),
      methods: [...new Set(batch.runs.map((r) => r.variant))].join(", "),
      unit: "one seeded mission = one trial",
      thresholds: "baseline τ selected on calibration seeds (see calibration table); SureStop thresholds fixed from Phase A renders",
    },
    runs: batch.runs,
  };
  fs.writeFileSync(output, JSON.stringify(out));
  const byV = groupBy(batch.runs, (r) => r.variant);
  for (const [v, rs] of byV) {
    const m = missionMetrics(rs.map((r) => r.score));
    console.log(
      `${v.padEnd(22)} n=${m.trials}  FAR ${m.falseArrivalRate.num}/${m.falseArrivalRate.den}  CCR ${m.correctConfirmationRate.num}/${m.correctConfirmationRate.den}  abst ${m.abstentionRate.num}/${m.abstentionRate.den}  completion ${m.completionRate.num}/${m.completionRate.den}  frames ${m.meanFrames.toFixed(1)}  path ${m.meanPathLength.toFixed(1)}`,
    );
  }
} else {
  console.error(`unknown mode ${mode}`);
  process.exit(2);
}
