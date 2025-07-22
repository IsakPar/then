-- Populate Hamilton with 1000 seats and set 20% availability
-- Uses the existing sections and creates realistic theater layout

-- Hamilton show and seat map IDs
\set hamilton_show_id '81447867-94ac-47b1-96cf-d70d3d5ad02e'
\set hamilton_seat_map_id 'b3df5b72-c615-493f-9f63-4acf8937b484'

BEGIN;

-- First, let's update the section names to be more theater-like
-- and set realistic pricing
UPDATE sections SET 
  name = 'stalls',
  display_name = 'Stalls',
  color_hex = '#059669',
  base_price_pence = 12500 -- £125
WHERE seat_map_id = :'hamilton_seat_map_id' AND name = 'section-1';

UPDATE sections SET 
  name = 'dress_circle',
  display_name = 'Dress Circle', 
  color_hex = '#DC2626',
  base_price_pence = 9500 -- £95
WHERE seat_map_id = :'hamilton_seat_map_id' AND name = 'section-2';

UPDATE sections SET 
  name = 'grand_circle',
  display_name = 'Grand Circle',
  color_hex = '#7C3AED', 
  base_price_pence = 7500 -- £75
WHERE seat_map_id = :'hamilton_seat_map_id' AND name = 'section-3';

UPDATE sections SET 
  name = 'balcony',
  display_name = 'Balcony',
  color_hex = '#EA580C',
  base_price_pence = 5500 -- £55
WHERE seat_map_id = :'hamilton_seat_map_id' AND name = 'section-4';

UPDATE sections SET 
  name = 'royal_box',
  display_name = 'Royal Box',
  color_hex = '#BE185D',
  base_price_pence = 18500 -- £185
WHERE seat_map_id = :'hamilton_seat_map_id' AND name = 'section-5';

UPDATE sections SET 
  name = 'side_box',
  display_name = 'Side Box',
  color_hex = '#0891B2',
  base_price_pence = 15500 -- £155
WHERE seat_map_id = :'hamilton_seat_map_id' AND name = 'section-6';

-- Now create seats for each section

-- Stalls: 396 seats (Rows A-T, 18-22 seats per row)
INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position)
SELECT 
  :'hamilton_show_id',
  s.id,
  CHR(65 + (row_num - 1)) as row_letter, -- A, B, C, etc.
  seat_num,
  s.base_price_pence,
  'booked' as status,
  ('{"x": ' || (50 + seat_num * 15) || ', "y": ' || (100 + row_num * 12) || '}')::jsonb as position
FROM sections s,
     LATERAL generate_series(1, 20) as row_num,
     LATERAL generate_series(1, 
       CASE 
         WHEN row_num <= 5 THEN 18    -- Front rows: 18 seats
         WHEN row_num <= 15 THEN 22   -- Middle rows: 22 seats  
         ELSE 20                      -- Back rows: 20 seats
       END
     ) as seat_num
WHERE s.name = 'stalls' AND s.seat_map_id = :'hamilton_seat_map_id'
AND row_num <= 20; -- 20 rows total

-- Dress Circle: 270 seats (Rows A-L, 20-25 seats per row)
INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position)
SELECT 
  :'hamilton_show_id',
  s.id,
  CHR(65 + (row_num - 1)) as row_letter,
  seat_num,
  s.base_price_pence,
  'booked' as status,
  ('{"x": ' || (40 + seat_num * 16) || ', "y": ' || (50 + row_num * 10) || '}')::jsonb as position
FROM sections s,
     LATERAL generate_series(1, 12) as row_num,
     LATERAL generate_series(1, 
       CASE 
         WHEN row_num <= 6 THEN 25    -- Front dress circle: 25 seats
         ELSE 20                      -- Back dress circle: 20 seats
       END
     ) as seat_num
WHERE s.name = 'dress_circle' AND s.seat_map_id = :'hamilton_seat_map_id';

