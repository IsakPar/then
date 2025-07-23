-- ============================================================================
-- GUEST SESSIONS TABLE MIGRATION
-- Adds guest session support for temporary user authentication
-- ============================================================================

-- Create guest_sessions table for temporary user sessions
CREATE TABLE IF NOT EXISTS guest_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    converted_at TIMESTAMP WITH TIME ZONE, -- when became registered user
    converted_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_sessions_token ON guest_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_email ON guest_sessions(email);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires ON guest_sessions(expires_at);

-- Add comments for documentation
COMMENT ON TABLE guest_sessions IS 'Temporary sessions for guest users who have not registered yet';
COMMENT ON COLUMN guest_sessions.session_token IS 'Unique token for guest session authentication';
COMMENT ON COLUMN guest_sessions.email IS 'Email address provided by guest user';
COMMENT ON COLUMN guest_sessions.device_info IS 'JSON containing device information (platform, version, etc.)';
COMMENT ON COLUMN guest_sessions.expires_at IS 'When this guest session expires (typically 7 days)';
COMMENT ON COLUMN guest_sessions.converted_at IS 'Timestamp when guest became a registered user';
COMMENT ON COLUMN guest_sessions.converted_user_id IS 'Reference to user record if guest converted to registered user';

-- Clean up expired guest sessions (optional cleanup function)
CREATE OR REPLACE FUNCTION cleanup_expired_guest_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM guest_sessions 
    WHERE expires_at < NOW() 
    AND converted_at IS NULL; -- Don't delete converted sessions for audit trail
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % expired guest sessions', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up expired sessions
-- This can be run manually or scheduled via cron/pg_cron
COMMENT ON FUNCTION cleanup_expired_guest_sessions() IS 'Removes expired guest sessions that have not been converted to registered users'; 