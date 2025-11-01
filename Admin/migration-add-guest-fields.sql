-- Migration to add guest_count and extra_guest_charge fields to bookings table

-- Add guest_count column
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1 NOT NULL;

-- Add extra_guest_charge column
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS extra_guest_charge DECIMAL(10, 2) DEFAULT 0 NOT NULL;

-- Add constraint to ensure guest_count is positive
ALTER TABLE bookings 
ADD CONSTRAINT check_guest_count_positive 
CHECK (guest_count > 0);

-- Add constraint to ensure extra_guest_charge is non-negative
ALTER TABLE bookings 
ADD CONSTRAINT check_extra_charge_non_negative 
CHECK (extra_guest_charge >= 0);

