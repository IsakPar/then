# Supabase Database Migration

## Instructions
1. Open your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Copy and paste the SQL below into the editor
4. Click **Run** to execute the migration

## SQL Migration Code

```sql
-- Database Update: Add location and image_url to shows table
-- Run this in your Supabase SQL Editor after the initial setup

-- Add location and image_url columns to shows table
ALTER TABLE shows 
ADD COLUMN location TEXT,
ADD COLUMN image_url TEXT;

-- Add lat/lng columns for UK geocoding
ALTER TABLE shows 
ADD COLUMN lat DECIMAL,
ADD COLUMN lng DECIMAL;

-- Update the location discovery function to include show location and image
DROP FUNCTION IF EXISTS nearby_shows(DECIMAL, DECIMAL, INTEGER);

CREATE OR REPLACE FUNCTION nearby_shows(user_lat DECIMAL, user_lng DECIMAL, radius_km INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID, name TEXT, venue_name TEXT, start_time TIMESTAMPTZ, 
  price INTEGER, tickets_sold INTEGER, total_tickets INTEGER,
  distance_km DECIMAL, location TEXT, image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id, s.name, v.name as venue_name, s.start_time,
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
```

## What This Migration Does
- ✅ Adds `location` column to store full addresses
- ✅ Adds `image_url` column for show images (optional)
- ✅ Adds `lat` and `lng` columns for precise coordinates  
- ✅ Updates the `nearby_shows()` function to return location and image data
- ✅ Enables UK postcode geocoding functionality

## After Running This Migration
- The "Could not find 'image_url' column" error will be fixed
- You can add shows with or without images
- Address autocomplete will work properly
- Location-based discovery will use precise coordinates

---

**⚠️ Important:** Run this migration **once** in your Supabase SQL Editor. Do not run it multiple times as it will cause errors. 