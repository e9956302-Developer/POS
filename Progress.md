# Mobile POS — Project Progress & Accomplishments

## 1. Executive Summary

The **Mobile POS** platform is a fully realized, production-grade **Multi-Tenant SaaS Retail, Repair, and Inventory Management Platform** engineered specifically for mobile handset dealerships, electronics retail chains, and repair centers.

The application delivers an exhaustive suite of retail and ERP tools:
- **Backend**: Node.js & Express API with 20 domain modules, 37 database tables, row-level locking concurrency control, versioned migrations runner, and automated database backups.
- **Frontend**: React 18 & Vite SPA featuring responsive layouts, fixed sticky sidebar, barcode/IMEI scanning, QR sticker tag printer, pure SVG analytics charts, universal pagination, and direct WhatsApp reminders.

---

## 2. Completed Milestones & Delivered Features

### 🤝 Company Partners, Branch Equity & Dividend Distributions
- [x] **Partner Directory**:
  - Registered company partners tracking full name, CNIC, phone number, and investment equity history.
- [x] **Branch-Level Equity Allocations**:
  - Dynamic equity ownership configuration per branch.
  - Strict server-side mathematical validation requiring $\sum \text{Shares} = 100\%$ per store location.
- [x] **Branch Dividend & Profit Distributions**:
  - Dedicated Branch Dividend & Profit Sharing reporting engine (`/reports/dividends`).
  - Calculates branch Net Profit:
    $$\text{Net Profit} = \text{Gross Profit} - \text{Operating Expenses} - \text{Depreciation}$$
  - Allocates payout amounts to each partner based on their exact branch share percentage.

---

### 💳 Universal Opening Balances (Customers, Vendors & Inventory)
- [x] **Customer & Vendor Opening Balances**:
  - Full opening balance capture on party creation and edit (`opening_balance`, `opening_balance_type`, `opening_balance_date`).
  - Seamlessly incorporated into Financial Aging reports (`/reports/receivables` and `/reports/payables`).
- [x] **Non-Serialized Inventory Opening Stock**:
  - Direct opening balance capture for accessories, parts, and non-serialized items (`opening_stock_quantity`, `opening_cost_price`).
  - Automatically initializes branch stock levels upon item creation.

---

### 👥 Dedicated Salaries & Payroll Multi-Subpage Module
- [x] **Full 5-Subpage Navigation Menu**:
  1. **Staff Directory (`/employees/directory`)**: Complete employee directory with active employment status, CNIC, base salaries, and branch scoping.
  2. **Daily Attendance (`/employees/attendance`)**: Date-specific daily roll call with bulk "Mark All Present" shortcut.
  3. **Monthly Attendance Summary (`/employees/monthly-attendance`)**: Aggregated monthly working days, presents, absents, half-days, and paid leaves.
  4. **Salary Advances (`/employees/advances`)**: Short-term staff loan and salary advance ledger tracking advance amounts, payout dates, and settlement status.
  5. **Salary Disbursements & Batch Processing (`/employees/salaries` & `/employees/batch-salaries`)**: Automated payroll calculation:
     $$\text{Net Salary} = \text{Base Salary} + \text{Bonuses} - \text{Deductions} - \text{Unsettled Advances}$$
     Automatically logs operational expenses and updates cash register shifts.
- [x] **Month-Wise Previously Disbursed Salaries & Payroll Reports**:
  - **Embedded Batch History Report**: Rendered directly below the batch monthly salary processing table in `BatchMonthlySalaryForm.jsx`. If salaries were previously disbursed for the selected month (or all months), admins can view complete records itemizing base salary, bonus (+), advance deductions (-), other deductions (-), net salary paid, payment method, authorized by, and notes.
  - **Main System Reports Tab (`ReportsPage.jsx`)**: Added dedicated `💵 Salaries & Payroll` report tab with period scoping (specific month vs. all historical months), branch filtering, interactive search, CSV export, and KPI stat cards (Net Payout, Base, Bonuses, Advances, Deductions, Staff Paid).
  - **Printable Salary Voucher Slips (`SalaryVoucherModal.jsx`)**: Reusable modal rendering official, branded salary payment slips with line items, audited manual overrides, employee/manager signature lines, and one-click print (`window.print()`).

