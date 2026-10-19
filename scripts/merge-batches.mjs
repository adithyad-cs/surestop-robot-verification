// Merges batch outputs from parallel scripts/missions.mjs processes.
// Usage: node scripts/merge-batches.mjs out.json in1.json in2.json ...
import fs from "node:fs";
const [out, ...inputs] = process.argv.slice(2);
const files = inputs.map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
const key = (f) => JSON.stringify([f.detector.name, f.detector.packageVersion, f.detector.tfjsVersion, f.detector.base, f.detector.backend, f.backend.backend]);
if (new Set(files.map(key)).size !== 1) throw new Error("batches used different detectors/backends; refusing to merge");
const runs = files.flatMap((f) => f.runs);
const ids = new Set(runs.map((r) => `${r.result.scenarioId}|${r.result.seed}|${r.variant}`));
if (ids.size !== runs.length) throw new Error("duplicate (scenario, seed, variant) runs");
const merged = { ...files[0], runs, wallMs: Math.max(...files.map((f) => f.wallMs)), parallelProcesses: inputs.length, consoleErrors: files.flatMap((f) => f.consoleErrors ?? []) };
fs.writeFileSync(out, JSON.stringify(merged));
console.log(`merged ${runs.length} runs from ${inputs.length} files; console errors: ${merged.consoleErrors.length}`);
