-- Seat Selection System Migration
-- Run this in your Supabase SQL Editor after database-update.sql
-- This adds seat categories, seat pricing, and seat bookings to the existing schema

-- First, enhance the existing venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS seat_map_url TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS seat_map_config JSONB;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- Update existing venues to have capacity (if they don't already)
UPDATE venues SET capacity = 300 WHERE capacity IS NULL;

-- Create seat categories table
CREATE TABLE IF NOT EXISTS seat_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_code TEXT DEFAULT '#3B82F6', -- Default blue color
  base_price_multiplier DECIMAL(3,2) DEFAULT 1.0,
  max_capacity INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create show seat pricing table (replaces the simple price in shows)
CREATE TABLE IF NOT EXISTS show_seat_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  seat_category_id UUID REFERENCES seat_categories(id) ON DELETE CASCADE,
  price INTEGER NOT NULL, -- In pence
  available_seats INTEGER NOT NULL,
  sold_seats INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(show_id, seat_category_id)
);

-- Create individual seat bookings table (replaces purchases for seat-specific bookings)
CREATE TABLE IF NOT EXISTS seat_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  seat_category_id UUID REFERENCES seat_categories(id),
  customer_email TEXT NOT NULL,
  seat_row TEXT,
  seat_number TEXT,
  price INTEGER NOT NULL, -- In pence
  status TEXT DEFAULT 'confirmed',
  stripe_session_id TEXT,
  verification_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_seat_categories_venue_id ON seat_categories(venue_id);
