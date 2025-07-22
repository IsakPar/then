'use client';

import { useState, useEffect } from 'react';

interface VenueIntegrationData {
  venues?: any[];
  selectedVenue?: any;
  venueInfo?: any;
  seatMapData?: any;
  status?: any;
  loading?: boolean;
  error?: string;
}

export default function VenueIntegrationDemo() {
  const [data, setData] = useState<VenueIntegrationData>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'venues' | 'seat-map' | 'api-test'>('overview');

  // Load available venues on mount
  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: undefined }));
      
      const response = await fetch('/api/venues/integration?action=list');
      const result = await response.json();
      
      if (result.success) {
        setData(prev => ({ 
          ...prev, 
          venues: result.data.venues,
          loading: false 
        }));
      } else {
        throw new Error(result.message || 'Failed to load venues');
      }
    } catch (error) {
      setData(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      }));
    }
  };

  const testVenueConnection = async (venueSlug: string) => {
    try {
      setData(prev => ({ ...prev, loading: true, error: undefined }));
      
      const response = await fetch('/api/venues/integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          venue_slug: venueSlug
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setData(prev => ({ 
          ...prev, 
          selectedVenue: result.data,
          loading: false 
        }));
        setActiveTab('venues');
      } else {
        throw new Error(result.message || 'Connection test failed');
      }
    } catch (error) {
      setData(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      }));
    }
  };

  const loadVenueData = async (venueSlug: string, showId?: string) => {
    try {
      setData(prev => ({ ...prev, loading: true, error: undefined }));
      
      const url = showId 
        ? `/api/venues/simulator/${venueSlug}?show_id=${showId}`
        : `/api/venues/simulator/${venueSlug}`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        if (showId) {
          setData(prev => ({ 
            ...prev, 
            seatMapData: result.data,
            loading: false 
          }));
          setActiveTab('seat-map');
        } else {
          setData(prev => ({ 
            ...prev, 
            venueInfo: result.data,
            loading: false 
          }));
        }
      } else {
        throw new Error(result.message || 'Failed to load venue data');
      }
    } catch (error) {
      setData(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎭 Venue Integration System Demo
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Interactive demonstration of the JSON-based third-party venue API simulation system.
              Test connections, explore seat maps, and see how venue integration works.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: '📋 Overview', desc: 'System overview' },
            { id: 'venues', label: '🏛️ Venues', desc: 'Available venues' },
            { id: 'seat-map', label: '🗺️ Seat Maps', desc: 'Interactive seat maps' },
            { id: 'api-test', label: '🧪 API Test', desc: 'Test API endpoints' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div>{tab.label}</div>
              <div className="text-xs opacity-75">{tab.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {data.loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        )}

        {data.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-red-400">⚠️</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{data.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">🎯 System Overview</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">What This Demonstrates:</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• JSON-based venue configuration</li>
                    <li>• Third-party API simulation</li>
                    <li>• Real-time seat availability</li>
                    <li>• Hybrid booking system</li>
                    <li>• Error handling & resilience</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Available Test Venues:</h3>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Victoria Palace Theatre</strong>
                      <div className="text-gray-600">Hamilton • 1,550 capacity • Premium venue</div>
                    </div>
                    <div className="text-sm">
                      <strong>Lyric Theatre</strong>
                      <div className="text-gray-600">Chicago • 915 capacity • Intimate venue</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: '🏛️ Test Venues',
                  desc: 'Explore available venue integrations',
                  action: () => setActiveTab('venues')
                },
                {
                  title: '🗺️ View Seat Maps', 
                  desc: 'Interactive seat map visualization',
                  action: () => setActiveTab('seat-map')
                },
                {
                  title: '🧪 API Testing',
                  desc: 'Test API endpoints directly',
                  action: () => setActiveTab('api-test')
                }
              ].map((card, index) => (
                <button
                  key={index}
                  onClick={card.action}
                  className="bg-white rounded-lg shadow-sm p-4 text-left hover:shadow-md transition-shadow"
                >
                  <h3 className="font-medium mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Venues Tab */}
        {activeTab === 'venues' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">🏛️ Available Venues</h2>
                <button
                  onClick={loadVenues}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Refresh List
                </button>
              </div>
              
              {data.venues && data.venues.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {data.venues.map((venue, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium">{venue.slug}</h3>
                          <div className="text-sm text-gray-600">
                            Status: <span className={`font-medium ${venue.healthy ? 'text-green-600' : 'text-red-600'}`}>
                              {venue.healthy ? '✅ Healthy' : '❌ Error'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => testVenueConnection(venue.slug)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                        >
                          Test Connection
                        </button>
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Last sync: {venue.last_sync}</div>
                        <div>Data source: {venue.data_source}</div>
                        <div>Error rate: {Math.round(venue.health_check?.error_rate * 100) || 0}%</div>
                      </div>
                      
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => loadVenueData(venue.slug)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                        >
                          View Info
                        </button>
                        <button
                          onClick={() => loadVenueData(venue.slug, 'hamilton-victoria-palace-2024-12-20')}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                        >
                          Load Seat Map
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No venues found. Click "Refresh List" to reload.
                </div>
              )}
            </div>

            {/* Connection Test Results */}
            {data.selectedVenue && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium mb-4">🧪 Connection Test Results</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(data.selectedVenue, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Seat Map Tab */}
        {activeTab === 'seat-map' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">🗺️ Seat Map Visualization</h2>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => loadVenueData('victoria-palace', 'hamilton-victoria-palace-2024-12-20')}
                  className="p-4 border rounded-lg hover:bg-gray-50 text-left"
                >
                  <h3 className="font-medium">Victoria Palace - Hamilton</h3>
                  <p className="text-sm text-gray-600">6 sections • 1,550 capacity</p>
                </button>
                <button
                  onClick={() => loadVenueData('lyric-theater', 'chicago-lyric-2024-12-20')}
                  className="p-4 border rounded-lg hover:bg-gray-50 text-left"
                >
                  <h3 className="font-medium">Lyric Theatre - Chicago</h3>
                  <p className="text-sm text-gray-600">3 sections • 915 capacity</p>
                </button>
              </div>

              {data.seatMapData && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Show Information</h3>
                      <div className="text-sm space-y-1">
                        <div><strong>Title:</strong> {data.seatMapData.show?.title}</div>
                        <div><strong>Date:</strong> {data.seatMapData.show?.date}</div>
                        <div><strong>Time:</strong> {data.seatMapData.show?.time}</div>
                        <div><strong>Venue:</strong> {data.seatMapData.venue?.name}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Availability</h3>
                      <div className="text-sm space-y-1">
                        <div><strong>Total Seats:</strong> {data.seatMapData.availability?.total_seats}</div>
                        <div><strong>Available:</strong> {data.seatMapData.availability?.available_seats}</div>
                        <div><strong>Sold:</strong> {data.seatMapData.availability?.sold_seats}</div>
                        <div><strong>Reserved:</strong> {data.seatMapData.availability?.reserved_seats}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Sections</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {data.seatMapData.seatMap?.sections?.map((section: any, index: number) => (
                        <div key={index} className="border rounded p-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: section.color_hex }}
                            ></div>
                            <span className="font-medium">{section.display_name}</span>
                          </div>
                          <div className="text-gray-600 mt-1">
                            {section.capacity} seats • {section.pricing_tier}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* API Test Tab */}
        {activeTab === 'api-test' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">🧪 API Endpoint Testing</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'List Venues',
                    endpoint: 'GET /api/venues/integration?action=list',
                    action: () => fetch('/api/venues/integration?action=list')
                  },
                  {
                    title: 'System Health',
                    endpoint: 'GET /api/venues/integration?action=health',
                    action: () => fetch('/api/venues/integration?action=health')
                  },
                  {
                    title: 'Victoria Palace Info',
                    endpoint: 'GET /api/venues/simulator/victoria-palace',
                    action: () => fetch('/api/venues/simulator/victoria-palace')
                  },
                  {
                    title: 'Hamilton Seat Map',
                    endpoint: 'GET /api/venues/simulator/victoria-palace?show_id=hamilton-victoria-palace-2024-12-20',
                    action: () => fetch('/api/venues/simulator/victoria-palace?show_id=hamilton-victoria-palace-2024-12-20')
                  }
                ].map((test, index) => (
                  <button
                    key={index}
                    onClick={async () => {
                      try {
                        setData(prev => ({ ...prev, loading: true }));
                        const response = await test.action();
                        const result = await response.json();
                        setData(prev => ({ 
                          ...prev, 
                          status: { endpoint: test.endpoint, result },
                          loading: false 
                        }));
                      } catch (error) {
                        setData(prev => ({ 
                          ...prev, 
                          error: error instanceof Error ? error.message : 'Unknown error',
                          loading: false 
                        }));
                      }
                    }}
                    className="p-4 border rounded-lg hover:bg-gray-50 text-left"
                  >
                    <h3 className="font-medium">{test.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{test.endpoint}</p>
                  </button>
                ))}
              </div>

              {data.status && (
                <div className="mt-6">
                  <h3 className="font-medium mb-2">API Response</h3>
                  <div className="text-sm text-gray-600 mb-2">{data.status.endpoint}</div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(data.status.result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 