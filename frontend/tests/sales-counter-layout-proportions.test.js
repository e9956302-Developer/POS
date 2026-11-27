import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const salesPagePath = path.resolve(__dirname, "../src/pages/SalesPage.jsx");
const entryRowPath = path.resolve(__dirname, "../src/components/UniversalEntryRow.jsx");
const stylesPath = path.resolve(__dirname, "../src/styles.css");

test("Sale Counter: Payment panel narrowed and cart table columns proportioned with relative clamp units", () => {
  const stylesSource = fs.readFileSync(stylesPath, "utf8");
  const salesSource = fs.readFileSync(salesPagePath, "utf8");

  // 1. Payment panel width narrowed to clamp(16.5rem, 22%, 19rem)
  assert.match(
    stylesSource,
    /\.pos-checkout-sidebar\s*\{[^}]*width:\s*clamp\(16\.5rem,\s*22%,\s*19rem\)\s*!important/s,
    "pos-checkout-sidebar width must be clamp(16.5rem, 22%, 19rem)"
  );
  assert.match(
    stylesSource,
    /\.pos-checkout-sidebar\s*\{[^}]*flex:\s*0\s+0\s+clamp\(16\.5rem,\s*22%,\s*19rem\)\s*!important/s,
    "pos-checkout-sidebar flex must be 0 0 clamp(16.5rem, 22%, 19rem)"
  );

  // 2. Cart table colgroup column shares
  assert.match(
    salesSource,
    /<colgroup>\s*<col\s+style=\{\{\s*width:\s*"auto"\s*\}\}\s*\/>\s*<col\s+style=\{\{\s*width:\s*"clamp\(5rem,\s*8%,\s*6rem\)"\s*\}\}\s*\/>\s*<col\s+style=\{\{\s*width:\s*"clamp\(6\.5rem,\s*11%,\s*8rem\)"\s*\}\}\s*\/>\s*<col\s+style=\{\{\s*width:\s*"clamp\(6\.5rem,\s*11%,\s*8rem\)"\s*\}\}\s*\/>\s*<col\s+style=\{\{\s*width:\s*"clamp\(2\.25rem,\s*3\.5%,\s*2\.75rem\)"\s*\}\}\s*\/>/s,
    "Cart table must specify colgroup with relative clamp widths for all 5 columns"
  );

  // 3. Inputs fill cell completely (width: 100%, boxSizing: border-box)
  assert.match(
    salesSource,
    /width:\s*"100%",\s*boxSizing:\s*"border-box",\s*height:\s*"26px",\s*textAlign:\s*"center"/s,
    "Cart quantity input must fill cell completely with width 100% and boxSizing border-box"
  );
  assert.match(
    salesSource,
    /width:\s*"100%",\s*boxSizing:\s*"border-box",\s*height:\s*"26px",\s*textAlign:\s*"right"/s,
    "Cart unit price input must fill cell completely with width 100% and boxSizing border-box"
  );
});

test("Sale Counter: Entry row relative proportions and increased quantity width", () => {
  const entryRowSource = fs.readFileSync(entryRowPath, "utf8");

  // 1. Universal scan field share ~30% (flex: 3 1 12rem, minWidth: 12rem)
  assert.match(
    entryRowSource,
    /mode === "sale"\s*\?\s*\{\s*flex:\s*"3 1 12rem",\s*minWidth:\s*"12rem",\s*position:\s*"relative"\s*\}/s,
    "Universal scan field in sale mode must have flex 3 1 12rem and minWidth 12rem"
  );

  // 2. Product / phone model search field widest ~45-50% (flex: 5 1 16rem, minWidth: 16rem)
  assert.match(
    entryRowSource,
    /mode === "sale"\s*\?\s*\{\s*flex:\s*"5 1 16rem",\s*minWidth:\s*"16rem",\s*position:\s*"relative"\s*\}/s,
    "Product search field in sale mode must have flex 5 1 16rem and minWidth 16rem"
  );

  // 3. Quantity field clamp(5.5rem, 8%, 7rem)
  assert.match(
    entryRowSource,
    /mode === "sale"\s*\?\s*\{\s*width:\s*"clamp\(5\.5rem,\s*8%,\s*7rem\)",\s*flex:\s*"0 0 clamp\(5\.5rem,\s*8%,\s*7rem\)"/s,
    "Quantity field in sale mode must have clamp(5.5rem, 8%, 7rem) width"
  );
});

test("Sale Counter: Customer info row removed stock indicators and expanded customer field", () => {
  const salesSource = fs.readFileSync(salesPagePath, "utf8");

  // 1. Stock indicators (handset count and product count icons and numbers) removed from info row
  assert.doesNotMatch(
    salesSource,
    /📱\{branchUnits\.length\}/,
    "Handset count indicator must be removed from customer details row"
  );
  assert.doesNotMatch(
    salesSource,
    /📦\{availableProducts\.length\}/,
    "Product count indicator must be removed from customer details row"
  );
  assert.doesNotMatch(
    salesSource,
    /title="Reload branch stock"/,
    "Reload branch stock button must be removed from customer details row"
  );

  // 2. Customer field flex expanded to take freed space
  assert.match(
    salesSource,
    /flex:\s*"3\.2 1 260px"/,
    "Customer field flex must expand to flex 3.2 1 260px"
  );
});
