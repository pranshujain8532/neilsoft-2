"""
RHS-RRP API Routes v3.0
Resilient Hot Standby & Rapid Recovery Protocol

Real-time database-driven endpoints
"""

from flask import Blueprint, request, jsonify
from services.rhs_rrp_service import rhs_rrp_service, PlantState

rhs_rrp_bp = Blueprint('rhs_rrp', __name__, url_prefix='/api/rhs-rrp')


@rhs_rrp_bp.route('/dashboard/<plant_id>', methods=['GET'])
def get_dashboard(plant_id):
    """
    Get complete dashboard data for the Resilience Dashboard.
    Returns real-time state, telemetry, recovery info, digital shadow, and VPP status.
    """
    try:
        data = rhs_rrp_service.get_full_dashboard_data(plant_id)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@rhs_rrp_bp.route('/status/<plant_id>', methods=['GET'])
def get_status(plant_id):
    """Get current FSM state and basic telemetry."""
    try:
        state = rhs_rrp_service.get_current_state(plant_id)
        telemetry = rhs_rrp_service._get_latest_telemetry(plant_id) or {}
        
        return jsonify({
            'status': state.value,
            'telemetry': {
                'membrane_resistance': telemetry.get('membrane_resistance_ohm', 0.15),
                'stack_temp': telemetry.get('stack_temperature_c', 65.0),
                'internal_pressure': telemetry.get('internal_pressure_bar', 30.0),
                'protection_current': telemetry.get('protection_current_amps', 0.0)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@rhs_rrp_bp.route('/control/manual-standby', methods=['POST'])
def trigger_manual_standby():
    """
    Manually trigger Hot Standby mode.
    Persists state change to database.
    """
    data = request.json or {}
    plant_id = data.get('plant_id')
    probability = data.get('probability', 80.0)
    
    # Normalize probability
    if probability > 1:
        probability = probability  # Already in percentage
    else:
        probability = probability * 100  # Convert decimal to percentage
    
    result = rhs_rrp_service.trigger_hot_standby(
        plant_id=plant_id,
        trigger_source='MANUAL',
        failure_probability=probability
    )
    
    if result.get('success'):
        return jsonify(result)
    else:
        return jsonify(result), 400


@rhs_rrp_bp.route('/control/rapid-inject', methods=['POST'])
def execute_rapid_inject():
    """
    Execute Rapid Recovery sequence.
    Calculates optimal trajectory and initiates ramp-up.
    """
    data = request.json or {}
    plant_id = data.get('plant_id')
    
    result = rhs_rrp_service.trigger_rapid_inject(plant_id)
    
    if result.get('success'):
        return jsonify(result)
    else:
        return jsonify(result), 400


@rhs_rrp_bp.route('/innovations/polarization/<plant_id>', methods=['POST'])
def trigger_polarization(plant_id):
    """
    Execute anti-corrosion polarization pulse.
    Logs pulse to database with results.
    """
    try:
        result = rhs_rrp_service.activate_polarization_pulse(plant_id)
        if result.get('success'):
            return jsonify(result)
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@rhs_rrp_bp.route('/innovations/digital-shadow/<plant_id>', methods=['GET'])
def get_digital_shadow(plant_id):
    """Run Digital Shadow simulation using actual telemetry."""
    try:
        result = rhs_rrp_service.run_digital_shadow_simulation(plant_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@rhs_rrp_bp.route('/innovations/vpp/<plant_id>', methods=['GET'])
def get_vpp_status(plant_id):
    """Get VPP grid services status from database."""
    try:
        result = rhs_rrp_service.get_vpp_status(plant_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@rhs_rrp_bp.route('/telemetry/history/<plant_id>', methods=['GET'])
def get_telemetry_history(plant_id):
    """Get telemetry history for charts - real database data."""
    try:
        limit = request.args.get('limit', 30, type=int)
        history = rhs_rrp_service.get_telemetry_history(plant_id, limit)
        return jsonify({'data': history, 'count': len(history)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@rhs_rrp_bp.route('/physics/recovery-trajectory', methods=['POST'])
def calculate_trajectory():
    """Calculate recovery trajectory with current parameters."""
    data = request.json or {}
    plant_id = data.get('plant_id', 'default')
    
    result = rhs_rrp_service.calculate_optimal_recovery_trajectory(
        plant_id=plant_id,
        current_temp=data.get('temperature'),
        internal_pressure=data.get('pressure'),
        membrane_hydration=data.get('hydration')
    )
    return jsonify(result)
