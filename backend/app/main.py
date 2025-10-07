from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, projects, health, files, ai_jobs, work_items, rag, users
from app.core.config import settings
from app.db.session import test_connection, get_db
from app.db.models.user import User, UserRole
from app.core.security import get_password_hash
import logging
import uuid

# Import all models to ensure proper SQLAlchemy relationship configuration
from app.db import base  # This imports all models in the correct order

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

@app.on_event("startup")
async def startup_event():
    """Test database connection and create admin user on startup."""
    logger.info("Starting Task Generator API...")
    if test_connection():
        logger.info("✅ Database connection verified")
        await create_admin_user()
    else:
        logger.error("❌ Database connection failed - check your configuration")

async def create_admin_user():
    """Create admin user if not already exists."""
    try:
        # Get database session
        db = next(get_db())
        
        admin_email = "admin@gmail.com"
        admin_password = "admin123@"
        
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        
        if not existing_admin:
            # Create admin user
            hashed_password = get_password_hash(admin_password)
            admin_user = User(
                id=uuid.uuid4(),
                name="System Administrator",
                email=admin_email,
                password_hash=hashed_password,
                role=UserRole.ADMIN.value
            )
            
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            
            logger.info(f"✅ Admin user created successfully: {admin_email}")
        else:
            logger.info(f"ℹ️ Admin user already exists: {admin_email}")
            
        db.close()
    except Exception as e:
        logger.error(f"❌ Failed to create admin user: {e}")
        if 'db' in locals():
            db.close()

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(files.router, prefix="/api", tags=["files"])  # Changed to /api for both project and standalone file ops
app.include_router(ai_jobs.router, prefix="/api/projects", tags=["ai-jobs"])
app.include_router(work_items.router, prefix="/api", tags=["work-items"])
app.include_router(rag.router, prefix="/api/rag", tags=["rag"])
app.include_router(users.router, prefix="/api/admin", tags=["users"])
