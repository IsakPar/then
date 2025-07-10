'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface SessionData {
  id: string
  payment_status: string
  customer_details: {
    email: string
  }
  line_items: {
    data: Array<{
      description: string
      quantity: number
      amount_total: number
    }>
  }
}

function SuccessPageContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionId) {
      // Fetch session details from your API
      fetch(`/api/checkout/success?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          setSessionData(data)
          setLoading(false)
        })
        .catch(error => {
          console.error('Error fetching session:', error)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your ticket details...</p>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Session</h1>
          <p className="text-gray-600 mb-6">
            We couldn't find your payment session. Please try again.
          </p>
          <Link 
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Shows
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="text-green-500 text-6xl mb-4">🎉</div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 font-medium mb-2">
            Your tickets have been confirmed
          </p>
          <p className="text-green-700 text-sm">
            Check your email for ticket details and show information.
          </p>
        </div>

        {sessionData && (
          <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Order Details:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Email:</strong> {sessionData.customer_details?.email}</p>
              <p><strong>Session:</strong> {sessionData.id}</p>
              <p><strong>Status:</strong> <span className="text-green-600 capitalize">{sessionData.payment_status}</span></p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link 
            href="/"
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Browse More Shows
          </Link>
          
          <p className="text-xs text-gray-500">
            Questions? Contact us at support@lastminutelive.com
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  )
} 