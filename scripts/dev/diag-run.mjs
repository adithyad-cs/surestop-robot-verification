import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.log("pageerror " + String(e)));
await page.goto("http://localhost:3000/console?scenario=poster-decoy&seed=1&method=surestop");
await page.waitForFunction(() => window.__surestopConsole?.getState().phase === "ready", null, { timeout: 600000 });
await page.getByRole("radio", { name: /Maximum speed/ }).click();
try {
  await page.getByRole("button", { name: "Run mission" }).click({ timeout: 15000 });
  console.log("clicked");
} catch (e) { console.log("CLICK FAILED", String(e).slice(0, 1500)); }
await page.waitForTimeout(3000);
console.log(JSON.stringify(await page.evaluate(() => { const s = window.__surestopConsole.getState(); return { phase: s.phase, frames: s.frames, mode: s.mode }; })));
await browser.close();
