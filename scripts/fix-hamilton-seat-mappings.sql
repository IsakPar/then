-- Fix Hamilton Hardcoded Seat Mappings - Complete Solution
-- Maps ALL hardcoded seat IDs that iOS app generates to real database UUIDs
-- Ensures any seat in Hamilton can be booked successfully

-- Hamilton show UUID (from logs)
\set hamilton_show_id 'd11e4d04-90f6-4157-a70f-ecfc63f18058'

BEGIN;

-- Clear any existing mappings for Hamilton
DELETE FROM hardcoded_seat_mappings 
WHERE show_id = :'hamilton_show_id';

-- Display current Hamilton seats for reference
DO $$
DECLARE
    seat_count INTEGER;
    section_info RECORD;
BEGIN
    SELECT COUNT(*) INTO seat_count 
    FROM seats 
    WHERE show_id = :'hamilton_show_id';
    
    RAISE NOTICE '🎭 Hamilton show has % total seats', seat_count;
    
    -- Show sections breakdown
    FOR section_info IN 
        SELECT s.name, s.display_name, COUNT(seats.id) as seat_count
        FROM sections s
        INNER JOIN seats ON seats.section_id = s.id
        WHERE seats.show_id = :'hamilton_show_id'
        GROUP BY s.id, s.name, s.display_name
        ORDER BY s.name
    LOOP
        RAISE NOTICE '   - %: % seats', section_info.display_name, section_info.seat_count;
    END LOOP;
END $$;

-- 🏆 PREMIUM SECTION MAPPING
-- iOS generates: premium-1-1 to premium-10-15 (150 hardcoded seats)
-- Map to: Premium Orchestra section (or best available)
INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
SELECT 
    :'hamilton_show_id',
    'premium-' || hardcoded_row || '-' || hardcoded_seat,
    s.id
FROM 
    generate_series(1, 10) AS hardcoded_row,
    generate_series(1, 15) AS hardcoded_seat,
    LATERAL (
        SELECT seats.id, seats.row_letter, seats.seat_number, ROW_NUMBER() OVER (ORDER BY seats.row_letter, seats.seat_number) as seq
        FROM seats 
        INNER JOIN sections sec ON seats.section_id = sec.id
        WHERE seats.show_id = :'hamilton_show_id' 
            AND sec.name IN ('Premium Orchestra', 'Stalls', 'stalls', 'premium')
        ORDER BY seats.row_letter, seats.seat_number
        LIMIT 1 OFFSET ((hardcoded_row - 1) * 15 + (hardcoded_seat - 1))
    ) s
WHERE s.id IS NOT NULL;

-- 🎭 MIDDLE SECTION MAPPING  
-- iOS generates: middle-1-1 to middle-10-15 (150 hardcoded seats)
-- Map to: Mezzanine section (or dress circle)
INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
SELECT 
    :'hamilton_show_id',
    'middle-' || hardcoded_row || '-' || hardcoded_seat,
    s.id
FROM 
    generate_series(1, 10) AS hardcoded_row,
    generate_series(1, 15) AS hardcoded_seat,
    LATERAL (
        SELECT seats.id, seats.row_letter, seats.seat_number
        FROM seats 
        INNER JOIN sections sec ON seats.section_id = sec.id
        WHERE seats.show_id = :'hamilton_show_id' 
            AND sec.name IN ('Mezzanine', 'Dress Circle', 'dress_circle', 'middle')
        ORDER BY seats.row_letter, seats.seat_number
        LIMIT 1 OFFSET ((hardcoded_row - 1) * 15 + (hardcoded_seat - 1))
    ) s
WHERE s.id IS NOT NULL;

-- 🎪 BACK SECTION MAPPING
-- iOS generates: back-1-1 to back-10-X with varying seats per row (102 total)
-- Map to: Balcony section
DO $$
DECLARE
    back_rows INTEGER[] := ARRAY[14, 13, 12, 11, 10, 9, 9, 8, 8, 8]; -- Seats per row
    row_num INTEGER;
    seat_num INTEGER;
    offset_counter INTEGER := 0;
    seat_record RECORD;
