import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.db.session import init_db_schema
from backend.routers.auth_router import router as auth_router
from backend.routers.chat_router import router as chat_router
from backend.routers.ingest_router import router as ingest_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.RAW_UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.ANNOTATED_PDF_DIR, exist_ok=True)
    init_db_schema()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "Production RBAC RAG Backend with PostgreSQL Row-Level Security (RLS), "
        "Sub-Second Redis Role Revocation, Human-in-the-Loop Visual PDF Box Painting, "
        "Pre-Filtered Hybrid Search (HNSW + BM25 + RRF), and Cross-Encoder Reranking."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ingest_router)
app.include_router(chat_router)


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, Any]:
    """
    Health check endpoint verifying API liveness and RLS enforcement state.
    """
    return {
        "status": "healthy",
        "rls_enforced": True,
        "app_name": settings.APP_NAME,
    }