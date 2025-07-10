'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface SeatMapData {
  id: string
  name: string
  description: string | null
  totalCapacity: number
  layoutConfig: any
  svgViewbox: string
}

interface SeatMapSection {
  id: string
  name: string
  displayName: string | null
  colorHex: string
  basePricePence: number
  basePriceFormatted: string
  seatPattern: any
  positionConfig: any
  isAccessible: boolean
  sortOrder: number
}

export default function SeatMapPreview() {
  const params = useParams()
  const seatMapId = params?.id as string

  const [seatMapData, setSeatMapData] = useState<SeatMapData | null>(null)
  const [sections, setSections] = useState<SeatMapSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (seatMapId) {
      loadSeatMapData()
    }
  }, [seatMapId])

  const loadSeatMapData = async () => {
    try {
      setLoading(true)
      
      // Load seat map basic info
      const seatMapResponse = await fetch(`/api/seatmaps/${seatMapId}/sections`)
      if (!seatMapResponse.ok) throw new Error('Failed to fetch seat map sections')
      
      const sectionsResult = await seatMapResponse.json()
      setSections(sectionsResult.sections || [])

      // We need to get the seat map data too
      const seatMapsResponse = await fetch('/api/seatmaps')
      if (!seatMapsResponse.ok) throw new Error('Failed to fetch seat maps')
      
      const seatMapsData = await seatMapsResponse.json()
      const currentSeatMap = seatMapsData.find((sm: any) => sm.id === seatMapId)
      
      if (currentSeatMap) {
        setSeatMapData(currentSeatMap)
      }

    } catch (error) {
      console.error('Error loading seat map data:', error)
      setError('Failed to load seat map data')
    } finally {
      setLoading(false)
    }
  }

  const generateSeatMapSVG = () => {
    if (!seatMapData || !sections.length) return null

    const config = seatMapData.layoutConfig || {}
    const viewBox = seatMapData.svgViewbox || "0 0 1400 1000"
    

    
    return (
      <div className="w-full h-full bg-gray-900 rounded-xl overflow-hidden">
        <svg
          viewBox={viewBox}
          className="w-full h-full"
          style={{ maxHeight: '80vh' }}
        >

          
          {/* Background */}
          <rect width="100%" height="100%" fill="#1a1a2e" />
          
          {/* Stage - Centered */}
          <rect
            x="350"
            y="50"
            width="300"
            height="80"
            rx="10"
            fill="#8B5CF6"
            opacity="0.8"
          />
          <text 
            x="500" 
            y="100" 
            textAnchor="middle" 
            fill="#FFFFFF" 
            fontSize="24" 
            fontWeight="bold"
            letterSpacing="2px"
          >
            STAGE
          </text>

          {/* Render sections based on configuration */}
          {config.sections?.map((sectionConfig: any, index: number) => {
            const sectionData = sections.find(s => s.name === sectionConfig.name)
            if (!sectionData) return null

            const offset = sectionConfig.offset || { x: 100 + (index * 200), y: 200 }
            const seatSpacing = sectionConfig.seatSpacing || 22
            const rowSpacing = sectionConfig.rowSpacing || 20
            const rows = sectionConfig.rows || 8
            const cols = sectionConfig.cols || 12
            const shape = sectionConfig.shape || 'grid'

            const seatElements = []

            if (shape === 'grid') {
              // Grid layout  
              for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                  const seatX = offset.x + col * seatSpacing
                  const seatY = offset.y + row * rowSpacing
                  const rowLetter = String.fromCharCode(65 + row) // A, B, C...

                  seatElements.push(
                    <rect
                      key={`${sectionData.id}-${row}-${col}`}
                      x={seatX}
                      y={seatY}
                      width="22"
                      height="20"
                      rx="4"
                      fill={sectionData.colorHex}
                      stroke="#222"
                      strokeWidth="1.5"
                      opacity="0.95"
                      style={{
                        filter: 'drop-shadow(1px 1px 3px rgba(0,0,0,0.4))',
                        cursor: 'pointer',
                        pointerEvents: 'all'
                      }}
                      onMouseEnter={(e) => {
                        const target = e.target as SVGRectElement
                        target.setAttribute('stroke', '#fff')
                        target.setAttribute('stroke-width', '3')
                        target.setAttribute('opacity', '1')
                      }}
                      onMouseLeave={(e) => {
                        const target = e.target as SVGRectElement
                        target.setAttribute('stroke', '#222')
                        target.setAttribute('stroke-width', '1.5')
                        target.setAttribute('opacity', '0.95')
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()

                        alert(`Seat Selected!\n\nSection: ${sectionData.name}\nRow: ${rowLetter}, Seat: ${col + 1}\nPrice: £${sectionData.basePriceFormatted}`)
                      }}
                    >
                      <title>{`${sectionData.name} - Row ${rowLetter}, Seat ${col + 1} - £${sectionData.basePriceFormatted}`}</title>
                    </rect>
                  )
                }
              }
            } else if (shape === 'trapezoid') {
              // Trapezoid layout (for balconies)
              const rowCounts = sectionConfig.rowCounts || Array(rows).fill(cols)
              rowCounts.slice(0, rows).forEach((colCount: number, row: number) => {
                const rowOffset = (cols - colCount) * seatSpacing / 2
                const rowLetter = String.fromCharCode(65 + row)
                for (let col = 0; col < colCount; col++) {
                  const seatX = offset.x + rowOffset + col * seatSpacing
                  const seatY = offset.y + row * rowSpacing

                  seatElements.push(
                    <rect
                      key={`${sectionData.id}-${row}-${col}`}
                      x={seatX}
                      y={seatY}
                      width="20"
                      height="18"
                      rx="4"
                      fill={sectionData.colorHex}
                      stroke="#222"
                      strokeWidth="1.5"
                      opacity="0.95"
                      style={{
                        filter: 'drop-shadow(1px 1px 3px rgba(0,0,0,0.4))',
                        cursor: 'pointer',
                        pointerEvents: 'all'
                      }}
                      onMouseEnter={(e) => {
                        const target = e.target as SVGRectElement
                        target.setAttribute('stroke', '#fff')
                        target.setAttribute('stroke-width', '3')
                        target.setAttribute('opacity', '1')
                      }}
                      onMouseLeave={(e) => {
                        const target = e.target as SVGRectElement
                        target.setAttribute('stroke', '#222')
                        target.setAttribute('stroke-width', '1.5')
                        target.setAttribute('opacity', '0.95')
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()

                        alert(`Seat Selected!\n\nSection: ${sectionData.name}\nRow: ${rowLetter}, Seat: ${col + 1}\nPrice: £${sectionData.basePriceFormatted}`)
                      }}
                    >
                      <title>{`${sectionData.name} - Row ${rowLetter}, Seat ${col + 1} - £${sectionData.basePriceFormatted}`}</title>
                    </rect>
                  )
                }
              })
            } else if (shape === 'standing') {
              // Standing area
              seatElements.push(
                <rect
                  key={`${sectionData.id}-standing`}
                  x={offset.x}
                  y={offset.y}
                  width="300"
                  height="150"
                  rx="10"
                  fill={sectionData.colorHex}
                  stroke={sectionData.colorHex}
                  strokeWidth="2"
                  opacity="0.3"
                  strokeDasharray="5,5"
                />
              )
              seatElements.push(
                <text
                  key={`${sectionData.id}-standing-text`}
                  x={offset.x + 150}
                  y={offset.y + 80}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="16"
                  fontWeight="bold"
                >
                  STANDING AREA
                </text>
              )
            }


            
            return (
              <g key={sectionData.id}>
                {/* Section background */}
                <rect
                  x={offset.x - 20}
                  y={offset.y - 40}
                  width={cols * seatSpacing + 40}
                  height={rows * rowSpacing + 60}
                  rx="10"
                  fill={sectionData.colorHex}
                  opacity="0.1"
                  stroke={sectionData.colorHex}
                  strokeWidth="2"
                  strokeOpacity="0.3"
                />



                {/* Seats */}
                {seatElements}
              </g>
            )
          })}

          {/* Legend */}
          <g transform="translate(50, 50)">
            <rect x="0" y="0" width="280" height="120" rx="8" fill="#000000" opacity="0.8" />
            <text x="10" y="20" fill="#FFFFFF" fontSize="14" fontWeight="bold">Seat Map Legend</text>
            {sections.slice(0, 4).map((section, index) => (
              <g key={section.id} transform={`translate(10, ${35 + index * 20})`}>
                <rect x="0" y="0" width="16" height="14" rx="3" fill={section.colorHex} />
                <text x="25" y="12" fill="#FFFFFF" fontSize="12">
                  {section.name} - £{section.basePriceFormatted}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading seat map preview...</div>
      </div>
    )
  }

  if (error || !seatMapData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">❌ Error Loading Seat Map</div>
          <div className="text-gray-300">{error || 'Seat map not found'}</div>
          <button 
            onClick={() => window.close()} 
            className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Close Window
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {seatMapData.name} - Interactive Preview
            </h1>
            <p className="text-gray-300">
              {seatMapData.description} • {seatMapData.totalCapacity.toLocaleString()} total seats
            </p>
          </div>
          <button 
            onClick={() => window.close()} 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Interactive Seat Map */}
      <div className="mb-6">
        {generateSeatMapSVG()}
      </div>

      {/* Section Details */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Section Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(section => (
            <div key={section.id} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: section.colorHex }}
                ></div>
                <div>
                  <div className="text-white font-medium">{section.name}</div>
                  <div className="text-green-400 font-semibold">£{section.basePriceFormatted}</div>
                </div>
              </div>
              <div className="text-gray-400 text-sm space-y-1">
                <p>Shape: {section.seatPattern?.shape || 'grid'}</p>
                <p>Layout: {section.seatPattern?.rows || 'N/A'} rows × {section.seatPattern?.cols || 'N/A'} cols</p>
                {section.isAccessible && (
                  <p className="text-blue-400">♿ Wheelchair accessible</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 