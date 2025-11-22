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

# ========================================
# NEW ML MODEL ENDPOINTS
# ========================================

# Profit Predictor RL
@app.post("/api/ml-rl/profit-predictor")
def predict_profit_rl(plant_data: dict = None):
    """Predict profitability using Reinforcement Learning (DQN)"""
    from modules.profit_predictor_rl import predict_profitability_rl, get_profit_trends
    
    if plant_data is None:
        plant_data = {
            'weather_quality': random.uniform(0.6, 0.9),
            'equipment_efficiency': random.uniform(0.65, 0.75),
            'labor_productivity': random.uniform(0.75, 0.9),
            'electricity_price_per_kwh': random.uniform(0.04, 0.08),
            'inventory_days': random.randint(10, 20),
            'h2_market_price': random.uniform(4.5, 5.5),
            'equipment_health_score': random.uniform(75, 95),
            'storage_health_score': random.uniform(80, 95)
        }
    
    return predict_profitability_rl(plant_data)

@app.get("/api/ml-rl/profit-trends/{plant_id}")
def get_plant_profit_trends(plant_id: str, days: int = 30):
    """Get historical profit trends for a plant"""
    from modules.profit_predictor_rl import get_profit_trends
    return get_profit_trends(plant_id, days)

# Recommendation System
@app.post("/api/ml-rl/recommend-plant")
def recommend_plant_for_order(order: dict, plants: list = None):
    """Recommend optimal plant for customer order"""
    from modules.recommendation_system_rl import get_plant_recommendation_for_order
    
    # Sample plants if not provided
    if plants is None:
        plants = [
            {'plant_id': 'H2P-001', 'name': 'Delhi Plant', 'current_capacity_available': 300, 
             'distance_to_customer_km': 45, 'energy_score': 0.85, 'cost_efficiency_score': 0.75, 'price_per_kg': 5.20},
            {'plant_id': 'H2P-002', 'name': 'Mumbai Plant', 'current_capacity_available': 400,
             'distance_to_customer_km': 320, 'energy_score': 0.90, 'cost_efficiency_score': 0.82, 'price_per_kg': 4.95},
            {'plant_id': 'H2P-003', 'name': 'Bangalore Plant', 'current_capacity_available': 250,
             'distance_to_customer_km': 180, 'energy_score': 0.88, 'cost_efficiency_score': 0.70, 'price_per_kg': 5.40}
        ]
    
    return get_plant_recommendation_for_order(order, plants)

@app.post("/api/ml-rl/plant-improvements")
def get_plant_improvement_recommendations(plant: dict):
    """Get improvement recommendations for a plant"""
    from modules.recommendation_system_rl import get_plant_improvements
    return get_plant_improvements(plant)

# Safety Monitor
@app.post("/api/ml-rl/safety-analysis")
def analyze_container_safety_ml(container: dict):
    """Analyze storage container safety with ML"""
    from modules.safety_monitor_ml import analyze_container_safety
    return analyze_container_safety(container)

@app.post("/api/ml-rl/plant-safety")
def analyze_plant_safety_all(plant_id: str, containers: list):
    """Analyze safety for entire plant"""
    from modules.safety_monitor_ml import analyze_plant_safety
    return analyze_plant_safety(plant_id, containers)

# Chatbot
@app.post("/api/chatbot/message")
def chat_with_bot(message: dict):
    """Chat with AI assistant"""
    from modules.chatbot_gemini import chat_with_customer
    
    user_message = message.get('message', '')
    session_id = message.get('session_id', 'default')
    user_context = message.get('context', None)
    
    return chat_with_customer(user_message, session_id, user_context)

# Logistics Optimizer
@app.post("/api/logistics/optimize")
def optimize_logistics_routes(deliveries: list):
    """Optimize delivery routes and fleet requirements"""
    from modules.logistics_optimizer_ml import optimize_delivery_logistics
    return optimize_delivery_logistics(deliveries)

@app.post("/api/logistics/fleet-tracking")
def track_fleet_realtime(vehicles: list):
    """Get real-time fleet tracking data"""
    from modules.logistics_optimizer_ml import track_fleet_realtime
    return track_fleet_realtime(vehicles)

@app.get("/api/logistics/delay-stats")
def get_delay_statistics():
    """Get historical delay statistics"""
    from modules.logistics_optimizer_ml import calculate_average_delays
    return calculate_average_delays()

# Demo endpoints with sample data
@app.get("/api/demo/dashboard-rl")
def get_demo_dashboard_with_rl():
    """Get demo dashboard with all RL features"""
    from modules.profit_predictor_rl import predict_profitability_rl
    from modules.safety_monitor_ml import analyze_container_safety
    
    # Sample plant data
    plant_data = {
        'weather_quality': 0.82,
        'equipment_efficiency': 0.68,
        'labor_productivity': 0.85,
        'electricity_price_per_kwh': 0.06,
        'inventory_days': 15,
        'h2_market_price': 5.10,
        'equipment_health_score': 87,
        'storage_health_score': 92
    }
    
    # Sample container data
    container_data = {
        'container_id': 'TANK-001',
        'pressure_bar': 25,
        'temperature_c': 28,
        'leak_ppm': 15,
        'volume_m3': 150,
        'fill_level_percent': 65,
        'age_years': 2.5,
        'pressure_cycles': 1200,
        'vibration_level': 0.3,
        'humidity_percent': 45,
        'health_score': 87
    }
    
    profit_prediction = predict_profitability_rl(plant_data)
    safety_analysis = analyze_container_safety(container_data)
    
    return {
        "dashboard_type": "RL-Enhanced Demo",
        "profit_prediction": profit_prediction,
        "safety_analysis": safety_analysis,
        "timestamp": os.popen('echo %date% %time%').read().strip()
    }

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("H2-OptiPlant - Enhanced with 5 ML/RL Models")
    print("=" * 60)
    print("Starting server...")
    print("API Docs: http://localhost:8000/docs")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
