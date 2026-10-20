// Compares two batch/record files run by run, keyed by (scenario, seed, variant).
// Wall-clock measurements (inference time, load time, wall time) are ignored because they
// differ on every machine; everything else, including every frame, score and decision, must
// match. `result.config` is reported separately: records made before the baseline thresholds
// were selected carry the old defaults for the *other* methods' unused settings.
// Usage: node scripts/compare-runs.mjs <a.json|a.json.gz> <b.json|b.json.gz>
import fs from "node:fs";
import zlib from "node:zlib";

const TIMING = new Set(["inferenceMs", "inferenceMsTotal", "wallClockMs", "loadMs"]);
const read = (f) => JSON.parse((f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(f)) : fs.readFileSync(f)).toString("utf8")).runs;
const key = (r) => `${r.result.scenarioId}|${r.result.seed}|${r.variant}`;
const canon = (o) => JSON.stringify(o, (k, v) => (TIMING.has(k) ? undefined : v));

const [fa, fb] = process.argv.slice(2);
if (!fa || !fb) {
  console.error("usage: node scripts/compare-runs.mjs <a.json[.gz]> <b.json[.gz]>");
  process.exit(2);
}
const a = read(fa);
const b = new Map(read(fb).map((r) => [key(r), r]));
let missing = 0, same = 0, sameConfig = 0;
const differing = [];
for (const r of a) {
  const o = b.get(key(r));
  if (!o) {
    missing++;
    continue;
  }
  const { config: ca, ...ra } = r.result;
  const { config: cb, ...rb } = o.result;
  if (canon({ ...r, result: ra }) === canon({ ...o, result: rb })) same++;
  else differing.push(key(r));
  if (canon(ca) === canon(cb)) sameConfig++;
}
const compared = a.length - missing;
console.log(`compared ${compared} runs (${missing} of ${a.length} not present in the second file)`);
console.log(`identical apart from wall-clock timing and config: ${same}/${compared}`);
console.log(`config identical: ${sameConfig}/${compared}`);
if (differing.length) console.log(`differing runs: ${differing.slice(0, 20).join(", ")}${differing.length > 20 ? " …" : ""}`);
process.exit(differing.length || missing ? 1 : 0);
