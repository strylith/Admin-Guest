-- Database Inspection Queries for Kina Resort
-- Run these in Supabase SQL Editor to verify booking data

-- 1. Check bookings table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;

-- 2. Check recent bookings
SELECT 
    id,
    user_id,
    package_id,
    check_in,
    check_out,
    guests,
    per_room_guests,
    selected_cottages,
    total_cost,
    payment_mode,
    status,
    created_at
FROM bookings
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if per_room_guests contains data
SELECT 
    id,
    check_in,
    check_out,
    per_room_guests,
    jsonb_array_length(per_room_guests) as room_count
FROM bookings
WHERE per_room_guests IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check bookings with specific date range
SELECT 
    id,
    check_in,
    check_out,
    guests,
    per_room_guests,
    status
FROM bookings
WHERE package_id = 1
AND check_in >= '2025-10-01'
AND check_out <= '2025-12-31'
ORDER BY check_in;

-- 5. Count bookings per month
SELECT 
    DATE_TRUNC('month', check_in) as month,
    COUNT(*) as booking_count,
    COUNT(DISTINCT user_id) as unique_users
FROM bookings
WHERE check_in >= '2025-10-01'
GROUP BY DATE_TRUNC('month', check_in)
ORDER BY month;

-- 6. Check if guests column is JSONB
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name = 'guests';

-- 7. Sample booking data for testing
SELECT 
    id,
    check_in,
    check_out,
    jsonb_pretty(guests) as guests,
    jsonb_pretty(per_room_guests) as per_room_guests,
    jsonb_pretty(selected_cottages) as selected_cottages
FROM bookings
ORDER BY created_at DESC
LIMIT 1;














