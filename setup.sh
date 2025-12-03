#!/bin/bash
# Agent Prototype Setup and Start Script
# This script installs dependencies and starts both backend and frontend

echo "🚀 Agent Prototype Setup"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
echo "   Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed successfully"
echo ""

# Step 2 & 3: Start backend and frontend
echo "🎯 Step 2 & 3: Starting backend and frontend..."
echo "   Backend will run on http://localhost:3001"
echo "   Frontend will run on http://localhost:5173"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend in background
echo "   Starting backend..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Start frontend in background
echo "   Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Both services are starting..."
echo ""
echo "📊 Service Status:"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID

