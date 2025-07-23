'use client'

import { useState } from 'react'
import { useEffect } from 'react'

interface GuestEmailModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (email: string) => Promise<void>
  isLoading?: boolean
}

export default function GuestEmailModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading = false 
}: GuestEmailModalProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    try {
      await onSubmit(email.trim().toLowerCase())
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 text-white rounded-xl p-6 shadow-2xl">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold mb-2">
            🎫 Almost there!
          </h3>
          <p className="text-gray-300">
            Enter your email to proceed with checkout
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-start space-x-3">
              <div className="text-blue-400 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm text-gray-300">
                <p className="font-medium text-white mb-1">Guest Checkout</p>
                <p>You can checkout without creating an account. After payment, you'll have the option to save your tickets by creating an account.</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Continue to Payment'
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-gray-400 border-t border-slate-700 pt-4">
          Already have an account?{' '}
          <button
            onClick={() => window.location.href = '/auth/signin'}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Sign in here
          </button>
        </div>
      </div>
    </div>
  )
} 