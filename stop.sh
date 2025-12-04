#!/bin/bash
# Stop Agent Backend and Frontend Script
# This script stops all running Node processes for the Agent project

echo "🛑 Stopping Agent Services..."
echo ""

# Find processes on ports 3001 and 5173
BACKEND_PID=$(lsof -ti:3001 2>/dev/null)
FRONTEND_PID=$(lsof -ti:5173 2>/dev/null)

if [ -z "$BACKEND_PID" ] && [ -z "$FRONTEND_PID" ]; then
    echo "ℹ️  No running services found on ports 3001 or 5173"
    echo ""
    
    # Try to find tsx or vite processes
    TSX_PID=$(pgrep -f "tsx.*server.ts" 2>/dev/null)
    VITE_PID=$(pgrep -f "vite" 2>/dev/null)
    
    if [ -n "$TSX_PID" ] || [ -n "$VITE_PID" ]; then
        if [ -n "$TSX_PID" ]; then
            echo "Found backend process: $TSX_PID"
            kill $TSX_PID 2>/dev/null
        fi
        if [ -n "$VITE_PID" ]; then
            echo "Found frontend process: $VITE_PID"
            kill $VITE_PID 2>/dev/null
        fi
        echo "✅ Services stopped"
    else
        echo "ℹ️  No services running"
    fi
else
    if [ -n "$BACKEND_PID" ]; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    echo "✅ Services stopped"
fi

echo ""

