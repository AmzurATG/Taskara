from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, projects, health, files, ai_jobs
from app.core.config import settings

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
app.include_router(files.router, prefix="/api/projects", tags=["files"])
app.include_router(ai_jobs.router, prefix="/api/projects", tags=["ai-jobs"])
