-- Kina Resort: Merge Admin System Schema
-- This migration extends the Guest schema to support admin operations
-- Run this in Supabase SQL Editor after base setup

-- ============================================
-- 1. EXTEND USERS TABLE
-- ============================================

-- Add role field to users table (admin, staff, customer)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer'));

-- Add full_name field (combines first_name and last_name)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add is_active flag for admin-managed accounts
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add last_login tracking
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Update full_name from first_name and last_name if needed
UPDATE public.users 
SET full_name = first_name || ' ' || last_name 
WHERE full_name IS NULL;

-- ============================================
-- 2. EXTEND BOOKINGS TABLE
-- ============================================

-- Add admin-specific fields from Admin system
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Add additional booking details
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS booking_time TEXT,
  ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS extra_guest_charge DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adults INTEGER,
  ADD COLUMN IF NOT EXISTS kids INTEGER,
  ADD COLUMN IF NOT EXISTS visit_time TEXT,
  ADD COLUMN IF NOT EXISTS cottage TEXT,
  ADD COLUMN IF NOT EXISTS entrance_fee DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cottage_fee DECIMAL(10, 2) DEFAULT 0;

-- Ensure status includes all states from both systems
-- Note: This might require manual update if there are conflicts
-- Admin statuses: pending, confirmed, cancelled
-- Guest statuses: pending, confirmed, cancelled, completed

-- Create index for created_by queries
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON public.bookings(created_by);

-- ============================================
-- 3. CREATE AUDIT LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  user_role TEXT,
  action TEXT NOT NULL,
  details TEXT,
  table_name TEXT,
  record_id TEXT,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- RLS Policy: Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policy: Authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 4. CREATE EMAIL LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Index for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

-- RLS Policy: Admins can view email logs
CREATE POLICY "Only admins can view email logs"
  ON public.email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policy: Backend service can insert email logs
CREATE POLICY "Service role can insert email logs"
  ON public.email_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 5. CREATE PASSWORD RESET OTPs TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on password_reset_otps
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Index for password_reset_otps
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON public.password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_used ON public.password_reset_otps(used, expires_at);

-- RLS Policy: Users can only access their own OTPs
CREATE POLICY "Users can view their own OTPs"
  ON public.password_reset_otps FOR SELECT
  USING (email IN (SELECT email FROM public.users WHERE id = auth.uid()));

-- RLS Policy: Backend service can insert OTPs
CREATE POLICY "Service role can insert OTPs"
  ON public.password_reset_otps FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 6. CREATE ROOMS TABLE (Physical Inventory)
-- ============================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Indexes for rooms
CREATE INDEX IF NOT EXISTS idx_rooms_number ON public.rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON public.rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);

-- RLS Policy: Anyone can view rooms
CREATE POLICY "Anyone can view rooms"
  ON public.rooms FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS Policy: Only admins can manage rooms
CREATE POLICY "Only admins can manage rooms"
  ON public.rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- 7. UPDATE EXISTING RLS POLICIES
-- ============================================

-- Drop old policies that might conflict
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

-- Update users table policies for role-based access
CREATE POLICY "Users can view own profile, admins view all"
  ON public.users FOR SELECT
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Users can update their own profile, admins update all"
  ON public.users FOR UPDATE
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Update bookings table policies for role-based access
CREATE POLICY "Customers view own bookings, staff/admins view all"
  ON public.bookings FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Customers create own bookings, staff/admins create all"
  ON public.bookings FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Customers update own bookings, staff/admins update all"
  ON public.bookings FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Only admins can delete bookings"
  ON public.bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- 8. UPDATE BOOKING_ITEMS POLICIES
-- ============================================

-- Update booking_items policies for admin access
DROP POLICY IF EXISTS "Users can view their own booking items" ON public.booking_items;
DROP POLICY IF EXISTS "Users can create booking items" ON public.booking_items;

CREATE POLICY "Customers view own items, staff/admins view all"
  ON public.booking_items FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Customers create own items, staff/admins create all"
  ON public.booking_items FOR INSERT
  WITH CHECK (
    booking_id IN (
      SELECT id FROM public.bookings WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Customers update own items, staff/admins update all"
  ON public.booking_items FOR UPDATE
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

-- Keep service role policy for backend operations
DROP POLICY IF EXISTS "Service role can manage booking items" ON public.booking_items;

CREATE POLICY "Service role can manage all booking items"
  ON public.booking_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 9. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_uuid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is staff or admin
CREATE OR REPLACE FUNCTION is_staff_or_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_uuid AND role IN ('admin', 'staff')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- 10. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.users.role IS 'User role: admin, staff, or customer';
COMMENT ON COLUMN public.users.is_active IS 'Whether the account is active (for admin management)';
COMMENT ON COLUMN public.users.last_login IS 'Timestamp of last successful login';
COMMENT ON COLUMN public.users.full_name IS 'Full name of the user (combines first_name and last_name)';

COMMENT ON COLUMN public.bookings.created_by IS 'Admin/staff user who created this booking (if created by staff)';
COMMENT ON COLUMN public.bookings.booking_time IS 'Time slot for the booking';
COMMENT ON COLUMN public.bookings.visit_time IS 'Visit time preference (morning/night for day passes)';
COMMENT ON COLUMN public.bookings.cottage IS 'Selected cottage type';

COMMENT ON TABLE public.audit_logs IS 'Tracks all administrative actions for accountability';
COMMENT ON TABLE public.email_logs IS 'Tracks all email notifications sent by the system';
COMMENT ON TABLE public.password_reset_otps IS 'Stores OTP tokens for password reset functionality';
COMMENT ON TABLE public.rooms IS 'Physical room inventory for admin management';

-- ============================================
-- 11. INSERT SAMPLE ADMIN USER (OPTIONAL)
-- ============================================
-- Uncomment and modify to create initial admin account
-- The user must first be created in Supabase Auth
-- 
-- INSERT INTO public.users (id, email, first_name, last_name, full_name, role, is_active)
-- VALUES (
--   'YOUR_SUPABASE_AUTH_UUID_HERE',
--   'admin@kinaresort.com',
--   'Admin',
--   'User',
--   'Admin User',
--   'admin',
--   true
-- );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration worked

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'bookings' 
-- ORDER BY ordinal_position;

-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('audit_logs', 'email_logs', 'password_reset_otps', 'rooms')
-- ORDER BY table_name;

