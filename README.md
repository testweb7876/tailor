# Tailor Management Software

A complete shop management system built for **Aone Tailors & Son's** (Peersthan, Kalka–Baddi Road, Nalagarh, H.P.) — manages customers, measurements, fabrics, orders, manual payments, invoices, WhatsApp automation, staff, branches, and reporting, all in one place.

**Category:** Tailor / Garment Business Management Software (CRM + ERP + Billing, combined for the tailoring industry)

**Stack:** MERN (MongoDB, Express, React, Node.js) · JWT authentication (httpOnly cookies) · Backend-authoritative money engine · Role + module-level permission system · PWA-installable

> **Status.** Feature-complete and deployed live. This is a single-shop system (with optional multi-branch support built in but inactive until a second location is added) — not a multi-tenant SaaS product.

---

## What this software does

A tailor shop traditionally runs on a paper bill book — order slips, measurement charts, advance/balance notes, all handwritten. This software digitizes that entire workflow while keeping the same familiar structure (bill numbers, measurement tables, particulars/charges layout) so the transition from paper to digital is seamless for shop staff.

### Core workflow it replaces
1. Customer walks in → picks fabric → order slip written by hand → measurements taken → advance noted → balance tracked on paper → reminders given verbally or forgotten.

### What it becomes
1. Customer walks in → fabric photographed or coded in the app → order created with auto-calculated totals → measurements saved digitally (with full version history) → a printable slip matching the shop's original bill-book design is generated → automatic WhatsApp reminders go out before delivery → every rupee is tracked and reconciled automatically.

---

## Features

### Customers & Measurements
- Customer profiles with name, mobile, address, and full history (orders, payments, invoices, fabrics, measurements) in one view
- Fast phone/name search for the front counter
- Measurements are **versioned** — editing creates a new version, the old one is preserved as history (nothing is ever overwritten or lost)
- Measurement fields match the shop's physical bill-book layout exactly (Trousers: Length, Waist, Hip, Thigh, Calf, Bottom, Design No, Fitting, Pocket, Back Pocket, Belt, Plate; Shirt/Coat: Length, Tira, Chest, Waist, Collar, Sleeve, Natural Waist, Design No, Fitting, Collar, Cuff, Pocket, Cut, Plate)

### Fabrics
- Every garment in an order requires **either** an HD fabric photo (taken via phone camera or picked from gallery) **or** a fabric code — enforced on both the client and the server, so orders can never go through with missing fabric identification
- Fabric history tracked per customer and per order, browsable in a dedicated Fabrics page

### Orders
- Multi-item orders (multiple garments per order) with auto-calculated fabric total, stitching total, discount, tax, and grand total — **all computed server-side**, client-submitted totals are never trusted
- Physical bill-book number field (`manualBillNo`, e.g. "401") so the digital system can mirror the shop's existing paper numbering
- Order status flow: New → Confirmed → Cutting → Stitching → Trial → Alteration → Ready → Delivered (or Cancelled)
- Staff/tailor assignment — orders can be assigned to a specific tailor or cutter so the shop can track who is working on what
- **Printable order slip (PDF)** — recreates the shop's original bill-book intake form: header with shop branding, bill number, customer details, particulars, fabric photo thumbnails, stitching charges/advance/balance/signature line, and the two measurement tables — generated fresh from live order data

