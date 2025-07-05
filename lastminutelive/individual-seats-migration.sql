-- Create seat status enum
CREATE TYPE seat_status AS ENUM ('available', 'reserved', 'booked');

-- Create seats table with ALL UUID foreign keys
CREATE TABLE IF NOT EXISTS seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  venue_section_id UUID NOT NULL REFERENCES venue_sections(id) ON DELETE CASCADE,
  row_name VARCHAR(10) NOT NULL,
  seat_number INTEGER NOT NULL,
  status seat_status NOT NULL DEFAULT 'available',
  reservation_token TEXT,
  reserved_until TIMESTAMP WITH TIME ZONE,
  booking_id UUID REFERENCES seat_bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(show_id, venue_section_id, row_name, seat_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_seats_show_id ON seats(show_id);
CREATE INDEX IF NOT EXISTS idx_seats_section_id ON seats(venue_section_id);
CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status);
CREATE INDEX IF NOT EXISTS idx_seats_reservation ON seats(reservation_token);
CREATE INDEX IF NOT EXISTS idx_seats_reserved_until ON seats(reserved_until);

-- Function to generate seats for a show based on section capacity
CREATE OR REPLACE FUNCTION generate_seats_for_show(target_show_id UUID)
RETURNS INTEGER AS $$
DECLARE
  section_record RECORD;
  row_count INTEGER;
  seats_per_row INTEGER;
  current_row INTEGER;
  current_seat INTEGER;
  total_seats_created INTEGER := 0;
  row_letter CHAR(1);
BEGIN
  -- Loop through all sections for this show
  FOR section_record IN 
    SELECT 
      vs.id as section_id,
      vs.section_name,
      ssp.tickets_available as capacity
    FROM venue_sections vs
    JOIN show_section_pricing ssp ON vs.id = ssp.section_id
    WHERE ssp.show_id = target_show_id
  LOOP
    -- Calculate rows and seats per row (simple algorithm)
    -- For small sections (< 50), use fewer rows
    IF section_record.capacity <= 20 THEN
      row_count := 2;
    ELSIF section_record.capacity <= 50 THEN
      row_count := 3;
    ELSIF section_record.capacity <= 100 THEN
      row_count := 5;
    ELSIF section_record.capacity <= 200 THEN
      row_count := 8;
    ELSE
      row_count := 10;
    END IF;
    
    seats_per_row := CEIL(section_record.capacity::FLOAT / row_count);
    
    -- Generate seats
    FOR current_row IN 1..row_count LOOP
      -- Convert row number to letter (A, B, C, etc.)
      row_letter := CHR(64 + current_row); -- A=65, B=66, etc.
      
      FOR current_seat IN 1..seats_per_row LOOP
        -- Stop if we've created enough seats for this section
        EXIT WHEN (current_row - 1) * seats_per_row + current_seat > section_record.capacity;
        
        INSERT INTO seats (
          show_id,
          venue_section_id,
          row_name,
          seat_number,
          status
        ) VALUES (
          target_show_id,
          section_record.section_id,
          row_letter,
          current_seat,
          'available'
        );
        
        total_seats_created := total_seats_created + 1;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RETURN total_seats_created;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Seats are viewable by everyone" ON seats
  FOR SELECT USING (true);

CREATE POLICY "Seats can be updated by authenticated users" ON seats
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON seats TO anon, authenticated;
GRANT UPDATE ON seats TO authenticated;