-- London Shows Migration with Realistic Seating and Pricing
-- Total capacity: 1000 seats per venue
-- Available seats: 150-300 per show
-- Price range: £20-£90

-- Clean up existing data
DELETE FROM show_section_pricing WHERE show_id IN (SELECT id FROM shows WHERE venue_id IN (1,2,3,4,5));
DELETE FROM seat_bookings WHERE show_id IN (SELECT id FROM shows WHERE venue_id IN (1,2,3,4,5));
DELETE FROM shows WHERE venue_id IN (1,2,3,4,5);
DELETE FROM venue_sections WHERE venue_id IN (1,2,3,4,5);
DELETE FROM venues WHERE id IN (1,2,3,4,5);

-- Create London West End venues (1000 capacity each)
INSERT INTO venues (id, name, address, capacity, latitude, longitude, slug, seat_map_url, seat_map_config) VALUES
(1, 'Her Majesty''s Theatre', 'Haymarket, St. James''s, London SW1Y 4QL', 1000, 51.5094, -0.1319, 'her-majestys-theatre', null, null),
(2, 'Prince Edward Theatre', '28 Old Compton St, Soho, London W1D 4HS', 1000, 51.5130, -0.1308, 'prince-edward-theatre', null, null),
(3, 'Novello Theatre', 'Aldwych, London WC2B 4LD', 1000, 51.5130, -0.1197, 'novello-theatre', null, null),
(4, 'Palace Theatre', '113 Shaftesbury Ave, Soho, London W1D 5AY', 1000, 51.5154, -0.1285, 'palace-theatre', null, null),
(5, 'Lyceum Theatre', '21 Wellington St, Covent Garden, London WC2E 7RQ', 1000, 51.5120, -0.1205, 'lyceum-theatre', null, null);

-- Create realistic theatre sections with proper capacity distribution
INSERT INTO venue_sections (venue_id, name, capacity, price_multiplier, sort_order) VALUES
-- Her Majesty's Theatre
(1, 'Stalls', 400, 1.0, 1),
(1, 'Dress Circle', 300, 1.3, 2),
(1, 'Upper Circle', 200, 0.8, 3),
(1, 'Balcony', 100, 0.5, 4),

-- Prince Edward Theatre
(2, 'Stalls', 450, 1.0, 1),
(2, 'Dress Circle', 350, 1.2, 2),
(2, 'Upper Circle', 200, 0.7, 3),

-- Novello Theatre
(3, 'Stalls', 400, 1.0, 1),
(3, 'Dress Circle', 300, 1.4, 2),
(3, 'Upper Circle', 200, 0.8, 3),
(3, 'Gallery', 100, 0.6, 4),

-- Palace Theatre
(4, 'Stalls', 500, 1.0, 1),
(4, 'Royal Circle', 300, 1.5, 2),
(4, 'Grand Circle', 200, 0.9, 3),

-- Lyceum Theatre
(5, 'Stalls', 450, 1.0, 1),
(5, 'Dress Circle', 350, 1.3, 2),
(5, 'Upper Circle', 200, 0.8, 3);

-- Create popular London shows with realistic timing
INSERT INTO shows (id, name, venue_id, start_time, base_price, description, image_url, latitude, longitude) VALUES
(1, 'The Phantom of the Opera', 1, NOW() + INTERVAL '3 hours', 60.00, 'Andrew Lloyd Webber''s legendary musical masterpiece', '/phantom.jpg', 51.5094, -0.1319),
(2, 'Mamma Mia!', 2, NOW() + INTERVAL '1 day 2 hours', 55.00, 'The feel-good musical based on the songs of ABBA', '/mamamia.jpeg', 51.5130, -0.1308),
(3, 'Chicago', 3, NOW() + INTERVAL '6 hours', 50.00, 'The dazzling musical about fame, fortune and murder', '/chicago.jpeg', 51.5130, -0.1197),
(4, 'Harry Potter and the Cursed Child', 4, NOW() + INTERVAL '1 day 7 hours', 65.00, 'The eighth story in the Harry Potter series', '/harry.jpeg', 51.5154, -0.1285),
(5, 'The Lion King', 5, NOW() + INTERVAL '4 hours', 70.00, 'Disney''s award-winning musical spectacular', '/lionking.jpeg', 51.5120, -0.1205),
(6, 'Wicked', 1, NOW() + INTERVAL '2 days 3 hours', 58.00, 'The untold story of the Witches of Oz', '/wicked.jpeg', 51.5094, -0.1319);

-- Function to create realistic show pricing with limited availability
CREATE OR REPLACE FUNCTION create_realistic_london_pricing()
RETURNS void AS $$
DECLARE
    show_record RECORD;
    section_record RECORD;
    section_price DECIMAL(10,2);
    available_seats INTEGER;
    sold_seats INTEGER;
