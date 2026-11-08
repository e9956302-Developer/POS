import test from "node:test";
import assert from "node:assert/strict";
import {
  getForms,
  getRights,
  saveRights,
  makePermissionKey,
  ENTITY_FORMS,
  CATEGORIES,
  RIGHT_DEFINITIONS
} from "../src/services/rightsManagementService.js";

test("rights management: getForms() returns complete registry of 50 entity forms", async () => {
  const forms = await getForms();
  assert.ok(Array.isArray(forms), "Forms must be an array");
  assert.ok(forms.length >= 50, `Expected at least 50 forms, got ${forms.length}`);

  // Validate form properties
  const seenIds = new Set();
  forms.forEach((form) => {
    assert.ok(form.id, "Form must have an id");
    assert.ok(!seenIds.has(form.id), `Duplicate form ID: ${form.id}`);
    seenIds.add(form.id);

    assert.ok(form.name, `Form ${form.id} must have a name`);
    assert.ok(form.category, `Form ${form.id} must have a category`);
    assert.ok(Array.isArray(form.rights) && form.rights.length > 0, `Form ${form.id} must define supported rights`);

    // Ensure all defined rights are among the known RIGHT_DEFINITIONS
    form.rights.forEach((rightKey) => {
      const knownRight = RIGHT_DEFINITIONS.some((r) => r.key === rightKey);
      assert.ok(knownRight, `Unknown right '${rightKey}' in form ${form.id}`);
    });
  });
});

test("rights management: all operational categories are populated", async () => {
  const forms = await getForms();
  const operationalCategories = CATEGORIES.filter((c) => c !== "All");

  operationalCategories.forEach((cat) => {
    const matching = forms.filter((f) => f.category === cat);
    assert.ok(matching.length > 0, `Category '${cat}' should have registered entity forms`);
  });
});

test("rights management: makePermissionKey generates standard form:right format", () => {
  assert.equal(makePermissionKey("sales", "edit"), "sales:edit");
  assert.equal(makePermissionKey("invoices", "delete"), "invoices:delete");
  assert.equal(makePermissionKey("users", "create"), "users:create");
});

test("rights management: getRights() returns defaults for manager and cashier", async () => {
  const managerRights = await getRights("role", "manager");
  assert.ok(typeof managerRights === "object", "Manager rights must be an object");
  assert.equal(managerRights["sales:view"], true, "Manager should have sales:view");
  assert.equal(managerRights["sales:edit"], true, "Manager should have sales:edit");

  const cashierRights = await getRights("role", "cashier");
  assert.ok(typeof cashierRights === "object", "Cashier rights must be an object");
  assert.equal(cashierRights["sales:view"], true, "Cashier should have sales:view");
  assert.equal(cashierRights["sales:edit"], false, "Cashier should NOT have sales:edit by default");
});

test("rights management: saveRights() transforms map into permissions array", async () => {
  const payload = {
    "sales:view": true,
    "sales:edit": true,
    "sales:delete": false
  };

  const result = await saveRights("role", "custom_role", payload);
  assert.ok(result.success, "saveRights should succeed");
  assert.equal(result.permissions.length, 3);
  assert.deepEqual(result.permissions.find((p) => p.pageKey === "sales" && p.actionKey === "edit"), {
    pageKey: "sales",
    actionKey: "edit",
    isAllowed: true
  });
});
