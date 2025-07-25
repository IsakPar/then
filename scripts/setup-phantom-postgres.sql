-- 🎭 PHANTOM OF THE OPERA - POSTGRESQL SETUP
-- This script creates the Phantom show in PostgreSQL with last-minute pricing
-- Layout data comes from MongoDB, pricing/availability managed here

-- ==============================
-- 1. CREATE VENUE
-- ==============================

INSERT INTO venues (id, name, address, city, postcode, capacity, accessibility_info)
VALUES (
  gen_random_uuid(),
  'Her Majesty''s Theatre',
  'Haymarket, St. James''s',
  'London',
  'SW1Y 4QL',
  1252,
  'Wheelchair accessible seating available in all levels. Audio description and captioned performances available.'
) 
ON CONFLICT (name) DO NOTHING;

-- Get venue ID for reference
\set venue_id (SELECT id FROM venues WHERE name = 'Her Majesty''s Theatre' LIMIT 1)

-- ==============================
-- 2. CREATE SHOW
-- ==============================

INSERT INTO shows (id, title, venue_id, description, duration_minutes, age_rating, genre)
VALUES (
  gen_random_uuid(),
  'The Phantom of the Opera',
  :'venue_id',
  'Andrew Lloyd Webber''s legendary musical about the mysterious Opera Ghost. A timeless tale of love, music, and mystery in the Paris Opera House.',
  150,
  'PG',
  'Musical'
)
ON CONFLICT (title, venue_id) DO NOTHING;

-- Get show ID for reference  
\set show_id (SELECT id FROM shows WHERE title = 'The Phantom of the Opera' AND venue_id = :'venue_id' LIMIT 1)

-- ==============================
-- 3. CREATE SECTIONS
-- ==============================

-- Orchestra Level (Level 0)
INSERT INTO sections (id, venue_id, name, level, accessibility) VALUES
  (gen_random_uuid(), :'venue_id', 'Premium Orchestra', 0, true),
  (gen_random_uuid(), :'venue_id', 'Standard Orchestra', 0, true),
  (gen_random_uuid(), :'venue_id', 'Side Box Left', 0, false),
  (gen_random_uuid(), :'venue_id', 'Side Box Right', 0, false);

-- Dress Circle Level (Level 1)
INSERT INTO sections (id, venue_id, name, level, accessibility) VALUES
  (gen_random_uuid(), :'venue_id', 'Premium Dress Circle', 1, true),
  (gen_random_uuid(), :'venue_id', 'Standard Dress Circle', 1, true),
  (gen_random_uuid(), :'venue_id', 'Circle Box Left', 1, false),
  (gen_random_uuid(), :'venue_id', 'Circle Box Right', 1, false),
  (gen_random_uuid(), :'venue_id', 'Grand Boxes', 1, false);

-- Upper Circle Level (Level 2)
INSERT INTO sections (id, venue_id, name, level, accessibility) VALUES
  (gen_random_uuid(), :'venue_id', 'Front Upper Circle', 2, true),
  (gen_random_uuid(), :'venue_id', 'Rear Upper Circle', 2, true),
  (gen_random_uuid(), :'venue_id', 'Upper Box Left', 2, false),
  (gen_random_uuid(), :'venue_id', 'Upper Box Right', 2, false);

-- Balcony Level (Level 3)
INSERT INTO sections (id, venue_id, name, level, accessibility) VALUES
  (gen_random_uuid(), :'venue_id', 'Grand Circle', 3, false);

-- ==============================
-- 4. CREATE SEATS WITH LAST-MINUTE PRICING
-- ==============================

-- Helper function to generate seats for a section
CREATE OR REPLACE FUNCTION create_phantom_seats(
  section_name TEXT,
  rows INTEGER,
  seats_per_row INTEGER,
  base_price_pence INTEGER
) RETURNS INTEGER AS $$
DECLARE
  section_uuid UUID;
  seat_count INTEGER := 0;
  row_num INTEGER;
  seat_num INTEGER;
  row_letter CHAR(1);
  is_accessible BOOLEAN;
  final_price INTEGER;