BEGIN
    -- Loop through each show
    FOR show_record IN SELECT id, base_price FROM shows WHERE id IN (1,2,3,4,5,6) LOOP
        -- Calculate total available seats for this show (150-300 range)
        available_seats := 150 + (RANDOM() * 150)::INTEGER;
        
        -- Loop through each section for this venue
        FOR section_record IN 
            SELECT vs.id, vs.capacity, vs.price_multiplier, vs.venue_id
            FROM venue_sections vs 
            JOIN shows s ON s.venue_id = vs.venue_id 
            WHERE s.id = show_record.id 
        LOOP
            -- Calculate section price based on base price and multiplier
            -- Ensure prices stay within £20-£90 range
            section_price := GREATEST(20.00, LEAST(90.00, show_record.base_price * section_record.price_multiplier));
            
            -- Calculate how many seats are available in this section
            -- Proportional to section capacity but limited by total available
            sold_seats := section_record.capacity - LEAST(
                section_record.capacity,
                (available_seats * section_record.capacity::FLOAT / 1000.0)::INTEGER
            );
            
            -- Ensure we don't oversell
            sold_seats := GREATEST(0, LEAST(section_record.capacity, sold_seats));
            
            -- Insert pricing record
            INSERT INTO show_section_pricing (
                show_id, 
                venue_section_id, 
                price, 
                capacity, 
                sold
            ) VALUES (
                show_record.id,
                section_record.id,
                section_price,
                section_record.capacity,
                sold_seats
            );
            
            -- Reduce available seats for next section
            available_seats := available_seats - (section_record.capacity - sold_seats);
            IF available_seats <= 0 THEN
                available_seats := 0;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the pricing function
SELECT create_realistic_london_pricing();

-- Create or replace the show_with_pricing view
CREATE OR REPLACE VIEW show_with_pricing AS
SELECT 
    s.*,
    COALESCE(MIN(ssp.price), s.base_price) as min_price,
    COALESCE(MAX(ssp.price), s.base_price) as max_price,
    COALESCE(SUM(ssp.capacity - ssp.sold), 0) as total_available,
    CASE WHEN COALESCE(SUM(ssp.capacity - ssp.sold), 0) > 0 THEN true ELSE false END as has_seats_available,
    COALESCE(SUM(ssp.sold), 0) as tickets_sold,
    COALESCE(SUM(ssp.capacity), 0) as total_tickets
FROM shows s
LEFT JOIN show_section_pricing ssp ON s.id = ssp.show_id
GROUP BY s.id, s.name, s.venue_id, s.start_time, s.base_price, s.description, s.image_url, s.latitude, s.longitude;

-- Create view for venue dashboard
CREATE OR REPLACE VIEW show_with_section_pricing AS
SELECT 
    s.*,
    vs.name as section_name,
    ssp.price as section_price,
    ssp.capacity as section_capacity,
    ssp.sold as section_sold,
    (ssp.capacity - ssp.sold) as section_available
FROM shows s
JOIN show_section_pricing ssp ON s.id = ssp.show_id
JOIN venue_sections vs ON ssp.venue_section_id = vs.id
ORDER BY s.id, vs.sort_order;

-- Enable RLS and set policies
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_section_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_bookings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public venues access" ON venues FOR SELECT USING (true);
CREATE POLICY "Public shows access" ON shows FOR SELECT USING (true);
CREATE POLICY "Public sections access" ON venue_sections FOR SELECT USING (true);
CREATE POLICY "Public pricing access" ON show_section_pricing FOR SELECT USING (true);
CREATE POLICY "Public bookings access" ON seat_bookings FOR SELECT USING (true);

-- Allow authenticated users to make bookings
CREATE POLICY "Authenticated booking insert" ON seat_bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated booking update" ON seat_bookings FOR UPDATE TO authenticated USING (true);

-- Verification queries
SELECT 'Venues created:' as info, COUNT(*) as count FROM venues WHERE id IN (1,2,3,4,5);
SELECT 'Sections created:' as info, COUNT(*) as count FROM venue_sections WHERE venue_id IN (1,2,3,4,5);
SELECT 'Shows created:' as info, COUNT(*) as count FROM shows WHERE id IN (1,2,3,4,5,6);
SELECT 'Pricing entries:' as info, COUNT(*) as count FROM show_section_pricing WHERE show_id IN (1,2,3,4,5,6);

-- Show pricing summary
SELECT 
    s.name as show_name,
    v.name as venue_name,
    s.start_time,
    MIN(ssp.price) as min_price,
    MAX(ssp.price) as max_price,
    SUM(ssp.capacity - ssp.sold) as available_seats,
    SUM(ssp.capacity) as total_capacity
FROM shows s
JOIN venues v ON s.venue_id = v.id
JOIN show_section_pricing ssp ON s.id = ssp.show_id
WHERE s.id IN (1,2,3,4,5,6)
GROUP BY s.id, s.name, v.name, s.start_time
ORDER BY s.start_time;