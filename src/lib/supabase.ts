// Legacy Supabase client - DEPRECATED
// Note: System now uses Drizzle ORM directly via src/lib/db/queries.ts

// Stub export for legacy compatibility - DO NOT USE
export const supabase = {
  error: () => { throw new Error('Supabase client deprecated - use Drizzle ORM queries from @/lib/db/queries') }
}

// Note: All database operations should use Drizzle ORM queries instead
// Import from: @/lib/db/queries
console.warn('⚠️ Legacy Supabase import detected - migrate to Drizzle ORM queries')

export default supabase 