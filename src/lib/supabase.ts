// Legacy Supabase client - retained for compatibility
// Note: System now uses Drizzle ORM directly via src/lib/db/queries.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Create Supabase client (for legacy compatibility only)
export const supabase = createClient(supabaseUrl, supabaseKey)

// Note: All database operations should use Drizzle ORM queries instead
// Import from: @/lib/db/queries
console.warn('⚠️ Supabase client used - consider migrating to Drizzle ORM queries')

export default supabase 