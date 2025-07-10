import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Demo mode for UI testing
const isDemoMode = supabaseUrl === 'demo-mode'

export const supabase = isDemoMode 
  ? createDemoClient() 
  : createClient(supabaseUrl, supabaseAnonKey)

// Mock Supabase client for demo
function createDemoClient() {
  const mockShows = [
    {
      id: '1',
      name: 'Comedy Night',
      venue_name: 'Laughs Comedy Club',
      start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      price: 2500,
      tickets_sold: 23,
      total_tickets: 50,
      distance_km: 2.3
    },
    {
      id: '2', 
      name: 'Jazz Evening',
      venue_name: 'Blue Note Cafe',
      start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      price: 3000,
      tickets_sold: 15,
      total_tickets: 40,
      distance_km: 1.8
    },
    {
      id: '3',
      name: 'Indie Rock Show',
      venue_name: 'The Underground',
      start_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      price: 2000,
      tickets_sold: 45,
      total_tickets: 75,
      distance_km: 3.1
    }
  ]

  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          order: (column: string, options?: any) => Promise.resolve({ 
            data: table === 'shows' ? mockShows : [], 
            error: null 
          })
        }),
        gt: (column: string, value: any) => ({
          order: (column: string, options?: any) => Promise.resolve({ 
            data: mockShows, 
            error: null 
          })
        })
      }),
      insert: (data: any) => Promise.resolve({ data: null, error: null })
    }),
    rpc: (functionName: string, params?: any) => Promise.resolve({ 
      data: mockShows, 
      error: null 
    })
  } as any
}

// Database types for TypeScript
export interface Venue {
  id: string
  email: string
  name: string
  address: string
  lat: number
  lng: number
  created_at: string
}

export interface Show {
  id: string
  venue_id: string
  name: string
  start_time: string
  price: number // in cents
  total_tickets: number
  tickets_sold: number
  created_at: string
}

export interface Purchase {
  id: string
  show_id: string
  email: string
  stripe_session_id: string
  created_at: string
} 