-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'user';

-- Create enum type for role if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('user', 'admin');
    END IF;
END $$;

-- Change the role column to use enum type
ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::userrole;