BEGIN
  -- Get section ID
  SELECT id INTO section_uuid 
  FROM sections 
  WHERE name = section_name AND venue_id = :'venue_id' 
  LIMIT 1;

  IF section_uuid IS NULL THEN
    RAISE NOTICE 'Section % not found', section_name;
    RETURN 0;
  END IF;

  -- Generate seats
  FOR row_num IN 1..rows LOOP
    row_letter := CHR(64 + row_num); -- A, B, C, etc.
    
    FOR seat_num IN 1..seats_per_row LOOP
      -- Accessibility: First and last 2 seats of first and last rows
      is_accessible := (
        (row_num = 1 AND seat_num IN (1, 2, seats_per_row - 1, seats_per_row)) OR
        (row_num = rows AND seat_num IN (1, 2, seats_per_row - 1, seats_per_row))
      );

      -- Last-minute pricing (50% off)
      final_price := base_price_pence;

      INSERT INTO seats (
        id, 
        show_id, 
        section_id, 
        row_letter, 
        seat_number, 
        price_pence, 
        is_available, 
        is_accessible
      ) VALUES (
        gen_random_uuid(),
        :'show_id',
        section_uuid,
        row_letter,
        seat_num,
        final_price,
        true, -- All seats available initially
        is_accessible
      );
      
      seat_count := seat_count + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Created % seats for section %', seat_count, section_name;
  RETURN seat_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- 5. GENERATE ALL SEATS
-- ==============================

DO $$
DECLARE
  total_seats INTEGER := 0;
BEGIN
  RAISE NOTICE '🎭 Creating Phantom of the Opera seats with last-minute pricing...';
  
  -- Orchestra Level (Level 0)
  total_seats := total_seats + create_phantom_seats('Premium Orchestra', 8, 24, 8750);    -- £87.50
  total_seats := total_seats + create_phantom_seats('Standard Orchestra', 12, 28, 6250);   -- £62.50
  total_seats := total_seats + create_phantom_seats('Side Box Left', 4, 8, 8250);          -- £82.50
  total_seats := total_seats + create_phantom_seats('Side Box Right', 4, 8, 8250);         -- £82.50

  -- Dress Circle Level (Level 1)
  total_seats := total_seats + create_phantom_seats('Premium Dress Circle', 6, 26, 7750);  -- £77.50
  total_seats := total_seats + create_phantom_seats('Standard Dress Circle', 8, 30, 5250); -- £52.50
  total_seats := total_seats + create_phantom_seats('Circle Box Left', 3, 6, 7250);        -- £72.50
  total_seats := total_seats + create_phantom_seats('Circle Box Right', 3, 6, 7250);       -- £72.50
  total_seats := total_seats + create_phantom_seats('Grand Boxes', 2, 12, 10000);          -- £100.00

  -- Upper Circle Level (Level 2)
  total_seats := total_seats + create_phantom_seats('Front Upper Circle', 5, 32, 4250);    -- £42.50
  total_seats := total_seats + create_phantom_seats('Rear Upper Circle', 8, 34, 3250);     -- £32.50
  total_seats := total_seats + create_phantom_seats('Upper Box Left', 3, 8, 4750);         -- £47.50
  total_seats := total_seats + create_phantom_seats('Upper Box Right', 3, 8, 4750);        -- £47.50

  -- Balcony Level (Level 3)
  total_seats := total_seats + create_phantom_seats('Grand Circle', 4, 30, 9250);          -- £92.50

  RAISE NOTICE '✅ Total seats created: %', total_seats;
END $$;

-- ==============================
-- 6. CREATE SHOW TIMES
-- ==============================

-- Add show times for the next 30 days
INSERT INTO show_times (id, show_id, start_time, end_time, price_multiplier)
SELECT 
  gen_random_uuid(),
  :'show_id',
  (CURRENT_DATE + interval '1 day' * generate_series(0, 29)) + time '19:30:00',
  (CURRENT_DATE + interval '1 day' * generate_series(0, 29)) + time '22:00:00',
  CASE 
    WHEN EXTRACT(dow FROM (CURRENT_DATE + interval '1 day' * generate_series(0, 29))) IN (5, 6) 
    THEN 1.15  -- 15% premium for Friday/Saturday
    ELSE 1.0   -- Standard pricing
  END;

