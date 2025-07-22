-- ============================================================================
-- VENUE-SPECIFIC AUTHENTICATION ENHANCEMENT
-- Replaces hardcoded credentials with secure, database-driven authentication
-- ============================================================================

-- 1. Add venue role enum for granular permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'venue_role') THEN
        CREATE TYPE venue_role AS ENUM (
            'validator',    -- Can only validate tickets at door
            'manager',      -- Can manage shows, view reports, validate tickets
            'admin'         -- Full venue control including user management
        );
        RAISE NOTICE 'Created venue_role enum';
    END IF;
END
$$;

-- 2. Update userVenues table to use enhanced roles
DO $$
BEGIN
    -- Check if role column exists and is text type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_venues' AND column_name = 'role' AND data_type = 'text'
    ) THEN
        -- Drop existing constraint and alter column type
        ALTER TABLE user_venues DROP CONSTRAINT IF EXISTS user_venues_role_check;
        ALTER TABLE user_venues ALTER COLUMN role TYPE venue_role USING role::venue_role;
        RAISE NOTICE 'Updated user_venues.role to use venue_role enum';
    END IF;
END
$$;

-- 3. Add venue-specific permissions table for fine-grained control
CREATE TABLE IF NOT EXISTS venue_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_venue_id UUID NOT NULL REFERENCES user_venues(id) ON DELETE CASCADE,
    permission TEXT NOT NULL, -- 'validate', 'view_reports', 'manage_shows', 'manage_users'
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id), -- Who granted this permission
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_venue_id, permission)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_venue_permissions_user_venue ON venue_permissions(user_venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_permissions_active ON venue_permissions(is_active, expires_at);

-- 4. Create venue authentication sessions table (separate from main user sessions)
CREATE TABLE IF NOT EXISTS venue_auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    role venue_role NOT NULL,
    permissions TEXT[] DEFAULT '{}', -- Cached permissions for performance
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user can only have one active session per venue
    UNIQUE(user_id, venue_id)
);

