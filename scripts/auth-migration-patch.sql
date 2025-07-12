-- ============================================================================
-- AUTHENTICATION MIGRATION PATCH
-- Fix remaining issues from the main migration
-- ============================================================================

-- 1. Create verification_tokens table if it doesn't exist (for password reset)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_tokens') THEN
        CREATE TABLE verification_tokens (
            identifier TEXT NOT NULL, -- email address
            token TEXT NOT NULL,
            expires TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add constraints and indexes
        ALTER TABLE verification_tokens ADD CONSTRAINT verification_tokens_pkey UNIQUE (identifier, token);
        CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
        CREATE INDEX idx_verification_tokens_expires ON verification_tokens(expires);
        CREATE INDEX idx_verification_tokens_lookup ON verification_tokens(identifier, token, expires);
        
        RAISE NOTICE 'Created verification_tokens table with indexes';
    ELSE
        RAISE NOTICE 'verification_tokens table already exists';
    END IF;
END
$$;

-- 2. Fix the venue user creation with proper variable scoping
DO $$
DECLARE
    target_venue_id UUID;
BEGIN
    -- Get Victoria Palace Theatre venue ID
    SELECT id INTO target_venue_id FROM venues WHERE name = 'Victoria Palace Theatre' LIMIT 1;
    
    IF target_venue_id IS NOT NULL THEN
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
        
        -- Link venue manager to venue (using proper variable name)
        INSERT INTO user_venues (user_id, venue_id, role)
        VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', target_venue_id, 'manager')
        ON CONFLICT (user_id, venue_id) DO NOTHING;
        
        -- Link venue staff to venue (using proper variable name)
        INSERT INTO user_venues (user_id, venue_id, role)
        VALUES ('bbbbbbbb-cccc-dddd-eeee-ffffffffffff', target_venue_id, 'staff')
        ON CONFLICT (user_id, venue_id) DO NOTHING;
        
        RAISE NOTICE 'Created and linked venue users to Victoria Palace Theatre';
    ELSE
        RAISE NOTICE 'Victoria Palace Theatre venue not found - skipping venue user creation';
    END IF;
END
$$;

-- 3. Add sample passwords for testing (bcrypt hashed)
DO $$
BEGIN
    -- Update venue manager with test password: "manager123"
    UPDATE users 
    SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeL04p/TYOYzAQsR6'
    WHERE email = 'manager@victoriapalace.com';
    
    -- Update venue staff with test password: "staff123"
    UPDATE users 
    SET password_hash = '$2a$12$sYPfOmYowSdZ7rKWF8xhAO8q8Y1v8x8KzBcOjRGzNxJ8qZx5oSPTe'
    WHERE email = 'staff@victoriapalace.com';
    
    -- Update mock user with test password: "password123"
    UPDATE users 
    SET password_hash = '$2a$12$8k/fgR6U6YKxu2v4VZyFiOHl3S6w2U9ZqY3vEh3mR7s5xC4dMcAjG'
    WHERE id = '550e8400-e29b-41d4-a716-446655440000';
    
    RAISE NOTICE 'Updated users with test passwords';
END
$$;

-- 4. Display final summary
DO $$
DECLARE
    customer_count INTEGER;
    admin_count INTEGER;
    venue_count INTEGER;
    venue_link_count INTEGER;
    password_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO customer_count FROM users WHERE role = 'customer';
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    SELECT COUNT(*) INTO venue_count FROM users WHERE role = 'venue';
    SELECT COUNT(*) INTO venue_link_count FROM user_venues;
    SELECT COUNT(*) INTO password_count FROM users WHERE password_hash IS NOT NULL;
    
    RAISE NOTICE '=== AUTHENTICATION PATCH COMPLETE ===';
    RAISE NOTICE 'Final user roles summary:';
    RAISE NOTICE '  - Customer users: %', customer_count;
    RAISE NOTICE '  - Admin users: %', admin_count;
    RAISE NOTICE '  - Venue users: %', venue_count;
    RAISE NOTICE '  - Venue links: %', venue_link_count;
    RAISE NOTICE '  - Users with passwords: %', password_count;
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Test credentials:';
    RAISE NOTICE '  - manager@victoriapalace.com / manager123';
    RAISE NOTICE '  - staff@victoriapalace.com / staff123';
    RAISE NOTICE '  - john.doe@example.com / password123';
    RAISE NOTICE '===========================================';
END
$$; 