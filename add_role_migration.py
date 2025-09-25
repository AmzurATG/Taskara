#!/usr/bin/env python3

from app.core.config import settings
import psycopg2

def add_role_column():
    try:
        # Connect to database
        conn = psycopg2.connect(settings.database_url)
        cur = conn.cursor()
        
        # Check if role column exists
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='role';")
        exists = cur.fetchone()
        
        if not exists:
            print('Adding role column to users table...')
            
            # Create enum type
            cur.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN CREATE TYPE userrole AS ENUM ('user', 'admin'); END IF; END $$;")
            
            # Add role column with default value
            cur.execute("ALTER TABLE users ADD COLUMN role userrole NOT NULL DEFAULT 'user';")
            
            conn.commit()
            print('✅ Role column added successfully!')
        else:
            print('✅ Role column already exists')
        
        # Show current table structure
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users';")
        columns = cur.fetchall()
        print('\n📋 Current users table structure:')
        for col in columns:
            print(f'  - {col[0]}: {col[1]}')
            
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f'❌ Error: {e}')

if __name__ == "__main__":
    add_role_column()