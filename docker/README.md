# 🐳 LastMinuteLive Docker Development Environment

A comprehensive local development setup that integrates with your existing Railway database while providing a full containerized development experience.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Your Railway database credentials
- Stripe test API keys

### 1. Start Development Environment
```bash
chmod +x docker/scripts/*.sh
./docker/scripts/start.sh
```

### 2. Configure Environment
Edit the generated `.env` file with your credentials:
```bash
# Railway Database (copy from Railway dashboard)
RAILWAY_DATABASE_URL=postgresql://postgres:password@viaduct.proxy.rlwy.net:12345/railway

# Stripe Keys (copy from Stripe dashboard)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Update iOS App
The iOS app will automatically connect to `http://localhost:3001` in debug mode.

## 🏗️ Architecture

```
🐳 Docker Services:
├── 🌐 web (localhost:3001)           # Next.js app with API routes
├── 🔄 redis (localhost:6379)         # Session storage
├── 🗄️ postgres-local (localhost:5432) # Local dev database
├── 🛠️ adminer (localhost:8080)        # Database admin
└── 📧 mailpit (localhost:8025)        # Email testing
```

## 🎯 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Web App** | http://localhost:3001 | Main application + API |
| **Database Admin** | http://localhost:8080 | Manage local PostgreSQL |
| **Email Testing** | http://localhost:8025 | View sent emails |
| **Redis** | localhost:6379 | Session storage |

## 🛠️ Management Scripts

### Start Services
```bash
./docker/scripts/start.sh
```

### View Logs
```bash
./docker/scripts/logs.sh
```

### Stop Services
```bash
./docker/scripts/stop.sh
```

## 🎭 Development Workflow

### 1. iOS App Development
- iOS app connects to `http://localhost:3001`
- Real-time API testing with local backend
- Hot reloading for web app changes

### 2. Database Strategy
- **Primary:** Railway PostgreSQL (production data)
- **Local:** PostgreSQL container (development/testing)
- **Redis:** Local container (sessions/cache)

### 3. Email Testing
- All emails sent to Mailpit
- View emails at http://localhost:8025
- Test email templates and flows

## 🔧 Configuration

### Environment Variables
```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Database
RAILWAY_DATABASE_URL=postgresql://...  # Your Railway DB
REDIS_URL=redis://redis:6379

# Payment
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Multi-tenant Features
ENABLE_VENUE_MODE=true
ENABLE_ADMIN_MODE=true
```

### Docker Compose Override
Create `docker-compose.override.yml` for local customizations:
```yaml
version: '3.8'
services:
  web:
    environment:
      - DEBUG=true
    volumes:
      - ./custom-config:/app/config
```

## 🐛 Troubleshooting

### Port Conflicts
If ports are already in use:
```bash
# Check what's using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Database Connection Issues
```bash
# Test Railway connection
docker-compose exec web npm run db:test

# Check logs
docker-compose logs web
```

### Container Issues
```bash
# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Reset Everything
```bash
./docker/scripts/stop.sh
# Choose option 3 to delete all data
./docker/scripts/start.sh
```

## 📱 iOS App Integration

The iOS app automatically detects the development environment:

```swift
#if DEBUG
private let baseURL = "http://localhost:3001"  // Docker
#else
private let baseURL = "https://api.lastminutelive.com"  // Production
#endif
```

### Testing Checkout Flow
1. Start Docker services: `./docker/scripts/start.sh`
2. Open iOS app in simulator
3. Select seats and checkout
4. Payment flows through local API to Stripe
5. View confirmation with QR code

## 🏢 Multi-Tenant Development

The environment supports all user types:

- **👥 Customers:** Buy tickets, view QR codes
- **🏢 Venue Staff:** Validate tickets, manage shows
- **👑 Admins:** Full platform control
- **💰 Investors:** Analytics and reporting

## 🔄 Data Flow

```
📱 iOS App → 🐳 Docker Web (localhost:3001) → 🚂 Railway DB
                     ↓
                🔄 Local Redis (sessions)
                     ↓
                📧 Mailpit (emails)
```

## 🎯 Next Steps

1. **Setup Complete:** All services running locally
2. **iOS Testing:** Checkout flow working end-to-end
3. **Web CMS:** Build investor dashboard and admin panel
4. **Multi-Layer iOS:** Add venue staff and admin interfaces
5. **AWS Deployment:** Move to production infrastructure

## 💡 Tips

- Use `docker-compose logs -f web` to follow web app logs
- Access Rails console: `docker-compose exec web npm run console`
- Hot reloading works for React/Next.js changes
- Database changes require container restart
- Redis data persists between restarts

## 🆘 Need Help?

- Check logs: `./docker/scripts/logs.sh`
- Reset environment: `./docker/scripts/stop.sh` (option 3)
- View running services: `docker-compose ps`
- Enter container: `docker-compose exec web bash` 