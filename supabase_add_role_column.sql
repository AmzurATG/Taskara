-- Add role column to users table in Supabase
-- Run this script in Supabase SQL Editor

-- Step 1: Create the enum type for user roles
CREATE TYPE userrole AS ENUM ('user', 'admin');

-- Step 2: Add the role column to the users table with default value
ALTER TABLE users ADD COLUMN role userrole NOT NULL DEFAULT 'user';

-- Step 3: Update any existing users to have the 'user' role (if needed)
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Step 4: Create an index on the role column for better performance
CREATE INDEX idx_users_role ON users(role);

-- Verification query - run this to check if the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';