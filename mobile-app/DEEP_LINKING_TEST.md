# Deep Linking Payment Flow Test Guide

## Issue Fixed
The app was getting stuck with "Safari can't open the page because the URL is invalid" after Stripe payment. This has been fixed by implementing proper deep linking support for both Expo Go and production builds.

## What Was Changed

### 1. Backend Updates (`src/app/api/seat-checkout/route.ts`)
- Now accepts `urlScheme` parameter from mobile app
- Generates proper Expo Go URLs: `exp://YOUR_IP:8081/--/payment/success`
- Falls back to `lastminutelive://` for production builds

### 2. Mobile App Updates
- **App.tsx**: Dynamic deep linking configuration for Expo Go vs production
- **API Client**: Automatically detects environment and sends correct URL scheme
- **Payment Screens**: Handle URL parameters for deep linking
- **Dependencies**: Added `expo-linking` for URL parsing

## How to Test

### 1. Start the Backend (Terminal 1)
```bash
cd /Users/isakparild/Desktop/theone
pnpm run dev
```

### 2. Start the Mobile App (Terminal 2)
```bash
cd /Users/isakparild/Desktop/theone/mobile-app
npx expo start
```

### 3. Test Payment Flow
1. Open the app in Expo Go
2. Navigate to a show and select seats
3. Proceed to payment (Stripe checkout will open in browser)
4. Complete or cancel the payment
5. **The app should automatically redirect back** to the success/cancel screen

## Expected URLs

### For Expo Go (Development)
- Success: `exp://YOUR_IP:8081/--/payment/success?session_id=...`
- Cancel: `exp://YOUR_IP:8081/--/payment/cancel?show_id=...`

### For Production Build
- Success: `lastminutelive://payment/success?session_id=...`
- Cancel: `lastminutelive://payment/cancel?show_id=...`

## Troubleshooting

### If Still Getting URL Errors:
1. Make sure your IP address in `mobile-app/app.json` matches your network IP
2. Check that both backend and Expo Go are running
3. Verify the console logs show the correct URL scheme being sent

### Check Console Logs:
- Backend: Look for "📱 Using URL scheme for payment redirect"
- Mobile: Look for API client URL scheme detection

## Files Modified
- `src/app/api/seat-checkout/route.ts`
- `mobile-app/App.tsx`
- `mobile-app/src/lib/api/client.ts`
- `mobile-app/src/screens/PaymentSuccessScreen.tsx`
- `mobile-app/src/screens/PaymentCancelScreen.tsx`
- `mobile-app/src/types/navigation.ts` 