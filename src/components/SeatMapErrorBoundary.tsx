'use client'

import React from 'react'

interface SeatMapErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface SeatMapErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

/**
 * Enterprise-grade error boundary specifically designed for SeatMap component
 * Provides fallback UI and error recovery mechanisms
 */
export class SeatMapErrorBoundary extends React.Component<
  SeatMapErrorBoundaryProps,
  SeatMapErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: SeatMapErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<SeatMapErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 [SeatMapErrorBoundary] Caught error:', error)
    console.error('🚨 [SeatMapErrorBoundary] Error info:', errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      this.reportError(error, errorInfo)
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Placeholder for error reporting service integration
    console.error('🚨 [SeatMapErrorBoundary] Reporting error to tracking service:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })
  }

  private handleRetry = () => {
    console.log('🔄 [SeatMapErrorBoundary] Retrying after error...')
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })

    // Small delay to prevent immediate re-rendering issues
    this.retryTimeoutId = setTimeout(() => {
      console.log('🔄 [SeatMapErrorBoundary] Retry complete')
    }, 100)
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.handleRetry} />
      }

      return <DefaultSeatMapErrorFallback error={this.state.error} retry={this.handleRetry} />
    }

    return this.props.children
  }
}

/**
 * Default fallback component for seat map errors
 */
const DefaultSeatMapErrorFallback: React.FC<{ 
  error: Error | null
  retry: () => void 
}> = ({ error, retry }) => {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="w-full h-64 bg-red-50 border border-red-200 rounded-xl flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="text-red-600">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Seat Map Error
          </h3>
          <p className="text-red-600 mb-4">
            Sorry, there was a problem loading the seat map. This might be temporary.
          </p>
          
          {isDevelopment && error && (
            <details className="mb-4 text-left">
              <summary className="cursor-pointer text-sm text-red-700 hover:text-red-800">
                Technical Details (Development Only)
              </summary>
              <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-800 whitespace-pre-wrap">
                {error.message}
                {error.stack && (
                  <>
                    {'\n\nStack Trace:\n'}
                    {error.stack}
                  </>
                )}
              </div>
            </details>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={retry}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium"
          >
            Refresh Page
          </button>
        </div>

        <div className="text-sm text-red-600">
          If this problem persists, please contact support or try refreshing the page.
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to use with functional components for error boundary integration
 */
export const useSeatMapErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleError = React.useCallback((error: Error) => {
    console.error('🚨 [useSeatMapErrorHandler] Error caught:', error)
    setError(error)
  }, [])

  // Reset error when component unmounts
  React.useEffect(() => {
    return () => setError(null)
  }, [])

  return {
    error,
    hasError: error !== null,
    resetError,
    handleError
  }
} 