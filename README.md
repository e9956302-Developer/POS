# DigitalMarkaz360
> **Poora Karobar, Ek Markaz** (پورا کاروبار، ایک مرکز)

DigitalMarkaz360 is a web-based complete retail, wholesale, serialized inventory, billing, payroll, partner equity, and receivables management platform built for modern multi-branch commerce.

## Stack

- Backend: Node.js, Express, MySQL
- Frontend: React, Vite
- Auth: JWT
- Reports: SQL-backed dashboard/report endpoints

## Features

- IMEI-level serialized and non-serialized inventory tracking
- Purchase and sale billing with barcode/IMEI scanner
- **Full Invoice & Bill Editing**: Correct incorrect sale or purchase entries with automated IMEI and stock reconciliation
- **Branch Management & Editing**: Modify branch name, code, and address with safe deletion validation
- **Staff & User Management**: Edit employee details, email addresses, roles, and passwords
- **Granular Role Permissions**: Company admin can configure view, create, edit, and delete rights per role and per user (cashiers locked by default)
- Bulk sale orders and mixed accessory/handset checkout
- Vendor and walk-in customer support with universal opening balances
- Partial payments, credit aging, and WhatsApp payment reminders
- QR sticker tag printing for purchased mobile phones
- Sale returns and purchase returns
- Device repairs & warranty ticketing module
- Complete payroll, attendance, and salary advances ledger
- Multi-branch dividend distributions and partner equity
- Multi-branch inter-store stock transfers
- Expenses management and cash register shift reconciliations
- Dashboard for daily totals and inventory valuation
- Printable A4 invoices and 58mm/80mm thermal receipts
- Multi-tenant SaaS platform with packages and Top Admin dashboard

## Project Structure

- `backend/` Express API, SQL schema, seed data, and business logic
- `frontend/` React application

## Environment

Create `backend/.env` based on `backend/.env.example`.

## Database Setup

1. Create a MySQL database, for example `mobile_pos`.
2. Run the SQL in `backend/src/db/schema.sql`.
3. Optionally run `backend/src/db/seed.sql` for demo data.

For an existing database created before business/admin controls were added, run:

```bash
cd backend
npm run migrate:business-admin
```

## Run

Install Node.js 20+ and MySQL, then:

```bash
cd backend
npm install
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Once running, open your web browser at:
- **Web Application**: [http://localhost:5173](http://localhost:5173) (or [http://127.0.0.1:5173](http://127.0.0.1:5173))
- **Backend API**: [http://localhost:4000](http://localhost:4000)

## Default Login Credentials

Seed data creates:

- Top Admin (SaaS Super Admin): `topadmin@mobilepos.local` (or `e9956302@gmail.com`)
- Business Admin (Company Super Admin): `admin@mobilepos.local`
- Password: `admin123`

Change passwords immediately in a real deployment.

### Adding or Registering a SaaS Platform Super Admin

To register a new SaaS-only Super Admin or reset their password:

```bash
cd backend
npm run add:saas-admin <email> [password] [fullName]
```

Example:
```bash
npm run add:saas-admin admin@example.com admin123 "SaaS Platform Administrator"
```

## Deployment Guide (GitHub & Render)

### 1. Uploading to GitHub

1. Ensure Git is installed on your computer ([git-scm.com](https://git-scm.com/)).
2. Initialize and push to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit DigitalMarkaz360 production ready"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
> [!NOTE]
> `.gitignore` automatically protects your `.env` files, uploads, and local logs from being pushed to GitHub.

---

### 2. Cloud MySQL Database (Required for Render)

Render does **not** provide a native free MySQL service (Render only offers PostgreSQL). You can create a free cloud MySQL database in 2 minutes on any of these providers:
- **Aiven for MySQL** (Free tier available, provides SSL host/port/user/password)
- **TiDB Cloud Serverless** (Free 5GB MySQL-compatible database)
- **Railway** (MySQL database add-on)
- **Clever Cloud** (Free MySQL add-on)

---

### 3. Deploying to Render (Single Full-Stack Web Service)

This is the recommended, free-tier friendly method. Render serves both the built frontend SPA and the backend REST API from a single service:

1. Log into [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Name**: `digitalmarkaz360`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: *(Click Generate or paste a secure 32+ character random string)*
   - `DB_HOST`: *(Your cloud MySQL host, e.g. `mysql-xyz.aivencloud.com`)*
   - `DB_PORT`: `3306`
   - `DB_USER`: *(Your cloud MySQL username)*
   - `DB_PASSWORD`: *(Your cloud MySQL password)*
   - `DB_NAME`: `mobile_pos` *(or your database name)*
   - `DB_SSL`: `true`
   - `ENFORCE_TOP_ADMIN_MFA`: `false` *(set to `true` if you want mandatory MFA)*
6. Click **Create Web Service**.

> [!TIP]
> On the very first start, the backend automatically detects a fresh database and auto-runs `schema.sql` and `seed.sql` to initialize all tables and default administrator accounts.

### SaaS Admin User Login History & System Forensics

The SaaS Super Admin panel includes real-time and historical tracking of all user authentications:
- **Navigation**: Login as SaaS Top Admin → Navigate to the **User Login History** (`🛡️`) tab in the sidebar.
- **Tracked Forensics**:
  - Exact login timestamp and relative time
  - User name, email, and role badge
  - Tenant company and branch affiliation
  - Client system, device classification (Desktop, Mobile, Tablet, API)
  - Operating system & browser version
  - Client IP address with copy button & local/network tags
  - Status (Success, Failed Password, Account Locked, Rate Limited, MFA Failed)
  - Inspection modal with raw `User-Agent` headers and failure diagnostics.