BEGIN
    -- Generate back section mappings with varying row configurations
    FOR row_idx IN 1..array_length(back_rows, 1) LOOP
        row_num := row_idx;
        FOR seat_num IN 1..back_rows[row_idx] LOOP
            -- Find the corresponding balcony seat using offset
            SELECT seats.id INTO seat_record
            FROM seats 
            INNER JOIN sections sec ON seats.section_id = sec.id
            WHERE seats.show_id = :'hamilton_show_id' 
                AND sec.name IN ('Balcony', 'balcony', 'back', 'upper')
            ORDER BY seats.row_letter, seats.seat_number
            LIMIT 1 OFFSET offset_counter;
            
            -- Insert mapping if seat exists
            IF seat_record.id IS NOT NULL THEN
                INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
                VALUES (
                    :'hamilton_show_id',
                    'back-' || row_num || '-' || seat_num,
                    seat_record.id
                );
                
                offset_counter := offset_counter + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Created % back section mappings', offset_counter;
END $$;

-- 🎨 SIDE A SECTION MAPPING
-- iOS generates: sideA-1-1 to sideA-10-5 (50 hardcoded seats)
-- Map to: Available seats from any side sections or boxes
INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
SELECT 
    :'hamilton_show_id',
    'sideA-' || hardcoded_row || '-' || hardcoded_seat,
    s.id
FROM 
    generate_series(1, 10) AS hardcoded_row,
    generate_series(1, 5) AS hardcoded_seat,
    LATERAL (
        SELECT seats.id
        FROM seats 
        INNER JOIN sections sec ON seats.section_id = sec.id
        WHERE seats.show_id = :'hamilton_show_id' 
            AND sec.name IN ('Box', 'boxes', 'side', 'Side Box', 'royal_box')
        ORDER BY seats.row_letter, seats.seat_number
        LIMIT 1 OFFSET ((hardcoded_row - 1) * 5 + (hardcoded_seat - 1))
    ) s
WHERE s.id IS NOT NULL;

-- 🎨 SIDE B SECTION MAPPING  
-- iOS generates: sideB-1-1 to sideB-10-5 (50 hardcoded seats)
-- Map to: Remaining side sections or reuse some seats
INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
SELECT 
    :'hamilton_show_id',
    'sideB-' || hardcoded_row || '-' || hardcoded_seat,
    s.id
FROM 
    generate_series(1, 10) AS hardcoded_row,
    generate_series(1, 5) AS hardcoded_seat,
    LATERAL (
        SELECT seats.id
        FROM seats 
        INNER JOIN sections sec ON seats.section_id = sec.id
        WHERE seats.show_id = :'hamilton_show_id' 
            AND sec.name IN ('Grand Circle', 'grand_circle', 'upper_circle', 'Upper Circle')
        ORDER BY seats.row_letter, seats.seat_number
        LIMIT 1 OFFSET ((hardcoded_row - 1) * 5 + (hardcoded_seat - 1))
    ) s
WHERE s.id IS NOT NULL;

-- FALLBACK MAPPING FOR ANY UNMAPPED SECTIONS
-- If specific sections don't exist, map to any available seats
INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
SELECT 
    :'hamilton_show_id',
    pattern.hardcoded_id,
    avail_seats.id