-- Add indexes for session management
CREATE INDEX IF NOT EXISTS idx_venue_auth_sessions_token ON venue_auth_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_venue_auth_sessions_user_venue ON venue_auth_sessions(user_id, venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_auth_sessions_expires ON venue_auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_venue_auth_sessions_activity ON venue_auth_sessions(last_activity);

-- 5. Create default permission mappings for roles
CREATE TABLE IF NOT EXISTS venue_role_permissions (
    role venue_role NOT NULL,
    permission TEXT NOT NULL,
    description TEXT,
    
    PRIMARY KEY(role, permission)
);

-- Insert default permissions for each role
INSERT INTO venue_role_permissions (role, permission, description) VALUES
-- Validator permissions (door staff)
('validator', 'validate_tickets', 'Can validate QR codes and tickets at venue entrance'),
('validator', 'view_door_list', 'Can view today''s booking list for door checking'),

-- Manager permissions (venue management staff) 
('manager', 'validate_tickets', 'Can validate QR codes and tickets'),
('manager', 'view_door_list', 'Can view booking lists'),
('manager', 'view_reports', 'Can view sales and booking reports'),
('manager', 'manage_shows', 'Can create, edit, and cancel shows'),
('manager', 'view_analytics', 'Can view venue performance analytics'),

-- Admin permissions (venue administrators)
('admin', 'validate_tickets', 'Full ticket validation access'),
('admin', 'view_door_list', 'Full door list access'),
('admin', 'view_reports', 'Full reporting access'),
('admin', 'manage_shows', 'Full show management'),
('admin', 'view_analytics', 'Full analytics access'),
('admin', 'manage_users', 'Can add/remove venue staff'),
('admin', 'manage_settings', 'Can modify venue settings'),
('admin', 'export_data', 'Can export venue data')

ON CONFLICT (role, permission) DO NOTHING;

-- 6. Function to get user's venue permissions
CREATE OR REPLACE FUNCTION get_user_venue_permissions(target_user_id UUID, target_venue_id UUID)
RETURNS TABLE(permission TEXT, role venue_role) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vrp.permission,
        uv.role
    FROM user_venues uv
    JOIN venue_role_permissions vrp ON uv.role = vrp.role
    WHERE uv.user_id = target_user_id 
    AND uv.venue_id = target_venue_id
    
    UNION
    
    -- Add any custom permissions
    SELECT 
        vp.permission,
        uv.role
    FROM user_venues uv
    JOIN venue_permissions vp ON uv.id = vp.user_venue_id
    WHERE uv.user_id = target_user_id 
    AND uv.venue_id = target_venue_id
    AND vp.is_active = true
    AND (vp.expires_at IS NULL OR vp.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to create venue staff user
CREATE OR REPLACE FUNCTION create_venue_staff(
    email TEXT,
    password_hash TEXT,
    name TEXT,
    venue_slug TEXT,
    staff_role venue_role DEFAULT 'validator'
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    target_venue_id UUID;
    user_venue_id UUID;
BEGIN
    -- Get venue ID from slug
    SELECT id INTO target_venue_id FROM venues WHERE slug = venue_slug;
    
    IF target_venue_id IS NULL THEN
        RAISE EXCEPTION 'Venue not found: %', venue_slug;
    END IF;
    
    -- Create user account
    INSERT INTO users (email, name, password_hash, role, email_verified)
    VALUES (email, name, password_hash, 'venue', NOW())
    RETURNING id INTO new_user_id;
    
    -- Create email account entry for password auth
    INSERT INTO accounts (
        user_id, type, provider, provider_account_id, 
        access_token, token_type
    ) VALUES (
        new_user_id, 'credentials', 'email', password_hash,
        'email_password', 'password'
    );
    
    -- Link user to venue with role
    INSERT INTO user_venues (user_id, venue_id, role)
    VALUES (new_user_id, target_venue_id, staff_role)
    RETURNING id INTO user_venue_id;
    
    RAISE NOTICE 'Created venue staff: % for venue: % with role: %', email, venue_slug, staff_role;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to authenticate venue staff
CREATE OR REPLACE FUNCTION authenticate_venue_staff(
    email TEXT,
    password_plain TEXT,
    venue_slug TEXT DEFAULT NULL
)
RETURNS TABLE(
    user_id UUID,
    venue_id UUID,
    venue_slug TEXT,
    role venue_role,
    permissions TEXT[]
) AS $$
DECLARE
    stored_hash TEXT;
    target_user_id UUID;
    venue_record RECORD;
BEGIN
    -- Find user by email
    SELECT u.id, a.provider_account_id INTO target_user_id, stored_hash
    FROM users u
    JOIN accounts a ON u.id = a.user_id
    WHERE u.email = email 
    AND u.role = 'venue'
    AND a.provider = 'email';
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid credentials';
    END IF;
    
    -- Verify password (assumes bcrypt hashing)
    IF NOT crypt(password_plain, stored_hash) = stored_hash THEN
        RAISE EXCEPTION 'Invalid credentials';
    END IF;
    
    -- Get venue access (if venue_slug specified, check access to that venue)
    FOR venue_record IN
        SELECT 
            v.id as venue_id,
            v.slug as venue_slug,
            uv.role,
            ARRAY_AGG(vrp.permission) as permissions
        FROM venues v
        JOIN user_venues uv ON v.id = uv.venue_id
        JOIN venue_role_permissions vrp ON uv.role = vrp.role
        WHERE uv.user_id = target_user_id
        AND (venue_slug IS NULL OR v.slug = venue_slug)
        GROUP BY v.id, v.slug, uv.role
    LOOP
        RETURN QUERY VALUES (
            target_user_id,
            venue_record.venue_id,
            venue_record.venue_slug,
            venue_record.role,
            venue_record.permissions
        );
    END LOOP;
    
    -- If no venues found, raise error
    IF NOT FOUND THEN
        IF venue_slug IS NOT NULL THEN
            RAISE EXCEPTION 'No access to venue: %', venue_slug;
        ELSE
            RAISE EXCEPTION 'No venue access configured';
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Sample venue staff creation
DO $$
DECLARE
    criterion_user_id UUID;
    phantom_user_id UUID;
    victoria_user_id UUID;
BEGIN
    -- Create Criterion Theatre validator
    SELECT create_venue_staff(
        'criterion_validation@lastminutelive.com',
        crypt('Criterion2024!', gen_salt('bf')),
        'Criterion Door Staff',
        'criterion-theatre',
        'validator'
    ) INTO criterion_user_id;
    
    -- Create Phantom Opera House manager  
    SELECT create_venue_staff(
        'phantom_manager@lastminutelive.com', 
        crypt('Phantom2024Manager!', gen_salt('bf')),
        'Phantom Theatre Manager',
        'phantom-opera-house',
        'manager'
    ) INTO phantom_user_id;
    
    -- Create Victoria Palace admin
    SELECT create_venue_staff(
        'victoria_admin@lastminutelive.com',
        crypt('Victoria2024Admin!', gen_salt('bf')), 
        'Victoria Palace Admin',
        'victoria-palace',
        'admin'
    ) INTO victoria_user_id;
    
    RAISE NOTICE 'Created sample venue staff accounts:';
    RAISE NOTICE '  - criterion_validation@lastminutelive.com (validator)';
    RAISE NOTICE '  - phantom_manager@lastminutelive.com (manager)'; 
    RAISE NOTICE '  - victoria_admin@lastminutelive.com (admin)';
    
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Sample venue staff accounts already exist, skipping creation';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating sample accounts: %', SQLERRM;
END
$$;

-- 10. Security policies (RLS)
ALTER TABLE venue_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_role_permissions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own venue sessions
CREATE POLICY "Users can access own venue sessions" ON venue_auth_sessions
    FOR ALL USING (user_id = auth.uid());

-- Users can only see permissions for venues they have access to
CREATE POLICY "Users can view venue permissions" ON venue_permissions
    FOR SELECT USING (
        user_venue_id IN (
            SELECT id FROM user_venues WHERE user_id = auth.uid()
        )
    );

-- Anyone can read role permission mappings
CREATE POLICY "Role permissions are readable" ON venue_role_permissions
    FOR SELECT USING (true);

-- Verification query
SELECT 
    'Venue Authentication Setup Complete' as status,
    COUNT(*) as staff_accounts_created
FROM users 
WHERE role = 'venue' 
AND email LIKE '%@lastminutelive.com'; 