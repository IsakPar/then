#!/bin/bash

# 🚀 LastMinuteLive Docker Development Startup Script

echo "🐳 Starting LastMinuteLive Development Environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    if [ -f docker/config/development.env ]; then
        echo "📋 Creating .env from development template..."
        cp docker/config/development.env .env
        echo "⚠️  Please edit .env with your Railway database URL and Stripe keys"
        echo ""
    else
        echo "❌ No environment configuration found. Please create .env file."
        exit 1
    fi
fi

# Start all services
echo "🚀 Starting Docker services..."
docker-compose up -d

# Wait a moment for services to start
echo "⏳ Waiting for services to initialize..."
sleep 5

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🎯 Development URLs:"
echo "   🌐 Web App:        http://localhost:3001"
echo "   🗄️  Database Admin: http://localhost:8080"
echo "   📧 Email Testing:  http://localhost:8025"
echo "   🔄 Redis:          localhost:6379"
echo ""

echo "📱 iOS App Configuration:"
echo "   Update APIClient baseURL to: http://localhost:3001"
echo ""

echo "🛠️ Useful Commands:"
echo "   docker-compose logs web     # View web app logs"
echo "   docker-compose stop         # Stop all services"
echo "   docker-compose down         # Stop and remove containers"
echo "   ./docker/scripts/logs.sh    # View all logs"
echo ""

echo "✅ Development environment is ready!"
echo "🎭 Happy coding!" 