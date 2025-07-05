'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface SessionData {
  id: string
  payment_status: string
  customer_details: {
    email: string
  } | null
  line_items: {
    data: Array<{
      description: string
      quantity: number
      amount_total: number
    }>
  } | null
  amount_total: number | null
  verification_code?: string | null
  show_details?: {
    name: string
    start_time: string
    venues: {
      name: string
    }
  } | null
}

function SuccessPageContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/checkout/success?session_id=${sessionId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
          }
          return res.json()
        })
        .then(data => {
          console.log('API Response:', data)
          setSessionData(data)
          setLoading(false)
        })
        .catch(error => {
          console.error('Error fetching session:', error)
          setError(error.message)
          setLoading(false)
        })
    } else {
      setError('No session ID provided')
      setLoading(false)
    }
  }, [sessionId])

  const copyVerificationCode = () => {
    if (sessionData?.verification_code) {
      navigator.clipboard.writeText(sessionData.verification_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTotalAmount = () => {
    if (sessionData?.amount_total) {
      return (sessionData.amount_total / 100).toFixed(2)
    }
    return '0.00'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your ticket details...</p>
        </div>
      </div>
    )
  }

  if (error || !sessionId || !sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-red-500 text-8xl mb-6">❌</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-8 text-lg">
            {error || 'We couldn\'t find your payment session. Please try again.'}
          </p>
          <Link 
            href="/"
            className="inline-block bg-red-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-red-700 transition-all duration-300 transform hover:scale-105"
          >
            Back to Shows
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-yellow-300 rounded-full blur-2xl"></div>
        <div className="absolute bottom-32 left-1/3 w-40 h-40 bg-blue-300 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-pink-300 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
            <div className="text-white text-8xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-green-100 text-xl">
              Your tickets are ready!
            </p>
          </div>

          <div className="p-8">
            {/* Debug Info */}
            <div className="bg-gray-100 p-4 rounded mb-4 text-xs">
              <strong>Debug Info:</strong>
              <pre>{JSON.stringify(sessionData, null, 2)}</pre>
            </div>

            {/* Verification Code */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-6 mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                🎫 Your Entry Code
              </h2>
              <p className="text-gray-700 mb-4">
                Show this code at the venue entrance:
              </p>
              <div className="bg-white border-2 border-dashed border-yellow-400 rounded-xl p-6 mb-4">
                <div className="text-6xl font-mono font-bold text-gray-900 tracking-wider">
                  {sessionData.verification_code || 'GENERATING...'}
                </div>
              </div>
              {sessionData.verification_code && (
                <button
                  onClick={copyVerificationCode}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  {copied ? '✓ Copied!' : '📋 Copy Code'}
                </button>
              )}
            </div>

            {/* Show Details */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                🎭 Show Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎪</span>
                  <div>
                    <p className="font-semibold text-lg text-gray-900">
                      {sessionData.show_details?.name || 'Show Name'}
                    </p>
                    <p className="text-gray-600">
                      {sessionData.show_details?.venues?.name || 'Venue TBD'}
                    </p>
                  </div>
                </div>
                {sessionData.show_details?.start_time && (
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">📅</span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {formatDate(sessionData.show_details.start_time)}
                      </p>
                      <p className="text-gray-600">
                        {formatTime(sessionData.show_details.start_time)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-blue-50 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                💳 Payment Confirmed
              </h3>
              <div className="space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-semibold">
                    {sessionData.customer_details?.email || 'Not provided'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-semibold">£{getTotalAmount()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-green-600 font-semibold capitalize">
                    {sessionData.payment_status || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Session ID:</span>
                  <span className="font-mono text-sm">{sessionData.id}</span>
                </div>
              </div>
            </div>

            {/* Important Instructions */}
            <div className="bg-purple-50 border-l-4 border-purple-500 rounded-r-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-purple-900 mb-3 flex items-center">
                ⚠️ Important Instructions
              </h3>
              <ul className="text-purple-800 space-y-2">
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  <span>Arrive 15-30 minutes before show time</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  <span>Have your 6-digit code ready at the entrance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  <span>Check your email for additional details</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  <span>Contact the venue if you have any issues</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Link 
                href="/"
                className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-center hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
              >
                🎭 Book More Shows
              </Link>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">
                  Need help? Contact us:
                </p>
                <a 
                  href="mailto:support@lastminutelive.com"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  support@lastminutelive.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  )
}