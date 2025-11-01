-- Check Migration Status for booking_items Table
-- Run this in Supabase SQL Editor

-- 1. Check if booking_items table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'booking_items'
) as table_exists;

-- 2. Count booking_items records
SELECT COUNT(*) as total_booking_items
FROM booking_items;

-- 3. View all booking_items
SELECT 
  bi.id,
  bi.booking_id,
  bi.item_type,
  bi.item_id,
  bi.guest_name,
  bi.adults,
  bi.children,
  b.check_in,
  b.check_out,
  b.status
FROM booking_items bi
JOIN bookings b ON bi.booking_id = b.id
ORDER BY bi.created_at DESC;

-- 4. Count items by type
SELECT 
  item_type,
  COUNT(*) as count
FROM booking_items
GROUP BY item_type;

-- 5. Check if old columns still exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('per_room_guests', 'selected_cottages');

-- 6. Test query for calendar (rooms only)
SELECT 
  bi.item_id,
  bi.item_type,
  b.check_in,
  b.check_out,
  b.status
FROM booking_items bi
JOIN bookings b ON bi.booking_id = b.id
WHERE bi.item_type = 'room'
AND b.status IN ('pending', 'confirmed')
AND (b.check_in <= '2025-10-31' AND b.check_out >= '2025-10-01')
ORDER BY bi.item_id;

-- 7. Test query for calendar (cottages only)
SELECT 
  bi.item_id,
  bi.item_type,
  b.check_in,
  b.check_out,
  b.status
FROM booking_items bi
JOIN bookings b ON bi.booking_id = b.id
WHERE bi.item_type = 'cottage'
AND b.status IN ('pending', 'confirmed')
AND (b.check_in <= '2025-10-31' AND b.check_out >= '2025-10-01')
ORDER BY bi.item_id;














