-- ============================================================================
-- HAMILTON SEAT MAPPINGS MIGRATION
-- Populates hardcoded_seat_mappings for Hamilton show to fix iOS app payments
-- ============================================================================

-- Hamilton show UUID (confirmed from logs)
-- This migration creates ALL mappings between iOS hardcoded seat IDs and database UUIDs

BEGIN;

-- Clear any existing Hamilton mappings to avoid conflicts
DELETE FROM hardcoded_seat_mappings 
WHERE show_id = 'd11e4d04-90f6-4157-a70f-ecfc63f18058';

-- Create comprehensive seat mappings for Hamilton
-- Maps iOS hardcoded IDs like "sideA-1-2" to actual database seat UUIDs

DO $$
DECLARE
    hamilton_show_id UUID := 'd11e4d04-90f6-4157-a70f-ecfc63f18058';
    mapping_count INTEGER := 0;
    current_seat RECORD;
BEGIN
    RAISE NOTICE '🎭 Creating Hamilton seat mappings...';
    
    -- ========================================================================
    -- PREMIUM SECTION MAPPINGS (premium-1-1 to premium-10-15)
    -- Maps to Stalls front rows A-J, seats 1-15 (center premium area)
    -- ========================================================================
    FOR row_num IN 1..10 LOOP
        FOR seat_num IN 1..15 LOOP
            -- Find corresponding database seat (Stalls section, rows A-J)
            SELECT s.id INTO current_seat FROM seats s
            INNER JOIN sections sec ON s.section_id = sec.id
            WHERE s.show_id = hamilton_show_id
            AND sec.name ILIKE 'stalls%'
            AND s.row_letter = CHR(64 + row_num) -- A, B, C...
            AND s.seat_number = seat_num
            LIMIT 1;
            
            IF current_seat IS NOT NULL THEN
                INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
                VALUES (
                    hamilton_show_id,
                    'premium-' || row_num || '-' || seat_num,
                    current_seat
                );
                mapping_count := mapping_count + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    -- ========================================================================
    -- SIDE A SECTION MAPPINGS (sideA-1-1 to sideA-10-5)
    -- Maps to left side sections, rows A-J, seats 1-5
    -- ========================================================================
    FOR row_num IN 1..10 LOOP
        FOR seat_num IN 1..5 LOOP
            -- Find corresponding database seat (left side sections)
            SELECT s.id INTO current_seat FROM seats s
            INNER JOIN sections sec ON s.section_id = sec.id
            WHERE s.show_id = hamilton_show_id
            AND (sec.name ILIKE '%left%' OR sec.name ILIKE '%side%')
            AND s.row_letter = CHR(64 + row_num)
            AND s.seat_number = seat_num
            LIMIT 1;
            
            IF current_seat IS NOT NULL THEN
                INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
                VALUES (
                    hamilton_show_id,
                    'sideA-' || row_num || '-' || seat_num,
                    current_seat
                );
                mapping_count := mapping_count + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    -- ========================================================================
    -- SIDE B SECTION MAPPINGS (sideB-1-1 to sideB-10-5)
    -- Maps to right side sections, rows A-J, seats 1-5
    -- ========================================================================
    FOR row_num IN 1..10 LOOP
        FOR seat_num IN 1..5 LOOP
            -- Find corresponding database seat (right side sections)
            SELECT s.id INTO current_seat FROM seats s
            INNER JOIN sections sec ON s.section_id = sec.id
            WHERE s.show_id = hamilton_show_id
            AND (sec.name ILIKE '%right%' OR sec.name ILIKE '%side%')
            AND s.row_letter = CHR(64 + row_num)
            AND s.seat_number = seat_num
            LIMIT 1;
            
            IF current_seat IS NOT NULL THEN
                INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
                VALUES (
                    hamilton_show_id,
                    'sideB-' || row_num || '-' || seat_num,
                    current_seat
                );
                mapping_count := mapping_count + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    -- ========================================================================
    -- MIDDLE SECTION MAPPINGS (middle-1-1 to middle-10-15)
    -- Maps to Dress Circle/Royal Circle center, rows A-J, seats 1-15
    -- ========================================================================
    FOR row_num IN 1..10 LOOP
        FOR seat_num IN 1..15 LOOP
            -- Find corresponding database seat (middle tier sections)
            SELECT s.id INTO current_seat FROM seats s
            INNER JOIN sections sec ON s.section_id = sec.id
            WHERE s.show_id = hamilton_show_id
            AND (sec.name ILIKE '%circle%' OR sec.name ILIKE '%dress%')
            AND s.row_letter = CHR(64 + row_num)
            AND s.seat_number = seat_num
            LIMIT 1;
            
            IF current_seat IS NOT NULL THEN
                INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
                VALUES (
                    hamilton_show_id,
                    'middle-' || row_num || '-' || seat_num,
                    current_seat
                );
                mapping_count := mapping_count + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    -- ========================================================================
    -- BACK SECTION MAPPINGS (back-1-1 to back-10-14 with varying seats)
    -- Maps to upper/grand circle sections with realistic seat distributions
    -- ========================================================================
    DECLARE
        back_seats_per_row INTEGER[] := ARRAY[14, 13, 12, 11, 10, 9, 9, 8, 8, 8];
        max_seats INTEGER;
    BEGIN
        FOR row_num IN 1..10 LOOP
            max_seats := back_seats_per_row[row_num];
            FOR seat_num IN 1..max_seats LOOP
                -- Find corresponding database seat (back/upper sections)
                SELECT s.id INTO current_seat FROM seats s
                INNER JOIN sections sec ON s.section_id = sec.id
                WHERE s.show_id = hamilton_show_id
                AND (sec.name ILIKE '%grand%' OR sec.name ILIKE '%upper%' OR sec.name ILIKE '%balcony%')
                AND s.row_letter = CHR(64 + row_num)
                AND s.seat_number = seat_num
                LIMIT 1;
                
                IF current_seat IS NOT NULL THEN
                    INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
                    VALUES (
                        hamilton_show_id,
                        'back-' || row_num || '-' || seat_num,
                        current_seat
                    );
                    mapping_count := mapping_count + 1;
                END IF;
            END LOOP;
        END LOOP;
    END;
    
    -- ========================================================================
    -- FALLBACK MAPPINGS for any remaining seats
    -- If we have unmapped seats, create additional mappings
    -- ========================================================================
    DECLARE
        unmapped_seats CURSOR FOR
            SELECT s.id, s.row_letter, s.seat_number, sec.name as section_name
            FROM seats s
            INNER JOIN sections sec ON s.section_id = sec.id
            WHERE s.show_id = hamilton_show_id
            AND s.id NOT IN (
                SELECT real_seat_id FROM hardcoded_seat_mappings 
                WHERE show_id = hamilton_show_id
            )
            ORDER BY sec.name, s.row_letter, s.seat_number
            LIMIT 100; -- Safety limit
        
        fallback_counter INTEGER := 1;
    BEGIN
        FOR seat_record IN unmapped_seats LOOP
            INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
            VALUES (
                hamilton_show_id,
                'extra-' || fallback_counter,
                seat_record.id
            );
            fallback_counter := fallback_counter + 1;
            mapping_count := mapping_count + 1;
        END LOOP;
    END;
    
    RAISE NOTICE '✅ Created % Hamilton seat mappings successfully!', mapping_count;
    
    -- Verify critical mappings exist
    IF NOT EXISTS (
        SELECT 1 FROM hardcoded_seat_mappings 
        WHERE show_id = hamilton_show_id 
        AND hardcoded_seat_id = 'sideA-1-2'
    ) THEN
        RAISE WARNING '⚠️ Critical mapping sideA-1-2 not found - check section names';
    ELSE
        RAISE NOTICE '✅ Critical mapping sideA-1-2 verified!';
    END IF;
    
END $$;

COMMIT;

-- Final verification
SELECT 
    'Hamilton Seat Mappings' as migration,
    COUNT(*) as total_mappings,
    COUNT(CASE WHEN hardcoded_seat_id LIKE 'premium-%' THEN 1 END) as premium_count,
    COUNT(CASE WHEN hardcoded_seat_id LIKE 'sideA-%' THEN 1 END) as sideA_count,
    COUNT(CASE WHEN hardcoded_seat_id LIKE 'sideB-%' THEN 1 END) as sideB_count,
    COUNT(CASE WHEN hardcoded_seat_id LIKE 'middle-%' THEN 1 END) as middle_count,
    COUNT(CASE WHEN hardcoded_seat_id LIKE 'back-%' THEN 1 END) as back_count
FROM hardcoded_seat_mappings 
WHERE show_id = 'd11e4d04-90f6-4157-a70f-ecfc63f18058'; 