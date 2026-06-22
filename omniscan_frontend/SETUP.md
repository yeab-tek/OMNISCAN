# OmniScan Frontend — Setup Guide

## Requirements
- Node.js 18+
- Your FastAPI backend running (see omniscan_backend/)

## Quick Start

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Configure the backend URL
cp .env.example .env
# Edit .env if your backend runs on a port other than 8000

# 3. Start the development server
npm run dev
# Opens at http://localhost:5173
```

## Production Build

```bash
npm run build
# Outputs to dist/
# Serve dist/ with any static server (nginx, caddy, serve, etc.)
```

## Demo Accounts (use any password when backend is offline)

| Role              | Email                           |
|-------------------|---------------------------------|
| System Admin      | admin@lataagriexport.com        |
| Trade Manager     | trade@lataagriexport.com        |
| Data Entry        | dataentry@lataagriexport.com    |
| Finance Officer   | finance@lataagriexport.com      |

When the backend is running, use the seeded passwords from seed.py.

## What Each Role Can Do

| Permission           | Admin | Trade Mgr | Finance | Data Entry |
|----------------------|-------|-----------|---------|------------|
| Upload Documents     | ✓     |           |         | ✓          |
| Approve / Reject POs | ✓     | ✓         |         |            |
| Update Payment Status| ✓     |           | ✓       |            |
| View All Records     | ✓     | ✓         | ✓       | ✓          |
| Generate Reports     | ✓     | ✓         |         |            |
| View Audit Logs      | ✓     |           |         |            |
| Manage Users         | ✓     |           |         |            |

## Backend Integration

All pages hit your FastAPI backend at `VITE_API_BASE_URL`.
If the backend is offline, pages fall back to realistic demo data automatically.

### Endpoints used:
- `POST /api/auth/login` — Login
- `GET  /api/auth/me` — Session verify on page load
- `POST /api/auth/change-password` — Settings page
- `GET  /api/dashboard/summary` — Dashboard stats
- `GET  /api/dashboard/po-by-month` — Dashboard chart
- `GET  /api/dashboard/payment-breakdown` — Dashboard chart
- `GET  /api/po?page=&limit=&search=&payment_status=` — PO list
- `GET  /api/po/:id` — PO details
- `GET  /api/po/:id/activity` — PO activity log
- `PATCH /api/po/:id/approve` — Approve PO
- `PATCH /api/po/:id/reject` — Reject PO
- `PATCH /api/po/:id/payment` — Update payment status
- `GET  /api/po/upcoming-deadlines` — Dashboard upcoming
- `POST /api/ocr/upload` — Upload document for OCR
- `GET  /api/ocr/status/:job_id` — Poll OCR result
- `POST /api/po` — Create PO from OCR
- `POST /api/invoices` — Create invoice from OCR
- `POST /api/bills-of-lading` — Create BL from OCR
- `POST /api/packing-lists` — Create PL from OCR
- `POST /api/certificates` — Create cert from OCR
- `GET  /api/reports/po/export?format=pdf|excel` — Export reports
- `GET  /api/audit?page=&limit=&action=&table_name=` — Audit log
- `GET  /api/audit/export` — CSV audit export
- `GET  /api/users` — User list
- `POST /api/users` — Create user
- `PATCH /api/users/:id/deactivate` — Deactivate user
- `GET  /api/notifications/unread-count` — Badge count (polled every 60s)

## Running the Full System

```bash
# Terminal 1 — API server
cd omniscan_backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Celery worker (for OCR background jobs)
cd omniscan_backend
celery -A app.celery_app worker --loglevel=info

# Terminal 3 — Celery beat (for daily deadline email alerts)
cd omniscan_backend
celery -A app.celery_app beat --loglevel=info

# Terminal 4 — Frontend dev server
cd omniscan_frontend
npm run dev
```

Open http://localhost:5173 and log in.
