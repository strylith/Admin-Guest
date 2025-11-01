-- ==========================================
-- SQL to create OTP table for forgot password
-- ==========================================
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS password_reset_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otps_email ON password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_expires ON password_reset_otps(expires_at);

-- Disable RLS
ALTER TABLE password_reset_otps DISABLE ROW LEVEL SECURITY;

-- Delete expired OTPs older than 24 hours
DELETE FROM password_reset_otps WHERE expires_at < NOW() - INTERVAL '24 hours';

SELECT 'OTP table created successfully!' as message;
