#!/bin/bash

# 🛑 LastMinuteLive Docker Stop Script

echo "🛑 Stopping LastMinuteLive Development Environment..."
echo ""

# Check if any containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "ℹ️  No services are currently running."
    exit 0
fi

# Show current running services
echo "📊 Currently running services:"
docker-compose ps
echo ""

# Ask user what they want to do
echo "Choose how to stop the environment:"
echo "1) 🛑 Stop services (keep data)"
echo "2) 🗑️  Stop and remove containers (keep data)"
echo "3) 💥 Stop, remove containers and volumes (DELETE ALL DATA)"
echo "4) ❌ Cancel"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🛑 Stopping services..."
        docker-compose stop
        echo "✅ Services stopped. Data preserved."
        echo "💡 Use './docker/scripts/start.sh' to restart"
        ;;
    2)
        echo "🗑️  Stopping and removing containers..."
        docker-compose down
        echo "✅ Containers removed. Data preserved."
        echo "💡 Use './docker/scripts/start.sh' to restart"
        ;;
    3)
        echo "⚠️  WARNING: This will delete ALL local development data!"
        read -p "Are you sure? Type 'DELETE' to confirm: " confirm
        if [ "$confirm" = "DELETE" ]; then
            echo "💥 Removing everything..."
            docker-compose down -v
            echo "✅ All containers and data removed."
            echo "💡 Use './docker/scripts/start.sh' to start fresh"
        else
            echo "❌ Cancelled. Nothing was deleted."
        fi
        ;;
    4)
        echo "❌ Operation cancelled."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please select 1-4."
        exit 1
        ;;
esac

echo ""
echo "🎭 Development environment management complete!" 