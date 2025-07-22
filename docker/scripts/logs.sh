#!/bin/bash

# 📋 Docker Logs Viewer Script

echo "📋 LastMinuteLive Docker Logs"
echo "=============================="
echo ""

# Check if any services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ No services are currently running."
    echo "💡 Run './docker/scripts/start.sh' to start services"
    exit 1
fi

# Show options
echo "Choose which logs to view:"
echo "1) 🌐 Web app logs"
echo "2) 🗄️  PostgreSQL logs"
echo "3) 🔄 Redis logs"
echo "4) 📧 Mailpit logs"
echo "5) 🛠️  All logs"
echo "6) 📊 Follow all logs (live)"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo "🌐 Web App Logs:"
        docker-compose logs web
        ;;
    2)
        echo "🗄️ PostgreSQL Logs:"
        docker-compose logs postgres-local
        ;;
    3)
        echo "🔄 Redis Logs:"
        docker-compose logs redis
        ;;
    4)
        echo "📧 Mailpit Logs:"
        docker-compose logs mailpit
        ;;
    5)
        echo "🛠️ All Logs:"
        docker-compose logs
        ;;
    6)
        echo "📊 Following all logs (Ctrl+C to exit):"
        docker-compose logs -f
        ;;
    *)
        echo "❌ Invalid choice. Please select 1-6."
        exit 1
        ;;
esac 