import test from "node:test";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const URL = "http://localhost:5173";

test("Theme Toggle Switch Acceptance Suite", async (t) => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await t.test("1. Initial load (Auto mode, no flash, AUTO badge visible, no 3-state control)", async () => {
    await page.goto(URL, { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle0" });

    const state = await page.evaluate(() => {
      const btn = document.querySelector(".theme-toggle-switch");
      const autoBadge = document.querySelector(".theme-auto-badge");
      const segmented = document.querySelector(".theme-toggle-segmented");
      const mobileRow = document.querySelector(".mobile-theme-row");
      const sun = btn?.querySelector(".theme-icon-sun");
      const moon = btn?.querySelector(".theme-icon-moon");
      return {
        exists: Boolean(btn),
        role: btn?.getAttribute("role"),
        ariaChecked: btn?.getAttribute("aria-checked"),
        ariaLabel: btn?.getAttribute("aria-label"),
        title: btn?.getAttribute("title"),
        className: btn?.className,
        hasSun: Boolean(sun),
        hasMoon: Boolean(moon),
        autoBadgeVisible: Boolean(autoBadge && autoBadge.offsetParent !== null),
        autoBadgeText: autoBadge?.innerText,
        segmentedExists: Boolean(segmented),
        mobileRowExists: Boolean(mobileRow),
        htmlTheme: document.documentElement.getAttribute("data-theme")
      };
    });

    assert.equal(state.exists, true, "Toggle switch exists in header");
    assert.equal(state.role, "switch", "role='switch' is present");
    assert.equal(state.ariaLabel, "Switch day/night theme", "aria-label is 'Switch day/night theme'");
    assert.equal(state.segmentedExists, false, "3-state segmented control is completely removed");
    assert.equal(state.mobileRowExists, false, "Mobile theme row is completely removed");
    assert.equal(state.hasSun, true, "Sun icon exists inside knob");
    assert.equal(state.hasMoon, true, "Moon icon exists inside knob");
    assert.equal(state.autoBadgeVisible, true, "AUTO badge is visible on initial auto load");
    assert.equal(state.autoBadgeText, "AUTO", "AUTO badge displays 'AUTO'");

    if (state.htmlTheme === "day") {
      assert.equal(state.ariaChecked, "false", "Day theme has aria-checked='false'");
      assert.match(state.className, /is-day/, "Switch has is-day class");
      assert.equal(state.title, "Day mode — tap for Night");
    } else {
      assert.equal(state.ariaChecked, "true", "Night theme has aria-checked='true'");
      assert.match(state.className, /is-night/, "Switch has is-night class");
      assert.equal(state.title, "Night mode — tap for Day");
    }
  });

  await t.test("2. Manual click flips theme, hides AUTO caption, and saves choice in localStorage", async () => {
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await page.click(".theme-toggle-switch");
    await new Promise((r) => setTimeout(r, 350));

    const toggled = await page.evaluate(() => {
      const btn = document.querySelector(".theme-toggle-switch");
      const autoBadge = document.querySelector(".theme-auto-badge");
      return {
        htmlTheme: document.documentElement.getAttribute("data-theme"),
        ariaChecked: btn?.getAttribute("aria-checked"),
        title: btn?.getAttribute("title"),
        autoVisible: Boolean(autoBadge && autoBadge.offsetParent !== null),
        savedChoice: localStorage.getItem("dm360-theme-mode")
      };
    });

    assert.notEqual(toggled.htmlTheme, initialTheme, "Theme flipped to opposite");
    assert.equal(toggled.autoVisible, false, "AUTO badge is hidden after manual click");
    assert.equal(toggled.savedChoice, toggled.htmlTheme, "Saved choice in localStorage is 'day' or 'night'");
    assert.equal(toggled.ariaChecked, toggled.htmlTheme === "night" ? "true" : "false");
  });

  await t.test("3. Choice survives page reload, starts in that position, no AUTO caption", async () => {
    const savedBefore = await page.evaluate(() => localStorage.getItem("dm360-theme-mode"));
    await page.reload({ waitUntil: "networkidle0" });

    const reloaded = await page.evaluate(() => {
      const btn = document.querySelector(".theme-toggle-switch");
      const autoBadge = document.querySelector(".theme-auto-badge");
      return {
        htmlTheme: document.documentElement.getAttribute("data-theme"),
        autoVisible: Boolean(autoBadge && autoBadge.offsetParent !== null),
        ariaChecked: btn?.getAttribute("aria-checked"),
        savedChoice: localStorage.getItem("dm360-theme-mode")
      };
    });

    assert.equal(reloaded.htmlTheme, savedBefore, "Theme survived reload");
    assert.equal(reloaded.autoVisible, false, "AUTO caption remains hidden when manual choice exists");
    assert.equal(reloaded.ariaChecked, savedBefore === "night" ? "true" : "false");
  });

  await t.test("4. Keyboard accessibility: Space and Enter keys flip theme", async () => {
    const beforeTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));

    // Focus switch
    await page.focus(".theme-toggle-switch");
    await page.keyboard.press("Space");
    await new Promise((r) => setTimeout(r, 350));

    const afterSpace = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    assert.notEqual(afterSpace, beforeTheme, "Space key flipped theme");

    await page.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 350));

    const afterEnter = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    assert.equal(afterEnter, beforeTheme, "Enter key flipped theme back");
  });

  await t.test("5. Mobile responsiveness (375x667): Switch stays in header, before Login, no overflow", async () => {
    await page.setViewport({ width: 375, height: 667 });
    await page.goto(URL, { waitUntil: "networkidle0" });

    const mobileLayout = await page.evaluate(() => {
      const sw = document.querySelector(".theme-toggle-switch");
      const login = document.querySelector(".landing-btn-login");
      const menuBtn = document.querySelector(".landing-mobile-menu-btn");
      const swRect = sw?.getBoundingClientRect();
      const loginRect = login?.getBoundingClientRect();
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      return {
        switchVisible: Boolean(sw && swRect && swRect.width > 0 && swRect.height > 0),
        loginVisible: Boolean(login && loginRect && loginRect.width > 0 && loginRect.height > 0),
        menuBtnVisible: Boolean(menuBtn && menuBtn.offsetParent !== null),
        switchBeforeLogin: swRect?.left < loginRect?.left,
        noHorizontalOverflow: scrollWidth <= clientWidth
      };
    });

    assert.equal(mobileLayout.switchVisible, true, "Switch is visible in mobile header");
    assert.equal(mobileLayout.loginVisible, true, "Login button is visible in mobile header");
    assert.equal(mobileLayout.menuBtnVisible, true, "Menu button is visible in mobile header");
    assert.equal(mobileLayout.switchBeforeLogin, true, "Switch is located before Login button in mobile header");
    assert.equal(mobileLayout.noHorizontalOverflow, true, "Zero horizontal overflow on mobile viewport");
  });

  await t.test("6. Auto timezone boundary transition keeps AUTO caption visible and animates switch", async () => {
    // Clear localStorage to return to Auto mode
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle0" });

    // Verify initial auto state
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));

    // Simulate crossing the time boundary (e.g. from Day to Night) by mocking Date.prototype.getHours
    const oppositeTheme = initialTheme === "day" ? "night" : "day";
    const targetHour = oppositeTheme === "night" ? 21 : 10;

    await page.evaluate((hour) => {
      Date.prototype.getHours = function() { return hour; };
      // Also mock Intl.DateTimeFormat
      const origDTF = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(...args) {
        return {
          resolvedOptions: () => ({ timeZone: "UTC" }),
          format: () => String(hour)
        };
      };
      // Dispatch visibilitychange to trigger immediate re-check
      window.dispatchEvent(new Event("focus"));
    }, targetHour);

    await new Promise((r) => setTimeout(r, 400));

    const boundaryState = await page.evaluate(() => {
      const btn = document.querySelector(".theme-toggle-switch");
      const autoBadge = document.querySelector(".theme-auto-badge");
      return {
        htmlTheme: document.documentElement.getAttribute("data-theme"),
        autoVisible: Boolean(autoBadge && autoBadge.offsetParent !== null),
        ariaChecked: btn?.getAttribute("aria-checked"),
        hasOppositeClass: btn?.classList.contains(document.documentElement.getAttribute("data-theme") === "night" ? "is-night" : "is-day")
      };
    });

    assert.equal(boundaryState.htmlTheme, oppositeTheme, "Theme flipped when day/night boundary passed");
    assert.equal(boundaryState.autoVisible, true, "AUTO caption remains visible when flipping in Auto mode");
    assert.equal(boundaryState.hasOppositeClass, true, "Switch knob and track updated to matching position");
  });

  await browser.close();
  assert.equal(errors.length, 0, `Page had zero console errors: ${errors.join(", ")}`);
});
