-- Hamilton Seat Availability Update
-- Sets exactly 20% of Hamilton seats to available (200 out of 1000)
-- Distributes available seats realistically across all sections

-- Hamilton show ID from the database
\set hamilton_show_id '81447867-94ac-47b1-96cf-d70d3d5ad02e'

BEGIN;

-- First, set all Hamilton seats to 'booked'
UPDATE seats 
SET status = 'booked', 
    updated_at = NOW()
WHERE show_id = :'hamilton_show_id';

-- Now set exactly 20% to available using a strategic pattern
-- This gives us scattered availability that looks realistic

-- Stalls section: 79 available (20% of 396)
UPDATE seats 
SET status = 'available', 
    updated_at = NOW()
WHERE show_id = :'hamilton_show_id'
  AND section_id IN (
    SELECT id FROM sections 
    WHERE name = 'stalls' 
    AND show_id = :'hamilton_show_id'
  )
  AND id IN (
    SELECT id FROM seats 
    WHERE show_id = :'hamilton_show_id'
      AND section_id IN (
        SELECT id FROM sections 
        WHERE name = 'stalls' 
        AND show_id = :'hamilton_show_id'
      )
    ORDER BY 
      CASE WHEN row_letter IN ('A', 'B', 'C') THEN 3  -- Front rows less available
           WHEN row_letter IN ('D', 'E', 'F', 'G', 'H') THEN 1  -- Middle rows more available
           ELSE 2 END,
      (seat_number % 3), -- Scatter pattern
      RANDOM()
    LIMIT 79
  );

-- Dress Circle section: 54 available (20% of 270)
UPDATE seats 
SET status = 'available', 
    updated_at = NOW()
WHERE show_id = :'hamilton_show_id'
  AND section_id IN (
    SELECT id FROM sections 
    WHERE name = 'dress_circle' 
    AND show_id = :'hamilton_show_id'
  )
  AND id IN (
    SELECT id FROM seats 
    WHERE show_id = :'hamilton_show_id'
      AND section_id IN (
        SELECT id FROM sections 
        WHERE name = 'dress_circle' 
        AND show_id = :'hamilton_show_id'
      )
    ORDER BY 
      CASE WHEN row_letter IN ('A', 'B') THEN 2  -- Front dress circle desirable
           ELSE 1 END,
      (seat_number % 4), -- Different scatter pattern
      RANDOM()
    LIMIT 54
  );

-- Grand Circle section: 40 available (20% of 200)
UPDATE seats 
SET status = 'available', 
    updated_at = NOW()
WHERE show_id = :'hamilton_show_id'
  AND section_id IN (
    SELECT id FROM sections 
    WHERE name = 'grand_circle' 
    AND show_id = :'hamilton_show_id'
  )
  AND id IN (
    SELECT id FROM seats 
    WHERE show_id = :'hamilton_show_id'
      AND section_id IN (
        SELECT id FROM sections 
        WHERE name = 'grand_circle' 
        AND show_id = :'hamilton_show_id'
      )
    ORDER BY 
      (seat_number % 5), -- Different scatter
      RANDOM()
    LIMIT 40
  );

-- Balcony section: 24 available (20% of 120)
UPDATE seats 
SET status = 'available', 
    updated_at = NOW()
WHERE show_id = :'hamilton_show_id'
  AND section_id IN (
    SELECT id FROM sections 
    WHERE name = 'balcony' 
    AND show_id = :'hamilton_show_id'
  )
  AND id IN (
    SELECT id FROM seats 
    WHERE show_id = :'hamilton_show_id'
      AND section_id IN (
        SELECT id FROM sections 
        WHERE name = 'balcony' 
        AND show_id = :'hamilton_show_id'
      )
    ORDER BY 
      (seat_number % 3),
      RANDOM()
    LIMIT 24
  );

-- Premium boxes: 3 available (20% of 14) - very limited
UPDATE seats 
SET status = 'available', 
    updated_at = NOW()
WHERE show_id = :'hamilton_show_id'
  AND section_id IN (
    SELECT id FROM sections 
    WHERE name LIKE '%box%' 
    AND show_id = :'hamilton_show_id'
  )
  AND id IN (
    SELECT id FROM seats 
    WHERE show_id = :'hamilton_show_id'
      AND section_id IN (
        SELECT id FROM sections 
        WHERE name LIKE '%box%' 
        AND show_id = :'hamilton_show_id'
      )
    ORDER BY RANDOM()
    LIMIT 3
  );

COMMIT;

-- Verify the results
SELECT 
  s.name as section_name,
  COUNT(*) as total_seats,
  COUNT(CASE WHEN seats.status = 'available' THEN 1 END) as available_seats,
  ROUND(
    (COUNT(CASE WHEN seats.status = 'available' THEN 1 END) * 100.0 / COUNT(*)), 1
  ) as availability_percent
FROM sections s
JOIN seats ON seats.section_id = s.id
WHERE s.show_id = :'hamilton_show_id'
GROUP BY s.name, s.id
ORDER BY s.name;

-- Overall summary
SELECT 
  COUNT(*) as total_hamilton_seats,
  COUNT(CASE WHEN status = 'available' THEN 1 END) as available_seats,
  ROUND(
    (COUNT(CASE WHEN status = 'available' THEN 1 END) * 100.0 / COUNT(*)), 1
  ) as overall_availability_percent
FROM seats 
WHERE show_id = :'hamilton_show_id'; 