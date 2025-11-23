<<<<<<< HEAD
# SIH2025 Green Hydrogen Production System

A comprehensive, AI-powered platform for managing green hydrogen production, storage, and distribution using renewable energy sources. Built for the Smart India Hackathon 2025.

## 🌟 Features

### Frontend
- **Modern React UI** with Vite, TypeScript, and Tailwind CSS
- **3D Visualizations** using Three.js and React Three Fiber
- **Real-time Updates** via Socket.io
- **Auto Dark Mode** based on time of day
- **Responsive Design** with glassmorphism effects
- **Interactive Dashboards** with Recharts

### Backend
- **Express.js API** with TypeScript
- **MongoDB** for data persistence
- **Socket.io** for real-time communication
- **JWT Authentication** with role-based access control
- **RESTful Architecture** following best practices

### ML/AI Services
- **Profit Prediction** using LSTM models
- **Safety Monitoring** with physics-informed neural networks
- **Plant Recommendation System** for order routing
- **Energy Forecasting** for renewable sources
- **Conversational AI Chatbot** for customer support
- **Logistics Optimization** with routing algorithms

### Blockchain
- **Hyperledger Fabric** for supply chain tracking
- **Polygon ERC-1155** for certification tokens
- **Immutable Certificates** of origin

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ and npm
- Python 3.9+
- MongoDB
- (Optional) Docker for containerization

### Installation

#### 1. Frontend Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

#### 2. Backend Setup
```bash
cd server

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The backend API will be available at `http://localhost:5000`

#### 3. ML Services Setup
```bash
cd ml-services

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server
python app.py
```

The ML API will be available at `http://localhost:5001`

### Environment Variables

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_ML_API_URL=http://localhost:5001
VITE_GOOGLE_MAPS_API_KEY=your_key_here
VITE_WEATHER_API_KEY=your_key_here
```

#### Backend (server/.env)
```env
MONGODB_URI=mongodb://localhost:27017/green-hydrogen
JWT_SECRET=your_secret_key
WEATHER_API_KEY=your_key_here
```

## 📁 Project Structure

```
SIH2025Neilsoft/
├── src/                      # Frontend React application
│   ├── components/           # Reusable components
│   ├── pages/                # Page components
│   ├── utils/                # Utilities and API client
│   └── styles/               # Global styles
├── server/                   # Backend Express server
│   └── src/
│       ├── models/           # MongoDB models
│       ├── routes/           # API routes
│       └── socketHandlers/   # Socket.io handlers
├── ml-services/              # Python ML/AI services
│   ├── routes/               # Flask API routes
│   └── models/               # ML model implementations
└── blockchain/               # Blockchain contracts
    ├── hyperledger/          # Fabric network config
    └── polygon/              # Solidity contracts
```

## 🎯 Key Pages

### Admin Dashboard
- Real-time production monitoring
- Weather integration
- Profit prediction with AI
- Machine health tracking
- Energy source distribution

### Plant Monitoring
- 3D interactive plant visualization
- Machine status dashboard
- Health metrics and alerts

### Storage Management
- 3D container visualization
- Real-time temperature/pressure monitoring
- Leakage detection alerts

### Transport & Logistics
- Fleet tracking with GPS
- Route optimization
- ETA calculations
- Capacity monitoring

### Customer Portal
- Hydrogen marketplace
- Blockchain-certified products
- AI chatbot assistance
- Order tracking

## 🤖 ML Models

1. **Profit Predictor**: LSTM-based forecasting considering weather, machine efficiency, and market prices
2. **Safety Monitor**: Physics-informed neural network for anomaly detection
3. **Recommendation System**: Plant selection optimization for orders
4. **Energy Forecaster**: 24-hour ahead renewable energy prediction
5. **Logistics Optimizer**: Vehicle routing with capacity constraints

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Helmet.js security headers
- Environment variable management
- Role-based access control

## 📊 Tech Stack

**Frontend**: React, TypeScript, Vite, Tailwind CSS, Three.js, Framer Motion, Recharts, Socket.io-client

**Backend**: Node.js, Express, TypeScript, MongoDB, Mongoose, Socket.io, JWT

**ML/AI**: Python, Flask, TensorFlow, PyTorch, scikit-learn, stable-baselines3

**Blockchain**: Hyperledger Fabric, Solidity, Web3.js, Ethers.js

## 🧪 Testing

```bash
# Frontend tests
npm test

# Backend tests
cd server && npm test

# ML service tests
cd ml-services && pytest
```

## 📦 Deployment

Build for production:

```bash
# Frontend
npm run build

# Backend
cd server && npm run build

# Docker (all services)
docker-compose up --build
```

## 🤝 Contributing

This project was developed for SIH2025. For contributions, please follow standard Git workflow practices.

## 📄 License

This project is part of Smart India Hackathon 2025 submission.

## 👥 Team

Built with ❤️ for India's Green Hydrogen Mission

## 🔗 Resources

- [National Green Hydrogen Mission](https://mnre.gov.in)
- [India Green Hydrogen Standards](https://mnre.gov.in)
- Documentation for APIs and models in `/docs`
=======
# Neilsoft2025
SIH2025
>>>>>>> 6024296fe943d55f9abf55878785183c849e7deb