---

### ✏️ Universal Editing, Order Correction & Role-Based CRUD Permissions
- [x] **Store Branch Editing & Safe Deletion**:
  - Direct inline Edit modal allowing updates to branch name, unique branch code, and street address.
  - Safe deletion (`DELETE /api/branches/:id`) guarded by checks ensuring no existing sales, purchases, or inventory records are orphaned.
- [x] **Staff & User Details Editing**:
  - Company Admin can edit staff full name, email (with typo correction, format validation, and uniqueness checks), assigned role, branch, password reset, and active status toggle.
  - Custom permissions dialog for per-user permission overrides.
  - Safe user deactivation or permanent deletion for accounts without financial records.
- [x] **Sales & Purchases Line-Item Editing (Order Correction)**:
  - Dedicated **"✏️ Edit Bill & Products"** modal (`InvoicesPage.jsx`) accessible from both invoice card details and the invoice directory.
  - Real-time line-item editor with barcode/IMEI scanning, unit price adjustments, quantities, and payment adjustments.
  - Full IMEI reconciliation: replaced/removed handsets automatically restored to `in_stock`, newly selected handsets set to `sold`.
  - Non-serialized accessory stock reconciliation: quantity deltas automatically adjust branch `product_stocks`.
  - Purchase order editing: updates procurement costs, adds new IMEI units, and blocks removing any handset that has already been sold.
- [x] **Granular Role-Based Permissions Matrix**:
  - 4-action permission matrix (`view`, `create`, `edit`, `delete`) across all modules: Sales, Purchases, Invoices, Branches, Users, Inventory, Parties, Expenses, Repairs, and Employees.
  - Configurable by Company Admin per role (`business_role_permissions`) and per user (`user_permissions`).
  - Cashiers are restricted from editing and deleting sales/purchases by default, preventing unauthorized alteration of finalized bills.
- [x] **Enterprise Rights Management UI Workspace (`RightsManagementUI.jsx`)**:
  - Dedicated administrative permissions cockpit supporting **50+ business entity forms** across 7 operational domains (Sales, Inventory, Finance, Staff, Technical, Analytics, Store Settings).
  - **Tri-Layout Architecture**:
    - **Dense Matrix Table**: Frozen sticky column for form names and sticky headers, compact toggle pills with color-coded states (Green = Granted, Muted = Denied, Amber = Modified).
    - **Collapsible Cards Grid**: Responsive multi-column cards with expandable rights trays and per-card bulk toggles.
    - **Grouped Categories Accordion**: Domain-level accordions with category progress meters and section-wide bulk controls.
  - **Search & Filtering**: Live search by form name, category domain chips (`All`, `Sales & Orders`, `Inventory`, `Financial`, `Staff`, etc.), and status filters (`Modified Only`, `Granted Only`, `Denied Only`).
  - **Bulk Actions**: Per-form `All`/`None` shortcuts, global `Grant All`, `Revoke All`, `Invert Selection`, and `Reset to Initial`.
  - **Copy Rights Utility**: Modal to duplicate entire rights configurations from other roles (Manager, Cashier) or specific staff users.
  - **Review & Diff Summary Modal**: Pre-save verification dialog showing exact before/after diffs (`+Granted`, `-Revoked`) before persisting to the database.
  - **Modular Service Layer (`rightsManagementService.js`)**: Implements `getForms()`, `getRights()`, and `saveRights()` connected to live backend APIs.
- [x] **Universal Auto-Scroll & Visual Cue Navigation (`scroll.js`)**:
  - Automatically and smoothly scrolls down to target workspaces, editors, and detail views upon action triggers:
    - **Staff Restrictions Button**: Clicking `Restrictions` on any staff row in the Users table automatically smooth-scrolls down to the `#user-restrictions-workspace` with an offset compensating for sticky navigation headers.
    - **Branch Dividend Shares**: Clicking `✏️ Edit Shares` on any store branch auto-scrolls down to `#branch-shares-editor`.
    - **Invoice & Thermal Receipt Preview**: Clicking `View` on any invoice in the billing directory table auto-scrolls down to `#invoice-details-view`.
    - **Handset IMEI Traceability**: Clicking `Trace` on any serialized handset row auto-scrolls down to `#imei-traceability-card`.
    - **Inter-Branch Stock Transfers**: Clicking `Details` on any transfer row auto-scrolls down to `#transfer-details-card`.
  - **Visual Cue Pulse Animation (`.highlight-pulse`)**: Applies a soft, glowing 1.8-second focus pulse to the targeted section so the user's attention is immediately oriented.

