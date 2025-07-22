-- Populate Hamilton Hardcoded Seat Mappings
-- Maps hardcoded seat IDs like "back-1-14" to actual database UUIDs
-- This allows the hardcoded seat map UI to work with real database records

BEGIN;

-- First, let's see what we're working with
DO $$
DECLARE
    seat_count INTEGER;
    section_count INTEGER;
    hamilton_show_id UUID := '81447867-94ac-47b1-96cf-d70d3d5ad02e';
BEGIN
    SELECT COUNT(*) INTO seat_count FROM seats WHERE show_id = hamilton_show_id;
    SELECT COUNT(*) INTO section_count FROM sections s 
        INNER JOIN shows sh ON sh.seat_map_id = s.seat_map_id 
        WHERE sh.id = hamilton_show_id;
    
    RAISE NOTICE 'Hamilton show has % seats across % sections', seat_count, section_count;
END $$;

-- Create the mapping table if it doesn't exist (in case schema hasn't been migrated yet)
CREATE TABLE IF NOT EXISTS hardcoded_seat_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL,
    hardcoded_seat_id TEXT NOT NULL,
    real_seat_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(show_id, hardcoded_seat_id)
);

-- Clear any existing mappings for Hamilton
DELETE FROM hardcoded_seat_mappings WHERE show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e';

-- Now create the mappings based on our hardcoded seat map layout:
-- Premium Section (premium-1-1 to premium-10-15) -> Stalls front rows
-- SideA Section (sideA-1-1 to sideA-10-5) -> Side box left
-- SideB Section (sideB-1-1 to sideB-10-5) -> Side box right  
-- Middle Section (middle-1-1 to middle-10-15) -> Dress Circle
-- Back Section (back-1-1 to back-10-variable) -> Balcony

-- === PREMIUM SECTION -> STALLS FRONT ROWS ===
-- Maps premium-row-seat to stalls A-J, seats 5-19 (center premium area)
INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
SELECT 
    '81447867-94ac-47b1-96cf-d70d3d5ad02e',
    'premium-' || hardcoded_row || '-' || hardcoded_seat,
    s.id
FROM 
    generate_series(1, 10) AS hardcoded_row,
    generate_series(1, 15) AS hardcoded_seat,
    LATERAL (
        SELECT seats.id, seats.row_letter, seats.seat_number
        FROM seats 
        INNER JOIN sections sec ON seats.section_id = sec.id
        WHERE seats.show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e' 
            AND sec.name = 'stalls'
            AND seats.row_letter = CHR(64 + hardcoded_row) -- A=1, B=2, etc.
            AND seats.seat_number = (hardcoded_seat + 4) -- Offset to center area (seats 5-19)
        LIMIT 1
    ) s
WHERE s.id IS NOT NULL;

-- === SIDE A SECTION -> SIDE BOX LEFT ===  
-- Maps sideA-row-seat to side_box first 3 seats
INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
SELECT 
    '81447867-94ac-47b1-96cf-d70d3d5ad02e',
    'sideA-' || hardcoded_row || '-' || hardcoded_seat,
    s.id
FROM 
    generate_series(1, 2) AS hardcoded_row, -- Only 2 rows in side_box
    generate_series(1, 3) AS hardcoded_seat, -- Only 3 seats per row in side_box
    LATERAL (
        SELECT seats.id, seats.row_letter, seats.seat_number
        FROM seats 
        INNER JOIN sections sec ON seats.section_id = sec.id
        WHERE seats.show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e' 
            AND sec.name = 'side_box'
            AND seats.row_letter = CHR(64 + hardcoded_row)
            AND seats.seat_number = hardcoded_seat
        LIMIT 1
    ) s
WHERE s.id IS NOT NULL;

-- === SIDE B SECTION -> SIDE BOX RIGHT ===
-- For sideB, we'll reuse the same side_box seats (since side_box is small)
-- This is a bit of a hack but works for demo purposes
INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
SELECT 
    '81447867-94ac-47b1-96cf-d70d3d5ad02e',
    'sideB-' || hardcoded_row || '-' || hardcoded_seat,
    s.id
FROM 
    generate_series(1, 2) AS hardcoded_row,
    generate_series(1, 3) AS hardcoded_seat,
    LATERAL (
        SELECT seats.id, seats.row_letter, seats.seat_number
        FROM seats 
        INNER JOIN sections sec ON seats.section_id = sec.id
        WHERE seats.show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e' 
            AND sec.name = 'side_box'
            AND seats.row_letter = CHR(64 + hardcoded_row)
            AND seats.seat_number = hardcoded_seat
        LIMIT 1
    ) s
