-- Migration: Add function hall metadata to bookings table
-- Run this SQL in your Supabase SQL Editor

-- Add JSONB column to store function hall metadata
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS function_hall_metadata JSONB;

-- Add comment for clarity
COMMENT ON COLUMN public.bookings.function_hall_metadata IS 'Stores function hall specific data: event_name, event_type, setup_type, decoration_theme, organization, start_time, end_time, sound_system_required, projector_required, catering_required, equipment_addons';

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name = 'function_hall_metadata';



