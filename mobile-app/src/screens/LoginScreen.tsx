import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { LoginScreenProps } from '../types/navigation';
import socialAuthService from '../lib/socialAuth';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login, socialAuth, state } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const isExpoGo = socialAuthService.isRunningInExpoGo();

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      
      Alert.alert('Success', 'Welcome back!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      const result = await socialAuthService.signInWithGoogle();
      const request = socialAuthService.convertToApiRequest(result);
      
      if (isExpoGo) {
        Alert.alert(
          'Demo Mode',
          'This is a demo of Google Sign-In. In production, this would authenticate with Google.',
          [{ text: 'Continue Demo', onPress: async () => {
            await socialAuth(request);
            Alert.alert('Success', 'Demo Google Sign-In completed!');
          }}, { text: 'Cancel', style: 'cancel' }]
        );
      } else {
        await socialAuth(request);
        Alert.alert('Success', 'Welcome! You\'ve been signed in with Google.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google Sign-In failed';
      Alert.alert('Google Sign-In Failed', errorMessage);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'Apple Sign-In is only available on iOS devices.');
      return;
    }

    setSocialLoading('apple');
    try {
      const result = await socialAuthService.signInWithApple();
      const request = socialAuthService.convertToApiRequest(result);
      
      if (isExpoGo) {
        Alert.alert(
          'Demo Mode',
          'This is a demo of Apple Sign-In. In production, this would authenticate with Apple.',
          [{ text: 'Continue Demo', onPress: async () => {
            await socialAuth(request);
            Alert.alert('Success', 'Demo Apple Sign-In completed!');
          }}, { text: 'Cancel', style: 'cancel' }]
        );
      } else {
        await socialAuth(request);
        Alert.alert('Success', 'Welcome! You\'ve been signed in with Apple.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Apple Sign-In failed';
      Alert.alert('Apple Sign-In Failed', errorMessage);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isAnyLoading = isLoading || socialLoading !== null;

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
            {/* Development Banner */}
            {isExpoGo && (
              <View style={styles.devBanner}>
                <Text style={styles.devBannerText}>
                  🧪 Running in Expo Go - Social auth will show demo mode
                </Text>
              </View>
            )}

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>
            </View>

            {/* Social Auth Buttons */}
            <View style={styles.socialContainer}>
              {/* Google Sign-In Button */}
              <TouchableOpacity
                style={[styles.socialButton, socialLoading === 'google' && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={isAnyLoading}
              >
                <View style={styles.socialButtonContent}>
                  {socialLoading === 'google' ? (
                    <ActivityIndicator color="#4285F4" size="small" />
                  ) : (
                    <>
                      <Text style={styles.socialButtonIcon}>🔵</Text>
                      <Text style={styles.socialButtonText}>
                        Continue with Google{isExpoGo ? ' (Demo)' : ''}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Apple Sign-In Button (iOS only) */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton, socialLoading === 'apple' && styles.buttonDisabled]}
                  onPress={handleAppleSignIn}
                  disabled={isAnyLoading}
                >
                  <View style={styles.socialButtonContent}>
                    {socialLoading === 'apple' ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={styles.socialButtonIcon}>🍎</Text>
                        <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                          Continue with Apple{isExpoGo ? ' (Demo)' : ''}
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isAnyLoading}
                />
                {errors.email ? (
                  <Text style={styles.errorText}>{errors.email}</Text>
                ) : null}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isAnyLoading}
                />
                {errors.password ? (
                  <Text style={styles.errorText}>{errors.password}</Text>
                ) : null}
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, isAnyLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isAnyLoading}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Signup')}
                  disabled={isAnyLoading}
                >
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {/* Back to Home */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Home');
                  }
                }}
                disabled={isAnyLoading}
              >
                <Text style={styles.backButtonText}>← Continue as guest</Text>
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
  },
  devBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  devBannerText: {
    color: '#F59E0B',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  socialContainer: {
    marginBottom: 20,
  },
  socialButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    minHeight: 50,
  },
  socialButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  appleButtonText: {
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#4B5563',
  },
  dividerText: {
    color: '#9CA3AF',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
  },
  loginButton: {
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  signupText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  signupLink: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
}); 