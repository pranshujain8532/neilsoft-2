"""
Plant Maintenance API Routes
Endpoints for plant equipment maintenance, energy sources, and ML predictions
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import os
import numpy as np

# Import models and services
from models.equipment_maintenance_predictor import equipment_maintenance_predictor
from models.plant_shutdown_predictor import plant_shutdown_predictor
from models.shutdown_prevention_model import shutdown_prevention_model
from services.equipment_sensor_service import equipment_sensor_service

plant_maintenance_bp = Blueprint('plant_maintenance', __name__)

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

print("[OK] Plant Maintenance routes initialized")


# ==========================================
# EQUIPMENT ENDPOINTS
# ==========================================

@plant_maintenance_bp.route('/equipment/<plant_id>', methods=['GET'])
def get_plant_equipment(plant_id):
    """Get all equipment for a plant with current status"""
    try:
        equipment = equipment_sensor_service.get_equipment_by_plant(plant_id)
        
        # Enrich with latest sensor data
        for eq in equipment:
            sensor_data = equipment_sensor_service.get_equipment_sensor_data(eq['id'], hours=1)
            if sensor_data:
                latest = sensor_data[-1]
                eq['latest_reading'] = {
                    'temperature': latest.get('temperature'),
                    'pressure': latest.get('pressure'),
                    'uptime_hours': latest.get('uptime_hours'),
                    'recorded_at': latest.get('recorded_at')
                }
        
        return jsonify({
            'plant_id': plant_id,
            'equipment': equipment,
            'count': len(equipment)
        })
    except Exception as e:
        print(f"[ERROR] Get equipment failed: {e}")
        return jsonify({'error': str(e)}), 500


@plant_maintenance_bp.route('/equipment/<equipment_id>/sensor-data', methods=['GET'])
def get_equipment_sensor_data(equipment_id):
    """Get sensor data history for graphs"""
    try:
        hours = request.args.get('hours', 48, type=int)
        sensor_data = equipment_sensor_service.get_equipment_sensor_data(equipment_id, hours)
        
        # Format for frontend charts
        chart_data = {
            'temperature': [],
            'pressure': [],
            'uptime': [],
            'vibration': [],
            'power': []
        }
        
        for reading in sensor_data:
            timestamp = reading.get('recorded_at', '')
            chart_data['temperature'].append({
                'time': timestamp,
                'value': reading.get('temperature', 0)
            })
            chart_data['pressure'].append({
                'time': timestamp,
                'value': reading.get('pressure', 0)
            })
            chart_data['uptime'].append({
                'time': timestamp,
                'value': reading.get('uptime_hours', 0)
            })
            chart_data['vibration'].append({
                'time': timestamp,
                'value': reading.get('vibration', 0)
            })
            chart_data['power'].append({
                'time': timestamp,
                'value': reading.get('power_consumption', 0)
            })
        
        return jsonify({
            'equipment_id': equipment_id,
            'data': chart_data,
            'count': len(sensor_data)
        })
    except Exception as e:
        print(f"[ERROR] Get sensor data failed: {e}")
        return jsonify({'error': str(e)}), 500


@plant_maintenance_bp.route('/equipment/<equipment_id>/toggle', methods=['POST'])
def toggle_equipment(equipment_id):
    """Turn equipment on/off"""
    try:
        data = request.json or {}
        new_status = data.get('status', 'offline')
        
        if new_status not in ['operational', 'maintenance', 'offline', 'warning']:
            return jsonify({'error': 'Invalid status'}), 400
        
        result = equipment_sensor_service.update_equipment_status(equipment_id, new_status)
        
        return jsonify(result)
    except Exception as e:
        print(f"[ERROR] Toggle equipment failed: {e}")
        return jsonify({'error': str(e)}), 500


@plant_maintenance_bp.route('/equipment/<equipment_id>/thresholds', methods=['PUT'])
def update_thresholds(equipment_id):
    """Update equipment thresholds"""
    try:
        data = request.json or {}
        
        thresholds = {}
        if 'max_temperature' in data:
            thresholds['max_temperature'] = float(data['max_temperature'])
        if 'max_pressure' in data:
            thresholds['max_pressure'] = float(data['max_pressure'])
        if 'max_uptime_hours' in data:
            thresholds['max_uptime_hours'] = float(data['max_uptime_hours'])
        
        if not thresholds:
            return jsonify({'error': 'No valid thresholds provided'}), 400
        
        result = equipment_sensor_service.update_equipment_thresholds(equipment_id, thresholds)
        
        return jsonify(result)
    except Exception as e:
        print(f"[ERROR] Update thresholds failed: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# ENERGY SOURCES ENDPOINTS
# ==========================================

@plant_maintenance_bp.route('/energy-sources/<plant_id>', methods=['GET'])
def get_energy_sources(plant_id):
    """Get all energy sources for a plant"""
    try:
        sources = equipment_sensor_service.get_energy_sources_by_plant(plant_id)
        
        return jsonify({
            'plant_id': plant_id,
            'energy_sources': sources,
            'count': len(sources)
        })
    except Exception as e:
        print(f"[ERROR] Get energy sources failed: {e}")
        return jsonify({'error': str(e)}), 500


@plant_maintenance_bp.route('/energy-sources/<source_id>', methods=['PUT'])
def update_energy_source(source_id):
    """Admin: Update energy source condition"""
    try:
        data = request.json or {}
        condition = data.get('condition')
        notes = data.get('notes')
        
        if not condition:
            return jsonify({'error': 'Condition is required'}), 400
        
        if condition not in ['excellent', 'good', 'fair', 'poor', 'critical']:
            return jsonify({'error': 'Invalid condition value'}), 400
        
        result = equipment_sensor_service.update_energy_source_condition(source_id, condition, notes)
        
        return jsonify(result)
    except Exception as e:
        print(f"[ERROR] Update energy source failed: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# ML PREDICTIONS ENDPOINTS
# ==========================================

@plant_maintenance_bp.route('/predictions/<plant_id>', methods=['GET'])
def get_all_predictions(plant_id):
    """Get all ML predictions for a plant"""
    try:
        # Get equipment and energy sources
        equipment = equipment_sensor_service.get_equipment_by_plant(plant_id)
        energy_sources = equipment_sensor_service.get_energy_sources_by_plant(plant_id)
        
        # Generate maintenance predictions for each equipment
        maintenance_predictions = []
        for eq in equipment:
            sensor_data = equipment_sensor_service.get_equipment_sensor_data(eq['id'], hours=24)
            prediction = equipment_maintenance_predictor.predict_maintenance(
                eq['id'],
                eq.get('equipment_type', 'electrolyzer'),
                sensor_data
            )
            maintenance_predictions.append(prediction)
            
            # Save prediction to DB
            equipment_sensor_service.save_maintenance_prediction(prediction)
        
        # Add failure probabilities to equipment data for shutdown prediction
        for i, eq in enumerate(equipment):
            if i < len(maintenance_predictions):
                eq['failure_probability'] = maintenance_predictions[i].get('failure_probability', 0)
        
        # Generate shutdown prediction
        shutdown_prediction = plant_shutdown_predictor.predict_shutdown(
            equipment,
            energy_sources,
            {'production_rate': 0.8, 'efficiency': 0.85}
        )
        
        # Generate prevention recommendations
        prevention_recommendations = shutdown_prevention_model.generate_recommendations(
            equipment,
            energy_sources,
            maintenance_predictions
        )
        
        # Save recommendations
        equipment_sensor_service.save_prevention_recommendations(plant_id, prevention_recommendations)
        
        return jsonify(convert_to_serializable({
            'plant_id': plant_id,
            'maintenance_predictions': maintenance_predictions,
            'shutdown_prediction': shutdown_prediction,
            'prevention_recommendations': prevention_recommendations,
            'summary': shutdown_prevention_model.get_summary(prevention_recommendations),
            'generated_at': datetime.now().isoformat()
        }))
    except Exception as e:
        print(f"[ERROR] Get predictions failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@plant_maintenance_bp.route('/predictions/maintenance/<plant_id>', methods=['GET'])
def get_maintenance_predictions(plant_id):
    """Get equipment maintenance predictions only"""
    try:
        equipment = equipment_sensor_service.get_equipment_by_plant(plant_id)
        
        predictions = []
        for eq in equipment:
            sensor_data = equipment_sensor_service.get_equipment_sensor_data(eq['id'], hours=24)
            prediction = equipment_maintenance_predictor.predict_maintenance(
                eq['id'],
                eq.get('equipment_type', 'electrolyzer'),
                sensor_data
            )
            predictions.append(prediction)
        
        return jsonify({
            'plant_id': plant_id,
            'predictions': predictions
        })
    except Exception as e:
        print(f"[ERROR] Get maintenance predictions failed: {e}")
        return jsonify({'error': str(e)}), 500


@plant_maintenance_bp.route('/predictions/shutdown/<plant_id>', methods=['GET'])
def get_shutdown_prediction(plant_id):
    """Get plant shutdown prediction only"""
    try:
        equipment = equipment_sensor_service.get_equipment_by_plant(plant_id)
        energy_sources = equipment_sensor_service.get_energy_sources_by_plant(plant_id)
        
        prediction = plant_shutdown_predictor.predict_shutdown(
            equipment,
            energy_sources
        )
        
        return jsonify({
            'plant_id': plant_id,
            'prediction': prediction
        })
    except Exception as e:
        print(f"[ERROR] Get shutdown prediction failed: {e}")
        return jsonify({'error': str(e)}), 500


@plant_maintenance_bp.route('/predictions/prevention/<plant_id>', methods=['GET'])
def get_prevention_recommendations(plant_id):
    """Get shutdown prevention recommendations only"""
    try:
        equipment = equipment_sensor_service.get_equipment_by_plant(plant_id)
        energy_sources = equipment_sensor_service.get_energy_sources_by_plant(plant_id)
        
        # Get maintenance predictions for context
        maintenance_predictions = []
        for eq in equipment:
            sensor_data = equipment_sensor_service.get_equipment_sensor_data(eq['id'], hours=24)
            prediction = equipment_maintenance_predictor.predict_maintenance(
                eq['id'],
                eq.get('equipment_type', 'electrolyzer'),
                sensor_data
            )
            maintenance_predictions.append(prediction)
        
        recommendations = shutdown_prevention_model.generate_recommendations(
            equipment,
            energy_sources,
            maintenance_predictions
        )
        
        return jsonify({
            'plant_id': plant_id,
            'recommendations': recommendations,
            'summary': shutdown_prevention_model.get_summary(recommendations)
        })
    except Exception as e:
        print(f"[ERROR] Get prevention recommendations failed: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# AUTO-SHUTDOWN ENDPOINTS
# ==========================================

@plant_maintenance_bp.route('/shutdown-check/<plant_id>', methods=['POST'])
def check_auto_shutdown(plant_id):
    """Check and execute auto-shutdown if needed"""
    try:
        result = equipment_sensor_service.check_and_execute_auto_shutdown(plant_id)
        
        return jsonify(result)
    except Exception as e:
        print(f"[ERROR] Auto-shutdown check failed: {e}")
        return jsonify({'error': str(e)}), 500


@plant_maintenance_bp.route('/threshold-check/<equipment_id>', methods=['POST'])
def check_threshold_breach(equipment_id):
    """Check if equipment exceeds thresholds"""
    try:
        data = request.json or {}
        equipment_type = data.get('equipment_type', 'electrolyzer')
        
        sensor_reading = {
            'temperature': data.get('temperature', 25),
            'pressure': data.get('pressure', 1),
            'uptime_hours': data.get('uptime_hours', 0)
        }
        
        result = equipment_maintenance_predictor.check_threshold_breach(
            equipment_type,
            sensor_reading
        )
        
        # If breach detected, update equipment status
        if result.get('should_shutdown'):
            equipment_sensor_service.update_equipment_status(equipment_id, 'offline')
        elif result.get('has_breach'):
            equipment_sensor_service.update_equipment_status(equipment_id, 'warning')
        
        return jsonify(result)
    except Exception as e:
        print(f"[ERROR] Threshold check failed: {e}")
        return jsonify({'error': str(e)}), 500
