import assert from "node:assert/strict";
import fs from "node:fs";
import { after, before, test } from "node:test";
import puppeteer from "puppeteer-core";

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

let devServerAvailable = false;
let browser;
let page;
const APP_URL = "http://localhost:5173/#login";

before(async () => {
  try {
    await fetch("http://localhost:5173", { signal: AbortSignal.timeout(1000) });
    devServerAvailable = true;
  } catch {
    devServerAvailable = false;
    return;
  }
  let executablePath;
  try {
    executablePath = findBrowserPath();
  } catch {
    devServerAvailable = false;
    return;
  }
  browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  page = await browser.newPage();
});

after(async () => {
  if (browser) await browser.close();
});

test("Manager (Waqar) logs in and sees all assigned operational pages in sidebar navigation", async (t) => {
  if (!devServerAvailable) {
    t.skip("Vite dev server is not running on http://localhost:5173");
    return;
  }
  await page.goto(APP_URL, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(APP_URL, { waitUntil: "networkidle0" });

  // Enter login credentials for manager hello@hello.com using nativeInputValueSetter
  await page.evaluate(() => {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    const inputs = document.querySelectorAll("input");
    const emailInput = inputs[0];
    const passInput = inputs[1];

    nativeSetter.call(emailInput, "hello@hello.com");
    emailInput.dispatchEvent(new Event("input", { bubbles: true }));

    nativeSetter.call(passInput, "Manager123!");
    passInput.dispatchEvent(new Event("input", { bubbles: true }));

    const btn = document.querySelector("button[type='submit']") || document.querySelector(".primary-btn");
    if (btn) btn.click();
  });

  await new Promise((r) => setTimeout(r, 1500));

  // Inspect the navigation tabs
  const navTabs = await page.evaluate(() => {
    const tabButtons = Array.from(document.querySelectorAll(".nav-list button"));
    return tabButtons.map((b) => b.innerText.trim());
  });

  // Verify manager sees operational pages
  assert.ok(navTabs.length > 0, "Navigation tabs must not be empty for manager");
  assert.ok(navTabs.some((t) => /Dashboard/i.test(t)), "Manager sees Dashboard");
  assert.ok(navTabs.some((t) => /Sales/i.test(t)), "Manager sees Sales");
  assert.ok(navTabs.some((t) => /Inventory/i.test(t)), "Manager sees Inventory");

  // Verify manager can click Sales and view the operational form
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".nav-list button"));
    const salesBtn = btns.find((b) => /Sales/i.test(b.innerText));
    if (salesBtn) salesBtn.click();
  });

  await new Promise((r) => setTimeout(r, 800));

  const salesViewStatus = await page.evaluate(() => {
    const errorEl = document.querySelector(".alert.error");
    const infoEl = document.querySelector(".alert.info");
    const h2 = document.querySelector("h2");
    const saveBtn = document.querySelector("button[type='submit']");
    const userSession = window.localStorage.getItem("token");
    return {
      heading: h2 ? h2.innerText : "",
      errorMessage: errorEl ? errorEl.innerText : null,
      infoMessage: infoEl ? infoEl.innerText : null,
      saveButtonDisabled: saveBtn ? saveBtn.disabled : false,
      saveButtonText: saveBtn ? saveBtn.innerText : ""
    };
  });
  assert.equal(salesViewStatus.heading, "Create Sale");
  assert.equal(salesViewStatus.errorMessage, null, "No permission error message is shown");
  assert.equal(salesViewStatus.saveButtonDisabled, false, "Manager has active Save Sale button");
  assert.match(salesViewStatus.saveButtonText, /Save Sale/i);
});
