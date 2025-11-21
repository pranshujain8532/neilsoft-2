from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.thermo import calculate_efficiency
from modules.economics import calculate_lcoh
from modules.safety import check_safety_status
from modules.ml_engine import predict_energy_generation
from modules.blockchain import certify_production_batch, get_certifications
from modules.advanced_ml import get_profitability_analysis, get_energy_forecast, get_degradation_analysis
from modules.optimization import get_energy_optimization, get_logistics_optimization, get_design_optimization
from modules.enhanced_economics import get_enhanced_lcoh, get_monte_carlo_lcoh
from modules.weather_api import get_real_time_energy_data
from modules.ml_accuracy import get_model_accuracy_report, get_individual_model_accuracy
import random
import os

app = FastAPI(
    title="H2-OptiPlant API", 
    description="Smart Process System for Green Hydrogen Production",
    version="2.0.0"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "System Operational", 
        "version": "2.0.0",
        "features": [
            "Real-time Monitoring",
            "AI/ML Predictions",
            "Blockchain Certification",
            "Energy Optimization",
            "Logistics Management",
            "Advanced Economics"
        ]
    }

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    # Use simulation by default for reliability, set USE_REAL_WEATHER=true to enable API
    use_real_weather = os.getenv("USE_REAL_WEATHER", "false").lower() == "true"
    
    if use_real_weather:
        try:
            # Try to get real-time weather data from API
            weather_data = get_real_time_energy_data()
            solar_input = weather_data.get('solar_kw', random.uniform(500, 1000))
            wind_input = weather_data.get('wind_kw', random.uniform(200, 800))
            data_source = weather_data.get('data_source', 'Simulation')
            weather_info = {
                'temperature_c': weather_data.get('temperature_c', 25),
                'humidity_percent': weather_data.get('humidity_percent', 50),
                'wind_speed_ms': weather_data.get('wind_speed_ms', 5),
                'cloud_cover_percent': weather_data.get('cloud_cover_percent', 20),
                'weather_condition': weather_data.get('weather_condition', 'Clear'),
                'location': weather_data.get('location', 'Delhi')
            }
        except Exception as e:
            print(f"Weather API failed, using simulation: {e}")
            solar_input = random.uniform(500, 1000)
            wind_input = random.uniform(200, 800)
            data_source = "Simulation (API Error)"
            weather_info = None
    else:
        # Use simulation (default for reliability)
        solar_input = random.uniform(500, 1000)
        wind_input = random.uniform(200, 800)
        data_source = "Simulation"
        weather_info = None
    
    total_energy = solar_input + wind_input
    h2_production_rate = total_energy * 0.02  # Approx kg/hr based on efficiency
    efficiency = calculate_efficiency(total_energy, h2_production_rate)
    
    response = {
        "solar_input_kw": round(solar_input, 2),
        "wind_input_kw": round(wind_input, 2),
        "total_energy_kw": round(total_energy, 2),
        "h2_production_rate_kg_hr": round(h2_production_rate, 2),
        "system_efficiency_percent": round(efficiency, 2),
        "storage_level_percent": round(random.uniform(40, 90), 1),
        "data_source": data_source
    }
    
    if weather_info:
        response['weather'] = weather_info
    
    return response

@app.get("/api/economics/lcoh")
def get_lcoh():
    return calculate_lcoh()

@app.get("/api/economics/enhanced")
def get_enhanced_economics():
    """Get comprehensive LCOH analysis"""
    return get_enhanced_lcoh()

@app.get("/api/economics/monte-carlo")
def get_monte_carlo_analysis():
    """Get Monte Carlo LCOH simulation"""
    return get_monte_carlo_lcoh(iterations=500)

@app.get("/api/safety/status")
def get_safety_status():
    return check_safety_status()

@app.get("/api/predictions/energy")
def get_energy_prediction():
    return predict_energy_generation()

@app.get("/api/predictions/energy-forecast")
def get_advanced_energy_forecast():
    """Get 72-hour LSTM energy forecast"""
    return get_energy_forecast()

@app.post("/api/ml/profitability")
def analyze_profitability(plant_params: dict = None):
    """Analyze plant profitability"""
    if plant_params is None:
        plant_params = {
            'energy_generation_kwh': random.uniform(800, 1500),
            'electricity_price_per_kwh': random.uniform(0.04, 0.08),
            'equipment_efficiency': random.uniform(0.60, 0.75),
            'labor_cost_monthly': random.uniform(40000, 60000),
            'inventory_days': random.uniform(10, 20),
            'fleet_utilization': random.uniform(0.65, 0.85),
            'aqi': random.uniform(50, 150),
            'maintenance_cost_monthly': random.uniform(25000, 40000)
        }
    return get_profitability_analysis(plant_params)

@app.post("/api/ml/degradation")
def analyze_degradation(equipment_data: dict = None):
    """Analyze equipment degradation"""
    if equipment_data is None:
        equipment_data = {
            'operating_hours': random.uniform(3000, 10000),
            'voltage_drift_mv': random.uniform(20, 100),
            'temperature_cycles': random.uniform(500, 2000),
            'gas_crossover_ppm': random.uniform(0.1, 2.0)
        }
    return get_degradation_analysis(equipment_data)

@app.post("/api/optimization/energy")
def optimize_energy(current_state: dict = None):
    """Optimize energy dispatch"""
    if current_state is None:
        current_state = {
            'solar_kw': random.uniform(400, 900),
            'wind_kw': random.uniform(200, 600),
            'battery_soc': random.uniform(30, 80),
            'h2_demand_kg_hr': random.uniform(20, 35)
        }
    return get_energy_optimization(current_state)

@app.post("/api/optimization/logistics")
def optimize_logistics():
    """Optimize delivery routes"""
    # Sample delivery requests
    delivery_requests = [
        {'id': 1, 'quantity_kg': 150, 'distance_km': 45},
        {'id': 2, 'quantity_kg': 200, 'distance_km': 32},
        {'id': 3, 'quantity_kg': 120, 'distance_km': 58},
        {'id': 4, 'quantity_kg': 180, 'distance_km': 28},
        {'id': 5, 'quantity_kg': 100, 'distance_km': 67}
    ]
    return get_logistics_optimization(delivery_requests)

@app.post("/api/optimization/design")
def optimize_design(constraints: dict = None):
    """Optimize plant layout"""
    if constraints is None:
        constraints = {
            'area_sqm': 5000,
            'num_components': 12
        }
    return get_design_optimization(constraints)

@app.post("/api/blockchain/certify")
def certify_batch():
    """Create a new certification for a production batch"""
    quantity = random.uniform(20, 40)  # kg
    energy_mix = "Solar+Wind"
    cert = certify_production_batch(quantity, energy_mix)
    return cert

@app.get("/api/blockchain/certifications")
def get_blockchain_certifications():
    """Get blockchain certification data"""
    return get_certifications()

@app.get("/api/ml/accuracy")
def get_ml_accuracy():
    """Get comprehensive ML model accuracy report"""
    return get_model_accuracy_report()

@app.get("/api/ml/accuracy/{model_name}")
def get_specific_model_accuracy(model_name: str):
    """Get accuracy for a specific ML model (profitability, energy, degradation)"""
    return get_individual_model_accuracy(model_name)