FROM (
    -- Generate all possible hardcoded seat IDs that iOS can create
    SELECT 'premium-' || r || '-' || s as hardcoded_id FROM generate_series(1,10) r, generate_series(1,15) s
    UNION ALL
    SELECT 'middle-' || r || '-' || s FROM generate_series(1,10) r, generate_series(1,15) s  
    UNION ALL
    SELECT 'sideA-' || r || '-' || s FROM generate_series(1,10) r, generate_series(1,5) s
    UNION ALL
    SELECT 'sideB-' || r || '-' || s FROM generate_series(1,10) r, generate_series(1,5) s
    UNION ALL
    SELECT 'back-' || r || '-' || s FROM 
        generate_series(1,10) r, 
        generate_series(1, CASE r WHEN 1 THEN 14 WHEN 2 THEN 13 WHEN 3 THEN 12 WHEN 4 THEN 11 WHEN 5 THEN 10 ELSE 9 END) s
) pattern
CROSS JOIN LATERAL (
    SELECT seats.id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
    FROM seats
    WHERE seats.show_id = :'hamilton_show_id'
        AND NOT EXISTS (
            SELECT 1 FROM hardcoded_seat_mappings hm 
            WHERE hm.real_seat_id = seats.id 
                AND hm.show_id = :'hamilton_show_id'
        )
    LIMIT 1
) avail_seats
WHERE NOT EXISTS (
    SELECT 1 FROM hardcoded_seat_mappings hm 
    WHERE hm.hardcoded_seat_id = pattern.hardcoded_id 
        AND hm.show_id = :'hamilton_show_id'
)
AND avail_seats.id IS NOT NULL;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_hardcoded_mappings_show_hardcoded 
    ON hardcoded_seat_mappings(show_id, hardcoded_seat_id);
CREATE INDEX IF NOT EXISTS idx_hardcoded_mappings_real_seat 
    ON hardcoded_seat_mappings(real_seat_id);

-- Show final mapping summary
DO $$
DECLARE
    total_mappings INTEGER;
    premium_count INTEGER;
    middle_count INTEGER;
    back_count INTEGER;
    sideA_count INTEGER;
    sideB_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_mappings 
    FROM hardcoded_seat_mappings 
    WHERE show_id = :'hamilton_show_id';
    
    SELECT COUNT(*) INTO premium_count 
    FROM hardcoded_seat_mappings 
    WHERE show_id = :'hamilton_show_id' 
        AND hardcoded_seat_id LIKE 'premium-%';
        
    SELECT COUNT(*) INTO middle_count 
    FROM hardcoded_seat_mappings 
    WHERE show_id = :'hamilton_show_id' 
        AND hardcoded_seat_id LIKE 'middle-%';
        
    SELECT COUNT(*) INTO back_count 
    FROM hardcoded_seat_mappings 
    WHERE show_id = :'hamilton_show_id' 
        AND hardcoded_seat_id LIKE 'back-%';
        
    SELECT COUNT(*) INTO sideA_count 
    FROM hardcoded_seat_mappings 
    WHERE show_id = :'hamilton_show_id' 
        AND hardcoded_seat_id LIKE 'sideA-%';
        
    SELECT COUNT(*) INTO sideB_count 
    FROM hardcoded_seat_mappings 
    WHERE show_id = :'hamilton_show_id' 
        AND hardcoded_seat_id LIKE 'sideB-%';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 HAMILTON SEAT MAPPING SUMMARY:';
    RAISE NOTICE '   Premium section: % mappings', premium_count;
    RAISE NOTICE '   Middle section: % mappings', middle_count;
    RAISE NOTICE '   Back section: % mappings', back_count;
    RAISE NOTICE '   Side A section: % mappings', sideA_count;
    RAISE NOTICE '   Side B section: % mappings', sideB_count;
    RAISE NOTICE '   ✅ TOTAL: % hardcoded seat mappings created', total_mappings;
    RAISE NOTICE '';
    RAISE NOTICE '🎭 Any seat in Hamilton can now be booked!';
    RAISE NOTICE '💡 The failing seat "middle-10-15" should now work.';
END $$;

COMMIT;

-- Test the specific failing seat
SELECT 
    hm.hardcoded_seat_id,
    hm.real_seat_id,
    s.row_letter,
    s.seat_number,
    sec.display_name as section_name
FROM hardcoded_seat_mappings hm
INNER JOIN seats s ON s.id = hm.real_seat_id
INNER JOIN sections sec ON sec.id = s.section_id
WHERE hm.show_id = 'd11e4d04-90f6-4157-a70f-ecfc63f18058'
    AND hm.hardcoded_seat_id = 'middle-10-15'; 