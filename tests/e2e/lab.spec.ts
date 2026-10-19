import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { trackErrors } from "./helpers";

test("recorded results load with counts and denominators, and export real records", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/lab");
  const table = page.getByRole("table").filter({ hasText: "False-arrival rate" });
  await expect(table).toBeVisible({ timeout: 60_000 });
  await expect(table.locator("tbody tr").first()).toContainText(/\d+\/\d+/);
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  const text = fs.readFileSync((await csv.path())!, "utf8");
  const lines = text.trim().split("\n");
  expect(lines[0]).toContain("scenario,seed,method,outcome");
  expect(lines.length).toBeGreaterThan(10);
  const [json] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export JSON" }).click()]);
  const data = JSON.parse(fs.readFileSync((await json.path())!, "utf8"));
  expect(data.schema).toBe("surestop.experiment/1");
  expect(data.runs.length).toBe(lines.length - 1);
  // Inspecting a trial shows its decision trace.
  await page.getByRole("button", { name: "Inspect" }).first().click();
  await expect(page.getByRole("region", { name: "Trial decision trace" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a live batch runs in the browser and is stored separately", async ({ page }) => {
  await page.goto("/lab");
  await page.getByLabel("Picture decoy first").uncheck();
  await page.getByLabel("Clear target").check();
  await page.getByLabel("SureStop (multi-view evidence)").uncheck();
  await page.getByLabel("Count").fill("1");
  await page.getByRole("button", { name: /Run 1 mission/ }).click();
  await expect(page.getByRole("button", { name: /View browser runs \(1\)/ })).toBeVisible({ timeout: 600_000 });
  await page.getByRole("button", { name: /View browser runs/ }).click();
  await expect(page.getByRole("tab", { name: /Runs in this browser \(1\)/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("table").filter({ hasText: "False-arrival rate" }).locator("tbody tr")).toHaveCount(1);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Clear browser runs" }).click();
  await expect(page.getByRole("tab", { name: /Runs in this browser \(0\)/ })).toBeVisible();
});
