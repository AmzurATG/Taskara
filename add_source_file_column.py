#!/usr/bin/env python3
"""
Add source_file_id column to work_items table
"""
import logging
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_source_file_column():
    """Add source_file_id column to work_items table"""
    try:
        # Connect to database using the database URL
        database_url = settings.get_database_url()
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        logger.info("Checking if source_file_id column exists...")
        
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'work_items' AND column_name = 'source_file_id'
        """)
        
        if cursor.fetchone():
            logger.info("✅ source_file_id column already exists")
            return
        
        logger.info("Adding source_file_id column to work_items table...")
        
        # Add the column
        cursor.execute("""
            ALTER TABLE work_items ADD COLUMN source_file_id UUID;
        """)
        
        # Add foreign key constraint
        cursor.execute("""
            ALTER TABLE work_items ADD CONSTRAINT fk_work_items_source_file_id 
            FOREIGN KEY (source_file_id) REFERENCES files (id);
        """)
        
        # Create index
        cursor.execute("""
            CREATE INDEX idx_work_items_source_file_id ON work_items (source_file_id);
        """)
        
        logger.info("✅ Successfully added source_file_id column and constraints")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        logger.error(f"❌ Failed to add source_file_id column: {e}")
        raise

if __name__ == "__main__":
    add_source_file_column()
    print("🎉 Database migration complete!")