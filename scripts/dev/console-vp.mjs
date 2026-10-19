import { chromium } from "@playwright/test";
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const vp of [{ n: "tablet", width: 1024, height: 768 }, { n: "mobile", width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto(`${base}/console?scenario=screen-decoy&seed=2&method=surestop`);
  await page.waitForFunction(() => window.__surestopConsole?.getState().phase === "ready", null, { timeout: 600000 });
  await page.waitForTimeout(1000);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: `${out}/console-${vp.n}.png`, fullPage: true });
  console.log(vp.n, "overflow", overflow);
  await page.close();
}
await browser.close();
