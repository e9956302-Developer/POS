const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || (import.meta.env?.PROD ? "/api" : "http://localhost:4000/api");
const TOKEN_KEY = "mobile_pos_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = options.token || getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && !path.includes("/auth/login") && !path.includes("/auth/mfa/verify")) {
    clearToken();
    localStorage.removeItem("mobile_pos_user");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pos:session_expired", {
          detail: {
            message: data?.message || "Your session has expired. Please log in again to continue."
          }
        })
      );
    }
  }

  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    error.code = data.code;
    error.branch = data.branch;
    error.branchId = data.branchId;
    error.branchName = data.branchName;
    error.expiredOn = data.expiredOn;
    error.response = response;
    error.data = data;
    error.errors = data.errors;
    error.header = data.header;

    if (response.status === 403 && data.code === "SUBSCRIPTION_EXPIRED") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pos:subscription_expired", { detail: data }));
      }
    }
    throw error;
  }
  return data;
}

export const api = {
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  updateProfile: (payload) => request("/auth/profile", { method: "PUT", body: JSON.stringify(payload) }),
  mfaStatus: () => request("/auth/mfa/status"),
  mfaSetup: (token) => request("/auth/mfa/setup", { method: "POST", ...(token ? { token } : {}) }),
  mfaConfirm: (payload, token) =>
    request("/auth/mfa/confirm", {
      method: "POST",
      body: JSON.stringify(payload),
      ...(token ? { token } : {})
    }),
  mfaVerify: (payload) => request("/auth/mfa/verify", { method: "POST", body: JSON.stringify(payload) }),
  mfaDisable: (payload) => request("/auth/mfa/disable", { method: "POST", body: JSON.stringify(payload) }),
  branches: () => request("/branches"),
  parties: (query = "") => request(`/parties${query}`),
  createParty: (payload) => request("/parties", { method: "POST", body: JSON.stringify(payload) }),
  updateParty: (id, payload) => request(`/parties/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteParty: (id) => request(`/parties/${id}`, { method: "DELETE" }),
  models: () => request("/models"),
  createModel: (payload) => request("/models", { method: "POST", body: JSON.stringify(payload) }),
  updateModel: (id, payload) => request(`/models/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteModel: (id) => request(`/models/${id}`, { method: "DELETE" }),
  dashboard: (date, branchId) =>
    request(`/dashboard/summary?date=${encodeURIComponent(date)}${branchId ? `&branchId=${branchId}` : ""}`),
  cashRegisterSession: (branchId, date) =>
    request(`/cash-register/session?branchId=${branchId}&date=${encodeURIComponent(date)}`),
  openCashRegister: (payload) => request("/cash-register/open", { method: "POST", body: JSON.stringify(payload) }),
  closeCashRegister: (payload) => request("/cash-register/close", { method: "POST", body: JSON.stringify(payload) }),
  verifyCashRegister: (id) => request(`/cash-register/${id}/verify`, { method: "POST" }),
  inventory: (query = "") => request(`/inventory/units${query}`),
  imeiLookup: (imei) => request(`/inventory/lookup/${imei}`),
  purchases: (query = "") => request(`/purchases${query}`),
  createPurchase: (payload) => request("/purchases", { method: "POST", body: JSON.stringify(payload) }),
  getPurchase: (id) => request(`/purchases/${id}`),
  updatePurchase: (id, payload) => request(`/purchases/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePurchase: (id, reason) => request(`/purchases/${id}`, { method: "DELETE", body: JSON.stringify({ reason }) }),
  sales: (query = "") => request(`/sales${query}`),
  createSale: (payload) => request("/sales", { method: "POST", body: JSON.stringify(payload) }),
  getSale: (id) => request(`/sales/${id}`),
  updateSale: (id, payload) => request(`/sales/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSale: (id, reason) => request(`/sales/${id}`, { method: "DELETE", body: JSON.stringify({ reason }) }),
  createPayment: (payload) => request("/payments", { method: "POST", body: JSON.stringify(payload) }),
  expenses: (query = "") => request(`/expenses${query}`),
  createExpense: (payload) => request("/expenses", { method: "POST", body: JSON.stringify(payload) }),
  createExpenses: (payload) => request("/expenses/batch", { method: "POST", body: JSON.stringify(payload) }),
  updateExpense: (id, payload) => request(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteExpense: (id, reason) => request(`/expenses/${id}`, { method: "DELETE", body: JSON.stringify({ reason }) }),
  businesses: (query = "") => request(`/admin/businesses${query}`),
  createBusiness: (payload) => request("/admin/businesses", { method: "POST", body: JSON.stringify(payload) }),
  updateBusiness: (id, payload) => request(`/admin/businesses/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  toggleBusiness: (id, isActive) =>
    request(`/admin/businesses/${id}/toggle`, { method: "POST", body: JSON.stringify({ isActive }) }),
  deleteBusiness: (id) => request(`/admin/businesses/${id}`, { method: "DELETE" }),
  topDashboardStats: () => request("/admin/dashboard-stats"),
  topBusinessDetail: (id) => request(`/admin/businesses/${id}`),
  topBranches: (query = "") => request(`/admin/branches${query}`),
  topCreateBranch: (payload) => request("/admin/branches", { method: "POST", body: JSON.stringify(payload) }),
  topUpdateBranch: (id, payload) => request(`/admin/branches/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  topDeleteBranch: (id) => request(`/admin/branches/${id}`, { method: "DELETE" }),
  topToggleBranch: (id, isActive) =>
    request(`/admin/branches/${id}/toggle`, { method: "POST", body: JSON.stringify({ isActive }) }),
  topBusinessBranches: (businessId) => request(`/admin/businesses/${businessId}/branches`),
  subscriptionPlans: () => request("/admin/subscription-plans"),
  createSubscriptionPlan: (payload) => request("/admin/subscription-plans", { method: "POST", body: JSON.stringify(payload) }),
  updateSubscriptionPlan: (id, payload) => request(`/admin/subscription-plans/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSubscriptionPlan: (id) => request(`/admin/subscription-plans/${id}`, { method: "DELETE" }),
  toggleSubscriptionPlan: (id, isActive) =>
    request(`/admin/subscription-plans/${id}/toggle`, { method: "POST", body: JSON.stringify({ isActive }) }),
  planBranches: (planId) => request(`/admin/subscription-plans/${planId}/branches`),
  assignBranchSubscription: (payload) =>
    request("/admin/branch-subscriptions/assign", { method: "POST", body: JSON.stringify(payload) }),
  cancelBranchSubscription: (branchId) =>
    request(`/admin/branch-subscriptions/${branchId}/cancel`, { method: "POST" }),
  topPackageAccess: () => request("/admin/package-access"),
  updateTopPackageAccess: (planId, allowedPages) =>
    request(`/admin/package-access/${planId}`, { method: "PUT", body: JSON.stringify({ allowedPages }) }),
  cloneTopPackageAccess: (fromPlanId, toPlanId) =>
    request("/admin/package-access/clone", { method: "POST", body: JSON.stringify({ fromPlanId, toPlanId }) }),
  topPayments: (query = "") => request(`/admin/payments${query}`),
  topSubmitPayment: (payload) => request("/admin/payments", { method: "POST", body: JSON.stringify(payload) }),
  topApprovePayment: (id) => request(`/admin/payments/${id}/approve`, { method: "POST" }),
  topRejectPayment: (id, reason) => request(`/admin/payments/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  topUpdatePayment: (id, payload) => request(`/admin/payments/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  topDeletePayment: (id) => request(`/admin/payments/${id}`, { method: "DELETE" }),
  topCompanyAdmins: (query = "") => request(`/admin/company-admins${query}`),
  topCreateCompanyAdmin: (payload) => request("/admin/company-admins", { method: "POST", body: JSON.stringify(payload) }),
  topUpdateCompanyAdmin: (id, payload) => request(`/admin/company-admins/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  topToggleCompanyAdmin: (id, isActive) =>
    request(`/admin/company-admins/${id}/toggle`, { method: "POST", body: JSON.stringify({ isActive }) }),
  topDeleteCompanyAdmin: (id, options = {}) =>
    request(`/admin/company-admins/${id}`, { method: "DELETE", body: JSON.stringify(options) }),
  topSaasAdmins: () => request("/admin/saas-admins"),
  topCreateSaasAdmin: (payload) => request("/admin/saas-admins", { method: "POST", body: JSON.stringify(payload) }),
  topUpdateSaasAdmin: (id, payload) => request(`/admin/saas-admins/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  topToggleSaasAdmin: (id, isActive) => request(`/admin/saas-admins/${id}/toggle`, { method: "POST", body: JSON.stringify({ isActive }) }),
  topDeleteSaasAdmin: (id) => request(`/admin/saas-admins/${id}`, { method: "DELETE" }),
  branchSubscriptions: () => request("/admin/branch-subscriptions"),
  extendBranchSubscription: (branchId, currentPeriodEndsOn) =>
    request(`/admin/branch-subscriptions/${branchId}/extend`, {
      method: "POST",
      body: JSON.stringify({ currentPeriodEndsOn })
    }),
  suspendBranchSubscription: (branchId) =>
    request(`/admin/branch-subscriptions/${branchId}/suspend`, { method: "POST" }),
  changeBranchSubscriptionPlan: (branchId, planId) =>
    request(`/admin/branch-subscriptions/${branchId}/change-plan`, {
      method: "POST",
      body: JSON.stringify({ planId })
    }),
  adminUsers: () => request("/admin/users"),
  businessRolePermissions: () => request("/admin/business-role-permissions"),
  updateBusinessRolePermissions: (roleName, permissions) =>
    request(`/admin/business-role-permissions/${roleName}`, { method: "PUT", body: JSON.stringify({ permissions }) }),
  updateUserPermissions: (id, permissions) =>
    request(`/admin/users/${id}/permissions`, { method: "PUT", body: JSON.stringify({ permissions }) }),
  notifications: (branchId) => request(`/notifications${branchId ? `?branchId=${branchId}` : ""}`),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "POST" }),
  reportInventory: () => request("/reports/inventory"),
  reportReceivables: () => request("/reports/receivables"),
  reportPayables: () => request("/reports/payables"),
  reportDividends: (query = "") => request(`/reports/dividends${query}`),
  reportPnL: (query = "") => request(`/reports/pnl${query}`),
  createBranch: (payload) => request("/branches", { method: "POST", body: JSON.stringify(payload) }),
  updateBranch: (id, payload) => request(`/branches/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteBranch: (id) => request(`/branches/${id}`, { method: "DELETE" }),
  createUser: (payload) => request("/admin/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteUser: (id, options = {}) => request(`/admin/users/${id}`, { method: "DELETE", body: JSON.stringify(options) }),
  resetUserPassword: (id, password) => request(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify({ password }) }),
  companyProfile: () => request("/admin/company-profile"),
  updateCompanyProfile: (payload) => request("/admin/company-profile", { method: "PUT", body: JSON.stringify(payload) }),
  categories: () => request("/products/categories"),
  createCategory: (payload) => request("/products/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (id, payload) => request(`/products/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCategory: (id) => request(`/products/categories/${id}`, { method: "DELETE" }),
  products: (query = "") => request(`/products${query}`),
  createProduct: (payload) => request("/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
  adjustProductStock: (payload) => request("/products/stocks/adjust", { method: "POST", body: JSON.stringify(payload) }),
  partners: () => request("/partners"),
  createPartner: (payload) => request("/partners", { method: "POST", body: JSON.stringify(payload) }),
  updatePartner: (id, payload) => request(`/partners/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  partnerTransactions: (partnerId, query = "") => request(`/partners/${partnerId}/transactions${query}`),
  createPartnerTransaction: (partnerId, payload) =>
    request(`/partners/${partnerId}/transactions`, { method: "POST", body: JSON.stringify(payload) }),
  partnerCapitalSummary: (partnerId) => request(`/partners/${partnerId}/capital-summary`),
  branchPartnerShares: (branchId) => request(`/partners/branches/${branchId}/shares`),
  updateBranchPartnerShares: (branchId, payload) =>
    request(`/partners/branches/${branchId}/shares`, { method: "PUT", body: JSON.stringify(payload) }),
  disburseBranchDividends: (branchId, payload) =>
    request(`/partners/branches/${branchId}/disburse-dividends`, { method: "POST", body: JSON.stringify(payload) }),
  branchEquityOverview: () => request("/partners/branch-equity-overview"),
  transfers: (query = "") => request(`/transfers${query}`),
  transfer: (id) => request(`/transfers/${id}`),
  createTransfer: (payload) => request("/transfers", { method: "POST", body: JSON.stringify(payload) }),
  receiveTransfer: (id) => request(`/transfers/${id}/receive`, { method: "POST" }),
  cancelTransfer: (id) => request(`/transfers/${id}/cancel`, { method: "POST" }),
  returns: (query = "") => request(`/returns${query}`),
  createReturn: (payload) => request("/returns", { method: "POST", body: JSON.stringify(payload) }),
  topDeletedTransactions: (query = "") => request(`/admin/deleted-transactions${query}`),
  topDeletedTransaction: (type, id) => request(`/admin/deleted-transactions/${type}/${id}`),
  topRestoreTransaction: (type, id) => request(`/admin/deleted-transactions/${type}/${id}/restore`, { method: "POST" }),
  repairs: (query = "") => request(`/repairs${query}`),
  repair: (id) => request(`/repairs/${id}`),
  createRepair: (payload) => request("/repairs", { method: "POST", body: JSON.stringify(payload) }),
  updateRepairStatus: (id, payload) => request(`/repairs/${id}/status`, { method: "PUT", body: JSON.stringify(payload) }),
  cancelRepair: (id) => request(`/repairs/${id}`, { method: "DELETE" }),
  employees: (query = "") => request(`/employees${query}`),
  createEmployee: (payload) => request("/employees", { method: "POST", body: JSON.stringify(payload) }),
  updateEmployee: (id, payload) => request(`/employees/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  attendance: (query = "") => request(`/employees/attendance${query}`),
  saveAttendanceBatch: (payload) => request("/employees/attendance/batch", { method: "POST", body: JSON.stringify(payload) }),
  monthlyAttendance: (query = "") => request(`/employees/attendance/monthly${query}`),
  saveMonthlyAttendance: (payload) => request("/employees/attendance/monthly", { method: "POST", body: JSON.stringify(payload) }),
  employeeAdvances: (query = "") => request(`/employees/advances${query}`),
  createEmployeeAdvance: (payload) => request("/employees/advances", { method: "POST", body: JSON.stringify(payload) }),
  salaries: (query = "") => request(`/employees/salaries${query}`),
  payrollHistory: (query = "") => request(`/employees/history${query}`),
  employeeSalaryPreview: (id, query = "") => request(`/employees/${id}/salary-preview${query}`),
  paySalary: (payload) => request("/employees/salaries/pay", { method: "POST", body: JSON.stringify(payload) }),
  batchSalaryPreview: (query = "") => request(`/employees/batch-salary-preview${query}`),
  batchPaySalary: (payload) => request("/employees/salaries/batch-pay", { method: "POST", body: JSON.stringify(payload) }),
  topLoginLogs: (query = "") => request(`/admin/login-logs${query}`),
  topLoginLogsStats: () => request("/admin/login-logs/stats"),
  getPlatformLayout: () => request("/auth/platform-settings"),
  getAdminPlatformLayout: () => request("/admin/platform-settings/layout"),
  updatePlatformLayout: (layout) =>
    request("/admin/platform-settings/layout", {
      method: "PUT",
      body: JSON.stringify({ layout })
    })
};


