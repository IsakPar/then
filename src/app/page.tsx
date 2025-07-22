'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import BuyButton from '@/components/BuyButton'

interface SeatPricing {
  section_id: string
  section_name: string
  price: number
  available_seats: number
}

interface Show {
  id: string
  title: string
  venue_name: string
  date: string
  time: string
  price: number
  min_price: number
  max_price: number
  total_available: number
  has_seats_available: boolean
  imageUrl?: string
  location?: string
  seat_pricing?: SeatPricing[]
  total_seats: number
  isMock?: boolean // Added for mock shows
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAllShows()
  }, [])

  const loadAllShows = async () => {
    try {
      // Use our new API endpoint instead of direct Supabase
      const response = await fetch('/api/shows')
      if (!response.ok) {
        throw new Error('Failed to fetch shows')
      }
      
      const data = await response.json()
      
      const formattedShows = data?.map((show: any) => {
        // Calculate total available seats across all sections
        const totalAvailable = (show.seat_pricing || []).reduce(
          (sum: number, section: any) => sum + parseInt(section.available_seats || '0'), 
          0
        );
        
        // Use the pre-calculated min_price and max_price from the database
        let minPrice = show.min_price || 0;
        let maxPrice = show.max_price || 0;
        
        // Fallback calculation if database values are not available
        if ((!minPrice || !maxPrice) && show.seat_pricing && show.seat_pricing.length > 0) {
          const allPrices = show.seat_pricing
            .map((section: any) => section.price)
            .filter((price: number) => price > 0);
          
          if (allPrices.length > 0) {
            minPrice = Math.min(...allPrices);
            maxPrice = Math.max(...allPrices);
          }
        }
        
        return {
          id: show.id,
          title: show.title, // Updated field name
          venue_name: show.venue_name,
          date: show.date,
          time: show.time,
          price: minPrice, // For backward compatibility
          min_price: minPrice,
          max_price: maxPrice,
          total_available: totalAvailable,
          has_seats_available: totalAvailable > 0,
          imageUrl: show.imageUrl, // Updated field name
          location: show.location,
          seat_pricing: show.seat_pricing
        };
      }) || [];

      // Add mock shows for display only (no booking functionality) - Hamilton removed as it's now real data
      const mockShows = [
        {
          id: 'mock-chicago',
          title: 'Chicago',
          venue_name: 'Ambassador Theatre',
          date: '2025-07-16',
          time: '19:30',
          price: 55,
          min_price: 55,
          max_price: 95,
          total_available: 234,
          has_seats_available: true,
          imageUrl: '/chicago.jpeg',
          location: 'West Street, London WC2H 9ND',
          seat_pricing: [],
          isMock: true
        },
        {
          id: 'mock-lionking',
          title: 'The Lion King',
          venue_name: 'Lyceum Theatre',
          date: '2025-07-16',
          time: '19:30',
          price: 65,
          min_price: 65,
          max_price: 125,
          total_available: 187,
          has_seats_available: true,
          imageUrl: '/lionking.jpeg',
          location: 'Wellington Street, London WC2E 7RQ',
          seat_pricing: [],
          isMock: true
        },
        {
          id: 'mock-mamamia',
          title: 'Mamma Mia!',
          venue_name: 'Novello Theatre',
          date: '2025-07-17',
          time: '19:30',
          price: 45,
          min_price: 45,
          max_price: 85,
          total_available: 156,
          has_seats_available: true,
          imageUrl: '/mamamia.jpeg',
          location: 'Aldwych, London WC2B 4LD',
          seat_pricing: [],
          isMock: true
        },
        {
          id: 'mock-phantom',
          title: 'The Phantom of the Opera',
          venue_name: 'His Majesty\'s Theatre',
          date: '2025-07-17',
          time: '19:30',
          price: 70,
          min_price: 70,
          max_price: 110,
          total_available: 203,
          has_seats_available: true,
          imageUrl: '/phantom.jpg',
          location: 'Haymarket, London SW1Y 4QL',
          seat_pricing: [],
          isMock: true
        },
        {
          id: 'mock-wicked',
          title: 'Wicked',
          venue_name: 'Apollo Victoria Theatre',
          date: '2025-07-18',
          time: '19:30',
          price: 60,
          min_price: 60,
          max_price: 115,
          total_available: 278,
          has_seats_available: true,
          imageUrl: '/wicked.jpeg',
          location: 'Wilton Road, London SW1V 1LG',
          seat_pricing: [],
          isMock: true
        },
        {
          id: 'mock-harry',
          title: 'Harry Potter and the Cursed Child',
          venue_name: 'Palace Theatre',
          date: '2025-07-18',
          time: '19:00',
          price: 80,
          min_price: 80,
          max_price: 150,
          total_available: 145,
          has_seats_available: true,
          imageUrl: '/harry.jpeg',
          location: 'Shaftesbury Avenue, London W1D 5AY',
          seat_pricing: [],
          isMock: true
        }
      ];

      // Combine real shows with mock shows
      const allShows = [...formattedShows, ...mockShows];
      setShows(allShows);
    } catch (error) {
      console.error('Error loading shows:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatDateTime = (dateString: string, timeString?: string) => {
    let date: Date;
    if (timeString) {
      // If we have separate date and time strings
      const [hours, minutes] = timeString.split(':').map(Number);
      date = new Date(dateString);
      date.setHours(hours, minutes, 0, 0);
    } else {
      // Fallback to parsing combined string
      date = new Date(dateString);
    }
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const timeStringFormatted = date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    if (isToday) return `Today ${timeStringFormatted}`;
    if (isTomorrow) return `Tomorrow ${timeStringFormatted}`;
    
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    }) + ` ${timeStringFormatted}`;
  }

  const getTimeUntilShow = (dateString: string, timeString?: string) => {
    let showTime: Date;
    
    if (timeString) {
      const [hours, minutes] = timeString.split(':').map(Number);
      showTime = new Date(dateString);
      showTime.setHours(hours, minutes, 0, 0);
    } else {
      showTime = new Date(dateString);
    }
    
    const now = new Date();
    const diffHours = Math.round((showTime.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Starting soon!';
    if (diffHours < 6) return `In ${diffHours} hours`;
    if (diffHours < 24) return 'Tonight';
    return 'Tomorrow';
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
      
      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Account Section */}
        <div className="flex justify-end pt-6 mb-4">
          {status === 'loading' ? (
            <div className="animate-pulse">
              <div className="h-10 w-32 bg-white/20 rounded-lg"></div>
            </div>
          ) : session ? (
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl px-6 py-3 border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {session.user?.name ? session.user.name[0].toUpperCase() : session.user?.email?.[0].toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">
                      Welcome back, {session.user?.name || session.user?.email?.split('@')[0] || 'User'}!
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Link 
                  href="/account" 
                  className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2 border border-white/20 text-white hover:bg-white/20 transition-colors font-medium text-sm"
                >
                  My Tickets
                </Link>
                <button
                  onClick={() => signOut()}
                  className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2 border border-white/20 text-white hover:bg-white/20 transition-colors font-medium text-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-3">
              <Link 
                href="/auth/signin" 
                className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2 border border-white/20 text-white hover:bg-white/20 transition-colors font-medium text-sm"
              >
                Sign In
              </Link>
              <Link 
                href="/auth/signup" 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium px-4 py-2 rounded-xl transition-all duration-200 text-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Header */}
        <header className="text-center mb-8 -mt-48">
          {/* Logo */}
          <div className="flex justify-center mb-1">
            <div className="relative">
              <img 
                src="/LML-logo-trans.png" 
                alt="LastMinuteLive Logo"
                className="w-96 h-96 lg:w-[576px] lg:h-[576px] object-contain drop-shadow-2xl"
              />
            </div>
          </div>
          
          <p className="text-purple-200 text-lg lg:text-xl font-medium mb-3 -mt-44">
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
              // Calculate real availability and urgency from actual data
              const ticketsLeft = show.total_available || 0;
              const isAlmostSoldOut = ticketsLeft <= 10;
              const urgencyColor = isAlmostSoldOut ? 'from-red-500 to-orange-500' : 
                                 ticketsLeft <= 50 ? 'from-orange-500 to-yellow-500' : 
                                 'from-green-500 to-emerald-500';
              
              return (
                <article key={show.id} className="group bg-white/15 backdrop-blur-lg rounded-3xl overflow-hidden shadow-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl">
                  {/* Show image */}
                  <div className="relative h-48 lg:h-56 bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 overflow-hidden">
                    {show.imageUrl && !failedImages.has(show.id) ? (
                      <img 
                        src={show.imageUrl} 
                        alt={show.title || 'Show Image'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          console.log('Image failed to load for show:', show.title);
                          e.currentTarget.style.display = 'none';
                          // Show the fallback gradient
                          e.currentTarget.parentElement?.classList.add('image-fallback');
                          setFailedImages(prev => new Set([...prev, show.id]));
                        }}
                      />
                    ) : (
                      // Hamilton-themed fallback with show title
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 relative">
                        <div className="text-center text-white">
                          <div className="text-6xl mb-2">🎭</div>
                          <div className="text-xl font-bold px-4">{show.title}</div>
                          <div className="text-sm opacity-80">Musical Theatre</div>
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute top-4 left-4 w-8 h-8 border-2 border-white/30 rounded-full"></div>
                        <div className="absolute bottom-4 right-4 w-12 h-12 border-2 border-white/20 rounded-full"></div>
                        <div className="absolute top-1/2 left-8 w-4 h-4 bg-white/20 rounded-full"></div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20"></div>
                    <div className="absolute top-4 right-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${urgencyColor} shadow-lg`}>
                        {ticketsLeft} tickets left
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-5">
                      <h2 className="font-bold text-xl lg:text-2xl text-white mb-3 leading-tight group-hover:text-yellow-200 transition-colors">
                        {show.title}
                      </h2>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-purple-200">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-xs">🏛️</span>
                          </div>
                          <span className="text-sm">{show.venue_name || 'Victoria Palace Theatre'}</span>
                        </div>
                        
                        <div className="flex items-center text-purple-200">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-xs">📍</span>
                          </div>
                          <span className="text-sm">{show.location || 'London, UK'}</span>
                        </div>
                        
                        <div className="flex items-center text-purple-200">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-xs">⏰</span>
                          </div>
                          <span className="text-sm">{formatDateTime(show.date, show.time)}</span>
                        </div>
                      </div>
                    
                    </div>
                    
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <div className="text-2xl lg:text-3xl font-bold text-white flex items-baseline">
                          <span className="text-lg text-purple-200">£</span>
                          <span>{Math.round(show.min_price || 0)}</span>
                          {show.max_price > show.min_price && (
                            <>
                              <span className="mx-0.5">–</span>
                              <span className="text-lg text-purple-200">£</span>
                              <span>{Math.round(show.max_price || 0)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 ml-4">
                        {show.isMock ? (
                          <div className="px-6 py-3 bg-gray-500/50 text-gray-300 rounded-xl font-semibold text-sm cursor-not-allowed">
                            Coming Soon
                          </div>
                        ) : (
                          <BuyButton 
                            showId={show.id}
                            showName={show.title}
                            price={show.min_price || show.price}
                            maxPrice={show.max_price !== show.min_price ? show.max_price : undefined}
                            availableTickets={ticketsLeft}
                          />
                        )}
                      </div>
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