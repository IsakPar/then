'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Confetti from 'react-confetti'

interface SeatInfo {
  id: string
  section_name: string
  row: string
  number: number
  price_paid: number
  section_color: string
}

interface BookingInfo {
  id: string
  validation_code: string
  customer_name: string
  customer_email: string
  total_amount: number
  status: string
  created_at: string
}

interface ShowDetails {
  name: string
  description?: string
  image_url?: string
  start_time: string | null
  date?: string
  time?: string
  venue: {
    name: string
    address?: string
  }
  booking: BookingInfo | null
  seats: SeatInfo[]
}

interface SessionData {
  id: string
  payment_status: string
  customer_details: {
    email: string
    name?: string
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
  show_details?: ShowDetails | null
}

function SuccessPageContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [showConfetti, setShowConfetti] = useState(true)
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 })
  const ticketRef = useRef<HTMLDivElement>(null)

  // Get window dimensions for confetti
  useEffect(() => {
    const updateWindowDimensions = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    
    updateWindowDimensions()
    window.addEventListener('resize', updateWindowDimensions)
    
    return () => window.removeEventListener('resize', updateWindowDimensions)
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      return
    }

    let retryCount = 0
    const maxRetries = 10
    let retryInterval: NodeJS.Timeout

    const fetchSessionData = async () => {
      try {
        console.log(`🎫 Fetching session data (attempt ${retryCount + 1}/${maxRetries})`)
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/checkout/success?session_id=${sessionId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch session data')
        }
        const data = await response.json()
        
        console.log('🎫 Session data received:', {
          payment_status: data.payment_status,
          verification_code: data.verification_code,
          has_show_details: !!data.show_details
        })

        // If still processing and we haven't exceeded retries, try again
        if (data.verification_code === 'PROCESSING' && retryCount < maxRetries) {
          retryCount++
          console.log(`⏳ Still processing, retrying in 3 seconds (${retryCount}/${maxRetries})`)
          retryInterval = setTimeout(fetchSessionData, 3000)
          return
        }

        setSessionData(data)

        // Generate QR code for validation code
        if (data.verification_code && data.verification_code !== 'PROCESSING' && data.verification_code !== 'ERROR') {
          const qrUrl = await QRCode.toDataURL(data.verification_code, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          })
          setQrCodeUrl(qrUrl)
        }
        
        setLoading(false)
      } catch (err) {
        console.error('❌ Error fetching session data:', err)
        if (retryCount < maxRetries) {
          retryCount++
          retryInterval = setTimeout(fetchSessionData, 3000)
        } else {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setLoading(false)
        }
      }
    }

    fetchSessionData()

    // Stop confetti after 5 seconds
    const confettiTimer = setTimeout(() => setShowConfetti(false), 5000)
    
    return () => {
      clearTimeout(confettiTimer)
      if (retryInterval) clearTimeout(retryInterval)
    }
  }, [sessionId])

  const downloadPDF = async () => {
    if (!ticketRef.current || !sessionData?.show_details?.booking) return

    try {
      // Capture the ticket element as canvas
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 190
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, imgWidth, imgHeight)

      // Add QR code separately for better quality
      if (qrCodeUrl) {
        pdf.addImage(qrCodeUrl, 'PNG', 160, 20, 30, 30)
      }

      pdf.save(`ticket-${sessionData.show_details.booking.validation_code}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
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

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5) // Convert HH:MM:SS to HH:MM
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Processing your booking...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionData || sessionData.payment_status !== 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Incomplete</h1>
            <p className="text-gray-600 mb-6">Your payment was not completed successfully.</p>
            <Link href="/" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors">
              Try Again
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isProcessing = sessionData.verification_code === 'PROCESSING'
  const hasError = sessionData.verification_code === 'ERROR'
  const showDetails = sessionData.show_details

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-pulse w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Booking</h1>
            <p className="text-gray-600 mb-6">We're finalizing your ticket details. This usually takes just a few seconds.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={200}
        />
      )}
      
      <div className="container mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-xl text-gray-600">Your tickets are ready</p>
        </div>

        {/* Main Ticket Card */}
        <div className="max-w-4xl mx-auto">
          <div ref={ticketRef} className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Show Header with Image */}
            <div className="relative h-64 bg-gradient-to-r from-purple-600 to-pink-600">
              {showDetails?.image_url ? (
                <Image
                  src={showDetails.image_url}
                  alt={showDetails.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <h2 className="text-4xl font-bold text-white text-center px-4">
                    {showDetails?.name || 'Your Show'}
                  </h2>
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-30"></div>
              <div className="absolute bottom-4 left-6 text-white">
                <h2 className="text-3xl font-bold mb-1">{showDetails?.name}</h2>
                <p className="text-lg opacity-90">{showDetails?.venue.name}</p>
              </div>
            </div>

            <div className="p-8">
              <div className="grid md:grid-cols-3 gap-8">
                {/* Booking Details */}
                <div className="md:col-span-2 space-y-6">
                  {/* Date & Time */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Show Details</h3>
                    <div className="space-y-1 text-gray-600">
                      {showDetails?.date && (
                        <p className="flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(showDetails.date)}
                        </p>
                      )}
                      {showDetails?.time && (
                        <p className="flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatTime(showDetails.time)}
                        </p>
                      )}
                      {showDetails?.venue.address && (
                        <p className="flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {showDetails.venue.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Seat Information */}
                  {showDetails?.seats && showDetails.seats.length > 0 && (
                    <div className="border-l-4 border-green-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Seats</h3>
                      <div className="grid gap-3">
                        {showDetails.seats.map((seat, index) => (
                          <div key={seat.id} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {seat.section_name} - Row {seat.row}, Seat {seat.number}
                                </p>
                                <div className="flex items-center mt-1">
                                  <div 
                                    className="w-4 h-4 rounded-full mr-2"
                                    style={{ backgroundColor: seat.section_color }}
                                  ></div>
                                  <span className="text-sm text-gray-600">{seat.section_name}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-lg">£{seat.price_paid.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer Info */}
                  {showDetails?.booking && (
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Information</h3>
                      <div className="space-y-1 text-gray-600">
                        <p><span className="font-medium">Name:</span> {showDetails.booking.customer_name}</p>
                        <p><span className="font-medium">Email:</span> {showDetails.booking.customer_email}</p>
                        <p><span className="font-medium">Total Paid:</span> £{showDetails.booking.total_amount.toFixed(2)}</p>
                        <p><span className="font-medium">Booking ID:</span> {showDetails.booking.validation_code}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* QR Code & Actions */}
                <div className="space-y-6">
                  {qrCodeUrl && (
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Ticket</h3>
                      <div className="bg-gray-50 rounded-lg p-4 inline-block">
                        <Image
                          src={qrCodeUrl}
                          alt="Ticket QR Code"
                          width={200}
                          height={200}
                          className="mx-auto"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Show this QR code at the venue
                      </p>
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        {sessionData.verification_code}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={downloadPDF}
                      className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF Ticket
                    </button>
                    
                    <button
                      onClick={() => {
                        if (navigator.share && showDetails?.booking) {
                          navigator.share({
                            title: `Ticket for ${showDetails.name}`,
                            text: `I'm going to see ${showDetails.name} at ${showDetails.venue.name}! Booking: ${showDetails.booking.validation_code}`,
                          })
                        }
                      }}
                      className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      Share Booking
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="text-center mt-8 space-y-4">
            <p className="text-gray-600">
              Need help? Contact us at <a href="mailto:support@lastminutelive.com" className="text-purple-600 hover:text-purple-700 underline">support@lastminutelive.com</a>
            </p>
            <Link 
              href="/" 
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-purple-600 bg-purple-100 hover:bg-purple-200 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  )
} 