---

### 🔁 Universal CRUD & Edit/Delete Parity Across All Modules
- [x] **Expenses**: Full Create, Read, Edit (`PUT /api/expenses/:id`), and Void/Soft-delete (`DELETE /api/expenses/:id`) with real-time UI modal and cash register exclusion.
- [x] **Parties (Customers & Vendors)**: Create, Read, Edit (`PUT /api/parties/:id`), and Safe Delete (`DELETE /api/parties/:id`) with active transaction verification.
- [x] **Mobile Models**: Create, Read, Edit (`PUT /api/models/:id`), and Safe Delete (`DELETE /api/models/:id`) guarded by inventory IMEI dependencies.
- [x] **Product Categories**: Create, Read, Edit (`PUT /api/products/categories/:id`), and Safe Delete (`DELETE /api/products/categories/:id`).
- [x] **Products & Accessories**: Create, Read, Edit (`PUT /api/products/:id`), Stock Adjustments, and Safe Deactivation (`DELETE /api/products/:id`).
- [x] **Repairs**: Create, Read, Status Transition, Update, and Cancellation (`DELETE /api/repairs/:id`).

---

### 🛡️ Security Hardening & Session Management
- [x] **Immediate Token Invalidation**:
  - `requireAuth` verifies user `is_active = 1` on every authenticated request. Deactivated users are instantly rejected with HTTP 401.
- [x] **Frontend 401 Auto-Logout Interceptor**:
  - Global interceptor catches HTTP 401, clears stored JWT token and user profile, and immediately redirects the browser to `/login`.
- [x] **SQL Injection Defense**:
  - Parameterized queries across all endpoints; fixed `mysql2` named parameter duplication caveats by generating unique parameter keys (`:search1`, `:search2`).
- [x] **Cash Register Data Integrity**:
  - Excluded soft-deleted expenses (`AND COALESCE(is_deleted, 0) = 0`) from cash register calculations to prevent cash leakage.

---

### 🏷️ QR-Based Tag Printing for Purchased Cell Phones
- [x] **Adhesive Sticker Label Generation**:
  - Automatically prints retail tags for purchased handsets immediately after purchase order submission or on-demand from inventory.
  - Tag includes: **Company Name**, **Device Model & Specs**, **Scannable QR Code** (encoding IMEI & details), **IMEI 1 / Serial**, and **Cost or Retail Price**.
  - Built with zero-dependency pure SVG QR rendering (`qrcode.jsx`) and print-optimized CSS for 50x30mm thermal label rolls and multi-label sticker sheets.

---

### ↩️ Sale Return & Purchase Return Workflows
- [x] **Sale Returns (Customer Refunds)**:
  - Return sold mobile handsets or accessories directly from the invoice directory or dedicated return modal (`ReturnOrderModal.jsx`).
  - Restocks units to `in_stock` (or flags as damaged/defective), reverses customer receivables, and records refund payouts.
- [x] **Purchase Returns (Vendor Returns)**:
  - Return defective or unsold stock back to suppliers.
  - Reverses inventory counts and adjusts vendor accounts payable.
- [x] **Integrated Return Actions**:
  - Direct "↩️ Return" buttons on individual invoice rows and detailed invoice cards.

---

### 🔧 Device Repairs & Warranty Ticketing Module
- [x] **Repair Intake & Diagnostic Lifecycle**:
  - Full tracking stages: `received` $\rightarrow$ `diagnosing` $\rightarrow$ `waiting_parts` $\rightarrow$ `repaired` $\rightarrow$ `delivered` $\rightarrow$ `cancelled`.
  - Captures customer name/phone, device model, IMEI/serial, defect description, estimated cost, advance deposit, and assigned technician.
- [x] **Warranty Claim Management**:
  - Configurable warranty duration (e.g. 30, 60, 90 days); automatically computes `warranty_until` date upon delivery.
