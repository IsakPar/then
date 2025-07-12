import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import { RootStackParamList } from '../types/navigation';

type PaymentCancelScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PaymentCancel'
>;

type PaymentCancelScreenRouteProp = RouteProp<
  RootStackParamList,
  'PaymentCancel'
>;

interface Props {
  navigation: PaymentCancelScreenNavigationProp;
  route: PaymentCancelScreenRouteProp;
}

export default function PaymentCancelScreen({ navigation, route }: Props) {
  const [showId, setShowId] = useState<string | null>(null);

  useEffect(() => {
    // Get showId from route params or URL
    const getShowId = async () => {
      let id = route.params?.showId;
      
      if (!id) {
        // Try to get from URL (for deep linking)
        const url = await Linking.getInitialURL();
        if (url) {
          const parsed = Linking.parse(url);
          id = parsed.queryParams?.show_id as string;
        }
      }
      
      setShowId(id || null);
    };

    getShowId();
  }, [route.params]);

  const handleTryAgain = () => {
    if (showId) {
      // Navigate back to the show with the seat selection
      navigation.navigate('SeatSelection', { 
        showId, 
        show: {} as any // We'll need to fetch the show data again
      });
    } else {
      // If no showId, go to home to browse shows
      navigation.navigate('Home');
    }
  };

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1F2937', '#374151']}
        style={styles.gradient}
      >
        <StatusBar style="light" />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.cancelIcon}>❌</Text>
            <Text style={styles.cancelTitle}>Payment Cancelled</Text>
            <Text style={styles.cancelSubtitle}>
              Your payment was cancelled and no charges were made
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Don't worry! Your seat selection was not completed and you haven't been charged.
            </Text>
            <Text style={styles.infoText}>
              You can try booking again or browse other shows.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleTryAgain}
            >
              <Text style={styles.buttonText}>Try Booking Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleGoHome}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Browse Shows
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  cancelIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  cancelTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  cancelSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 48,
  },
  infoText: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryButtonText: {
    color: '#9CA3AF',
  },
}); 