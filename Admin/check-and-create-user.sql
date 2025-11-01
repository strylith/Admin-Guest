-- ==========================================
-- Check if you have users and create one if needed
-- ==========================================
-- Run this in Supabase SQL Editor

-- Step 1: Check all existing users
SELECT id, email, full_name, role, created_at 
FROM users;

-- Step 2: If no users found, you can create one manually
-- Uncomment and modify the lines below to create an admin user:

/*
INSERT INTO users (email, password, full_name, role) 
VALUES (
    'nashabrenica06@gmail.com',
    '$2a$10$rSBNp9OWL3HqJ8jKLJ2nJeCqJZK2sXnPZXfUrUOjKb8VpKbCZJQO2',
    'Your Name',
    'admin'
);
*/

-- Note: The password above is hashed for 'password123'
-- You can use this to login with password: password123

-- Or use this to create your own password hash:
-- Use bcrypt online tool to generate hash for your password
-- https://bcrypt-generator.com/

SELECT 'Check results above' as message;




