-- ============================================================================
-- AUTHENTICATION ENHANCEMENT MIGRATION
-- Phase 1: Core Authentication Support
-- ============================================================================

-- 1. Add 'venue' role to existing user_role enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'venue' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'venue';
        RAISE NOTICE 'Added venue role to user_role enum';
    ELSE
        RAISE NOTICE 'Venue role already exists in user_role enum';
    END IF;
END
$$;

-- 2. Add password_hash column to users table (for email/password authentication)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
        RAISE NOTICE 'Added password_hash column to users table';
    ELSE
        RAISE NOTICE 'password_hash column already exists in users table';
    END IF;
END
$$;

-- 3. Create user_venues table for linking venue staff to specific venues
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_venues') THEN
        CREATE TABLE user_venues (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
            role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager', 'staff')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, venue_id)
        );
        
        -- Add indexes for performance
        CREATE INDEX idx_user_venues_user_id ON user_venues(user_id);
        CREATE INDEX idx_user_venues_venue_id ON user_venues(venue_id);
        
        RAISE NOTICE 'Created user_venues table with indexes';
    ELSE
        RAISE NOTICE 'user_venues table already exists';
    END IF;
END
$$;

-- 4. Create sample venue manager users for testing
DO $$
DECLARE
    venue_manager_id UUID;
    venue_staff_id UUID;
    venue_id UUID;
BEGIN
    -- Get Victoria Palace Theatre venue ID
    SELECT id INTO venue_id FROM venues WHERE name = 'Victoria Palace Theatre' LIMIT 1;
    
    IF venue_id IS NOT NULL THEN
        -- Create venue manager user if not exists
        INSERT INTO users (id, email, name, role, email_verified, created_at, updated_at)
        VALUES (
            'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            'manager@victoriapalace.com',
            'Victoria Palace Manager',
            'venue',
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO NOTHING;
        
        -- Create venue staff user if not exists
        INSERT INTO users (id, email, name, role, email_verified, created_at, updated_at)
        VALUES (
            'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
            'staff@victoriapalace.com',
            'Victoria Palace Staff',
            'venue',
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO NOTHING;
        
        -- Link venue manager to venue
        INSERT INTO user_venues (user_id, venue_id, role)
        VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', venue_id, 'manager')
        ON CONFLICT (user_id, venue_id) DO NOTHING;
        
        -- Link venue staff to venue
        INSERT INTO user_venues (user_id, venue_id, role)
        VALUES ('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', venue_id, 'staff')
        ON CONFLICT (user_id, venue_id) DO NOTHING;
        
        RAISE NOTICE 'Created sample venue manager and staff users';
    ELSE
        RAISE NOTICE 'Victoria Palace Theatre venue not found - skipping sample users';
    END IF;
END
$$;

-- 5. Update existing admin user (if exists) for testing
UPDATE users 
SET role = 'admin'
WHERE email = 'admin@lastminutelive.com' AND role != 'admin';

-- 6. Add indexes for performance on authentication queries
DO $$
BEGIN
    -- Index on email for faster login lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email_auth') THEN
        CREATE INDEX idx_users_email_auth ON users(email, password_hash) WHERE password_hash IS NOT NULL;
        RAISE NOTICE 'Created authentication index on users table';
    END IF;
    
    -- Index on verification tokens for faster password reset
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_verification_tokens_lookup') THEN
        CREATE INDEX idx_verification_tokens_lookup ON verification_tokens(identifier, token, expires);
        RAISE NOTICE 'Created lookup index on verification_tokens table';
    END IF;
END
$$;

-- 7. Display summary of changes
DO $$
DECLARE
    customer_count INTEGER;
    admin_count INTEGER;
    venue_count INTEGER;
    venue_link_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO customer_count FROM users WHERE role = 'customer';
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    SELECT COUNT(*) INTO venue_count FROM users WHERE role = 'venue';
    SELECT COUNT(*) INTO venue_link_count FROM user_venues;
    
    RAISE NOTICE '=== AUTHENTICATION MIGRATION COMPLETE ===';
    RAISE NOTICE 'User roles summary:';
    RAISE NOTICE '  - Customer users: %', customer_count;
    RAISE NOTICE '  - Admin users: %', admin_count;
    RAISE NOTICE '  - Venue users: %', venue_count;
    RAISE NOTICE '  - Venue links: %', venue_link_count;
    RAISE NOTICE '===========================================';
END
$$; 