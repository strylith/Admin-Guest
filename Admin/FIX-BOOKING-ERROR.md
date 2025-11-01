# 🔧 Fix "Failed to create booking" Error

## Why This Happens

You successfully registered, but now when creating bookings, it fails. This is likely due to:
1. **Missing bookings table** - Table wasn't created properly
2. **RLS Policies** - Row Level Security blocking inserts
3. **Foreign key constraint** - created_by references users table

## Quick Fix: Disable RLS Temporarily

### Step 1: Go to Supabase SQL Editor

1. Open: https://app.supabase.com
2. Select your project
3. Click **"SQL Editor"**
4. Click **"New query"**

### Step 2: Run This SQL

Copy and paste this into the SQL Editor:

```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view bookings" ON bookings;

-- Recreate bookings table without RLS blocking
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50),
    room_type VARCHAR(50) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Make sure bookings is accessible
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Create simple policy
CREATE POLICY "Allow all operations" ON bookings
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

Then click **"Run"**

## Check Server Console

Check your PowerShell window where the server is running for specific error messages. Common errors:

```
Error: relation "bookings" does not exist
```
→ Table missing - Run the SQL above

```
Error: new row violates row-level security policy
```
→ RLS blocking - Run the SQL above

## After Running SQL

1. Go back to your browser
2. Refresh the page
3. Try creating a booking again
4. It should work!

## Verify Tables Exist

In Supabase:
1. Go to **"Table Editor"**
2. You should see all these tables:
   - ✅ users
   - ✅ bookings
   - ✅ audit_logs
   - ✅ email_logs
   - ✅ rooms

## If Still Failing

Check the server console (PowerShell window) for the exact error message and share it.

==========================================

