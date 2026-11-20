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
  await page.setViewport({ width: 1280, height: 800 });
});

after(async () => {
  if (browser) await browser.close();
});

async function loginAsManager() {
  await page.goto(APP_URL, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(APP_URL, { waitUntil: "networkidle0" });

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
}

test("Sales navigation acceptance: side-menu sub-items, removal of page switcher buttons, breadcrumbs, and deep links", async (t) => {
  if (!devServerAvailable) {
    t.skip("Vite dev server is not running on http://localhost:5173");
    return;
  }

  await loginAsManager();

  // 1. Verify Sales parent menu in sidebar has the 2 sub-menus with exact labels in order
  const salesSubMenuItems = await page.evaluate(() => {
    // Find all sub-nav-list items under sales or general sub-menus
    const subButtons = Array.from(document.querySelectorAll(".sub-nav-list button, .modern-sub-nav-list button"));
    return subButtons.map((b) => b.innerText.trim());
  });

  assert.ok(
    salesSubMenuItems.some((label) => label.includes("Create Sale (POS Counter)")),
    "Sidebar sub-menu must include 'Create Sale (POS Counter)'"
  );
  assert.ok(
    salesSubMenuItems.some((label) => label.includes("Sale Directory & History")),
    "Sidebar sub-menu must include 'Sale Directory & History'"
  );

  // Check ordering of the two items
  const createSaleIdx = salesSubMenuItems.findIndex((l) => l.includes("Create Sale (POS Counter)"));
  const historyIdx = salesSubMenuItems.findIndex((l) => l.includes("Sale Directory & History"));
  assert.ok(createSaleIdx !== -1 && historyIdx !== -1, "Both sub-items must exist");
  assert.ok(createSaleIdx < historyIdx, "Create Sale (POS Counter) must precede Sale Directory & History");

  // 2. Navigate to Create Sale (POS Counter) view
  await page.evaluate(() => {
    const subButtons = Array.from(document.querySelectorAll(".sub-nav-list button, .modern-sub-nav-list button"));
    const btn = subButtons.find((b) => b.innerText.includes("Create Sale (POS Counter)"));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Check URL hash
  const hashAfterCreateClick = await page.evaluate(() => window.location.hash);
  assert.match(hashAfterCreateClick, /#sales_new/);

  // Check Breadcrumb in header
  const breadcrumbCreateSale = await page.evaluate(() => {
    const bc = document.querySelector(".page-breadcrumb-bar, .modern-row2-breadcrumb-bar, .breadcrumb-trail, .modern-breadcrumb-trail");
    return bc ? bc.innerText.replace(/\s+/g, " ").trim() : "";
  });
  assert.match(breadcrumbCreateSale, /Sales.*(?:›|\/).*Create Sale \(POS Counter\)/);

  // Check that page NO LONGER has .nav-tabs button switcher or visible tab-btn on the page body
  const pageSwitcherOnCreate = await page.evaluate(() => {
    const pageGrid = document.querySelector(".page-grid");
    if (!pageGrid) return { hasNavTabs: false, visibleSwitcherButtons: [] };
    const navTabs = pageGrid.querySelector(".nav-tabs");
    const buttons = Array.from(pageGrid.querySelectorAll("button.tab-btn")).filter((b) => {
      const style = window.getComputedStyle(b);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    return {
      hasNavTabs: Boolean(navTabs),
      visibleSwitcherButtons: buttons.map((b) => b.innerText.trim())
    };
  });
  assert.equal(pageSwitcherOnCreate.hasNavTabs, false, "Create Sale view must not contain .nav-tabs container");
  assert.equal(pageSwitcherOnCreate.visibleSwitcherButtons.length, 0, "No visible switcher tab-btn on Create Sale page");

  // 3. Navigate to Sale Directory & History view
  await page.evaluate(() => {
    const subButtons = Array.from(document.querySelectorAll(".sub-nav-list button, .modern-sub-nav-list button"));
    const btn = subButtons.find((b) => b.innerText.includes("Sale Directory & History"));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Check URL hash
  const hashAfterHistoryClick = await page.evaluate(() => window.location.hash);
  assert.match(hashAfterHistoryClick, /#sales_history/);

  // Check Breadcrumb in header
  const breadcrumbHistory = await page.evaluate(() => {
    const bc = document.querySelector(".page-breadcrumb-bar, .modern-row2-breadcrumb-bar, .breadcrumb-trail, .modern-breadcrumb-trail");
    return bc ? bc.innerText.replace(/\s+/g, " ").trim() : "";
  });
  assert.match(breadcrumbHistory, /Sales.*(?:›|\/).*Sale Directory & History/);

  // Check that History view ALSO does not have .nav-tabs button switcher
  const pageSwitcherOnHistory = await page.evaluate(() => {
    const pageGrid = document.querySelector(".page-grid");
    if (!pageGrid) return { hasNavTabs: false, visibleSwitcherButtons: [] };
    const navTabs = pageGrid.querySelector(".nav-tabs");
    const buttons = Array.from(pageGrid.querySelectorAll("button.tab-btn")).filter((b) => {
      const style = window.getComputedStyle(b);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    return {
      hasNavTabs: Boolean(navTabs),
      visibleSwitcherButtons: buttons.map((b) => b.innerText.trim())
    };
  });
  assert.equal(pageSwitcherOnHistory.hasNavTabs, false, "History view must not contain .nav-tabs container");
  assert.equal(pageSwitcherOnHistory.visibleSwitcherButtons.length, 0, "No visible switcher tab-btn on History page");

  // 4. Test Deep Linking: Navigate directly to /#sales
  await page.goto("http://localhost:5173/#sales", { waitUntil: "networkidle0" });
  await page.waitForSelector(".app-shell", { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 1000));
  const currentHashInfo = await page.evaluate(() => ({
    hash: window.location.hash,
    breadcrumb: document.querySelector(".page-breadcrumb-bar, .modern-row2-breadcrumb-bar, .breadcrumb-trail, .modern-breadcrumb-trail")?.innerText
  }));
  assert.match(currentHashInfo.hash, /#sales_new/);

  // 5. Test Deep Linking: Navigate directly to /#sales_history
  await page.goto("http://localhost:5173/#sales_history", { waitUntil: "networkidle0" });
  await page.waitForSelector(".app-shell", { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 800));
  const breadcrumbDirectHistory = await page.evaluate(() => {
    const bc = document.querySelector(".page-breadcrumb-bar, .modern-row2-breadcrumb-bar, .breadcrumb-trail, .modern-breadcrumb-trail");
    return bc ? bc.innerText.replace(/\s+/g, " ").trim() : "";
  });
  assert.match(breadcrumbDirectHistory, /Sales.*(?:›|\/).*Sale Directory & History/);

  // 6. Test Modern Compact Layout
  await page.evaluate(() => {
    // Switch to modern compact layout through layout context or localStorage
    localStorage.setItem("mp_layout_mode", "compact");
    localStorage.setItem("pos_layout_mode", "compact");
  });
  await page.goto("http://localhost:5173/#sales_new", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));

  const modernBreadcrumb = await page.evaluate(() => {
    const bc = document.querySelector(".page-breadcrumb-bar, .modern-row2-breadcrumb-bar, .breadcrumb-trail, .modern-breadcrumb-trail");
    return bc ? bc.innerText.replace(/\s+/g, " ").trim() : "";
  });
  assert.match(modernBreadcrumb, /Sales.*(?:›|\/).*Create Sale \(POS Counter\)/);
});
