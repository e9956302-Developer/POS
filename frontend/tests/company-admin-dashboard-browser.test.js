import assert from "node:assert/strict";
import fs from "node:fs";
import { after, before, test } from "node:test";
import puppeteer from "puppeteer-core";
import { createServer as createViteServer } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "../../backend/src/app.js";
import { env } from "../../backend/src/config/env.js";
import { runMigrations } from "../../backend/src/db/migrate.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(testDir, "..");

const CHROME_PATHS = [
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];

function findBrowserPath() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No browser executable found");
}

let backendServer;
let viteServer;
let browser;
let page;
const PORT_BACKEND = 4000;
const PORT_FRONTEND = 5173;
const APP_URL = `http://localhost:${PORT_FRONTEND}/#login`;

before(async () => {
  await runMigrations();

  // 1. Ensure backend is running
  try {
    const res = await fetch(`http://localhost:${PORT_BACKEND}/api/health`, { signal: AbortSignal.timeout(600) });
    if (!res.ok) throw new Error("not ready");
  } catch {
    await new Promise((res) => {
      backendServer = app.listen(PORT_BACKEND, res);
    });
  }

  // 2. Ensure frontend is running
  try {
    await fetch(`http://localhost:${PORT_FRONTEND}`, { signal: AbortSignal.timeout(600) });
  } catch {
    viteServer = await createViteServer({
      root: frontendRoot,
      server: { port: PORT_FRONTEND, host: true }
    });
    await viteServer.listen();
  }

  // 3. Launch browser
  const executablePath = findBrowserPath();
  browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
});

after(async () => {
  if (browser) await browser.close();
  if (viteServer) await viteServer.close();
  if (backendServer) backendServer.close();
});

test("E2E Test: Company Admin Dashboard Date Filter Row & Consolidated Figures", async () => {
  // Navigate to login
  await page.goto(APP_URL, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(APP_URL, { waitUntil: "networkidle0" });

  // Log in as Company Admin
  await page.evaluate((email, password) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    const inputs = document.querySelectorAll("input");
    if (inputs[0]) {
      nativeSetter.call(inputs[0], email);
      inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (inputs[1]) {
      nativeSetter.call(inputs[1], password);
      inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    }
    const btn = document.querySelector("button.primary-btn");
    if (btn) btn.click();
  }, "admin@mobilepos.local", "admin123");

  // Wait for dashboard to load
  await page.waitForSelector(".dashboard-filter-row", { timeout: 8000 });

  // Check 1: On fresh load, both Date From and Date To show today's date
  const dateFromVal = await page.$eval("#dashboard-date-from", (el) => el.value);
  const dateToVal = await page.$eval("#dashboard-date-to", (el) => el.value);
  const dateToMax = await page.$eval("#dashboard-date-to", (el) => el.getAttribute("max"));

  assert.ok(dateFromVal.length === 10, "Date From must be YYYY-MM-DD");
  assert.equal(dateFromVal, dateToVal, "Date From and Date To must match on fresh load");
  assert.equal(dateToMax, dateToVal, "Date To max attribute must be capped at today");

  // Check 2: Caption reads 'Showing figures for today (DD MMM YYYY)'
  const initialCaption = await page.$eval(".dashboard-period-caption", (el) => el.textContent.trim());
  assert.match(initialCaption, /^Showing figures for today \(\d{2} [A-Za-z]{3} \d{4}\)$/);

  // Check 3: Check stat cards exist and show numbers
  const statCardCount = await page.$$eval(".stats-grid .stat-card", (els) => els.length);
  assert.ok(statCardCount >= 10, `Expected at least 10 stat cards, got ${statCardCount}`);

  // Check 4: Change Date From to 1st of month
  const monthStart = `${dateToVal.slice(0, 7)}-01`;
  await page.evaluate((val) => {
    const el = document.querySelector("#dashboard-date-from");
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeSetter.call(el, val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, monthStart);

  // Wait for caption to update to multi-day range
  await page.waitForFunction(
    (start) => {
      const caption = document.querySelector(".dashboard-period-caption")?.textContent || "";
      return caption.includes("–") || caption.includes("-");
    },
    { timeout: 5000 },
    monthStart
  );

  const rangeCaption = await page.$eval(".dashboard-period-caption", (el) => el.textContent.trim());
  assert.match(rangeCaption, /^Showing figures for \d{2} [A-Za-z]{3} \d{4} [–-] \d{2} [A-Za-z]{3} \d{4}$/);

  // Check 5: Set Date From after Date To -> inline error appears, no reload happens
  await page.evaluate(() => {
    const elFrom = document.querySelector("#dashboard-date-from");
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeSetter.call(elFrom, "2026-11-20");
    elFrom.dispatchEvent(new Event("input", { bubbles: true }));
    elFrom.dispatchEvent(new Event("change", { bubbles: true }));

    const elTo = document.querySelector("#dashboard-date-to");
    nativeSetter.call(elTo, "2026-11-10");
    elTo.dispatchEvent(new Event("input", { bubbles: true }));
    elTo.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await page.waitForSelector(".dashboard-date-inline-error", { timeout: 3000 });
  const errorText = await page.$eval(".dashboard-date-inline-error", (el) => el.textContent.trim());
  assert.match(errorText, /Date From cannot be after Date To/);

  // Check 6: Click Today button resets both dates and clears error
  await page.click(".dashboard-today-btn");
  await page.waitForFunction(() => !document.querySelector(".dashboard-date-inline-error"), { timeout: 3000 });

  const resetFrom = await page.$eval("#dashboard-date-from", (el) => el.value);
  const resetTo = await page.$eval("#dashboard-date-to", (el) => el.value);
  assert.equal(resetFrom, dateToVal, "Date From must reset to today");
  assert.equal(resetTo, dateToVal, "Date To must reset to today");

  const resetCaption = await page.$eval(".dashboard-period-caption", (el) => el.textContent.trim());
  assert.match(resetCaption, /^Showing figures for today \(\d{2} [A-Za-z]{3} \d{4}\)$/);

  // Check 7: Viewport responsiveness across widths (1280px, 1024px, 768px, 375px)
  for (const width of [1280, 1024, 768, 375]) {
    await page.setViewport({ width, height: 800 });
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(hasHorizontalOverflow, false, `No horizontal overflow expected at ${width}px width`);
  }
});
