'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function WebViewPaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Inject a global variable that the WebView can detect
    if (typeof window !== 'undefined') {
      (window as any).paymentResult = {
        status: 'success',
        sessionId: sessionId,
        timestamp: Date.now()
      };

      // Also try to communicate via postMessage if available
      const webkit = (window as any).webkit;
      if (webkit?.messageHandlers?.paymentResult) {
        webkit.messageHandlers.paymentResult.postMessage({
          status: 'success',
          sessionId: sessionId
        });
      }

      // Set page title that WebView can check
      document.title = 'PAYMENT_SUCCESS';
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful! 🎉
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your tickets have been booked successfully.
        </p>
        
        {sessionId && (
          <p className="text-sm text-gray-500 font-mono bg-gray-100 p-2 rounded">
            Session: {sessionId.slice(-8)}
          </p>
        )}

        <div className="mt-6 text-sm text-gray-500">
          Please wait while we redirect you back to the app...
        </div>

        {/* Hidden elements for WebView detection */}
        <div id="payment-success" data-session-id={sessionId} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

export default function WebViewPaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <WebViewPaymentSuccessContent />
    </Suspense>
  );
} 