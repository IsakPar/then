'use client'

import React from 'react'

// ============================================================================
// SEAT MAP TESTING UTILITIES
// ============================================================================

/**
 * Enterprise-grade testing and debugging utilities for the SeatMap component
 * These tools help diagnose issues and ensure reliability
 */

export interface SeatMapTestResult {
  success: boolean
  message: string
  details?: any
  timestamp: string
}

export interface SeatMapDiagnostics {
  svgElements: {
    totalRects: number
    seatElements: number
    sectionsFound: string[]
    sampleSeats: Array<{
      section: string
      row: string
      seat: string
      classes: string
    }>
  }
  databaseIntegrity: {
    totalSeats: number
    bookedSeats: number
    availableSeats: number
    statusDistribution: Record<string, number>
  }
  matchingResults: {
    matchedSeats: number
    unmatchedSVGSeats: number
    unmatchedDBSeats: number
    matchingRate: number
  }
}

/**
 * Comprehensive seat map testing class
 */
export class SeatMapTester {
  private svgElement: SVGSVGElement | null = null
  private dbSeats: any[] = []
  private testResults: SeatMapTestResult[] = []

  constructor(svgElement: SVGSVGElement | null, dbSeats: any[] = []) {
    this.svgElement = svgElement
    this.dbSeats = dbSeats
  }

  /**
   * Run comprehensive seat map tests
   */
  async runFullDiagnostics(): Promise<SeatMapDiagnostics> {
    console.log('🧪 [SeatMapTester] Running full diagnostics...')
    
    const svgDiagnostics = this.analyzeSVGStructure()
    const dbDiagnostics = this.analyzeDatabaseIntegrity()
    const matchingResults = this.analyzeMatching()

    const diagnostics: SeatMapDiagnostics = {
      svgElements: svgDiagnostics,
      databaseIntegrity: dbDiagnostics,
      matchingResults
    }

    console.log('🧪 [SeatMapTester] Full diagnostics complete:', diagnostics)
    return diagnostics
  }

  /**
   * Test individual seat selection functionality
   */
  testSeatSelection(section: string, row: number, seat: number): SeatMapTestResult {
    const timestamp = new Date().toISOString()
    
    if (!this.svgElement) {
      return {
        success: false,
        message: 'No SVG element available for testing',
        timestamp
      }
    }

    // Find the seat element
    const seatElement = this.svgElement.querySelector(
      `rect[data-section="${section}"][data-row="${row}"][data-seat="${seat}"]`
    )

    if (!seatElement) {
      return {
        success: false,
        message: `Seat not found in SVG: ${section} row ${row} seat ${seat}`,
        timestamp
      }
    }

    // Simulate click
    try {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      })
      
      seatElement.dispatchEvent(clickEvent)
      
