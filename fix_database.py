import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).resolve().parent))

from app.core.config import settings
from sqlalchemy import create_engine, text
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_and_add_role_column():
    """Check current database structure and add role column if needed"""
    try:
        # Create engine
        engine = create_engine(settings.database_url)
        
        with engine.connect() as conn:
            # Check what tables exist
            logger.info("Checking database tables...")
            result = conn.execute(text('''
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            '''))
            tables = [row[0] for row in result.fetchall()]
            logger.info(f"Available tables: {tables}")
            
            # Check if users table exists and its structure
            if 'users' in tables:
                logger.info("Checking users table structure...")
                result = conn.execute(text('''
                    SELECT column_name, data_type, is_nullable, column_default 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND table_schema = 'public'
                    ORDER BY ordinal_position
                '''))
                columns = result.fetchall()
                
                logger.info("📋 Current users table columns:")
                role_exists = False
                for col in columns:
                    logger.info(f"  - {col[0]}: {col[1]} (nullable: {col[2]}) default: {col[3]}")
                    if col[0] == 'role':
                        role_exists = True
                
                if not role_exists:
                    logger.info("🔧 Role column missing - adding it now...")
                    # Add role column as varchar
                    conn.execute(text('''
                        ALTER TABLE users 
                        ADD COLUMN role VARCHAR(50) DEFAULT 'user'
                    '''))
                    conn.commit()
                    logger.info("✅ Role column added successfully!")
                else:
                    logger.info("✅ Role column already exists")
            else:
                logger.error("❌ Users table not found!")
                return False
                
    except Exception as e:
        logger.error(f"❌ Database error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = check_and_add_role_column()
    if success:
        print("🎉 Database setup complete!")
    else:
        print("💥 Database setup failed!")
        sys.exit(1)