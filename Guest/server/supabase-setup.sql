-- Kina Resort Database Setup for Supabase

-- Create users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  member_since TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  loyalty_points INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create packages table
CREATE TABLE IF NOT EXISTS public.packages (
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

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  package_id INTEGER NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reservations_calendar table
CREATE TABLE IF NOT EXISTS public.reservations_calendar (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reserved_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(package_id, date)
);

-- Create admin_settings table (for future use)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for packages table (public read)
CREATE POLICY "Anyone can view packages"
  ON public.packages FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS Policies for bookings table
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for reservations_calendar (public read)
CREATE POLICY "Anyone can view reservations calendar"
  ON public.reservations_calendar FOR SELECT
  TO authenticated, anon
  USING (true);

-- Function to increment user bookings count
CREATE OR REPLACE FUNCTION increment_user_bookings(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET total_bookings = total_bookings + 1,
      updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package_id ON public.bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_reservations_package_date ON public.reservations_calendar(package_id, date);
CREATE INDEX IF NOT EXISTS idx_packages_category ON public.packages(category);

-- Insert sample packages
INSERT INTO public.packages (title, category, price, capacity, description, image_url) VALUES
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













