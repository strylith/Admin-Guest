-- Migration: Add booking_time field to bookings table
-- This allows users to enter booking time in any format they prefer

-- Add booking_time column if it doesn't exist
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_time TEXT;

-- Optional: Add a comment to explain the field
COMMENT ON COLUMN bookings.booking_time IS 'User-entered booking time in any format (e.g., "9:00 AM - 5:00 PM", "9am to 5pm")';

