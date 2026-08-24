# Aone Tailors & Son's — Shop Management System (TailorHub)

A single-shop tailoring business management system built for **Aone Tailors & Son's** (Peersthan, Kalka-Baddi Road, Nalagarh, H.P.) — handles customers, measurements, fabrics, orders, manual payments, invoices, WhatsApp automation, and reporting.

**MERN stack** (MongoDB, Express, React, Node) · Backend-authoritative money engine · JWT auth (httpOnly cookies) · Role + module-level permission system.

> **Status.** Backend and frontend are feature-complete for the client's requirements. This is a **single-shop ERP**, not multi-tenant SaaS. No payment gateway is integrated — all payments (cash, UPI, card, bank transfer) are recorded manually by the shop admin, with the transaction/reference ID typed in by hand.

---

## Stack

- **Backend:** Node + Express, Mongoose, JWT (httpOnly cookies), bcrypt, Zod validation, Helmet, CORS, rate-limiting, mongo-sanitize, Multer + Cloudinary, PDFKit, Nodemailer, node-cron, json2csv, xlsx, dayjs.
- **Frontend:** React 18 + Vite, React Router, Axios, React Hook Form, Recharts, Tailwind CSS, lucide-react.

## Repository layout

tailor-erp/
├── server/ Express API
│ ├── config/ env, db, cloudinary, garmentFields (measurement field keys/labels)
│ ├── models/ User, Customer, Measurement, Order, Payment, Invoice, Settings, ActivityLog, Fabric, Counter
│ ├── services/ finance, auth, activity, cloudinary, pdf, email, whatsapp, invoice, reminderScheduler
│ ├── controllers/ auth, admin, customer, measurement, fabric, order, payment, invoice, dashboard, pending, report, search, settings, activity, broadcast
│ ├── validators/ Zod schemas
│ ├── routes/ one router per resource, mounted in routes/index.js under /api
│ ├── middleware/ auth, authorize, requirePermission, validate, upload, errorHandler, notFound
│ ├── utils/ tokens, money, paginate, dateRange, logger, ApiError, asyncHandler, seed, seedDemo
│ └── app.js, server.js
├── client/ React app
│ └── src/ services/api, context/AuthContext, components, layouts, pages, hooks
├── README.md


---

## Quick start

### 1) Backend

```bash
cd server
cp .env.example .env          # set MONGO_URI + two strong JWT secrets (minimum)
npm install
npm run seed                  # creates the first Super Admin + Settings (idempotent)
npm run seed:demo             # OPTIONAL: 20 customers, ~30 orders, payments, invoices, fabrics
npm run dev                   # http://localhost:5000  (health: GET /api/health)
```

Default Super Admin (from `.env`): **admin@tailorshop.com / Admin@12345** — **change this immediately** after first login.

### 2) Frontend

```bash
cd client
npm install
npm run dev                   # http://localhost:5173  (proxies /api -> :5000)
```

**MongoDB:** local (`mongodb://127.0.0.1:27017/tailor_erp`) or Atlas — set `MONGO_URI`.

### Or run the whole stack with Docker

```bash
cp server/.env.example server/.env      # set JWT secrets (MONGO_URI is set by compose)
docker compose up --build               # Mongo + API (:5000) + web (:8080)
docker compose exec server npm run seed
docker compose exec server npm run seed:demo   # optional demo data
```

For production without Docker, PM2 is provided: `cd server && pm2 start ecosystem.config.js --env production` (clustered).

---

## Core features (client requirements)

