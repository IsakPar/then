import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Hamilton Victoria Palace Theatre - Realistic 1000-seat layout
const HAMILTON_THEATER_LAYOUT = {
  name: "Victoria Palace Theatre",
  totalSeats: 1000,
  sections: [
    {
      id: "stalls",
      name: "Stalls",
      displayName: "Stalls",
      description: "Main floor - Best views",
      color: "#ffd700", // Premium Gold - matches web
      lightColor: "#ffeb3b",
      darkColor: "#ffb300",
      price: 8500, // £85.00
      rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"],
      seatsPerRow: [20, 22, 24, 24, 26, 26, 26, 26, 26, 26, 26, 26, 24, 24, 22, 20],
      totalSeats: 396,
      availableSeats: 79, // 20%
      position: { top: 320, left: 20 },
      curved: true,
      premium: true
    },
    {
      id: "dress-circle",
      name: "Dress Circle", 
      displayName: "Dress Circle",
      description: "First balcony - Premium elevated",
      color: "#ab47bc", // Purple gradient - matches web
      lightColor: "#ce93d8", 
      darkColor: "#8e24aa",
      price: 7500, // £75.00
      rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
      seatsPerRow: [18, 20, 22, 24, 26, 26, 26, 26, 24, 22, 20, 18],
      totalSeats: 272,
      availableSeats: 54, // 20%
      position: { top: 200, left: 40 },
      curved: true,
      premium: true
    },
    {
      id: "upper-circle",
      name: "Upper Circle",
      displayName: "Upper Circle", 
      description: "Second balcony - Great value",
      color: "#66bb6a", // Green gradient - matches web
      lightColor: "#81c784",
      darkColor: "#43a047", 
      price: 5500, // £55.00
      rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
      seatsPerRow: [16, 18, 20, 22, 24, 24, 22, 20, 18, 16],
      totalSeats: 200,
      availableSeats: 40, // 20%
      position: { top: 100, left: 60 },
      curved: true,
      premium: false
    },
    {
      id: "grand-circle",
      name: "Grand Circle",
      displayName: "Grand Circle",
      description: "Top level - Budget friendly", 
      color: "#ff7043", // Orange gradient - matches web
      lightColor: "#ff8a65",
      darkColor: "#f4511e",
      price: 3500, // £35.00
      rows: ["A", "B", "C", "D", "E", "F", "G", "H"],
      seatsPerRow: [12, 14, 16, 18, 18, 16, 14, 12],
      totalSeats: 120,
      availableSeats: 24, // 20%
      position: { top: 20, left: 80 },
      curved: false,
      premium: false
    }
  ]
};

interface Seat {
  id: string;
  row: string;
  number: number;
  section: string;
  price: number;
  status: 'available' | 'selected' | 'booked';
  position: { x: number; y: number };
}

interface HamiltonSeatMapProps {
  onSeatSelect: (seat: Seat) => void;
  onSeatDeselect: (seatId: string) => void;
  selectedSeats: Seat[];
  maxSeats?: number;
}

