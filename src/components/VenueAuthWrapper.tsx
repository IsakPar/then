'use client'

import { useState, useEffect } from 'react'
import { getVenueCredentials } from '@/lib/venue-auth'

interface AuthState {
  authenticated: boolean
  loading: boolean
  venueSlug?: string
  permissions?: string[]
  isMasterAdmin?: boolean
}

interface VenueAuthWrapperProps {
  children: React.ReactNode
  requiredPermission?: string
}

export default function VenueAuthWrapper({ children, requiredPermission = 'view' }: VenueAuthWrapperProps) {
  const [auth, setAuth] = useState<AuthState>({ authenticated: false, loading: true })
  const [loginForm, setLoginForm] = useState({ password: '', venueSlug: '' })
  const [loginError, setLoginError] = useState<string | null>(null)
  const [showCredentials, setShowCredentials] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/venue-auth')
      const data = await response.json()
      
      if (data.success && data.authenticated) {
        setAuth({
          authenticated: true,
          loading: false,
          venueSlug: data.venueSlug,
          permissions: data.permissions,
          isMasterAdmin: data.isMasterAdmin
        })
      } else {
        setAuth({ authenticated: false, loading: false })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuth({ authenticated: false, loading: false })
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)

    try {
      const response = await fetch('/api/venue-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          password: loginForm.password,
          venueSlug: loginForm.venueSlug || undefined
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setAuth({
          authenticated: true,
          loading: false,
          venueSlug: data.venueSlug,
          permissions: data.permissions,
          isMasterAdmin: data.isMasterAdmin
        })
      } else {
        setLoginError(data.error || 'Authentication failed')
      }
    } catch (error) {
      setLoginError('Network error. Please try again.')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/venue-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      })
      
      setAuth({ authenticated: false, loading: false })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const hasRequiredPermission = () => {
    if (!auth.authenticated) return false
    if (auth.isMasterAdmin) return true
    return auth.permissions?.includes(requiredPermission) || false
  }

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!auth.authenticated) {
    const venueCredentials = getVenueCredentials()
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Venue Management Access</h1>
            <p className="text-gray-600">Enter your password to access venue management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="venueSlug" className="block text-sm font-medium text-gray-700 mb-2">
                Venue (Optional)
              </label>
              <select
                id="venueSlug"
                value={loginForm.venueSlug}
                onChange={(e) => setLoginForm({ ...loginForm, venueSlug: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Venues (Master Access)</option>
                {venueCredentials.map((venue) => (
                  <option key={venue.slug} value={venue.slug}>
                    {venue.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter venue password"
                required
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
            >
              Access Venue Management
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {showCredentials ? 'Hide' : 'Show'} Test Credentials
            </button>
            
            {showCredentials && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Test Credentials:</h3>
                <div className="space-y-2 text-xs text-gray-600">
                  <div>
                    <strong>Master Admin:</strong> admin2024master!
                  </div>
                  {venueCredentials.map((venue) => (
                    <div key={venue.slug}>
                      <strong>{venue.slug}:</strong> {venue.password}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!hasRequiredPermission()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have the required permission: {requiredPermission}
          </p>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Auth Status Bar */}
      <div className="bg-purple-600 text-white px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="text-sm">
            {auth.isMasterAdmin ? '🔑 Master Admin' : `🏛️ ${auth.venueSlug}`}
          </span>
          <span className="text-xs bg-purple-500 px-2 py-1 rounded">
            {auth.permissions?.join(', ')}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm bg-purple-700 hover:bg-purple-800 px-3 py-1 rounded transition-colors"
        >
          Logout
        </button>
      </div>
      
      {/* Protected Content */}
      {children}
    </div>
  )
} 