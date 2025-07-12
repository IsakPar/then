import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/api/client';
import { Show } from '../types';
import { HomeScreenProps } from '../types/navigation';

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { state: authState, logout } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('home');

  const loadShows = async () => {
    try {
      console.log('HomeScreen: Starting to fetch shows...');
      const showsData = await apiClient.getShows();
      console.log('HomeScreen: Fetched shows:', showsData.length, 'shows');
      console.log('HomeScreen: First show:', showsData[0]?.title);
      console.log('HomeScreen: First show image URL:', showsData[0]?.imageUrl);
      console.log('HomeScreen: First show pricing:', showsData[0]?.min_price, '-', showsData[0]?.max_price);
      setShows(showsData);
      setFailedImages(new Set()); // Reset failed images on new load
    } catch (error) {
      console.error('HomeScreen: Error fetching shows:', error);
      Alert.alert('Error', 'Failed to load shows. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('HomeScreen: Component mounted, loading shows...');
    loadShows();
  }, []);

  const onRefresh = () => {
    console.log('HomeScreen: Refreshing shows...');
    setRefreshing(true);
    loadShows();
  };

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    
    if (tab === 'account') {
      if (authState.isAuthenticated) {
        // Show account options for authenticated users
        Alert.alert(
          'Account',
          `Welcome, ${authState.user?.name || authState.user?.email}!`,
          [
            { text: 'My Bookings', onPress: () => handleMyBookings() },
            { text: 'Logout', onPress: () => handleLogout(), style: 'destructive' },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        // Show login options for non-authenticated users
        Alert.alert(
          'Account',
          'Sign in to view your bookings and manage your account.',
          [
            { text: 'Sign In', onPress: () => navigation.navigate('Login') },
            { text: 'Create Account', onPress: () => navigation.navigate('Signup') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } else if (tab === 'tickets') {
      if (authState.isAuthenticated) {
        handleMyBookings();
      } else {
        Alert.alert(
          'My Tickets',
          'Sign in to view your ticket bookings.',
          [
            { text: 'Sign In', onPress: () => navigation.navigate('Login') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    }
  };

  const handleMyBookings = () => {
    navigation.navigate('Tickets');
  };

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert('Success', 'You have been logged out successfully.');
      setActiveTab('home'); // Reset to home tab
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const renderShow = ({ item }: { item: Show }) => {
    const hasValidImage = item.imageUrl && !failedImages.has(item.id);
    const minPrice = item.min_price || 0;
    const maxPrice = item.max_price || 0;
    const isMockShow = item.id.startsWith('mock-');
    
    const handleShowPress = () => {
      if (isMockShow) {
        Alert.alert(
          'Coming Soon',
          `${item.title} tickets will be available soon! Check back later for last-minute opportunities.`,
          [{ text: 'OK' }]
        );
      } else {
        navigation.navigate('SeatSelection', { showId: item.id, show: item });
      }
    };
    
    return (
      <TouchableOpacity
        style={styles.showCard}
        onPress={handleShowPress}
      >
        <View style={styles.imageContainer}>
          {hasValidImage ? (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.showImage}
              onError={() => {
                console.log('Image failed to load for show:', item.title, 'URL:', item.imageUrl);
                setFailedImages(prev => new Set([...prev, item.id]));
              }}
            />
          ) : (
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              style={styles.showImage}
            >
              <Text style={styles.fallbackImageText}>{item.title}</Text>
            </LinearGradient>
          )}
          <View style={styles.imageOverlay}>
            <Text style={styles.venueText}>{item.venue_name}</Text>
            {isMockShow && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.showInfo}>
          <Text style={styles.showTitle}>{item.title}</Text>
          <Text style={styles.showDate}>
            {apiClient.formatDate(item.date)} at {apiClient.formatTime(item.time)}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>From </Text>
            <Text style={styles.priceValue}>
              {apiClient.formatPrice(minPrice * 100)}
              {maxPrice > minPrice && (
                <Text style={styles.priceRange}>
                  {' '}- {apiClient.formatPrice(maxPrice * 100)}
                </Text>
              )}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading shows...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header with Logo */}
      <LinearGradient
        colors={['#1F2937', '#111827']}
        style={styles.header}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/lastminutelive-logo-transparent.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.headerSubtitle}>Available Shows</Text>
      </LinearGradient>
      
      {/* Main Content */}
      <View style={styles.content}>
        {shows.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shows available</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={shows}
            renderItem={renderShow}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.showsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3B82F6"
              />
            }
          />
        )}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'account' && styles.navItemActive]}
          onPress={() => handleTabPress('account')}
        >
          <Text style={[styles.navText, activeTab === 'account' && styles.navTextActive]}>
            Account
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
          onPress={() => handleTabPress('home')}
        >
          <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'tickets' && styles.navItemActive]}
          onPress={() => handleTabPress('tickets')}
        >
          <Text style={[styles.navText, activeTab === 'tickets' && styles.navTextActive]}>
            Tickets
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    padding: 20,
    paddingTop: 0, // No top padding
    paddingBottom: 0, // No bottom padding to move content up
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 0, // Remove margin to move content up
    marginTop: -70, // Maximum negative margin to pull logo up as high as possible
    zIndex: -1, // Negative z-index to appear behind show cards
    position: 'relative', // Enable z-index positioning
  },
  logo: {
    width: 800, // Double the width from 400 to 800
    height: 240, // Double the height from 120 to 240
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: -80, // Increased negative margin to pull text up even higher
    zIndex: 20, // Higher z-index to appear above show cards
    position: 'relative', // Enable z-index positioning
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  showsList: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for bottom navigation
    marginTop: 15, // Increased from 5 to 15 to add 10 more pixels of space
    zIndex: 10, // Higher z-index to appear above logo
    position: 'relative', // Enable z-index positioning
  },
  showCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  showImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#374151',
  },
  fallbackImageText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
  },
  venueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  showInfo: {
    padding: 16,
  },
  showTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  showDate: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  priceRange: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#9CA3AF',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comingSoonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#3B82F6',
  },
  navText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  navTextActive: {
    color: '#FFFFFF',
  },
}); 