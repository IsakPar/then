import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';

interface EmailVerificationScreenProps {
  navigation: any;
  route: {
    params: {
      email: string;
    };
  };
}

export default function EmailVerificationScreen({ navigation, route }: EmailVerificationScreenProps) {
  const { resendEmailVerification, state } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const email = route.params?.email || state.user?.email || '';

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResendVerification = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      await resendEmailVerification();
      Alert.alert(
        'Email Sent',
        'A new verification email has been sent to your inbox. Please check your email and spam folder.',
        [{ text: 'OK' }]
      );
      setCountdown(60); // 60 second cooldown
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckEmailApp = () => {
    Alert.alert(
      'Open Email App',
      'This will open your default email app to check for the verification email.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Email', onPress: () => {
          // Note: In a real app, you might use Linking.openURL('mailto:') 
          // or a specific deep link to the email app
          Alert.alert('Info', 'Please check your email app for the verification message.');
        }}
      ]
    );
  };

  const handleContinueWithoutVerification = () => {
    Alert.alert(
      'Continue Without Verification?',
      'You can continue using the app, but some features may be limited until you verify your email.',
      [
        { text: 'Stay Here', style: 'cancel' },
        { text: 'Continue', onPress: () => navigation.navigate('Home') }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1F2937', '#111827']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.emailIcon}>📧</Text>
              </View>
              <Text style={styles.title}>Check Your Email</Text>
              <Text style={styles.subtitle}>
                We've sent a verification link to:
              </Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Next Steps:</Text>
              <View style={styles.instructionItem}>
                <Text style={styles.stepNumber}>1.</Text>
                <Text style={styles.stepText}>Check your email inbox</Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.stepNumber}>2.</Text>
                <Text style={styles.stepText}>Look for an email from LastMinuteLive</Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.stepNumber}>3.</Text>
                <Text style={styles.stepText}>Click the verification link</Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.stepNumber}>4.</Text>
                <Text style={styles.stepText}>Return to the app to continue</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {/* Check Email Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCheckEmailApp}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.primaryButtonText}>Open Email App</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Resend Button */}
              <TouchableOpacity
                style={[styles.secondaryButton, (isResending || countdown > 0) && styles.buttonDisabled]}
                onPress={handleResendVerification}
                disabled={isResending || countdown > 0}
              >
                {isResending ? (
                  <ActivityIndicator color="#3B82F6" size="small" />
                ) : (
                  <Text style={styles.secondaryButtonText}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Verification Email'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Didn't receive the email? Check your spam folder or try a different email address.
              </Text>
              
              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleContinueWithoutVerification}
              >
                <Text style={styles.linkButtonText}>Continue without verification</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.linkButtonText}>← Back to signup</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emailIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginRight: 12,
    minWidth: 20,
  },
  stepText: {
    fontSize: 16,
    color: '#D1D5DB',
    flex: 1,
  },
  actionsContainer: {
    marginBottom: 30,
  },
  primaryButton: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  linkButton: {
    marginVertical: 8,
  },
  linkButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
}); 