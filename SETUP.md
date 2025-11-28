# Project Setup Guide

## Prerequisites
- Docker & Docker Compose
- Node.js (v16+)
- Python (3.9+)

## Quick Start (Docker)

1. **Build and Run Services**
   ```bash
   docker-compose up --build
   ```
   This will start:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000
   - ML Service: http://localhost:5001
   - MongoDB: localhost:27017

## Manual Setup

### 1. Backend (Node.js)
```bash
cd server
npm install
npm run dev
```

### 2. Frontend (React)
```bash
# In root directory
npm install
npm run dev
```

### 3. ML Services (Python)
```bash
cd ml-services
pip install -r requirements.txt
python app.py
```

## Environment Variables
Ensure `.env` file exists in root with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
GOOGLE_MAPS_API_KEY=...
```

## Verification
- **Swagger UI**: Visit `http://localhost:5001/apidocs/` to test ML endpoints.
- **Maintenance**: Go to `/maintenance` in the app.
- **Metrics**: Go to `/metrics` in the app.
