/**
 * Canonical Role Label Registry (Change 13)
 * Provides consistent, human-readable titles across the entire application.
 */
export const ROLE_LABELS = {
  top_admin: "SaaS Top Admin",
  business_super_admin: "Company Admin",
  admin: "Company Admin",
  manager: "Branch Manager",
  cashier: "Cashier",
  technician: "Technician"
};

export function formatRoleName(role) {
  if (!role) return "";
  const key = String(role).trim().toLowerCase();
  return ROLE_LABELS[key] || role;
}
