-- Kina Resort: Restructure Booking Items Database
-- This migration creates a unified booking_items table to replace JSON arrays
-- Run this in Supabase SQL Editor

-- Step 1: Create booking_items table to replace JSON arrays
CREATE TABLE IF NOT EXISTS public.booking_items (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('room', 'cottage', 'function-hall')),
  item_id TEXT NOT NULL,
  guest_name TEXT,
  adults INTEGER DEFAULT 0,
  children INTEGER DEFAULT 0,
  price_per_unit DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast calendar queries
CREATE INDEX IF NOT EXISTS idx_booking_items_type_id ON public.booking_items(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items(booking_id);

-- Enable RLS
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view items from their bookings
CREATE POLICY "Users can view their own booking items"
  ON public.booking_items FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE user_id = auth.uid()
    )
  );

-- RLS policy: users can insert items for their bookings
CREATE POLICY "Users can create booking items"
  ON public.booking_items FOR INSERT
  WITH CHECK (
    booking_id IN (
      SELECT id FROM public.bookings WHERE user_id = auth.uid()
    )
  );

-- RLS policy: service role can insert items (for backend API)
CREATE POLICY "Service role can manage booking items"
  ON public.booking_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Step 2: Migrate Existing Data from JSON arrays to booking_items rows
DO $$
DECLARE
  booking_rec RECORD;
  room_item JSONB;
  cottage_item TEXT;
  rooms_migrated INTEGER := 0;
  cottages_migrated INTEGER := 0;
BEGIN
  -- Process each booking
  FOR booking_rec IN 
    SELECT id, per_room_guests, selected_cottages, check_in, check_out 
    FROM public.bookings 
    WHERE (per_room_guests IS NOT NULL AND jsonb_array_length(per_room_guests) > 0) 
       OR (selected_cottages IS NOT NULL AND jsonb_array_length(selected_cottages) > 0)
  LOOP
    -- Migrate per_room_guests (rooms)
    IF booking_rec.per_room_guests IS NOT NULL THEN
      FOR room_item IN SELECT * FROM jsonb_array_elements(booking_rec.per_room_guests)
      LOOP
        INSERT INTO public.booking_items (
          booking_id, item_type, item_id, guest_name, adults, children
        ) VALUES (
          booking_rec.id,
          'room',
          room_item->>'roomId',
          room_item->>'guestName',
          COALESCE((room_item->>'adults')::INTEGER, 0),
          COALESCE((room_item->>'children')::INTEGER, 0)
        );
        rooms_migrated := rooms_migrated + 1;
      END LOOP;
    END IF;
    
    -- Migrate selected_cottages (cottages)
    IF booking_rec.selected_cottages IS NOT NULL THEN
      FOR cottage_item IN SELECT * FROM jsonb_array_elements_text(booking_rec.selected_cottages)
      LOOP
        INSERT INTO public.booking_items (
          booking_id, item_type, item_id
        ) VALUES (
          booking_rec.id,
          'cottage',
          cottage_item
        );
        cottages_migrated := cottages_migrated + 1;
      END LOOP;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration complete. Migrated % rooms and % cottages to booking_items.', rooms_migrated, cottages_migrated;
END $$;

-- Step 3: Add comments for documentation
COMMENT ON TABLE public.booking_items IS 'Stores individual items (rooms, cottages, function halls) booked in a reservation';
COMMENT ON COLUMN public.booking_items.item_type IS 'Type of item: room, cottage, or function-hall';
COMMENT ON COLUMN public.booking_items.item_id IS 'Specific item identifier (e.g., "Room 01", "Family Cottage")';
COMMENT ON COLUMN public.booking_items.guest_name IS 'Name of primary guest for this specific item';
COMMENT ON COLUMN public.booking_items.adults IS 'Number of adults for this item';
COMMENT ON COLUMN public.booking_items.children IS 'Number of children for this item';

-- Note: Keep the old columns (per_room_guests, selected_cottages) for now
-- Drop them after verifying the migration worked correctly
-- Uncomment the lines below after successful verification:
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS per_room_guests;
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS selected_cottages;














