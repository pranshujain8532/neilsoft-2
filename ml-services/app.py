from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
from dotenv import load_dotenv
import threading
import time

# Load environment variables
load_dotenv()

# Import blueprints
from flasgger import Swagger
from routes.predictions import predictions_bp
from routes.chatbot import chatbot_bp
from routes.logistics import logistics_bp
from routes.maintenance import maintenance_bp
from routes.storage import storage_bp
from routes.plant_maintenance import plant_maintenance_bp
from routes.renewable_energy import renewable_energy_bp
from routes.smart_surplus import smart_surplus_bp
from routes.surplus_routing import surplus_routing_bp
from routes.site_feasibility import site_feasibility_bp

# --- NEW IMPORT ---
from services.background_energy_service import BackgroundEnergyService

# Import Storage ML Service
try:
    from services.storage_ml_service import storage_ml_service
    STORAGE_ML_ENABLED = True
except ImportError as e:
    print(f"[WARN]  Storage ML service not available: {e}")
    STORAGE_ML_ENABLED = False 

# Import services
try:
    from services.weather_service import weather_service
    from services.realtime_ml_service import realtime_ml_service
    from services.logistics_service import logistics_service
    REALTIME_ENABLED = True
except ImportError as e:
    print(f"[WARN]  Real-time services not available: {e}")
    REALTIME_ENABLED = False

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
swagger = Swagger(app)

# Register blueprints
app.register_blueprint(predictions_bp, url_prefix='/predict')
app.register_blueprint(chatbot_bp, url_prefix='/chat')
app.register_blueprint(logistics_bp, url_prefix='/logistics')
app.register_blueprint(maintenance_bp, url_prefix='/maintenance')
app.register_blueprint(storage_bp, url_prefix='/storage')
app.register_blueprint(plant_maintenance_bp, url_prefix='/plant-maintenance')
app.register_blueprint(renewable_energy_bp, url_prefix='/renewable-energy')
app.register_blueprint(smart_surplus_bp, url_prefix='/smart-surplus')
app.register_blueprint(surplus_routing_bp, url_prefix='/surplus-routing')
app.register_blueprint(site_feasibility_bp, url_prefix='/site-feasibility')

