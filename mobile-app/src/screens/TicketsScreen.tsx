import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Share,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api/client';
import { UserBooking } from '../types';
import { TicketsScreenProps } from '../types/navigation';

const { width } = Dimensions.get('window');

export default function TicketsScreen({ navigation }: TicketsScreenProps) {
  const { state: authState } = useAuth();
  const [tickets, setTickets] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<UserBooking | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadTickets = async () => {
    try {
      setError(null);
      console.log('🎫 Loading user tickets...');
      
      if (!authState.isAuthenticated) {
        console.log('❌ User not authenticated');
        setError('Please sign in to view your tickets');
        return;
      }

      const userTickets = await apiClient.getUserBookings();
      console.log('🎫 Loaded tickets:', userTickets.length);
      
      setTickets(userTickets);
    } catch (err) {
      console.error('❌ Error loading tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [authState.isAuthenticated]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const handleAddToWallet = async (ticket: UserBooking) => {
    // TODO: Implement Apple Wallet/Google Pay integration
    Alert.alert(
      'Add to Wallet',
      'Apple Wallet integration coming soon! For now, use the QR code at the venue.',
      [{ text: 'OK' }]
    );
  };

  const handleShareTicket = async (ticket: UserBooking) => {
    try {
      const message = `🎭 ${ticket.show?.title || 'Show'} Ticket
📅 ${ticket.show?.date} at ${ticket.show?.time}
🎫 Confirmation: ${ticket.validationCode}
📍 ${ticket.show?.venue_name}
🗺️ ${ticket.show?.venue?.address || 'Address TBD'}

See you at the show!`;

      await Share.share({
        message,
        title: `${ticket.show?.title} Ticket`,
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  const handleOpenInMaps = async (ticket: UserBooking) => {
    try {
      const address = ticket.show?.venue?.address;
      if (!address) {
        Alert.alert('Address Not Available', 'The venue address is not yet available for this show.');
        return;
      }

      // Encode address for URL
      const encodedAddress = encodeURIComponent(address);
      
      // Try Apple Maps first (iOS default)
      const appleMapsUrl = `http://maps.apple.com/?q=${encodedAddress}`;
      
      // Check if Apple Maps can be opened
      const canOpenAppleMaps = await Linking.canOpenURL(appleMapsUrl);
      
      if (canOpenAppleMaps) {
        await Linking.openURL(appleMapsUrl);
      } else {
        // Fallback to Google Maps
        const googleMapsUrl = `https://maps.google.com/maps?q=${encodedAddress}`;
        await Linking.openURL(googleMapsUrl);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Unable to open maps app.');
    }
  };

  const handleTicketPress = (ticket: UserBooking) => {
    console.log('🎫 Ticket pressed:', {
      id: ticket.id,
      validationCode: ticket.validationCode,
      status: ticket.status,
      showTitle: ticket.show?.title,
      qrValue: `LML-${ticket.validationCode}`,
      hasValidationCode: !!ticket.validationCode,
      validationCodeLength: ticket.validationCode?.length || 0
    });
    setSelectedTicket(ticket);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTicket(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5); // "19:30:00" -> "19:30"
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const renderTicket = ({ item: ticket }: { item: UserBooking }) => {
    console.log('🔍 Rendering ticket:', {
      id: ticket.id,
      validationCode: ticket.validationCode,
      qrValue: `LML-${ticket.validationCode}`,
      hasValidationCode: !!ticket.validationCode
    });
    
    const isUpcoming = ticket.show?.date ? new Date(ticket.show.date) >= new Date() : false;
    const statusColor = getStatusColor(ticket.status);

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => handleTicketPress(ticket)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={isUpcoming ? ['#1F2937', '#374151'] : ['#374151', '#4B5563']}
          style={styles.ticketGradient}
        >
          {/* Header */}
          <View style={styles.ticketHeader}>
            <View style={styles.ticketInfo}>
              <Text style={styles.showTitle} numberOfLines={1}>
                {ticket.show?.title || 'Show'}
              </Text>
              <Text style={styles.venueText}>
                {ticket.show?.venue_name || 'Venue'}
              </Text>
            </View>
            
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>
                {getStatusText(ticket.status)}
              </Text>
            </View>
          </View>

          {/* Event Details */}
          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
              <Text style={styles.detailText}>
                {ticket.show?.date ? formatDate(ticket.show.date) : 'Date TBD'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#9CA3AF" />
              <Text style={styles.detailText}>
                {ticket.show?.time ? formatTime(ticket.show.time) : 'Time TBD'}
              </Text>
            </View>
          </View>

          {/* Ticket Information */}
          <View style={styles.ticketInfo}>
            <View style={styles.confirmationRow}>
              <View>
                <Text style={styles.confirmationLabel}>Confirmation</Text>
                <Text style={styles.confirmationCode}>{ticket.validationCode}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.totalAmount}>
                  £{(ticket.totalAmountPence / 100).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Seats Information */}
          {ticket.seats && ticket.seats.length > 0 && (
            <View style={styles.seatsSection}>
              <Text style={styles.seatsSectionTitle}>Your Seats</Text>
              <View style={styles.seatsContainer}>
                {ticket.seats.map((seat: any, index) => (
                  <View key={seat.id || index} style={styles.seatBadge}>
                    <Text style={styles.seatText}>
                      {seat.seat && seat.seat[5] && seat.seat[6] ? 
                        `${seat.seat[5]} ${seat.seat[6]}` : 
                        `Seat ${index + 1}`
                      }
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAddToWallet(ticket)}
            >
              <Ionicons name="wallet-outline" size={20} color="#3B82F6" />
              <Text style={styles.actionButtonText}>Add to Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleShareTicket(ticket)}
            >
              <Ionicons name="share-outline" size={20} color="#3B82F6" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderUnauthenticatedState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="person-circle-outline" size={64} color="#3B82F6" />
      <Text style={styles.emptyTitle}>Please log in or sign up to see your tickets stored</Text>
      <Text style={styles.emptyMessage}>
        Sign in to view your ticket bookings and manage your reservations.
      </Text>
      <View style={styles.authButtons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="ticket-outline" size={64} color="#6B7280" />
      <Text style={styles.emptyTitle}>No Tickets Yet</Text>
      <Text style={styles.emptyMessage}>
        Your booked tickets will appear here. Start by browsing shows and booking your first ticket!
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.browseButtonText}>Browse Shows</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text style={styles.emptyTitle}>Something went wrong</Text>
      <Text style={styles.emptyMessage}>{error}</Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => {
          if (!authState.isAuthenticated) {
            navigation.navigate('Login');
          } else {
            loadTickets();
          }
        }}
      >
        <Text style={styles.browseButtonText}>
          {!authState.isAuthenticated ? 'Sign In' : 'Try Again'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1F2937', '#374151']} style={styles.gradient}>
          <StatusBar style="light" />
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Tickets</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading your tickets...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1F2937', '#374151']} style={styles.gradient}>
        <StatusBar style="light" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Tickets</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        {!authState.isAuthenticated ? (
          renderUnauthenticatedState()
        ) : error ? (
          renderErrorState()
        ) : tickets.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={tickets}
            renderItem={renderTicket}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3B82F6']}
                tintColor="#3B82F6"
              />
            }
          />
        )}
      </LinearGradient>

      {/* Ticket Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTicket && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Your Ticket</Text>
                  <View style={styles.modalSpacer} />
                </View>

                <View style={styles.modalTicketContent}>
                  <Text style={styles.modalShowTitle}>{selectedTicket.show?.title}</Text>
                  <Text style={styles.modalVenueText}>{selectedTicket.show?.venue_name}</Text>
                  {selectedTicket.show?.venue?.address && (
                    <TouchableOpacity 
                      style={styles.modalAddressButton}
                      onPress={() => {
                        closeModal();
                        handleOpenInMaps(selectedTicket);
                      }}
                    >
                      <Ionicons name="location-outline" size={16} color="#3B82F6" />
                      <Text style={styles.modalAddressText} numberOfLines={2}>
                        {selectedTicket.show.venue.address}
                      </Text>
                      <Ionicons name="open-outline" size={16} color="#3B82F6" />
                    </TouchableOpacity>
                  )}
                  
                  <View style={styles.modalDetailsRow}>
                    <View style={styles.modalDetailItem}>
                      <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                      <Text style={styles.modalDetailText}>
                        {selectedTicket.show?.date ? formatDate(selectedTicket.show.date) : 'Date TBD'}
                      </Text>
                    </View>
                    <View style={styles.modalDetailItem}>
                      <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                      <Text style={styles.modalDetailText}>
                        {selectedTicket.show?.time ? formatTime(selectedTicket.show.time) : 'Time TBD'}
                      </Text>
                    </View>
                  </View>

                  {/* Large QR Code */}
                  <View style={styles.modalQRSection}>
                    <Text style={styles.qrLabel}>Show this at the venue</Text>
                    <View style={styles.modalQRContainer}>
                      {selectedTicket.validationCode ? (
                        <QRCode
                          value={`LML-${selectedTicket.validationCode}`}
                          size={200}
                          color="#000000"
                          backgroundColor="#FFFFFF"
                        />
                      ) : (
                        <View style={{ width: 200, height: 200, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderRadius: 16 }}>
                          <Text style={{ color: '#000000', fontSize: 16, textAlign: 'center' }}>No Validation Code</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.modalConfirmationCode}>
                      {selectedTicket.validationCode}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalActionButton}
                      onPress={() => {
                        closeModal();
                        handleAddToWallet(selectedTicket);
                      }}
                    >
                      <Ionicons name="wallet-outline" size={20} color="#3B82F6" />
                      <Text style={styles.modalActionText}>Add to Wallet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalActionButton}
                      onPress={() => {
                        closeModal();
                        handleShareTicket(selectedTicket);
                      }}
                    >
                      <Ionicons name="share-outline" size={20} color="#3B82F6" />
                      <Text style={styles.modalActionText}>Share Ticket</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  listContent: {
    padding: 16,
  },
  ticketCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  ticketGradient: {
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketInfo: {
    flex: 1,
    marginRight: 12,
  },
  showTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  venueText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eventDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#E5E7EB',
    flex: 1,
  },
  imageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  ticketImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
  },
  ticketImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  ticketImageFallback: {
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketImageFallbackText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  confirmationDetails: {
    flex: 1,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  confirmationLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  confirmationCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  seatsSection: {
    marginBottom: 12,
  },
  seatsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  seatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  seatBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  seatText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  authButtons: {
    width: '100%',
    maxWidth: 300,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSpacer: {
    width: 40,
  },
  modalTicketContent: {
    padding: 24,
    alignItems: 'center',
  },
  modalShowTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalVenueText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#E5E7EB',
  },
  modalQRSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalQRContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalConfirmationCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  modalActionText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Added styles for image and location
  ticketMainInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  showImageContainer: {
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  showImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  modalAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  modalAddressText: {
    flex: 1,
    fontSize: 14,
    color: '#3B82F6',
    marginHorizontal: 8,
  },
  showImageFallback: {
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  showImageFallbackText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
}); 