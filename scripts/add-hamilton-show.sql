-- Add Hamilton Show Migration
-- This adds Hamilton as a real bookable show to the database

-- First, check if Hamilton venue exists (Victoria Palace Theatre)
-- If not, create it
INSERT INTO venues (name, address, slug) 
SELECT 'Victoria Palace Theatre', 'Victoria Street, London SW1Y 4QL', 'victoria-palace-theatre'
WHERE NOT EXISTS (
  SELECT 1 FROM venues WHERE slug = 'victoria-palace-theatre'
);

-- Get the venue ID for Victoria Palace Theatre
DO $$
DECLARE
    venue_id_val uuid;
    seatmap_id_val uuid;
    show_id_val uuid;
    section_stalls_id uuid;
    section_circle_id uuid;
    section_upper_id uuid;
BEGIN
    -- Get venue ID
    SELECT id INTO venue_id_val FROM venues WHERE slug = 'victoria-palace-theatre';
    
    -- Create seat map for Hamilton
    INSERT INTO seat_maps (name, description, total_capacity, svg_viewbox, layout_config)
    VALUES (
        'Victoria Palace Theatre - Hamilton',
        'Standard West End theatre layout for Hamilton',
        1200,
        '0 0 800 600',
        '{
            "type": "traditional_theatre",
            "stage_position": {"x": 400, "y": 550},
            "sections": [
                {"name": "Stalls", "capacity": 600, "rows": 25, "seats_per_row": 24},
                {"name": "Royal Circle", "capacity": 350, "rows": 14, "seats_per_row": 25},
                {"name": "Grand Circle", "capacity": 250, "rows": 10, "seats_per_row": 25}
            ]
        }'::jsonb
    )
    RETURNING id INTO seatmap_id_val;
    
    -- Create sections for this seat map
    INSERT INTO sections (seat_map_id, name, display_name, color_hex, base_price_pence, seat_pattern, position_config, sort_order)
    VALUES 
        (seatmap_id_val, 'stalls', 'Stalls', '#10B981', 7500, '{"rows": 25, "cols": 24, "shape": "grid"}'::jsonb, '{"offset": {"x": 100, "y": 350}, "seatSpacing": 22, "rowSpacing": 20}'::jsonb, 1),
        (seatmap_id_val, 'royal-circle', 'Royal Circle', '#3B82F6', 9500, '{"rows": 14, "cols": 25, "shape": "curved"}'::jsonb, '{"offset": {"x": 75, "y": 200}, "seatSpacing": 24, "rowSpacing": 22}'::jsonb, 2),
        (seatmap_id_val, 'grand-circle', 'Grand Circle', '#8B5CF6', 6500, '{"rows": 10, "cols": 25, "shape": "curved"}'::jsonb, '{"offset": {"x": 75, "y": 50}, "seatSpacing": 24, "rowSpacing": 22}'::jsonb, 3);
    
    -- Get section IDs
    SELECT id INTO section_stalls_id FROM sections WHERE seat_map_id = seatmap_id_val AND name = 'stalls';
    SELECT id INTO section_circle_id FROM sections WHERE seat_map_id = seatmap_id_val AND name = 'royal-circle';
    SELECT id INTO section_upper_id FROM sections WHERE seat_map_id = seatmap_id_val AND name = 'grand-circle';
    
    -- Create Hamilton show
    INSERT INTO shows (title, description, date, time, duration_minutes, venue_id, seat_map_id, image_url, is_active)
    VALUES (
        'Hamilton',
        'Lin-Manuel Miranda''s groundbreaking musical about Alexander Hamilton and the founding of America',
        CURRENT_DATE + INTERVAL '7 days',
        '19:30',
        165,
        venue_id_val,
        seatmap_id_val,
        '/hamilton correct.jpeg',
        true
    )
    RETURNING id INTO show_id_val;
    
    -- Create seats for Hamilton show
    -- Stalls section (25 rows, 24 seats each)
    FOR row_num IN 1..25 LOOP
        FOR seat_num IN 1..24 LOOP
            INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position, is_accessible)
            VALUES (
                show_id_val,
                section_stalls_id,
                CHR(64 + row_num), -- A, B, C, etc.
                seat_num,
                7500, -- £75
                'available',
                ('{"x": ' || (100 + (seat_num - 1) * 22) || ', "y": ' || (350 + (row_num - 1) * 20) || '}')::jsonb,
                (row_num = 1 AND seat_num <= 4) -- First 4 seats in row A are accessible
            );
        END LOOP;
    END LOOP;
    
    -- Royal Circle section (14 rows, 25 seats each)
    FOR row_num IN 1..14 LOOP
        FOR seat_num IN 1..25 LOOP
            INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position, is_accessible)
            VALUES (
                show_id_val,
                section_circle_id,
                CHR(64 + row_num), -- A, B, C, etc.
                seat_num,
                9500, -- £95
                'available',
                ('{"x": ' || (75 + (seat_num - 1) * 24) || ', "y": ' || (200 + (row_num - 1) * 22) || '}')::jsonb,
                false
            );
        END LOOP;
    END LOOP;
    
    -- Grand Circle section (10 rows, 25 seats each)
    FOR row_num IN 1..10 LOOP
        FOR seat_num IN 1..25 LOOP
            INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position, is_accessible)
            VALUES (
                show_id_val,
                section_upper_id,
                CHR(64 + row_num), -- A, B, C, etc.
                seat_num,
                6500, -- £65
                'available',
                ('{"x": ' || (75 + (seat_num - 1) * 24) || ', "y": ' || (50 + (row_num - 1) * 22) || '}')::jsonb,
                false
            );
        END LOOP;
    END LOOP;
    
    -- Mark some seats as booked to simulate realistic availability
    UPDATE seats 
    SET status = 'booked'
    WHERE show_id = show_id_val 
    AND random() < 0.35; -- Randomly book about 35% of seats
    
    RAISE NOTICE 'Hamilton show created successfully with ID: %', show_id_val;
    RAISE NOTICE 'Total seats created: %', (SELECT COUNT(*) FROM seats WHERE show_id = show_id_val);
    RAISE NOTICE 'Available seats: %', (SELECT COUNT(*) FROM seats WHERE show_id = show_id_val AND status = 'available');
    
END $$; 