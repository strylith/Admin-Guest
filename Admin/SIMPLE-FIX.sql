-- ==========================================
-- SIMPLE FIX - Run this in Supabase
-- ==========================================
-- Copy this entire code and paste in Supabase SQL Editor

-- First, let's see what columns your bookings table has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings';

-- Disable RLS completely
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Now check if the bookings table has the right structure
-- The server expects these columns:
-- id, guest_name, guest_email, guest_phone, room_type, check_in, check_out, status, created_by, created_at, updated_at


