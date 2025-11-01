-- Migration: Add missing columns to bookings table
-- Run this SQL in your Supabase SQL Editor

-- Change guests column to JSONB (if it exists as INTEGER)
ALTER TABLE public.bookings 
  ALTER COLUMN guests TYPE JSONB USING CASE 
    WHEN guests IS NULL THEN NULL 
    ELSE guests::TEXT::JSONB 
  END;

-- Add missing columns
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payment_mode TEXT,
  ADD COLUMN IF NOT EXISTS per_room_guests JSONB,
  ADD COLUMN IF NOT EXISTS contact_number TEXT,
  ADD COLUMN IF NOT EXISTS special_requests TEXT,
  ADD COLUMN IF NOT EXISTS selected_cottages JSONB;

-- Add comments for clarity
COMMENT ON COLUMN public.bookings.guests IS 'JSON object: {adults: number, children: number}';
COMMENT ON COLUMN public.bookings.per_room_guests IS 'Array of room assignments: [{roomId: string, guestName: string, adults: number, children: number}]';
COMMENT ON COLUMN public.bookings.selected_cottages IS 'Array of selected cottage IDs: [string]';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;














