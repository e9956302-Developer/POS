import { useEffect, useState, useMemo } from "react";
import { api } from "../api.js";
import { PaginationBar } from "../components/PaginationBar.jsx";
import { SectionCard } from "../components/SectionCard.jsx";
import { THEMES, canUseTheme } from "../App.jsx";
import { ToggleSwitch } from "../components/ToggleSwitch.jsx";
import { RightsManagementUI } from "../components/RightsManagementUI.jsx";
import { smoothScrollTo } from "../utils/scroll.js";
import { PartnerDepositModal, PartnerLedgerModal } from "../components/PartnerTransactionModal.jsx";
import { PartnerVoucherModal } from "../components/PartnerVoucherModal.jsx";

const permissionMatrix = [
  { pageKey: "dashboard", label: "Dashboard", actions: ["view"] },
  { pageKey: "sales", label: "Sales & POS Checkout", actions: ["view", "create", "edit", "delete"] },
  { pageKey: "purchases", label: "Vendor Purchases", actions: ["view", "create", "edit", "delete"] },
  { pageKey: "invoices", label: "Invoices & Billing History", actions: ["view", "payment", "delete"] },
  { pageKey: "cash_register", label: "Cash Register & Drawers", actions: ["view", "create", "close", "verify"] },
  { pageKey: "inventory", label: "Inventory & Stock", actions: ["view", "create", "edit", "delete"] },
  { pageKey: "parties", label: "Customer & Vendor Parties", actions: ["view", "create", "edit", "delete"] },
  { pageKey: "expenses", label: "Operating Expenses", actions: ["view", "create", "edit", "delete"] },
  { pageKey: "branches", label: "Store Outlets & Branches", actions: ["view", "create", "edit", "delete"] },
  { pageKey: "users", label: "Staff Accounts & Permissions", actions: ["view", "create", "edit", "delete"] },
  { pageKey: "repairs", label: "Device Repairs & Warranty", actions: ["view", "create", "edit", "delete"] },
  { pageKey: "employees", label: "Staff Roster & Payroll", actions: ["view", "create", "edit", "delete"] },
  { pageKey: "reports", label: "Reports & Analytics", actions: ["view"] }
];

function roleName(user) {
  return user?.role_name || user?.roleName;
}

function permissionKey(pageKey, actionKey) {
  return `${pageKey}:${actionKey}`;
}

function isPageInSubscription(pageKey, allowedPages) {
  if (!Array.isArray(allowedPages) || allowedPages.length === 0) return true;
  if (allowedPages.includes(pageKey)) return true;
  if (pageKey === "reports") {
    return (
      allowedPages.includes("reports") ||
      allowedPages.includes("reports_inventory") ||
      allowedPages.includes("reports_receivables") ||
      allowedPages.includes("reports_payables")
    );
  }
  if (pageKey === "branches" || pageKey === "users") {
    return true;
  }
  if (pageKey === "employees") {
    return (
      allowedPages.includes("employees") ||
      allowedPages.includes("salaries") ||
      allowedPages.includes("payroll") ||
      allowedPages.includes("admin")
    );
  }
  if (pageKey === "repairs") {
    return allowedPages.includes("repairs") || allowedPages.includes("admin");
  }
  return false;
}

function buildDeniedSet(permissions = []) {
  return new Set(
    permissions
      .filter((permission) => Number(permission.is_allowed ?? permission.isAllowed) === 0)
      .map((permission) => permissionKey(permission.page_key || permission.pageKey, permission.action_key || permission.actionKey))
  );
}

