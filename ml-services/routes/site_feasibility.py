"""
Site Feasibility API Routes
Endpoints for evaluating sites and adding new plants
"""

from flask import Blueprint, jsonify, request
from datetime import datetime

site_feasibility_bp = Blueprint('site_feasibility', __name__)


@site_feasibility_bp.route('/evaluate', methods=['POST'])
def evaluate_site():
    """
    Evaluate a location for Green Hydrogen plant feasibility
    
    Body: {
        lat: float,
        lon: float,
        name: string (optional)
    }
    
    Returns comprehensive evaluation with scores and recommendations
    """
    try:
        from services.site_evaluator import site_evaluator
        
        data = request.json or {}
        lat = float(data.get('lat', data.get('latitude', 0)))
        lon = float(data.get('lon', data.get('longitude', 0)))
        name = data.get('name', f"Site {lat:.2f}, {lon:.2f}")
        
        if not lat or not lon:
            return jsonify({
                'success': False,
                'error': 'Latitude and longitude are required'
            }), 400
        
        result = site_evaluator.evaluate_site(lat, lon, name)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[Site Feasibility] Evaluation error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@site_feasibility_bp.route('/solar/<lat>/<lon>', methods=['GET'])
def evaluate_solar(lat, lon):
    """Evaluate solar potential only"""
    try:
        from services.site_evaluator import site_evaluator
        
        result = site_evaluator.evaluate_solar(float(lat), float(lon))
        
        return jsonify({
            'success': True,
            'evaluation': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Site Feasibility] Solar error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@site_feasibility_bp.route('/wind/<lat>/<lon>', methods=['GET'])
def evaluate_wind(lat, lon):
    """
    Evaluate wind potential with Hellman Power Law extrapolation
    Shows detailed calculation for v(80m) = v(10m) * (80/10)^0.143
    """
    try:
        from services.site_evaluator import site_evaluator
        
        result = site_evaluator.evaluate_wind(float(lat), float(lon))
        
        return jsonify({
            'success': True,
            'evaluation': result,
            'hellman_info': {
                'description': 'Wind speed extrapolated from 10m to 80m using Hellman Power Law',
                'formula': 'v₂ = v₁ × (z₂/z₁)^α',
                'alpha': 0.143,
                'terrain': 'Open terrain (friction coefficient)'
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Site Feasibility] Wind error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@site_feasibility_bp.route('/hydro/<lat>/<lon>', methods=['GET'])
def evaluate_hydro(lat, lon):
    """Evaluate hydro potential (water bodies, elevation head, rainfall)"""
    try:
        from services.site_evaluator import site_evaluator
        
        result = site_evaluator.evaluate_hydro(float(lat), float(lon))
        
        return jsonify({
            'success': True,
            'evaluation': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Site Feasibility] Hydro error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@site_feasibility_bp.route('/add-plant', methods=['POST'])
def add_plant():
    """
    Add a new plant based on site evaluation
    
    Body: {
        evaluation: object (from /evaluate endpoint),
        name: string,
        capacity_kw: number
    }
    """
    try:
        from services.site_evaluator import site_evaluator
        
        data = request.json or {}
        
        evaluation = data.get('evaluation')
        plant_name = data.get('name')
        capacity_kw = float(data.get('capacity_kw', 1000))
        
        if not evaluation:
            return jsonify({
                'success': False,
                'error': 'Evaluation data is required'
            }), 400
        
        if not plant_name:
            return jsonify({
                'success': False,
                'error': 'Plant name is required'
            }), 400
        
        result = site_evaluator.add_plant_to_database(evaluation, plant_name, capacity_kw)
        
        return jsonify({
            **result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"[Site Feasibility] Add plant error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@site_feasibility_bp.route('/quick-evaluate', methods=['GET'])
def quick_evaluate():
    """
    Quick evaluate a location via GET request
    Query params: lat, lon
    """
    try:
        from services.site_evaluator import site_evaluator
        
        lat = float(request.args.get('lat', 0))
        lon = float(request.args.get('lon', 0))
        
        if not lat or not lon:
            return jsonify({
                'success': False,
                'error': 'lat and lon query parameters are required'
            }), 400
        
        result = site_evaluator.evaluate_site(lat, lon)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[Site Feasibility] Quick evaluate error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@site_feasibility_bp.route('/demo-locations', methods=['GET'])
def get_demo_locations():
    """Return a list of demo locations in India for testing"""
    return jsonify({
        'success': True,
        'locations': [
            {
                'name': 'Jaisalmer, Rajasthan (Solar Rich)',
                'lat': 26.9157,
                'lon': 70.9083,
                'expected': 'Solar-PEM'
            },
            {
                'name': 'Kanyakumari, Tamil Nadu (Windy)',
                'lat': 8.0883,
                'lon': 77.5385,
                'expected': 'Wind-Alkaline'
            },
            {
                'name': 'Sardar Sarovar Dam, Gujarat (Hydro)',
                'lat': 21.8300,
                'lon': 73.7469,
                'expected': 'Hydro-Alkaline'
            },
            {
                'name': 'Kutch, Gujarat (Solar + Wind)',
                'lat': 23.7337,
                'lon': 69.8597,
                'expected': 'Hybrid'
            },
            {
                'name': 'Ahmedabad, Gujarat (Urban)',
                'lat': 23.0225,
                'lon': 72.5714,
                'expected': 'Solar-PEM'
            }
        ]
    })
