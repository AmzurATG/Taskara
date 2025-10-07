from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Get the appropriate database URL (direct connection, not pooler)
database_url = settings.get_database_url()

logger.info(f"Using database URL: {database_url.split('@')[0]}@***")  # Log without password

# Create SQLAlchemy engine optimized for Supabase pooler
engine = create_engine(
    database_url,
    poolclass=QueuePool,
    pool_size=2,                    # Smaller pool for pooler connection
    max_overflow=5,                 # Fewer overflow connections
    pool_pre_ping=True,             # Validate connections before use
    pool_recycle=1800,              # Recycle connections every 30 minutes
    pool_timeout=20,                # Shorter timeout for pooler
    echo=False,                     # Set to True for SQL debugging
    connect_args={
        "sslmode": "require",       # Require SSL for Supabase
        "connect_timeout": 15,      # Connection timeout
        "application_name": "task_generator_app",  # App identifier
        "options": "-c default_transaction_isolation=read_committed"  # Better for pooler
    }
)

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base
Base = declarative_base()

# Dependency to get database session with proper error handling
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Test database connection
def test_connection():
    """Test database connection and return status."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False
