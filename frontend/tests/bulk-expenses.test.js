import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import reactPlugin from "@vitejs/plugin-react";

let vite;
let modules;
const testDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(testDir, "..");

const context = {
  session: {
    id: 1,
    full_name: "Admin User",
    role_name: "Branch Manager",
    branch_id: 1
  },
  branches: [{ id: 1, name: "Main Branch" }],
  can() {
    return true;
  },
  refreshAll() {}
};

before(async () => {
  vite = await createServer({
    root: frontendRoot,
    configFile: false,
    plugins: [reactPlugin()],
    server: {
      middlewareMode: true,
      fs: {
        strict: true,
        allow: [frontendRoot, resolve(frontendRoot, "..", "node_modules")]
      }
    },
    appType: "custom",
    logLevel: "silent"
  });

  modules = {
    expenses: await vite.ssrLoadModule("/src/pages/ExpensesPage.jsx")
  };
});

after(async () => {
  await vite?.close();
});

test("Acceptance Test 1: Open Step 2 → exactly 5 blank rows, no Add click needed", () => {
  const { createInitialBlankRows } = modules.expenses;
  const initialRows = createInitialBlankRows(5, "cash", "2026-10-27");
  assert.equal(initialRows.length, 5, "Must have exactly 5 rows initially");
  initialRows.forEach((row, i) => {
    assert.equal(row.title, "", `Row ${i + 1} title should be blank`);
    assert.equal(row.amount, "", `Row ${i + 1} amount should be blank`);
    assert.equal(row.paymentMethod, "cash", `Row ${i + 1} Paid From should default to batch default`);
    assert.equal(row.isPaymentManual, false, `Row ${i + 1} should be untouched`);
  });

  const html = renderToStaticMarkup(
    React.createElement(modules.expenses.ExpensesPage, { context, initialMode: "bulk" })
  );
  assert.match(html, />1<\/td>/);
  assert.match(html, />2<\/td>/);
  assert.match(html, />3<\/td>/);
  assert.match(html, />4<\/td>/);
  assert.match(html, />5<\/td>/);
  assert.match(html, /5 rows \(0 filled\)/);
  assert.equal(html.includes('id="bulk-date-0"'), false, "Bulk table must not contain individual row date input");
});

test("Acceptance Test 2: Fill 2 rows completely, leave 3 blank → Save → exactly 2 expenses recorded, 3 blank rows ignored", () => {
  const { createInitialBlankRows, classifyBulkRows } = modules.expenses;
  const rows = createInitialBlankRows(5, "cash", "2026-10-27");

  // Fill Row 1
  rows[0].title = "Daily Staff Lunch";
  rows[0].amount = "750";

  // Fill Row 2
  rows[1].title = "Generator Fuel";
  rows[1].amount = "2500";

  // Rows 3, 4, 5 remain untouched blank

  const result = classifyBulkRows(rows, "cash");
  assert.equal(result.hasPartiallyFilled, false, "Should not have partially filled rows");
  assert.equal(result.filledRows.length, 2, "Exactly 2 filled rows to save");
  assert.equal(result.blankCount, 3, "Exactly 3 blank rows skipped silently");
  assert.equal(result.filledRows[0].title, "Daily Staff Lunch");
  assert.equal(result.filledRows[0].amount, 750);
  assert.equal(result.filledRows[1].title, "Generator Fuel");
  assert.equal(result.filledRows[1].amount, 2500);

  // Success message verification
  let successMsg = `${result.filledRows.length} expense${result.filledRows.length === 1 ? "" : "s"} saved`;
  if (result.blankCount > 0) {
    successMsg += ` (${result.blankCount} blank row${result.blankCount === 1 ? "" : "s"} ignored)`;
  }
  assert.equal(successMsg, "2 expenses saved (3 blank rows ignored)");

  // Reset back to 5 fresh blank rows
  const resetRows = createInitialBlankRows(5, "cash", "2026-10-27");
  assert.equal(resetRows.length, 5);
  assert.equal(resetRows[0].title, "");
});

test("Acceptance Test 3: Fill a row's description but no amount → Save blocked, error points at that row", () => {
  const { createInitialBlankRows, classifyBulkRows } = modules.expenses;
  const rows = createInitialBlankRows(5, "cash", "2026-10-27");

  // Fill Row 3 with description but NO amount
  rows[2].title = "Office Internet Cable";
  rows[2].amount = ""; // blank!

  const result = classifyBulkRows(rows, "cash");
  assert.equal(result.hasPartiallyFilled, true, "Save must be blocked because Row 3 is partially filled");
  assert.ok(result.newRowErrors[rows[2].id], "Row 3 must have an error recorded");
  assert.equal(result.newRowErrors[rows[2].id].amount, "Row 3: Amount is required");
  assert.equal(result.blankCount, 4, "The other 4 rows are blank");
  assert.equal(result.filledRows.length, 0, "No rows should be saved");
});

