-- Professional Hamilton Layout Migration
-- Replaces basic grid coordinates with professional theater geometry
-- Uses Victoria Palace Theatre architecture with curved sections

-- Backup existing data
CREATE TABLE IF NOT EXISTS hamilton_backup_seats AS 
SELECT * FROM seats WHERE show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e';

CREATE TABLE IF NOT EXISTS hamilton_backup_sections AS 
SELECT * FROM sections WHERE seat_map_id = 'b3df5b72-c615-493f-9f63-4acf8937b484';

-- Delete existing seats and sections
DELETE FROM seats WHERE show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e';
DELETE FROM sections WHERE seat_map_id = 'b3df5b72-c615-493f-9f63-4acf8937b484';

-- Update seat map with professional theater configuration
UPDATE seat_maps 
SET layout_config = '{"type": "professional-theater", "style": "victoria-palace", "totalCapacity": 1200, "sections": 7}'::jsonb 
WHERE id = 'b3df5b72-c615-493f-9f63-4acf8937b484';

DO $$
DECLARE
    seatmap_id_val UUID := 'b3df5b72-c615-493f-9f63-4acf8937b484';
    show_id_val UUID := '81447867-94ac-47b1-96cf-d70d3d5ad02e';
    section_stalls_center_id UUID;
    section_stalls_left_id UUID;
    section_stalls_right_id UUID;
    section_royal_center_id UUID;
    section_royal_left_id UUID;
    section_royal_right_id UUID;
    section_grand_circle_id UUID;
    row_letter CHAR;
    seat_num INTEGER;
    price_val INTEGER;
