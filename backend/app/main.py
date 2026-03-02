from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import batches, measurements, export, wash, admin

# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Dongchon Pickling Condition Input System - Backend API"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(batches.router)
app.include_router(measurements.router)
app.include_router(export.router)
app.include_router(wash.router)
app.include_router(admin.router, prefix="/admin", tags=["admin"])


@app.on_event("startup")
def on_startup():
    """Initialize database on startup"""
    print("Initializing database...")
    init_db()
    print("Database initialized!")


@app.get("/")
def root():
    return {
        "message": "Dongchon Pickling System API",
        "version": settings.api_version,
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
