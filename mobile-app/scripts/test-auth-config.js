#!/usr/bin/env node

/**
 * Google Authentication Configuration Test Script
 * 
 * This script verifies that your Google OAuth configuration is set up correctly
 * for the LastMinuteLive mobile app.
 * 
 * Usage: node scripts/test-auth-config.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function header(message) {
  log(`\n${colors.bright}${colors.cyan}🔍 ${message}${colors.reset}`);
}

// Check if .env file exists and has required variables
function checkEnvironmentVariables() {
  header('Checking Environment Variables');
  
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    error('.env file not found');
    warning('Create a .env file in the mobile-app directory');
    warning('See ENVIRONMENT_SETUP.md for instructions');
    return false;
  }
  
  success('.env file found');
  
  // Read .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  // Check required variables
  const requiredVars = [
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    if (envVars[varName] && envVars[varName] !== 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com') {
      success(`${varName} is set`);
    } else {
      error(`${varName} is missing or not configured`);
      allPresent = false;
    }
  });
  
  // Check API URL
  if (envVars['EXPO_PUBLIC_API_URL']) {
    const apiUrl = envVars['EXPO_PUBLIC_API_URL'];
    if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      info(`API URL: ${apiUrl} (Local Development)`);
    } else if (apiUrl.includes('railway.app')) {
      info(`API URL: ${apiUrl} (Production - Railway)`);
    } else {
      warning(`API URL: ${apiUrl} (Unknown)`);
    }
  }
  
  return allPresent;
}

// Check app.json configuration
function checkAppConfig() {
  header('Checking app.json Configuration');
  
  const appConfigPath = path.join(__dirname, '..', 'app.json');
  
  if (!fs.existsSync(appConfigPath)) {
    error('app.json file not found');
    return false;
  }
  
  try {
    const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
    const expo = appConfig.expo;
    
    // Check package name
    if (expo.android && expo.android.package) {
      success(`Android package: ${expo.android.package}`);
    } else {
      error('Android package name not found');
    }
    
    // Check bundle identifier
    if (expo.ios && expo.ios.bundleIdentifier) {
      success(`iOS bundle identifier: ${expo.ios.bundleIdentifier}`);
    } else {
      error('iOS bundle identifier not found');
    }
    
    // Check Google Sign-In plugin
    if (expo.plugins && expo.plugins.find(p => Array.isArray(p) && p[0] === '@react-native-google-signin/google-signin')) {
      success('Google Sign-In plugin configured');
    } else {
      warning('Google Sign-In plugin not found in app.json');
      warning('This is required for production builds');
    }
    
    return true;
  } catch (error) {
    error(`Failed to parse app.json: ${error.message}`);
    return false;
  }
}

// Check dependencies
function checkDependencies() {
  header('Checking Dependencies');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    error('package.json file not found');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check required dependencies
    const requiredDeps = [
      '@react-native-google-signin/google-signin',
      '@react-navigation/native',
      '@react-navigation/stack',
      'expo'
    ];
    
    let allPresent = true;
    
    requiredDeps.forEach(dep => {
      if (dependencies[dep]) {
        success(`${dep}: ${dependencies[dep]}`);
      } else {
        error(`${dep} is missing`);
        allPresent = false;
      }
    });
    
    return allPresent;
  } catch (error) {
    error(`Failed to parse package.json: ${error.message}`);
    return false;
  }
}

// Check EAS configuration
function checkEASConfig() {
  header('Checking EAS Configuration');
  
  const easConfigPath = path.join(__dirname, '..', 'eas.json');
  
  if (!fs.existsSync(easConfigPath)) {
    warning('eas.json file not found');
    warning('This is required for EAS builds');
    return false;
  }
  
  try {
    const easConfig = JSON.parse(fs.readFileSync(easConfigPath, 'utf8'));
    
    if (easConfig.build) {
      success('EAS build configuration found');
      
      // Check build profiles
      const profiles = Object.keys(easConfig.build);
      info(`Build profiles: ${profiles.join(', ')}`);
      
      return true;
    } else {
      error('No build configuration in eas.json');
      return false;
    }
  } catch (error) {
    error(`Failed to parse eas.json: ${error.message}`);
    return false;
  }
}

// Generate recommendations
function generateRecommendations(results) {
  header('Recommendations');
  
  if (results.env && results.appConfig && results.dependencies) {
    success('All basic configuration checks passed!');
    info('You can now test authentication:');
    info('1. For Expo Go: npx expo start');
    info('2. For development build: eas build --profile development');
  } else {
    error('Some configuration issues found. Please fix them before testing:');
    
    if (!results.env) {
      error('• Set up environment variables (see ENVIRONMENT_SETUP.md)');
    }
    
    if (!results.appConfig) {
      error('• Fix app.json configuration');
    }
    
    if (!results.dependencies) {
      error('• Install missing dependencies');
    }
  }
  
  log('\n📚 Documentation:');
  info('• GOOGLE_OAUTH_SETUP.md - Google Cloud Console setup');
  info('• ENVIRONMENT_SETUP.md - Environment variables');
  info('• GOOGLE_AUTH_TROUBLESHOOTING.md - Common issues');
}

// Main execution
function main() {
  log(`${colors.bright}${colors.magenta}`);
  log('🚀 Google Authentication Configuration Test');
  log('==========================================');
  log(colors.reset);
  
  const results = {
    env: checkEnvironmentVariables(),
    appConfig: checkAppConfig(),
    dependencies: checkDependencies(),
    eas: checkEASConfig()
  };
  
  generateRecommendations(results);
  
  log(`\n${colors.bright}Test completed.${colors.reset}`);
}

// Run the test
main(); 