BEGIN
    -- Create professional theater sections
    INSERT INTO sections (seat_map_id, name, display_name, color_hex, base_price_pence, seat_pattern, position_config, sort_order) VALUES
        -- STALLS SECTIONS (Ground Floor)
        (seatmap_id_val, 'stalls-center', 'STALLS CENTER', '#8B5CF6', 8500,
         '{"shape": "curved-stalls", "rows": 14, "capacity": 280}'::jsonb,
         '{"curveConfig": {"centerX": 800, "centerY": 200, "startAngle": 160, "endAngle": 20, "innerRadius": 200, "outerRadius": 480, "rowDepth": 24}}'::jsonb, 1),
        
        (seatmap_id_val, 'stalls-left', 'STALLS LEFT', '#F59E0B', 7500,
         '{"shape": "curved-stalls", "rows": 14, "capacity": 140}'::jsonb,
         '{"curveConfig": {"centerX": 800, "centerY": 200, "startAngle": 160, "endAngle": 110, "innerRadius": 200, "outerRadius": 480, "rowDepth": 24}}'::jsonb, 2),
        
        (seatmap_id_val, 'stalls-right', 'STALLS RIGHT', '#F59E0B', 7500,
         '{"shape": "curved-stalls", "rows": 14, "capacity": 140}'::jsonb,
         '{"curveConfig": {"centerX": 800, "centerY": 200, "startAngle": 70, "endAngle": 20, "innerRadius": 200, "outerRadius": 480, "rowDepth": 24}}'::jsonb, 3),
        
        -- ROYAL CIRCLE SECTIONS (First Balcony)
        (seatmap_id_val, 'royal-circle-center', 'ROYAL CIRCLE CENTER', '#06B6D4', 7000,
         '{"shape": "curved-balcony", "rows": 10, "capacity": 200}'::jsonb,
         '{"curveConfig": {"centerX": 800, "centerY": 150, "startAngle": 155, "endAngle": 25, "innerRadius": 350, "outerRadius": 500, "rowDepth": 22}}'::jsonb, 4),
        
        (seatmap_id_val, 'royal-circle-left', 'ROYAL CIRCLE LEFT', '#10B981', 6500,
         '{"shape": "curved-balcony", "rows": 10, "capacity": 100}'::jsonb,
         '{"curveConfig": {"centerX": 800, "centerY": 150, "startAngle": 155, "endAngle": 120, "innerRadius": 350, "outerRadius": 500, "rowDepth": 22}}'::jsonb, 5),
        
        (seatmap_id_val, 'royal-circle-right', 'ROYAL CIRCLE RIGHT', '#10B981', 6500,
         '{"shape": "curved-balcony", "rows": 10, "capacity": 100}'::jsonb,
         '{"curveConfig": {"centerX": 800, "centerY": 150, "startAngle": 60, "endAngle": 25, "innerRadius": 350, "outerRadius": 500, "rowDepth": 22}}'::jsonb, 6),
        
        -- GRAND CIRCLE SECTION (Upper Level)
        (seatmap_id_val, 'grand-circle', 'GRAND CIRCLE', '#EF4444', 5500,
         '{"shape": "curved-balcony", "rows": 8, "capacity": 240}'::jsonb,
         '{"curveConfig": {"centerX": 800, "centerY": 100, "startAngle": 170, "endAngle": 10, "innerRadius": 560, "outerRadius": 680, "rowDepth": 24}}'::jsonb, 7);
    
    -- Get section IDs for seat generation
    SELECT id INTO section_stalls_center_id FROM sections WHERE seat_map_id = seatmap_id_val AND name = 'stalls-center';
    SELECT id INTO section_stalls_left_id FROM sections WHERE seat_map_id = seatmap_id_val AND name = 'stalls-left';
    SELECT id INTO section_stalls_right_id FROM sections WHERE seat_map_id = seatmap_id_val AND name = 'stalls-right';
    SELECT id INTO section_royal_center_id FROM sections WHERE seat_map_id = seatmap_id_val AND name = 'royal-circle-center';
    SELECT id INTO section_royal_left_id FROM sections WHERE seat_map_id = seatmap_id_val AND name = 'royal-circle-left';
    SELECT id INTO section_royal_right_id FROM sections WHERE seat_map_id = seatmap_id_val AND name = 'royal-circle-right';
    SELECT id INTO section_grand_circle_id FROM sections WHERE seat_map_id = seatmap_id_val AND name = 'grand-circle';
    
    -- Generate seats for STALLS CENTER (rows A-N, 20 seats per row)
    FOR i IN 1..14 LOOP
        row_letter := CHR(64 + i); -- A=65, B=66, etc.
        price_val := 8500; -- Premium stalls pricing
        FOR seat_num IN 1..20 LOOP
            INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position, is_accessible, notes)
            VALUES (show_id_val, section_stalls_center_id, row_letter, seat_num, price_val, 'available', 
                   '{"x": 0, "y": 0}'::jsonb, false, NULL);
        END LOOP;
    END LOOP;
    
    -- Generate seats for STALLS LEFT (rows A-N, 10 seats per row)
    FOR i IN 1..14 LOOP
        row_letter := CHR(64 + i);
        price_val := 7500;
        FOR seat_num IN 1..10 LOOP
            INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position, is_accessible, notes)
            VALUES (show_id_val, section_stalls_left_id, row_letter, seat_num, price_val, 'available',
                   '{"x": 0, "y": 0}'::jsonb, false, NULL);
        END LOOP;
    END LOOP;
    
    -- Generate seats for STALLS RIGHT (rows A-N, 10 seats per row)
    FOR i IN 1..14 LOOP
        row_letter := CHR(64 + i);
        price_val := 7500;
        FOR seat_num IN 1..10 LOOP
            INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position, is_accessible, notes)
            VALUES (show_id_val, section_stalls_right_id, row_letter, seat_num, price_val, 'available',
                   '{"x": 0, "y": 0}'::jsonb, false, NULL);
        END LOOP;
    END LOOP;
    
    -- Generate seats for ROYAL CIRCLE CENTER (rows A-J, 20 seats per row)
    FOR i IN 1..10 LOOP
        row_letter := CHR(64 + i);
        price_val := 7000;
        FOR seat_num IN 1..20 LOOP
            INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position, is_accessible, notes)
            VALUES (show_id_val, section_royal_center_id, row_letter, seat_num, price_val, 'available',
                   '{"x": 0, "y": 0}'::jsonb, false, NULL);
        END LOOP;
    END LOOP;
    
    -- Generate seats for ROYAL CIRCLE LEFT (rows A-J, 10 seats per row)
    FOR i IN 1..10 LOOP
        row_letter := CHR(64 + i);
        price_val := 6500;
        FOR seat_num IN 1..10 LOOP
            INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position, is_accessible, notes)
            VALUES (show_id_val, section_royal_left_id, row_letter, seat_num, price_val, 'available',
                   '{"x": 0, "y": 0}'::jsonb, false, NULL);
        END LOOP;
    END LOOP;
    
    -- Generate seats for ROYAL CIRCLE RIGHT (rows A-J, 10 seats per row)
    FOR i IN 1..10 LOOP
        row_letter := CHR(64 + i);
        price_val := 6500;
        FOR seat_num IN 1..10 LOOP
            INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position, is_accessible, notes)
            VALUES (show_id_val, section_royal_right_id, row_letter, seat_num, price_val, 'available',
                   '{"x": 0, "y": 0}'::jsonb, false, NULL);
        END LOOP;
    END LOOP;
    
    -- Generate seats for GRAND CIRCLE (rows A-H, 30 seats per row)
    FOR i IN 1..8 LOOP
        row_letter := CHR(64 + i);
        price_val := 5500;
        FOR seat_num IN 1..30 LOOP
            INSERT INTO seats (show_id, section_id, row_letter, seat_number, price_pence, status, position, is_accessible, notes)
            VALUES (show_id_val, section_grand_circle_id, row_letter, seat_num, price_val, 'available',
                   '{"x": 0, "y": 0}'::jsonb, false, NULL);
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Professional sections and seats created successfully';
    RAISE NOTICE 'Total seats generated: 1200 across 7 curved sections';
    RAISE NOTICE 'Seat coordinates will be calculated by the frontend geometry engine';
    
END $$; 