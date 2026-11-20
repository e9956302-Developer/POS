import assert from "node:assert/strict";
import fs from "node:fs";
import { after, before, test } from "node:test";
import puppeteer from "puppeteer-core";

const CHROME_PATHS = [
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
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

test("Sales and Purchases sub-menus: collapsed by default, click & keyboard toggle, active parent highlight", async (t) => {
  if (!devServerAvailable) {
    t.skip("Vite dev server is not running on http://localhost:5173");
    return;
  }

  await loginAsManager();

  // 1. DEFAULT STATE ON FRESH LOGIN:
  // Both Sales and Purchases are COLLAPSED by default — no sub-menus visible
  const initialMenuState = await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const salesBtn = navItems.find((b) => /Sales/i.test(b.innerText));
    const purchasesBtn = navItems.find((b) => /Purchases/i.test(b.innerText));

    const subButtons = Array.from(document.querySelectorAll(".sub-nav-list button, .modern-sub-nav-list button"));
    const hasSaleSubItems = subButtons.some((b) => /Create Sale|Sale Directory/i.test(b.innerText));
    const hasPurchaseSubItems = subButtons.some((b) => /Create Purchase|Purchases Directory/i.test(b.innerText));

    return {
      salesAriaExpanded: salesBtn ? salesBtn.getAttribute("aria-expanded") : null,
      purchasesAriaExpanded: purchasesBtn ? purchasesBtn.getAttribute("aria-expanded") : null,
      hasSaleSubItems,
      hasPurchaseSubItems
    };
  });

  assert.equal(initialMenuState.hasSaleSubItems, false, "Sales sub-items must be hidden on fresh load");
  assert.equal(initialMenuState.hasPurchaseSubItems, false, "Purchases sub-items must be hidden on fresh load");
  assert.equal(initialMenuState.salesAriaExpanded, "false", "Sales parent must have aria-expanded='false'");
  assert.equal(initialMenuState.purchasesAriaExpanded, "false", "Purchases parent must have aria-expanded='false'");

  // 2. CLICK TOGGLE BEHAVIOR (Sales):
  // One click on Sales expands it
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const salesBtn = navItems.find((b) => /Sales/i.test(b.innerText));
    if (salesBtn) salesBtn.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  const afterSalesClick = await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const salesBtn = navItems.find((b) => /Sales/i.test(b.innerText));
    const subButtons = Array.from(document.querySelectorAll(".sub-nav-list button"));
    const subLabels = subButtons.map((b) => b.innerText.trim());
    return {
      salesAriaExpanded: salesBtn ? salesBtn.getAttribute("aria-expanded") : null,
      subLabels,
      hash: window.location.hash
    };
  });

  assert.equal(afterSalesClick.salesAriaExpanded, "true", "Sales parent aria-expanded becomes 'true'");
  assert.ok(afterSalesClick.subLabels.some((l) => l.includes("Create Sale (POS Counter)")), "Contains 'Create Sale (POS Counter)'");
  assert.ok(afterSalesClick.subLabels.some((l) => l.includes("Sale Directory & History")), "Contains 'Sale Directory & History'");
  // Parent click NEVER navigates by itself
  assert.equal(afterSalesClick.hash, "#dashboard", "Clicking parent does not navigate away from current page");

  // Click Sales again -> collapses
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const salesBtn = navItems.find((b) => /Sales/i.test(b.innerText));
    if (salesBtn) salesBtn.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  const afterSalesSecondClick = await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const salesBtn = navItems.find((b) => /Sales/i.test(b.innerText));
    const subButtons = Array.from(document.querySelectorAll(".sub-nav-list button"));
    return {
      salesAriaExpanded: salesBtn ? salesBtn.getAttribute("aria-expanded") : null,
      hasSaleSubItems: subButtons.some((b) => /Create Sale|Sale Directory/i.test(b.innerText))
    };
  });
  assert.equal(afterSalesSecondClick.hasSaleSubItems, false, "Second click on Sales collapses sub-items");
  assert.equal(afterSalesSecondClick.salesAriaExpanded, "false", "Sales aria-expanded returns to 'false'");

  // 3. INDEPENDENT TOGGLE (Purchases):
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const purchasesBtn = navItems.find((b) => /Purchases/i.test(b.innerText));
    if (purchasesBtn) purchasesBtn.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  const afterPurchasesClick = await page.evaluate(() => {
    const subButtons = Array.from(document.querySelectorAll(".sub-nav-list button"));
    const subLabels = subButtons.map((b) => b.innerText.trim());
    return {
      subLabels
    };
  });
  assert.ok(afterPurchasesClick.subLabels.some((l) => l.includes("Create Purchase (Inward Counter)")), "Purchases sub-items appear on click");
  assert.ok(afterPurchasesClick.subLabels.some((l) => l.includes("Purchases Directory & History")), "Purchases sub-items appear on click");

  // 4. NAVIGATION VIA SUB-MENU ITEM & STAY OPEN DURING SESSION:
  // Re-open Sales
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const salesBtn = navItems.find((b) => /Sales/i.test(b.innerText));
    if (salesBtn) salesBtn.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  // Click sub-menu item: "Create Sale (POS Counter)"
  await page.evaluate(() => {
    const subButtons = Array.from(document.querySelectorAll(".sub-nav-list button"));
    const btn = subButtons.find((b) => b.innerText.includes("Create Sale (POS Counter)"));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  const onSalesPage = await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const salesBtn = navItems.find((b) => /Sales/i.test(b.innerText));
    const subButtons = Array.from(document.querySelectorAll(".sub-nav-list button"));
    const activeSubBtn = subButtons.find((b) => b.classList.contains("active"));
    const bc = document.querySelector(".page-breadcrumb-bar, .modern-row2-breadcrumb-bar, .breadcrumb-trail, .modern-breadcrumb-trail");

    return {
      hash: window.location.hash,
      salesAriaExpanded: salesBtn ? salesBtn.getAttribute("aria-expanded") : null,
      activeSubLabel: activeSubBtn ? activeSubBtn.innerText.trim() : null,
      breadcrumb: bc ? bc.innerText.replace(/\s+/g, " ").trim() : ""
    };
  });

  assert.match(onSalesPage.hash, /#sales_new/, "Navigated to sales_new");
  assert.equal(onSalesPage.salesAriaExpanded, "true", "Parent remains open after navigating to sub-page");
  assert.ok(onSalesPage.activeSubLabel && onSalesPage.activeSubLabel.includes("Create Sale (POS Counter)"), "Sub-item has active highlight");
  assert.match(onSalesPage.breadcrumb, /Sales.*(?:›|\/).*Create Sale \(POS Counter\)/, "Breadcrumb panel correct");

  // 5. REFRESH ON SUB-PAGE:
  // Refresh while on Create Sale: parent renders COLLAPSED, parent itself highlighted as active!
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".app-shell", { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 800));

  const onRefreshState = await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const salesBtn = navItems.find((b) => /Sales/i.test(b.innerText));
    const subButtons = Array.from(document.querySelectorAll(".sub-nav-list button"));
    const hasSaleSubItems = subButtons.some((b) => /Create Sale|Sale Directory/i.test(b.innerText));
    const bc = document.querySelector(".page-breadcrumb-bar, .modern-row2-breadcrumb-bar, .breadcrumb-trail, .modern-breadcrumb-trail");

    return {
      salesAriaExpanded: salesBtn ? salesBtn.getAttribute("aria-expanded") : null,
      salesIsActive: salesBtn ? salesBtn.classList.contains("active") : false,
      hasSaleSubItems,
      breadcrumb: bc ? bc.innerText.replace(/\s+/g, " ").trim() : ""
    };
  });

  assert.equal(onRefreshState.hasSaleSubItems, false, "On refresh, Sales parent renders COLLAPSED");
  assert.equal(onRefreshState.salesAriaExpanded, "false", "On refresh, Sales parent has aria-expanded='false'");
  assert.equal(onRefreshState.salesIsActive, true, "Sales parent itself carries ACTIVE highlight when collapsed on sub-page");
  assert.match(onRefreshState.breadcrumb, /Sales.*(?:›|\/).*Create Sale \(POS Counter\)/, "Breadcrumb panel intact");

  // 6. KEYBOARD ONLY TOGGLE:
  // Focus Sales button and press Enter
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const salesBtn = navItems.find((b) => /Sales/i.test(b.innerText));
    if (salesBtn) salesBtn.focus();
  });
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 300));

  const afterEnter = await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const salesBtn = navItems.find((b) => /Sales/i.test(b.innerText));
    return salesBtn ? salesBtn.getAttribute("aria-expanded") : null;
  });
  assert.equal(afterEnter, "true", "Pressing Enter toggles menu open");

  // Press Enter again to toggle closed
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 300));

  const afterEnterAgain = await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll(".nav-list button.nav-item"));
    const salesBtn = navItems.find((b) => /Sales/i.test(b.innerText));
    return salesBtn ? salesBtn.getAttribute("aria-expanded") : null;
  });
  assert.equal(afterEnterAgain, "false", "Pressing Enter again toggles menu closed");
});
