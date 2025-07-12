#!/usr/bin/env node

/**
 * Detailed Signup Debug Test
 * 
 * This script tests the signup process step by step to identify the exact failure point.
 */

// Configuration
const config = {
  apiUrl: 'https://then-production.up.railway.app',
  testEmail: `debug.signup.${Date.now()}@lastminutelive.test`,
  testPassword: 'TestPassword123!',
  testName: 'Debug User'
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Make a detailed request with better error handling
async function makeDetailedRequest(endpoint, options = {}) {
  const url = `${config.apiUrl}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'x-mobile-app': 'true',
      'User-Agent': 'LastMinuteLive-Debug/1.0.0',
      ...options.headers
    },
    ...options
  };

  log(`🔍 Making ${defaultOptions.method || 'GET'} request to: ${url}`, colors.blue);
  log(`📦 Request payload: ${options.body || 'None'}`, colors.blue);
  
  try {
    const response = await fetch(url, defaultOptions);
    
    // Get response text first
    const responseText = await response.text();
    
    log(`📋 Response Status: ${response.status}`, response.ok ? colors.green : colors.red);
    log(`📋 Response Headers: ${JSON.stringify([...response.headers.entries()])}`, colors.cyan);
    log(`📋 Raw Response: ${responseText}`, colors.cyan);
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      log(`⚠️  Response is not valid JSON: ${parseError.message}`, colors.yellow);
      data = { error: 'Invalid JSON response', rawResponse: responseText };
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers,
      raw: responseText
    };
  } catch (error) {
    log(`❌ Request failed: ${error.message}`, colors.red);
    throw error;
  }
}

// Test with minimal data first
async function testMinimalSignup() {
  log('\n🧪 Testing Minimal Signup', colors.cyan);
  
  const minimalData = {
    email: config.testEmail,
    password: config.testPassword,
    name: config.testName
  };
  
  return await makeDetailedRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(minimalData)
  });
}

// Test database connection
async function testDatabaseConnection() {
  log('\n🔌 Testing Database Connection', colors.cyan);
  
  try {
    const response = await makeDetailedRequest('/api/debug-db');
    return response;
  } catch (error) {
    log(`Database test failed: ${error.message}`, colors.red);
    return null;
  }
}

// Main test
async function runDetailedTest() {
  log('🕵️  Starting Detailed Signup Debug Test\n', colors.cyan);
  
  try {
    // Test 1: Environment check
    log('📋 Step 1: Environment Check', colors.blue);
    const envResponse = await makeDetailedRequest('/api/env-check');
    if (!envResponse.ok) {
      log('❌ Environment check failed', colors.red);
      return;
    }
    
    // Test 2: Database connection
    log('\n📋 Step 2: Database Connection Test', colors.blue);
    const dbResponse = await testDatabaseConnection();
    
    // Test 3: Minimal signup
    log('\n📋 Step 3: Minimal Signup Test', colors.blue);
    const signupResponse = await testMinimalSignup();
    
    // Analysis
    log('\n📊 Analysis:', colors.cyan);
    
    if (signupResponse.ok) {
      log('✅ Signup succeeded!', colors.green);
    } else {
      log('❌ Signup failed', colors.red);
      
      if (signupResponse.status === 500) {
        log('🔍 500 Error Analysis:', colors.yellow);
        log('- This is an internal server error', colors.yellow);
        log('- Likely causes: Database connection, email service, or code error', colors.yellow);
        log('- The error is being caught by the global error handler', colors.yellow);
        
        // Check if we can get more details from logs
        if (signupResponse.data && signupResponse.data.error) {
          log(`- Error message: ${signupResponse.data.error}`, colors.yellow);
        }
      }
    }
    
  } catch (error) {
    log(`Test failed: ${error.message}`, colors.red);
  }
}

// Run the test
if (require.main === module) {
  console.log('🚀 Starting Detailed Debug Test...\n');
  runDetailedTest().then(() => {
    console.log('\n✅ Debug test completed');
  }).catch((error) => {
    console.error('Debug test failed:', error.message);
    process.exit(1);
  });
} 