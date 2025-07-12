import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';

import { AuthProvider } from './src/contexts/AuthContext';
import { useAuth } from './src/contexts/AuthContext';

import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import SeatSelectionScreen from './src/screens/SeatSelectionScreen';
import PaymentWebViewScreen from './src/screens/PaymentWebViewScreen';
import PaymentSuccessScreen from './src/screens/PaymentSuccessScreen';
import PaymentCancelScreen from './src/screens/PaymentCancelScreen';
import TicketsScreen from './src/screens/TicketsScreen';
import { RootStackParamList } from './src/types/navigation';

const Stack = createStackNavigator<RootStackParamList>();

// Deep linking configuration for Expo Go and production
const createLinkingConfig = () => {
  // Check if running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';
  
  if (isExpoGo) {
    // Expo Go URL scheme format with --/ separator
    return {
      prefixes: [
        'exp://192.168.68.79:8081', // Local development IP
        'exp://localhost:8081',      // Local development localhost
        'lastminutelive://',         // Fallback for production testing
      ],
      config: {
        screens: {
          Home: '',
          Login: '--/login',
          Signup: '--/signup',
          EmailVerification: '--/verify-email',
          SeatSelection: '--/seat-selection/:showId',
          PaymentSuccess: '--/payment/success',
          PaymentCancel: '--/payment/cancel',
        },
      },
    };
  } else {
    // Production URL scheme
    return {
      prefixes: ['lastminutelive://'],
      config: {
        screens: {
          Home: '',
          Login: 'login',
          Signup: 'signup',
          EmailVerification: 'verify-email',
          SeatSelection: 'seat-selection/:showId',
          PaymentSuccess: 'payment/success',
          PaymentCancel: 'payment/cancel',
        },
      },
    };
  }
};

// Navigation component that uses auth state
function AppNavigation() {
  const { state } = useAuth();
  const linking = createLinkingConfig();

  // Show loading screen while checking auth status
  if (state.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#1F2937' },
        }}
      >
        {/* Main app screens - always available */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
        <Stack.Screen name="PaymentWebView" component={PaymentWebViewScreen} />
        <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
        <Stack.Screen name="PaymentCancel" component={PaymentCancelScreen} />
        <Stack.Screen name="Tickets" component={TicketsScreen} />
        
        {/* Auth screens - available when not authenticated */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <AuthProvider>
        <AppNavigation />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
});
