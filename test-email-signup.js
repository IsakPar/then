#!/usr/bin/env node

/**
 * Email Signup Test Script
 * 
 * This script tests the complete email signup and verification flow
 * against the Railway backend to ensure it's working correctly.
 * 
 * Usage: node test-email-signup.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${message}`, colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
}

// Configuration
const config = {
  apiUrl: 'https://then-production.up.railway.app',
  testEmail: `test.signup.${Date.now()}@lastminutelive.test`,
  testPassword: 'TestPassword123!',
  testName: 'Test User',
  testPhone: '+1234567890'
};

// Utility function to make API requests
async function makeRequest(endpoint, options = {}) {
  const url = `${config.apiUrl}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'x-mobile-app': 'true', // Identify as mobile app request
      'User-Agent': 'LastMinuteLive-Mobile-Test/1.0.0',
      ...options.headers
    },
    ...options
  };

  info(`Making ${defaultOptions.method || 'GET'} request to: ${url}`);
  
  try {
    const response = await fetch(url, defaultOptions);
    const data = await response.json();
    
    log(`Response Status: ${response.status}`, response.ok ? colors.green : colors.red);
    log(`Response Data: ${JSON.stringify(data, null, 2)}`, colors.magenta);
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers
    };
  } catch (error) {
    error(`Request failed: ${error.message}`);
    throw error;
  }
}

// Test functions
async function testApiHealth() {
  header('🏥 Testing API Health');
  
  try {
    const response = await makeRequest('/api/env-check');
    
    if (response.ok) {
      success('API is responding correctly');
      return true;
    } else {
      error(`API health check failed with status ${response.status}`);
      return false;
    }
  } catch (err) {
    error(`Failed to connect to API: ${err.message}`);
    return false;
  }
}

async function testSignupEndpoint() {
  header('📝 Testing Email Signup');
  
  const signupData = {
    email: config.testEmail,
    password: config.testPassword,
    name: config.testName,
    phone: config.testPhone
  };
  
  info(`Testing signup with email: ${config.testEmail}`);
  
  try {
    const response = await makeRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(signupData)
    });
    
    if (response.ok && response.data.success) {
      success('Signup successful!');
      
      // Check response structure
      const { user, token, emailSent, welcomeEmailSent } = response.data;
      
      if (user && user.email === config.testEmail) {
        success(`User created with ID: ${user.id}`);
        success(`User role: ${user.role}`);
        success(`Email verified: ${user.emailVerified ? 'Yes' : 'No'}`);
      } else {
        error('Invalid user data in response');
        return null;
      }
      
      if (token) {
        success('JWT token provided');
        info(`Token length: ${token.length} characters`);
      } else {
        warning('No JWT token in response');
      }
      
      if (emailSent) {
        success('Email verification sent');
      } else {
        warning('Email verification not sent');
      }
      
      if (welcomeEmailSent) {
        success('Welcome email sent');
      } else {
        warning('Welcome email not sent');
      }
      
      return response.data;
    } else {
      error(`Signup failed: ${response.data.error || 'Unknown error'}`);
      if (response.data.details) {
        error(`Details: ${JSON.stringify(response.data.details)}`);
      }
      return null;
    }
  } catch (err) {
    error(`Signup request failed: ${err.message}`);
    return null;
  }
}

async function testDuplicateSignup() {
  header('🔄 Testing Duplicate Signup Prevention');
  
  const signupData = {
    email: config.testEmail, // Same email as before
    password: config.testPassword,
    name: config.testName
  };
  
  try {
    const response = await makeRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(signupData)
    });
    
    if (response.status === 409 && !response.data.success) {
      success('Duplicate signup correctly prevented');
      info(`Error message: ${response.data.error}`);
      return true;
    } else {
      error('Duplicate signup was not prevented!');
      return false;
    }
  } catch (err) {
    error(`Duplicate signup test failed: ${err.message}`);
    return false;
  }
}

async function testEmailVerification(token) {
  header('📧 Testing Email Verification (if token available)');
  
  if (!token) {
    warning('No token available for email verification test');
    return false;
  }
  
  // Note: In a real scenario, the user would click a link in their email
  // For testing, we'll simulate checking the verification endpoint
  try {
    const response = await makeRequest('/api/auth/verify-email', {
      method: 'PUT',
      body: JSON.stringify({ email: config.testEmail })
    });
    
    if (response.ok) {
      success('Email verification endpoint is working');
      
      if (response.data.verified) {
        success('Email is verified');
      } else {
        info('Email is not yet verified (as expected)');
      }
      
      return true;
    } else {
      error(`Email verification check failed: ${response.data.error}`);
      return false;
    }
  } catch (err) {
    error(`Email verification test failed: ${err.message}`);
    return false;
  }
}

async function testLogin(signupData) {
  header('🔐 Testing Login with New Account');
  
  if (!signupData || !signupData.user) {
    warning('No signup data available for login test');
    return false;
  }
  
  const loginData = {
    email: config.testEmail,
    password: config.testPassword
  };
  
  try {
    const response = await makeRequest('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });
    
    if (response.ok && response.data.success) {
      success('Login successful with new account!');
      
      const { user, token } = response.data;
      
      if (user && user.email === config.testEmail) {
        success(`Logged in as: ${user.name} (${user.email})`);
        success(`User role: ${user.role}`);
      }
      
      if (token) {
        success('Login JWT token provided');
      }
      
      return response.data;
    } else {
      error(`Login failed: ${response.data.error || 'Unknown error'}`);
      
      // Check if it's due to email verification requirement
      if (response.data.requiresVerification) {
        info('Login failed due to email verification requirement (this is expected)');
        return true; // This is actually correct behavior
      }
      
      return false;
    }
  } catch (err) {
    error(`Login test failed: ${err.message}`);
    return false;
  }
}

async function testInputValidation() {
  header('🛡️  Testing Input Validation');
  
  const invalidTests = [
    {
      name: 'Empty email',
      data: { email: '', password: config.testPassword, name: config.testName },
      expectedError: 'Email'
    },
    {
      name: 'Invalid email format',
      data: { email: 'invalid-email', password: config.testPassword, name: config.testName },
      expectedError: 'valid email'
    },
    {
      name: 'Short password',
      data: { email: 'test@example.com', password: '123', name: config.testName },
      expectedError: 'Password'
    },
    {
      name: 'Missing name',
      data: { email: 'test@example.com', password: config.testPassword, name: '' },
      expectedError: 'name'
    }
  ];
  
  let passedTests = 0;
  
  for (const test of invalidTests) {
    info(`Testing: ${test.name}`);
    
    try {
      const response = await makeRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(test.data)
      });
      
      if (!response.ok && !response.data.success) {
        success(`✓ ${test.name} correctly rejected`);
        passedTests++;
      } else {
        error(`✗ ${test.name} was incorrectly accepted`);
      }
    } catch (err) {
      warning(`${test.name} test failed with error: ${err.message}`);
    }
  }
  
  success(`Input validation tests: ${passedTests}/${invalidTests.length} passed`);
  return passedTests === invalidTests.length;
}

// Main test runner
async function runTests() {
  header('🧪 Starting Email Signup Tests');
  
  info(`Test API URL: ${config.apiUrl}`);
  info(`Test Email: ${config.testEmail}`);
  info(`Test Name: ${config.testName}`);
  
  const results = {
    apiHealth: false,
    signup: null,
    duplicateSignup: false,
    emailVerification: false,
    login: false,
    inputValidation: false
  };
  
  try {
    // Test 1: API Health
    results.apiHealth = await testApiHealth();
    if (!results.apiHealth) {
      error('API is not accessible. Cannot continue tests.');
      return results;
    }
    
    // Test 2: Input Validation
    results.inputValidation = await testInputValidation();
    
    // Test 3: Email Signup
    results.signup = await testSignupEndpoint();
    
    // Test 4: Duplicate Signup Prevention
    if (results.signup) {
      results.duplicateSignup = await testDuplicateSignup();
    }
    
    // Test 5: Email Verification Check
    if (results.signup && results.signup.token) {
      results.emailVerification = await testEmailVerification(results.signup.token);
    }
    
    // Test 6: Login with New Account
    if (results.signup) {
      results.login = await testLogin(results.signup);
    }
    
    // Test Summary
    header('📊 Test Results Summary');
    
    success(`✅ API Health: ${results.apiHealth ? 'PASS' : 'FAIL'}`);
    success(`✅ Input Validation: ${results.inputValidation ? 'PASS' : 'FAIL'}`);
    success(`✅ Email Signup: ${results.signup ? 'PASS' : 'FAIL'}`);
    success(`✅ Duplicate Prevention: ${results.duplicateSignup ? 'PASS' : 'FAIL'}`);
    success(`✅ Email Verification: ${results.emailVerification ? 'PASS' : 'FAIL'}`);
    success(`✅ Login Test: ${results.login ? 'PASS' : 'FAIL'}`);
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    if (passedTests === totalTests) {
      success(`\n🎉 All tests passed! (${passedTests}/${totalTests})`);
      success('Email signup functionality is working correctly!');
    } else {
      warning(`\n⚠️  Some tests failed. (${passedTests}/${totalTests} passed)`);
      info('Please check the failed tests above for details.');
    }
    
  } catch (error) {
    error(`Test runner failed: ${error.message}`);
  }
  
  return results;
}

// Check if we're running this as the main script
if (require.main === module) {
  console.log('🚀 Starting Email Signup Test Suite...\n');
  
  runTests().then((results) => {
    rl.close();
    
    // Exit with appropriate code
    const allPassed = Object.values(results).every(Boolean);
    process.exit(allPassed ? 0 : 1);
  }).catch((error) => {
    error(`Test suite failed: ${error.message}`);
    rl.close();
    process.exit(1);
  });
}

module.exports = { runTests, config }; 