export default function HamiltonSeatMap({ 
  onSeatSelect, 
  onSeatDeselect, 
  selectedSeats = [],
  maxSeats = 6 
}: HamiltonSeatMapProps) {
  const [allSeats, setAllSeats] = useState<Seat[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  // Generate all seats based on layout
  useEffect(() => {
    const seats: Seat[] = [];
    let seatIdCounter = 1;

    HAMILTON_THEATER_LAYOUT.sections.forEach(section => {
      section.rows.forEach((rowLetter, rowIndex) => {
        const seatsInThisRow = section.seatsPerRow[rowIndex];
        
        for (let seatNum = 1; seatNum <= seatsInThisRow; seatNum++) {
          // Calculate if this seat should be available (20% availability)
          const isAvailable = (seatIdCounter % 5) === 1; // Every 5th seat
          
          seats.push({
            id: `${section.id}-${rowLetter}${seatNum}`,
            row: rowLetter,
            number: seatNum,
            section: section.id,
            price: section.price,
            status: isAvailable ? 'available' : 'booked',
            position: {
              x: section.position.left + (seatNum * 30) + (section.curved ? Math.sin(seatNum * 0.1) * 10 : 0),
              y: section.position.top + (rowIndex * 35)
            }
          });
          seatIdCounter++;
        }
      });
    });

    setAllSeats(seats);
  }, []);

  const handleSeatPress = (seat: Seat) => {
    if (seat.status === 'booked') {
      Alert.alert('Seat Unavailable', 'This seat has already been booked.');
      return;
    }

    const isSelected = selectedSeats.some(s => s.id === seat.id);
    
    if (isSelected) {
      onSeatDeselect(seat.id);
    } else {
      if (selectedSeats.length >= maxSeats) {
        Alert.alert(
          'Maximum Seats',
          `You can select up to ${maxSeats} seats at a time.`,
          [{ text: 'OK' }]
        );
        return;
      }
      onSeatSelect({ ...seat, status: 'selected' });
    }
  };

  const getSeatColor = (seat: Seat) => {
    const section = HAMILTON_THEATER_LAYOUT.sections.find(s => s.id === seat.section)!;
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    const isHovered = hoveredSeat === seat.id;

    if (seat.status === 'booked') {
      return '#94A3B8'; // Gray for booked
    }
    if (isSelected) {
      return '#4a90e2'; // Blue for selected - matches web
    }
    if (isHovered) {
      return section.lightColor;
    }
    return section.color;
  };

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(0)}`;
  };

  const renderSection = (section: typeof HAMILTON_THEATER_LAYOUT.sections[0]) => {
    const sectionSeats = allSeats.filter(seat => seat.section === section.id);
    const availableSeats = sectionSeats.filter(seat => seat.status === 'available');

    return (
      <View key={section.id} style={[styles.section, { top: section.position.top, left: section.position.left }]}>
        {/* Section Header */}
        <LinearGradient
          colors={[section.lightColor, section.color, section.darkColor]}
          style={styles.sectionHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.sectionTitle}>{section.displayName}</Text>
          <Text style={styles.sectionPrice}>{formatPrice(section.price)}</Text>
          <Text style={styles.sectionAvailable}>
            {availableSeats.length} available
          </Text>
        </LinearGradient>

        {/* Seats Grid */}
        <View style={styles.seatsContainer}>
          {section.rows.map((rowLetter, rowIndex) => {
            const rowSeats = sectionSeats.filter(seat => seat.row === rowLetter);
            
            return (
              <View key={rowLetter} style={[
                styles.row,
                section.curved && { 
                  marginLeft: Math.abs(section.rows.length / 2 - rowIndex) * 8,
                  transform: [{ 
                    rotate: section.curved ? `${(rowIndex - section.rows.length / 2) * 2}deg` : '0deg' 
                  }]
                }
              ]}>
                {/* Row Label */}
                <Text style={styles.rowLabel}>{rowLetter}</Text>
                
                {/* Seats in Row */}
                <View style={styles.rowSeats}>
                  {rowSeats.map(seat => {
                    const isSelected = selectedSeats.some(s => s.id === seat.id);
                    const isHovered = hoveredSeat === seat.id;
                    
                    return (
                      <TouchableOpacity
                        key={seat.id}
                        style={[
                          styles.seat,
                          {
                            backgroundColor: getSeatColor(seat),
                            transform: [
                              { scale: isSelected ? 1.2 : (isHovered ? 1.1 : 1) },
                            ],
                            shadowOpacity: isSelected ? 0.8 : (isHovered ? 0.4 : 0.2),
                            elevation: isSelected ? 8 : (isHovered ? 4 : 2),
                          }
                        ]}
                        onPress={() => handleSeatPress(seat)}
                        onPressIn={() => setHoveredSeat(seat.id)}
                        onPressOut={() => setHoveredSeat(null)}
                        activeOpacity={0.7}
                        disabled={seat.status === 'booked'}
                      >
                        <Text style={[
                          styles.seatNumber,
                          { 
                            color: seat.status === 'booked' ? '#64748B' : '#FFFFFF',
                            fontWeight: isSelected ? 'bold' : 'normal'
                          }
                        ]}>
                          {seat.number}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stage */}
      <LinearGradient
        colors={['#1F2937', '#374151', '#4B5563']}
        style={styles.stage}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.stageText}>🎭 STAGE</Text>
        <Text style={styles.stageSubtext}>Hamilton</Text>
      </LinearGradient>

      {/* Theater Layout */}
      <ScrollView 
        style={styles.theaterContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.theaterContent}
      >
        <View style={styles.theater}>
          {HAMILTON_THEATER_LAYOUT.sections.map(renderSection)}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSeat, { backgroundColor: '#ffd700' }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSeat, { backgroundColor: '#4a90e2' }]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSeat, { backgroundColor: '#94A3B8' }]} />
          <Text style={styles.legendText}>Booked</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  stage: {
    height: 80,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  stageText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  stageSubtext: {
    color: '#D1D5DB',
    fontSize: 14,
    marginTop: 4,
  },
  theaterContainer: {
    flex: 1,
    marginTop: 20,
  },
  theaterContent: {
    paddingBottom: 100,
  },
  theater: {
    position: 'relative',
    height: 600,
    marginHorizontal: 10,
  },
  section: {
    position: 'absolute',
    minWidth: width - 120,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionPrice: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
  },
  sectionAvailable: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 2,
  },
  seatsContainer: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  rowLabel: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: 'bold',
    width: 24,
    textAlign: 'center',
    marginRight: 8,
  },
  rowSeats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  seat: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 1,
    marginVertical: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  seatNumber: {
    fontSize: 10,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendSeat: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    color: '#E5E7EB',
    fontSize: 14,
  },
}); 