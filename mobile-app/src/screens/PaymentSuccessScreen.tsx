import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

import apiClient from '../lib/api/client';
import { RootStackParamList } from '../types/navigation';

const { width } = Dimensions.get('window');

type PaymentSuccessScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PaymentSuccess'
>;

type PaymentSuccessScreenRouteProp = RouteProp<
  RootStackParamList,
  'PaymentSuccess'
>;

interface Props {
  navigation: PaymentSuccessScreenNavigationProp;
  route: PaymentSuccessScreenRouteProp;
}

export default function PaymentSuccessScreen({ navigation, route }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get sessionId from route params or URL
    const getSessionId = async () => {
      let id = route.params?.sessionId;
      
      if (!id) {
        // Try to get from URL (for deep linking)
        const url = await Linking.getInitialURL();
        if (url) {
          const parsed = Linking.parse(url);
          id = parsed.queryParams?.session_id as string;
        }
      }
      
      if (id) {
        setSessionId(id);
        fetchBookingDetails(id);
      } else {
        setError('No session ID found. Please try booking again.');
        setLoading(false);
      }
    };

    getSessionId();
  }, [route.params]);

  const fetchBookingDetails = async (id: string) => {
    try {
      setLoading(true);
      console.log('🎫 Fetching booking details for session:', id);
      
      const details = await apiClient.getBookingConfirmation(id);
      console.log('✅ Booking details received:', details);
      
      setBookingDetails(details);
    } catch (err) {
      console.error('❌ Error fetching booking details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('Home');
  };

  const handleViewTickets = () => {
    navigation.navigate('Tickets');
  };

  const handleAddToWallet = async () => {
    // TODO: Implement Apple Wallet/Google Pay integration
    Alert.alert(
      'Add to Wallet',
      'Apple Wallet integration coming soon! Your ticket QR code is ready to use at the venue.',
      [{ text: 'OK' }]
    );
  };

  const handleShareTicket = async () => {
    if (!bookingDetails) return;
    
    try {
      const showTitle = bookingDetails.show_details?.title || 'Show';
      const venue = bookingDetails.show_details?.venue_name || 'Venue';
      const date = bookingDetails.show_details?.date || 'Date TBD';
      const time = bookingDetails.show_details?.time || 'Time TBD';
      
      const message = `🎭 ${showTitle} Ticket
📅 ${date} at ${time}
🎫 Confirmation: ${bookingDetails.verification_code}
📍 ${venue}

See you at the show!`;

      await Share.share({
        message,
        title: `${showTitle} Ticket`,
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Date TBD';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'Time TBD';
    return timeStr.slice(0, 5); // "19:30:00" -> "19:30"
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1F2937', '#374151']}
          style={styles.gradient}
        >
          <StatusBar style="light" />
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>
              Processing your booking...
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1F2937', '#374151']}
          style={styles.gradient}
        >
          <StatusBar style="light" />
          <View style={styles.centerContent}>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.errorTitle}>Booking Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            
            {sessionId && (
              <TouchableOpacity
                style={styles.button}
                onPress={() => fetchBookingDetails(sessionId)}
              >
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleContinue}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Go to Home
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1F2937', '#374151']}
        style={styles.gradient}
      >
        <StatusBar style="light" />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Header */}
          <View style={styles.header}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSubtitle}>
              Your tickets are ready! Present the QR code at the venue.
            </Text>
          </View>

          {bookingDetails && (
            <>
              {/* QR Code Section */}
              <View style={styles.qrSection}>
                <View style={styles.qrCodeContainer}>
                  <QRCode
                    value={`LML-${bookingDetails.verification_code}`}
                    size={120}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                <View style={styles.confirmationBox}>
                  <Text style={styles.confirmationLabel}>Confirmation Code</Text>
                  <Text style={styles.confirmationCode}>
                    {bookingDetails.verification_code}
                  </Text>
                </View>
              </View>

              {/* Show Information */}
              {bookingDetails.show_details && (
                <View style={styles.showInfoSection}>
                  <Text style={styles.sectionTitle}>Event Details</Text>
                  
                  <View style={styles.showCard}>
                    <View style={styles.infoRow}>
                      <Ionicons name="musical-notes-outline" size={20} color="#3B82F6" />
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Show</Text>
                        <Text style={styles.infoValue}>
                          {bookingDetails.show_details.title || bookingDetails.show_details.name}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>
                          {formatDate(bookingDetails.show_details.date)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={20} color="#3B82F6" />
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Time</Text>
                        <Text style={styles.infoValue}>
                          {formatTime(bookingDetails.show_details.time)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={20} color="#3B82F6" />
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Venue</Text>
                        <Text style={styles.infoValue}>
                          {bookingDetails.show_details.venue_name || 
                           bookingDetails.show_details.venue?.name}
                        </Text>
                        {bookingDetails.show_details.location && (
                          <Text style={styles.infoSubValue}>
                            {bookingDetails.show_details.location}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Seats Information */}
              {bookingDetails.show_details?.seats && bookingDetails.show_details.seats.length > 0 && (
                <View style={styles.seatsSection}>
                  <Text style={styles.sectionTitle}>Your Seats</Text>
                  <View style={styles.seatsGrid}>
                    {bookingDetails.show_details.seats.map((seat: any, index: number) => (
                      <View key={index} style={styles.seatCard}>
                        <View style={styles.seatHeader}>
                          <Text style={styles.seatSection}>{seat.section_name}</Text>
                          <Text style={styles.seatPrice}>£{seat.price_paid?.toFixed(2)}</Text>
                        </View>
                        <Text style={styles.seatDetails}>
                          Row {seat.row} • Seat {seat.number}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Payment Summary */}
              <View style={styles.paymentSection}>
                <Text style={styles.sectionTitle}>Payment Summary</Text>
                <View style={styles.paymentCard}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Total Paid</Text>
                    <Text style={styles.paymentAmount}>
                      £{((bookingDetails.amount_total || 0) / 100).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Payment Status</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Confirmed</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionSection}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleAddToWallet}
                >
                  <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Add to Wallet</Text>
                </TouchableOpacity>

                <View style={styles.secondaryButtons}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleShareTicket}
                  >
                    <Ionicons name="share-outline" size={20} color="#3B82F6" />
                    <Text style={styles.secondaryButtonText}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleViewTickets}
                  >
                    <Ionicons name="ticket-outline" size={20} color="#3B82F6" />
                    <Text style={styles.secondaryButtonText}>My Tickets</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Important Information */}
              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>Important Information</Text>
                <View style={styles.infoBullets}>
                  <Text style={styles.infoBullet}>
                    • Present this QR code at the venue for entry
                  </Text>
                  <Text style={styles.infoBullet}>
                    • Arrive 30 minutes before show time
                  </Text>
                  <Text style={styles.infoBullet}>
                    • A confirmation email has been sent
                  </Text>
                  <Text style={styles.infoBullet}>
                    • Contact venue for any assistance needed
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Footer Navigation */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={handleContinue}
            >
              <Text style={styles.homeButtonText}>Continue Browsing</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  qrSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  qrCodeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmationBox: {
    alignItems: 'center',
  },
  confirmationLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  confirmationCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  showInfoSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  showCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoSubValue: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 2,
  },
  seatsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  seatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  seatCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    minWidth: (width - 72) / 2,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  seatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  seatSection: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  seatPrice: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  seatDetails: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  paymentSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  paymentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  paymentAmount: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoBullets: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  infoBullet: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    paddingHorizontal: 24,
  },
  homeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6B7280',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
  },
  // Legacy styles for error states
  button: {
    backgroundColor: '#10B981',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
}); 