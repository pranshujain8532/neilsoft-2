"""
Storage ML API Routes
Provides REST endpoints for storage ML predictions and analysis
"""

from flask import Blueprint, request, jsonify
from datetime import datetime

# Import services and models
try:
    from services.storage_ml_service import storage_ml_service
    from models.storage_anomaly_detector import storage_anomaly_detector
    from models.storage_health_predictor import storage_health_predictor
    from models.demand_forecaster import demand_forecaster
    from models.inventory_optimizer import inventory_optimizer
    STORAGE_ML_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Storage ML components not available: {e}")
    STORAGE_ML_AVAILABLE = False

storage_bp = Blueprint('storage', __name__)


@storage_bp.route('/status', methods=['GET'])
def storage_ml_status():
    """
    Get status of storage ML service and models
    ---
    tags:
      - Storage ML
    responses:
      200:
        description: Storage ML service status
    """
    if not STORAGE_ML_AVAILABLE:
        return jsonify({
            'available': False,
            'error': 'Storage ML components not loaded'
        }), 503
    
    return jsonify({
        'available': True,
        'service_running': storage_ml_service.running,
        'models': {
            'anomaly_detector': {
                'loaded': storage_anomaly_detector.model is not None,
                'type': 'LSTM Autoencoder'
            },
            'health_predictor': {
                'loaded': storage_health_predictor.model is not None,
                'type': 'Physics-Informed NN'
            },
            'demand_forecaster': {
                'loaded': demand_forecaster.model is not None,
                'type': 'Bidirectional LSTM with Attention'
            },
            'inventory_optimizer': {
                'loaded': inventory_optimizer.model is not None,
                'type': 'Deep Q-Network (DQN)'
            }
        },
        'timestamp': datetime.now().isoformat()
    })


@storage_bp.route('/predictions', methods=['GET'])
def get_all_predictions():
    """
    Get all latest storage ML predictions
    ---
    tags:
      - Storage ML
    responses:
      200:
        description: All latest predictions
    """
    if not STORAGE_ML_AVAILABLE:
        return jsonify({'error': 'Storage ML not available'}), 503
    
    return jsonify({
        'success': True,
        'data': storage_ml_service.get_latest_predictions()
    })


