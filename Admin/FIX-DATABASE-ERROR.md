# 🔧 Fix "Registration Failed" Error

## Problem:
The error happens because the database tables don't exist yet in your Supabase project.

## Solution: Create the Database Tables

### Step 1: Go to Your Supabase Dashboard

1. Open: https://app.supabase.com
2. Login to your account
3. Select your project: **gjaskifzrqjcesdnnqpa**

### Step 2: Open SQL Editor

1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"**

### Step 3: Copy and Run the SQL Schema

1. Open the file: `database-schema.sql` in your project folder
2. **Copy ALL the contents** of that file
3. **Paste** it into the Supabase SQL Editor
4. Click **"Run"** button (or press Ctrl+Enter)

### Step 4: Verify Tables Were Created

1. In Supabase, go to **"Table Editor"** (left sidebar)
2. You should see these tables:
   - ✅ users
   - ✅ bookings
   - ✅ audit_logs
   - ✅ email_logs
   - ✅ rooms

## Alternative: Quick Setup via SQL Editor

Copy this entire SQL code:

```sql
-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50),
    room_type VARCHAR(50) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    user_role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(50) NOT NULL,
    room_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);

-- Enable RLS (Optional, but recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
```

1. **Paste** the entire SQL code above into Supabase SQL Editor
2. Click **"Run"**
3. You should see **"Success"** message

## After Running the SQL

1. **Restart your server** (if it's running):
   - Go to the PowerShell window
   - Press Ctrl+C to stop
   - Run: `npm start`

2. **Try registration again**:
   - Go to: http://localhost:3000
   - Click "Register here"
   - Fill in the form
   - It should work now!

## Quick Checklist

- [ ] Opened Supabase Dashboard
- [ ] Went to SQL Editor
- [ ] Copied the SQL schema
- [ ] Pasted into SQL Editor
- [ ] Clicked "Run"
- [ ] Saw "Success" message
- [ ] Verified tables in Table Editor
- [ ] Restarted the server
- [ ] Tried registration again

## If It Still Fails

Check the server console for error messages. Common issues:
- Database connection failing
- Supabase API key incorrect
- Network/firewall blocking connection

Post the error message and I'll help you fix it!

---

**After fixing this, registration will work perfectly!** ✅

