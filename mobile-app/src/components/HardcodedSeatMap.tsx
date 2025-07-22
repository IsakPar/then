import React, { useState, useCallback, useEffect } from 'react'
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native'
import Svg, { Circle, Text as SvgText, Path, Rect, Defs, LinearGradient, Stop, Filter, FeGaussianBlur, FeOffset, FeComponentTransfer, FeFuncA, FeMerge, FeMergeNode, G } from 'react-native-svg'

const { width: screenWidth } = Dimensions.get('window')

interface HardcodedSeatMapProps {
  onSeatSelect: (seatId: string) => void
  onSeatDeselect: (seatId: string) => void
  selectedSeats: string[]
}

interface SeatData {
  id: string
  section: string
  row: number
  seat: number
  sectionType: string
  x: number
  y: number
}

const HardcodedSeatMap: React.FC<HardcodedSeatMapProps> = ({
  onSeatSelect,
  onSeatDeselect,
  selectedSeats
}) => {
  const [seats, setSeats] = useState<SeatData[]>([])

  // Generate all seats programmatically
  const generateSeats = useCallback(() => {
    const allSeats: SeatData[] = []

    // Premium Section - 150 seats (15 cols x 10 rows)
    const premiumStartX = 475
    const premiumStartY = 190
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 15; col++) {
        allSeats.push({
          id: `premium-${row + 1}-${col + 1}`,
          section: 'Premium',
          row: row + 1,
          seat: col + 1,
          sectionType: 'premium',
          x: premiumStartX + col * 30,
          y: premiumStartY + row * 28
        })
      }
    }

    // Side Section A - 50 seats (5 cols x 10 rows)
    const sideAStartX = 290
    const sideAStartY = 220
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 5; col++) {
        allSeats.push({
          id: `sideA-${row + 1}-${col + 1}`,
          section: 'SideA',
          row: row + 1,
          seat: col + 1,
          sectionType: 'side',
          x: sideAStartX + col * 30,
          y: sideAStartY + row * 28
        })
      }
    }

    // Side Section B - 50 seats (5 cols x 10 rows)
    const sideBStartX = 970
    const sideBStartY = 220
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 5; col++) {
        allSeats.push({
          id: `sideB-${row + 1}-${col + 1}`,
          section: 'SideB',
          row: row + 1,
          seat: col + 1,
          sectionType: 'side',
          x: sideBStartX + col * 30,
          y: sideBStartY + row * 28
        })
      }
    }

    // Middle Section - 150 seats (15 cols x 10 rows)
    const middleStartX = 475
    const middleStartY = 500
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 15; col++) {
        allSeats.push({
          id: `middle-${row + 1}-${col + 1}`,
          section: 'Middle',
          row: row + 1,
          seat: col + 1,
          sectionType: 'middle',
          x: middleStartX + col * 30,
          y: middleStartY + row * 28
        })
      }
    }

    // Back Section - 102 seats in triangular/trapezoid arrangement
    const backStartY = 820
    const backRows = [
      { seats: 14, startX: 490 }, // Row 1: 14 seats
      { seats: 13, startX: 505 }, // Row 2: 13 seats
      { seats: 12, startX: 520 }, // Row 3: 12 seats
      { seats: 11, startX: 535 }, // Row 4: 11 seats
      { seats: 10, startX: 550 }, // Row 5: 10 seats
      { seats: 9, startX: 565 },  // Row 6: 9 seats
      { seats: 9, startX: 565 },  // Row 7: 9 seats
      { seats: 8, startX: 580 },  // Row 8: 8 seats
      { seats: 8, startX: 580 },  // Row 9: 8 seats
      { seats: 8, startX: 580 },  // Row 10: 8 seats
    ]

    backRows.forEach((rowConfig, rowIndex) => {
      for (let col = 0; col < rowConfig.seats; col++) {
        allSeats.push({
          id: `back-${rowIndex + 1}-${col + 1}`,
          section: 'Back',
          row: rowIndex + 1,
          seat: col + 1,
          sectionType: 'back',
          x: rowConfig.startX + col * 30,
          y: backStartY + rowIndex * 28
        })
      }
    })

    return allSeats
  }, [])

  useEffect(() => {
    setSeats(generateSeats())
  }, [generateSeats])

  const handleSeatPress = useCallback((seat: SeatData) => {
    if (selectedSeats.includes(seat.id)) {
      onSeatDeselect(seat.id)
    } else {
      onSeatSelect(seat.id)
    }
  }, [selectedSeats, onSeatSelect, onSeatDeselect])

  const getSeatFill = (seat: SeatData): string => {
    if (selectedSeats.includes(seat.id)) {
      return '#4a90e2'
    }

    switch (seat.sectionType) {
      case 'premium':
        return '#ffd700'
      case 'side':
        return '#66bb6a'
      case 'middle':
        return '#ab47bc'
      case 'back':
        return '#ff7043'
      default:
        return '#e0e0e0'
    }
  }

  const getSeatStroke = (seat: SeatData): string => {
    if (selectedSeats.includes(seat.id)) {
      return '#2e7cd6'
    }

    switch (seat.sectionType) {
      case 'premium':
        return '#cc9900'
      case 'side':
        return '#388e3c'
      case 'middle':
        return '#7b1fa2'
      case 'back':
        return '#d84315'
      default:
        return '#999'
    }
  }

  return (
    <View style={styles.container}>
      <Svg
        width={screenWidth - 20}
        height={400}
        viewBox="200 100 1000 900"
        style={styles.svg}
      >
        <Defs>
          {/* Gradients */}
          <LinearGradient id="seatGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#e0e0e0" stopOpacity="1" />
            <Stop offset="100%" stopColor="#b0b0b0" stopOpacity="1" />
          </LinearGradient>

          <LinearGradient id="selectedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#4a90e2" stopOpacity="1" />
            <Stop offset="100%" stopColor="#357abd" stopOpacity="1" />
          </LinearGradient>

          <LinearGradient id="premiumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ffd700" stopOpacity="1" />
            <Stop offset="100%" stopColor="#ffb300" stopOpacity="1" />
          </LinearGradient>

          <LinearGradient id="sideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#66bb6a" stopOpacity="1" />
            <Stop offset="100%" stopColor="#43a047" stopOpacity="1" />
          </LinearGradient>

          <LinearGradient id="middleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ab47bc" stopOpacity="1" />
            <Stop offset="100%" stopColor="#8e24aa" stopOpacity="1" />
          </LinearGradient>

          <LinearGradient id="backGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ff7043" stopOpacity="1" />
            <Stop offset="100%" stopColor="#f4511e" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Stage */}
        <Path d="M 300 50 L 1100 50 L 1050 130 L 350 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="2"/>
        <SvgText x="700" y="95" textAnchor="middle" fill="#888" fontFamily="Arial" fontSize="28" fontWeight="bold">STAGE</SvgText>

        {/* Section Labels */}
        <SvgText x="700" y="170" textAnchor="middle" fill="#FFD700" fontFamily="Arial" fontSize="16" fontWeight="bold">PREMIUM SECTION (150 seats)</SvgText>
        <SvgText x="250" y="200" textAnchor="middle" fill="#ccc" fontFamily="Arial" fontSize="14">SIDE A (50 seats)</SvgText>
        <SvgText x="1120" y="200" textAnchor="middle" fill="#ccc" fontFamily="Arial" fontSize="14">SIDE B (50 seats)</SvgText>
        <SvgText x="700" y="480" textAnchor="middle" fill="#ccc" fontFamily="Arial" fontSize="16">MIDDLE SECTION (150 seats)</SvgText>
        <SvgText x="700" y="800" textAnchor="middle" fill="#ccc" fontFamily="Arial" fontSize="16">BACK SECTION (102 seats)</SvgText>

        {/* Render all seats */}
        {seats.map((seat) => (
          <Rect
            key={seat.id}
            x={seat.x}
            y={seat.y}
            width="24"
            height="22"
            rx="4"
            fill={getSeatFill(seat)}
            stroke={getSeatStroke(seat)}
            strokeWidth="1"
            onPress={() => handleSeatPress(seat)}
          />
        ))}

        {/* Wheelchair accessible spots */}
        <G transform="translate(440, 195)">
          <Rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" strokeWidth="1" />
          <SvgText x="0" y="12" textAnchor="middle" fill="white" fontSize="16" fontFamily="Arial">♿</SvgText>
        </G>
        <G transform="translate(925, 195)">
          <Rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" strokeWidth="1" />
          <SvgText x="0" y="12" textAnchor="middle" fill="white" fontSize="16" fontFamily="Arial">♿</SvgText>
        </G>
        <G transform="translate(165, 275)">
          <Rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" strokeWidth="1" />
          <SvgText x="0" y="12" textAnchor="middle" fill="white" fontSize="16" fontFamily="Arial">♿</SvgText>
        </G>
        <G transform="translate(1215, 275)">
          <Rect x="-12" y="-5" width="24" height="22" rx="4" fill="#4a90e2" stroke="#357abd" strokeWidth="1" />
          <SvgText x="0" y="12" textAnchor="middle" fill="white" fontSize="16" fontFamily="Arial">♿</SvgText>
        </G>

        {/* Center aisle */}
        <Rect x="690" y="180" width="20" height="820" fill="#2a2a2a" opacity="0.5" />

        {/* Side aisles */}
        <Rect x="360" y="260" width="80" height="300" fill="#2a2a2a" opacity="0.3" />
        <Rect x="960" y="260" width="80" height="300" fill="#2a2a2a" opacity="0.3" />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    margin: 10,
  },
})

export default HardcodedSeatMap 