WHERE s.id IS NOT NULL;

-- === MIDDLE SECTION -> DRESS CIRCLE ===
-- Maps middle-row-seat to dress_circle A-J, seats 6-20 (center area)
INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
SELECT 
    '81447867-94ac-47b1-96cf-d70d3d5ad02e',
    'middle-' || hardcoded_row || '-' || hardcoded_seat,
    s.id
FROM 
    generate_series(1, 10) AS hardcoded_row,
    generate_series(1, 15) AS hardcoded_seat,
    LATERAL (
        SELECT seats.id, seats.row_letter, seats.seat_number
        FROM seats 
        INNER JOIN sections sec ON seats.section_id = sec.id
        WHERE seats.show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e' 
            AND sec.name = 'dress_circle'
            AND seats.row_letter = CHR(64 + hardcoded_row)
            AND seats.seat_number = (hardcoded_seat + 5) -- Offset to center area (seats 6-20)
        LIMIT 1
    ) s
WHERE s.id IS NOT NULL;

-- === BACK SECTION -> BALCONY ===
-- Maps back-row-seat to balcony with varying seats per row (matching hardcoded layout)
-- Row 1: 14 seats, Row 2: 13 seats, Row 3: 12 seats, etc.

-- Create a function to handle the complex back section mapping
DO $$
DECLARE
    back_rows INTEGER[] := ARRAY[14, 13, 12, 11, 10, 9, 9, 8, 8, 8];
    row_num INTEGER;
    seat_num INTEGER;
    seat_id UUID;
BEGIN
    FOR row_idx IN 1..array_length(back_rows, 1) LOOP
        FOR seat_num IN 1..back_rows[row_idx] LOOP
            -- Find the corresponding balcony seat
            SELECT seats.id INTO seat_id
            FROM seats 
            INNER JOIN sections sec ON seats.section_id = sec.id
            WHERE seats.show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e' 
                AND sec.name = 'balcony'
                AND seats.row_letter = CHR(64 + row_idx)
                AND seats.seat_number = seat_num
            LIMIT 1;
            
            -- Insert mapping if seat exists
            IF seat_id IS NOT NULL THEN
                INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
                VALUES (
                    '81447867-94ac-47b1-96cf-d70d3d5ad02e',
                    'back-' || row_idx || '-' || seat_num,
                    seat_id
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hardcoded_mappings_show_hardcoded 
    ON hardcoded_seat_mappings(show_id, hardcoded_seat_id);
CREATE INDEX IF NOT EXISTS idx_hardcoded_mappings_real_seat 
    ON hardcoded_seat_mappings(real_seat_id);

-- Show summary of what we created
DO $$
DECLARE
    mapping_count INTEGER;
    premium_count INTEGER;
    sidea_count INTEGER;
    sideb_count INTEGER;
    middle_count INTEGER;
    back_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mapping_count FROM hardcoded_seat_mappings WHERE show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e';
    
    SELECT COUNT(*) INTO premium_count FROM hardcoded_seat_mappings 
        WHERE show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e' AND hardcoded_seat_id LIKE 'premium-%';
    SELECT COUNT(*) INTO sidea_count FROM hardcoded_seat_mappings 
        WHERE show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e' AND hardcoded_seat_id LIKE 'sideA-%';
    SELECT COUNT(*) INTO sideb_count FROM hardcoded_seat_mappings 
        WHERE show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e' AND hardcoded_seat_id LIKE 'sideB-%';
    SELECT COUNT(*) INTO middle_count FROM hardcoded_seat_mappings 
        WHERE show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e' AND hardcoded_seat_id LIKE 'middle-%';
    SELECT COUNT(*) INTO back_count FROM hardcoded_seat_mappings 
        WHERE show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e' AND hardcoded_seat_id LIKE 'back-%';
    
    RAISE NOTICE 'Created % total mappings:', mapping_count;
    RAISE NOTICE '  Premium: % mappings', premium_count;
    RAISE NOTICE '  SideA: % mappings', sidea_count;
    RAISE NOTICE '  SideB: % mappings', sideb_count;
    RAISE NOTICE '  Middle: % mappings', middle_count;
    RAISE NOTICE '  Back: % mappings', back_count;
END $$;

COMMIT; 