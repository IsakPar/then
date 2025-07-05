'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BuyButton from '@/components/BuyButton'

interface Show {
  id: string
  name: string
  venue_name: string
  start_time: string
  base_price: number
  min_price: number
  max_price: number
  total_available: number
  has_seats_available: boolean
  tickets_sold: number
  total_tickets: number
  description?: string
  image_url?: string
}

export default function HomePage() {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllShows()
  }, [])

  const loadAllShows = async () => {
    try {
      // Use the new view that includes pricing calculations
      const { data, error } = await supabase
        .from('show_with_pricing')
        .select('*')
        .gt('start_time', new Date().toISOString())
        .order('start_time')

      if (error) throw error
      
      // Our view already calculates min_price, max_price, total_available
      const formattedShows = data?.filter((show: any) => 
        show.has_seats_available && show.total_available > 0
      ) || []
      
      setShows(formattedShows)
    } catch (error) {
      console.error('Error loading shows:', error)
      // Fallback to basic shows table
      try {
        const { data, error } = await supabase
          .from('shows')
          .select(`
            *,
            venues!inner(name)
          `)
          .gt('start_time', new Date().toISOString())
          .order('start_time')

        if (error) throw error
        
        const formattedShows = data?.map((show: any) => ({
          ...show,
          venue_name: show.venues.name,
          min_price: show.base_price || show.price || 0,
          max_price: show.base_price || show.price || 0,
          total_available: 100, // Default for fallback
          has_seats_available: true
        })) || []
        
        setShows(formattedShows)
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)
    
    const isToday = date.toDateString() === today.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()
    
    const timeString = date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    
    if (isToday) return `Today ${timeString}`
    if (isTomorrow) return `Tomorrow ${timeString}`
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    }) + ` ${timeString}`
  }

  const getTimeUntilShow = (dateString: string) => {
    const showTime = new Date(dateString)
    const now = new Date()
    const diffHours = Math.round((showTime.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Starting soon!'
    if (diffHours < 6) return `In ${diffHours} hours`
    if (diffHours < 24) return 'Tonight'
    return 'Tomorrow'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header skeleton */}
          <div className="text-center mb-12">
            <div className="h-20 w-20 bg-white/20 rounded-3xl mx-auto mb-6 animate-pulse"></div>
            <div className="h-8 w-64 bg-white/20 rounded-2xl mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 w-48 bg-white/20 rounded-full mx-auto animate-pulse"></div>
          </div>
          
          {/* Show cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 animate-pulse">
                <div className="space-y-4">
                  <div className="h-6 bg-white/20 rounded-lg"></div>
                  <div className="h-4 w-3/4 bg-white/20 rounded-lg"></div>
                  <div className="h-4 w-1/2 bg-white/20 rounded-lg"></div>
                  <div className="flex justify-between items-end">
                    <div className="h-8 w-20 bg-white/20 rounded-lg"></div>
                    <div className="h-10 w-28 bg-white/20 rounded-xl"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-40">
        <div className="w-full h-full bg-white/5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <header className="text-center mb-12 lg:mb-16">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="inline-flex items-center justify-center w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl shadow-2xl mb-2">
                <span className="text-4xl lg:text-5xl">🎭</span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-sm">✨</span>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            Last Minute Live
          </h1>
          <p className="text-purple-200 text-lg lg:text-xl font-medium mb-3">
            Tonight's hottest shows
          </p>
          <p className="text-purple-300 text-sm lg:text-base max-w-2xl mx-auto">
            Last-minute tickets • Best prices • Instant booking
          </p>
        </header>

        {/* Shows list */}
        {shows.length === 0 ? (
          <div className="text-center py-16 lg:py-24">
            <div className="inline-flex items-center justify-center w-32 h-32 lg:w-40 lg:h-40 bg-white/10 backdrop-blur-sm rounded-3xl mb-8">
              <span className="text-6xl lg:text-7xl">🎪</span>
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold text-white mb-6">
              No shows tonight
            </h2>
            <p className="text-purple-200 text-lg lg:text-xl leading-relaxed max-w-md mx-auto">
              Check back later for amazing<br />
              last-minute opportunities!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {shows.map(show => {
              const ticketsLeft = show.total_tickets - show.tickets_sold
              const isAlmostSoldOut = ticketsLeft <= 3
              const urgencyColor = isAlmostSoldOut ? 'from-red-500 to-pink-500' : 'from-green-500 to-emerald-500'
              
              return (
                <article key={show.id} className="group bg-white/15 backdrop-blur-lg rounded-3xl overflow-hidden shadow-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl">
                  {/* Show image */}
                  {show.image_url ? (
                    <div className="relative h-48 lg:h-56 overflow-hidden">
                      <img 
                        src={show.image_url} 
                        alt={show.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <div className="absolute top-4 right-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${urgencyColor} shadow-lg`}>
                          {getTimeUntilShow(show.start_time)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-48 lg:h-56 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                      <span className="text-6xl opacity-50">🎭</span>
                      <div className="absolute top-4 right-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${urgencyColor} shadow-lg`}>
                          {getTimeUntilShow(show.start_time)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="mb-5">
                      <h2 className="font-bold text-xl lg:text-2xl text-white mb-2 leading-tight group-hover:text-yellow-200 transition-colors">
                        {show.name}
                      </h2>
                      
                      {/* Add venue name prominently */}
                      <p className="text-purple-200 font-medium text-base lg:text-lg mb-3">
                        {show.venue_name}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-white font-semibold">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-xs">⏰</span>
                          </div>
                          <span className="text-sm lg:text-base">{formatDateTime(show.start_time)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Availability status */}
                    <div className={`text-xs font-bold uppercase tracking-wide mb-4 ${
                      show.total_available <= 3 ? 'text-red-300' : 'text-emerald-300'
                    }`}>
                      {show.total_available <= 3 ? `Only ${show.total_available} left!` : `${show.total_available} available`}
                    </div>
                    
                    {/* Price and Buy Button */}
                    <div className="flex justify-between items-end">
                      <div className="text-2xl lg:text-3xl font-bold text-white mb-1 flex items-baseline">
                        <span className="text-lg text-purple-200 mr-1">£</span>
                        {show.min_price === show.max_price ? (
                          <span>{Math.round(show.min_price)}</span>
                        ) : (
                          <span>{Math.round(show.min_price)}-{Math.round(show.max_price)}</span>
                        )}
                      </div>
                      
                      <BuyButton 
                        showId={show.id}
                        showName={show.name}
                        availableTickets={show.total_available}
                      />
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-16 lg:mt-24 pt-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-white/20 max-w-2xl mx-auto">
            <p className="text-white font-semibold mb-2 text-lg">
              ✨ Discover amazing live entertainment
            </p>
            <p className="text-purple-200 text-sm lg:text-base mb-4">
              Last-minute tickets • Instant booking • Great prices
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="/venue" 
                className="inline-flex items-center text-sm lg:text-base text-purple-300 hover:text-white transition-colors font-medium"
              >
                <span className="mr-2">🎪</span>
                Are you a venue? List your shows
              </a>
              <span className="hidden sm:block text-purple-400">•</span>
              <a 
                href="/contact" 
                className="inline-flex items-center text-sm lg:text-base text-purple-300 hover:text-white transition-colors font-medium"
              >
                <span className="mr-2">📧</span>
                Contact us
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}