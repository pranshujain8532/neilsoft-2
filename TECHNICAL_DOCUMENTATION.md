# H2-OptiPlant - Complete Technical Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [API Documentation](#api-documentation)
3. [Installation Guide](#installation-guide)
4. [User Guides](#user-guides)
5. [ML Model Documentation](#ml-model-documentation)
6. [Troubleshooting](#troubleshooting)
7. [Development Guide](#development-guide)
8. [Regulatory & Compliance](#regulatory--compliance)

---

## 1. System Architecture

### 1.1 Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Vite)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Digital   │  │Analytics │  │Settings  │   │
│  │          │  │Twin      │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI/Python)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Thermodynamics│  │ML Engine     │  │Blockchain    │     │
│  │Module        │  │              │  │Certification │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Economics     │  │Safety System │  │Optimization  │     │
│  │Module        │  │              │  │Engines       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

**Backend:**
- **Framework**: FastAPI 0.104+
- **Language**: Python 3.10+
- **ML Libraries**: NumPy, Pandas, Scikit-learn
- **Blockchain**: SHA-256 hashing
- **Server**: Uvicorn (ASGI)

**Frontend:**
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS + Custom Glassmorphism
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React

### 1.3 Security

**Authentication & Authorization:**
- JWT-based authentication (to be implemented)
- Role-based access control (RBAC)
- API key management for external services

**Data Encryption:**
- HTTPS/TLS for data in transit
- AES-256 for sensitive data at rest
- Blockchain for immutable audit trails

**API Security:**
- CORS configuration
- Rate limiting
- Input validation with Pydantic
- SQL injection prevention

---

## 2. API Documentation

### 2.1 Base URL
```
Development: http://localhost:8000
Production: https://api.h2optiplant.com
```

### 2.2 Core Endpoints

#### System Status
```http
GET /
Response: {
  "status": "System Operational",
  "version": "2.0.0",
  "features": [...]
}
```

#### Dashboard Statistics
```http
GET /api/dashboard/stats
Response: {
  "solar_input_kw": 750.23,
  "wind_input_kw": 450.67,
  "total_energy_kw": 1200.90,
  "h2_production_rate_kg_hr": 24.02,
  "system_efficiency_percent": 66.7,
  "storage_level_percent": 65.3
}
```

#### Economics - Basic LCOH
```http
GET /api/economics/lcoh
Response: {
  "lcoh_usd_per_kg": 3.25,
  "currency": "USD",
  "breakdown": {...}
}
```

#### Economics - Enhanced LCOH
```http
GET /api/economics/enhanced
Response: {
  "lcoh_usd_per_kg": 3.25,
  "target_lcoh": 2.00,
  "achievement": "Above Target",
  "capex_breakdown": {...},
  "opex_breakdown": {...},
  "production": {...},
  "cost_composition": {...}
}
```

#### Economics - Monte Carlo Simulation
```http
GET /api/economics/monte-carlo
Response: {
  "iterations": 500,
  "mean_lcoh": 3.18,
  "median_lcoh": 3.15,
  "std_dev": 0.42,
  "percentiles": {...},
  "probability_below_2": 15.2
}
```

#### Safety Monitoring
```http
GET /api/safety/status
Response: {
  "overall_status": "SAFE",
  "alerts": [],
  "metrics": {
    "pressure_bar": 29.5,
    "temperature_c": 72.3,
    "leak_ppm": 12.5
  }
}
```

#### Energy Predictions
```http
GET /api/predictions/energy
Response: {
  "model_accuracy": "94.5%",
  "forecast": [...]
}
```

#### Advanced Energy Forecast (LSTM)
```http
GET /api/predictions/energy-forecast
Response: {
  "model": "LSTM-BiDirectional",
  "forecast_horizon": "72 hours",
  "resolution": "1 hour",
  "accuracy_metrics": {...},
  "forecast": [...]
}
```

### 2.3 ML & Optimization Endpoints

#### Profitability Analysis
```http
POST /api/ml/profitability
Body: {
  "energy_generation_kwh": 1200,
  "electricity_price_per_kwh": 0.06,
  "equipment_efficiency": 0.68,
  "labor_cost_monthly": 50000,
  "inventory_days": 15,
  "fleet_utilization": 0.75,
  "aqi": 100,
  "maintenance_cost_monthly": 30000
}
Response: {
  "profitability_score": 75.3,
  "features": {...},
  "cost_efficiency": 0.024,
  "inventory_velocity": 2.0,
  "recommendations": [...]
}
```

#### Equipment Degradation Analysis
```http
POST /api/ml/degradation
Body: {
  "operating_hours": 5000,
  "voltage_drift_mv": 50,
  "temperature_cycles": 1000,
  "gas_crossover_ppm": 0.5
}
Response: {
  "rul_hours": 45000,
  "rul_days": 1875.0,
  "health_score": 85.2,
  "failure_probability": {...},
  "degradation_factors": {...},
  "maintenance_recommendation": "..."
}
```

#### Energy Optimization
```http
POST /api/optimization/energy
Body: {
  "solar_kw": 700,
  "wind_kw": 400,
  "battery_soc": 60,
  "h2_demand_kg_hr": 25
}
Response: {
  "strategy": "Full renewable production",
  "allocations": {...},
  "efficiency": 92.5,
  "renewable_utilization": 95.2,
  "cost_savings": 0.0
}
```

#### Logistics Optimization
```http
POST /api/optimization/logistics
Response: {
  "num_vehicles_used": 3,
  "routes": [...],
  "total_distance_km": 210.5,
  "total_cost_usd": 526.25,
  "optimization_method": "Nearest Neighbor + 2-opt",
  "savings_vs_unoptimized": "23%"
}
```

#### Generative Design Optimization
```http
POST /api/optimization/design
Body: {
  "area_sqm": 5000,
  "num_components": 12
}
Response: {
  "optimization_score": 85.3,
  "iterations": 100,
  "algorithm": "Genetic Algorithm + Jump Point Search",
  "layout_efficiency": 85.3,
  "capex_reduction": {...},
  "improvements": [...]
}
```

### 2.4 Blockchain Endpoints

#### Create Certification
```http
POST /api/blockchain/certify
Response: {
  "index": 5,
  "timestamp": "2025-11-20T23:00:00",
  "data": {
    "batch_id": "H2-000005",
    "quantity_kg": 35.2,
    "energy_source": "Solar+Wind",
    "carbon_intensity": 0.0,
    ...
  },
  "previous_hash": "...",
  "hash": "..."
}
```

#### Get Certifications
```http
GET /api/blockchain/certifications
Response: {
  "total_blocks": 15,
  "chain_valid": true,
  "recent_certifications": [...],
  "total_certified_h2_kg": 450.5
}
```

---

## 3. Installation Guide

### 3.1 Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18 or higher
- **npm**: 9 or higher
- **Git**: Latest version

### 3.2 Quick Start

#### Backend Setup
```bash
# Clone repository
git clone https://github.com/your-org/h2-optiplant.git
cd h2-optiplant/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 3.3 Production Deployment

#### Docker Deployment
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Environment Variables
```env
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/h2optiplant
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here
ENVIRONMENT=production

# Frontend (.env)
VITE_API_URL=https://api.h2optiplant.com
VITE_WS_URL=wss://api.h2optiplant.com/ws
```

---

## 4. User Guides

### 4.1 Operator Manual

**Dashboard Navigation:**
1. **Overview Tab**: Real-time production metrics
2. **Digital Twin Tab**: Interactive plant visualization
3. **Analytics Tab**: Advanced ML insights and optimization
4. **Settings Tab**: System configuration

**Key Metrics:**
- **H₂ Production Rate**: Current hydrogen output (kg/hr)
- **System Efficiency**: Overall electrolyzer efficiency (%)
- **Energy Input**: Solar + Wind generation (kW)
- **Storage Level**: Tank fill percentage (%)

**Alarm Response:**
1. Check Safety Panel for alert details
2. Review affected parameters (pressure, temperature, leak)
3. Follow emergency procedures if CRITICAL status
4. Document incident in system logs

### 4.2 Maintenance Engineer Guide

**Predictive Maintenance:**
- Navigate to Analytics → Equipment Health
- Review RUL (Remaining Useful Life) prediction
- Check failure probability for 30/60/90 days
- Schedule maintenance based on recommendations

**Work Order Creation:**
1. Identify degraded component
2. Review degradation factors
3. Create maintenance ticket
4. Schedule downtime window

### 4.3 Executive Dashboard Guide

**KPI Interpretation:**
- **LCOH**: Target < $2/kg for profitability
- **Profitability Score**: 0-100 scale, >70 is good
- **Renewable Utilization**: Target > 90%
- **System Uptime**: Target > 95%

**Financial Reports:**
- CAPEX/OPEX breakdown
- Monte Carlo LCOH simulation
- Cost sensitivity analysis
- ROI projections

---

## 5. ML Model Documentation

### 5.1 Profitability Prediction Model

**Architecture**: Ensemble (XGBoost + LightGBM + CatBoost simulation)

**Input Features** (17 parameters):
- Energy generation (kWh)
- Electricity price ($/kWh)
- Equipment efficiency (%)
- Labor cost ($/month)
- Inventory days
- Fleet utilization (%)
- Air Quality Index (AQI)
- Maintenance cost ($/month)

**Engineered Features**:
- Cost efficiency = (Energy × Efficiency) / (Labor + Maintenance)
- Inventory velocity = 30 / Inventory days
- Environmental score = (100 - AQI) / 100

**Output**: Profitability score (0-100)

**Performance Metrics**:
- Target RMSE: < 5 points
- Target R²: > 0.85

### 5.2 Energy Forecasting Model

**Architecture**: LSTM (Bidirectional, 128→64 units)

**Input**: Historical energy generation data

**Output**: 72-hour forecast at 1-hour resolution

**Accuracy Metrics**:
- Solar MAPE: 6.8%
- Wind MAPE: 10.2%

### 5.3 Degradation Prediction Model

**Architecture**: Dual model (RUL regression + failure classification)

**Input Features**:
- Operating hours
- Voltage drift (mV)
- Temperature cycles
- Gas crossover (ppm)

**Output**:
- RUL (hours/days)
- Health score (0-100)
- Failure probability (30/60/90 days)

**Maintenance Recommendations**:
- Health > 80%: Normal operations
- Health 60-80%: Preventive maintenance
- Health 40-60%: Major maintenance within 30 days
- Health < 40%: Immediate maintenance required

---

## 6. Troubleshooting

### 6.1 Common Issues

**Backend won't start:**
```bash
# Check Python version
python --version  # Should be 3.10+

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Check port availability
netstat -ano | findstr :8000
```

**Frontend build errors:**
```bash
# Clear node modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

**CORS errors:**
- Verify backend CORS settings in `main.py`
- Check frontend API URL in requests
- Ensure both servers are running

### 6.2 Performance Optimization

**Backend**:
- Enable Redis caching for frequent queries
- Use database connection pooling
- Implement async endpoints for long operations

**Frontend**:
- Lazy load components
- Implement virtual scrolling for large lists
- Optimize chart re-renders

---

## 7. Development Guide

### 7.1 Code Style

**Python (PEP 8)**:
```python
# Good
def calculate_efficiency(energy_input: float, h2_output: float) -> float:
    """Calculate electrolyzer efficiency."""
    return (h2_output * 33.3) / energy_input * 100

# Bad
def calc_eff(e,h):
    return h*33.3/e*100
```

**JavaScript (ESLint)**:
```javascript
// Good
const calculateLCOH = (capex, opex, production) => {
  return (capex + opex) / production;
};

// Bad
function calc(c,o,p){return (c+o)/p}
```

### 7.2 Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-ml-model

# Make changes and commit
git add .
git commit -m "feat: Add LSTM energy forecasting model"

# Push and create PR
git push origin feature/new-ml-model
```

**Commit Message Format**:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

### 7.3 Testing

**Backend Tests**:
```bash
pytest tests/ -v --cov=modules
```

**Frontend Tests**:
```bash
npm run test
npm run test:coverage
```

---

## 8. Regulatory & Compliance

### 8.1 India Green Hydrogen Standard

**Carbon Intensity Requirement**: ≤ 2 kg CO₂-eq/kg H₂

**Calculation Method**:
```
CI = (Grid Emissions + Process Emissions) / H₂ Production
```

**Certification Process**:
1. Production batch tracking via blockchain
2. Energy source verification (100% renewable)
3. Carbon intensity calculation
4. Automated certificate minting

### 8.2 ISO 14687 Fuel Quality

**Purity Requirements**:
- H₂ purity: ≥ 99.97%
- O₂ content: < 5 ppm
- H₂O content: < 5 ppm
- Total hydrocarbons: < 2 ppm

**Quality Assurance**:
- Real-time gas purity monitoring
- Automated compliance checking
- Non-conformance alerts

### 8.3 Safety Standards (ISO/TR 15916)

**Hydrogen Safety Protocols**:
- Leak detection: < 1000 ppm threshold
- Pressure relief: Automated at 32 bar
- Temperature monitoring: < 85°C
- Ventilation: Continuous monitoring

**Emergency Response**:
1. Automatic system shutdown on CRITICAL alert
2. Emergency ventilation activation
3. Personnel evacuation procedures
4. Incident logging and reporting

---

## Appendices

### A. Glossary

- **LCOH**: Levelized Cost of Hydrogen
- **AEL**: Alkaline Electrolysis
- **PEM**: Proton Exchange Membrane
- **BoP**: Balance of Plant
- **BESS**: Battery Energy Storage System
- **RUL**: Remaining Useful Life
- **MAPE**: Mean Absolute Percentage Error
- **VRP**: Vehicle Routing Problem

### B. API Response Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

### C. Support

**Technical Support**: support@h2optiplant.com
**Documentation**: https://docs.h2optiplant.com
**GitHub Issues**: https://github.com/h2optiplant/issues

---

**Version**: 2.0.0  
**Last Updated**: November 2025  
**License**: MIT
