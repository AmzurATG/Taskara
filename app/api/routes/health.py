from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Task Generator API", "version": "1.0.0"}


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}