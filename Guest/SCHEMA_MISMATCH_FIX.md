# Critical Schema Mismatch Issue

## Problem

The `kina.users` table is **missing** the admin role fields:
- Missing: `role`, `is_active`, `full_name`, `last_login`

This causes 403 Forbidden errors when accessing admin routes.

## Root Cause

The `kina` schema was created using `supabase-setup.sql` (basic Guest schema) which doesn't include admin fields.

The admin merge migration (`merge-admin-schema.sql`) assumes `public` schema, not `kina`.

## Solution

### Quick Fix: Run This SQL Migration

```sql
-- Add missing admin fields to kina.users table
ALTER TABLE kina.users 
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON kina.users(role);

-- Update full_name from first_name and last_name
UPDATE kina.users 
SET full_name = first_name || ' ' || last_name 
WHERE full_name IS NULL;
```

### Then Set Your User as Admin

```sql
-- Replace 'YOUR_EMAIL' with your actual email
UPDATE kina.users 
SET role = 'admin', is_active = true 
WHERE email = 'YOUR_EMAIL';
```

### Alternative: Use Public Schema

If you want to use the existing `public` schema with all the admin users:

1. Change server configuration to use `public` instead of `kina`
2. Files to modify:
   - `Guest/server/db/supabaseClient.js` - Change schema from 'kina' to 'public'
   - `Guest/server/config/supabase.js` - Change schema from 'kina' to 'public'

### Recommended: Apply Full kina Schema

Run the complete `create-kina-schema.sql` migration which will:
1. Drop existing kina tables
2. Recreate with all fields
3. Set up proper RLS policies
4. Add indexes

**WARNING**: This will delete existing data in kina schema!