- **Order intake** — pick customer → select/enter fabric → auto-calculated bill.
- **Fabric identification (mandatory)** — every garment item requires **either** an HD fabric photo (camera or gallery upload) **or** a fabric code. Enforced both client-side (instant feedback) and server-side (Zod `.refine()` — can't be bypassed).
- **Measurements** — versioned: editing creates a new version, old ones are kept as history (never overwritten). Field layout matches the shop's physical bill book (trouser + shirt/coat tables — see `config/garmentFields.js`).
- **Customer record** — name, mobile, full order/payment/measurement/fabric history, running totals (total spent, total paid, outstanding balance).
- **Manual payments only** — Cash / UPI / Card / Bank transfer. For UPI/Card/Bank the admin types the transaction/reference ID by hand (no payment gateway; the client's customers already share their own payment IDs). Advance and pending balance tracked per order.
- **Physical bill-book number** — `manualBillNo` field on each order (e.g. "401") lets the admin keep the digital system in sync with the shop's existing paper bill book.
- **Order slip PDF** — printable slip matching the shop's physical intake form layout (header, particulars, charges, trouser/shirt measurement tables) — `GET /api/orders/:id/slip`.
- **Invoices** — immutable snapshot PDF generated at delivery time, emailable, WhatsApp-shareable.
- **Automatic delivery reminders** — a daily cron job (9:00 AM) finds orders due tomorrow and sends a WhatsApp reminder automatically — **requires WhatsApp Cloud API** (see below). Without it, reminders must be sent manually via a generated click-to-chat link.
- **Broadcast** — send one offer/message to every active customer in one click — same Cloud API requirement as above; falls back to per-customer manual links if unconfigured.
- **Super Admin + module permissions** — the Super Admin creates Admin accounts and grants access per module (customers, orders, measurements, fabrics, payments, invoices, reports, settings, activity, dashboard, broadcast). An Admin without a permission gets a 403 on that module, both in the API and the sidebar.
- **Reports** — sales, revenue, payments, pending, orders, customers, fabrics — exportable as CSV, Excel, or PDF.
- **Activity log** — full audit trail (who did what, when, from which IP) — Super Admin only.

---

## Core design decisions

- **Backend owns all money.** Order totals (fabric, stitching, subtotal, discount, tax, grand total, paid, pending) are recomputed server-side on every save; client-supplied totals are ignored. `Grand Total = (Subtotal − Discount) + Tax`; `Pending = Grand Total − (paid − refunded)`.
- **No payment gateway.** All payments are manual entries with an optional free-text transaction ID — deliberately simple per the shop owner's workflow (customers already send their own UPI/bank transaction IDs over WhatsApp).
- **Immutable invoices.** An invoice stores a snapshot of shop + customer + items + totals, so old invoices don't change when records are later edited. Paid/balance are refreshed live only for display/PDF.
- **Versioned measurements.** "Editing" a measurement creates a new version and deactivates the old one — history is never destroyed.
- **Human-readable IDs** via an atomic `Counter` collection: `CUST-0001`, `ORD-2026-0001`, `PAY-2026-0001`, `INV-2026-0001` — plus an optional shop-defined `manualBillNo` per order for continuity with the paper bill book.
- **Session revocation** via `tokenVersion` — password change / reset / disable invalidates outstanding refresh tokens immediately; auth middleware re-checks account status on every request.
- **Module-level permissions**, not just two fixed roles — `requirePermission(moduleName)` middleware gates every non-Super-Admin route; Super Admin always has full access.
- **Graceful integrations.** Cloudinary, SMTP, and WhatsApp Cloud API are wired behind env vars and no-op cleanly when unset. `GET /api/settings` (Super Admin) reports each integration's live status.

---

## API surface (all under `/api`, cookie-authenticated)

Auth `login·refresh·logout·me·change-password` · Admins (SUPER) `CRUD·reset-password·activity·permissions` · Customers `CRUD·search·profile tabs` · Measurements `versioned·history·duplicate·garments` · Fabrics `CRUD·image upload` · Orders `CRUD·status·slip PDF·receive-payment` · Payments `list·refund` · Invoices `generate·pdf·email·whatsapp` · Dashboard `summary·charts·recent` · Pending-payments `list·reminder` · Broadcast `send to all customers` · Reports `sales·revenue·payments·pending·orders·customers·fabrics (CSV·Excel·PDF)` · Search `global` · Settings `get·update·logo` · Activity `list (SUPER)`.

---

## Integrations setup

All optional; the app runs without them, with graceful fallbacks.

- **Cloudinary** (fabric photos, shop logo): set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Uploads use in-memory Multer (5 MB, images only) streamed to Cloudinary. Fabric photos can be taken directly with the phone camera or picked from the gallery.
- **Email** (Brevo / Resend / any SMTP): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`. Invoices email an HTML summary + PDF attachment; `emailSent`/`emailSentAt` recorded.
- **WhatsApp Cloud API** (recommended for full automation): set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` (from Meta Business/Developer account). Enables:
  - Automatic delivery reminders (daily cron, 1 day before delivery)
  - One-click broadcast to all customers
  - Direct invoice/reminder sending (no manual click needed)

  **Without this configured**, the app falls back to `wa.me` click-to-chat links that the admin opens and sends manually, one customer at a time. This is a Meta/WhatsApp platform requirement, not a limitation of the app — Meta Business verification is needed to send messages programmatically at scale.

### Automatic delivery reminders

`services/reminderScheduler.js` runs a daily cron job (9:00 AM server time) via `node-cron`. It finds orders with a delivery date tomorrow, not yet delivered/cancelled, and not already reminded (`deliveryReminderSent` flag), and sends a WhatsApp message via the Cloud API. If the delivery date on an order is changed, the reminder flag resets automatically so a new reminder will go out for the new date.

---

## Order slip vs. Invoice — two different documents

- **Order slip** (`GET /api/orders/:id/slip`) — generated at order intake, matches the shop's existing paper bill book layout (bill no., dates, name, mobile, particulars, stitching charges, advance, balance, signature line, trouser + shirt/coat measurement tables). Meant to be printed and handed to the customer immediately, same as the physical carbon-copy book.
- **Invoice** (`GET /api/invoices/:id/pdf`) — generated at/after delivery, a formal itemised bill with GST-style line items and totals, immutable snapshot, emailable/WhatsApp-shareable.

---

## Security checklist (set before going live)

- [ ] Generate strong, unique `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
- [ ] Rotate the MongoDB Atlas database user password before production use.
- [ ] `COOKIE_SECURE=true` and `NODE_ENV=production` in the deployed `.env`.
- [ ] Serve both frontend and backend over HTTPS (cookies use `SameSite=None; Secure` in production).
- [ ] Set `CLIENT_URL` to the exact production frontend origin — never a wildcard.
- [ ] Change the default Super Admin password immediately after first login.
- [ ] Set up regular MongoDB backups (Atlas paid tier, or a scheduled `mongodump`).
- [ ] Run `npm audit` periodically and patch dependencies.
- [ ] Grant Admin accounts only the module permissions they actually need.

Helmet, CORS (credentialed, origin-locked), rate-limiting (global + stricter on login), mongo-sanitize, Zod input validation, httpOnly cookies, and file-upload size/type limits are already implemented in the codebase — they just need the environment variables above set correctly.

---

## Testing done

- **Backend:** every file passes `node --check`; the full require-graph loads; behavioural checks pass for the order money engine (fabric + stitching + discount-clamp + tax + status), payment→pending recompute, WhatsApp phone-normalise + link building, email HTML + unconfigured detection, PDF generation (invoice, order slip, generic report — valid `%PDF` buffers), CSV/Excel export, date-range presets, JWT round-trip with tokenVersion, httpOnly cookie flags + maxAge, Zod validators, validate middleware.
- **Frontend:** `npm run build` succeeds; route-level code splitting keeps the initial bundle small.

Run the full end-to-end flow locally against a real MongoDB: `npm run seed` then `npm run seed:demo`, then click through the UI.

---

## Production deployment

1. **MongoDB Atlas** (or managed Mongo) — set `MONGO_URI`, enable automatic backups.
2. **Backend** on a Node host (Render/Railway/VPS/PM2): set all `.env` values per the security checklist above. `npm run seed` once.
3. **Frontend** (`cd client && npm run build`) — serve `client/dist` on any static host/CDN, pointed at the API origin.
4. Configure Cloudinary + SMTP + WhatsApp Cloud API credentials against production values.
5. Verify HTTPS is active on both frontend and backend before real customer data is entered.

---

## Roadmap

| Phase | Scope | Status |
|------|-------|--------|
| 1–5 | Backend foundation, auth, customers, measurements, fabrics, orders, manual payments | ✅ |
| 6 | Invoices (snapshot + PDF) + Email + WhatsApp | ✅ |
| 7 | Dashboard + Pending payments + Reports + Search | ✅ |
| 8 | Settings + Activity logs + demo seed | ✅ |
| 9 | Full frontend: all pages wired to the API | ✅ |
| 10 | Payment gateway (Razorpay/Stripe) removed — manual-only per client request | ✅ |
| 11 | Fabric photo/code mandatory validation | ✅ |
| 12 | Physical bill-book number (`manualBillNo`) + order slip PDF | ✅ |
| 13 | Automatic delivery reminders (WhatsApp Cloud API + cron) | ✅ |
| 14 | Bulk broadcast to all customers | ✅ |
| 15 | Module-level Admin permissions | ✅ |

### Not in scope (client did not request)

Multi-tenant/SaaS support, multi-currency, barcode/QR order tickets, SMS gateway, offline PWA mode.