@storage_bp.route('/anomaly/detect', methods=['POST'])
def detect_anomaly():
    """
    Run anomaly detection on a container
    ---
    tags:
      - Storage ML
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            container_id:
              type: string
              description: Container ID to analyze
            readings:
              type: array
              description: Optional sensor readings [[pressure, temp, level, purity], ...]
    responses:
      200:
        description: Anomaly detection result
    """
    if not STORAGE_ML_AVAILABLE:
        return jsonify({'error': 'Storage ML not available'}), 503
    
    data = request.get_json() or {}
    
    try:
        result = storage_anomaly_detector.detect_anomaly(data)
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@storage_bp.route('/health/predict', methods=['POST'])
def predict_health():
    """
    Predict container health score
    ---
    tags:
      - Storage ML
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            container_id:
              type: string
            pressure_bar:
              type: number
            temperature_c:
              type: number
            fill_percentage:
              type: number
            stress_cycles:
              type: integer
    responses:
      200:
        description: Health prediction result
    """
    if not STORAGE_ML_AVAILABLE:
        return jsonify({'error': 'Storage ML not available'}), 503
    
    data = request.get_json() or {}
    
    try:
        result = storage_health_predictor.predict(data)
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@storage_bp.route('/demand/forecast', methods=['GET'])
def forecast_demand():
    """
    Get hydrogen demand forecast
    ---
    tags:
      - Storage ML
    parameters:
      - in: query
        name: container_id
        type: string
        description: Optional container ID for specific forecast
    responses:
      200:
        description: Demand forecast result
    """
    if not STORAGE_ML_AVAILABLE:
        return jsonify({'error': 'Storage ML not available'}), 503
    
    container_id = request.args.get('container_id')
    
    try:
        result = demand_forecaster.forecast(container_id=container_id)
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@storage_bp.route('/inventory/optimize', methods=['GET', 'POST'])
def optimize_inventory():
    """
    Get optimal inventory action recommendation
    ---
    tags:
      - Storage ML
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            capacity:
              type: number
            current_level:
              type: number
            estimated_daily_demand:
              type: number
    responses:
      200:
        description: Inventory optimization result
    """
    if not STORAGE_ML_AVAILABLE:
        return jsonify({'error': 'Storage ML not available'}), 503
    
    data = request.get_json() if request.method == 'POST' else None
    
    try:
        result = inventory_optimizer.optimize(container_data=data)
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@storage_bp.route('/containers/<container_id>/analysis', methods=['GET'])
def get_container_analysis(container_id):
    """
    Get comprehensive ML analysis for a container
    ---
    tags:
      - Storage ML
    parameters:
      - in: path
        name: container_id
        type: string
        required: true
    responses:
      200:
        description: Complete container analysis
    """
    if not STORAGE_ML_AVAILABLE:
        return jsonify({'error': 'Storage ML not available'}), 503
    
    try:
        result = storage_ml_service.get_container_analysis(container_id)
        
        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 404
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@storage_bp.route('/alerts/ai', methods=['POST'])
def generate_ai_alert():
    """
    Generate AI-enhanced alert with recommendations
    ---
    tags:
      - Storage ML
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - container_id
          properties:
            container_id:
              type: string
            alert_type:
              type: string
    responses:
      200:
        description: AI-generated alert with recommendations
    """
    if not STORAGE_ML_AVAILABLE:
        return jsonify({'error': 'Storage ML not available'}), 503
    
    data = request.get_json() or {}
    container_id = data.get('container_id')
    
    if not container_id:
        return jsonify({
            'success': False,
            'error': 'container_id is required'
        }), 400
    
    try:
        # Get anomaly detection
        anomaly_result = storage_anomaly_detector.detect_anomaly({
            'container_id': container_id
        })
        
        # Get health prediction
        health_result = storage_health_predictor.predict({
            'container_id': container_id
        })
        
        # Generate AI alert
        alert = {
            'container_id': container_id,
            'timestamp': datetime.now().isoformat(),
            'anomaly_detected': anomaly_result.get('is_anomaly', False),
            'anomaly_score': anomaly_result.get('anomaly_score', 0),
            'anomalous_sensors': anomaly_result.get('anomalous_sensors', []),
            'health_score': health_result.get('health_score', 0),
            'health_status': health_result.get('health_status', 'Unknown'),
            'maintenance_probability': health_result.get('maintenance_probability', 0),
            'recommendations': health_result.get('recommendations', []),
            'severity': _calculate_severity(anomaly_result, health_result),
            'ai_summary': _generate_ai_summary(anomaly_result, health_result)
        }
        
        return jsonify({
            'success': True,
            'data': alert
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@storage_bp.route('/train', methods=['POST'])
def train_models():
    """
    Train all storage ML models
    ---
    tags:
      - Storage ML
    responses:
      200:
        description: Training results
    """
    if not STORAGE_ML_AVAILABLE:
        return jsonify({'error': 'Storage ML not available'}), 503
    
    try:
        results = storage_ml_service.train_all_models()
        return jsonify({
            'success': True,
            'data': results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@storage_bp.route('/service/start', methods=['POST'])
def start_service():
    """Start the storage ML background service"""
    if not STORAGE_ML_AVAILABLE:
        return jsonify({'error': 'Storage ML not available'}), 503
    
    storage_ml_service.start()
    
    return jsonify({
        'success': True,
        'message': 'Storage ML service started',
        'running': storage_ml_service.running
    })


@storage_bp.route('/service/stop', methods=['POST'])
def stop_service():
    """Stop the storage ML background service"""
    if not STORAGE_ML_AVAILABLE:
        return jsonify({'error': 'Storage ML not available'}), 503
    
    storage_ml_service.stop()
    
    return jsonify({
        'success': True,
        'message': 'Storage ML service stopped',
        'running': storage_ml_service.running
    })


def _calculate_severity(anomaly_result: dict, health_result: dict) -> str:
    """Calculate overall severity level"""
    anomaly_score = anomaly_result.get('anomaly_score', 0)
    health_score = health_result.get('health_score', 100)
    
    # Critical if severe anomaly or very low health
    if anomaly_score > 0.8 or health_score < 50:
        return 'critical'
    elif anomaly_score > 0.5 or health_score < 70:
        return 'high'
    elif anomaly_score > 0.3 or health_score < 85:
        return 'medium'
    else:
        return 'low'


def _generate_ai_summary(anomaly_result: dict, health_result: dict) -> str:
    """Generate AI summary of container status"""
    is_anomaly = anomaly_result.get('is_anomaly', False)
    anomalous_sensors = anomaly_result.get('anomalous_sensors', [])
    health_score = health_result.get('health_score', 100)
    health_status = health_result.get('health_status', 'Unknown')
    maintenance_prob = health_result.get('maintenance_probability', 0)
    
    summary_parts = []
    
    # Anomaly status
    if is_anomaly:
        sensors = ', '.join(anomalous_sensors) if anomalous_sensors else 'sensors'
        summary_parts.append(f"⚠️ Anomaly detected in {sensors}.")
    else:
        summary_parts.append("✅ No anomalies detected.")
    
    # Health status
    summary_parts.append(f"Container health: {health_score:.1f}% ({health_status}).")
    
    # Maintenance recommendation
    if maintenance_prob > 70:
        summary_parts.append("🔧 Maintenance strongly recommended.")
    elif maintenance_prob > 40:
        summary_parts.append("📋 Consider scheduling maintenance.")
    
    return ' '.join(summary_parts)
