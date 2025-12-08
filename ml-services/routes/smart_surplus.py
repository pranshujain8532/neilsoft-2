"""
Smart Surplus Management Routes
API endpoints for surplus detection, battery charging, and overflow tracking
"""

from flask import Blueprint, jsonify, request
from datetime import datetime

smart_surplus_bp = Blueprint('smart_surplus', __name__)


@smart_surplus_bp.route('/calculate/<plant_id>', methods=['GET'])
def calculate_surplus(plant_id):
    """
    Calculate current energy surplus
    Query params: solar_kw, wind_kw, hydro_kw
    """
    try:
        from services.smart_surplus_service import smart_surplus_service
        
        solar_kw = float(request.args.get('solar_kw', 0))
        wind_kw = float(request.args.get('wind_kw', 0))
        hydro_kw = float(request.args.get('hydro_kw', 0))
        
        result = smart_surplus_service.calculate_surplus(plant_id, solar_kw, wind_kw, hydro_kw)
        
        return jsonify({
            'success': True,
            'plant_id': plant_id,
            'data': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Surplus] Calculate error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@smart_surplus_bp.route('/process/<plant_id>', methods=['POST'])
def process_surplus(plant_id):
    """
    Process surplus energy - routes to battery or overflow
    Body: { solar_kw, wind_kw, hydro_kw }
    """
    try:
        from services.smart_surplus_service import smart_surplus_service
        
        data = request.json or {}
        solar_kw = float(data.get('solar_kw', 0))
        wind_kw = float(data.get('wind_kw', 0))
        hydro_kw = float(data.get('hydro_kw', 0))
        
        result = smart_surplus_service.process_surplus(plant_id, solar_kw, wind_kw, hydro_kw)
        
        return jsonify({
            'success': True,
            'plant_id': plant_id,
            'data': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Surplus] Process error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@smart_surplus_bp.route('/battery/<plant_id>', methods=['GET'])
def get_battery_status(plant_id):
    """Get current battery status"""
    try:
        from services.smart_surplus_service import smart_surplus_service
        
        battery = smart_surplus_service.get_battery_status(plant_id)
        
        return jsonify({
            'success': True,
            'plant_id': plant_id,
            'battery': battery,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Surplus] Battery status error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@smart_surplus_bp.route('/energy-mix/<plant_id>', methods=['GET'])
def get_energy_mix(plant_id):
    """Get energy mix data for last 24h (Graph A)"""
    try:
        from services.smart_surplus_service import smart_surplus_service
        
        data = smart_surplus_service.get_energy_mix_24h(plant_id)
        
        return jsonify({
            'success': True,
            'plant_id': plant_id,
            'data': data,
            'count': len(data),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Surplus] Energy mix error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@smart_surplus_bp.route('/charging-history/<plant_id>', methods=['GET'])
def get_charging_history(plant_id):
    """Get battery charging data for last 24h (Graph B)"""
    try:
        from services.smart_surplus_service import smart_surplus_service
        
        data = smart_surplus_service.get_battery_charging_24h(plant_id)
        
        return jsonify({
            'success': True,
            'plant_id': plant_id,
            'data': data,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Surplus] Charging history error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@smart_surplus_bp.route('/source-breakdown/<plant_id>', methods=['GET'])
def get_source_breakdown(plant_id):
    """Get source breakdown for battery charging (Graph C)"""
    try:
        from services.smart_surplus_service import smart_surplus_service
        
        data = smart_surplus_service.get_charging_source_breakdown(plant_id)
        
        return jsonify({
            'success': True,
            'plant_id': plant_id,
            'breakdown': data,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Surplus] Source breakdown error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@smart_surplus_bp.route('/overflow/<plant_id>', methods=['GET'])
def get_overflow_analysis(plant_id):
    """Get overflow/wasted energy analysis"""
    try:
        from services.smart_surplus_service import smart_surplus_service
        
        data = smart_surplus_service.get_overflow_analysis(plant_id)
        
        return jsonify({
            'success': True,
            'plant_id': plant_id,
            'data': data,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Surplus] Overflow analysis error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@smart_surplus_bp.route('/dashboard/<plant_id>', methods=['GET'])
def get_surplus_dashboard(plant_id):
    """Get complete surplus management dashboard data"""
    try:
        from services.smart_surplus_service import smart_surplus_service
        
        battery = smart_surplus_service.get_battery_status(plant_id)
        energy_mix = smart_surplus_service.get_energy_mix_24h(plant_id)
        charging = smart_surplus_service.get_battery_charging_24h(plant_id)
        source_breakdown = smart_surplus_service.get_charging_source_breakdown(plant_id)
        overflow = smart_surplus_service.get_overflow_analysis(plant_id)
        
        return jsonify({
            'success': True,
            'plant_id': plant_id,
            'dashboard': {
                'battery': battery,
                'energy_mix': energy_mix,
                'charging': charging,
                'source_breakdown': source_breakdown,
                'overflow': overflow
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Surplus] Dashboard error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
