-- Create Development Test Accounts in Supabase
-- Run this in Supabase SQL Editor

-- Note: Supabase Auth handles password hashing automatically
-- These are direct inserts into auth.users for development

-- First, we need to insert into auth.users manually for dev accounts
-- Or you can register them normally through the app

-- Alternative: Create accounts programmatically via Supabase Dashboard
-- Go to Authentication > Users > Add User

-- For now, accounts will be auto-created on first login attempt
-- But you can manually create them in Supabase Dashboard:

/*
To create dev accounts manually:

1. Go to Supabase Dashboard
2. Navigate to: Authentication > Users
3. Click "Add User" button
4. For each account:

Account 1 - Admin:
- Email: admin@kinaresort.com
- Password: admin123
- Email Confirmed: Yes

Account 2 - Customer 1:
- Email: john@example.com  
- Password: customer123
- Email Confirmed: Yes

Account 3 - Customer 2:
- Email: jane@example.com
- Password: customer123
- Email Confirmed: Yes
*/

-- After creating users, update the users table with metadata:
UPDATE public.users 
SET 
  first_name = 'Admin',
  last_name = 'User',
  updated_at = NOW()
WHERE email = 'admin@kinaresort.com';

UPDATE public.users
SET
  first_name = 'John',
  last_name = 'Doe',
  updated_at = NOW()
WHERE email = 'john@example.com';

UPDATE public.users
SET
  first_name = 'Jane',
  last_name = 'Smith',
  updated_at = NOW()
WHERE email = 'jane@example.com';














