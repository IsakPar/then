import MobileSeatmap from '@/components/MobileSeatmap';

export default function MobileSeatmapPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm sticky top-0 z-30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Hamilton</h1>
              <p className="text-sm text-gray-600">Select your seats</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Victoria Palace Theatre</div>
              <div className="text-sm text-gray-600">Tonight 7:30 PM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎭 Hamilton - Mobile Optimized Seatmap
            </h1>
            <p className="text-gray-600 mb-2">
              Victoria Palace Theatre • Tonight 7:30 PM
            </p>
            <div className="flex justify-center space-x-4 text-sm text-gray-500">
              <span>📱 Mobile-first design</span>
              <span>✨ Touch-optimized interactions</span>
              <span>🎯 Accessibility compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4 md:px-8 md:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Status Bar */}
          <div className="md:hidden mb-4 flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">1,200 seats available</span>
            </div>
            <div className="text-sm text-gray-600">
              From £15.00
            </div>
          </div>

          {/* Desktop Info Panel */}
          <div className="hidden md:block mb-6 bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">1,200</div>
                <div className="text-sm text-gray-600">Available Seats</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">£15 - £85</div>
                <div className="text-sm text-gray-600">Price Range</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">7</div>
                <div className="text-sm text-gray-600">Sections</div>
              </div>
            </div>
          </div>

          {/* Seatmap Container */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <MobileSeatmap />
            </div>
          </div>

          {/* Mobile-specific Instructions */}
          <div className="md:hidden mt-4 bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Pinch to zoom in/out</li>
              <li>• Drag to pan around the theater</li>
              <li>• Tap seats to select/deselect</li>
              <li>• Selected seats appear in the bottom drawer</li>
            </ul>
          </div>

          {/* Desktop Instructions */}
          <div className="hidden md:block mt-6 bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3">Features Demonstrated:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Mobile Optimizations:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Touch-friendly 44px+ targets</li>
                  <li>• Pinch-to-zoom gestures</li>
                  <li>• Bottom drawer for selections</li>
                  <li>• Floating CTA button</li>
                  <li>• Responsive breakpoints</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Accessibility:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• ARIA labels for screen readers</li>
                  <li>• Keyboard navigation support</li>
                  <li>• High contrast ratios</li>
                  <li>• Focus indicators</li>
                  <li>• Semantic HTML structure</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Performance Metrics (Demo) */}
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">60fps</div>
                <div className="text-xs text-gray-600">Render Speed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">&lt;100ms</div>
                <div className="text-xs text-gray-600">Touch Response</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">1,200</div>
                <div className="text-xs text-gray-600">Seats Rendered</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">AA</div>
                <div className="text-xs text-gray-600">WCAG Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 