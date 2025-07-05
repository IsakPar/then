-- ============================================================================
-- FRESH START MIGRATION - NUCLEAR CLEANUP + COMPLETE REBUILD
-- ============================================================================
-- This script completely wipes and rebuilds the ticketing system from scratch
-- Run this in a NEW Supabase SQL Editor window

-- ============================================================================
-- 1. NUCLEAR CLEANUP - REMOVE EVERYTHING
-- ============================================================================

-- Drop all functions (CASCADE removes dependencies)
DROP FUNCTION IF EXISTS create_seat_reservations CASCADE;
DROP FUNCTION IF EXISTS confirm_seat_reservations CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_reservations CASCADE;
DROP FUNCTION IF EXISTS cancel_seat_reservations CASCADE;
DROP FUNCTION IF EXISTS purchase_section_seats CASCADE;
DROP FUNCTION IF EXISTS create_show_section_pricing CASCADE;
DROP FUNCTION IF EXISTS update_section_availability CASCADE;
DROP FUNCTION IF EXISTS set_venue_slug CASCADE;

-- Drop all triggers completely
DROP TRIGGER IF EXISTS trigger_create_show_section_pricing ON shows;
DROP TRIGGER IF EXISTS trigger_update_section_availability ON seat_bookings;
DROP TRIGGER IF EXISTS trigger_set_venue_slug ON venues;

-- Drop all views
DROP VIEW IF EXISTS show_section_availability CASCADE;
DROP VIEW IF EXISTS show_with_section_pricing CASCADE;
DROP VIEW IF EXISTS show_with_pricing CASCADE;

-- Drop policy dependencies safely
DROP POLICY IF EXISTS "Public read access for venue sections" ON venue_sections;
DROP POLICY IF EXISTS "Public read access for show section pricing" ON show_section_pricing;
DROP POLICY IF EXISTS "Users can create bookings" ON seat_bookings;
DROP POLICY IF EXISTS "Users can view their bookings" ON seat_bookings;

-- ============================================================================
-- 2. CLEAN SCHEMA SETUP
-- ============================================================================

-- Update venues table with all needed columns
ALTER TABLE venues 
  ADD COLUMN IF NOT EXISTS seat_map_url TEXT,
  ADD COLUMN IF NOT EXISTS seat_map_config JSONB,
  ADD COLUMN IF NOT EXISTS capacity INTEGER,
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Make password_hash nullable
ALTER TABLE venues ALTER COLUMN password_hash DROP NOT NULL;

-- Add unique constraint on slug safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'venues_slug_key') THEN
        ALTER TABLE venues ADD CONSTRAINT venues_slug_key UNIQUE (slug);
    END IF;
END $$;

-- Update shows table
ALTER TABLE shows ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2);
ALTER TABLE shows ALTER COLUMN price DROP NOT NULL;

-- Migrate price data safely
UPDATE shows SET base_price = COALESCE(price / 100.0, 25.00) WHERE base_price IS NULL;
UPDATE shows SET price = COALESCE(price, ROUND(base_price * 100)) WHERE price IS NULL;
ALTER TABLE shows ALTER COLUMN base_price SET NOT NULL;

-- ============================================================================
-- 3. CORE TABLES (RECREATE SAFELY)
-- ============================================================================

-- Create venue_sections table
CREATE TABLE IF NOT EXISTS venue_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  price_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  color_code TEXT DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_id, section_name)
);

-- Create show_section_pricing table
CREATE TABLE IF NOT EXISTS show_section_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES venue_sections(id) ON DELETE CASCADE,
  base_price DECIMAL(10,2) NOT NULL,
  final_price DECIMAL(10,2) NOT NULL,
  tickets_available INTEGER NOT NULL DEFAULT 0,
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(show_id, section_id)
);

-- Update seat_bookings table with reservation columns
ALTER TABLE seat_bookings 
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS booking_expires_at TIMESTAMP WITH TIME ZONE,  -- RENAMED to avoid conflicts
  ADD COLUMN IF NOT EXISTS reservation_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Clean up existing data
