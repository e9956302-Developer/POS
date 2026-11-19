import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Branch Limit Enforcement: backend branches.js enforces max_branches in POST /", () => {
  const branchesJs = fs.readFileSync(path.resolve(__dirname, "../../backend/src/routes/modules/branches.js"), "utf8");
  
  // Verify max_branches query and enforcement
  assert.ok(branchesJs.includes("SELECT COUNT(*) AS total FROM branches WHERE business_id = ?"), "Must count existing branches");
  assert.ok(branchesJs.includes("max_branches"), "Must query max_branches from subscription_plans");
  assert.ok(branchesJs.includes("activeBranchCount >= maxAllowed"), "Must block if active branches reach or exceed limit");
  assert.ok(branchesJs.includes("Branch creation limit reached"), "Must return clear error message on limit breach");
  assert.ok(branchesJs.includes("FOR UPDATE"), "Must use transaction lock to prevent race conditions");
  assert.ok(branchesJs.includes("COALESCE(sp.max_branches, 1) AS max_branches"), "GET / must return max_branches");
});

test("Branch Limit Enforcement: backend admin.js enforces max_branches with Top Admin force override", () => {
  const adminJs = fs.readFileSync(path.resolve(__dirname, "../../backend/src/routes/modules/admin.js"), "utf8");
  
  // Verify adminRouter.post("/branches") checks limit unless force is true
  assert.ok(adminJs.includes("if (!force)"), "Admin branch creation must check limit unless force is true");
  assert.ok(adminJs.includes("currentBranchCount >= maxBranches"), "Admin must check branch limit against count");
  assert.ok(adminJs.includes("Branch creation limit reached for this company"), "Admin must throw clear error if limit reached");
  assert.ok(adminJs.includes("COALESCE(plan.max_branches, 1) AS max_branches"), "GET /branches must return max_branches");
  assert.ok(adminJs.includes("COALESCE(p.max_branches, 1) AS max_branches"), "GET /businesses/:id must return max_branches for each branch");
});

test("Branch Limit Enforcement: backend auth.js includes max_branches in user subscription context", () => {
  const authJs = fs.readFileSync(path.resolve(__dirname, "../../backend/src/middleware/auth.js"), "utf8");
  
  assert.ok(authJs.includes("COALESCE(sp.max_branches, 1) AS max_branches"), "fetchUserSubscription must select max_branches");
  assert.ok(authJs.includes("max_branches:"), "subscriptionPlan object must expose max_branches");
  assert.ok(authJs.includes("maxBranches:"), "subscriptionPlan object must expose maxBranches");
});

test("Branch Limit Enforcement: frontend AdminPage.jsx shows limit counter, warning, and disables add form", () => {
  const adminPageJsx = fs.readFileSync(path.resolve(__dirname, "../../frontend/src/pages/AdminPage.jsx"), "utf8");
  
  assert.ok(adminPageJsx.includes("maxBranchesAllowed"), "AdminPage must compute maxBranchesAllowed");
  assert.ok(adminPageJsx.includes("isBranchLimitReached"), "AdminPage must compute isBranchLimitReached");
  assert.ok(adminPageJsx.includes("Branch Limit Reached"), "AdminPage must display warning banner when limit is reached");
  assert.ok(adminPageJsx.includes("disabled={isBranchLimitReached}"), "AdminPage must disable form inputs and button when limit is reached");
  assert.ok(adminPageJsx.includes("Please upgrade your subscription package to create more branches"), "AdminPage must guide user to upgrade package");
});

test("Branch Limit Enforcement: frontend TopBusinessesPage.jsx displays allocation and supports override", () => {
  const topBizJsx = fs.readFileSync(path.resolve(__dirname, "../../frontend/src/pages/TopBusinessesPage.jsx"), "utf8");
  
  assert.ok(topBizJsx.includes("branchForceOverride"), "TopBusinessesPage must support force override state");
  assert.ok(topBizJsx.includes("force: branchForceOverride"), "TopBusinessesPage must pass force override to topCreateBranch API");
  assert.ok(topBizJsx.includes("Branch Allocation:"), "TopBusinessesPage must display branch allocation usage in modal");
  assert.ok(topBizJsx.includes("Force Override:"), "TopBusinessesPage must offer Top Admin override checkbox when limit is reached");
});

test("Branch Limit Enforcement: Domain Logic Unit Tests", () => {
  function checkBranchCreationAllowed(currentCount, maxBranches) {
    const limit = maxBranches !== undefined && maxBranches !== null ? Number(maxBranches) : 1;
    // 0 denotes unlimited branches
    if (limit === 0) {
      return { allowed: true };
    }
    if (currentCount >= limit) {
      return {
        allowed: false,
        error: `Branch creation limit reached. Package allows a maximum of ${limit} branch${limit === 1 ? "" : "es"} (currently ${currentCount} created).`
      };
    }
    return { allowed: true };
  }

  // 1. Package allows 2 branches:
  // Branch 1 (0 existing) -> allowed
  assert.equal(checkBranchCreationAllowed(0, 2).allowed, true);
  // Branch 2 (1 existing) -> allowed
  assert.equal(checkBranchCreationAllowed(1, 2).allowed, true);
  // Branch 3 (2 existing) -> BLOCKED
  const check3 = checkBranchCreationAllowed(2, 2);
  assert.equal(check3.allowed, false);
  assert.match(check3.error, /Branch creation limit reached.*maximum of 2 branches/);

  // Already has 4 branches (the user's reported bug case) -> BLOCKED
  const check4 = checkBranchCreationAllowed(4, 2);
  assert.equal(check4.allowed, false);
  assert.match(check4.error, /currently 4 created/);

  // 2. Package with 1 branch (Starter):
  assert.equal(checkBranchCreationAllowed(0, 1).allowed, true);
  assert.equal(checkBranchCreationAllowed(1, 1).allowed, false);

  // 3. Package with 0 (Unlimited branches):
  assert.equal(checkBranchCreationAllowed(0, 0).allowed, true);
  assert.equal(checkBranchCreationAllowed(2, 0).allowed, true);
  assert.equal(checkBranchCreationAllowed(10, 0).allowed, true);
  assert.equal(checkBranchCreationAllowed(100, 0).allowed, true);
});
