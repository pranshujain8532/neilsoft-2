# How to Run H2-OptiPlant

## Prerequisites
- Node.js & npm installed
- Python 3.8+ installed

## 1. Backend Server (Terminal 1)
The backend powers the data, ML models, and weather API.

```powershell
# Navigate to backend
cd "d:\neilsoft 2\backend"

# Install dependencies (first time only)
pip install fastapi uvicorn requests python-multipart

# Enable Real-Time Weather Data
$env:USE_REAL_WEATHER='true'

# Start the Server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 2. Frontend Application (Terminal 2)
The frontend runs the premium React UI.

```powershell
# Navigate to frontend
cd "d:\neilsoft 2\frontend"

# Install dependencies (first time only)
npm install

# Start Development Server
npm run dev
```

## Access the Application
- **Dashboard**: [http://localhost:5173](http://localhost:5173)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