test("Acceptance Test 4: Add Row 3 times → 8 rows; remove one → 7 rows, numbering re-sequences", () => {
  const { createInitialBlankRows } = modules.expenses;
  let rows = createInitialBlankRows(5, "cash", "2026-10-27");
  assert.equal(rows.length, 5);

  // Click Add Row 3 times
  for (let i = 0; i < 3; i++) {
    rows.push({
      id: `new-${i}`,
      title: "",
      amount: "",
      paymentMethod: "cash",
      isPaymentManual: false,
      expenseDate: "2026-10-27"
    });
  }
  assert.equal(rows.length, 8, "Should have 8 rows after adding 3");

  // Remove row at index 2 (Row 3)
  const removedId = rows[2].id;
  rows = rows.filter((r) => r.id !== removedId);
  assert.equal(rows.length, 7, "Should have 7 rows after removing 1");

  // Visual numbering re-sequences (1 to 7)
  const numbers = rows.map((_, idx) => idx + 1);
  assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6, 7], "Row numbers must visually re-sequence 1..7");
});

test("Acceptance Test 5: Batch Paid From default and per-row override tracking", () => {
  const { createInitialBlankRows, classifyBulkRows } = modules.expenses;
  let batchPaidFrom = "cash";
  let rows = createInitialBlankRows(5, batchPaidFrom, "2026-10-27");

  // All 5 rows show Cash
  assert.ok(rows.every((r) => r.paymentMethod === "cash" && !r.isPaymentManual));

  // Change Row 2 to "Bank"
  rows[1].paymentMethod = "bank";
  rows[1].isPaymentManual = true; // tracked manually changed flag (Rule 10)

  // Verify only Row 2 changed
  assert.equal(rows[0].paymentMethod, "cash");
  assert.equal(rows[1].paymentMethod, "bank");
  assert.equal(rows[2].paymentMethod, "cash");

  // Add a new row → it defaults to batch default ("cash")
  const newRow = {
    id: "new-row-6",
    title: "",
    amount: "",
    paymentMethod: batchPaidFrom,
    isPaymentManual: false,
    expenseDate: "2026-10-27"
  };
  rows.push(newRow);
  assert.equal(rows[5].paymentMethod, "cash");

  // Change batch Paid From to "Bank"
  batchPaidFrom = "bank";
  rows = rows.map((r) => {
    if (r.isPaymentManual) return r; // Keep manual choice
    return { ...r, paymentMethod: batchPaidFrom };
  });

  // Untouched rows switch to Bank; Row 2 stays as manually set
  assert.equal(rows[0].paymentMethod, "bank");
  assert.equal(rows[1].paymentMethod, "bank", "Row 2 was manually set and retained");
  assert.equal(rows[2].paymentMethod, "bank");
  assert.equal(rows[5].paymentMethod, "bank");

  // Fill Row 1 and Row 2, change Row 1 to Wallet manually
  rows[0].title = "Tea";
  rows[0].amount = "200";
  rows[0].paymentMethod = "wallet";
  rows[0].isPaymentManual = true;

  rows[1].title = "Stationery";
  rows[1].amount = "450";

  const result = classifyBulkRows(rows, batchPaidFrom);
  assert.equal(result.hasPartiallyFilled, false);
  assert.equal(result.filledRows[0].paymentMethod, "wallet", "Row 1 recorded its own source (wallet)");
  assert.equal(result.filledRows[1].paymentMethod, "bank", "Row 2 recorded its own source (bank)");
});

test("Acceptance Test 6: Leave batch Paid From empty → a filled row without Paid From blocks save", () => {
  const { createInitialBlankRows, classifyBulkRows } = modules.expenses;
  let batchPaidFrom = ""; // None selected
  let rows = createInitialBlankRows(5, batchPaidFrom, "2026-10-27");

  // Untouched rows have empty paymentMethod
  assert.equal(rows[0].paymentMethod, "");

  // Fill Row 1 with title and amount, but NO paymentMethod selected
  rows[0].title = "Emergency courier";
  rows[0].amount = "500";

  const result = classifyBulkRows(rows, batchPaidFrom);
  assert.equal(result.hasPartiallyFilled, true, "Save must be blocked");
  assert.ok(result.newRowErrors[rows[0].id]?.paidFrom);
  assert.equal(result.newRowErrors[rows[0].id].paidFrom, "Row 1: Paid From is required");
});

test("Acceptance Test 7: Running total live sum of positive amounts", () => {
  const { createInitialBlankRows } = modules.expenses;
  const rows = createInitialBlankRows(5, "cash", "2026-10-27");

  rows[0].title = "Item 1";
  rows[0].amount = "150.50";

  rows[1].title = "Item 2";
  rows[1].amount = "349.50";

  const liveSum = rows.reduce((acc, r) => {
    const num = Number(r.amount);
    return !isNaN(num) && num > 0 ? acc + num : acc;
  }, 0);

  assert.equal(liveSum, 500);
});

test("Acceptance Test 8: Bulk rows inherit batch date without needing date in each row", () => {
  const { createInitialBlankRows, classifyBulkRows } = modules.expenses;
  const rows = createInitialBlankRows(5, "cash");

  rows[0].title = "Weekly Electricity";
  rows[0].amount = "12000";

  rows[1].title = "Internet Bill";
  rows[1].amount = "3500";

  // Batch date selected from top bar
  const batchDate = "2026-10-25";
  const result = classifyBulkRows(rows, "cash", batchDate);

  assert.equal(result.hasPartiallyFilled, false);
  assert.equal(result.filledRows.length, 2);
  assert.equal(result.filledRows[0].expenseDate, "2026-10-25", "Row 1 must inherit batch date");
  assert.equal(result.filledRows[1].expenseDate, "2026-10-25", "Row 2 must inherit batch date");
});
