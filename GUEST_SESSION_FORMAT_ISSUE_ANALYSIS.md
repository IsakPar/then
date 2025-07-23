# 🚨 Guest Session Format Issue - Comprehensive Analysis Plan

## 🔍 **Current Status**
- ✅ API successfully creates guest sessions (database insertion works)
- ✅ API returns HTTP 200 status
- ❌ iOS app fails to parse response: "data isn't in the correct format"

## 🎯 **Root Cause Analysis Plan**

### **Phase 1: Compare API Response vs iOS Model**

#### **1.1 Capture Actual API Response**
```bash
# Test current API response format
curl -X POST http://localhost:3001/api/guest-session \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","deviceInfo":{"platform":"iOS","device":"iPhone","version":"1.0"}}' \
  | jq '.' > actual_api_response.json
```

#### **1.2 Document iOS Expected Format**
From `AuthModels.swift`, the iOS app expects:
```swift
struct GuestResponse: Codable {
    let user: User
    let sessionToken: String
}

struct User: Codable {
    let id: String
    let email: String
    let accountType: String        // Must match AccountType enum
    let authProvider: String       // Must match AuthProvider enum  
    let isGuest: Bool
    let emailVerified: Bool
    let biometricEnabled: Bool
    let createdAt: String         // ISO 8601 date string
}
```

#### **1.3 Check Enum Value Mismatches**
The issue is likely in these enum fields:

**AccountType enum values:**
- iOS expects: "guest", "standard", "premium"
- API returns: ?

**AuthProvider enum values:**
- iOS expects: "email", "google", "apple", "guest"
- API returns: ?

### **Phase 2: Data Type Validation**

#### **2.1 Field Type Mismatches**
Check each field type:
- `id`: String ✓
- `email`: String ✓
- `accountType`: String (but must match enum)
- `authProvider`: String (but must match enum)
- `isGuest`: Bool (check if returning true/false vs "true"/"false")
- `emailVerified`: Bool (check boolean vs string)
- `biometricEnabled`: Bool (check boolean vs string)
- `createdAt`: String (check ISO format)
- `sessionToken`: String ✓

#### **2.2 Date Format Issues**
iOS expects ISO 8601 format:
```
"2025-07-23T10:35:52.730Z"
```

### **Phase 3: Response Structure Validation**

#### **3.1 Check Response Wrapper**
Ensure response structure matches exactly:
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "accountType": "guest",
    "authProvider": "guest",
    "isGuest": true,
    "emailVerified": false,
    "biometricEnabled": false,
    "createdAt": "2025-07-23T10:35:52.730Z"
  },
  "sessionToken": "string"
}
```

#### **3.2 Check for Extra Fields**
iOS Codable might fail if there are unexpected fields in the response.

### **Phase 4: Specific Issues to Investigate**

#### **4.1 Boolean Value Format**
**Problem**: JSON boolean vs string boolean
```json
// ✅ Correct (JSON boolean)
"isGuest": true,
"emailVerified": false

// ❌ Wrong (string boolean)
"isGuest": "true",
"emailVerified": "false"
```

#### **4.2 Enum Value Mismatch**
**Problem**: Case sensitivity or different enum values
```json
// ✅ Correct
"accountType": "guest"        // lowercase
"authProvider": "guest"       // lowercase

// ❌ Wrong
"accountType": "Guest"        // uppercase
"authProvider": "GUEST"       // uppercase
"accountType": "GUEST_USER"   // different value
```

#### **4.3 Date Format Issues**
**Problem**: Date format not ISO 8601
```json
// ✅ Correct
"createdAt": "2025-07-23T10:35:52.730Z"

// ❌ Wrong
"createdAt": "2025-07-23 10:35:52"
"createdAt": 1721729752730
"createdAt": "23/07/2025"
```

#### **4.4 Missing Required Fields**
**Problem**: Even though validation passes, iOS model might have different requirements
```json
// Check if ALL these fields are present and correctly typed
{
  "user": {
    "id": "required",
    "email": "required", 
    "accountType": "required",
    "authProvider": "required",
    "isGuest": "required",
    "emailVerified": "required",
    "biometricEnabled": "required",
    "createdAt": "required"
  },
  "sessionToken": "required"
}
```

### **Phase 5: Investigation Steps**

#### **5.1 Compare Working vs Failing**
From logs, some calls succeed, others fail. Compare:
- Working: `isak.parild@gmail.com` (✅ success)
- Failing: Same email but different format?

#### **5.2 Check iOS Codable Debugging**
Add iOS debugging to see exact parsing error:
```swift
// In iOS app, catch specific JSON parsing errors
do {
    let response = try JSONDecoder().decode(GuestResponse.self, from: data)
} catch let DecodingError.keyNotFound(key, context) {
    print("Missing key: \(key) - \(context)")
} catch let DecodingError.typeMismatch(type, context) {
    print("Type mismatch: \(type) - \(context)")
} catch let DecodingError.valueNotFound(type, context) {
    print("Value not found: \(type) - \(context)")
}
```

#### **5.3 Test with Different Scenarios**
```bash
# Test 1: Minimal request
curl -X POST API_URL -d '{"email":"test@test.com"}'

# Test 2: With device info
curl -X POST API_URL -d '{"email":"test@test.com","deviceInfo":{}}'

# Test 3: Full device info
curl -X POST API_URL -d '{"email":"test@test.com","deviceInfo":{"platform":"iOS","device":"iPhone","version":"1.0"}}'
```

## 🎯 **Most Likely Issues (Priority Order)**

### **1. Boolean Type Mismatch (HIGH PRIORITY)**
API returning string "true"/"false" instead of JSON boolean true/false

### **2. Enum Value Mismatch (HIGH PRIORITY)**
`accountType` or `authProvider` values don't match iOS enum cases exactly

### **3. Date Format Issue (MEDIUM PRIORITY)**
`createdAt` not in proper ISO 8601 format

### **4. Extra Fields in Response (MEDIUM PRIORITY)**
API returning fields that iOS model doesn't expect

### **5. Nested Object Structure (LOW PRIORITY)**
Response structure doesn't match exactly

## 🔧 **Next Steps**

1. **Capture actual API response** and compare with iOS model
2. **Check enum values** in iOS code vs API response
3. **Validate boolean types** (JSON boolean vs string)
4. **Test date format** parsing
5. **Add iOS-side debugging** to get specific parsing errors

## 📋 **Testing Checklist**

- [ ] Capture actual API response format
- [ ] Compare with iOS GuestResponse model
- [ ] Check accountType enum values
- [ ] Check authProvider enum values  
- [ ] Validate boolean field types
- [ ] Validate date format
- [ ] Test with minimal request
- [ ] Add iOS debugging for specific error
- [ ] Test with different email addresses
- [ ] Verify no extra fields in response 