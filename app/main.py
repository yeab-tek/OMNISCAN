"""
app/main.py
OmniScan FastAPI application — entry point.

Run locally:
    uvicorn app.main:app --reload --port 8000

API docs (auto-generated):
    http://localhost:8000/docs     ← Swagger UI
    http://localhost:8000/redoc    ← ReDoc
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers import (
    auth,
    users,
    po_records,
    commercial_invoices,
    bills_of_lading,
    packing_lists,
    trade_certificates,
    dashboard,
    reports,
    ocr,
    notifications,
    notifications_ws,
)


# ── Startup / shutdown ─────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"OmniScan API starting - env={settings.APP_ENV}")
    yield
    print("OmniScan API shutting down")


# ── App instance ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="OmniScan — Digital Intelligence Engine",
    description=(
        "Trade document management API for LATA AGRI EXPORT / ALTA Computec PLC. "
        "Handles Purchase Orders, Commercial Invoices, Bills of Lading, "
        "Packing Lists, Trade Certificates with Gemini OCR extraction."
    ),
    version="3.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
API = "/api/v1"

app.include_router(auth.router,                prefix=API)
app.include_router(users.router,               prefix=API)
app.include_router(po_records.router,          prefix=API)
app.include_router(commercial_invoices.router, prefix=API)
app.include_router(bills_of_lading.router,     prefix=API)
app.include_router(packing_lists.router,       prefix=API)
app.include_router(trade_certificates.router,  prefix=API)
app.include_router(dashboard.router,           prefix=API)
app.include_router(reports.router,             prefix=API)
app.include_router(ocr.router,                 prefix=API)
app.include_router(notifications.router,       prefix=API)
app.include_router(notifications_ws.router,    prefix=API)

# ── Static files (uploaded documents) ─────────────────────────────────────────
# Serves files at: http://localhost:8000/uploads/ocr_uploads/filename.pdf
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "3.0.0"}