- [x] **Customer WhatsApp Update Alerts**:
  - One-click WhatsApp notification button informing the customer that their phone is repaired and ready for pickup with outstanding balance details.
- [x] **Printable Repair Claim Slips**:
  - Intake voucher for customer claim receipt at drop-off.

---

### 📈 Business Intelligence & Dedicated Reports Page
- [x] **Inventory Valuation & Stock Health**:
  - Instant calculation of total stock units, cost valuation, retail valuation, and projected gross profit margins.
  - Donut chart breakdown of handset stock across manufacturers/brands.
- [x] **Customer Receivables Aging**:
  - Aging accounts ledger with balance amounts, due dates, and overdue status tags.
  - Direct **"💬 WhatsApp"** payment reminder button pre-filling customer name, invoice number, balance due, and shop name.
- [x] **Supplier Payables Ledger**:
  - Upcoming procurement debt schedule by supplier.
- [x] **Revenue & Sales Trajectory Charts**:
  - Pure SVG animated bar charts tracking recent daily turnover.

---

### 🧾 Thermal POS Receipts & Universal Data Export
- [x] **58mm / 80mm Thermal Receipt Layout**:
  - Dedicated monospace thermal receipt print layout in `InvoicesPage.jsx` for roll printers alongside standard A4 invoices.
- [x] **Universal CSV / Excel Export**:
  - Downloadable CSV data with UTF-8 BOM across: Invoices, Inventory, Purchases, Expenses, Parties, Employees, and Reports.

---

### 🛠️ Database Migrations & Automated Backups
- [x] **Versioned Migrations Runner**:
  - CLI script `npm run migrate` (`backend/src/db/migrate.js`) tracking applied SQL files in `schema_migrations`.
- [x] **Automated Database Backup Utility**:
  - CLI script `npm run backup` (`backend/src/db/backup.js`) generating complete, standalone timestamped SQL dumps of all 37 database tables to `backend/backups/`.

---

### 🏢 SaaS Platform & Top Admin Administration
- [x] **Global SaaS Dashboard**: Platform-level KPI counters tracking active businesses, branches, subscription revenues, and system health.
- [x] **Business & Branch Management**: Full CRUD for tenant businesses and store branches with active/inactive toggles.
- [x] **Subscription Packages & Entitlements**: Configurable pricing tiers with page-by-page feature gating (`allowed_pages`).
- [x] **Manual Payment Verification**: Top Admin workflow for reviewing and approving subscription payments with automatic period extensions.
- [x] **Deleted Transactions & Audit Recovery**: Unified audit trail with one-click restoration of voided sales, purchases, and expenses.

---

### 💵 Payroll, Salary Restrictions & Financial Statement Reports
- [x] **Strict Duplicate Salary Restriction**:
  - Prevents disbursing salary for an already paid month (`employee_id` + `salary_month`).
  - Pre-check validation in `POST /api/employees/salaries/pay` returning HTTP 400 Bad Request with details of the previous payment date, net amount, and payment method.
  - Replaced duplicate overwrite with clean `INSERT`, fully backed by database constraint `UNIQUE KEY uniq_emp_month (employee_id, salary_month)`.
  - Monthly attendance table checks `is_salary_paid` and renders `✅ Paid Rs. [amount]` badge with date and method, disabling duplicate payment attempts.
  - Salary Disbursement Modal displays a red restriction banner and disables submission if the employee has already been paid for that month.
- [x] **Comprehensive Payroll & Advances History & Statement Reports**:
  - `GET /api/employees/history`: Returns detailed records of all salary disbursements and cash advances with summary KPIs (net salaries paid, base+bonuses, advances deducted, advances granted, pending unrecovered balance) and per-employee breakdown.
  - Dedicated **Per-Employee Financial Statement Card**: Displays employee details, net paid to date, outstanding advance balance, and visual **Paid Months Badges** (`✅ YYYY-MM`) showing every month previously disbursed.
  - 4 View Modes in Payroll Suite:
    1. `📑 Consolidated Financial Ledger`: Chronological timeline of all salaries paid, advances granted, and advances recovered with running amounts.
    2. `💵 Salaries Paid History`: Detailed salary vouchers with base, bonus, advance deducted, other deductions, net paid, and printable slips.
    3. `💳 Advances & Loans History`: Status tracking for pending vs recovered advances with deduction month.
    4. `👥 Per-Staff Breakdown`: Matrix of every employee with total paid, list of paid months, and one-click statement inspection.
  - **Printable Salary Voucher / Slip Modal**: Official voucher slip with company header, employee details, complete financial breakdown, remarks, and signature spaces.
  - **CSV Export**: One-click CSV statement export for both general payroll and per-employee records.

