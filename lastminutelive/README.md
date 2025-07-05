# Last Minute Live 🎭

A mobile-first ticket platform for last-minute live entertainment bookings.

## Features ✨

- **Mobile-First Design**: Optimized for smartphones with clean, lightweight UI
- **Real-Time Tickets**: Browse and buy tickets to shows happening today/tomorrow
- **Stripe Payments**: Secure payment processing with instant confirmation
- **Email Notifications**: Customer and venue get notified with verification codes
- **Manual Door Verification**: Simple 6-digit codes for venue staff to check at entrance
- **Venue Dashboard**: Easy show management for entertainment venues

## Tech Stack 🛠️

- **Framework**: Next.js 15 with TypeScript
- **Database**: Supabase (PostgreSQL with real-time features)
- **Payments**: Stripe Checkout & Payment Element
- **Emails**: Resend API
- **Styling**: Tailwind CSS (mobile-first approach)
- **Deployment**: Ready for Vercel

## Quick Start 🚀

1. **Clone & Install**
   ```bash
   cd lastminutelive
   npm install
   ```

2. **Environment Setup**
   Copy `.env.example` to `.env.local` and add your API keys:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   RESEND_API_KEY=your_resend_api_key
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Visit the App**
   - Homepage: http://localhost:3000 (customer view)
   - Venue Dashboard: http://localhost:3000/venue (venue management)

## User Flow 📱

### Customer Journey
1. Visit homepage → See available shows (no location barriers)
2. Click "Buy Now" → Stripe checkout → Pay securely
3. Receive email with 6-digit verification code
4. Show code at venue door

### Venue Journey
1. Visit `/venue` dashboard → Create shows easily
2. Receive email when tickets are sold
3. Click "View Tickets" for printable door list
4. Manually check off codes at show entrance

## Key Design Decisions 🎯

- **No Location Filtering**: Removed geolocation to maximize reach and avoid permission barriers
- **Manual Verification**: Simple 6-digit codes perfect for small venues
- **Mobile-First**: Lightweight, fast loading, optimized for smartphones
- **Minimal UI**: Clean design focusing on functionality over flashy graphics

## Performance Targets 📊

- ✅ Bundle size <500KB for mobile
- ✅ First paint <2s on 3G
- ✅ Mobile-optimized touch targets (44px minimum)
- ✅ No zoom on input focus (iOS)

## Current Status 🚦

**Phase 1 Complete**: Core functionality working
- ✅ Payment processing (Stripe)
- ✅ Email notifications (dual emails)
- ✅ Show management
- ✅ Mobile-first UI
- ✅ Manual door verification

**Next Phase**: Security & Testing
- [ ] Comprehensive testing suite
- [ ] Security audit
- [ ] GitHub repository setup
- [ ] Production deployment

## Development Notes 💡

- Uses TypeScript strict mode
- Row-level security (RLS) on Supabase
- Optimistic UI updates for better UX
- Error boundaries and loading states
- Accessible design with proper focus states

## Support 📧

Perfect for small entertainment venues, comedy clubs, music venues, and popup events who need a simple, reliable ticketing solution without the complexity of major platforms.

---

Built with ❤️ for the live entertainment community