UPDATE seat_bookings SET status = 'confirmed' WHERE status IS NULL OR status = '';

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);
CREATE INDEX IF NOT EXISTS idx_venue_sections_venue_id ON venue_sections(venue_id);
CREATE INDEX IF NOT EXISTS idx_show_section_pricing_show_id ON show_section_pricing(show_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_section_id ON seat_bookings(section_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_reservation_id ON seat_bookings(reservation_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_expires ON seat_bookings(booking_expires_at);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_status ON seat_bookings(status);

-- ============================================================================
-- 5. VIEWS (FRESH APPROACH)
-- ============================================================================

-- Real-time availability view with NO ambiguous references
CREATE VIEW ticket_availability AS
SELECT 
  pricing.show_id,
  pricing.section_id,
  sections.section_name,
  sections.color_code,
  sections.price_multiplier,
  sections.sort_order,
  pricing.base_price,
  pricing.final_price,
  pricing.tickets_available,
  pricing.tickets_sold,
  COALESCE(active_reservations.reserved_count, 0) as tickets_reserved,
  GREATEST(0, pricing.tickets_available - pricing.tickets_sold - COALESCE(active_reservations.reserved_count, 0)) as tickets_available_now
FROM show_section_pricing pricing
JOIN venue_sections sections ON pricing.section_id = sections.id
LEFT JOIN (
  SELECT 
    bookings.show_id, 
    bookings.section_id, 
    COUNT(*) as reserved_count
  FROM seat_bookings bookings
  WHERE bookings.status = 'reserved' 
  AND bookings.booking_expires_at > NOW()
  GROUP BY bookings.show_id, bookings.section_id
) active_reservations ON pricing.show_id = active_reservations.show_id 
  AND pricing.section_id = active_reservations.section_id;

-- Customer-facing pricing view for compatibility
CREATE VIEW show_with_pricing AS
SELECT 
  shows.*,
  venues.name as venue_name,
  venues.address,
  venues.slug as venue_slug,
  COALESCE(array_agg(
    json_build_object(
      'category_id', sections.id,
      'category_name', sections.section_name,
      'price', pricing.final_price,
      'available_seats', (pricing.tickets_available - pricing.tickets_sold),
      'sold_seats', pricing.tickets_sold,
      'color_code', sections.color_code,
      'description', format('Section %s - £%.2f each', sections.section_name, pricing.final_price / 100.0)
    ) ORDER BY sections.sort_order
  ) FILTER (WHERE sections.id IS NOT NULL), '{}') as seat_pricing
FROM shows
JOIN venues ON shows.venue_id = venues.id
LEFT JOIN show_section_pricing pricing ON shows.id = pricing.show_id
LEFT JOIN venue_sections sections ON pricing.section_id = sections.id
GROUP BY shows.id, venues.name, venues.address, venues.slug;

-- ============================================================================
-- 6. RESERVATION FUNCTIONS (COMPLETELY NEW APPROACH)
-- ============================================================================

-- Clean up expired reservations (simple approach)
CREATE OR REPLACE FUNCTION expire_old_reservations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM seat_bookings
  WHERE status = 'reserved' 
  AND booking_expires_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create reservations with NO ambiguous column references
CREATE OR REPLACE FUNCTION reserve_seats(
  target_show_id UUID,
  section_bookings JSONB,
  reservation_ref TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  reservation_id TEXT,
  expires_at TIMESTAMPTZ,
  booking_details JSONB
) AS $$
DECLARE
  res_id TEXT;
  expiry_time TIMESTAMPTZ;
  booking_item JSONB;
  target_section_id UUID;
  requested_quantity INTEGER;
  section_info RECORD;
  available_count INTEGER;
  new_booking_id UUID;
  verification_code TEXT;
  details_array JSONB := '[]'::JSONB;
  detail_item JSONB;
BEGIN
  -- Generate unique reservation ID
  res_id := COALESCE(reservation_ref, 'rsv_' || LOWER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 16)));
  
  -- Set 10-minute expiry
  expiry_time := NOW() + INTERVAL '10 minutes';
  
  -- Clean up expired reservations first
  PERFORM expire_old_reservations();
  
  -- Process each section request
  FOR booking_item IN SELECT * FROM jsonb_array_elements(section_bookings)
  LOOP
    target_section_id := (booking_item->>'section_id')::UUID;
    requested_quantity := (booking_item->>'quantity')::INTEGER;
    
    -- Get section information
    SELECT 
      pricing.*, 
      sections.section_name, 
      sections.color_code
    INTO section_info
    FROM show_section_pricing pricing
    JOIN venue_sections sections ON pricing.section_id = sections.id
    WHERE pricing.show_id = target_show_id 
    AND pricing.section_id = target_section_id;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE, 'Section not found: ' || target_section_id::TEXT, res_id, expiry_time, details_array;
      RETURN;
    END IF;
    
    -- Calculate available seats using explicit approach
    SELECT 
      section_info.tickets_available - section_info.tickets_sold - COUNT(*)
    INTO available_count
    FROM seat_bookings
    WHERE show_id = target_show_id 
    AND section_id = target_section_id 
    AND status = 'reserved' 
    AND booking_expires_at > NOW();
    
    -- Check availability
    IF available_count < requested_quantity THEN
      RETURN QUERY SELECT FALSE, 
        format('Only %s seats available in section %s (requested: %s)', 
               available_count, section_info.section_name, requested_quantity),
        res_id, expiry_time, details_array;
      RETURN;
    END IF;
    
    -- Create reservations
    FOR i IN 1..requested_quantity LOOP
      new_booking_id := gen_random_uuid();
      verification_code := UPPER(SUBSTRING(MD5(new_booking_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
      
      INSERT INTO seat_bookings (
        id, show_id, section_id, reservation_id, verification_code,
        price_paid, status, reserved_at, booking_expires_at, created_at
      ) VALUES (
        new_booking_id, target_show_id, target_section_id, res_id, verification_code,
        section_info.final_price, 'reserved', NOW(), expiry_time, NOW()
      );
    END LOOP;
    
    -- Add to details
    detail_item := jsonb_build_object(
      'section_id', target_section_id,
      'section_name', section_info.section_name,
      'quantity', requested_quantity,
      'unit_price', section_info.final_price,
      'total_price', section_info.final_price * requested_quantity,
      'color_code', section_info.color_code
    );
    details_array := details_array || detail_item;
  END LOOP;
  
  RETURN QUERY SELECT TRUE, 'Seats reserved successfully', res_id, expiry_time, details_array;
END;
$$ LANGUAGE plpgsql;

-- Confirm reservations when payment succeeds
CREATE OR REPLACE FUNCTION confirm_reservation(
  reservation_ref TEXT,
  customer_email TEXT,
  stripe_session TEXT
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  confirmed_count INTEGER
) AS $$
DECLARE
  confirmation_count INTEGER;
BEGIN
  UPDATE seat_bookings
  SET 
    status = 'confirmed',
    customer_email = customer_email,
    stripe_session_id = stripe_session,
    booking_time = NOW(),
    updated_at = NOW()
  WHERE reservation_id = reservation_ref 
  AND status = 'reserved'
  AND booking_expires_at > NOW();
  
  GET DIAGNOSTICS confirmation_count = ROW_COUNT;
  
  IF confirmation_count = 0 THEN
    RETURN QUERY SELECT FALSE, 'No valid reservations found or expired', 0;
  ELSE
    RETURN QUERY SELECT TRUE, format('Confirmed %s bookings', confirmation_count), confirmation_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Cancel reservations
CREATE OR REPLACE FUNCTION cancel_reservation(reservation_ref TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE seat_bookings
  SET status = 'cancelled', updated_at = NOW()
  WHERE reservation_id = reservation_ref 
  AND status = 'reserved';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. UTILITY FUNCTIONS
-- ============================================================================

-- Auto-generate venue slugs
CREATE OR REPLACE FUNCTION generate_venue_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(regexp_replace(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  END IF;
  NEW.slug := lower(regexp_replace(regexp_replace(NEW.slug, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. TRIGGERS (MINIMAL SET)
-- ============================================================================

-- Only create the essential venue slug trigger
CREATE TRIGGER venue_slug_trigger
  BEFORE INSERT OR UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION generate_venue_slug();

-- ============================================================================
-- 9. SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE venue_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_section_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "public_read_venue_sections" ON venue_sections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_pricing" ON show_section_pricing FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "authenticated_insert_bookings" ON seat_bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_read_bookings" ON seat_bookings FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 10. PERMISSIONS
-- ============================================================================

-- Grant function permissions
GRANT EXECUTE ON FUNCTION reserve_seats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION confirm_reservation TO anon, authenticated;
GRANT EXECUTE ON FUNCTION expire_old_reservations TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_reservation TO anon, authenticated;

-- Grant view permissions
GRANT SELECT ON ticket_availability TO anon, authenticated;
GRANT SELECT ON show_with_pricing TO anon, authenticated;

-- ============================================================================
-- 11. UPDATE API ROUTE FUNCTION NAME
-- ============================================================================

-- Update the API route to use the new function name
COMMENT ON FUNCTION reserve_seats IS 'NEW FUNCTION NAME: Use reserve_seats instead of create_seat_reservations';

-- ============================================================================
-- 12. SUCCESS MESSAGE
-- ============================================================================

SELECT '🚀✨ FRESH START COMPLETE! New reservation system ready with functions: reserve_seats(), confirm_reservation(), cancel_reservation()' as status; 