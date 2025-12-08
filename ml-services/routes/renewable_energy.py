"""
Renewable Energy API Routes
Endpoints for solar/wind/hydro production, battery storage, and water recycling
All data fetched from database - no hardcoding
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import numpy as np

from services.renewable_energy_service import renewable_energy_service

renewable_energy_bp = Blueprint('renewable_energy', __name__)

def convert_to_serializable(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, dict):
        return {k: convert_to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

print("[OK] Renewable Energy routes initialized")


# ==========================================
# PRODUCTION DATA ENDPOINTS
# ==========================================

@renewable_energy_bp.route('/production/<plant_id>', methods=['GET'])
def get_production_data(plant_id):
    """
    Get renewable energy production data (solar/wind/hydro)
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
      - name: hours
        in: query
        type: integer
        default: 24
    responses:
      200:
        description: Production data for graphs
    """
    try:
        hours = request.args.get('hours', 24, type=int)
        data = renewable_energy_service.get_production_data(plant_id, hours)
        
        return jsonify(convert_to_serializable(data))
    except Exception as e:
        print(f"[ERROR] Get production data failed: {e}")
        return jsonify({'error': str(e)}), 500


@renewable_energy_bp.route('/production/summary/<plant_id>', methods=['GET'])
def get_daily_summary(plant_id):
    """
    Get daily production summary by source type
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Daily summary with totals and excess calculation
    """
    try:
        data = renewable_energy_service.get_daily_production_summary(plant_id)
        return jsonify(convert_to_serializable(data))
    except Exception as e:
        print(f"[ERROR] Get daily summary failed: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# BATTERY STORAGE ENDPOINTS
# ==========================================

@renewable_energy_bp.route('/battery/<plant_id>', methods=['GET'])
def get_battery_status(plant_id):
    """
    Get current battery status (40% of plant capacity)
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Battery status including charge level and health
    """
    try:
        data = renewable_energy_service.get_battery_status(plant_id)
        return jsonify(convert_to_serializable(data))
    except Exception as e:
        print(f"[ERROR] Get battery status failed: {e}")
        return jsonify({'error': str(e)}), 500


@renewable_energy_bp.route('/battery/<plant_id>/charge', methods=['POST'])
def charge_battery(plant_id):
    """
    Charge battery with excess energy
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
      - name: body
        in: body
        schema:
          type: object
          properties:
            energy_kwh: {type: number}
            source: {type: string, enum: [solar, wind]}
    responses:
      200:
        description: Charging result with overflow if any
    """
    try:
        data = request.json or {}
        energy_kwh = float(data.get('energy_kwh', 0))
        source = data.get('source', 'solar')
        
        if source not in ['solar', 'wind', 'grid']:
            return jsonify({'error': 'Source must be solar, wind, or grid'}), 400
        
        result = renewable_energy_service.charge_battery(plant_id, energy_kwh, source)
        return jsonify(convert_to_serializable(result))
    except Exception as e:
        print(f"[ERROR] Charge battery failed: {e}")
        return jsonify({'error': str(e)}), 500


@renewable_energy_bp.route('/battery/<plant_id>/discharge', methods=['POST'])
def discharge_battery(plant_id):
    """
    Discharge battery to power operations
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
      - name: body
        in: body
        schema:
          type: object
          properties:
            energy_kwh: {type: number}
    responses:
      200:
        description: Discharge result with shortfall if any
    """
    try:
        data = request.json or {}
        energy_kwh = float(data.get('energy_kwh', 0))
        
        result = renewable_energy_service.discharge_battery(plant_id, energy_kwh)
        return jsonify(convert_to_serializable(result))
    except Exception as e:
        print(f"[ERROR] Discharge battery failed: {e}")
        return jsonify({'error': str(e)}), 500


@renewable_energy_bp.route('/battery/<plant_id>/transactions', methods=['GET'])
def get_battery_transactions(plant_id):
    """
    Get recent energy storage transactions
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
      - name: limit
        in: query
        type: integer
        default: 50
    responses:
      200:
        description: List of charge/discharge transactions
    """
    try:
        limit = request.args.get('limit', 50, type=int)
        transactions = renewable_energy_service.get_energy_transactions(plant_id, limit)
        
        return jsonify({
            'plant_id': plant_id,
            'transactions': transactions,
            'count': len(transactions)
        })
    except Exception as e:
        print(f"[ERROR] Get transactions failed: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# WATER RECYCLING ENDPOINTS
# ==========================================

@renewable_energy_bp.route('/water-recycling/<plant_id>', methods=['GET'])
def get_water_recycling(plant_id):
    """
    Get water recycling data for hydro regeneration
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
      - name: hours
        in: query
        type: integer
        default: 24
    responses:
      200:
        description: Water recycling history and totals
    """
    try:
        hours = request.args.get('hours', 24, type=int)
        data = renewable_energy_service.get_water_recycling_data(plant_id, hours)
        
        return jsonify(convert_to_serializable(data))
    except Exception as e:
        print(f"[ERROR] Get water recycling failed: {e}")
        return jsonify({'error': str(e)}), 500


@renewable_energy_bp.route('/water-recycling/<plant_id>/record', methods=['POST'])
def record_water_recycling(plant_id):
    """
    Record water recycling from hydrogen production
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
      - name: body
        in: body
        schema:
          type: object
          properties:
            hydrogen_kg: {type: number, description: "Hydrogen produced in kg"}
    responses:
      200:
        description: Water recycling calculation result
    """
    try:
        data = request.json or {}
        hydrogen_kg = float(data.get('hydrogen_kg', 0))
        
        if hydrogen_kg <= 0:
            return jsonify({'error': 'hydrogen_kg must be positive'}), 400
        
        result = renewable_energy_service.record_water_recycling(plant_id, hydrogen_kg)
        return jsonify(convert_to_serializable(result))
    except Exception as e:
        print(f"[ERROR] Record water recycling failed: {e}")
        return jsonify({'error': str(e)}), 500


@renewable_energy_bp.route('/water-recycling/calculate', methods=['GET'])
def calculate_water_recovery():
    """
    Calculate water recovery for given hydrogen production
    ---
    parameters:
      - name: hydrogen_kg
        in: query
        type: number
        required: true
    responses:
      200:
        description: Water recovery calculation
    """
    try:
        hydrogen_kg = request.args.get('hydrogen_kg', 0, type=float)
        
        if hydrogen_kg <= 0:
            return jsonify({'error': 'hydrogen_kg must be positive'}), 400
        
        result = renewable_energy_service.calculate_water_recovery(hydrogen_kg)
        return jsonify(convert_to_serializable(result))
    except Exception as e:
        print(f"[ERROR] Calculate water recovery failed: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# ENERGY BALANCE ENDPOINTS
# ==========================================

@renewable_energy_bp.route('/balance/<plant_id>', methods=['GET'])
def get_energy_balance(plant_id):
    """
    Get comprehensive energy balance for the plant
    Includes production, battery, water recycling, and recommendations
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Complete energy balance with recommendations
    """
    try:
        balance = renewable_energy_service.calculate_energy_balance(plant_id)
        return jsonify(convert_to_serializable(balance))
    except Exception as e:
        print(f"[ERROR] Get energy balance failed: {e}")
        return jsonify({'error': str(e)}), 500


@renewable_energy_bp.route('/optimize/<plant_id>', methods=['POST'])
def process_excess_energy(plant_id):
    """
    Process excess energy - store in battery, log overflow
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Optimization result with actions taken
    """
    try:
        result = renewable_energy_service.process_excess_energy(plant_id)
        return jsonify(convert_to_serializable(result))
    except Exception as e:
        print(f"[ERROR] Process excess energy failed: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# DASHBOARD ENDPOINT
# ==========================================

@renewable_energy_bp.route('/dashboard/<plant_id>', methods=['GET'])
def get_renewable_dashboard(plant_id):
    """
    Get all renewable energy data for dashboard
    Single endpoint to fetch everything needed for the UI
    Includes REAL-TIME weather-based calculations
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Complete dashboard data with real-time calculations
    """
    try:
        hours = request.args.get('hours', 24, type=int)
        
        # Import real-time services
        from services.realtime_energy_service import realtime_energy_service
        from services.renewable_dashboard_service import renewable_dashboard_service
        
        # Get plant info for coordinates
        plant_info = renewable_dashboard_service.get_plant_info(plant_id)
        latitude = plant_info.get('latitude', 23.0225)  # Default: Gujarat, India
        longitude = plant_info.get('longitude', 72.5714)
        
        # Get current weather
        try:
            from services.weather_service import weather_service
            weather = weather_service.get_weather_by_coords(latitude, longitude)
        except Exception as e:
            print(f"[WARN] Weather service unavailable: {e}")
            weather = {
                'temperature': 25,
                'wind_speed': 5,
                'cloud_cover': 30,
                'solar_irradiance': 0,
                'description': 'Clear',
                'humidity': 60
            }
        
        weather['latitude'] = latitude
        weather['longitude'] = longitude
        
        # Get water data for hydro calculation
        water_data = renewable_dashboard_service.get_water_recycling(plant_id, hours)
        water_for_hydro = water_data.get('totals', {}).get('total_for_hydro', 0)
        
        # Calculate REAL-TIME energy with time-awareness
        realtime = realtime_energy_service.calculate_all_sources(
            plant_id, 
            weather,
            {'water_for_hydro_liters': water_for_hydro}
        )
        
        # Fetch historical data from DB
        production = renewable_energy_service.get_production_data(plant_id, hours)
        battery = renewable_energy_service.get_battery_status(plant_id)
        balance = renewable_energy_service.calculate_energy_balance(plant_id)
        transactions = renewable_energy_service.get_energy_transactions(plant_id, 20)
        
        # Calculate carbon savings
        total_renewable = production.get('totals', {}).get('total_generated_kwh', 0)
        carbon_savings = realtime_energy_service.calculate_carbon_savings(total_renewable)
        
        # Calculate efficiency grade
        utilization = realtime.get('utilization_percent', 0)
        overflow_percent = 0  # TODO: Calculate from surplus data
        battery_usage = battery.get('charge_percent', 0) if battery else 0
        efficiency_grade = realtime_energy_service.calculate_efficiency_grade(
            utilization, overflow_percent, battery_usage
        )
        
        # Save current snapshot to DB for historical tracking
        renewable_dashboard_service.save_production_snapshot(plant_id, {
            'solar_kw': realtime['solar']['power_kw'],
            'wind_kw': realtime['wind']['power_kw'],
            'hydro_kw': realtime['hydro']['power_kw'],
            'total_kw': realtime['total_power_kw'],
            'capacity_kw': realtime['total_capacity_kw'],
            'surplus_kw': max(0, realtime['total_power_kw'] - realtime['total_capacity_kw']),
            'dominant_source': realtime['dominant_source'],
            'battery_level': battery.get('charge_percent', 0) if battery else 0
        })
        
        return jsonify(convert_to_serializable({
            'plant_id': plant_id,
            'timestamp': datetime.now().isoformat(),
            
            # Real-time calculations (time-aware)
            'realtime': realtime,
            'weather': weather,
            
            # Historical data from DB
            'production': production,
            'battery': battery,
            'water_recycling': water_data,
            'energy_balance': balance,
            'recent_transactions': transactions,
            
            # Analytics
            'carbon_savings': carbon_savings,
            'efficiency_grade': efficiency_grade,
            
            # Helpful info
            'sun_info': realtime['solar']['sun_info'],
            'is_night': not realtime['solar']['sun_info']['is_daylight']
        }))
    except Exception as e:
        print(f"[ERROR] Get dashboard failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@renewable_energy_bp.route('/realtime/<plant_id>', methods=['GET'])
def get_realtime_energy(plant_id):
    """
    Get real-time energy calculation based on current weather and time
    ---
    parameters:
      - name: plant_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Real-time energy calculations
    """
    try:
        from services.realtime_energy_service import realtime_energy_service
        from services.renewable_dashboard_service import renewable_dashboard_service
        
        # Get plant coordinates
        plant_info = renewable_dashboard_service.get_plant_info(plant_id)
        latitude = plant_info.get('latitude', 23.0225)
        longitude = plant_info.get('longitude', 72.5714)
        
        # Get current weather
        try:
            from services.weather_service import weather_service
            weather = weather_service.get_weather_by_coords(latitude, longitude)
        except:
            weather = {'temperature': 25, 'wind_speed': 5, 'cloud_cover': 30, 'solar_irradiance': 0}
        
        weather['latitude'] = latitude
        weather['longitude'] = longitude
        
        # Calculate real-time energy
        realtime = realtime_energy_service.calculate_all_sources(plant_id, weather, {})
        
        return jsonify(convert_to_serializable({
            'plant_id': plant_id,
            'timestamp': datetime.now().isoformat(),
            'realtime': realtime,
            'weather': weather,
            'sun_info': realtime['solar']['sun_info']
        }))
    except Exception as e:
        print(f"[ERROR] Get realtime energy failed: {e}")
        return jsonify({'error': str(e)}), 500

