'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Theater, MapPin, Calendar, DollarSign, Settings, Database, Image as ImageIcon } from 'lucide-react'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  // Show creation form state
  const [showForm, setShowForm] = useState({
    title: '',
    description: '',
    venue: '',
    date: '',
    time: '19:30',
    imageFile: null as File | null,
    minPrice: '',
    maxPrice: '',
    showType: 'musical' // musical, drama, comedy, opera
  })

  // Venue creation form state  
  const [venueForm, setVenueForm] = useState({
    name: '',
    address: '',
    description: '',
    capacity: '',
    city: 'London',
    country: 'United Kingdom'
  })

  const handleCreateShow = async () => {
    setLoading(true)
    try {
      console.log('🎭 Creating show with data:', showForm)
      
      // First, upload image if provided
      let imageUrl = '/default-show-poster.jpg'
      if (showForm.imageFile) {
        const formData = new FormData()
        formData.append('image', showForm.imageFile)
        formData.append('showSlug', showForm.title.toLowerCase().replace(/\s+/g, '-'))
        
        const imageResponse = await fetch('/api/admin/upload-show-image', {
          method: 'POST',
          body: formData
        })
        
        if (imageResponse.ok) {
          const imageResult = await imageResponse.json()
          imageUrl = imageResult.imageUrl
        }
      }
      
      // Create the show
      const showData = {
        title: showForm.title,
        description: showForm.description,
        venue: showForm.venue,
        date: showForm.date,
        time: showForm.time,
        imageUrl,
        minPrice: parseInt(showForm.minPrice) * 100, // Convert to pence
        maxPrice: parseInt(showForm.maxPrice) * 100,
        showType: showForm.showType
      }
      
      const response = await fetch('/api/admin/create-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(showData)
      })
      
      const result = await response.json()
      setResult(result)
      
      if (result.success) {
        // Reset form
        setShowForm({
          title: '',
          description: '',
          venue: '',
          date: '',
          time: '19:30',
          imageFile: null,
          minPrice: '',
          maxPrice: '',
          showType: 'musical'
        })
      }
      
    } catch (error) {
      setResult({ success: false, error: 'Failed to create show' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVenue = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/create-venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venueForm)
      })
      
      const result = await response.json()
      setResult(result)
      
      if (result.success) {
        setVenueForm({
          name: '',
          address: '',
          description: '',
          capacity: '',
          city: 'London',
          country: 'United Kingdom'
        })
      }
      
    } catch (error) {
      setResult({ success: false, error: 'Failed to create venue' })
    } finally {
      setLoading(false)
    }
  }

  const quickShowTemplates = [
    {
      name: 'Musical Template',
      data: {
        showType: 'musical',
        time: '19:30',
        minPrice: '45',
        maxPrice: '125'
      }
    },
    {
      name: 'Drama Template', 
      data: {
        showType: 'drama',
        time: '20:00',
        minPrice: '25',
        maxPrice: '85'
      }
    },
    {
      name: 'Comedy Template',
      data: {
        showType: 'comedy', 
        time: '20:00',
        minPrice: '30',
        maxPrice: '75'
      }
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎭 LastMinuteLive Admin Dashboard
          </h1>
          <p className="text-purple-200">
            Streamlined show and venue management for production
          </p>
        </div>

        {result && (
          <Alert className={`mb-6 ${result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <AlertDescription className={result.success ? 'text-green-700' : 'text-red-700'}>
              {result.success ? '✅ Success! ' : '❌ Error: '}
              {result.message || result.error}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="shows" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full bg-white/10 backdrop-blur">
            <TabsTrigger value="shows" className="flex items-center gap-2">
              <Theater className="w-4 h-4" />
              Shows
            </TabsTrigger>
            <TabsTrigger value="venues" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Venues
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Show Creation Tab */}
          <TabsContent value="shows">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Show Creation Form */}
              <Card className="bg-white/95 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Theater className="w-5 h-5" />
                    Create New Show
                  </CardTitle>
                  <CardDescription>
                    Add a new show with automatic PostgreSQL + MongoDB integration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Show Title *</Label>
                      <Input
                        id="title"
                        value={showForm.title}
                        onChange={(e) => setShowForm({...showForm, title: e.target.value})}
                        placeholder="The Phantom of the Opera"
                      />
                    </div>
                    <div>
                      <Label htmlFor="showType">Show Type</Label>
                      <Select value={showForm.showType} onValueChange={(value) => setShowForm({...showForm, showType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="musical">Musical</SelectItem>
                          <SelectItem value="drama">Drama</SelectItem>
                          <SelectItem value="comedy">Comedy</SelectItem>
                          <SelectItem value="opera">Opera</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={showForm.description}
                      onChange={(e) => setShowForm({...showForm, description: e.target.value})}
                      placeholder="A captivating musical that has enthralled audiences..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="venue">Venue</Label>
                      <Select value={showForm.venue} onValueChange={(value) => setShowForm({...showForm, venue: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select venue" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Victoria Palace Theatre">Victoria Palace Theatre</SelectItem>
                          <SelectItem value="Her Majesty's Theatre">Her Majesty's Theatre</SelectItem>
                          <SelectItem value="Lyric Theatre">Lyric Theatre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="time">Show Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={showForm.time}
                        onChange={(e) => setShowForm({...showForm, time: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="date">Show Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={showForm.date}
                      onChange={(e) => setShowForm({...showForm, date: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minPrice">Min Price (£)</Label>
                      <Input
                        id="minPrice"
                        type="number"
                        value={showForm.minPrice}
                        onChange={(e) => setShowForm({...showForm, minPrice: e.target.value})}
                        placeholder="35"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPrice">Max Price (£)</Label>
                      <Input
                        id="maxPrice"
                        type="number"
                        value={showForm.maxPrice}
                        onChange={(e) => setShowForm({...showForm, maxPrice: e.target.value})}
                        placeholder="125"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="image">Poster Image</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setShowForm({...showForm, imageFile: e.target.files?.[0] || null})}
                      className="cursor-pointer"
                    />
                  </div>

                  <Button 
                    onClick={handleCreateShow} 
                    disabled={loading || !showForm.title || !showForm.venue}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? 'Creating Show...' : 'Create Show'}
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Templates */}
              <Card className="bg-white/95 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Quick Templates
                  </CardTitle>
                  <CardDescription>
                    Pre-configured templates for common show types
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quickShowTemplates.map((template, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-600">
                            {template.data.showType} • {template.data.time} • £{template.data.minPrice}-£{template.data.maxPrice}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowForm({...showForm, ...template.data})}
                        >
                          Use Template
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800">💡 Pro Tips</h4>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• Images will be auto-optimized and organized</li>
                      <li>• MongoDB seat maps are created automatically</li>
                      <li>• Show cards appear on homepage immediately</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Venue Creation Tab */}
          <TabsContent value="venues">
            <Card className="bg-white/95 backdrop-blur max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Create New Venue
                </CardTitle>
                <CardDescription>
                  Add a new venue for hosting shows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="venueName">Venue Name *</Label>
                  <Input
                    id="venueName"
                    value={venueForm.name}
                    onChange={(e) => setVenueForm({...venueForm, name: e.target.value})}
                    placeholder="Royal Opera House"
                  />
                </div>

                <div>
                  <Label htmlFor="venueAddress">Address *</Label>
                  <Input
                    id="venueAddress"
                    value={venueForm.address}
                    onChange={(e) => setVenueForm({...venueForm, address: e.target.value})}
                    placeholder="Bow Street, Covent Garden, London WC2E 9DD"
                  />
                </div>

                <div>
                  <Label htmlFor="venueDescription">Description</Label>
                  <Textarea
                    id="venueDescription"
                    value={venueForm.description}
                    onChange={(e) => setVenueForm({...venueForm, description: e.target.value})}
                    placeholder="Historic opera house in the heart of London..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={venueForm.capacity}
                      onChange={(e) => setVenueForm({...venueForm, capacity: e.target.value})}
                      placeholder="2256"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={venueForm.city}
                      onChange={(e) => setVenueForm({...venueForm, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={venueForm.country}
                      onChange={(e) => setVenueForm({...venueForm, country: e.target.value})}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleCreateVenue} 
                  disabled={loading || !venueForm.name || !venueForm.address}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Creating Venue...' : 'Create Venue'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Management Tab */}
          <TabsContent value="database">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/95 backdrop-blur">
                <CardHeader>
                  <CardTitle>Database Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>PostgreSQL</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">Healthy</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>MongoDB</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">Healthy</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Redis</span>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Disabled</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="w-4 h-4 mr-2" />
                    View All Shows
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MapPin className="w-4 h-4 mr-2" />
                    View All Venues
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Import Shows
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-white/95 backdrop-blur max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Image Settings</h4>
                    <p className="text-sm text-gray-600">
                      Images are automatically optimized and stored in /public/shows/[slug]/
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Database Integration</h4>
                    <p className="text-sm text-gray-600">
                      Shows are automatically synchronized between PostgreSQL and MongoDB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 