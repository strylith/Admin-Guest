-- Fix: Change guests column from integer to jsonb to store {adults, children}
-- Run this in your Supabase SQL Editor

ALTER TABLE bookings 
ALTER COLUMN guests TYPE jsonb USING guests::text::jsonb;

-- Update the comment to reflect the new structure
COMMENT ON COLUMN bookings.guests IS 'Guest information stored as JSON: {"adults": number, "children": number}';














