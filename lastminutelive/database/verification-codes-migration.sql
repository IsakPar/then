-- Add verification code to purchases table
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS verification_code TEXT;

-- Add venue email to venues table  
ALTER TABLE venues ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on verification code for fast lookups
CREATE INDEX IF NOT EXISTS idx_purchases_verification_code ON purchases(verification_code);

-- Function to generate random 6-digit verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT lpad(floor(random() * 1000000)::text, 6, '0');
$$; 