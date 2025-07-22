'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function WebViewPaymentCancelContent() {
  const searchParams = useSearchParams();
  const showId = searchParams.get('show_id');

  useEffect(() => {
    // Inject a global variable that the WebView can detect
    if (typeof window !== 'undefined') {
      (window as any).paymentResult = {
        status: 'cancelled',
        showId: showId,
        timestamp: Date.now()
      };

      // Also try to communicate via postMessage if available
      const webkit = (window as any).webkit;
      if (webkit?.messageHandlers?.paymentResult) {
        webkit.messageHandlers.paymentResult.postMessage({
          status: 'cancelled',
          showId: showId
        });
      }

      // Set page title that WebView can check
      document.title = 'PAYMENT_CANCELLED';
    }
  }, [showId]);

  return (
    <div className="min-h-screen bg-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Cancelled
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your payment was cancelled. No charges were made.
        </p>

        <div className="mt-6 text-sm text-gray-500">
          Please wait while we redirect you back to the app...
        </div>

        {/* Hidden elements for WebView detection */}
        <div id="payment-cancelled" data-show-id={showId} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

export default function WebViewPaymentCancel() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <WebViewPaymentCancelContent />
    </Suspense>
  );
} 