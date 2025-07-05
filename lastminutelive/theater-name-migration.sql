-- Add theater_name field to shows table
ALTER TABLE shows 
ADD COLUMN theater_name TEXT;

-- Update the nearby_shows function to include theater_name
DROP FUNCTION IF EXISTS nearby_shows(DECIMAL, DECIMAL, INTEGER);

CREATE OR REPLACE FUNCTION nearby_shows(user_lat DECIMAL, user_lng DECIMAL, radius_km INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID, name TEXT, venue_name TEXT, theater_name TEXT, start_time TIMESTAMPTZ, 
  price INTEGER, tickets_sold INTEGER, total_tickets INTEGER,
  distance_km DECIMAL, location TEXT, image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id, s.name, v.name as venue_name, s.theater_name, s.start_time,
    s.price, s.tickets_sold, s.total_tickets,
    ROUND(
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(COALESCE(s.lat, v.lat))) *
        cos(radians(COALESCE(s.lng, v.lng)) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(COALESCE(s.lat, v.lat)))
      )::numeric, 2
    ) as distance_km,
    s.location, s.image_url
  FROM shows s
  JOIN venues v ON v.id = s.venue_id
  WHERE s.start_time > NOW()
    AND s.tickets_sold < s.total_tickets
    AND (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(COALESCE(s.lat, v.lat))) *
        cos(radians(COALESCE(s.lng, v.lng)) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(COALESCE(s.lat, v.lat)))
      )
    ) <= radius_km
  ORDER BY distance_km, s.start_time;
END;
$$ LANGUAGE plpgsql; 