// ============================================================================
// MOBILE APP CONFIGURATION
// ============================================================================
// Centralized configuration for environment variables and app settings

export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://then-production.up.railway.app',
    timeout: 10000, // 10 seconds
  },

  // Stripe Configuration (for mobile payments if needed)
  stripe: {
    publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  },

  // App Settings
  app: {
    name: 'Last Minute Live',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },

  // Feature Flags
  features: {
    // Enable/disable features for mobile app
    enablePushNotifications: false,
    enableLocationServices: false,
    enableBiometricAuth: false,
    enableOfflineMode: false,
    enableMockAuth: false, // Real authentication only - mock auth disabled for security
  },

  // UI Configuration
  ui: {
    // Mobile-specific UI settings
    defaultTheme: 'light' as const,
    enableDarkMode: true,
    animationDuration: 300,
    hapticFeedback: true,
  },

  // Booking Configuration
  booking: {
    // Seat reservation timeout (matches backend)
    reservationTimeoutMinutes: 15,
    maxSeatsPerBooking: 8,
    minAdvanceBookingHours: 1,
  },

  // Cache Configuration
  cache: {
    // Cache settings for offline support
    showListTTL: 5 * 60 * 1000, // 5 minutes
    showDetailsTTL: 2 * 60 * 1000, // 2 minutes
    seatMapTTL: 10 * 60 * 1000, // 10 minutes
  },
};

// Validation functions
export const validateConfig = () => {
  const errors: string[] = [];

  if (!config.api.baseUrl) {
    errors.push('API base URL is required');
  }

  if (config.app.environment === 'production') {
    if (!config.stripe.publishableKey) {
      errors.push('Stripe publishable key is required in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};

// Environment helpers
export const isDevelopment = () => config.app.environment === 'development';
export const isProduction = () => config.app.environment === 'production';

// Export default config
export default config; 