import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import apiClient from '../lib/api/client';
import { Show, Seat } from '../types';
import SeatMap from '../components/SeatMap';
import { SeatSelectionScreenProps } from '../types/navigation';

export default function SeatSelectionScreen({ navigation, route }: SeatSelectionScreenProps) {
  const { showId, show } = route.params;

  const [showDetails, setShowDetails] = useState<Show>(show);
  const [loading, setLoading] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadShowDetails = async () => {
    try {
      setLoading(true);
      const updatedShow = await apiClient.getShow(showId);
      setShowDetails(updatedShow);
    } catch (error) {
      Alert.alert('Error', 'Failed to load show details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!show.seat_pricing) {
      loadShowDetails();
    }
  }, []);

  // ============================================================================
  // SEAT SELECTION LOGIC
  // ============================================================================

  const handleSeatSelect = (seat: Seat) => {
    setSelectedSeats(prev => [...prev, seat]);
  };

  const handleSeatDeselect = (seatId: string) => {
    setSelectedSeats(prev => prev.filter(seat => seat.id !== seatId));
  };

  const getTotalPrice = () => {
    return selectedSeats.reduce((total, seat) => total + (seat.pricePence / 100), 0);
  };

  const getTotalSeats = () => {
    return selectedSeats.length;
  };

  // ============================================================================
  // BOOKING FLOW
  // ============================================================================

  const proceedToCheckout = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert('No Seats Selected', 'Please select at least one seat to continue.');
      return;
    }

    setIsBooking(true);
    
    try {
      // Get the selected seat IDs
      const selectedSeatIds = selectedSeats.map(seat => seat.id);

      // Reserve seats and get Stripe checkout URL
      const reservationResponse = await apiClient.reserveSeats(showId, selectedSeatIds);

      // Navigate to WebView payment screen instead of external browser
      navigation.navigate('PaymentWebView', {
        checkoutUrl: reservationResponse.url,
        showId: showId,
        reservationId: reservationResponse.reservationId,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Booking failed';
      Alert.alert('Booking Error', errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  // ============================================================================
  // RENDER COMPONENTS
  // ============================================================================

  const renderInstructionsModal = () => (
    <Modal
      visible={showInstructions}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.instructionsModalOverlay}>
        <View style={styles.instructionsModalContainer}>
          <Text style={styles.instructionsModalTitle}>How to Select Seats</Text>
          <Text style={styles.instructionsModalText}>
            💡 <Text style={styles.instructionsBold}>Tap seats</Text> to select them{'\n'}
            🔍 <Text style={styles.instructionsBold}>Pinch to zoom</Text> in and out{'\n'}
            👆 <Text style={styles.instructionsBold}>Drag to pan</Text> around the theater
          </Text>
          
          <TouchableOpacity
            style={styles.instructionsModalButton}
            onPress={() => setShowInstructions(false)}
          >
            <Text style={styles.instructionsModalButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );



  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#1F2937', '#374151']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.showTitle}>{showDetails.title}</Text>
            <Text style={styles.showDetails}>
              {apiClient.formatDate(showDetails.date)} at {showDetails.time}
            </Text>
            <Text style={styles.venue}>{showDetails.venue_name}</Text>
          </View>
        </View>



        {/* Seat Map */}
        <View style={styles.seatMapContainer}>
          <SeatMap
            showId={showId}
            onSeatSelect={handleSeatSelect}
            onSeatDeselect={handleSeatDeselect}
            selectedSeats={selectedSeats}
          />
        </View>

        {/* Selection Summary - Always visible with fixed height */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Selected Seats</Text>
            <Text style={styles.seatCount}>{getTotalSeats()} seat{getTotalSeats() !== 1 ? 's' : ''}</Text>
          </View>
          
          <View style={styles.seatListContainer}>
            {selectedSeats.length > 0 ? (
              <ScrollView style={styles.seatList} showsVerticalScrollIndicator={false}>
                {selectedSeats.map((seat) => (
                  <View key={seat.id} style={styles.seatItem}>
                    <View style={styles.seatInfo}>
                      <Text style={styles.seatText}>
                        {seat.section_name} • Row {seat.row_letter} • Seat {seat.seat_number}
                      </Text>
                      <Text style={styles.seatPrice}>
                        {apiClient.formatPrice(seat.pricePence)}
                      </Text>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.removeSeatButton}
                      onPress={() => handleSeatDeselect(seat.id)}
                    >
                      <Text style={styles.removeSeatText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noSeatsContainer}>
                <Text style={styles.noSeatsText}>No seats selected</Text>
              </View>
            )}
          </View>
        </View>

        {/* Booking Button */}
        <View style={styles.bookingContainer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              £{getTotalPrice().toFixed(2)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.bookButton,
              selectedSeats.length === 0 && styles.bookButtonDisabled
            ]}
            onPress={proceedToCheckout}
            disabled={selectedSeats.length === 0 || isBooking}
          >
            {isBooking ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.bookButtonText}>
                Book {getTotalSeats()} Seat{getTotalSeats() !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {renderInstructionsModal()}
      </LinearGradient>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '500',
  },
  headerContent: {
    alignItems: 'center',
  },
  showTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 2,
  },
  showDetails: {
    fontSize: 13,
    color: '#94a3b8',
  },
  venue: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  seatMapContainer: {
    flex: 1,
    maxHeight: 400, // Max height but still flexible
    padding: 8,
  },
  summaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  seatCount: {
    fontSize: 16,
    color: '#94a3b8',
  },
  seatListContainer: {
    height: 150, // Fixed height to maintain consistent layout
  },
  seatList: {
    maxHeight: 150, // Limit scroll height for better UX
  },
  noSeatsContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSeatsText: {
    fontSize: 16,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  seatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  seatInfo: {
    flex: 1,
  },
  seatText: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
  },
  seatPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  removeSeatButton: {
    backgroundColor: '#ef4444',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeSeatText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  bookingContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  bookButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  modalSteps: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  secondaryButtonText: {
    color: '#3b82f6',
  },
  instructionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsModalContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: '#374151',
  },
  instructionsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  instructionsModalText: {
    fontSize: 16,
    color: '#E5E7EB',
    lineHeight: 24,
    marginBottom: 24,
  },
  instructionsBold: {
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  instructionsModalButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  instructionsModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 