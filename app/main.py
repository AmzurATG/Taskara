from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, projects, health, files, ai_jobs, work_items
from app.core.config import settings

# Import all models to ensure proper SQLAlchemy relationship configuration
from app.db import base  # This imports all models in the correct order

# Create FastAPI application
app = FastAPI(
    title="Task Generator API",
    description="AI-powered task generation from requirements documents",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(files.router, prefix="/api", tags=["files"])  # Changed to /api for both project and standalone file ops
app.include_router(ai_jobs.router, prefix="/api/projects", tags=["ai-jobs"])
app.include_router(work_items.router, prefix="/api", tags=["work-items"])
