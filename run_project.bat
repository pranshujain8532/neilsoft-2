@echo off
echo ===================================================
echo 🚀 Starting Green Hydrogen Platform (SIH2025)
echo ===================================================

echo.
echo 1. Starting Backend Server (Port 5000)...
start "Backend Server" cmd /k "cd server && npm run dev"

echo.
echo 2. Starting ML Services (Port 5001)...
start "ML Services" cmd /k "cd ml-services && venv\Scripts\activate && python app.py"

echo.
echo 3. Starting Frontend Application (Port 3000)...
start "Frontend App" cmd /k "npm run dev"

echo.
echo ✅ All services are launching in separate windows.
echo    - Frontend: http://localhost:3000
echo    - Backend:  http://localhost:5000
echo    - ML API:   http://localhost:5001
echo.
pause
