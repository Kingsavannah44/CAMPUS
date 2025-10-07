#!/bin/bash

# Campus Election System - Quick Deploy Script

echo "🗳️  Campus Election System Deployment"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep mongod > /dev/null; then
    echo "⚠️  MongoDB not running. Starting MongoDB..."
    sudo systemctl start mongod 2>/dev/null || echo "Please start MongoDB manually"
fi

# Backend setup
echo "🔧 Setting up backend..."
cd campus-election-backend

# Install dependencies
npm install

# Setup environment
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file. Please edit with your settings."
    
    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    sed -i "s/your-super-secure-jwt-secret-key-here-change-this-in-production/$JWT_SECRET/" .env
    echo "🔑 Generated JWT secret"
fi

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# Start backend
echo "🚀 Starting backend server..."
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Frontend setup
echo "🎨 Setting up frontend..."
cd ../frontend

# Check if Python is available for serving
if command -v python3 &> /dev/null; then
    echo "🌐 Starting frontend server on http://localhost:3000"
    python3 -m http.server 3000 &
    FRONTEND_PID=$!
elif command -v python &> /dev/null; then
    echo "🌐 Starting frontend server on http://localhost:3000"
    python -m http.server 3000 &
    FRONTEND_PID=$!
else
    echo "⚠️  Python not found. Please serve frontend manually or install Python."
fi

echo ""
echo "✅ Deployment Complete!"
echo "========================"
echo "🔗 Frontend: http://localhost:3000"
echo "🔗 Backend:  http://localhost:5000"
echo "📊 API Test: http://localhost:5000/api"
echo ""
echo "Press Ctrl+C to stop servers"

# Wait for user interrupt
trap 'echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT
wait