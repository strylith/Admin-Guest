-- ============================================
-- Fix RLS (Row Level Security) for bookings table
-- ============================================
-- This will allow your server to insert bookings

-- Check if RLS is enabled and disable it
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Or create a policy that allows all operations
DROP POLICY IF EXISTS "Allow all bookings operations" ON bookings;

CREATE POLICY "Allow all bookings operations" 
ON bookings
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Do the same for other tables if needed
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Verify the bookings table has the right columns
-- ============================================

-- Check if your bookings table has these columns:
-- If not, add them with:
/*
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_type VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_out DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
*/