-- Grand Circle: 200 seats (Rows A-J, 20 seats per row)
INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position)
SELECT 
  :'hamilton_show_id',
  s.id,
  CHR(65 + (row_num - 1)) as row_letter,
  seat_num,
  s.base_price_pence,
  'booked' as status,
  ('{"x": ' || (60 + seat_num * 14) || ', "y": ' || (30 + row_num * 12) || '}')::jsonb as position
FROM sections s,
     LATERAL generate_series(1, 10) as row_num,
     LATERAL generate_series(1, 20) as seat_num
WHERE s.name = 'grand_circle' AND s.seat_map_id = :'hamilton_seat_map_id';

-- Balcony: 120 seats (Rows A-F, 20 seats per row) 
INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position)
SELECT 
  :'hamilton_show_id',
  s.id,
  CHR(65 + (row_num - 1)) as row_letter,
  seat_num,
  s.base_price_pence,
  'booked' as status,
  ('{"x": ' || (70 + seat_num * 12) || ', "y": ' || (20 + row_num * 15) || '}')::jsonb as position
FROM sections s,
     LATERAL generate_series(1, 6) as row_num,
     LATERAL generate_series(1, 20) as seat_num
WHERE s.name = 'balcony' AND s.seat_map_id = :'hamilton_seat_map_id';

-- Royal Box: 8 seats (Rows A-B, 4 seats per row)
INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position)
SELECT 
  :'hamilton_show_id',
  s.id,
  CHR(65 + (row_num - 1)) as row_letter,
  seat_num,
  s.base_price_pence,
  'booked' as status,
  ('{"x": ' || (200 + seat_num * 25) || ', "y": ' || (80 + row_num * 20) || '}')::jsonb as position
FROM sections s,
     LATERAL generate_series(1, 2) as row_num,
     LATERAL generate_series(1, 4) as seat_num
WHERE s.name = 'royal_box' AND s.seat_map_id = :'hamilton_seat_map_id';

-- Side Box: 6 seats (Rows A-B, 3 seats per row)
INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position)
SELECT 
  :'hamilton_show_id',
  s.id,
  CHR(65 + (row_num - 1)) as row_letter,
  seat_num,
  s.base_price_pence,
  'booked' as status,
  ('{"x": ' || (20 + seat_num * 30) || ', "y": ' || (60 + row_num * 25) || '}')::jsonb as position
FROM sections s,
     LATERAL generate_series(1, 2) as row_num,
     LATERAL generate_series(1, 3) as seat_num
WHERE s.name = 'side_box' AND s.seat_map_id = :'hamilton_seat_map_id';

-- Now set exactly 20% to available (200 seats)

-- Stalls: 79 available (20% of 396)
UPDATE seats 
SET status = 'available', updated_at = NOW()
WHERE show_id = :'hamilton_show_id'
  AND section_id = (SELECT id FROM sections WHERE name = 'stalls' AND seat_map_id = :'hamilton_seat_map_id')
  AND id IN (
    SELECT id FROM seats 
    WHERE show_id = :'hamilton_show_id'
      AND section_id = (SELECT id FROM sections WHERE name = 'stalls' AND seat_map_id = :'hamilton_seat_map_id')
    ORDER BY 
      CASE WHEN row_letter IN ('D', 'E', 'F', 'G', 'H') THEN 1  -- Middle rows more available
           WHEN row_letter IN ('A', 'B', 'C') THEN 3            -- Front rows less available
           ELSE 2 END,
      (seat_number % 3), 
      RANDOM()
    LIMIT 79
  );

-- Dress Circle: 54 available (20% of 270)
UPDATE seats 
SET status = 'available', updated_at = NOW()
WHERE show_id = :'hamilton_show_id'
  AND section_id = (SELECT id FROM sections WHERE name = 'dress_circle' AND seat_map_id = :'hamilton_seat_map_id')
  AND id IN (
    SELECT id FROM seats 
    WHERE show_id = :'hamilton_show_id'
      AND section_id = (SELECT id FROM sections WHERE name = 'dress_circle' AND seat_map_id = :'hamilton_seat_map_id')
    ORDER BY 
      CASE WHEN row_letter IN ('A', 'B') THEN 2  -- Front dress circle desirable
           ELSE 1 END,
      (seat_number % 4), 
      RANDOM()
    LIMIT 54
  );

