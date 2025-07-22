import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Svg, { Circle, Text as SvgText, Path } from 'react-native-svg';

import apiClient from '../lib/api/client';
import { Seat } from '../types';

interface SeatMapProps {
  showId: string;
  onSeatSelect: (seat: Seat) => void;
  onSeatDeselect: (seatId: string) => void;
  selectedSeats: Seat[];
}

interface SeatMapData {
  id: string;
  name: string;
  layoutConfig: any;
  totalCapacity: number;
  svgViewbox: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SeatMap({ showId, onSeatSelect, onSeatDeselect, selectedSeats }: SeatMapProps) {
  const [seatMapData, setSeatMapData] = useState<SeatMapData | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSeatMapData();
  }, [showId]);

  const fetchSeatMapData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [seatMapResponse, seatsResponse] = await Promise.all([
        apiClient.getShowSeatMap(showId),
        apiClient.getShowSeats(showId)
      ]);

      // Handle the API response structure - seat map might be wrapped
      const seatMapData = seatMapResponse.success ? seatMapResponse.seatMap : seatMapResponse;
      setSeatMapData(seatMapData);
      setSeats(seatsResponse);
      
      // Enhanced debugging for coordinate data flow
      console.log('🎫 === SEAT MAP DATA DEBUGGING ===');
      console.log('🎫 Total seats loaded:', seatsResponse.length);
      console.log('🎫 Seat map data structure:', seatMapData);
      
      if (seatsResponse.length > 0) {
        const sampleSeat = seatsResponse[0];
        console.log('🎫 Sample seat full object:', sampleSeat);
        console.log('🎫 Sample seat position data:', sampleSeat.position);
        console.log('🎫 Position type check:', typeof sampleSeat.position);
        console.log('🎫 Position x/y check:', sampleSeat.position?.x, sampleSeat.position?.y);
        console.log('🎫 Sample seat section:', sampleSeat.section_name);
        console.log('🎫 Sample seat row/number:', sampleSeat.row_letter, sampleSeat.seat_number);
        
        // Show sections breakdown with coordinate info
        const sectionCounts = seatsResponse.reduce((acc, seat) => {
          const sectionName = seat.section_name || 'Unknown';
          if (!acc[sectionName]) {
            acc[sectionName] = { count: 0, hasCoordinates: 0 };
          }
          acc[sectionName].count++;
          
          // Check if this seat has valid coordinates
          if (seat.position && 
              typeof seat.position.x === 'number' && 
              typeof seat.position.y === 'number' &&
              !isNaN(seat.position.x) && 
              !isNaN(seat.position.y)) {
            acc[sectionName].hasCoordinates++;
          }
          
          return acc;
        }, {} as Record<string, { count: number; hasCoordinates: number }>);
        
        console.log('🎫 Sections with coordinate info:', sectionCounts);
        
        // Log coordinate ranges for each section
        Object.keys(sectionCounts).forEach(sectionName => {
          const sectionSeats = seatsResponse.filter(seat => seat.section_name === sectionName);
          const validCoordinates = sectionSeats
            .filter(seat => seat.position && 
                          typeof seat.position.x === 'number' && 
                          typeof seat.position.y === 'number')
            .map(seat => seat.position);
            
          if (validCoordinates.length > 0) {
            const xCoords = validCoordinates.map(pos => pos.x);
            const yCoords = validCoordinates.map(pos => pos.y);
            const minX = Math.min(...xCoords);
            const maxX = Math.max(...xCoords);
            const minY = Math.min(...yCoords);
            const maxY = Math.max(...yCoords);
            
            console.log(`🎫 ${sectionName} coordinates:`, {
              seats: validCoordinates.length,
              xRange: `${minX} - ${maxX}`,
              yRange: `${minY} - ${maxY}`,
              samplePositions: validCoordinates.slice(0, 3)
            });
          }
        });
      }
      
      console.log('🎫 === END DEBUGGING ===');
      
      // ✅ COORDINATE SYSTEM SUMMARY
      const seatsWithValidCoords = seatsResponse.filter(seat => 
        seat.position && 
        typeof seat.position.x === 'number' && 
        typeof seat.position.y === 'number' &&
        !isNaN(seat.position.x) && 
        !isNaN(seat.position.y)
      );
      
      const coordinateSystemUsed = seatsWithValidCoords.length > 0 ? 'JSON Database Coordinates' : 'Hardcoded Fallback Layout';
      const percentageWithCoords = seatsResponse.length > 0 ? 
        Math.round((seatsWithValidCoords.length / seatsResponse.length) * 100) : 0;
      
      console.log(`🎯 COORDINATE SYSTEM: ${coordinateSystemUsed}`);
      console.log(`📊 COVERAGE: ${seatsWithValidCoords.length}/${seatsResponse.length} seats (${percentageWithCoords}%) have JSON coordinates`);
      
      if (seatsWithValidCoords.length > 0) {
        console.log('✅ SUCCESS: Using perfect JSON coordinates - seats should render properly without overlap!');
      } else {
        console.log('⚠️ WARNING: No JSON coordinates found - falling back to hardcoded layout (may have overlaps)');
      }
      
    } catch (err) {
      console.error('Error fetching seat map data:', err);
      setError('Failed to load seat map');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatPress = (seat: Seat) => {
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    
    if (seat.status === 'available' || isSelected) {
      if (isSelected) {
        onSeatDeselect(seat.id);
      } else {
        onSeatSelect(seat);
      }
    } else {
      Alert.alert('Seat Unavailable', 'This seat is not available for selection.');
    }
  };

  const getSeatColor = (seat: Seat) => {
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    
    if (isSelected) return '#10B981'; // Green
    
    switch (seat.status) {
      case 'available': return '#3B82F6'; // Blue
      case 'reserved': return '#F59E0B'; // Orange
      case 'booked': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const getTheaterLayout = (sectionName: string, seatIndex: number, totalSeatsInSection: number) => {
    // ⚠️ SAFETY CHECK: Do not use hardcoded layout if ANY seats have JSON coordinates
    const hasJsonCoordinates = seats.some(seat => 
      seat.position && 
      typeof seat.position === 'object' && 
      typeof seat.position.x === 'number' && 
      typeof seat.position.y === 'number' &&
      !isNaN(seat.position.x) && 
      !isNaN(seat.position.y)
    );
    
    if (hasJsonCoordinates) {
      console.warn('🚫 Blocking hardcoded layout - JSON coordinates detected!');
      // Return a fallback position to prevent crashes
      return { x: 50, y: 50 };
    }
    
    // Theater layout configuration
    const stageY = 100; // Just below stage
    const centerX = 700; // Center of theater
    
    switch (sectionName) {
      case 'Premium Orchestra':
        // Center section, closest to stage, curved arrangement
        const orchestraRows = Math.ceil(totalSeatsInSection / 25); // ~25 seats per row
        const orchestraSeatsPerRow = Math.min(25, totalSeatsInSection - Math.floor(seatIndex / 25) * 25);
        const orchestraRowIndex = Math.floor(seatIndex / 25);
        const orchestraSeatInRow = seatIndex % 25;
        
        return {
          x: centerX - (orchestraSeatsPerRow * 12) + (orchestraSeatInRow * 24),
          y: stageY + 80 + (orchestraRowIndex * 22)
        };
        
      case 'Mezzanine':
        // Behind orchestra, elevated view
        const mezzRows = Math.ceil(totalSeatsInSection / 24); // ~24 seats per row
        const mezzSeatsPerRow = Math.min(24, totalSeatsInSection - Math.floor(seatIndex / 24) * 24);
        const mezzRowIndex = Math.floor(seatIndex / 24);
        const mezzSeatInRow = seatIndex % 24;
        
        return {
          x: centerX - (mezzSeatsPerRow * 12) + (mezzSeatInRow * 24),
          y: stageY + 250 + (mezzRowIndex * 20)
        };
        
      case 'Balcony':
        // Top section, furthest from stage
        const balconyRows = Math.ceil(totalSeatsInSection / 22); // ~22 seats per row
        const balconySeatsPerRow = Math.min(22, totalSeatsInSection - Math.floor(seatIndex / 22) * 22);
        const balconyRowIndex = Math.floor(seatIndex / 22);
        const balconySeatInRow = seatIndex % 22;
        
        return {
          x: centerX - (balconySeatsPerRow * 12) + (balconySeatInRow * 24),
          y: stageY + 400 + (balconyRowIndex * 20)
        };
        
      case 'Side Left':
        // Left side of theater, angled toward stage
        const leftRows = Math.ceil(totalSeatsInSection / 8); // ~8 seats per row
        const leftSeatsPerRow = Math.min(8, totalSeatsInSection - Math.floor(seatIndex / 8) * 8);
        const leftRowIndex = Math.floor(seatIndex / 8);
        const leftSeatInRow = seatIndex % 8;
        
        return {
          x: 150 + (leftSeatInRow * 20),
          y: stageY + 120 + (leftRowIndex * 25)
        };
        
      case 'Side Right':
        // Right side of theater, angled toward stage
        const rightRows = Math.ceil(totalSeatsInSection / 8); // ~8 seats per row
        const rightSeatsPerRow = Math.min(8, totalSeatsInSection - Math.floor(seatIndex / 8) * 8);
        const rightRowIndex = Math.floor(seatIndex / 8);
        const rightSeatInRow = seatIndex % 8;
        
        return {
          x: 1050 + (rightSeatInRow * 20),
          y: stageY + 120 + (rightRowIndex * 25)
        };
        
      default:
        // Fallback positioning
        return {
          x: 100 + (seatIndex % 20) * 25,
          y: stageY + 200 + (Math.floor(seatIndex / 20) * 25)
        };
    }
  };

  const renderSeat = (seat: Seat, sectionName: string, seatIndex: number, totalSeatsInSection: number) => {
    // Use the actual position data from the database if available
    let seatX, seatY;
    let usingJsonCoordinates = false;
    
    // ✅ FIXED: Properly check for valid JSON coordinates (including 0 values)
    if (seat.position && 
        typeof seat.position === 'object' && 
        typeof seat.position.x === 'number' && 
        typeof seat.position.y === 'number' &&
        !isNaN(seat.position.x) && 
        !isNaN(seat.position.y)) {
      
      seatX = seat.position.x;
      seatY = seat.position.y;
      usingJsonCoordinates = true;
      
    } else {
      // ❌ FALLBACK: Calculate position based on hardcoded theater layout
      console.warn(`⚠️ No valid JSON coordinates for seat ${seat.id}, using fallback layout`);
      const layout = getTheaterLayout(sectionName, seatIndex, totalSeatsInSection);
      seatX = layout.x;
      seatY = layout.y;
    }
    
    const seatColor = getSeatColor(seat);
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    
    // Enhanced debugging for first few seats
    if (seatIndex < 5) {
      console.log(`🎫 Rendering seat ${seatIndex} in ${sectionName}:`, {
        id: seat.id,
        section: seat.section_name,
        row: seat.row_letter,
        number: seat.seat_number,
        position: seat.position,
        positionType: typeof seat.position,
        positionX: seat.position?.x,
        positionY: seat.position?.y,
        calculatedX: seatX,
        calculatedY: seatY,
        usingJsonCoordinates,
        color: seatColor
      });
    }
    
    return (
      <Circle
        key={seat.id}
        cx={seatX}
        cy={seatY}
        r={isSelected ? 12 : 10}
        fill={seatColor}
        stroke={isSelected ? "#ffffff" : "#cccccc"}
        strokeWidth={isSelected ? 2 : 1}
        onPress={() => handleSeatPress(seat)}
      />
    );
  };

  const renderSeatsBySection = () => {
    const seatsBySection = seats.reduce((acc, seat) => {
      const sectionName = seat.section_name || 'Unknown';
      if (!acc[sectionName]) {
        acc[sectionName] = [];
      }
      acc[sectionName].push(seat);
      return acc;
    }, {} as Record<string, Seat[]>);

    return Object.entries(seatsBySection).map(([sectionName, sectionSeats]) => (
      <React.Fragment key={sectionName}>
        {/* Section Label positioned based on section */}
        <SvgText
          x={getSectionLabelPosition(sectionName).x}
          y={getSectionLabelPosition(sectionName).y}
          textAnchor="start"
          fill="#94a3b8"
          fontSize="16"
          fontWeight="bold"
        >
          {sectionName}
        </SvgText>
        {/* Seats in this section */}
        {sectionSeats.map((seat, seatIndex) => renderSeat(seat, sectionName, seatIndex, sectionSeats.length))}
      </React.Fragment>
    ));
  };

  const getSectionLabelPosition = (sectionName: string) => {
    const stageY = 100;
    const centerX = 700;
    
    switch (sectionName) {
      case 'Premium Orchestra':
        return { x: centerX - 100, y: stageY + 60 };
      case 'Mezzanine':
        return { x: centerX - 80, y: stageY + 230 };
      case 'Balcony':
        return { x: centerX - 60, y: stageY + 380 };
      case 'Side Left':
        return { x: 50, y: stageY + 100 };
      case 'Side Right':
        return { x: 1050, y: stageY + 100 };
      default:
        return { x: 50, y: stageY + 200 };
    }
  };

  const renderLegend = () => (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
        <Text style={styles.legendText}>Available</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
        <Text style={styles.legendText}>Selected</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
        <Text style={styles.legendText}>Reserved</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
        <Text style={styles.legendText}>Booked</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading seat map...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSeatMapData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        maximumZoomScale={3}
        minimumZoomScale={0.5}
        bouncesZoom={true}
      >
        <Svg
          width={screenWidth - 20}
          height={400}
          viewBox="0 0 1400 700"
          style={styles.svg}
        >
          {/* Stage */}
          <Path
            d="M 400 50 L 1000 50 L 980 100 L 420 100 Z"
            fill="#2a2a2a"
            stroke="#444"
            strokeWidth="2"
          />
          <SvgText
            x="700"
            y="80"
            textAnchor="middle"
            fill="#888"
            fontSize="24"
            fontWeight="bold"
          >
            STAGE
          </SvgText>

          {/* Seats */}
          {renderSeatsBySection()}
        </Svg>
      </ScrollView>
      
      {renderLegend()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    flexGrow: 1,
  },
  svg: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    margin: 10,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1F2937',
    padding: 8,
    marginHorizontal: 10,
    marginTop: 5,
    marginBottom: 8,
    borderRadius: 8,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 5,
    marginVertical: 2,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 