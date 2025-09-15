from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth
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
app.include_router(auth.router, prefix="/api")

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Task Generator API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
