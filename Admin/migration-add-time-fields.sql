-- Add start_time and end_time fields to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add comments for documentation
COMMENT ON COLUMN public.bookings.start_time IS 'Start time for the booking';
COMMENT ON COLUMN public.bookings.end_time IS 'End time for the booking';