### Payments
- Manual payment recording only — Cash, UPI, Card, or Bank Transfer, with an optional free-text transaction/reference ID (the shop's customers already share their own UPI/bank transaction IDs, so no payment gateway integration is needed or wanted)
- Advance payment at order creation, live pending-balance tracking, refunds
- Every rupee is a real `Payment` record — nothing is a loose number on the order; balances are always derived by summing actual payment documents

### Invoices
- Immutable snapshot PDF generated at/after delivery — a formal itemised bill with shop details, customer details, line items, and totals frozen at generation time (so later edits to the order or shop settings never silently change an already-issued invoice)
- Emailable (HTML summary + PDF attachment via SMTP) and WhatsApp-shareable

### WhatsApp automation
- **Automatic delivery reminders** — a daily scheduled job checks orders due the next day and sends a WhatsApp reminder automatically via the Meta WhatsApp Cloud API
- **Broadcast** — send one offer or announcement message to every active customer in a single click
- Without the Cloud API configured, both features fall back gracefully to manual click-to-chat (`wa.me`) links

### Admins, Permissions & Branches
- Super Admin creates Admin accounts and grants **module-level access** (Customers, Orders, Measurements, Fabrics, Payments, Invoices, Reports, Settings, Activity, Dashboard, Broadcast) — an Admin without a permission simply cannot see or use that section, enforced on both the API and the UI
- **Branch support** built in for future expansion — when the shop opens a second location, a Super Admin can create a branch and assign Admins to it; that Admin then only sees their branch's customers and orders. Invisible and inactive until a branch is actually created, so today's single-shop operation is unaffected
- Full activity log — every create, update, delete, login, and status change is recorded with who, when, and from where

### Reports & Dashboard
- Dashboard with today's orders/revenue/collections, pending orders, upcoming deliveries, outstanding payments, and monthly charts (revenue, orders, payment methods, order status breakdown)
- Seven report types — Sales, Revenue, Payments, Pending, Orders, Customers, Fabrics — each exportable as CSV, Excel, or PDF

### Platform
- Installable as a **Progressive Web App** (add to home screen, app-like standalone window) — data is always fetched live from the server, so figures are never stale
- Responsive design, works on desktop and mobile (the shop's day-to-day usage is expected to be mostly on a phone)

---

## Tech stack

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication with httpOnly cookies (access + refresh token pair, session revocation via `tokenVersion`)
- Zod for request validation
- Helmet, CORS (origin-locked), rate-limiting, mongo-sanitize for security
- Multer + Cloudinary for image uploads (fabric photos, shop logo)
- PDFKit for PDF generation (invoices, order slips, tabular reports)
- Nodemailer for email (SMTP — Brevo/Resend/any provider)
- node-cron for the scheduled delivery-reminder job
- json2csv and xlsx for report exports

**Frontend**
- React 18 + Vite
- React Router
- Axios (with automatic access-token refresh on 401)
- React Hook Form
- Recharts (dashboard charts)
- Tailwind CSS
- lucide-react (icons)
- vite-plugin-pwa (installable app support)

**Infrastructure**
- MongoDB Atlas (database)
- Render (backend hosting)
- Vercel (frontend hosting)
- Cloudinary (image storage)

---

## Repository layout

```
tailor-erp/
├── server/
│   ├── config/         env, db, cloudinary, garmentFields (measurement field definitions)
│   ├── models/         User, Customer, Measurement, Order, Payment, Invoice, Settings,
│   │                   ActivityLog, Fabric, Counter, Staff, Branch
│   ├── services/       finance, auth, activity, cloudinary, pdf, email, whatsapp,
│   │                   invoice, reminderScheduler
│   ├── controllers/    auth, admin, customer, measurement, fabric, order, payment,
│   │                   invoice, dashboard, pending, report, search, settings,
│   │                   activity, broadcast, staff, branch
│   ├── validators/     Zod schemas for every write endpoint
│   ├── routes/         one router per resource, mounted under /api
│   ├── middleware/     auth, authorize, requirePermission, branchScope, validate,
│   │                   upload, errorHandler, notFound
│   ├── utils/          tokens, money, paginate, dateRange, logger, ApiError,
│   │                   asyncHandler, seed, seedDemo
│   └── app.js, server.js
├── client/
│   └── src/            services/api, context/AuthContext, components, layouts,
│                        pages, hooks
├── README.md
```

---

## Quick start (local development)

### Backend
```bash
cd server
cp .env.example .env          # fill in MONGO_URI + two strong JWT secrets (minimum)
npm install
npm run seed                  # creates the first Super Admin + Settings (idempotent)
npm run seed:demo             # optional: sample customers/orders/payments for testing
npm run dev                   # http://localhost:5000 (or your chosen PORT)
```

### Frontend
```bash
cd client
npm install
npm run dev                   # http://localhost:5173 (proxies /api to the backend)
```

Default Super Admin (set in `.env`): change the seeded password immediately after first login.

---

## Production deployment (live setup used)

1. **Database** — MongoDB Atlas, connection string in `MONGO_URI`
2. **Backend** — deployed on Render as a Docker web service (`server/Dockerfile`), with all environment variables set in the Render dashboard (never committed to the repo)
3. **Frontend** — deployed on Vercel, built from `client/`, with `VITE_API_BASE_URL` pointing to the Render backend's `/api` path
4. **CORS** — the backend's `CLIENT_URL` environment variable is set to the exact Vercel production URL (no trailing slash) so cross-origin cookies and requests are accepted
5. **Cookies** — `COOKIE_SECURE=true` and `NODE_ENV=production` in the backend, so authentication cookies use `Secure; SameSite=None`, required for the split-origin (Vercel + Render) setup
6. **Print/export links** (order slip PDF, invoice PDF, report exports) use a short-lived (60-second) download token passed as a query parameter, since `window.open()` cross-origin tabs don't reliably carry httpOnly cookies — this keeps downloads working without weakening the main authentication cookie's security

---

## Core design decisions

- **The backend owns all money.** Every financial figure (fabric total, stitching total, subtotal, discount, tax, grand total, paid, pending) is recalculated server-side on every save. Client-submitted totals are never trusted, even from the admin's own browser.
- **No payment gateway, by design.** All payments are manual entries with an optional free-text transaction ID. The shop's customers already send their own UPI/bank transaction references over WhatsApp, so a gateway integration would add cost and complexity without solving a real problem here.
- **Invoices are immutable snapshots.** Once generated, an invoice's shop details, customer details, line items, and totals are frozen — editing the underlying order or shop settings afterward never silently changes an invoice that's already been given to a customer.
- **Measurements are versioned, never overwritten.** "Editing" a measurement creates a new version and deactivates the old one, so a tailor can always look back at exactly what was recorded for a previous order.
- **Human-readable IDs** generated through an atomic counter (`CUST-0001`, `ORD-2026-0001`, `PAY-2026-0001`, `INV-2026-0001`), plus an optional shop-defined bill number per order for continuity with the physical bill book.
- **Session revocation** via a `tokenVersion` field — changing or resetting a password, or disabling an account, immediately invalidates all of that user's existing sessions.
- **Module-level permissions**, not just two fixed roles. A `requirePermission` middleware gates every non-Super-Admin route; the Super Admin always has full, unrestricted access.
- **Graceful degradation for optional integrations.** Cloudinary, SMTP, and the WhatsApp Cloud API are all wired behind environment variables and simply no-op (with a clear fallback, like manual click-to-chat links) when not configured — the app never crashes because an integration is missing.

---

## Security measures in place

- Helmet security headers
- CORS locked to a single, explicit origin (never a wildcard)
- Rate limiting (global API limit, plus a stricter limit on the login endpoint)
- mongo-sanitize (blocks NoSQL operator injection)
- Zod validation on every write endpoint (type coercion, length/format checks, enum whitelisting)
- httpOnly, Secure, SameSite cookies for authentication tokens (never exposed to client-side JavaScript)
- bcrypt password hashing
- File upload limits (5 MB, images only) on all fabric/logo uploads
- Central error handler that hides stack traces in production

---

## Roadmap / what's built

| Area | Status |
|---|---|
| Customers, Measurements, Fabrics | ✅ |
| Orders + backend financial engine | ✅ |
| Manual payments (Cash/UPI/Card/Bank Transfer) + refunds | ✅ |
| Invoices (immutable snapshot, PDF, email, WhatsApp) | ✅ |
| Printable order slip matching the physical bill book | ✅ |
| Fabric photo/code mandatory validation | ✅ |
| Automatic WhatsApp delivery reminders | ✅ |
| Bulk broadcast messaging | ✅ |
| Staff/tailor assignment | ✅ |
| Module-level Admin permissions | ✅ |
| Multi-branch support (foundation, inactive until used) | ✅ |
| Dashboard, Reports (CSV/Excel/PDF), Activity log | ✅ |
| Progressive Web App (installable) | ✅ |
| Production deployment (Render + Vercel + Atlas) | ✅ |

### Not in current scope
Multi-tenant SaaS billing, multi-currency, barcode/QR order tickets, SMS gateway, offline-first data sync.

---

## Support

For issues, feature requests, or deployment questions, contact the development team.