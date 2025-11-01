-- Kina Resort: Create kina schema and migrate from public
-- This migration creates the kina schema and moves all tables from public
-- Run this BEFORE other migrations if using kina schema

-- ============================================
-- CREATE kina SCHEMA
-- ============================================

CREATE SCHEMA IF NOT EXISTS kina;

-- Grant permissions
GRANT USAGE ON SCHEMA kina TO authenticated, anon, service_role;
GRANT ALL ON SCHEMA kina TO service_role;

-- ============================================
-- CREATE TABLES IN kina SCHEMA
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS kina.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
  is_active BOOLEAN DEFAULT true,
  member_since TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  loyalty_points INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Packages table
CREATE TABLE IF NOT EXISTS kina.packages (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('rooms', 'cottages', 'function-halls')),
  price TEXT NOT NULL,
  capacity INTEGER DEFAULT 10,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS kina.bookings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES kina.users(id) ON DELETE CASCADE,
  package_id INTEGER NOT NULL REFERENCES kina.packages(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_by UUID REFERENCES kina.users(id),
  booking_time TEXT,
  guest_count INTEGER DEFAULT 1,
  extra_guest_charge DECIMAL(10, 2) DEFAULT 0,
  adults INTEGER,
  kids INTEGER,
  visit_time TEXT,
  cottage TEXT,
  entrance_fee DECIMAL(10, 2) DEFAULT 0,
  cottage_fee DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(10, 2),
  payment_mode TEXT,
  per_room_guests JSONB,
  contact_number TEXT,
  special_requests TEXT,
  selected_cottages JSONB,
  function_hall_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking items table
CREATE TABLE IF NOT EXISTS kina.booking_items (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES kina.bookings(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('room', 'cottage', 'function-hall')),
  item_id TEXT NOT NULL,
  usage_date DATE,
  guest_name TEXT,
  adults INTEGER DEFAULT 0,
  children INTEGER DEFAULT 0,
  price_per_unit DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reservations calendar table
CREATE TABLE IF NOT EXISTS kina.reservations_calendar (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES kina.packages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reserved_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(package_id, date)
);

-- Admin settings table
CREATE TABLE IF NOT EXISTS kina.admin_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS kina.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES kina.users(id),
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

-- Email logs table
CREATE TABLE IF NOT EXISTS kina.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password reset OTPs table
CREATE TABLE IF NOT EXISTS kina.password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS kina.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_role ON kina.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON kina.users(email);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON kina.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package_id ON kina.bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON kina.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON kina.bookings(created_by);
CREATE INDEX IF NOT EXISTS idx_booking_items_type_id ON kina.booking_items(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON kina.booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_reservations_package_date ON kina.reservations_calendar(package_id, date);
CREATE INDEX IF NOT EXISTS idx_packages_category ON kina.packages(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON kina.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON kina.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON kina.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON kina.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON kina.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON kina.password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_used ON kina.password_reset_otps(used, expires_at);
CREATE INDEX IF NOT EXISTS idx_rooms_number ON kina.rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON kina.rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON kina.rooms(status);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant permissions on all tables to service_role
GRANT ALL ON ALL TABLES IN SCHEMA kina TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA kina TO service_role;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA kina TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kina TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA kina TO authenticated;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE kina.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kina.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kina.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kina.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kina.reservations_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE kina.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kina.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kina.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kina.password_reset_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE kina.rooms ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users policies
CREATE POLICY "Users can view own profile, admins view all"
  ON kina.users FOR SELECT
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Users can update their own profile, admins update all"
  ON kina.users FOR UPDATE
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Packages policies
CREATE POLICY "Anyone can view packages"
  ON kina.packages FOR SELECT
  TO authenticated, anon
  USING (true);

-- Bookings policies
CREATE POLICY "Customers view own bookings, staff/admins view all"
  ON kina.bookings FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Customers create own bookings, staff/admins create all"
  ON kina.bookings FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Customers update own bookings, staff/admins update all"
  ON kina.bookings FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Only admins can delete bookings"
  ON kina.bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Booking items policies
CREATE POLICY "Customers view own items, staff/admins view all"
  ON kina.booking_items FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM kina.bookings WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Customers create own items, staff/admins create all"
  ON kina.booking_items FOR INSERT
  WITH CHECK (
    booking_id IN (
      SELECT id FROM kina.bookings WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Customers update own items, staff/admins update all"
  ON kina.booking_items FOR UPDATE
  USING (
    booking_id IN (
      SELECT id FROM kina.bookings WHERE user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Service role can manage all booking items"
  ON kina.booking_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Reservations calendar policies
CREATE POLICY "Anyone can view reservations calendar"
  ON kina.reservations_calendar FOR SELECT
  TO authenticated, anon
  USING (true);

-- Audit logs policies
CREATE POLICY "Only admins can view audit logs"
  ON kina.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert audit logs"
  ON kina.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Email logs policies
CREATE POLICY "Only admins can view email logs"
  ON kina.email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Service role can insert email logs"
  ON kina.email_logs FOR INSERT
  WITH CHECK (true);

-- Password reset OTPs policies
CREATE POLICY "Users can view their own OTPs"
  ON kina.password_reset_otps FOR SELECT
  USING (email IN (SELECT email FROM kina.users WHERE id = auth.uid()));

CREATE POLICY "Service role can insert OTPs"
  ON kina.password_reset_otps FOR INSERT
  WITH CHECK (true);

-- Rooms policies
CREATE POLICY "Anyone can view rooms"
  ON kina.rooms FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admins can manage rooms"
  ON kina.rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kina.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION kina.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM kina.users WHERE id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION kina.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM kina.users 
    WHERE id = user_uuid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION kina.is_staff_or_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM kina.users 
    WHERE id = user_uuid AND role IN ('admin', 'staff')
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION kina.increment_user_bookings(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE kina.users
  SET total_bookings = total_bookings + 1,
      updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SAMPLE DATA (OPTIONAL)
-- ============================================

-- Insert sample packages
INSERT INTO kina.packages (title, category, price, capacity, description, image_url) VALUES
('Standard Room', 'rooms', '₱1,500/night', 4, 'Comfortable rooms with air conditioning, family-sized bed and private bathroom. All 4 rooms are identically designed with modern amenities and stunning garden views.', 'images/kina1.jpg'),
('Ocean View Room', 'rooms', '₱1,500/night', 4, 'Room with balcony overlooking the ocean, perfect for sunset views.', 'images/kina2.jpg'),
('Deluxe Suite', 'rooms', '₱1,500/night', 6, 'Spacious suite with separate living area, mini-fridge, and premium amenities.', 'images/kina3.jpg'),
('Premium King', 'rooms', '₱1,500/night', 7, 'Executive comfort with elegant design and premium furnishings.', 'images/resort1.JPG'),
('Standard Cottage', 'cottages', '₱400', 8, 'Private cottage with basic amenities.', 'images/cottage_1.JPG'),
('Open Cottage', 'cottages', '₱300', 8, 'Cozy cottage surrounded by tropical gardens, perfect for peaceful relaxation.', 'images/cottage_2.JPG'),
('Family Cottage', 'cottages', '₱500', 8, 'A spacious, open-air cottage with tables and chairs, ideal for daytime relaxation, dining, and gatherings.', 'images/kina1.jpg'),
('Grand Function Hall', 'function-halls', '₱10,000+', 100, 'Spacious hall perfect for weddings, conferences, and large events. Includes tables, chairs, sound system, and air conditioning.', 'images/Function Hall.JPG'),
('Intimate Function Hall', 'function-halls', '₱10,000+', 100, 'Cozy hall ideal for birthday parties, meetings, and gatherings. Perfect for smaller celebrations with modern amenities.', 'images/Function Hall.JPG')
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON SCHEMA kina IS 'Kina Resort database schema - unified guest and admin system';
COMMENT ON COLUMN kina.users.role IS 'User role: admin, staff, or customer';
COMMENT ON COLUMN kina.users.is_active IS 'Whether the account is active (for admin management)';
COMMENT ON COLUMN kina.users.last_login IS 'Timestamp of last successful login';
COMMENT ON COLUMN kina.users.full_name IS 'Full name of the user (combines first_name and last_name)';
COMMENT ON COLUMN kina.bookings.created_by IS 'Admin/staff user who created this booking (if created by staff)';
COMMENT ON COLUMN kina.bookings.guests IS 'JSON object: {adults: number, children: number}';
COMMENT ON COLUMN kina.bookings.per_room_guests IS 'Array of room assignments: [{roomId: string, guestName: string, adults: number, children: number}]';
COMMENT ON COLUMN kina.bookings.selected_cottages IS 'Array of selected cottage IDs: [string]';
COMMENT ON COLUMN kina.bookings.function_hall_metadata IS 'Function hall specific data: event_name, event_type, setup_type, etc.';
COMMENT ON COLUMN kina.booking_items.item_type IS 'Type of item: room, cottage, or function-hall';
COMMENT ON COLUMN kina.booking_items.item_id IS 'Specific item identifier (e.g., "Room 01", "Family Cottage")';
COMMENT ON TABLE kina.audit_logs IS 'Tracks all administrative actions for accountability';
COMMENT ON TABLE kina.email_logs IS 'Tracks all email notifications sent by the system';
COMMENT ON TABLE kina.password_reset_otps IS 'Stores OTP tokens for password reset functionality';
COMMENT ON TABLE kina.rooms IS 'Physical room inventory for admin management';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if kina schema exists and has tables
SELECT 
  table_schema, 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'kina' 
ORDER BY table_name;

-- Check indexes
SELECT 
  schemaname, 
  tablename, 
  indexname 
FROM pg_indexes 
WHERE schemaname = 'kina' 
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname 
FROM pg_policies 
WHERE schemaname = 'kina' 
ORDER BY tablename, policyname;

-- Verify all tables have RLS enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'kina' 
ORDER BY tablename;

