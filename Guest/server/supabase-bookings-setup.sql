-- Kina Resort Booking Setup SQL
-- Run this in Supabase SQL Editor

-- Add booking terms to admin_settings
INSERT INTO public.admin_settings (key, value, updated_at)
VALUES (
  'booking_terms',
  jsonb_build_object(
    'title', 'Booking and Cancellation Policy',
    'content', '<h4>Reservation Policy</h4><p>All reservations require a valid credit card or advance payment to confirm booking. Full payment is required at check-in.</p><h4>Cancellation Policy</h4><ul><li><strong>Free Cancellation:</strong> Cancel up to 48 hours before check-in for a full refund.</li><li><strong>Late Cancellation:</strong> Cancellations made within 48 hours of check-in will incur a charge equal to one night''s stay.</li><li><strong>No-Show:</strong> Failure to check-in without prior cancellation will result in a charge for the entire reservation.</li></ul><h4>Check-In & Check-Out</h4><ul><li><strong>Check-in:</strong> 2:00 PM</li><li><strong>Check-out:</strong> 12:00 PM</li><li>Early check-in or late check-out is subject to availability and may incur additional charges.</li></ul><h4>Guest Responsibilities</h4><ul><li>Guests are responsible for any damages to resort property during their stay.</li><li>The resort is not liable for lost or stolen personal belongings.</li><li>Guests must comply with resort rules and regulations.</li></ul><h4>Payment Terms</h4><ul><li>All rates are subject to applicable taxes and service charges.</li><li>Additional charges for incidentals will be billed separately.</li><li>Payment methods accepted: Cash, Credit Card, GCash, Bank Transfer.</li></ul><h4>Modifications</h4><p>The resort reserves the right to modify these terms at any time. Guests will be notified of any changes.</p>',
    'lastUpdated', '2024-10-26'
  ),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

-- Add columns to bookings table for detailed booking data
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payment_mode TEXT,
ADD COLUMN IF NOT EXISTS per_room_guests JSONB,
ADD COLUMN IF NOT EXISTS contact_number TEXT,
ADD COLUMN IF NOT EXISTS special_requests TEXT,
ADD COLUMN IF NOT EXISTS selected_cottages JSONB;

-- Add comments
COMMENT ON COLUMN public.bookings.per_room_guests IS 'Array of {roomId, guestName, adults, children}';
COMMENT ON COLUMN public.bookings.selected_cottages IS 'Array of selected cottage IDs';