- [x] **Unified Monthly Salary Form (Single-Screen with Prefilled & Admin-Editable Fields)**:
  - **Single Screen Form Component** ([`MonthlySalaryForm.jsx`](file:///c:/Users/engra/Desktop/POS/frontend/src/components/MonthlySalaryForm.jsx)): All fields presented together on one single screen with no multi-step wizard or separate dialogs.
  - **The 4 Core Fields**:
    1. **Bonus**: Number field prefilled from employee monthly incentive records (defaults to 0).
    2. **Advance**: Number field prefilled from outstanding unrecovered advances to be deducted (defaults to 0).
    3. **Computed Salary**: Number field prefilled with $\text{Base Salary} + \text{Bonus} - \text{Advance}$. Live recalculates whenever Bonus, Advance, or Base Salary changes; admin can directly override.
    4. **Net Salary**: Number field prefilled with $\text{Computed Salary} - \text{Deductions}$ (tax / statutory / attendance). Live recalculates whenever Computed Salary changes; admin can directly override.
  - **Live Recalculation & Override Locking**:
    - Editing `Bonus` or `Advance` recalculates `Computed Salary` and `Net Salary` in real time.
    - Directly typing over `Computed Salary` locks it to manual override and updates `Net Salary` live.
    - Directly typing over `Net Salary` locks it to manual override.
    - Small hint with the auto-computed value (`"computed: Rs. X"`) appears next to any overridden field with a `[↺ Reset]` button to unlock and revert to the auto-computed formula value.
    - Discrepancy between manual Net Salary and auto-computed formula displays an amber warning banner (warns, does not block save).
  - **Audit Metadata & Persistence**:
    - Persists `computed_salary`, `net_salary`, `created_by`, `updated_by`, timestamps, and `overridden_fields` (JSON array of overridden field names) to database.
    - Added columns to `employee_salaries` (`computed_salary DECIMAL(12,2)`, `overridden_fields JSON`, `updated_by INT`, `updated_at TIMESTAMP`).
  - **Edge Cases & Strict Validations**:
    - All amounts validated $\ge 0$.
    - New month with no bonus/advance records defaults to 0 and computes directly from base salary.
    - Employee with no base salary configured blocks save with a clear error message.
    - Duplicate disbursement for an already paid month remains strictly prohibited.
  - **Integrated Everywhere**:
    - Accessible directly via `"⚡ Disburse Monthly Salary"` button in the Payroll Tab.
    - Accessible via `"Pay Salary"` buttons across Monthly Attendance and Staff Directory.
    - Updated Salary Voucher Slip to display Computed Salary and audit notice for manual overrides.

- [x] **Batch Monthly Salary Table Form (All Employees at Once)**:
  - **Dedicated Full Batch Processing Screen** ([`BatchMonthlySalaryForm.jsx`](file:///c:/Users/engra/Desktop/POS/frontend/src/components/BatchMonthlySalaryForm.jsx)): One comprehensive interactive table where the admin processes monthly salary for all employees simultaneously.
  - **Top Bar Controls**:
    - Month/Year selector (`YYYY-MM`) with auto-reloading of all employee records for that month.
    - Real-time search box (filter by employee name or ID) and Department / Designation filter dropdown.
    - Top and bottom **"Save All"** buttons showing live count of eligible employees.
  - **Table Columns (One Row per Employee)**:
    1. **Employee**: Name + ID badge (`#ID`) + designation pill (read-only).
    2. **Base Salary**: Read-only from employee record. If missing/0, displays red error badge `⛔ No Base Salary`, highlights row, excludes from totals, and blocks save.
    3. **Bonus**: Number input prefilled from monthly records (default 0). Live-recalculates Net Salary.
    4. **Advance**: Number input prefilled from outstanding advances (default 0). Live-recalculates Net Salary.
    5. **Deductions**: Tax / statutory / attendance absent deductions.
    6. **Net Salary**: **Non-editable auto-calculated display** ($\text{Base} + \text{Bonus} - \text{Advance} - \text{Deductions}$). Recalculates dynamically in real time and cannot be overridden manually.
    7. **Status**: Shows `auto` (default calculation), `adjusted` (modified bonus/advance with per-row `[↺]` reset button), `✅ Paid` (already disbursed), or `⛔ Blocked`.
  - **Removal of Computed Salary Column & Non-Editable Net Salary**:
    - Removed intermediate "Computed Salary" column from employee batch payroll table and single salary processing form.
    - Simplified salary formula across UI to direct calculation:
      $$\text{Net Salary} = \text{Base Salary} + \text{Bonus} - \text{Advance} - \text{Deductions}$$
    - Made Net Salary field strictly non-editable (styled auto-calculated value) across both `BatchMonthlySalaryForm` and `MonthlySalaryForm`.
    - Removed Computed Salary intermediate row from salary payment voucher slip.
  - **Bulk Actions**:
    - **"Apply Bonus to All"**: Sets a uniform bonus across all eligible visible rows and recalculates net salary live.
    - **"Copy 1st Row Bonus to All"**: Copies the first employee's bonus to all visible rows with live recalculation.
    - **"Reset All Adjustments"**: One-click restoration of all rows to standard formula computations.
  - **Totals Footer Row**:
    - Real-time sums for Base, Bonus, Advance, Deductions, and Net Salary columns (8 columns aligned).
    - Accurately excludes employees with missing base salary and already-paid records from the payout total.
  - **Strict All-or-Nothing Validation**:
    - Validates all amounts $\ge 0$ and base salary configured.
    - If ANY row fails, highlights offending rows in red, shows a summary alert ("X rows need fixing"), and rejects saving partially — preserving transactional data integrity.
  - **Batch Backend Endpoints & Transaction**:
    - `GET /api/employees/batch-salary-preview?month=YYYY-MM`: Fetches prefilled metrics, advances, attendance deductions, and duplicate statuses for all employees in scope.
    - `POST /api/employees/salaries/batch-pay`: Atomic transaction executing all insertions into `employee_salaries` with `computed_salary`, `overridden_fields`, updates advances to `deducted`, and logs operational expenses in `expenses`.
  - **High Performance In-Memory Pagination**:
    - Configurable page size (`10 | 25 | 50 | 100 | All`) ensuring smooth 60fps table interactions while preserving in-memory edits across pages so "Save All" accurately commits the entire batch.

---

### 💵 Cash Register & Shift Reconciliation
- [x] **Shift Session Lifecycle**:
  - Opening cash declaration.
  - Continuous real-time calculation:
    $$\text{Expected Cash} = \text{Opening Cash} + \text{Cash In} - \text{Cash Out} - \text{Operating Expenses}$$
  - Closing cash counting with discrepancy tracking and store manager verification.

---

### 📦 SaaS Subscription Packages & Branch Limits Management
- [x] **Configurable Allowed Branches Limit (`max_branches`)**:
  - Super Admins can configure the number of store branches permitted per package (`0 = Unlimited`, or any integer $\ge 1$).
  - Modal 1 (Create / Edit / Clone Package Form) includes dedicated `Allowed Branches (Outlets Limit)` input field with live explanation label.
  - Subscription packages table displays `🏢 Allowed Branches` status pill (`🏢 Unlimited` or `🏢 X Branch(es)`).
  - Selected package module header displays the allowed branch count badge.
  - Package selection dropdowns across Assign Package Modal and Company Provisioning display allowed branches alongside duration and price.
  - Backend `POST` and `PUT` `/api/admin/subscription-plans` preserve `0` (unlimited) without falsy coercion.
- [x] **Responsive Table Width & Sticky Actions**:
  - Subscription Packages and Subscriptions tables feature fluid, self-adjusting column widths fitting 100% of the available card width.
  - Clamped package description to 1 line with full-text hover tooltips, avoiding horizontal table blowouts.
- [x] **Company Name Display & Top Navigation Layout**:
  - Removed duplicate company name panel showing separately on the top bar above the notification space, keeping the single clean company heading in the Company Admin panel (`AdminPage.jsx`) at compact font size (`1.05rem`) matching the active theme.
  - Positioned both **Theme Switcher** (`🎨 Theme`) and **Direct Logout Button** (`🚪 Logout`) side-by-side on the top panel.
  - Implemented click-outside dismissal (`useRef` + document listener) for the user profile panel: clicking the user chip toggles the dropdown, and clicking anywhere else on the page immediately dismisses it, while keeping it open if interacted with inside.
- [x] **Partners & Equity Layout Proportions**:
  - Re-proportioned the `Admin: Partners & Equity` layout (`.partners-equity-grid`) to allocate ~65% width to **"Company Partners"** and ~35% width to **"Branch Dividend Shares"** (`minmax(0, 1.85fr) minmax(300px, 1fr)`).
  - Gives partner financial ledger summaries, capital injections, dividends, and action buttons ample room while keeping the 2-column branch dividend percentage table compact and tidy.

- [x] **Branch Shares Navigation & Bidirectional Auto-Scroll**:
  - Clicking `✏️ Edit Shares` on any store branch in the **"Branches with Configured Dividend & Equity Shares"** table immediately loads the branch's partner shares into state, activates the editor, and smoothly auto-scrolls down to the **"Branch Dividend Shares"** panel (`#branch-shares-editor`).
  - Upon saving the shares (validated to equal 100%), the system displays a confirmation notification, refreshes the overview table, and smoothly auto-scrolls back up to the exact branch row that was modified (`#branch-equity-row-${branchId}`).
  - Added dedicated `.highlight-pulse` and `tr.highlight-pulse > td` keyframe animations to give users an unmistakable, glowing focus cue on the targeted branch row upon return.

- [x] **Unified Company Profile & Logo Single-Panel Form**:
  - Merged the previously separate **"Company Branding & Logo"** and **"Company Information & Document Details"** panels into a single, cohesive **"Company Profile & Branding"** panel.
  - Automatically loads and renders the previously uploaded company logo if one exists, or leaves the preview area completely blank/clean otherwise.
  - Provided inline **Browse/Change Logo** and **Remove Logo** controls alongside the live preview box, unified with all company contact, tax, currency, and invoice footer fields under one single **"Save Company Details & Logo"** action.

- [x] **Universal Searchable Combobox Performance & In-Place Search**:
  - Transformed searchable dropdowns (`SearchableSelect.jsx`) into true in-place comboboxes: users type directly inside the dropdown input rather than inside a secondary nested input inside the menu popup.
  - Eliminated typing delay and lag by pre-computing lowercase label/value tokens, removing blocking smooth scroll animations (`scrollIntoView({ behavior: 'auto' })`), and capping rendered option nodes to 60 items.
  - Dropdown menu automatically opens on focus/click, instantly highlights matching options, and updates selection on Enter, Tab, or click.
  - Maintained full backward compatibility with native `<select>` / `<option>` children props across all modules.

---

## 3. Verification & Automated Test Status

| Component | Test Suite / Check | Result |
| :--- | :--- | :--- |
| **Backend** | `npm test` (42 unit & integration tests) | **Passed (42/42 tests, 0 failures)** |
| **Frontend** | `node --test tests/pages.test.js` (9 page smoke tests) | **Passed (9/9 tests, 0 failures)** |
| **Database Migrations** | `npm run migrate` (Migrations 001, 002, 003) | **Passed (Cleanly applied)** |
| **Database Backup** | `npm run backup` (37 tables dump) | **Passed (SQL dump created)** |
| **Frontend Production Build** | `npm run build` (`vite build`) | **Passed (Cleanly builds, 0 errors)** |

---

## 4. Current Execution & Login Credentials

- **Backend API**: Port `4000` (Node.js 20+)
- **Frontend App**: Port `5173` (Vite SPA)
- **Default Accounts**:
  - **Platform Top Admin**: `topadmin@mobilepos.local` (Password: `admin123`)
  - **Business Super Admin**: `admin@mobilepos.local` (Password: `admin123`)
