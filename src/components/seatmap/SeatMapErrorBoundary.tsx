'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
// SVG Icon Components
const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23,4 23,10 17,10"/>
    <path d="M20.49,15a9,9,0,1,1-2.12-9.36L23,10"/>
  </svg>
);

const Home = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3,9l9-7 9,7v11a2,2,0,0,1-2,2H5a2,2,0,0,1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

interface SeatMapErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  lastErrorTime: number;
  errorId: string;
}

interface SeatMapErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  maxRetries?: number;
  retryDelayMs?: number;
  showTechnicalDetails?: boolean;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const ERROR_COOLDOWN_MS = 5000;

export class SeatMapErrorBoundary extends Component<
  SeatMapErrorBoundaryProps,
  SeatMapErrorBoundaryState
> {
  private retryTimeoutId: number | null = null;

  constructor(props: SeatMapErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SeatMapErrorBoundaryState> {
    const errorId = `seatmap_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { errorId } = this.state;

    // Log error details for debugging
    console.error('🚨 [SeatMapErrorBoundary] Caught error:', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });

    // Update state with error information
    this.setState({
      errorInfo
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    // Report to error tracking service (if available)
    this.reportError(error, errorInfo, errorId);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // TODO [Phase 1]: Integrate with error tracking service (Sentry, LogRocket, etc.)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // Report to Google Analytics if available
      (window as any).gtag('event', 'exception', {
        description: `SeatMap Error: ${error.message}`,
        fatal: false,
        custom_map: {
          error_id: errorId,
          component_stack: errorInfo.componentStack.substring(0, 500)
        }
      });
    }
  };

  private handleRetry = () => {
    const { maxRetries = MAX_RETRIES, retryDelayMs = RETRY_DELAY_MS } = this.props;
    const { retryCount, lastErrorTime } = this.state;

    // Check if we've exceeded max retries
    if (retryCount >= maxRetries) {
      console.warn('🔄 [SeatMapErrorBoundary] Max retries exceeded, not retrying');
      return;
    }

    // Check if enough time has passed since last error (cooldown)
    const timeSinceError = Date.now() - lastErrorTime;
    if (timeSinceError < ERROR_COOLDOWN_MS) {
      console.warn('🔄 [SeatMapErrorBoundary] Error cooldown active, not retrying yet');
      return;
    }

    console.log(`🔄 [SeatMapErrorBoundary] Retrying... (attempt ${retryCount + 1}/${maxRetries})`);

    // Clear any existing retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Set up delayed retry
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
        lastErrorTime: 0,
        errorId: ''
      });
    }, retryDelayMs);
  };

  private handleResetError = () => {
    console.log('🔄 [SeatMapErrorBoundary] Manual error reset');
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
      errorId: ''
    });
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    const { children, fallback, showTechnicalDetails = false } = this.props;
    const { hasError, error, errorInfo, retryCount, errorId } = this.state;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.handleRetry);
      }

      // Default error UI
      return (
        <SeatMapErrorFallback
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          retryCount={retryCount}
          showTechnicalDetails={showTechnicalDetails}
          onRetry={this.handleRetry}
          onReset={this.handleResetError}
        />
      );
    }

    return children;
  }
}

interface SeatMapErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  showTechnicalDetails: boolean;
  onRetry: () => void;
  onReset: () => void;
}

const SeatMapErrorFallback: React.FC<SeatMapErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  showTechnicalDetails,
  onRetry,
  onReset
}) => {
  const isNetworkError = error.message.includes('NetworkError') || 
                         error.message.includes('fetch') ||
                         error.message.includes('timeout');
  
  const isCoordinateError = error.message.includes('coordinate') || 
                           error.message.includes('position') ||
                           error.message.includes('bounds');

  return (
    <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Seat Map Unavailable
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {isNetworkError && "We're having trouble loading the seat map. Please check your connection."}
            {isCoordinateError && "There's an issue with the seat layout data. Our team has been notified."}
            {!isNetworkError && !isCoordinateError && "Something went wrong while loading the seat map."}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={onRetry}
            disabled={retryCount >= MAX_RETRIES}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {retryCount >= MAX_RETRIES ? 'Max Retries Reached' : 'Try Again'}
          </button>

          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            Reset Component
          </button>
        </div>

        {showTechnicalDetails && (
          <details className="text-left bg-white dark:bg-gray-800 p-4 rounded-lg border text-sm">
            <summary className="cursor-pointer font-medium mb-2">
              Technical Details
            </summary>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <strong>Error ID:</strong> {errorId}
              </div>
              <div>
                <strong>Error:</strong> {error.message}
              </div>
              <div>
                <strong>Retry Count:</strong> {retryCount}/{MAX_RETRIES}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto max-h-32">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        <p className="text-xs text-gray-500 mt-4">
          If this problem persists, please contact support with Error ID: {errorId}
        </p>
      </div>
    </div>
  );
};

// Helper HOC for easier usage
export function withSeatMapErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<SeatMapErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <SeatMapErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </SeatMapErrorBoundary>
  );
  
  WrappedComponent.displayName = `withSeatMapErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default SeatMapErrorBoundary; 