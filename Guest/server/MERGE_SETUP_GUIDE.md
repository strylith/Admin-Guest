# Kina Resort Merge Setup Guide

This guide walks you through applying the merged Admin-Guest system to your Supabase database.

## Prerequisites

- Supabase project created and running
- Supabase SQL Editor access
- Admin credentials for Supabase

## Option A: Fresh Setup with kina Schema (Recommended)

Run this single migration:

**File**: `Guest/server/migrations/create-kina-schema.sql`

This creates the complete kina schema with:
- All tables (users, packages, bookings, booking_items, etc.)
- Admin features (audit_logs, email_logs, etc.)
- All indexes and RLS policies
- Sample package data

**This is the easiest and recommended approach.**

## Option B: Migrate from Public Schema

If you already have data in `public` schema:

### Step 1: Apply Base Schema

Run in public schema first:

**File**: `Guest/server/supabase-setup.sql`

### Step 2: Apply Booking Migrations

1. `Guest/server/migration-add-booking-fields.sql`
2. `Guest/server/migration-restructure-booking-items.sql`
3. `Guest/server/migration-add-function-hall-metadata.sql`

### Step 3: Apply Admin Features

**File**: `Guest/server/migrations/merge-admin-schema.sql`

### Step 4: Create kina Schema and Migrate

```sql
-- Create kina schema
CREATE SCHEMA IF NOT EXISTS kina;

-- Copy all tables from public to kina
CREATE TABLE kina.users AS SELECT * FROM public.users;
CREATE TABLE kina.packages AS SELECT * FROM public.packages;
CREATE TABLE kina.bookings AS SELECT * FROM public.bookings;
-- etc. for all tables

-- Then drop public tables if desired
```

## Verify Schema

Run this query to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'kina' 
  AND table_name IN (
    'users', 'packages', 'bookings', 'booking_items',
    'reservations_calendar', 'admin_settings',
    'audit_logs', 'email_logs', 'password_reset_otps', 'rooms'
  )
ORDER BY table_name;
```

You should see 10 tables.

## Step 5: Create Initial Admin Account

### Option A: Using Supabase Dashboard

1. Go to Authentication → Users
2. Click "Add User"
3. Enter admin email and temporary password
4. Disable "Auto Confirm User" (or enable if you want immediate access)
5. Click "Create User"
6. Copy the User ID

Then in SQL Editor:

```sql
INSERT INTO kina.users (id, email, first_name, last_name, full_name, role, is_active)
VALUES (
  'PASTE_USER_ID_HERE',
  'admin@kinaresort.com',
  'Admin',
  'User',
  'Admin User',
  'admin',
  true
);
```

### Option B: Using Registration (after first admin exists)

1. Login to the app as an existing admin
2. Go to `/admin/users`
3. Click "Create Staff Account"
4. Fill in the form and select "Admin" role

## Step 6: Configure Environment Variables

Update `Guest/server/.env`:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=secure-random-key

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Server
PORT=3000
NODE_ENV=development
PUBLIC_BASE_URL=http://localhost:3000
```

## Step 7: Test the System

### Backend
```bash
cd Guest/server
npm install
npm start
```

### Frontend
```bash
cd Guest
# Use Live Server or any static file server
# Open index.html in browser
```

### Test Accounts

**Customer:**
- Register at `/register`
- Browse packages, make bookings

**Admin:**
- Access `/admin`
- View dashboard, manage bookings
- Create staff accounts

## Troubleshooting

### "Permission denied for table" Errors

Grant permissions:

```sql
-- Grant permissions to service_role
GRANT ALL ON ALL TABLES IN SCHEMA kina TO service_role;
GRANT USAGE ON SCHEMA kina TO service_role;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA kina TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA kina TO authenticated;
```

### RLS Policies Blocking Access

Check policies are created:

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'kina'
ORDER BY tablename, policyname;
```

### Email Not Sending

1. Verify SMTP credentials
2. Check `email_logs` table for errors
3. Use Gmail App Password (not regular password)
4. Check firewall allows port 587

### Admin Dashboard Not Loading

1. Verify user has admin role in database
2. Check browser console for errors
3. Confirm token includes role claim
4. Test API endpoints directly in browser

## Next Steps

- [ ] Apply all migrations
- [ ] Create admin account
- [ ] Test guest booking flow
- [ ] Test admin dashboard
- [ ] Configure email service
- [ ] Deploy to production

## Support

For issues, check:
1. Audit logs: `/admin/audit`
2. Email logs: Database `email_logs` table
3. Server console: Backend logs
4. Browser console: Frontend errors

## Rollback

If you need to rollback:

1. Keep `Admin/` folder as backup
2. Database changes are additive - old data preserved
3. Can disable RLS temporarily if needed
4. Can remove added columns if conflicts arise

