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
  throw new Error("No Chrome or Edge browser executable found on system");
}

const VIEWPORTS = {
  mobileSmall: { width: 375, height: 667, name: "Mobile Small (375x667)" },
  mobileModern: { width: 390, height: 844, name: "Mobile Modern (390x844)" },
  tablet: { width: 768, height: 1024, name: "Tablet (768x1024)" },
  desktop: { width: 1280, height: 800, name: "Desktop (1280x800)" }
};

let devServerAvailable = false;
let browser;
let page;
const APP_URL = "http://localhost:5173/#login";
const LANDING_URL = "http://localhost:5173";

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
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });
  page = await browser.newPage();
});

after(async () => {
  if (browser) {
    await browser.close();
  }
});

// Helper: Assert no horizontal overflow across whole document and all visible elements
async function assertNoHorizontalOverflow(pageInstance, label, maxAllowedDelta = 2) {
  const result = await pageInstance.evaluate((maxDelta) => {
    const winWidth = window.innerWidth;
    const docWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;

    const overflows = [];
    if (docWidth > winWidth + maxDelta) {
      overflows.push(`Document scrollWidth (${docWidth}px) > window.innerWidth (${winWidth}px)`);
    }
    if (bodyWidth > winWidth + maxDelta) {
      overflows.push(`Body scrollWidth (${bodyWidth}px) > window.innerWidth (${winWidth}px)`);
    }

    // Check all visible elements except containers with explicit overflow scroll/auto/hidden
    const all = document.querySelectorAll("*");
    for (const el of all) {
      if (["SCRIPT", "STYLE", "HEAD", "META", "LINK", "NOSCRIPT"].includes(el.tagName)) continue;
      const cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;

      // If an element is nested inside an overflow-x scroll container (e.g., table-wrap), it's permitted to scroll horizontally internally
      let parent = el.parentElement;
      let hasScrollContainer = false;
      while (parent && parent !== document.body && parent !== document.documentElement) {
        const ps = window.getComputedStyle(parent);
        if (["auto", "scroll", "hidden"].includes(ps.overflowX)) {
          hasScrollContainer = true;
          break;
        }
        parent = parent.parentElement;
      }

      if (hasScrollContainer) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (rect.right > winWidth + maxDelta) {
          const id = el.id ? `#${el.id}` : "";
          const cls = el.className && typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).join(".")}` : "";
          overflows.push(`Element <${el.tagName.toLowerCase()}${id}${cls}> rect.right (${Math.round(rect.right)}px) > window.innerWidth (${winWidth}px)`);
        }
      }
    }

    return {
      winWidth,
      docWidth,
      bodyWidth,
      hasOverflow: overflows.length > 0,
      culprits: overflows.slice(0, 5)
    };
  }, maxAllowedDelta);

  assert.equal(
    result.hasOverflow,
    false,
    `[${label}] Screen width overflow detected at ${result.winWidth}px width: ${result.culprits.join("; ")}`
  );
}

// Helper: Programmatic login using React native prototype setter
async function loginUser(email, password) {
  await page.setViewport(VIEWPORTS.desktop);
  await page.goto(APP_URL, { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto(APP_URL, { waitUntil: "networkidle0" });

  await page.evaluate((e, p) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    const inputs = document.querySelectorAll("input");
    if (inputs[0]) {
      nativeSetter.call(inputs[0], e);
      inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (inputs[1]) {
      nativeSetter.call(inputs[1], p);
      inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    }
    const btn = document.querySelector("button.primary-btn");
    if (btn) btn.click();
  }, email, password);

  await new Promise((r) => setTimeout(r, 1400));
}

// Helper: Open a tab from sidebar, top nav, or mobile topbar
async function navigateToTab(tabNamePattern) {
  await page.evaluate((pattern) => {
    const regex = new RegExp(pattern, "i");

    // If mobile menu toggle is visible, open mobile menu
    const menuToggle = document.querySelector(".menu-toggle-btn");
    const sidebar = document.querySelector(".sidebar");
    if (menuToggle && sidebar && !sidebar.classList.contains("mobile-open")) {
      const cs = window.getComputedStyle(menuToggle);
      if (cs.display !== "none") {
        menuToggle.click();
      }
    }

    const items = Array.from(document.querySelectorAll(".nav-item, .top-menu-item"));
    const match = items.find((el) => regex.test(el.innerText || ""));
    if (match) {
      match.click();
      return true;
    }
    return false;
  }, tabNamePattern);

  await new Promise((r) => setTimeout(r, 800));
}

// =========================================================================
// TEST SUITE: RESPONSIVE UI & OVERLAY FORMS TESTING
// =========================================================================

test("0. Application Landing Page is 100% responsive across mobile, tablet, and desktop viewports", async (t) => {
  if (!devServerAvailable) {
    t.skip("Vite dev server is not running on http://localhost:5173");
    return;
  }
  for (const vp of Object.values(VIEWPORTS)) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(LANDING_URL, { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());
    await page.goto(LANDING_URL, { waitUntil: "networkidle0" });

    await assertNoHorizontalOverflow(page, `Landing Page @ ${vp.name}`);

    const landingState = await page.evaluate(() => {
      const hero = document.querySelector(".landing-hero");
      const title = document.querySelector(".hero-title");
      const terminal = document.querySelector(".pos-simulator-container");
      return {
        heroExists: Boolean(hero),
        titleExists: Boolean(title),
        terminalExists: Boolean(terminal)
      };
    });
    assert.ok(landingState.heroExists, "Hero section exists on Landing Page");
    assert.ok(landingState.titleExists, "Hero title exists on Landing Page");
    assert.ok(landingState.terminalExists, "Live POS Terminal simulator exists on Landing Page");
  }
});

test("1. Login Screen is 100% responsive across mobile, tablet, and desktop viewports", async (t) => {
  if (!devServerAvailable) {
    t.skip("Vite dev server is not running on http://localhost:5173");
    return;
  }
  for (const vp of Object.values(VIEWPORTS)) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(APP_URL, { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());
    await page.goto(APP_URL, { waitUntil: "networkidle0" });

    await assertNoHorizontalOverflow(page, `Login Page @ ${vp.name}`);

    // Verify form card elements fit within screen
    const cardRect = await page.evaluate(() => {
      const card = document.querySelector(".login-card");
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return { width: r.width, right: r.right, winWidth: window.innerWidth };
    });
    assert.ok(cardRect, "Login card exists");
    assert.ok(cardRect.right <= cardRect.winWidth + 2, "Login card is within viewport");
  }
});

test("2. Standard Store User pages and search toolbars fit within viewport width with zero overflow", async (t) => {
  if (!devServerAvailable) {
    t.skip("Vite dev server is not running on http://localhost:5173");
    return;
  }
  await loginUser("admin@mobilepos.local", "admin123");

  const standardPages = [
    { label: "Dashboard", pattern: "Dashboard" },
    { label: "Purchases", pattern: "Purchases" },
    { label: "Sales", pattern: "Sales" },
    { label: "Cash Register", pattern: "Cash Register" },
    { label: "Inventory", pattern: "Inventory" },
    { label: "Parties", pattern: "Parties" },
    { label: "Expenses", pattern: "Expenses" },
    { label: "Invoices", pattern: "Invoices" },
    { label: "Admin", pattern: "Admin" }
  ];

  for (const pageItem of standardPages) {
    await navigateToTab(pageItem.pattern);

    // Test on Mobile Small (375px)
    await page.setViewport(VIEWPORTS.mobileSmall);
    await assertNoHorizontalOverflow(page, `${pageItem.label} Page @ Mobile Small 375px`);

    // Test on Mobile Modern (390px)
    await page.setViewport(VIEWPORTS.mobileModern);
    await assertNoHorizontalOverflow(page, `${pageItem.label} Page @ Mobile Modern 390px`);

    // Test on Tablet (768px)
    await page.setViewport(VIEWPORTS.tablet);
    await assertNoHorizontalOverflow(page, `${pageItem.label} Page @ Tablet 768px`);

    // Test on Desktop (1280px)
    await page.setViewport(VIEWPORTS.desktop);
    await assertNoHorizontalOverflow(page, `${pageItem.label} Page @ Desktop 1280px`);
  }
});

test("3. Theme selection is linked to packages: Starter user has locked theme indicator without UI overflow", async (t) => {
  if (!devServerAvailable) {
    t.skip("Vite dev server is not running on http://localhost:5173");
    return;
  }
  await loginUser("admin@mobilepos.local", "admin123");
  await page.setViewport(VIEWPORTS.mobileSmall);

  // Check mobile topbar theme button shows locked state
  const mobileThemeStatus = await page.evaluate(() => {
    const btn = document.querySelector(".mobile-topbar .ghost-btn");
    return {
      text: btn ? btn.innerText.trim() : "",
      title: btn ? btn.title : ""
    };
  });

  assert.match(mobileThemeStatus.text, /🔒/, "Mobile topbar reflects locked theme for starter package user");

  // Check sidebar theme switcher reflects locked state
  const sidebarThemeStatus = await page.evaluate(() => {
    const lockedBox = document.querySelector(".theme-switcher.locked");
    return Boolean(lockedBox);
  });

  assert.equal(sidebarThemeStatus, true, "Sidebar shows locked theme indicator for user without theme_selection");

  // Verify clicking locked button does not cause horizontal overflow
  await page.click(".mobile-topbar .ghost-btn");
  await new Promise((r) => setTimeout(r, 400));
  await assertNoHorizontalOverflow(page, "Theme locked alert @ Mobile 375px");
});

test("4. Top Admin pages are 100% responsive across viewports", async (t) => {
  if (!devServerAvailable) {
    t.skip("Vite dev server is not running on http://localhost:5173");
    return;
  }
  await loginUser("topadmin@mobilepos.local", "admin123");

  const topPages = [
    { label: "Top Dashboard", pattern: "Overview" },
    { label: "Businesses & Branches", pattern: "Businesses & Branches" },
    { label: "Subscription Packages", pattern: "Subscription Packages" },
    { label: "Package Feature Access", pattern: "Package Feature Access" },
    { label: "Pending Payments", pattern: "Pending Payments" },
    { label: "Company Administrators", pattern: "Company Administrators" },
    { label: "Deleted Transactions", pattern: "Deleted Transactions" }
  ];

  for (const pageItem of topPages) {
    await navigateToTab(pageItem.pattern);

    // Mobile 375px
    await page.setViewport(VIEWPORTS.mobileSmall);
    await assertNoHorizontalOverflow(page, `${pageItem.label} @ Mobile Small 375px`);

    // Desktop 1280px
    await page.setViewport(VIEWPORTS.desktop);
    await assertNoHorizontalOverflow(page, `${pageItem.label} @ Desktop 1280px`);
  }
});

test("5. Store Branch Subscription Assignments: Packages and status dropdowns are on same line with adjusted compact status width", async (t) => {
  if (!devServerAvailable) {
    t.skip("Vite dev server is not running on http://localhost:5173");
    return;
  }
  await loginUser("topadmin@mobilepos.local", "admin123");
  await navigateToTab("Subscription Packages");

  // Switch to View 3: Branch Subscriptions via toggle tab button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".toggle-tab-btn, button"));
    const branchTab = btns.find((el) => /Branch Subscriptions/i.test(el.innerText));
    if (branchTab) branchTab.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // Test across Desktop and Mobile
  for (const vp of [VIEWPORTS.desktop, VIEWPORTS.mobileSmall]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await assertNoHorizontalOverflow(page, `Branch Subscriptions View @ ${vp.name}`);

    const layout = await page.evaluate(() => {
      const planSelect = document.querySelector(".branch-plan-filter");
      const statusSelect = document.querySelector(".branch-status-filter");
      const container = document.querySelector(".branch-filter-controls");

      if (!planSelect || !statusSelect || !container) {
        return { found: false };
      }

      const planRect = planSelect.getBoundingClientRect();
      const statusRect = statusSelect.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      return {
        found: true,
        // On same line: vertical tops are closely aligned
        sameLine: Math.abs(planRect.top - statusRect.top) <= 6,
        planWidth: Math.round(planRect.width),
        statusWidth: Math.round(statusSelect.getBoundingClientRect().width),
        containerWidth: Math.round(containerRect.width),
        winWidth: window.innerWidth
      };
    });

    assert.equal(layout.found, true, `Filter controls found in Store Branch Subscription Assignments at ${vp.name}`);
    assert.equal(layout.sameLine, true, `Packages and status dropdowns are on the same line at ${vp.name}`);
    assert.ok(
      layout.statusWidth < layout.planWidth || layout.statusWidth <= 150,
      `Status dropdown width (${layout.statusWidth}px) is appropriately compact compared to package width (${layout.planWidth}px) at ${vp.name}`
    );
  }
});

test("6. Overlay Forms and Modals fit strictly within screen width with zero breakout across mobile and desktop", async (t) => {
  if (!devServerAvailable) {
    t.skip("Vite dev server is not running on http://localhost:5173");
    return;
  }
  await loginUser("topadmin@mobilepos.local", "admin123");
  await navigateToTab("Subscription Packages");

  // Ensure we are in View 1 (Subscription Packages)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".toggle-tab-btn, button"));
    const pkgTab = btns.find((el) => /Subscription Packages/i.test(el.innerText));
    if (pkgTab) pkgTab.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // A. Plan Comparison Matrix Modal on Mobile Small (375px)
  await page.setViewport(VIEWPORTS.mobileSmall);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const matrixBtn = btns.find((b) => b.innerText.includes("Compare Plans Matrix") || b.innerText.includes("Comparison Matrix"));
    if (matrixBtn) matrixBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Assert modal fits on 375px mobile screen
  await assertNoHorizontalOverflow(page, "Comparison Matrix Modal @ Mobile 375px");

  // Close matrix modal
  await page.evaluate(() => {
    const close = document.querySelector(".modal-header .close-btn, .modal-footer button");
    if (close) close.click();
  });
  await new Promise((r) => setTimeout(r, 400));

  // B. Create Package Modal on Mobile Small (375px)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const createBtn = btns.find((b) => b.innerText.includes("Create Package"));
    if (createBtn) createBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  await assertNoHorizontalOverflow(page, "Create Package Modal @ Mobile 375px");

  // Verify inputs and checkboxes do not overflow dialog width
  const dialogLayout = await page.evaluate(() => {
    const dialog = document.querySelector(".modal-dialog");
    if (!dialog) return null;
    const r = dialog.getBoundingClientRect();
    return { width: r.width, right: r.right, winWidth: window.innerWidth };
  });
  assert.ok(dialogLayout, "Create Package dialog exists");
  assert.ok(dialogLayout.right <= dialogLayout.winWidth + 2, "Modal dialog fits within 375px mobile viewport");

  // Close create modal
  await page.evaluate(() => {
    const close = document.querySelector(".modal-header .close-btn, .modal-footer .secondary-btn");
    if (close) close.click();
  });
  await new Promise((r) => setTimeout(r, 400));
});

test("7. Package Feature Access includes Theme Customization module card and responsive floating save bar", async (t) => {
  if (!devServerAvailable) {
    t.skip("Vite dev server is not running on http://localhost:5173");
    return;
  }
  await loginUser("topadmin@mobilepos.local", "admin123");
  await navigateToTab("Package Feature Access");

  for (const vp of [VIEWPORTS.mobileSmall, VIEWPORTS.desktop]) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await assertNoHorizontalOverflow(page, `Package Feature Access @ ${vp.name}`);

    // Verify Theme Customization module card exists
    const themeModuleCard = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes("Theme Customization & Colors") || text.includes("Appearance & Branding");
    });

    assert.equal(themeModuleCard, true, `Theme Customization module exists under Package Feature Access at ${vp.name}`);

    // Verify floating action bar does not overflow on mobile
    const barLayout = await page.evaluate(() => {
      const bar = document.querySelector(".floating-action-bar");
      if (!bar) return { found: false };
      const r = bar.getBoundingClientRect();
      return {
        found: true,
        width: r.width,
        right: r.right,
        winWidth: window.innerWidth,
        fits: r.right <= window.innerWidth + 2 && r.left >= -2
      };
    });

    if (barLayout.found) {
      assert.equal(barLayout.fits, true, `Floating action bar fits within viewport at ${vp.name}`);
    }
  }
});
