-- Function to safely increment tickets sold
CREATE OR REPLACE FUNCTION increment_tickets_sold(
  show_id UUID,
  quantity INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE shows 
  SET tickets_sold = tickets_sold + quantity
  WHERE id = show_id
  AND tickets_sold + quantity <= total_tickets;
$$; 