export function AdminPage({ context, activeSubPage = "branches", onNavigateSubPage }) {
  const allowedPages = context.session?.allowedPages || context.session?.allowed_pages;
  const activePermissionMatrix = useMemo(() => {
    return permissionMatrix.filter((page) => isPageInSubscription(page.pageKey, allowedPages));
  }, [allowedPages]);

  const [currentSubPage, setCurrentSubPage] = useState(activeSubPage || "branches");

  useEffect(() => {
    if (activeSubPage && activeSubPage !== currentSubPage) {
      setCurrentSubPage(activeSubPage);
    }
  }, [activeSubPage]);

  function switchSubPage(key) {
    setCurrentSubPage(key);
    setError("");
    setMessage("");
    if (onNavigateSubPage) {
      onNavigateSubPage(key);
    }
  }

  const [businesses, setBusinesses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [partners, setPartners] = useState([]);
  const [branchEquityList, setBranchEquityList] = useState([]);
  const [selectedPartnerForDeposit, setSelectedPartnerForDeposit] = useState(null);
  const [selectedPartnerForLedger, setSelectedPartnerForLedger] = useState(null);
  const [viewingPartnerVoucher, setViewingPartnerVoucher] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerEditForm, setPartnerEditForm] = useState({ name: "", phone: "", cnic: "" });
  const [isSavingPartner, setIsSavingPartner] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [deniedPermissions, setDeniedPermissions] = useState(new Set());

  // Password Reset State
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState("");

  // Branch Edit & Delete States
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchEditForm, setBranchEditForm] = useState({ name: "", code: "", address: "" });
  const [deletingBranch, setDeletingBranch] = useState(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  // User Edit & Delete States
  const [editingUser, setEditingUser] = useState(null);
  const [userEditForm, setUserEditForm] = useState({
    fullName: "",
    email: "",
    roleName: "cashier",
    branchId: "",
    isActive: true,
    password: ""
  });
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Company Profile & Logo State
  const [companyForm, setCompanyForm] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    taxNumber: "",
    currency: "PKR",
    softwareName: "DigitalMarkaz360",
    tagline: "Poora Karobar, Ek Markaz",
    receiptFooter: "",
    logoUrl: ""
  });
  const [logoPreview, setLogoPreview] = useState("");
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Company Role Permissions State
  const [rolePermissionsData, setRolePermissionsData] = useState(null);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState("manager");
  const [roleDeniedPermissions, setRoleDeniedPermissions] = useState({ manager: new Set(), cashier: new Set() });
  const [isSavingRolePerms, setIsSavingRolePerms] = useState(false);

  // Forms
  const [businessForm, setBusinessForm] = useState({
    name: "",
    code: "",
    branchName: "",
    branchCode: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    planId: 1
  });
  const [branchForm, setBranchForm] = useState({ name: "", code: "", address: "" });
  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
    roleName: "cashier",
    branchId: ""
  });
  const [partnerForm, setPartnerForm] = useState({ name: "", phone: "", cnic: "" });
  const [selectedBranchShares, setSelectedBranchShares] = useState("");
  const [branchShareData, setBranchShareData] = useState([]);
  const [isLoadingBranchShares, setIsLoadingBranchShares] = useState(false);
  const [isSavingBranchShares, setIsSavingBranchShares] = useState(false);
  const [lastEditedBranchId, setLastEditedBranchId] = useState(null);

  const [extensionDate, setExtensionDate] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Search & Pagination States
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessPage, setBusinessPage] = useState(1);
  const [businessPageSize, setBusinessPageSize] = useState(10);

  const [subSearch, setSubSearch] = useState("");
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(10);

  const [branchSearch, setBranchSearch] = useState("");
  const [branchPage, setBranchPage] = useState(1);
  const [branchPageSize, setBranchPageSize] = useState(10);

  const [staffSearch, setStaffSearch] = useState("");
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(10);

  const currentRole = roleName(context.session);
  const isTopAdmin = currentRole === "top_admin";
  const isBusinessAdmin = ["business_super_admin", "admin"].includes(currentRole);
  const canManageUsers = isTopAdmin || isBusinessAdmin;
  const hasThemeAccess = context?.hasThemeAccess ?? canUseTheme(context?.session);

  useEffect(() => {
    setError("");
    if (isTopAdmin) {
      api.businesses().then((res) => setBusinesses(Array.isArray(res) ? res : res.data || [])).catch((loadError) => setError(loadError.message));
      api.subscriptionPlans().then(setPlans).catch((loadError) => setError(loadError.message));
      api.branchSubscriptions().then(setSubscriptions).catch((loadError) => setError(loadError.message));
    }
    if (canManageUsers) {
      loadUsers();
    }
    if (isBusinessAdmin) {
      api.branches().then((b) => {
        setBranches(b);
        if (b.length && !selectedBranchShares) {
          const firstId = String(b[0].id);
          setSelectedBranchShares(firstId);
        }
      }).catch((loadError) => setError(loadError.message));

      api.partners().then(setPartners).catch(() => setPartners([]));

      api.companyProfile()
        .then((data) => {
          if (data) {
            setCompanyForm({
              name: data.name || "",
              code: data.code || "",
              email: data.email || "",
              phone: data.phone || "",
              address: data.address || "",
              taxNumber: data.tax_number || "",
              currency: data.currency || "PKR",
              softwareName: data.software_name || "DigitalMarkaz360",
              tagline: data.tagline || "Poora Karobar, Ek Markaz",
              receiptFooter: data.receipt_footer || "",
              logoUrl: data.logo_url || ""
            });
            setLogoPreview(data.logo_url || "");
          }
        })
        .catch(() => {});
    }
  }, [isTopAdmin, canManageUsers, isBusinessAdmin]);

  async function loadUsers() {
    if (!canManageUsers) return;
    try {
      const u = await api.adminUsers();
      setUsers(Array.isArray(u) ? u : []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function loadBranchShares(branchId) {
    if (!branchId) return;
    setIsLoadingBranchShares(true);
    try {
      const res = await api.branchPartnerShares(branchId);
      setBranchShareData(res.shares || []);
    } catch (err) {
      setError(err.message || "Failed to load branch shares");
      setBranchShareData([]);
    } finally {
      setIsLoadingBranchShares(false);
    }
  }

  useEffect(() => {
    if (selectedBranchShares) {
      loadBranchShares(selectedBranchShares);
    }
  }, [selectedBranchShares]);

  async function loadBranchEquityOverview() {
    try {
      const data = await api.branchEquityOverview();
      setBranchEquityList(Array.isArray(data) ? data : []);
    } catch {
      setBranchEquityList([]);
    }
  }

  useEffect(() => {
    if (isBusinessAdmin) {
      if (currentSubPage === "partners") {
        loadBranchEquityOverview();
      } else if (currentSubPage === "company") {
        api.companyProfile()
          .then((data) => {
            if (data) {
              setCompanyForm((prev) => ({
                ...prev,
                name: data.name || "",
                code: data.code || "",
                email: data.email || "",
                phone: data.phone || "",
                address: data.address || "",
                taxNumber: data.tax_number || "",
                currency: data.currency || "PKR",
                softwareName: data.software_name || "DigitalMarkaz360",
                tagline: data.tagline || "Poora Karobar, Ek Markaz",
                receiptFooter: data.receipt_footer || "",
                logoUrl: data.logo_url || ""
              }));
              setLogoPreview(data.logo_url || "");
            }
          })
          .catch(() => {});
      }
    }
  }, [currentSubPage, isBusinessAdmin]);

  async function refreshAdminData() {
    if (isTopAdmin) {
      const bRes = await api.businesses();
      setBusinesses(Array.isArray(bRes) ? bRes : bRes.data || []);
      setSubscriptions(await api.branchSubscriptions());
    }
    await loadUsers();
    if (isBusinessAdmin) {
      const b = await api.branches();
      setBranches(b);
      setPartners(await api.partners());
      try {
        const rp = await api.businessRolePermissions();
        setRolePermissionsData(rp);
        if (rp?.roles) {
          const managerDenied = new Set();
          for (const p of rp.roles.manager || []) {
            if (!p.isAllowed) managerDenied.add(permissionKey(p.pageKey, p.actionKey));
          }
          const cashierDenied = new Set();
          for (const p of rp.roles.cashier || []) {
            if (!p.isAllowed) cashierDenied.add(permissionKey(p.pageKey, p.actionKey));
          }
          setRoleDeniedPermissions({ manager: managerDenied, cashier: cashierDenied });
        }
      } catch (err) {
        console.error("Failed to load business role permissions", err);
      }
      try {
        const profile = await api.companyProfile();
        if (profile) {
          setCompanyForm({
            name: profile.name || "",
            code: profile.code || "",
            email: profile.email || "",
            phone: profile.phone || "",
            address: profile.address || "",
            taxNumber: profile.tax_number || "",
            currency: profile.currency || "PKR",
            softwareName: profile.software_name || "DigitalMarkaz360",
            tagline: profile.tagline || "Poora Karobar, Ek Markaz",
            receiptFooter: profile.receipt_footer || "",
            logoUrl: profile.logo_url || ""
          });
          setLogoPreview(profile.logo_url || "");
        }
      } catch {}
      context.refreshAll();
    }
  }

  function toggleRolePermission(roleName, pageKey, actionKey) {
    const key = permissionKey(pageKey, actionKey);
    setRoleDeniedPermissions((current) => {
      const nextRoleSet = new Set(current[roleName]);
      if (nextRoleSet.has(key)) {
        nextRoleSet.delete(key);
      } else {
        nextRoleSet.add(key);
      }
      return { ...current, [roleName]: nextRoleSet };
    });
  }

  async function saveRolePermissions(roleName) {
    setError("");
    setMessage("");
    setIsSavingRolePerms(true);
    const deniedSet = roleDeniedPermissions[roleName] || new Set();
    const permissions = activePermissionMatrix.flatMap((page) =>
      page.actions.map((actionKey) => ({
        pageKey: page.pageKey,
        actionKey,
        isAllowed: !deniedSet.has(permissionKey(page.pageKey, actionKey))
      }))
    );

    try {
      await api.updateBusinessRolePermissions(roleName, permissions);
      setMessage(`Company role rights for '${roleName === "manager" ? "Branch Manager" : "Cashier"}' saved successfully.`);
      await refreshAdminData();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSavingRolePerms(false);
    }
  }

  function startEdit(user) {
    if (user.role_name === "business_super_admin") {
      setError("Company super administrator rights are package-managed and cannot be customized with individual overrides.");
      return;
    }
    setEditingUserId(user.id);
    setDeniedPermissions(buildDeniedSet(user.permissions));
    setMessage("");
    smoothScrollTo("user-restrictions-workspace", { offset: 85, delay: 60 });
  }

  function togglePermission(pageKey, actionKey) {
    const key = permissionKey(pageKey, actionKey);
    setDeniedPermissions((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function savePermissions() {
    setError("");
    setMessage("");
    const permissions = activePermissionMatrix.flatMap((page) =>
      page.actions.map((actionKey) => ({
        pageKey: page.pageKey,
        actionKey,
        isAllowed: !deniedPermissions.has(permissionKey(page.pageKey, actionKey))
      }))
    );

    try {
      await api.updateUserPermissions(editingUserId, permissions);
      setMessage("User individual restrictions updated");
      await refreshAdminData();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function toggleBusiness(business) {
    setError("");
    setMessage("");
    try {
      const saved = await api.toggleBusiness(business.id, !business.is_active);
      setBusinesses((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setMessage(`${saved.name} ${saved.is_active ? "enabled" : "disabled"}`);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function toggleUserStatus(user) {
    if (user.role_name === "business_super_admin" || Number(user.id) === Number(context.session?.id)) {
      setError("Company super administrator account is protected and cannot be deactivated.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await api.updateUser(user.id, { isActive: !user.is_active });
      setMessage(`User ${user.full_name} status updated`);
      await refreshAdminData();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  function openResetPasswordModal(user) {
    setError("");
    setMessage("");
    setResettingUser(user);
    setNewPassword("");
    setShowNewPassword(false);
    setResetSuccessMessage("");
  }

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  }

  async function executeResetPassword(e) {
    e.preventDefault();
    if (!resettingUser || !newPassword.trim()) return;
    setError("");
    setIsResettingPassword(true);
    try {
      await api.resetUserPassword(resettingUser.id, newPassword.trim());
      setResetSuccessMessage(`Password for ${resettingUser.full_name} has been reset successfully.`);
      setMessage(`Password for ${resettingUser.full_name} (${resettingUser.email}) reset successfully.`);
      setTimeout(() => {
        setResettingUser(null);
        setNewPassword("");
        setResetSuccessMessage("");
      }, 2200);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  }

  function handleLogoFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      setError("Logo file size is too large (maximum allowed size is 800 KB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setLogoPreview(result);
      setCompanyForm((prev) => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoPreview("");
    setCompanyForm((prev) => ({ ...prev, logoUrl: "" }));
  }

  async function saveCompanyDetails(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSavingCompany(true);
    try {
      const saved = await api.updateCompanyProfile(companyForm);
      setMessage("Company details and logo updated successfully! Changes will appear in your top bar, invoices, and reports.");
      context.refreshAll();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSavingCompany(false);
    }
  }

  async function createBusiness(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.createBusiness({
        ...businessForm,
        planId: Number(businessForm.planId)
      });
      setBusinessForm({
        name: "",
        code: "",
        branchName: "",
        branchCode: "",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
        planId: plans[0]?.id || 1
      });
      await refreshAdminData();
      setMessage("Business, first branch, admin user, and trial subscription created");
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function createBranch(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const created = await api.createBranch(branchForm);
      setMessage(`Branch ${created.name} (${created.code}) created successfully`);
      setBranchForm({ name: "", code: "", address: "" });
      await refreshAdminData();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function createStaffUser(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(userForm.email || "").trim())) {
      setError("Please enter a valid email address");
      return;
    }
    try {
      const created = await api.createUser({
        ...userForm,
        email: userForm.email.trim(),
        branchId: userForm.branchId ? Number(userForm.branchId) : null
      });
      setMessage(`Staff user ${created.full_name} (${created.role_name}) created`);
      setUserForm({ fullName: "", email: "", password: "", roleName: "cashier", branchId: "" });
      await refreshAdminData();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  function openEditBranchModal(b) {
    setEditingBranch(b);
    setBranchEditForm({
      name: b.name || "",
      code: b.code || "",
      address: b.address || ""
    });
    setError("");
    setMessage("");
  }

  async function handleSaveBranchEdit(e) {
    e.preventDefault();
    if (!editingBranch) return;
    setError("");
    setMessage("");
    try {
      await api.updateBranch(editingBranch.id, {
        name: branchEditForm.name.trim(),
        address: branchEditForm.address.trim()
      });
      setMessage(`Branch '${branchEditForm.name}' updated successfully.`);
      setEditingBranch(null);
      await refreshAdminData();
    } catch (err) {
      setError(err.message || "Failed to update branch");
    }
  }

  async function handleDeleteBranch(e) {
    e.preventDefault();
    if (!deletingBranch) return;
    setError("");
    setIsDeletingBranch(true);
    try {
      await api.deleteBranch(deletingBranch.id);
      setMessage(`Branch '${deletingBranch.name}' deleted successfully.`);
      setDeletingBranch(null);
      await refreshAdminData();
    } catch (err) {
      setError(err.message || "Failed to delete branch");
    } finally {
      setIsDeletingBranch(false);
    }
  }

  function openEditUserModal(u) {
    setEditingUser(u);
    setUserEditForm({
      fullName: u.full_name || "",
      email: u.email || "",
      roleName: u.role_name || "cashier",
      branchId: u.branch_id ? String(u.branch_id) : "",
      isActive: Boolean(u.is_active),
      password: ""
    });
    setError("");
    setMessage("");
  }

  async function handleSaveUserEdit(e) {
    e.preventDefault();
    if (!editingUser) return;
    setError("");
    setMessage("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(userEditForm.email || "").trim())) {
      setError("Please enter a valid email address");
      return;
    }
    try {
      const payload = {
        fullName: userEditForm.fullName.trim(),
        email: userEditForm.email.trim(),
        roleName: userEditForm.roleName,
        branchId: userEditForm.branchId ? Number(userEditForm.branchId) : null,
        isActive: userEditForm.isActive
      };
      if (userEditForm.password && userEditForm.password.trim()) {
        payload.password = userEditForm.password.trim();
      }
      await api.updateUser(editingUser.id, payload);
      setMessage(`Staff member '${userEditForm.fullName}' details updated successfully.`);
      setEditingUser(null);
      await refreshAdminData();
    } catch (err) {
      setError(err.message || "Failed to update user details");
    }
  }

  async function handleDeleteUser(e, deactivate = false) {
    if (e) e.preventDefault();
    if (!deletingUser) return;
    setError("");
    setIsDeletingUser(true);
    try {
      const res = await api.deleteUser(deletingUser.id, { deactivateIfHasRecords: deactivate });
      setMessage(res.message || `Staff member '${deletingUser.full_name}' processed successfully.`);
      setDeletingUser(null);
      await refreshAdminData();
    } catch (err) {
      setError(err.message || "Failed to delete user");
    } finally {
      setIsDeletingUser(false);
    }
  }

  async function createPartner(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.createPartner(partnerForm);
      setMessage(`Partner ${partnerForm.name} added successfully`);
      setPartnerForm({ name: "", phone: "", cnic: "" });
      await refreshAdminData();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  function openEditPartner(partner) {
    setEditingPartner(partner);
    setPartnerEditForm({
      name: partner.name || "",
      phone: partner.phone || "",
      cnic: partner.cnic || ""
    });
  }

  async function handleSavePartnerEdit(event) {
    event.preventDefault();
    if (!editingPartner) return;
    if (!partnerEditForm.name.trim()) {
      setError("Partner full name is required");
      return;
    }
    setIsSavingPartner(true);
    setError("");
    setMessage("");
    try {
      await api.updatePartner(editingPartner.id, {
        name: partnerEditForm.name.trim(),
        phone: partnerEditForm.phone.trim() || null,
        cnic: partnerEditForm.cnic.trim() || null
      });
      setMessage(`Partner "${partnerEditForm.name}" updated successfully.`);
      setEditingPartner(null);
      setPartners(await api.partners());
    } catch (saveError) {
      setError(saveError.message || "Failed to update partner details");
    } finally {
      setIsSavingPartner(false);
    }
  }

  function updateSharePercentage(partnerId, value) {
    setBranchShareData((current) =>
      current.map((item) => (item.partner_id === partnerId ? { ...item, share_percentage: value } : item))
    );
  }

  const currentShareTotal = useMemo(() => {
    return branchShareData.reduce((sum, item) => sum + (parseFloat(item.share_percentage) || 0), 0);
  }, [branchShareData]);

  function handleEditBranchShares(branchId) {
    const bId = String(branchId);
    setError("");
    setMessage("");
    setSelectedBranchShares(bId);
    loadBranchShares(bId);
    smoothScrollTo("branch-shares-editor", { offset: 90, delay: 20 });
  }

  async function saveBranchShares() {
    setError("");
    setMessage("");
    const total = currentShareTotal;
    if (Math.abs(total - 100) > 0.01 && branchShareData.length > 0) {
      setError(`Total dividend percentage must equal 100%. Current sum: ${total.toFixed(2)}%`);
      return;
    }
    const targetBranchId = selectedBranchShares;
    if (!targetBranchId) {
      setError("Please select a branch to configure shares");
      return;
    }
    setIsSavingBranchShares(true);
    try {
      await api.updateBranchPartnerShares(targetBranchId, {
        shares: branchShareData.map((s) => ({
          partnerId: s.partner_id,
          sharePercentage: parseFloat(s.share_percentage) || 0
        }))
      });
      const editedBranch = branches.find((b) => String(b.id) === String(targetBranchId));
      const branchName = editedBranch?.name || "Branch";
      setMessage(`Branch dividend shares for "${branchName}" saved successfully.`);
      setLastEditedBranchId(String(targetBranchId));
      
      // Reload branch equity overview so table reflects updated percentages
      await loadBranchEquityOverview();

      // Scroll up to the edited branch row in "Branches with Configured Dividend & Equity Shares"
      smoothScrollTo(`branch-equity-row-${targetBranchId}`, { offset: 130, delay: 80 });

      // Clear the temporary highlight after 3.5 seconds
      setTimeout(() => {
        setLastEditedBranchId(null);
      }, 3500);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSavingBranchShares(false);
    }
  }

  return (
    <div className="page-stack">
      {error && (
        <div className="alert error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button type="button" className="close-btn" onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>✕</button>
        </div>
      )}
      {message && (
        <div className="alert success" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{message}</span>
          <button type="button" className="close-btn" onClick={() => setMessage("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>✕</button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP ADMIN PANELS */}
      {/* ======================================================== */}
      {isTopAdmin ? (
        <div className="page-grid two-column">
          <SectionCard title="Create Business" subtitle="Provision a new tenant, initial branch, and company admin.">
            <form className="form-grid" onSubmit={createBusiness}>
              <label>
                <span>Company Name</span>
                <input
                  placeholder="e.g. Apex Mobile Telecommunications"
                  value={businessForm.name}
                  onChange={(e) => {
                    const compName = e.target.value;
                    const clean = compName.replace(/[^a-zA-Z0-9\s]/g, "");
                    const words = clean.split(/\s+/).filter(Boolean);
                    let baseCode = "";
                    if (words.length === 1) baseCode = words[0].slice(0, 5).toUpperCase();
                    else if (words.length >= 2) baseCode = `${words[0].slice(0, 3)}${words[1].slice(0, 2)}`.toUpperCase();
                    setBusinessForm((prev) => ({
                      ...prev,
                      name: compName,
                      code: prev.code || baseCode,
                      branchCode: prev.branchCode || (baseCode ? `${baseCode}-01` : "")
                    }));
                  }}
                  required
                />
              </label>
              <label>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Company Code</span>
                  <button
                    type="button"
                    className="btn-sm ghost-btn"
                    style={{ padding: "0 0.35rem", fontSize: "0.72rem", height: "18px" }}
                    onClick={() => {
                      const clean = (businessForm.name || "BIZ").replace(/[^a-zA-Z0-9\s]/g, "");
                      const words = clean.split(/\s+/).filter(Boolean);
                      let code = "BIZ";
                      if (words.length === 1) code = words[0].slice(0, 5).toUpperCase();
                      else if (words.length >= 2) code = `${words[0].slice(0, 3)}${words[1].slice(0, 2)}`.toUpperCase();
                      setBusinessForm((prev) => ({
                        ...prev,
                        code,
                        branchCode: prev.branchCode || `${code}-01`
                      }));
                    }}
                    title="Auto-derive code from company name"
                  >
                    ⚡ Auto
                  </button>
                </div>
                <input
                  placeholder="e.g. APEXM"
                  value={businessForm.code}
                  onChange={(event) => setBusinessForm({ ...businessForm, code: event.target.value.toUpperCase() })}
                  required
                />
              </label>
              <label>
                Initial Branch Name
                <input
                  placeholder="Main Branch"
                  value={businessForm.branchName}
                  onChange={(event) => setBusinessForm({ ...businessForm, branchName: event.target.value })}
                  required
                />
              </label>
              <label>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Branch Code</span>
                  <button
                    type="button"
                    className="btn-sm ghost-btn"
                    style={{ padding: "0 0.35rem", fontSize: "0.72rem", height: "18px" }}
                    onClick={() => {
                      const bCode = businessForm.code ? `${businessForm.code}-01` : "BR-01";
                      setBusinessForm((prev) => ({ ...prev, branchCode: bCode }));
                    }}
                    title="Auto-derive initial branch code"
                  >
                    ⚡ Auto
                  </button>
                </div>
                <input
                  placeholder="e.g. APEXM-01"
                  value={businessForm.branchCode}
                  onChange={(event) => setBusinessForm({ ...businessForm, branchCode: event.target.value.toUpperCase() })}
                  required
                />
              </label>
              <label>
                Admin Name
                <input
                  value={businessForm.adminName}
                  onChange={(event) => setBusinessForm({ ...businessForm, adminName: event.target.value })}
                  required
                />
              </label>
              <label>
                Admin Email
                <input
                  type="email"
                  value={businessForm.adminEmail}
                  onChange={(event) => setBusinessForm({ ...businessForm, adminEmail: event.target.value })}
                  required
                />
              </label>
              <label>
                Admin Password
                <input
                  type="password"
                  value={businessForm.adminPassword}
                  onChange={(event) => setBusinessForm({ ...businessForm, adminPassword: event.target.value })}
                  required
                />
              </label>
              <label>
                Subscription Plan
                <select
                  value={businessForm.planId}
                  onChange={(event) => setBusinessForm({ ...businessForm, planId: event.target.value })}
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.duration_value || 1} {plan.duration_unit || "month"} - PKR {Number(plan.price || plan.monthly_price).toLocaleString()})
                    </option>
                  ))}
                </select>
              </label>
              <div className="full-span row-actions">
                <button className="primary-btn">Create Business</button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Businesses" subtitle="Enable or disable customer accounts and inspect company codes.">
            <div className="toolbar wrap" style={{ marginBottom: "1rem" }}>
              <input
                style={{ minWidth: "180px", flex: 1 }}
                value={businessSearch}
                onChange={(e) => {
                  setBusinessSearch(e.target.value);
                  setBusinessPage(1);
                }}
                placeholder="🔍 Search company name or code..."
              />
              {businessSearch && (
                <button
                  type="button"
                  className="secondary-btn btn-sm"
                  onClick={() => {
                    setBusinessSearch("");
                    setBusinessPage(1);
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {(() => {
              const filtered = businesses.filter((b) => {
                if (!businessSearch.trim()) return true;
                const q = businessSearch.toLowerCase();
                return (
                  (b.name && b.name.toLowerCase().includes(q)) ||
                  (b.code && b.code.toLowerCase().includes(q))
                );
              });
              const totalPages = Math.max(1, Math.ceil(filtered.length / businessPageSize));
              const currentPage = Math.min(businessPage, totalPages);
              const start = (currentPage - 1) * businessPageSize;
              const paginated = filtered.slice(start, start + businessPageSize);

              return (
                <>
                  <div className="stack-list">
                    {paginated.length === 0 ? (
                      <p className="muted" style={{ padding: "1rem" }}>No businesses found.</p>
                    ) : (
                      paginated.map((business) => (
                        <div className="list-row" key={business.id}>
                          <div>
                            <strong>{business.name}</strong>
                            <p>{business.code} | {business.is_active ? "Enabled" : "Disabled"}</p>
                          </div>
                          <ToggleSwitch
                            checked={Boolean(business.is_active)}
                            onChange={() => toggleBusiness(business)}
                            onLabel="Enabled"
                            offLabel="Disabled"
                            size="sm"
                          />
                        </div>
                      ))
                    )}
                  </div>

                  <PaginationBar
                    page={currentPage}
                    pageSize={businessPageSize}
                    total={filtered.length}
                    totalPages={totalPages}
                    onPageChange={(p) => setBusinessPage(p)}
                    onPageSizeChange={(s) => {
                      setBusinessPageSize(s);
                      setBusinessPage(1);
                    }}
                  />
                </>
              );
            })()}
          </SectionCard>
        </div>
      ) : null}

      {/* ======================================================== */}
      {/* 2. SUB-PAGE: BRANCHES (COMPANY ADMIN) */}
      {/* ======================================================== */}
      {isBusinessAdmin && currentSubPage === "branches" ? (
        <div className="branches-admin-grid">
          <SectionCard title="Add Branch" subtitle="Open a new store outlet or warehouse under your company.">
            <form className="form-grid" onSubmit={createBranch}>
              <label>
                <span>Branch Name</span>
                <input
                  placeholder="e.g. Liberty Market Branch"
                  value={branchForm.name}
                  onChange={(e) => {
                    const bName = e.target.value;
                    const bizPrefix = branches[0]?.code?.split("-")[0] || "BR";
                    const autoCode = `${bizPrefix}-${String(branches.length + 1).padStart(2, "0")}`;
                    setBranchForm((prev) => ({
                      ...prev,
                      name: bName,
                      code: prev.code || autoCode
                    }));
                  }}
                  required
                />
              </label>
              <label>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Branch Code</span>
                  <button
                    type="button"
                    className="btn-sm ghost-btn"
                    style={{ padding: "0 0.35rem", fontSize: "0.72rem", height: "18px" }}
                    onClick={() => {
                      const bizPrefix = branches[0]?.code?.split("-")[0] || "BR";
                      setBranchForm((prev) => ({
                        ...prev,
                        code: `${bizPrefix}-${String(branches.length + 1).padStart(2, "0")}`
                      }));
                    }}
                    title="Auto-derive branch code based on company code"
                  >
                    ⚡ Auto
                  </button>
                </div>
                <input
                  placeholder="e.g. LBT-02"
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                  required
                />
              </label>
              <label className="full-span">
                Address
                <input
                  placeholder="Shop #, Plaza, City"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                />
              </label>
              <div className="full-span row-actions">
                <button className="primary-btn">Create Branch</button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Store Branches" subtitle="Your active store locations and subscription statuses.">
            <div className="toolbar wrap" style={{ marginBottom: "1rem" }}>
              <input
                style={{ minWidth: "180px", flex: 1 }}
                value={branchSearch}
                onChange={(e) => {
                  setBranchSearch(e.target.value);
                  setBranchPage(1);
                }}
                placeholder="🔍 Search branches by name or code..."
              />
              {branchSearch && (
                <button
                  type="button"
                  className="secondary-btn btn-sm"
                  onClick={() => {
                    setBranchSearch("");
                    setBranchPage(1);
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {(() => {
              const filtered = branches.filter((b) => {
                if (!branchSearch.trim()) return true;
                const q = branchSearch.toLowerCase();
                return (
                  (b.name && b.name.toLowerCase().includes(q)) ||
                  (b.code && b.code.toLowerCase().includes(q)) ||
                  (b.address && b.address.toLowerCase().includes(q))
                );
              });
              const totalPages = Math.max(1, Math.ceil(filtered.length / branchPageSize));
              const currentPage = Math.min(branchPage, totalPages);
              const start = (currentPage - 1) * branchPageSize;
              const paginated = filtered.slice(start, start + branchPageSize);

              return (
                <>
                  <div className="stack-list">
                    {paginated.length === 0 ? (
                      <p className="muted" style={{ padding: "1rem" }}>No branches found.</p>
                    ) : (
                      paginated.map((b) => (
                        <div
                          className="list-row"
                          key={b.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.85rem 0"
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <strong style={{ fontSize: "1.02rem" }}>{b.name}</strong>
                              <span className="font-mono text-muted" style={{ fontSize: "0.85rem" }}>({b.code})</span>
                            </div>
                            <p className="muted" style={{ margin: "2px 0", fontSize: "0.85rem" }}>{b.address || "No address provided"}</p>
                            <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)" }}>
                                Package: {b.plan_name || "Starter"}
                              </span>
                              {Number(b.is_active) === 0 && (
                                <span className="status-pill status-danger" style={{ fontSize: "0.75rem", padding: "2px 8px" }} title="Staff assigned to this branch cannot log in or operate">
                                  🔴 Branch Deactivated
                                </span>
                              )}
                              {b.effective_status === "active" && !b.is_expiring_soon && (
                                <span className="status-pill status-success" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                                  ● Active {b.current_period_ends_on ? `(Ends ${new Date(b.current_period_ends_on).toLocaleDateString()})` : ""}
                                </span>
                              )}
                              {b.effective_status === "trialing" && !b.is_expiring_soon && (
                                <span className="status-pill status-info" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                                  ● Trial {b.trial_ends_on ? `(${b.days_left !== null ? `${b.days_left}d left` : new Date(b.trial_ends_on).toLocaleDateString()})` : ""}
                                </span>
                              )}
                              {b.is_expiring_soon && (
                                <span className="status-pill status-warning" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                                  ⚠️ Expiring Soon ({b.days_left}d left)
                                </span>
                              )}
                              {b.effective_status === "grace" && (
                                <span className="status-pill status-warning" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                                  ⚠️ Grace Period {b.grace_ends_on ? `(Until ${new Date(b.grace_ends_on).toLocaleDateString()})` : ""}
                                </span>
                              )}
                              {b.effective_status === "expired" && (
                                <span className="status-pill status-danger" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                                  ⛔ Subscription Expired (Operational access suspended)
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0, whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              className="secondary-btn btn-sm"
                              onClick={() => openEditBranchModal(b)}
                              title="Edit branch details"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "0.4rem 0.75rem" }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="ghost-btn btn-sm"
                              style={{
                                color: "#ef4444",
                                borderColor: "rgba(239, 68, 68, 0.4)",
                                padding: "0.4rem 0.75rem",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                              onClick={() => setDeletingBranch(b)}
                              title="Delete branch"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <PaginationBar
                    page={currentPage}
                    pageSize={branchPageSize}
                    total={filtered.length}
                    totalPages={totalPages}
                    onPageChange={(p) => setBranchPage(p)}
                    onPageSizeChange={(s) => {
                      setBranchPageSize(s);
                      setBranchPage(1);
                    }}
                  />
                </>
              );
            })()}
          </SectionCard>
        </div>
      ) : null}

      {/* ======================================================== */}
      {/* 3. SUB-PAGE: USERS & STAFF MANAGEMENT */}
      {/* ======================================================== */}
      {canManageUsers && (isTopAdmin || currentSubPage === "users") ? (
        <div className="page-stack">
          {isBusinessAdmin && (
            <SectionCard title="Create Staff User" subtitle="Add store managers or cashiers and assign them to branches.">
              <form className="form-grid" onSubmit={createStaffUser}>
                <label>
                  Full Name
                  <input
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Role
                  <select
                    value={userForm.roleName}
                    onChange={(e) => setUserForm({ ...userForm, roleName: e.target.value })}
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Branch Manager</option>
                  </select>
                </label>
                <label>
                  Branch Assignment
                  <select
                    value={userForm.branchId}
                    onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value })}
                  >
                    <option value="">No branch / All</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="full-span row-actions">
                  <button className="primary-btn">Create Staff Member</button>
                </div>
              </form>
            </SectionCard>
          )}

          <SectionCard title="Staff Members & Permissions" subtitle="Manage employees, active status, individual restrictions, and password resets.">
            <div className="toolbar wrap" style={{ marginBottom: "1rem" }}>
              <input
                style={{ minWidth: "180px", flex: 1 }}
                value={staffSearch}
                onChange={(e) => {
                  setStaffSearch(e.target.value);
                  setStaffPage(1);
                }}
                placeholder="🔍 Search staff by name, email, or role..."
              />
              {staffSearch && (
                <button
                  type="button"
                  className="secondary-btn btn-sm"
                  onClick={() => {
                    setStaffSearch("");
                    setStaffPage(1);
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {(() => {
              const filtered = users.filter((u) => {
                if (!staffSearch.trim()) return true;
                const q = staffSearch.toLowerCase();
                return (
                  (u.full_name && u.full_name.toLowerCase().includes(q)) ||
                  (u.email && u.email.toLowerCase().includes(q)) ||
                  (u.role_name && u.role_name.toLowerCase().includes(q))
                );
              });
              const totalPages = Math.max(1, Math.ceil(filtered.length / staffPageSize));
              const currentPage = Math.min(staffPage, totalPages);
              const start = (currentPage - 1) * staffPageSize;
              const paginated = filtered.slice(start, start + staffPageSize);

              return (
                <>
                  <div className="table-wrap" style={{ overflowX: "auto", width: "100%" }}>
                    <table style={{ minWidth: "680px", width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ minWidth: "160px", whiteSpace: "nowrap" }}>User</th>
                          <th style={{ minWidth: "120px", whiteSpace: "nowrap" }}>Role</th>
                          <th style={{ minWidth: "120px", whiteSpace: "nowrap" }}>Branch</th>
                          <th style={{ minWidth: "95px", whiteSpace: "nowrap" }}>Status</th>
                          <th style={{ minWidth: "140px", textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: "center", padding: "1.5rem" }} className="muted">
                              No staff members found.
                            </td>
                          </tr>
                        ) : (
                          paginated.map((user) => {
                            const isSuperAdmin = user.role_name === "business_super_admin";
                            const isSelf = Number(user.id) === Number(context.session?.id);

                            return (
                              <tr key={user.id}>
                                <td>
                                  <strong>{user.full_name}</strong>
                                  <div className="muted">{user.email}</div>
                                </td>
                                <td>
                                  <span className={`badge ${isSuperAdmin ? "primary" : "neutral"}`} style={{ textTransform: "capitalize" }}>
                                    {isSuperAdmin ? "Company Admin" : user.role_name}
                                  </span>
                                </td>
                                <td>{branches.find((b) => b.id === user.branch_id)?.name || "All / Global"}</td>
                                <td>
                                  {isSuperAdmin || isSelf ? (
                                    <span className="badge success" title="Primary Admin accounts cannot be deactivated">
                                      🛡️ Active (Protected)
                                    </span>
                                  ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                      <ToggleSwitch
                                        checked={Boolean(user.is_active)}
                                        onChange={() => toggleUserStatus(user)}
                                        onLabel="Active"
                                        offLabel="Disabled"
                                        size="sm"
                                      />
                                      {!Boolean(user.is_active) && (
                                        <span style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 600 }} title="This staff member cannot log in and will be instructed to contact you (Company Admin)">
                                          ⛔ Inactive
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div className="row-actions" style={{ gap: "0.4rem" }}>
                                    {isSuperAdmin ? (
                                      <span className="badge muted" style={{ fontSize: "0.78rem" }} title="Company Super Admin rights are governed directly by your SaaS subscription package">
                                        📦 Package Managed
                                      </span>
                                    ) : (
                                      <>
                                        <button
                                          className="secondary-btn btn-sm"
                                          type="button"
                                          onClick={() => openEditUserModal(user)}
                                          title={`Edit details for ${user.full_name}`}
                                          style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}
                                        >
                                          ✏️ Edit
                                        </button>
                                        <button className="ghost-btn btn-sm" type="button" onClick={() => startEdit(user)}>
                                          Restrictions
                                        </button>
                                      </>
                                    )}

                                    {/* PASSWORD RESET BUTTON FOR ALL STAFF ACCOUNTS */}
                                    <button
                                      className="ghost-btn btn-sm"
                                      type="button"
                                      onClick={() => openResetPasswordModal(user)}
                                      title={`Reset password for ${user.full_name}`}
                                      style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}
                                    >
                                      🔑
                                    </button>

                                    {!isSuperAdmin && !isSelf && (
                                      <button
                                        className="ghost-btn btn-sm"
                                        type="button"
                                        onClick={() => setDeletingUser(user)}
                                        title={`Delete staff member ${user.full_name}`}
                                        style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.4)" }}
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <PaginationBar
                    page={currentPage}
                    pageSize={staffPageSize}
                    total={filtered.length}
                    totalPages={totalPages}
                    onPageChange={(p) => setStaffPage(p)}
                    onPageSizeChange={(s) => {
                      setStaffPageSize(s);
                      setStaffPage(1);
                    }}
                  />
                </>
              );
            })()}

            {editingUserId ? (
              <div
                id="user-restrictions-workspace"
                style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1.25rem", scrollMarginTop: "90px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div>
                    <h4 style={{ margin: 0 }}>
                      Custom Permissions Workspace for: <strong>{users.find((u) => u.id === editingUserId)?.full_name || "Selected Staff"}</strong>
                    </h4>
                    <p className="muted" style={{ fontSize: "0.8rem", margin: "0.25rem 0 0 0" }}>
                      Grant or revoke individual editing rights across all 50+ entity forms for this specific staff account.
                    </p>
                  </div>
                  <button className="btn-sm ghost-btn" type="button" onClick={() => setEditingUserId("")}>
                    ✕ Close
                  </button>
                </div>

                <RightsManagementUI
                  initialTargetType="user"
                  initialTargetId={editingUserId}
                  userList={users.filter((u) => u.role_name !== "top_admin" && u.role_name !== "business_super_admin")}
                  subscriptionPlanName={context.session?.subscriptionPlan?.name || "Active SaaS Plan"}
                  allowedPages={allowedPages}
                  onSaved={async () => {
                    setMessage("Staff user permissions updated and saved successfully!");
                    await refreshAdminData();
                  }}
                  onCancel={() => setEditingUserId("")}
                />
              </div>
            ) : null}
          </SectionCard>
        </div>
      ) : null}

      {/* ======================================================== */}
      {/* 4. SUB-PAGE: ROLES & PERMISSIONS */}
      {/* ======================================================== */}
      {isBusinessAdmin && currentSubPage === "roles" ? (
        <SectionCard
          title="Company Role & User Editing Rights Management"
          subtitle="Grant or revoke editing, creation, view, deletion, and export rights per form across all 50+ business entities. Supports Dense Matrix Table, Collapsible Cards, and Grouped Categories."
        >
          <RightsManagementUI
            initialTargetType="role"
            initialTargetId={selectedRoleForEdit || "manager"}
            userList={users.filter((u) => u.role_name !== "top_admin" && u.role_name !== "business_super_admin")}
            subscriptionPlanName={context.session?.subscriptionPlan?.name || "Active SaaS Plan"}
            allowedPages={allowedPages}
            onSaved={async () => {
              setMessage("Permissions updated and saved successfully!");
              await refreshAdminData();
            }}
          />
        </SectionCard>
      ) : null}

      {/* ======================================================== */}
      {/* 5. SUB-PAGE: PARTNERS & EQUITY */}
      {/* ======================================================== */}
      {isBusinessAdmin && currentSubPage === "partners" ? (
        <div className="partners-equity-grid">
          <div className="full-span">
            <SectionCard title="Company Partners" subtitle="Add equity partners at the company level.">
            <form className="form-grid" onSubmit={createPartner}>
              <label>
                Partner Name
                <input
                  placeholder="e.g. Mirza Ahmad"
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Phone
                <input
                  placeholder="0300-XXXXXXX"
                  value={partnerForm.phone}
                  onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                />
              </label>
              <label>
                CNIC
                <input
                  placeholder="35202-XXXXXXX-X"
                  value={partnerForm.cnic}
                  onChange={(e) => setPartnerForm({ ...partnerForm, cnic: e.target.value })}
                />
              </label>
              <div className="full-span row-actions">
                <button className="primary-btn">Add Partner</button>
              </div>
            </form>

            <div className="stack-list" style={{ marginTop: "1rem" }}>
              {partners.length === 0 ? (
                <p className="muted" style={{ padding: "0.5rem" }}>No company partners registered yet.</p>
              ) : (
                partners.map((p) => {
                  const netBal = Number(p.netCapitalBalance) || 0;
                  const totalInjected = Number(p.totalCapitalInjected) || 0;
                  const totalDividends = Number(p.totalDividendsPaid) || 0;
                  const totalDrawings = (Number(p.totalDrawings) || 0) + (Number(p.totalCapitalWithdrawn) || 0);

                  return (
                    <div
                      className="list-row"
                      key={p.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px",
                        padding: "12px",
                        borderBottom: "1px solid var(--border)"
                      }}
                    >
                      <div style={{ minWidth: "200px" }}>
                        <div style={{ fontWeight: "700", fontSize: "0.98rem" }}>{p.name}</div>
                        <p className="muted" style={{ margin: "2px 0 6px 0", fontSize: "0.8rem" }}>
                          {p.phone || "No phone"} {p.cnic ? `| CNIC: ${p.cnic}` : ""}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "0.76rem" }}>
                          <span
                            style={{
                              background: "#ecfdf5",
                              color: "#065f46",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: "600",
                              border: "1px solid #a7f3d0"
                            }}
                          >
                            Capital: Rs. {totalInjected.toLocaleString()}
                          </span>
                          <span
                            style={{
                              background: "#eff6ff",
                              color: "#1e40af",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: "600",
                              border: "1px solid #bfdbfe"
                            }}
                          >
                            Dividends: Rs. {totalDividends.toLocaleString()}
                          </span>
                          {totalDrawings > 0 && (
                            <span
                              style={{
                                background: "#fffbeb",
                                color: "#92400e",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: "600",
                                border: "1px solid #fde68a"
                              }}
                            >
                              Drawings: Rs. {totalDrawings.toLocaleString()}
                            </span>
                          )}
                          <span
                            style={{
                              background: "var(--card-bg, #f1f5f9)",
                              color: "var(--text-main)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: "700",
                              border: "1px solid var(--border)"
                            }}
                          >
                            Net Balance: Rs. {netBal.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="secondary-btn btn-sm"
                          onClick={() => openEditPartner(p)}
                          title="Edit partner name, phone, and CNIC details"
                        >
                          ✏️ Edit Details
                        </button>
                        <button
                          type="button"
                          className="secondary-btn btn-sm"
                          onClick={() => setSelectedPartnerForDeposit(p)}
                          title="Record capital deposit or personal drawing/withdrawal"
                        >
                          ➕ Capital In / Out
                        </button>
                        <button
                          type="button"
                          className="ghost-btn btn-sm"
                          onClick={() => setSelectedPartnerForLedger(p)}
                          title="View complete partner account ledger and transaction history"
                        >
                          📖 Ledger
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
          </div>

          {/* Configured Branch Equity Overview Table */}
          <div className="full-span" style={{ marginTop: "1.5rem" }}>
            <SectionCard
              title="Branches with Configured Dividend & Equity Shares"
              subtitle="All store branches and their registered partner dividend distribution breakdown."
            >
              <div className="table-wrap" style={{ overflowX: "auto", width: "100%" }}>
                <table style={{ minWidth: "780px", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: "130px", whiteSpace: "nowrap" }}>Branch</th>
                      <th style={{ minWidth: "130px", whiteSpace: "nowrap" }}>Code / Location</th>
                      <th style={{ minWidth: "220px", whiteSpace: "nowrap" }}>Configured Partner Equity Shares</th>
                      <th style={{ minWidth: "120px", textAlign: "right", whiteSpace: "nowrap" }}>Total Allocation</th>
                      <th style={{ minWidth: "95px", textAlign: "center", whiteSpace: "nowrap" }}>Status</th>
                      <th style={{ minWidth: "110px", textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchEquityList.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "1.5rem" }} className="muted">
                          No branches found.
                        </td>
                      </tr>
                    ) : (
                      branchEquityList.map((b) => {
                        const isSelected = String(b.id) === String(selectedBranchShares);
                        const isLastEdited = String(b.id) === String(lastEditedBranchId);
                        return (
                          <tr
                            key={b.id}
                            id={`branch-equity-row-${b.id}`}
                            className={isLastEdited ? "highlight-pulse" : ""}
                            style={{
                              background: isSelected ? "rgba(59, 130, 246, 0.08)" : "transparent",
                              transition: "background 0.3s ease"
                            }}
                          >
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <strong>{b.name}</strong>
                                {isSelected && (
                                  <span
                                    className="status-pill active"
                                    style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                                    title="Shares loaded in editor panel below"
                                  >
                                    Editing Below
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="muted">{b.code || "—"} &bull; {b.address || "Branch"}</td>
                            <td>
                              {b.shares && b.shares.length > 0 ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {b.shares.map((s) => (
                                    <span
                                      key={s.partner_id}
                                      style={{
                                        background: "var(--surface)",
                                        border: "1px solid var(--border)",
                                        padding: "3px 8px",
                                        borderRadius: "6px",
                                        fontSize: "0.82rem",
                                        fontWeight: "600"
                                      }}
                                    >
                                      🤝 {s.partner_name}: <strong style={{ color: "var(--primary)" }}>{Number(s.share_percentage).toFixed(2)}%</strong>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="muted" style={{ fontStyle: "italic", fontSize: "0.85rem" }}>
                                  No partners assigned yet
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: "700" }}>
                              <span style={{ color: b.isConfigured ? "var(--positive)" : "var(--danger)" }}>
                                {b.totalPercentage ? `${b.totalPercentage.toFixed(2)}%` : "0.00%"}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {b.isConfigured ? (
                                <span className="status-pill active" style={{ fontSize: "0.75rem" }}>100% Valid</span>
                              ) : b.totalPercentage > 0 ? (
                                <span className="status-pill warning" style={{ fontSize: "0.75rem" }}>Incomplete</span>
                              ) : (
                                <span className="status-pill inactive" style={{ fontSize: "0.75rem" }}>Not Configured</span>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="secondary-btn btn-sm"
                                style={{ padding: "4px 10px", fontSize: "0.82rem" }}
                                onClick={() => handleEditBranchShares(b.id)}
                              >
                                ✏️ Edit Shares
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          <div id="branch-shares-editor" className="full-span" style={{ scrollMarginTop: "90px", marginTop: "1.5rem" }}>
            <SectionCard
              title="Branch Dividend Shares"
              subtitle="Assign branch-specific profit distribution percentages (must equal 100%)."
            >
              <div className="toolbar wrap" style={{ justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <label style={{ flex: 1, minWidth: "220px" }}>
                  Select Branch
                  <select
                    value={selectedBranchShares}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedBranchShares(newId);
                      loadBranchShares(newId);
                    }}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code || "Branch"})
                      </option>
                    ))}
                  </select>
                </label>

                {selectedBranchShares && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "1.2rem" }}>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>Active Branch:</span>
                    <strong style={{ color: "var(--primary)", fontSize: "0.95rem" }}>
                      🏢 {branches.find((b) => String(b.id) === String(selectedBranchShares))?.name || "Selected Branch"}
                    </strong>
                  </div>
                )}
              </div>

              {isLoadingBranchShares ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  <p>Loading dividend shares for selected branch...</p>
                </div>
              ) : branchShareData.length ? (
                <div className="table-wrap" style={{ marginTop: "1rem" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Partner</th>
                        <th>Dividend Share (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchShareData.map((share) => (
                        <tr key={share.partner_id}>
                          <td>
                            <strong>{share.partner_name}</strong>
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={share.share_percentage}
                                onChange={(e) => updateSharePercentage(share.partner_id, e.target.value)}
                                style={{ width: "110px", fontWeight: "600" }}
                              />
                              <span style={{ fontWeight: "600" }}>%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div
                    className="row-actions"
                    style={{
                      marginTop: "1.25rem",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "1rem",
                      padding: "0.75rem 1rem",
                      background: "var(--surface-hover, rgba(0,0,0,0.02))",
                      borderRadius: "8px",
                      border: "1px solid var(--border)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontWeight: "700",
                          fontSize: "0.98rem",
                          color: Math.abs(currentShareTotal - 100) < 0.01 ? "var(--positive)" : "var(--danger)"
                        }}
                      >
                        Total: {currentShareTotal.toFixed(2)}% {Math.abs(currentShareTotal - 100) < 0.01 ? "✓ Valid (100%)" : `(Must equal 100%)`}
                      </span>
                      {branchShareData.length > 1 && (
                        <button
                          type="button"
                          className="secondary-btn btn-sm"
                          onClick={() => {
                            const even = (100 / branchShareData.length).toFixed(2);
                            const remainder = (100 - (parseFloat(even) * branchShareData.length)).toFixed(2);
                            setBranchShareData((current) =>
                              current.map((item, idx) => ({
                                ...item,
                                share_percentage: idx === 0 ? (parseFloat(even) + parseFloat(remainder)).toFixed(2) : even
                              }))
                            );
                          }}
                          title="Distribute 100% equally among all partners"
                        >
                          ⚖️ Even Split
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => {
                          smoothScrollTo(`branch-equity-row-${selectedBranchShares}`, { offset: 130, delay: 60 });
                        }}
                      >
                        ↑ Return to Table
                      </button>
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={saveBranchShares}
                        disabled={isSavingBranchShares || (Math.abs(currentShareTotal - 100) > 0.01 && currentShareTotal !== 0)}
                      >
                        {isSavingBranchShares ? "Saving Shares..." : "💾 Save Branch Shares"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ marginTop: "1rem" }}>
                  {partners.length === 0 ? "Add partners in the Company Partners section above first." : "No partners available."}
                </p>
              )}
            </SectionCard>
          </div>
        </div>
      ) : null}

      {/* ======================================================== */}
      {/* 6. SUB-PAGE: COMPANY PROFILE & LOGO (NEW) */}
      {/* ======================================================== */}
      {isBusinessAdmin && currentSubPage === "company" ? (
        <SectionCard
          title="Company Profile & Branding"
          subtitle="Manage your official company logo, contact information, tax identifiers, and print invoice branding in a unified panel."
        >
          <form onSubmit={saveCompanyDetails}>
            {/* UNIFIED COMPANY LOGO & BRANDING ROW */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                padding: "1.25rem",
                background: "var(--surface-hover, rgba(0,0,0,0.02))",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                marginBottom: "1.5rem",
                flexWrap: "wrap"
              }}
            >
              {/* Logo Preview Box: Displays previously uploaded logo if added any, or left blank otherwise */}
              <div
                style={{
                  width: "130px",
                  height: "130px",
                  borderRadius: "10px",
                  border: logoPreview || companyForm.logoUrl ? "1px solid var(--border)" : "2px dashed var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                  flexShrink: 0
                }}
              >
                {logoPreview || companyForm.logoUrl ? (
                  <img
                    src={logoPreview || companyForm.logoUrl}
                    alt="Company Logo Preview"
                    style={{ width: "100%", height: "100%", objectFit: "contain", padding: "6px" }}
                  />
                ) : (
                  /* Left blank otherwise as requested */
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "var(--bg, transparent)"
                    }}
                  />
                )}
              </div>

              <div style={{ flex: 1, minWidth: "240px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.25rem",
                      fontWeight: "800",
                      color: "var(--primary)",
                      letterSpacing: "-0.01em"
                    }}
                  >
                    Official Company Logo
                  </h3>
                  {logoPreview || companyForm.logoUrl ? (
                    <span className="status-pill active" style={{ fontSize: "0.75rem" }}>Logo Attached</span>
                  ) : (
                    <span className="status-pill inactive" style={{ fontSize: "0.75rem" }}>No Logo Attached</span>
                  )}
                </div>

                <p className="muted" style={{ margin: "2px 0 0.85rem 0", fontSize: "0.85rem" }}>
                  {logoPreview || companyForm.logoUrl
                    ? "Official company logo. Appears on printed customer invoices, top navigation bar, and business intelligence reports."
                    : "No logo uploaded yet. Upload your official company logo to brand customer invoices, receipts, and reports (or leave blank)."}
                </p>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <label className="primary-btn btn-sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>📁 {logoPreview || companyForm.logoUrl ? "Change Logo" : "Browse Logo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      style={{ display: "none" }}
                    />
                  </label>
                  {(logoPreview || companyForm.logoUrl) && (
                    <button
                      type="button"
                      className="secondary-btn btn-sm"
                      onClick={removeLogo}
                      style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                    >
                      🗑️ Remove Logo
                    </button>
                  )}
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    Supported: PNG, JPG, SVG, WebP (Max 800 KB)
                  </span>
                </div>
              </div>
            </div>

            {/* COMPANY DETAILS FORM GRID */}
            <div className="form-grid">
              <label>
                Company Name *
                <input
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  required
                />
              </label>
              <label>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Company Code</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>🔒 Locked</span>
                </div>
                <input
                  value={companyForm.code}
                  disabled
                  readOnly
                  style={{
                    background: "var(--bg, #f1f5f9)",
                    cursor: "not-allowed",
                    opacity: 0.85,
                    fontWeight: "700"
                  }}
                  title="Company code cannot be modified once company is created"
                />
              </label>
              <label>
                Official Phone Number
                <input
                  placeholder="e.g. +92 300 1234567"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                />
              </label>
              <label>
                Official Support Email
                <input
                  type="email"
                  placeholder="support@mycompany.com"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                />
              </label>
              <label className="full-span">
                Store / Head Office Address
                <input
                  placeholder="e.g. Shop # 14, Hafeez Center, Gulberg III, Lahore"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                />
              </label>
              <label>
                NTN / Sales Tax ID
                <input
                  placeholder="e.g. 1234567-8"
                  value={companyForm.taxNumber}
                  onChange={(e) => setCompanyForm({ ...companyForm, taxNumber: e.target.value })}
                />
              </label>
              <label>
                Currency Symbol / Code
                <input
                  placeholder="PKR / Rs. / $"
                  value={companyForm.currency}
                  onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                />
              </label>
              <div className="full-span row-actions" style={{ marginTop: "0.5rem" }}>
                <button className="primary-btn" type="submit" disabled={isSavingCompany}>
                  {isSavingCompany ? "Saving Changes..." : "💾 Save Company Details & Logo"}
                </button>
              </div>
            </div>
          </form>
        </SectionCard>
      ) : null}

      {/* ======================================================== */}
      {/* 7. SUB-PAGE: BRAND THEMES */}
      {/* ======================================================== */}
      {(isTopAdmin || currentSubPage === "themes") && (
        <SectionCard
          title="Appearance & SaaS Brand Themes"
          subtitle={
            hasThemeAccess
              ? "Select your preferred visual theme across the platform. Themes are stored separately per user, branch, and company."
              : "Theme customization is locked for your current subscription package tier."
          }
        >
          {!hasThemeAccess && (
            <div
              className="alert warning"
              style={{
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem"
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>🔒</span>
              <div>
                <strong>Theme Customization Locked: </strong>
                <span>
                  Your current subscription package does not permit custom branding or theme changes. Please upgrade your package or contact your platform administrator to unlock themes.
                </span>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            {THEMES.map((t) => (
              <div
                key={t.key}
                onClick={() => {
                  if (!hasThemeAccess) {
                    if (context?.setError) {
                      context.setError("Theme selection is restricted to subscription packages with Theme Customization. Please upgrade your package.");
                    } else if (context?.setTheme) {
                      context.setTheme(t.key);
                    }
                    return;
                  }
                  context?.setTheme && context.setTheme(t.key);
                }}
                style={{
                  padding: "1.25rem 1rem",
                  borderRadius: "14px",
                  border: `2px solid ${context?.theme === t.key ? "var(--primary)" : "var(--border)"}`,
                  background: "var(--surface)",
                  cursor: hasThemeAccess ? "pointer" : "not-allowed",
                  opacity: hasThemeAccess ? 1 : 0.65,
                  textAlign: "center",
                  transition: "all 0.15s ease",
                  position: "relative",
                  boxShadow: context?.theme === t.key ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
                }}
                title={hasThemeAccess ? `Switch to ${t.name}` : "Theme selection locked. Upgrade subscription package to customize themes."}
              >
                {!hasThemeAccess && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      fontSize: "0.72rem",
                      fontWeight: "600",
                      background: "rgba(0, 0, 0, 0.45)",
                      padding: "2px 6px",
                      borderRadius: "8px",
                      color: "rgba(255, 255, 255, 0.85)"
                    }}
                  >
                    🔒 Locked
                  </div>
                )}
                <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>{t.label.split(" ")[0]}</div>
                <strong>{t.name}</strong>
                <p className="muted" style={{ fontSize: "0.85rem", margin: "0.35rem 0" }}>
                  {context?.theme === t.key
                    ? "✓ Active Theme"
                    : hasThemeAccess
                    ? "Click to apply"
                    : "🔒 Locked"}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ======================================================== */}
      {/* 8. MODAL: EMPLOYEE PASSWORD RESET */}
      {/* ======================================================== */}
      {resettingUser && (
        <div className="modal-backdrop" onClick={() => !isResettingPassword && setResettingUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <form onSubmit={executeResetPassword}>
              <div className="modal-header">
                <h3>🔑 Reset Employee Password</h3>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isResettingPassword}
                  onClick={() => setResettingUser(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid modal-compact-form">
                {resetSuccessMessage && <div className="alert success full-span">{resetSuccessMessage}</div>}

                <div className="full-span" style={{ background: "var(--bg-subtle, rgba(0,0,0,0.15))", padding: "0.75rem 1rem", borderRadius: "8px" }}>
                  <div style={{ fontWeight: "700", fontSize: "1rem" }}>{resettingUser.full_name}</div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {resettingUser.email} &bull; <span style={{ textTransform: "capitalize" }}>{resettingUser.role_name}</span>
                  </div>
                </div>

                <label className="full-span">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span>New Password *</span>
                    <button
                      type="button"
                      className="btn-sm ghost-btn"
                      onClick={generateRandomPassword}
                      style={{ padding: "0 0.4rem", fontSize: "0.75rem", height: "20px" }}
                    >
                      🎲 Generate Strong
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      required
                      minLength={6}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="secondary-btn btn-sm"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      title={showNewPassword ? "Hide password" : "Show password"}
                      style={{ padding: "0 0.6rem" }}
                    >
                      {showNewPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </label>

                {newPassword && (
                  <div className="full-span" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    💡 Tip: Share the new temporary password securely with the employee.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isResettingPassword}
                  onClick={() => setResettingUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isResettingPassword || !newPassword.trim()}
                >
                  {isResettingPassword ? "Updating Password..." : "Confirm & Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: EDIT BRANCH */}
      {editingBranch && (
        <div className="modal-backdrop" onClick={() => setEditingBranch(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveBranchEdit}>
              <div className="modal-header">
                <h3>Edit Branch: {editingBranch.name}</h3>
                <button type="button" className="close-btn" onClick={() => setEditingBranch(null)}>
                  ✕
                </button>
              </div>
              <div className="modal-body form-grid">
                <label>
                  <span>Branch Name *</span>
                  <input
                    value={branchEditForm.name}
                    onChange={(e) => setBranchEditForm({ ...branchEditForm, name: e.target.value })}
                    required
                  />
                </label>
                <label>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Branch Code</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>🔒 Locked</span>
                  </div>
                  <input
                    value={branchEditForm.code}
                    disabled
                    readOnly
                    style={{
                      background: "var(--bg, #f1f5f9)",
                      cursor: "not-allowed",
                      opacity: 0.85,
                      fontWeight: "700"
                    }}
                    title="Branch code cannot be edited once created"
                  />
                  <span className="muted" style={{ fontSize: "0.75rem", marginTop: "3px", display: "block" }}>
                    🔒 Branch code is permanent and cannot be edited after initial creation.
                  </span>
                </label>
                <label className="full-span">
                  <span>Branch Address</span>
                  <input
                    value={branchEditForm.address}
                    onChange={(e) => setBranchEditForm({ ...branchEditForm, address: e.target.value })}
                    placeholder="Plaza, street, city..."
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setEditingBranch(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE BRANCH */}
      {deletingBranch && (
        <div className="modal-backdrop" onClick={() => !isDeletingBranch && setDeletingBranch(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleDeleteBranch}>
              <div className="modal-header">
                <h3>Delete Branch: {deletingBranch.name}</h3>
                <button type="button" className="close-btn" disabled={isDeletingBranch} onClick={() => setDeletingBranch(null)}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "1rem" }}>
                  <h4 style={{ color: "#ef4444", margin: "0 0 0.5rem 0" }}>Confirm Branch Deletion</h4>
                  <p style={{ margin: 0, fontSize: "0.92rem" }}>
                    Are you sure you want to permanently delete branch <strong>{deletingBranch.name} ({deletingBranch.code})</strong>?
                  </p>
                  <p className="muted" style={{ fontSize: "0.82rem", margin: "0.5rem 0 0 0" }}>
                    Note: If this branch has any sales, inventory handsets, or expenses, the deletion will be rejected to protect business accounting records.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" disabled={isDeletingBranch} onClick={() => setDeletingBranch(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" style={{ background: "#ef4444", borderColor: "#dc2626" }} disabled={isDeletingBranch}>
                  {isDeletingBranch ? "Deleting..." : "Delete Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER DETAILS */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveUserEdit}>
              <div className="modal-header">
                <h3>Edit Staff Member: {editingUser.full_name}</h3>
                <button type="button" className="close-btn" onClick={() => setEditingUser(null)}>
                  ✕
                </button>
              </div>
              <div className="modal-body form-grid">
                <label>
                  <span>Full Name *</span>
                  <input
                    value={userEditForm.fullName}
                    onChange={(e) => setUserEditForm({ ...userEditForm, fullName: e.target.value })}
                    required
                  />
                </label>
                <label>
                  <span>Login Email * (Editable)</span>
                  <input
                    type="email"
                    value={userEditForm.email}
                    onChange={(e) => setUserEditForm({ ...userEditForm, email: e.target.value })}
                    required
                  />
                </label>
                <label>
                  <span>Role</span>
                  <select
                    value={userEditForm.roleName}
                    onChange={(e) => setUserEditForm({ ...userEditForm, roleName: e.target.value })}
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Branch Manager</option>
                  </select>
                </label>
                <label>
                  <span>Branch Assignment</span>
                  <select
                    value={userEditForm.branchId}
                    onChange={(e) => setUserEditForm({ ...userEditForm, branchId: e.target.value })}
                  >
                    <option value="">All / Global</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full-span">
                  <span>Optional New Password (leave blank to keep current)</span>
                  <input
                    type="password"
                    placeholder="Enter new password if changing"
                    value={userEditForm.password}
                    onChange={(e) => setUserEditForm({ ...userEditForm, password: e.target.value })}
                  />
                </label>
                <label className="full-span checkbox-label">
                  <input
                    type="checkbox"
                    checked={userEditForm.isActive}
                    onChange={(e) => setUserEditForm({ ...userEditForm, isActive: e.target.checked })}
                  />
                  <span>User Account Active (Uncheck to disable access)</span>
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save User Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE USER */}
      {deletingUser && (
        <div className="modal-backdrop" onClick={() => !isDeletingUser && setDeletingUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Staff Member: {deletingUser.full_name}</h3>
              <button type="button" className="close-btn" disabled={isDeletingUser} onClick={() => setDeletingUser(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "1rem" }}>
                <h4 style={{ color: "#ef4444", margin: "0 0 0.5rem 0" }}>Confirm Staff Account Action</h4>
                <p style={{ margin: 0, fontSize: "0.92rem" }}>
                  Are you sure you want to delete or deactivate <strong>{deletingUser.full_name} ({deletingUser.email})</strong>?
                </p>
                <p className="muted" style={{ fontSize: "0.82rem", margin: "0.5rem 0 0 0" }}>
                  If this user has recorded sales, purchases, or register sessions, their account will be safely deactivated to preserve your company audit trail.
                </p>
              </div>
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" className="secondary-btn" disabled={isDeletingUser} onClick={() => setDeletingUser(null)}>
                Cancel
              </button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isDeletingUser}
                  onClick={(e) => handleDeleteUser(e, true)}
                >
                  🔒 Deactivate
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ background: "#ef4444", borderColor: "#dc2626" }}
                  disabled={isDeletingUser}
                  onClick={(e) => handleDeleteUser(e, false)}
                >
                  {isDeletingUser ? "Processing..." : "🗑️ Permanent Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PARTNER DETAILS */}
      {editingPartner && (
        <div className="modal-backdrop" onClick={() => !isSavingPartner && setEditingPartner(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSavePartnerEdit}>
              <div className="modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>✏️ Edit Partner Details</h3>
                  <p className="muted" style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>
                    Updating information for <strong>{editingPartner.name}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  disabled={isSavingPartner}
                  onClick={() => setEditingPartner(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body form-grid">
                <label>
                  <span>Partner Full Name *</span>
                  <input
                    placeholder="e.g. Mirza Ahmad"
                    value={partnerEditForm.name}
                    onChange={(e) => setPartnerEditForm({ ...partnerEditForm, name: e.target.value })}
                    required
                  />
                </label>

                <label>
                  <span>Contact Phone Number</span>
                  <input
                    placeholder="e.g. 0300-1234567"
                    value={partnerEditForm.phone}
                    onChange={(e) => setPartnerEditForm({ ...partnerEditForm, phone: e.target.value })}
                  />
                </label>

                <label>
                  <span>National ID / CNIC</span>
                  <input
                    placeholder="e.g. 35202-XXXXXXX-X"
                    value={partnerEditForm.cnic}
                    onChange={(e) => setPartnerEditForm({ ...partnerEditForm, cnic: e.target.value })}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={isSavingPartner}
                  onClick={() => setEditingPartner(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isSavingPartner}
                >
                  {isSavingPartner ? "Saving Changes..." : "Save Partner Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PARTNER DEPOSIT / WITHDRAWAL */}
      {selectedPartnerForDeposit && (
        <PartnerDepositModal
          partner={selectedPartnerForDeposit}
          branches={branches}
          onClose={() => setSelectedPartnerForDeposit(null)}
          onSuccess={(created) => {
            setSelectedPartnerForDeposit(null);
            setViewingPartnerVoucher(created);
            api.partners().then(setPartners).catch(() => {});
            setMessage(`Partner capital voucher #${created.voucherNumber || created.voucher_number} generated successfully!`);
          }}
        />
      )}

      {/* MODAL: PARTNER CAPITAL ACCOUNT LEDGER */}
      {selectedPartnerForLedger && (
        <PartnerLedgerModal
          partner={selectedPartnerForLedger}
          onClose={() => setSelectedPartnerForLedger(null)}
          onOpenVoucher={(tx) => setViewingPartnerVoucher(tx)}
        />
      )}

      {/* MODAL: PRINTABLE PARTNER TRANSACTION VOUCHER */}
      {viewingPartnerVoucher && (
        <PartnerVoucherModal
          voucher={viewingPartnerVoucher}
          onClose={() => setViewingPartnerVoucher(null)}
          shopName={companyForm?.name || context?.companyName || "DigitalMarkaz360"}
          companyLogo={companyForm?.logoUrl || context?.companyLogo || context?.session?.business_logo || context?.session?.logo_url}
        />
      )}
    </div>
  );
}