@app.route('/')
def home():
    return jsonify({
        'service': 'Green Hydrogen ML Service',
        'status': 'running',
        'version': '2.0.0',
        'realtime_enabled': REALTIME_ENABLED,
        'gemini_enabled': bool(os.getenv('GEMINI_API_KEY')),
        'endpoints': {
            'predictions': '/predict/*',
            'chatbot': '/chat',
            'logistics': '/logistics/optimize',
            'weather': '/api/weather/*',
            'realtime': '/api/realtime/*',
            'plants': '/api/plants/predictions',
            'models_status': '/models/status',
            'storage_ml': '/storage/*'
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'ml-service'}), 200

# Weather API endpoints
@app.route('/api/weather/test', methods=['GET'])
def test_weather_api():
    """Test weather API key"""
    if not REALTIME_ENABLED:
        return jsonify({'error': 'Real-time services not available'}), 503
    
    result = weather_service.test_api_key()
    return jsonify(result)

@app.route('/api/weather/city/<city>', methods=['GET'])
def get_weather_by_city(city):
    """Get weather data by city name"""
    if not REALTIME_ENABLED:
        return jsonify({'error': 'Real-time services not available'}), 503
    
    country_code = request.args.get('country', 'IN')
    weather = weather_service.get_weather_by_city(city, country_code)
    return jsonify(weather)

@app.route('/api/weather/coords', methods=['GET'])
def get_weather_by_coords():
    """Get weather data by coordinates"""
    if not REALTIME_ENABLED:
        return jsonify({'error': 'Real-time services not available'}), 503
    
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    
    if not lat or not lon:
        return jsonify({'error': 'lat and lon parameters required'}), 400
    
    try:
        weather = weather_service.get_weather_by_coords(float(lat), float(lon))
        return jsonify(weather)
    except Exception as e:
        print(f"[Weather] Error fetching coords weather: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/realtime/stop', methods=['POST'])
def stop_realtime():
    """Stop real-time ML updates"""
    if not REALTIME_ENABLED:
        return jsonify({'error': 'Real-time services not available'}), 503
    
    realtime_ml_service.stop()
    return jsonify({'message': 'Real-time ML service stopped'})

@app.route('/api/realtime/latest', methods=['GET'])
def get_realtime_predictions():
    """Get latest real-time predictions"""
    if not REALTIME_ENABLED:
        return jsonify({'error': 'Real-time services not available'}), 503
    
    predictions = realtime_ml_service.get_latest_predictions()
    return jsonify(predictions)

# Per-Plant ML Predictions
@app.route('/api/plants/predictions', methods=['GET'])
def get_all_plants_predictions():
    """Get ML predictions for all plants"""
    try:
        from services.per_plant_ml_service import per_plant_ml_service
        import asyncio
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        predictions = loop.run_until_complete(per_plant_ml_service.get_all_plants_predictions())
        loop.close()
        
        return jsonify({
            'plants': predictions,
            'total_plants': len(predictions),
            'success': True
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/plants/<plant_id>/predictions', methods=['GET'])
def get_plant_predictions(plant_id):
    """Get ML predictions for specific plant"""
    try:
        from services.per_plant_ml_service import per_plant_ml_service
        import asyncio
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        prediction = loop.run_until_complete(per_plant_ml_service.get_plant_predictions(plant_id))
        loop.close()
        
        if prediction:
            return jsonify(prediction)
        else:
            return jsonify({'error': 'Plant not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/models/status', methods=['GET'])
def models_status():
    """Get status of all ML models"""
    from models.profit_predictor import profit_predictor
    from models.safety_monitor import safety_monitor
    from models.energy_forecaster import energy_forecaster
    from models.plant_recommender import plant_recommender
    
    status = {
        'profit_predictor': {
            'loaded': profit_predictor.model is not None if hasattr(profit_predictor, 'model') else False,
            'type': 'LSTM'
        },
        'safety_monitor': {
            'loaded': safety_monitor.model is not None if hasattr(safety_monitor, 'model') else False,
            'type': 'Physics-Informed NN'
        },
        'energy_forecaster': {
            'loaded': True,
            'type': 'Multi-Model (Solar/Wind/Hydro)'
        },
        'plant_recommender': {
            'loaded': True,
            'type': 'Rule-based'
        },
        'gemini_chatbot': {
            'enabled': bool(os.getenv('GEMINI_API_KEY')),
            'model': os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
        },
        'realtime_service': {
            'enabled': REALTIME_ENABLED,
            'running': realtime_ml_service.running if REALTIME_ENABLED else False
        },
        'storage_ml': {
            'enabled': STORAGE_ML_ENABLED,
            'running': storage_ml_service.running if STORAGE_ML_ENABLED else False,
            'models': ['anomaly_detector', 'health_predictor', 'demand_forecaster', 'inventory_optimizer']
        }
    }
    
    return jsonify(status)

# ============ TRANSPORT OPTIMIZATION ENDPOINTS ============

@app.route('/api/transport/optimize', methods=['POST'])
def optimize_transport_route():
    """
    Get TOP 3 transport options: Best, Cheapest, Fastest
    ---
    parameters:
      - name: body
        in: body
        schema:
          type: object
          properties:
            origin: { type: string }
            destination: { type: string }
            quantity: { type: number }
            priority: { type: string }
    responses:
      200:
        description: Transport optimization results
    """
    try:
        from services.transport_optimizer import get_optimizer
        
        data = request.get_json()
        origin = data.get('origin', 'Gujarat Solar H2 Plant')
        destination = data.get('destination', 'Mumbai, Maharashtra')
        quantity = float(data.get('quantity', 1000))
        priority = data.get('priority', 'normal')
        order_id = data.get('order_id')
        
        optimizer = get_optimizer()
        result = optimizer.optimize_route(origin, destination, quantity, priority, order_id)
        
        return jsonify(result)
    except Exception as e:
        print(f"[Transport] Optimize error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/transport/track/<vehicle_id>', methods=['GET'])
def track_vehicle(vehicle_id):
    """Get real-time vehicle tracking data"""
    try:
        from services.transport_optimizer import get_optimizer
        
        optimizer = get_optimizer()
        result = optimizer.get_vehicle_tracking(vehicle_id)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transport/dispatch', methods=['POST'])
def dispatch_transport():
    """Dispatch a transport with selected option"""
    try:
        from services.transport_optimizer import get_optimizer
        
        data = request.get_json()
        order_id = data.get('order_id')
        selected_option = data.get('selected_option')
        transport_details = data.get('transport_details', {})
        
        optimizer = get_optimizer()
        result = optimizer.dispatch_transport(order_id, selected_option, transport_details)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/transport/fleet', methods=['GET'])
def get_fleet_status():
    """Get fleet status and statistics"""
    try:
        from services.transport_optimizer import get_optimizer
        
        optimizer = get_optimizer()
        result = optimizer.get_fleet_status()
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transport/analytics', methods=['GET'])
def get_transport_analytics():
    """Get transport analytics and KPIs"""
    try:
        from services.transport_optimizer import get_optimizer
        
        optimizer = get_optimizer()
        result = optimizer.get_transport_analytics()
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/metrics', methods=['GET'])
def get_metrics():
    """
    Get system metrics for dashboard
    ---
    responses:
      200:
        description: System metrics
    """
    import psutil
    import time
    
    return jsonify({
        'latency': [{'time': time.strftime('%H:%M:%S'), 'value': 25 + (time.time() % 10)}],
        'requests': [{'hour': '12:00', 'count': 150}],
        'system': {
            'cpu': psutil.cpu_percent(),
            'memory': psutil.virtual_memory().percent,
            'uptime': 'Running',
            'version': '2.0.0'
        }
    })

# New Advanced ML Endpoints
@app.route('/api/energy/optimization', methods=['GET'])
def get_energy_optimization():
    """Get advanced energy optimization data (40+ params)"""
    try:
        from services.energy_optimization_service import energy_optimization_service
        return jsonify({'success': True, 'data': energy_optimization_service.get_optimization_data()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/storage/health', methods=['GET'])
def get_storage_health():
    """Get storage health monitoring data"""
    try:
        from services.storage_service import storage_service
        return jsonify({'success': True, 'data': storage_service.get_storage_health()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Socket.IO for real-time updates
@socketio.on('connect')
def handle_connect():
    print('Client connected to ML service')
    emit('connection_response', {'message': 'Connected to ML service'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected from ML service')

@socketio.on('request_prediction')
def handle_prediction_request(data):
    """Handle real-time prediction requests via WebSocket"""
    if REALTIME_ENABLED:
        predictions = realtime_ml_service.get_latest_predictions()
        emit('prediction_update', predictions)
    else:
        emit('error', {'message': 'Real-time service not available'})

# Background task to broadcast updates
def broadcast_updates():
    """Broadcast ML updates to all connected clients"""
    while True:
        time.sleep(10)  # Every 10 seconds
        if REALTIME_ENABLED and realtime_ml_service.running:
            predictions = realtime_ml_service.get_latest_predictions()
            socketio.emit('prediction_broadcast', predictions)

# --- INITIALIZE BACKGROUND AGGREGATOR ---
# Use Service Role Key if available, else fall back to Anon Key (which might fail writes)
SUPABASE_KEY_TO_USE = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

bg_energy_service = BackgroundEnergyService(
    supabase_url=os.getenv('SUPABASE_URL'),
    supabase_key=SUPABASE_KEY_TO_USE,
    weather_api_key=os.getenv('WEATHER_API_KEY')
)

if __name__ == '__main__':
    print("=" * 70)
    print(">>> Green Hydrogen ML Service Starting...")
    print("=" * 70)
    print()
    
    # Check Gemini API
    gemini_key = os.getenv('GEMINI_API_KEY', '')
    if gemini_key and gemini_key != 'your_gemini_api_key':
        print(f"[OK] Gemini AI enabled: {os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')}")
    else:
        print("[WARN] Gemini AI not configured (using fallback responses)")
    
    # Start real-time ML service
    if REALTIME_ENABLED:
        realtime_ml_service.start()
        logistics_service.start()
        print("[OK] Real-time ML service started")
        print("[OK] Logistics service started")
        
        # --- START THE 4-HOUR AGGREGATOR ---
        bg_energy_service.start()
        print("[OK] Background 4-Hour Aggregator started")
        
        # --- START STORAGE ML SERVICE ---
        if STORAGE_ML_ENABLED:
            storage_ml_service.start()
            print("[OK] Storage ML service started (Anomaly Detection, Health Prediction, Demand Forecasting, Inventory Optimization)")
        
        # Test weather API
        weather_test = weather_service.test_api_key()
        if weather_test['valid']:
            print(f"[OK] Weather API: {weather_test['message']}")
        else:
            print(f"[WARN] Weather API: {weather_test['message']}")
    else:
        print("[WARN] Real-time services disabled")
    
    print()
    print(f"[SERVER] Starting Flask server on port 5001...")
    print(f"[WS] Socket.IO enabled for real-time updates")
    print(f"[AI] Gemini chatbot ready")
    print(f"[ML] Per-plant ML predictions available")
    if STORAGE_ML_ENABLED:
        print(f"[STORAGE] Storage ML endpoints available at /storage/*")
    print()
    
    # Start background broadcast thread
    if REALTIME_ENABLED:
        broadcast_thread = threading.Thread(target=broadcast_updates, daemon=True)
        broadcast_thread.start()
    
    port = int(os.getenv('ML_PORT', 5001))
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