CREATE INDEX IF NOT EXISTS idx_show_seat_pricing_show_id ON show_seat_pricing(show_id);
CREATE INDEX IF NOT EXISTS idx_show_seat_pricing_category_id ON show_seat_pricing(seat_category_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_show_id ON seat_bookings(show_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_customer_email ON seat_bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_verification_code ON seat_bookings(verification_code);

-- Enable Row Level Security
ALTER TABLE seat_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_seat_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for seat_categories (venues can manage their own categories)
DROP POLICY IF EXISTS "Anyone can view seat categories" ON seat_categories;
CREATE POLICY "Anyone can view seat categories" ON seat_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Venues can manage their seat categories" ON seat_categories;
CREATE POLICY "Venues can manage their seat categories" ON seat_categories FOR ALL USING (true);

-- Create policies for show_seat_pricing
DROP POLICY IF EXISTS "Anyone can view show pricing" ON show_seat_pricing;
CREATE POLICY "Anyone can view show pricing" ON show_seat_pricing FOR SELECT USING (true);
DROP POLICY IF EXISTS "Venues can manage show pricing" ON show_seat_pricing;
CREATE POLICY "Venues can manage show pricing" ON show_seat_pricing FOR ALL USING (true);

-- Create policies for seat_bookings
DROP POLICY IF EXISTS "Anyone can view seat bookings" ON seat_bookings;
CREATE POLICY "Anyone can view seat bookings" ON seat_bookings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can create seat bookings" ON seat_bookings;
CREATE POLICY "Anyone can create seat bookings" ON seat_bookings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Venues can manage seat bookings" ON seat_bookings;
CREATE POLICY "Venues can manage seat bookings" ON seat_bookings FOR ALL USING (true);

-- Insert seat categories for existing venues
INSERT INTO seat_categories (venue_id, name, color_code, base_price_multiplier, max_capacity, description) 
SELECT 
  v.id,
  'Premium',
  '#FFD700',
  1.5,
  GREATEST(1, FLOOR(COALESCE(v.capacity, 300) * 0.2)),
  'Best seats in the house - front row with perfect view'
FROM venues v
WHERE NOT EXISTS (
  SELECT 1 FROM seat_categories sc WHERE sc.venue_id = v.id AND sc.name = 'Premium'
);

INSERT INTO seat_categories (venue_id, name, color_code, base_price_multiplier, max_capacity, description) 
SELECT 
  v.id,
  'Standard',
  '#3B82F6',
  1.0,
  GREATEST(1, FLOOR(COALESCE(v.capacity, 300) * 0.6)),
  'Great seats with excellent view of the stage'
FROM venues v
WHERE NOT EXISTS (
  SELECT 1 FROM seat_categories sc WHERE sc.venue_id = v.id AND sc.name = 'Standard'
);

INSERT INTO seat_categories (venue_id, name, color_code, base_price_multiplier, max_capacity, description) 
SELECT 
  v.id,
  'Economy',
  '#6B7280',
  0.8,
  GREATEST(1, FLOOR(COALESCE(v.capacity, 300) * 0.2)),
  'Good value seats with clear view of the stage'
FROM venues v
WHERE NOT EXISTS (
  SELECT 1 FROM seat_categories sc WHERE sc.venue_id = v.id AND sc.name = 'Economy'
);

-- Function to automatically create show seat pricing when a show is created
CREATE OR REPLACE FUNCTION create_show_seat_pricing()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert pricing for all seat categories of the venue
  INSERT INTO show_seat_pricing (show_id, seat_category_id, price, available_seats)
  SELECT 
    NEW.id,
    sc.id,
    -- Use the show's base price multiplied by category multiplier
    ROUND(NEW.price * sc.base_price_multiplier),
    sc.max_capacity
  FROM seat_categories sc
  WHERE sc.venue_id = NEW.venue_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set up seat pricing
DROP TRIGGER IF EXISTS trigger_create_show_seat_pricing ON shows;
CREATE TRIGGER trigger_create_show_seat_pricing
  AFTER INSERT ON shows
  FOR EACH ROW
  EXECUTE FUNCTION create_show_seat_pricing();

-- Function to update available seats when bookings are made
CREATE OR REPLACE FUNCTION update_seat_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increase sold seats
    UPDATE show_seat_pricing 
    SET sold_seats = sold_seats + 1
    WHERE show_id = NEW.show_id AND seat_category_id = NEW.seat_category_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease sold seats (for cancellations)
    UPDATE show_seat_pricing 
    SET sold_seats = GREATEST(0, sold_seats - 1)
    WHERE show_id = OLD.show_id AND seat_category_id = OLD.seat_category_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update seat availability
DROP TRIGGER IF EXISTS trigger_update_seat_availability ON seat_bookings;
CREATE TRIGGER trigger_update_seat_availability
  AFTER INSERT OR DELETE ON seat_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_seat_availability();

-- View to get show information with seat pricing (for easier queries)
CREATE OR REPLACE VIEW show_with_pricing AS
SELECT 
  s.*,
  v.name as venue_name,
  json_agg(
    json_build_object(
      'category_id', sc.id,
      'category_name', sc.name,
      'color_code', sc.color_code,
      'price', ssp.price,
      'available_seats', ssp.available_seats,
      'sold_seats', ssp.sold_seats,
      'description', sc.description
    ) ORDER BY ssp.price DESC
  ) as seat_pricing
FROM shows s
JOIN venues v ON s.venue_id = v.id
LEFT JOIN show_seat_pricing ssp ON s.id = ssp.show_id
LEFT JOIN seat_categories sc ON ssp.seat_category_id = sc.id
GROUP BY s.id, v.name;

-- Create seat pricing for existing shows
INSERT INTO show_seat_pricing (show_id, seat_category_id, price, available_seats)
SELECT 
  s.id,
  sc.id,
  ROUND(s.price * sc.base_price_multiplier),
  sc.max_capacity
FROM shows s
JOIN seat_categories sc ON sc.venue_id = s.venue_id
WHERE NOT EXISTS (
  SELECT 1 FROM show_seat_pricing ssp 
  WHERE ssp.show_id = s.id AND ssp.seat_category_id = sc.id
);

-- Function for seat-aware ticket purchasing (replaces the old purchase_ticket function)
CREATE OR REPLACE FUNCTION purchase_seat_tickets(
  p_show_id UUID,
  p_customer_email TEXT,
  p_stripe_session_id TEXT,
  p_seat_details JSONB -- Array of {categoryId, price, row, seatNumber}
) RETURNS BOOLEAN AS $$
DECLARE
  seat_detail JSONB;
  booking_id UUID;
  verification_code TEXT;
BEGIN
  -- Process each seat booking
  FOR seat_detail IN SELECT * FROM jsonb_array_elements(p_seat_details)
  LOOP
    -- Generate verification code
    verification_code := substr(md5(random()::text), 1, 8);
    
    -- Check availability and book the seat
    UPDATE show_seat_pricing 
    SET sold_seats = sold_seats + 1 
    WHERE show_id = p_show_id 
      AND seat_category_id = (seat_detail->>'categoryId')::UUID
      AND sold_seats < available_seats;
    
    IF NOT FOUND THEN
      -- Seat category not available
      RAISE EXCEPTION 'Seat category % not available', seat_detail->>'categoryName';
    END IF;
    
    -- Create the seat booking
    INSERT INTO seat_bookings (
      show_id, 
      seat_category_id, 
      customer_email, 
      seat_row, 
      seat_number, 
      price, 
      stripe_session_id,
      verification_code
    ) VALUES (
      p_show_id,
      (seat_detail->>'categoryId')::UUID,
      p_customer_email,
      seat_detail->>'row',
      seat_detail->>'seatNumber',
      (seat_detail->>'price')::INTEGER,
      p_stripe_session_id,
      verification_code
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE seat_categories IS 'Different seat categories for each venue (Premium, Standard, etc.)';
COMMENT ON TABLE show_seat_pricing IS 'Pricing for each seat category for each show';
COMMENT ON TABLE seat_bookings IS 'Individual seat bookings with specific seat assignments';
COMMENT ON VIEW show_with_pricing IS 'Combined view of shows with their seat pricing information';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Seat selection system migration completed successfully!';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '1. Create venues with seat categories';
  RAISE NOTICE '2. Upload seat maps';
  RAISE NOTICE '3. Create shows with automatic seat pricing';
  RAISE NOTICE '4. Allow customers to select specific seats';
END $$; 