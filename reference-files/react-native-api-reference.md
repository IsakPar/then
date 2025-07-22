# React Native App API Reference

This document maps all the current functionality from the React Native/Expo mobile app to guide the Swift implementation.

## API Base Configuration
- **Base URL**: `https://then-production.up.railway.app`
- **Authentication**: JWT Bearer tokens stored in AsyncStorage
- **Headers**: Custom User-Agent and mobile detection headers

## Authentication API Endpoints

### 1. User Registration (`/api/auth/signup`)
**Method**: POST
**Payload**:
```typescript
{
  email: string;
  password: string;
  name: string;
}
```
**Response**: AuthResponse with user + token

### 2. User Login (`/api/auth/signin`) 
**Method**: POST
**Payload**:
```typescript
{
  email: string;
  password: string;
}
```
**Response**: AuthResponse with user + token

### 3. Social Authentication (`/api/auth/social`)
**Method**: POST
**Payload**:
```typescript
{
  provider: 'google' | 'apple';
  token: string;
  email?: string;
  name?: string;
}
```
**Response**: AuthResponse with user + token

### 4. Token Verification (`/api/auth/verify`)
**Method**: POST
**Headers**: Authorization: Bearer {token}
**Response**: AuthResponse with user validation

### 5. Email Verification (`/api/auth/verify-email`)
**Method**: POST
**Payload**:
```typescript
{
  token: string;
  email: string;
}
```

## Core App API Endpoints

### 1. Get Shows (`/api/shows`)
**Method**: GET
**Response**: Array of Show objects
**Show Model**:
```typescript
{
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  venue_name: string;
  location: string;
  imageUrl: string;
  min_price: number;
  max_price: number;
  seatMapId: string;
  seat_pricing: SeatPricing[];
}
```

### 2. Get Show Details (`/api/shows/[id]`)
**Method**: GET
**Response**: Single Show object with full details

### 3. Get Show Seats (`/api/shows/[id]/seats`)
**Method**: GET
**Response**: Array of Seat objects
**Seat Model**:
```typescript
{
  id: string;
  row: string;
  number: string;
  section: string;
  price: number;
  status: 'available' | 'reserved' | 'sold';
  seatMapId: string;
}
```

### 4. Get Seat Map (`/api/shows/[id]/seatmap`)
**Method**: GET
**Response**: Seat map configuration for visualization

### 5. Reserve Seats (`/api/seat-checkout`)
**Method**: POST
**Payload**:
```typescript
{
  showId: string;
  specificSeatIds: string[];
}
```
**Response**: Stripe checkout session URL

### 6. Get User Bookings (`/api/user/bookings`)
**Method**: GET
**Headers**: Authorization: Bearer {token}
**Response**: Array of UserBooking objects
**UserBooking Model**:
```typescript
{
  id: string;
  showId: string;
  showTitle: string;
  showDate: string;
  showTime: string;
  venue: string;
  seats: BookedSeat[];
  totalAmount: number;
  bookingDate: string;
  status: string;
  qrCode?: string;
}
```

### 7. Payment Success (`/api/checkout/success`)
**Method**: GET
**Query**: session_id from Stripe
**Response**: Payment confirmation details

## Data Models (TypeScript → Swift Conversion)

### User Model
```typescript
// TypeScript (Current)
interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

// Swift (Target)
struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let created_at: String
}
```

### Show Model
```typescript
// TypeScript (Current)
interface Show {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue_name: string;
  location: string;
  imageUrl: string;
  min_price: number;
  max_price: number;
  seatMapId: string;
  seat_pricing: SeatPricing[];
}

// Swift (Target)
struct Show: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let date: String
    let time: String
    let venue_name: String
    let location: String
    let imageUrl: String
    let min_price: Int
    let max_price: Int
    let seatMapId: String
    let seat_pricing: [SeatPricing]
}
```

### Authentication Response Model
```typescript
// TypeScript (Current)
interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// Swift (Target)
struct AuthResponse: Codable {
    let success: Bool
    let user: User?
    let token: String?
    let error: String?
}
```

## Screen Flow Mapping

### Authentication Flow
1. **LoginScreen.tsx** → **LoginView.swift**
   - Email/password input
   - Social auth buttons (Google, Apple)
   - Navigation to signup/forgot password

2. **SignupScreen.tsx** → **SignupView.swift**
   - Registration form
   - Email verification flow
   - Terms acceptance

3. **EmailVerificationScreen.tsx** → **EmailVerificationView.swift**
   - Email confirmation
   - Resend verification

### Main App Flow
1. **HomeScreen.tsx** → **HomeView.swift**
   - Shows listing with images
   - Search and filtering
   - Show cards with pricing

2. **SeatSelectionScreen.tsx** → **SeatSelectionView.swift**
   - Interactive seat map
   - Seat selection with color coding
   - Price calculation

3. **PaymentWebViewScreen.tsx** → **PaymentView.swift**
   - Stripe payment integration
   - Apple Pay support
   - Payment confirmation

4. **PaymentSuccessScreen.tsx** → **PaymentSuccessView.swift**
   - Booking confirmation
   - QR code display
   - Navigation to tickets

5. **TicketsScreen.tsx** → **TicketsView.swift**
   - User bookings list
   - QR codes for entry
   - Booking details

6. **AccountScreen.tsx** → **AccountView.swift**
   - Profile management
   - Settings
   - Logout functionality

## Storage Strategy

### Current (React Native)
- **AsyncStorage**: JWT tokens, user preferences
- **Keychain**: Planned for sensitive data

### Target (Swift)
- **Keychain**: JWT tokens, Face ID/Touch ID
- **UserDefaults**: App preferences, settings
- **Core Data**: Offline booking cache (optional)

## Key Migration Priorities

### Critical Features (Must Have)
1. JWT authentication with Keychain storage
2. Shows browsing and search
3. Interactive seat selection
4. Stripe payment processing
5. Booking management and QR codes

### Enhanced Features (iOS Native)
1. Apple Sign In integration
2. Face ID/Touch ID authentication
3. Apple Pay integration
4. Push notifications
5. Deep linking
6. Widgets for upcoming shows

## API Client Architecture

### Current Structure (mobile-app/src/lib/api/client.ts)
- Class-based ApiClient with methods for each endpoint
- Token management with AsyncStorage
- Request/response transformation
- Error handling with typed responses

### Target Structure (Swift)
- Protocol-based networking layer
- Combine publishers for reactive data flow
- Keychain-based token management
- Structured error handling with Swift Error types

## Testing Strategy

### Current Test Coverage
- Limited unit testing in React Native app
- Manual testing in Expo Go

### Target Test Coverage
- Unit tests for all API client methods
- UI tests for critical user flows
- Performance testing for seat map rendering
- Integration tests for payment flows

This reference ensures we maintain exact feature parity while leveraging iOS-specific improvements. 