      return {
        success: true,
        message: `Successfully clicked seat: ${section} row ${row} seat ${seat}`,
        details: {
          element: seatElement,
          classes: seatElement.classList.toString(),
          attributes: Array.from(seatElement.attributes).map(attr => `${attr.name}="${attr.value}"`)
        },
        timestamp
      }
    } catch (error) {
      return {
        success: false,
        message: `Error clicking seat: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp
      }
    }
  }

  /**
   * Test seat status updates
   */
  testSeatStatusUpdate(section: string, row: number, seat: number, expectedStatus: string): SeatMapTestResult {
    const timestamp = new Date().toISOString()
    
    if (!this.svgElement) {
      return {
        success: false,
        message: 'No SVG element available for testing',
        timestamp
      }
    }

    const seatElement = this.svgElement.querySelector(
      `rect[data-section="${section}"][data-row="${row}"][data-seat="${seat}"]`
    ) as SVGRectElement

    if (!seatElement) {
      return {
        success: false,
        message: `Seat not found: ${section} row ${row} seat ${seat}`,
        timestamp
      }
    }

    const hasExpectedClass = seatElement.classList.contains(`seat-${expectedStatus}`)
    const currentClasses = seatElement.classList.toString()

    return {
      success: hasExpectedClass,
      message: hasExpectedClass 
        ? `Seat has correct status: ${expectedStatus}` 
        : `Seat status mismatch. Expected: seat-${expectedStatus}, Found: ${currentClasses}`,
      details: {
        expectedClass: `seat-${expectedStatus}`,
        currentClasses,
        element: seatElement
      },
      timestamp
    }
  }

  /**
   * Analyze SVG structure
   */
  private analyzeSVGStructure() {
    if (!this.svgElement) {
      return {
        totalRects: 0,
        seatElements: 0,
        sectionsFound: [],
        sampleSeats: []
      }
    }

    const allRects = this.svgElement.querySelectorAll('rect')
    const seatElements = this.svgElement.querySelectorAll('rect.seat, rect[data-seat]')
    
    const sectionsFound = new Set<string>()
    const sampleSeats: Array<{section: string, row: string, seat: string, classes: string}> = []

    Array.from(seatElements).slice(0, 10).forEach(element => {
      const section = element.getAttribute('data-section') || 'unknown'
      const row = element.getAttribute('data-row') || '0'
      const seat = element.getAttribute('data-seat') || '0'
      const classes = element.classList.toString()

      sectionsFound.add(section)
      sampleSeats.push({ section, row, seat, classes })
    })

    return {
      totalRects: allRects.length,
      seatElements: seatElements.length,
      sectionsFound: Array.from(sectionsFound),
      sampleSeats
    }
  }

  /**
   * Analyze database integrity
   */
  private analyzeDatabaseIntegrity() {
    const statusDistribution: Record<string, number> = {}
    let bookedSeats = 0
    let availableSeats = 0

    this.dbSeats.forEach(seat => {
      const status = seat.status || 'unknown'
      statusDistribution[status] = (statusDistribution[status] || 0) + 1
      
      if (status === 'booked') bookedSeats++
      if (status === 'available') availableSeats++
    })

    return {
      totalSeats: this.dbSeats.length,
      bookedSeats,
      availableSeats,
      statusDistribution
    }
  }

  /**
   * Analyze seat matching between SVG and database
   */
  private analyzeMatching() {
    if (!this.svgElement) {
      return {
        matchedSeats: 0,
        unmatchedSVGSeats: 0,
        unmatchedDBSeats: 0,
        matchingRate: 0
      }
    }

    const seatElements = this.svgElement.querySelectorAll('rect.seat, rect[data-seat]')
    let matchedSeats = 0
    let unmatchedSVGSeats = 0

    Array.from(seatElements).forEach(element => {
      const section = element.getAttribute('data-section')
      const row = parseInt(element.getAttribute('data-row') || '0')
      const seat = parseInt(element.getAttribute('data-seat') || '0')

      const dbMatch = this.dbSeats.find(dbSeat => {
        // Simplified matching logic for testing
        return dbSeat.seat_number === seat
      })

      if (dbMatch) {
        matchedSeats++
      } else {
        unmatchedSVGSeats++
      }
    })

    const unmatchedDBSeats = this.dbSeats.length - matchedSeats
    const matchingRate = seatElements.length > 0 ? (matchedSeats / seatElements.length) * 100 : 0

    return {
      matchedSeats,
      unmatchedSVGSeats,
      unmatchedDBSeats,
      matchingRate: Math.round(matchingRate * 100) / 100
    }
  }

  /**
   * Get all test results
   */
  getTestResults(): SeatMapTestResult[] {
    return this.testResults
  }

  /**
   * Clear test results
   */
  clearTestResults(): void {
    this.testResults = []
  }
}

/**
 * Debug component for development mode
 */
export const SeatMapDebugPanel: React.FC<{
  svgRef: React.RefObject<SVGSVGElement>
  seats: any[]
  selectedSeats: any[]
}> = ({ svgRef, seats, selectedSeats }) => {
  const [diagnostics, setDiagnostics] = React.useState<SeatMapDiagnostics | null>(null)
  const [isRunning, setIsRunning] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(false)

  const runDiagnostics = async () => {
    if (!svgRef.current) return

    setIsRunning(true)
    const tester = new SeatMapTester(svgRef.current, seats)
    const results = await tester.runFullDiagnostics()
    setDiagnostics(results)
    setIsRunning(false)
  }

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
      >
        🧪 Debug Panel
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Seat Map Diagnostics</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {isRunning ? 'Running...' : 'Run Diagnostics'}
            </button>

            {diagnostics && (
              <div className="space-y-3 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-2">SVG Analysis</h4>
                  <p>Total Elements: {diagnostics.svgElements.totalRects}</p>
                  <p>Seat Elements: {diagnostics.svgElements.seatElements}</p>
                  <p>Sections: {diagnostics.svgElements.sectionsFound.join(', ')}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-2">Database</h4>
                  <p>Total Seats: {diagnostics.databaseIntegrity.totalSeats}</p>
                  <p>Booked: {diagnostics.databaseIntegrity.bookedSeats}</p>
                  <p>Available: {diagnostics.databaseIntegrity.availableSeats}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-2">Matching</h4>
                  <p>Matched: {diagnostics.matchingResults.matchedSeats}</p>
                  <p>Rate: {diagnostics.matchingResults.matchingRate}%</p>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-2">Current Selection</h4>
                  <p>Selected: {selectedSeats.length} seats</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Hook for testing seat map functionality
 */
export const useSeatMapTesting = (
  svgRef: React.RefObject<SVGSVGElement>,
  seats: any[]
) => {
  const [tester, setTester] = React.useState<SeatMapTester | null>(null)

  React.useEffect(() => {
    if (svgRef.current) {
      setTester(new SeatMapTester(svgRef.current, seats))
    }
  }, [svgRef.current, seats])

  const testSeatClick = React.useCallback((section: string, row: number, seat: number) => {
    return tester?.testSeatSelection(section, row, seat) || null
  }, [tester])

  const testSeatStatus = React.useCallback((section: string, row: number, seat: number, status: string) => {
    return tester?.testSeatStatusUpdate(section, row, seat, status) || null
  }, [tester])

  const runFullDiagnostics = React.useCallback(async () => {
    return tester?.runFullDiagnostics() || null
  }, [tester])

  return {
    testSeatClick,
    testSeatStatus,
    runFullDiagnostics,
    tester
  }
}

// ============================================================================
// BROWSER CONSOLE UTILITIES
// ============================================================================

/**
 * Expose testing utilities to browser console for manual testing
 */
export const exposeSeatMapTestingToConsole = (
  svgRef: React.RefObject<SVGSVGElement>,
  seats: any[]
) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const tester = new SeatMapTester(svgRef.current, seats)
    
    // @ts-ignore
    window.seatMapTester = tester
    
    // @ts-ignore
    window.testSeatClick = (section: string, row: number, seat: number) => {
      return tester.testSeatSelection(section, row, seat)
    }
    
    // @ts-ignore
    window.runSeatMapDiagnostics = () => {
      return tester.runFullDiagnostics()
    }

    console.log('🧪 [SeatMapTesting] Testing utilities exposed to console:')
    console.log('  - window.seatMapTester')
    console.log('  - window.testSeatClick(section, row, seat)')
    console.log('  - window.runSeatMapDiagnostics()')
  }
} 