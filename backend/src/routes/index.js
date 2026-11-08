import { Router } from "express";
import { adminRouter } from "./modules/admin.js";
import { authRouter } from "./modules/auth.js";
import { branchesRouter } from "./modules/branches.js";
import { cashRegisterRouter } from "./modules/cashRegister.js";
import { dashboardRouter } from "./modules/dashboard.js";
import { expensesRouter } from "./modules/expenses.js";
import { inventoryRouter } from "./modules/inventory.js";
import { modelsRouter } from "./modules/models.js";
import { notificationsRouter } from "./modules/notifications.js";
import { partiesRouter } from "./modules/parties.js";
import { paymentsRouter } from "./modules/payments.js";
import { purchasesRouter } from "./modules/purchases.js";
import { reportsRouter } from "./modules/reports.js";
import { salesRouter } from "./modules/sales.js";
import { productsRouter } from "./modules/products.js";
import { partnersRouter } from "./modules/partners.js";
import { transfersRouter } from "./modules/transfers.js";
import { returnsRouter } from "./modules/returns.js";
import { repairsRouter } from "./modules/repairs.js";
import { employeesRouter } from "./modules/employees.js";
import { branchSubscriptionGuard, requireAuth, requirePermission, hasPermission } from "../middleware/auth.js";

export const router = Router();

router.use("/auth", authRouter);
router.use(requireAuth);
router.use("/admin", adminRouter);
router.use(branchSubscriptionGuard);
router.use("/branches", requirePermission("branches"), branchesRouter);
router.use("/cash-register", requirePermission("cash_register"), cashRegisterRouter);
router.use("/dashboard", requirePermission("dashboard"), dashboardRouter);
router.use("/expenses", requirePermission("expenses"), expensesRouter);
router.use("/inventory", requirePermission("inventory"), inventoryRouter);
router.use("/models", requirePermission("models"), modelsRouter);
router.use("/notifications", requirePermission("notifications"), notificationsRouter);
router.use("/parties", requirePermission("parties"), partiesRouter);
router.use("/payments", requirePermission("invoices", "payment"), paymentsRouter);
router.use("/purchases", requirePermission("purchases"), purchasesRouter);
router.use("/reports", requirePermission("reports"), reportsRouter);
router.use("/sales", requirePermission("sales"), salesRouter);
router.use("/products", productsRouter);
router.use("/partners", requirePermission("admin"), partnersRouter);
router.use("/transfers", requirePermission("inventory"), transfersRouter);
router.use("/returns", (req, res, next) => {
  if (hasPermission(req.user, "sales") || hasPermission(req.user, "purchases") || hasPermission(req.user, "inventory")) {
    return next();
  }
  return requirePermission("sales")(req, res, next);
}, returnsRouter);
router.use("/repairs", requirePermission("repairs"), repairsRouter);
router.use("/employees", requirePermission("employees"), employeesRouter);