-- Add matinee performances on weekends
INSERT INTO show_times (id, show_id, start_time, end_time, price_multiplier)
SELECT 
  gen_random_uuid(),
  :'show_id',
  (CURRENT_DATE + interval '1 day' * generate_series(0, 29)) + time '14:30:00',
  (CURRENT_DATE + interval '1 day' * generate_series(0, 29)) + time '17:00:00',
  0.9  -- 10% discount for matinee
FROM generate_series(0, 29) AS day_offset
WHERE EXTRACT(dow FROM (CURRENT_DATE + interval '1 day' * day_offset)) IN (0, 6); -- Saturday/Sunday

-- ==============================
-- 7. VERIFICATION & SUMMARY
-- ==============================

DO $$
DECLARE
  venue_count INTEGER;
  show_count INTEGER;
  section_count INTEGER;
  seat_count INTEGER;
  showtime_count INTEGER;
  accessible_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO venue_count FROM venues WHERE name = 'Her Majesty''s Theatre';
  SELECT COUNT(*) INTO show_count FROM shows WHERE title = 'The Phantom of the Opera';
  SELECT COUNT(*) INTO section_count FROM sections WHERE venue_id = :'venue_id';
  SELECT COUNT(*) INTO seat_count FROM seats WHERE show_id = :'show_id';
  SELECT COUNT(*) INTO showtime_count FROM show_times WHERE show_id = :'show_id';
  SELECT COUNT(*) INTO accessible_count FROM seats WHERE show_id = :'show_id' AND is_accessible = true;

  RAISE NOTICE '';
  RAISE NOTICE '🎭 ====== PHANTOM OF THE OPERA SETUP COMPLETE ======';
  RAISE NOTICE '📍 Venue: Her Majesty''s Theatre (% records)', venue_count;
  RAISE NOTICE '🎬 Show: The Phantom of the Opera (% records)', show_count;
  RAISE NOTICE '📍 Sections: % sections created', section_count;
  RAISE NOTICE '💺 Seats: % total seats created', seat_count;
  RAISE NOTICE '♿ Accessible: % accessible seats', accessible_count;
  RAISE NOTICE '🕐 Show Times: % performances scheduled', showtime_count;
  RAISE NOTICE '';
  RAISE NOTICE '💰 LAST-MINUTE PRICING APPLIED:';
  RAISE NOTICE '   🥇 Premium Orchestra: £87.50';
  RAISE NOTICE '   🥇 Premium Circle: £77.50';
  RAISE NOTICE '   🏛️ Grand Boxes: £100.00';
  RAISE NOTICE '   📦 Side/Circle Boxes: £72.50-£82.50';
  RAISE NOTICE '   🎭 Standard Orchestra: £62.50';
  RAISE NOTICE '   🎭 Standard Circle: £52.50';
  RAISE NOTICE '   ⬆️ Upper Circle: £32.50-£47.50';
  RAISE NOTICE '   🎪 Grand Circle: £92.50';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Ready for hybrid MongoDB + PostgreSQL seat mapping!';
END $$;

-- Clean up helper function
DROP FUNCTION create_phantom_seats(TEXT, INTEGER, INTEGER, INTEGER);

-- ==============================
-- 8. SAMPLE QUERIES FOR TESTING
-- ==============================

-- Check seat distribution by section
/*
SELECT 
  s.name AS section_name,
  COUNT(se.id) AS seat_count,
  COUNT(se.id) FILTER (WHERE se.is_accessible) AS accessible_count,
  ROUND(AVG(se.price_pence)::numeric, 0) AS avg_price_pence,
  ROUND(AVG(se.price_pence::numeric) / 100, 2) AS avg_price_pounds
FROM sections s
LEFT JOIN seats se ON s.id = se.section_id
WHERE s.venue_id = :'venue_id'
GROUP BY s.name, s.level
ORDER BY s.level, s.name;
*/

-- Check show times
/*
SELECT 
  st.start_time::date AS show_date,
  st.start_time::time AS show_time,
  st.price_multiplier,
  CASE 
    WHEN st.price_multiplier > 1.0 THEN 'Premium'
    WHEN st.price_multiplier < 1.0 THEN 'Discount'
    ELSE 'Standard'
  END AS pricing_type
FROM show_times st
WHERE st.show_id = :'show_id'
ORDER BY st.start_time
LIMIT 10;
*/ 