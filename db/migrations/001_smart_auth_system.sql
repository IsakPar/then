-- ============================================================================
-- SMART AUTH & TICKETS SYSTEM MIGRATION
-- Phase 1: Enhanced Authentication and Guest Support
-- ============================================================================

-- Create new enums for enhanced auth system
CREATE TYPE account_type AS ENUM ('guest', 'registered', 'premium');
CREATE TYPE qr_status AS ENUM ('valid', 'used', 'invalid', 'expired');
CREATE TYPE qr_validation_status AS ENUM ('admit', 'wrong_date', 'invalid', 'already_used');

-- ============================================================================
-- ENHANCE EXISTING USERS TABLE
-- ============================================================================

-- Add new columns to existing users table for guest support
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type account_type DEFAULT 'guest'::account_type NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_session_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users (account_type);
CREATE INDEX IF NOT EXISTS idx_users_guest_session ON users (guest_session_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users (auth_provider);

-- ============================================================================
-- GUEST SESSION MANAGEMENT
-- ============================================================================

-- Guest sessions tracking table
CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  device_info JSONB, -- device type, OS, app version
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  converted_at TIMESTAMP WITH TIME ZONE, -- when became registered user
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for guest sessions
CREATE INDEX IF NOT EXISTS idx_guest_sessions_token ON guest_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_email ON guest_sessions (email);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires ON guest_sessions (expires_at);

-- Enhanced user sessions for registered users
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_info JSONB, -- device type, OS, app version
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for user sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions (expires_at);

-- ============================================================================
-- ENHANCE VENUES WITH APPLE MAPS SUPPORT
-- ============================================================================

-- Add Apple Maps support to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS apple_maps_url TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS parking_nearby BOOLEAN DEFAULT false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS accessibility_info TEXT;

-- Create location index for venues
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues (latitude, longitude);

-- ============================================================================
-- ENHANCED BOOKINGS WITH SMART AUTH SUPPORT
-- ============================================================================

-- Enhanced bookings table
CREATE TABLE IF NOT EXISTS enhanced_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  show_id UUID NOT NULL, -- Will reference shows table
  booking_reference TEXT NOT NULL UNIQUE, -- LML12345
  payment_intent_id TEXT, -- Stripe payment intent
  total_amount INTEGER NOT NULL, -- in pence
  booking_status TEXT DEFAULT 'confirmed' NOT NULL,
  seats_count INTEGER NOT NULL,
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  qr_code_data TEXT, -- for venue entry
  qr_code_status qr_status DEFAULT 'valid'::qr_status NOT NULL,
  last_qr_check TIMESTAMP WITH TIME ZONE, -- when QR was last validated
  venue_coordinates JSONB, -- lat/lng for Apple Maps
  guest_session_id TEXT, -- for guest bookings
  converted_to_user_id UUID, -- if guest account was converted
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for enhanced bookings
CREATE INDEX IF NOT EXISTS idx_enhanced_bookings_ref ON enhanced_bookings (booking_reference);
CREATE INDEX IF NOT EXISTS idx_enhanced_bookings_user ON enhanced_bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_bookings_show ON enhanced_bookings (show_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_bookings_status ON enhanced_bookings (booking_status);
CREATE INDEX IF NOT EXISTS idx_enhanced_bookings_guest ON enhanced_bookings (guest_session_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_bookings_qr_status ON enhanced_bookings (qr_code_status);

-- Individual booked seats
CREATE TABLE IF NOT EXISTS booked_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES enhanced_bookings(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  seat_number INTEGER NOT NULL,
  seat_price INTEGER NOT NULL, -- in pence
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for booked seats
CREATE INDEX IF NOT EXISTS idx_booked_seats_booking ON booked_seats (booking_id);
CREATE INDEX IF NOT EXISTS idx_booked_seats_location ON booked_seats (section, row_number, seat_number);

-- ============================================================================
-- QR CODE VALIDATION SYSTEM
-- ============================================================================

-- QR code validation tracking
CREATE TABLE IF NOT EXISTS qr_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES enhanced_bookings(id) ON DELETE CASCADE,
  qr_code_data TEXT NOT NULL,
  validation_status qr_validation_status NOT NULL,
  validation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  venue_scanner_id TEXT, -- which device/gate scanned it
  show_date DATE NOT NULL,
  attempted_entry_time TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Indexes for QR validations
CREATE INDEX IF NOT EXISTS idx_qr_validations_booking ON qr_validations (booking_id);
CREATE INDEX IF NOT EXISTS idx_qr_validations_qr_data ON qr_validations (qr_code_data);
CREATE INDEX IF NOT EXISTS idx_qr_validations_status ON qr_validations (validation_status);
CREATE INDEX IF NOT EXISTS idx_qr_validations_timestamp ON qr_validations (validation_timestamp);

-- ============================================================================
-- OFFLINE TICKET STORAGE
-- ============================================================================

-- Local ticket storage for offline access
CREATE TABLE IF NOT EXISTS local_tickets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_data JSONB NOT NULL, -- complete ticket info
  qr_code_status qr_status DEFAULT 'valid'::qr_status NOT NULL,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_offline_available BOOLEAN DEFAULT true,
  storage_size_bytes INTEGER -- for storage management
);

-- Indexes for local tickets
CREATE INDEX IF NOT EXISTS idx_local_tickets_user ON local_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_local_tickets_status ON local_tickets (qr_code_status);
CREATE INDEX IF NOT EXISTS idx_local_tickets_sync ON local_tickets (last_sync);
CREATE INDEX IF NOT EXISTS idx_local_tickets_offline ON local_tickets (is_offline_available);

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    ref TEXT;
    exists_check INTEGER;
BEGIN
    LOOP
        -- Generate reference: LML + 6 random alphanumeric characters
        ref := 'LML' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        
        -- Check if it exists
        SELECT COUNT(*) INTO exists_check
        FROM enhanced_bookings 
        WHERE booking_reference = ref;
        
        -- Exit if unique
        EXIT WHEN exists_check = 0;
    END LOOP;
    
    RETURN ref;
END;
$$;

-- Function to generate QR code data
CREATE OR REPLACE FUNCTION generate_qr_code(booking_ref TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    -- QR format: LML-{booking_ref}-{timestamp}
    RETURN 'LML-' || booking_ref || '-' || EXTRACT(EPOCH FROM NOW())::TEXT;
END;
$$;

-- Function to create guest session
CREATE OR REPLACE FUNCTION create_guest_session(
    p_email TEXT,
    p_device_info JSONB DEFAULT NULL
)
RETURNS TABLE (
    session_token TEXT,
    user_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_session_token TEXT;
    v_user_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_guest_session_id TEXT;
BEGIN
    -- Generate unique session token
    v_session_token := ENCODE(GEN_RANDOM_BYTES(32), 'hex');
    v_guest_session_id := ENCODE(GEN_RANDOM_BYTES(16), 'hex');
    v_expires_at := NOW() + INTERVAL '30 days';
    
    -- Create or get guest user
    INSERT INTO users (email, account_type, guest_session_id, created_at)
    VALUES (p_email, 'guest', v_guest_session_id, NOW())
    ON CONFLICT (email) 
    DO UPDATE SET 
        guest_session_id = v_guest_session_id,
        last_login = NOW()
    RETURNING id INTO v_user_id;
    
    -- Create guest session record
    INSERT INTO guest_sessions (
        session_token, 
        email, 
        device_info, 
        expires_at
    ) VALUES (
        v_session_token, 
        p_email, 
        p_device_info, 
        v_expires_at
    );
    
    RETURN QUERY SELECT v_session_token, v_user_id, v_expires_at;
END;
$$;

-- Function to convert guest to registered user
CREATE OR REPLACE FUNCTION convert_guest_to_registered(
    p_guest_session_id TEXT,
    p_password_hash TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Update guest user to registered
    UPDATE users 
    SET 
        account_type = 'registered',
        password_hash = p_password_hash,
        first_name = p_first_name,
        last_name = p_last_name,
        converted_at = NOW(),
        guest_session_id = NULL
    WHERE guest_session_id = p_guest_session_id
    RETURNING id INTO v_user_id;
    
    -- Update guest sessions
    UPDATE guest_sessions 
    SET converted_at = NOW()
    WHERE session_token IN (
        SELECT gs.session_token 
        FROM guest_sessions gs
        JOIN users u ON u.email = gs.email
        WHERE u.id = v_user_id
    );
    
    -- Transfer guest bookings to user account
    UPDATE enhanced_bookings 
    SET 
        user_id = v_user_id,
        converted_to_user_id = v_user_id,
        guest_session_id = NULL
    WHERE guest_session_id = p_guest_session_id;
    
    RETURN v_user_id;
END;
$$;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- Clean up expired guest sessions
    DELETE FROM guest_sessions 
    WHERE expires_at < NOW() AND converted_at IS NULL;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Clean up expired user sessions
    DELETE FROM user_sessions 
    WHERE expires_at < NOW();
    
    RETURN cleaned_count;
END;
$$;

-- ============================================================================
-- VIEWS FOR EASY DATA ACCESS
-- ============================================================================

-- View for user bookings with venue info
CREATE OR REPLACE VIEW user_bookings_with_venue AS
SELECT 
    eb.id,
    eb.booking_reference,
    eb.total_amount,
    eb.seats_count,
    eb.booking_date,
    eb.qr_code_data,
    eb.qr_code_status,
    eb.venue_coordinates,
    u.email,
    u.first_name,
    u.last_name,
    u.account_type,
    -- Extract show info (assuming shows table exists)
    eb.show_id,
    -- Booked seats
    ARRAY_AGG(
        JSON_BUILD_OBJECT(
            'section', bs.section,
            'row', bs.row_number,
            'seat', bs.seat_number,
            'price', bs.seat_price
        )
    ) AS seats
FROM enhanced_bookings eb
JOIN users u ON eb.user_id = u.id
LEFT JOIN booked_seats bs ON bs.booking_id = eb.id
GROUP BY eb.id, u.id;

-- View for guest bookings (for conversion tracking)
CREATE OR REPLACE VIEW guest_bookings AS
SELECT 
    eb.*,
    gs.email,
    gs.device_info,
    gs.created_at as session_created_at
FROM enhanced_bookings eb
JOIN guest_sessions gs ON eb.guest_session_id = gs.session_token
WHERE eb.guest_session_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS AND AUTOMATION
-- ============================================================================

-- Function to update booking timestamps
CREATE OR REPLACE FUNCTION update_booking_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Trigger for booking updates
DROP TRIGGER IF EXISTS trigger_update_booking_timestamp ON enhanced_bookings;
CREATE TRIGGER trigger_update_booking_timestamp
    BEFORE UPDATE ON enhanced_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_timestamp();

-- ============================================================================
-- INITIAL DATA AND SETUP
-- ============================================================================

-- Update existing venues with Apple Maps coordinates (Victoria Palace Theatre)
UPDATE venues 
SET 
    latitude = 51.4965,
    longitude = -0.1367,
    apple_maps_url = 'maps://?daddr=51.4965,-0.1367',
    parking_nearby = true,
    accessibility_info = 'Wheelchair accessible entrance on Victoria Street'
WHERE name ILIKE '%victoria%palace%' OR name ILIKE '%hamilton%';

-- Create cleanup job (can be called periodically)
-- This should be scheduled via cron or application scheduler
-- SELECT cleanup_expired_sessions();

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions for web application access
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
INSERT INTO migration_log (migration_name, completed_at) 
VALUES ('001_smart_auth_system', NOW())
ON CONFLICT DO NOTHING;

-- Create migration log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name TEXT UNIQUE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
); 