-- Grand Circle: 40 available (20% of 200) 
UPDATE seats 
SET status = 'available', updated_at = NOW()
WHERE show_id = :'hamilton_show_id'
  AND section_id = (SELECT id FROM sections WHERE name = 'grand_circle' AND seat_map_id = :'hamilton_seat_map_id')
  AND id IN (
    SELECT id FROM seats 
    WHERE show_id = :'hamilton_show_id'
      AND section_id = (SELECT id FROM sections WHERE name = 'grand_circle' AND seat_map_id = :'hamilton_seat_map_id')
    ORDER BY (seat_number % 5), RANDOM()
    LIMIT 40
  );

-- Balcony: 24 available (20% of 120)
UPDATE seats 
SET status = 'available', updated_at = NOW()
WHERE show_id = :'hamilton_show_id'
  AND section_id = (SELECT id FROM sections WHERE name = 'balcony' AND seat_map_id = :'hamilton_seat_map_id')
  AND id IN (
    SELECT id FROM seats 
    WHERE show_id = :'hamilton_show_id'
      AND section_id = (SELECT id FROM sections WHERE name = 'balcony' AND seat_map_id = :'hamilton_seat_map_id')
    ORDER BY (seat_number % 3), RANDOM()
    LIMIT 24
  );

-- Royal Box: 2 available (25% of 8)
UPDATE seats 
SET status = 'available', updated_at = NOW()
WHERE show_id = :'hamilton_show_id'
  AND section_id = (SELECT id FROM sections WHERE name = 'royal_box' AND seat_map_id = :'hamilton_seat_map_id')
  AND id IN (
    SELECT id FROM seats 
    WHERE show_id = :'hamilton_show_id'
      AND section_id = (SELECT id FROM sections WHERE name = 'royal_box' AND seat_map_id = :'hamilton_seat_map_id')
    ORDER BY RANDOM()
    LIMIT 2
  );

-- Side Box: 1 available (17% of 6)
UPDATE seats 
SET status = 'available', updated_at = NOW()
WHERE show_id = :'hamilton_show_id'
  AND section_id = (SELECT id FROM sections WHERE name = 'side_box' AND seat_map_id = :'hamilton_seat_map_id')
  AND id IN (
    SELECT id FROM seats 
    WHERE show_id = :'hamilton_show_id'
      AND section_id = (SELECT id FROM sections WHERE name = 'side_box' AND seat_map_id = :'hamilton_seat_map_id')
    ORDER BY RANDOM()
    LIMIT 1
  );

COMMIT;

-- Verify the results
SELECT 
  s.name as section_name,
  s.display_name,
  s.color_hex,
  s.base_price_pence / 100.0 as price_pounds,
  COUNT(seats.id) as total_seats,
  COUNT(CASE WHEN seats.status = 'available' THEN 1 END) as available_seats,
  ROUND(
    (COUNT(CASE WHEN seats.status = 'available' THEN 1 END) * 100.0 / COUNT(seats.id)), 1
  ) as availability_percent
FROM sections s
JOIN seats ON seats.section_id = s.id
WHERE seats.show_id = :'hamilton_show_id'
GROUP BY s.name, s.display_name, s.color_hex, s.base_price_pence
ORDER BY s.base_price_pence DESC;

-- Overall summary
SELECT 
  COUNT(*) as total_hamilton_seats,
  COUNT(CASE WHEN status = 'available' THEN 1 END) as available_seats,
  ROUND(
    (COUNT(CASE WHEN status = 'available' THEN 1 END) * 100.0 / COUNT(*)), 1
  ) as overall_availability_percent
FROM seats 
WHERE show_id = :'hamilton_show_id'; 