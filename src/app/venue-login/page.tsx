'use client'

import { useState } from 'react'
// import { getVenueCredentials } from '@/lib/venue-auth-client'  // DEPRECATED - REMOVED

export default function VenueLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [venueSlug, setVenueSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/venue-auth-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, venueSlug }),
      })

      const data = await response.json()

      if (data.success) {
        // Redirect to venue dashboard
        window.location.href = `/venue/${data.venueSlug}`
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      setError('An error occurred during login')
    }

    setLoading(false)
  }

  // REMOVED: Legacy hardcoded credentials
  // const venueCredentials = getVenueCredentials()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🏛️ Venue Staff Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Secure access for venue management
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="venueSlug" className="sr-only">
                Venue Slug
              </label>
              <input
                id="venueSlug"
                name="venueSlug"
                type="text"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Venue slug (e.g., phantom-opera-house)"
                value={venueSlug}
                onChange={(e) => setVenueSlug(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">🔐 Secure Authentication</h3>
              <div className="text-xs text-blue-700 space-y-1">
                <div>✅ Database-driven authentication</div>
                <div>✅ Role-based permissions</div>
                <div>✅ Venue-specific access control</div>
                <div>✅ No hardcoded credentials</div>
                <div className="mt-2 text-xs text-blue-600">
                  Contact your venue administrator for account setup.
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 