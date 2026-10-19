// Runs /diagnostics/mission headlessly and writes the full results.
// Usage: node scripts/missions.mjs <baseUrl> "<query>" <out.json>
import { chromium } from "@playwright/test";
import fs from "node:fs";

const [baseUrl = "http://localhost:3100", query = "run=1", out = "missions-out.json"] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const t0 = Date.now();
await page.goto(`${baseUrl}/diagnostics/mission?${query}`);
let seen = 0;
for (;;) {
  const done = await page.evaluate(() => !!window.__SURESTOP_MISSIONS__);
  const lines = (await page.textContent('[data-testid="log"]').catch(() => "")).split("\n").filter(Boolean);
  for (const l of lines.slice(seen)) console.log(l);
  seen = lines.length;
  if (done) break;
  await page.waitForTimeout(1000);
  if (Date.now() - t0 > 6 * 3600 * 1000) throw new Error("timeout");
}
const data = await page.evaluate(() => window.__SURESTOP_MISSIONS__);
await browser.close();
if (data.error) { console.error(data.error); process.exit(1); }
data.consoleErrors = errors;
fs.writeFileSync(out, JSON.stringify(data));
console.log(`wrote ${out}: ${data.runs.length} runs in ${((Date.now() - t0) / 1000).toFixed(0)} s; console errors: ${errors.length}`);
