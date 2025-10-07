@echo off
echo 🗳️  Campus Election System Deployment
echo ======================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Backend setup
echo 🔧 Setting up backend...
cd campus-election-backend

REM Install dependencies
call npm install

REM Setup environment
if not exist .env (
    copy .env.example .env
    echo 📝 Created .env file. Please edit with your settings.
)

REM Create uploads directory
if not exist uploads mkdir uploads

REM Start backend
echo 🚀 Starting backend server...
start "Backend Server" cmd /k "npm start"

REM Wait a moment
timeout /t 3 /nobreak >nul

REM Frontend setup
echo 🎨 Setting up frontend...
cd ..\frontend

REM Start frontend server
echo 🌐 Starting frontend server on http://localhost:3000
start "Frontend Server" cmd /k "python -m http.server 3000 || npx serve -s . -l 3000"

echo.
echo ✅ Deployment Complete!
echo ========================
echo 🔗 Frontend: http://localhost:3000
echo 🔗 Backend:  http://localhost:5000
echo 📊 API Test: http://localhost:5000/api
echo.
echo Press any key to continue...
pause >nul