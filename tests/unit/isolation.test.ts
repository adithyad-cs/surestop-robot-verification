// Guards the perception/evaluation boundary: robot-facing modules must not import
// scenario ground truth, the asset catalogue or the evaluator.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../src");
const ROBOT_FACING = ["verify", "policies", "sensing", "perception", "mission"];
const FORBIDDEN = [
  /@\/sim\/assets/,
  /@\/sim\/world/,
  /@\/eval\//,
  /@\/scenarios\//,
  /groundTruth/i,
  /objectRoots/,
  /\.\.\/sim\/assets/,
  /\.\.\/eval\//,
];

function files(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

describe("ground-truth isolation", () => {
  for (const mod of ROBOT_FACING) {
    it(`src/${mod} does not reference ground truth or the evaluator`, () => {
      const list = files(path.join(ROOT, mod));
      expect(list.length).toBeGreaterThan(0);
      for (const f of list) {
        const src = fs.readFileSync(f, "utf8");
        for (const re of FORBIDDEN) expect(src, `${path.relative(ROOT, f)} matches ${re}`).not.toMatch(re);
      }
    });
  }
});
