@echo off
echo Starting Green Hydrogen Platform...

:: Start Backend Server
start "Backend Server (Port 5000)" cmd /k "cd server && npm install && npm run dev"

:: Start ML Service
start "ML Service (Port 5001)" cmd /k "cd ml-services && pip install -r requirements.txt && python app.py"

:: Start Frontend
start "Frontend (Port 5173)" cmd /k "npm install && npm run dev"

echo All services are starting...
echo Backend: http://localhost:5000
echo ML Service: http://localhost:5001
echo Frontend: http://localhost:5173
pause
