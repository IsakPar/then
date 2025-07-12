import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { PaymentWebViewScreenProps } from '../types/navigation';

export default function PaymentWebViewScreen({ navigation, route }: PaymentWebViewScreenProps) {
  const { checkoutUrl, showId, reservationId } = route.params;
  const webViewRef = useRef<WebView>(null);
  
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  // Handle navigation state changes to detect payment completion
  const handleNavigationStateChange = (navState: any) => {
    console.log('🌐 WebView navigation:', navState.url);
    setCurrentUrl(navState.url);
    setCanGoBack(navState.canGoBack);
    setLoading(navState.loading);

    // Check if we've reached a success or cancel page
    if (navState.url) {
      // Detect WebView-specific success patterns
      if (navState.url.includes('payment/webview/success') || 
          navState.url.includes('payment/success') || 
          navState.url.includes('checkout/success')) {
        handlePaymentSuccess(navState.url);
      } 
      // Detect WebView-specific cancel patterns
      else if (navState.url.includes('payment/webview/cancel') || 
               navState.url.includes('payment/cancel') || 
               navState.url.includes('checkout/cancel')) {
        handlePaymentCancel();
      }
      // Additional patterns that might indicate completion
      else if (navState.url.includes('session_id=')) {
        // Extract session ID from URL and handle success
        const sessionId = extractSessionId(navState.url);
        if (sessionId) {
          handlePaymentSuccess(navState.url, sessionId);
        }
      }
    }
  };

  // Extract session ID from URL
  const extractSessionId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('session_id');
    } catch {
      // Fallback regex extraction
      const match = url.match(/session_id=([^&]+)/);
      return match ? match[1] : null;
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = (url: string, sessionId?: string) => {
    console.log('✅ Payment successful, navigating to success screen');
    
    const extractedSessionId = sessionId || extractSessionId(url);
    
    navigation.replace('PaymentSuccess', {
      sessionId: extractedSessionId || undefined,
    });
  };

  // Handle payment cancellation
  const handlePaymentCancel = () => {
    console.log('❌ Payment cancelled, navigating to cancel screen');
    
    navigation.replace('PaymentCancel', {
      showId,
    });
  };

  // Handle manual close
  const handleClose = () => {
    Alert.alert(
      'Close Payment',
      'Are you sure you want to close the payment? Your seat reservation will be cancelled.',
      [
        {
          text: 'Continue Payment',
          style: 'cancel',
        },
        {
          text: 'Close',
          style: 'destructive',
          onPress: () => handlePaymentCancel(),
        },
      ]
    );
  };

  // Handle WebView errors
  const handleError = (error: any) => {
    console.error('🚨 WebView error:', error);
    Alert.alert(
      'Payment Error',
      'There was an error loading the payment page. Please try again.',
      [
        {
          text: 'Retry',
          onPress: () => webViewRef.current?.reload(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: handlePaymentCancel,
        },
      ]
    );
  };

  // Handle back button
  const handleGoBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      handleClose();
    }
  };

  // JavaScript to inject for better payment detection
  const injectedJavaScript = `
    (function() {
      // Monitor for Stripe success indicators
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      function checkForPaymentCompletion() {
        const url = window.location.href;
        console.log('🌐 Page URL changed:', url);
        
        // Look for success indicators (prioritize WebView-specific URLs)
        if (url.includes('payment/webview/success') || 
            url.includes('payment/success') || 
            url.includes('checkout/success') || 
            url.includes('session_id=')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAYMENT_SUCCESS',
            url: url,
            sessionId: new URLSearchParams(window.location.search).get('session_id')
          }));
        }
        
        // Look for cancel indicators (prioritize WebView-specific URLs)
        else if (url.includes('payment/webview/cancel') || 
                 url.includes('payment/cancel') || 
                 url.includes('checkout/cancel') || 
                 url.includes('cancelled')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAYMENT_CANCEL',
            url: url
          }));
        }
      }
      
      // Override history methods to detect navigation
      history.pushState = function() {
        originalPushState.apply(this, arguments);
        setTimeout(checkForPaymentCompletion, 100);
      };
      
      history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        setTimeout(checkForPaymentCompletion, 100);
      };
      
      // Check immediately and on load
      checkForPaymentCompletion();
      window.addEventListener('load', checkForPaymentCompletion);
      
      // Also check periodically (as backup)
      setInterval(checkForPaymentCompletion, 2000);
    })();
    true; // Required for iOS
  `;

  // Handle messages from injected JavaScript
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📱 Message from WebView:', data);
      
      if (data.type === 'PAYMENT_SUCCESS') {
        handlePaymentSuccess(data.url, data.sessionId);
      } else if (data.type === 'PAYMENT_CANCEL') {
        handlePaymentCancel();
      }
    } catch (error) {
      console.log('Failed to parse WebView message:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1F2937', '#374151']}
        style={styles.gradient}
      >
        <StatusBar style="light" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleGoBack}
          >
            <Ionicons 
              name={canGoBack ? "arrow-back" : "close"} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          
          <View style={styles.headerTitle}>
            <Text style={styles.headerTitleText}>Secure Payment</Text>
            {currentUrl && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {currentUrl.replace(/^https?:\/\//, '')}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClose}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#10B981" />
            <Text style={styles.loadingText}>Loading payment...</Text>
          </View>
        )}

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{ uri: checkoutUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          onHttpError={handleError}
          onMessage={handleMessage}
          injectedJavaScript={injectedJavaScript}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          bounces={false}
          scrollEnabled={true}
          // iOS specific props for better WKWebView experience
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          // Security props
          allowsBackForwardNavigationGestures={false}
          decelerationRate="normal"
          // User agent to ensure mobile experience
          userAgent={Platform.select({
            ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1 LastMinuteLive-Mobile-App',
            android: 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 LastMinuteLive-Mobile-App',
          })}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#10B981',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
}); 