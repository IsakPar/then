'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AuthState {
  authenticated: boolean
  loading: boolean
  venueSlug?: string
  venueId?: string
  role?: string
  permissions?: string[]
  userId?: string
}

interface VenueAuthWrapperProps {
  children: React.ReactNode
  requiredPermission?: string
}

export default function VenueAuthWrapper({ children, requiredPermission = 'view' }: VenueAuthWrapperProps) {
  const [auth, setAuth] = useState<AuthState>({ authenticated: false, loading: true })
  const [loginForm, setLoginForm] = useState({ email: '', password: '', venueSlug: '' })
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/venue-auth-new', {
        method: 'GET'
      })
      const data = await response.json()
      
      if (data.success && data.authenticated) {
        setAuth({
          authenticated: true,
          loading: false,
          venueSlug: data.venueSlug,
          venueId: data.venueId,
          role: data.role,
          permissions: data.permissions,
          userId: data.userId
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
    setIsLoggingIn(true)

    try {
      const response = await fetch('/api/venue-auth-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: loginForm.email,
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
          venueId: data.venueId,
          role: data.role,
          permissions: data.permissions,
          userId: data.userId
        })
        setLoginForm({ email: '', password: '', venueSlug: '' })
      } else {
        setLoginError(data.error || 'Authentication failed')
      }
    } catch (error) {
      setLoginError('Network error. Please try again.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/venue-auth-new', {
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
    if (!requiredPermission) return true
    if (auth.role === 'admin') return true // Admins have all permissions
    return auth.permissions?.includes(requiredPermission) || false
  }

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!auth.authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Venue Management Access</h1>
            <p className="text-gray-300">Enter your credentials to access the venue management system</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email address"
                required
                disabled={isLoggingIn}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
                disabled={isLoggingIn}
              />
            </div>

            <div>
              <label htmlFor="venueSlug" className="block text-sm font-medium text-gray-200 mb-2">
                Venue (Optional)
              </label>
              <input
                type="text"
                id="venueSlug"
                value={loginForm.venueSlug}
                onChange={(e) => setLoginForm({ ...loginForm, venueSlug: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter venue slug (leave blank for any venue)"
                disabled={isLoggingIn}
              />
            </div>

            {loginError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-100 text-sm">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {isLoggingIn ? 'Authenticating...' : 'Access Venue Management'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              🔐 Secure database-driven authentication
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!hasRequiredPermission()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-400 text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-300 mb-6">
            You don't have the required permission ({requiredPermission}) to access this area.
          </p>
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-300">
              <strong>Your Access:</strong><br/>
              Venue: {auth.venueSlug}<br/>
              Role: {auth.role}<br/>
              Permissions: {auth.permissions?.join(', ') || 'None'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            Logout & Try Different Account
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Authentication Status Bar */}
      <div className="bg-green-600 text-white px-4 py-2 text-sm">
        <div className="flex justify-between items-center">
          <span>
            ✅ Authenticated as {auth.role} for {auth.venueSlug} 
          </span>
          <button
            onClick={handleLogout}
            className="text-green-100 hover:text-white underline"
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Protected Content */}
      {children}
    </div>
  )
} 