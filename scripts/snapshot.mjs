import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const [baseUrl = "http://localhost:3100", scenario = "poster-decoy", seed = "1", outDir = "snap-out", backend = ""] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("pageerror", String(e)));
await page.goto(`${baseUrl}/diagnostics/mission?run=1&snap=1&scenarios=${scenario}&seeds=${seed}${backend ? `&backend=${backend}` : ""}`);
await page.waitForFunction(() => !!window.__SURESTOP_SNAP__, null, { timeout: 600000 });
const data = await page.evaluate(() => window.__SURESTOP_SNAP__);
await browser.close();
if (data.error) { console.error(data.error); process.exit(1); }
for (const [k, v] of Object.entries(data.images)) fs.writeFileSync(path.join(outDir, `${k}.jpg`), Buffer.from(v.split(",")[1], "base64"));
console.log(Object.keys(data.images).join(" "));
