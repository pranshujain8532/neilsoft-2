"""
Surplus Routing API Routes
Handles overflow condition: Production > (Plant Capacity + Battery Capacity)
"""

from flask import Blueprint, request, jsonify
from datetime import datetime

surplus_routing_bp = Blueprint('surplus_routing', __name__)


@surplus_routing_bp.route('/status/<plant_id>', methods=['GET'])
def get_overflow_status(plant_id):
    """
    Get current overflow status for a plant
    
    Returns:
        - is_overflow: bool
        - production_kw: current production
        - total_capacity_kw: plant + battery capacity
        - overflow_kw: excess energy
        - battery_percent: current battery level
    """
    try:
        from services.surplus_routing_service import surplus_routing_service
        
        status = surplus_routing_service.check_overflow_condition(plant_id)
        
        return jsonify({
            "success": True,
            "plant_id": plant_id,
            "timestamp": datetime.now().isoformat(),
            "overflow_status": status
        })
        
    except Exception as e:
        print(f"[ERROR] Get overflow status failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@surplus_routing_bp.route('/process/<plant_id>', methods=['POST'])
def process_surplus(plant_id):
    """
    Process surplus energy:
    1. Check overflow condition
    2. If overflow:
       a. Try truck loading (Priority 1)
       b. Fallback to grid export (Priority 2)
    """
    try:
        from services.surplus_routing_service import surplus_routing_service
        
        result = surplus_routing_service.process_surplus(plant_id)
        
        return jsonify({
            "success": True,
            "plant_id": plant_id,
            "timestamp": datetime.now().isoformat(),
            **result
        })
        
    except Exception as e:
        print(f"[ERROR] Process surplus failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@surplus_routing_bp.route('/dispatch/<plant_id>', methods=['POST'])
def dispatch_to_truck(plant_id):
    """
    Manually trigger truck loading for a specific order
    
    Request body:
        - order_id: UUID of the order
        - vehicle_id: UUID of the vehicle
        - surplus_kwh: Amount of energy to load
    """
    try:
        from services.surplus_routing_service import surplus_routing_service
        
        data = request.get_json() or {}
        order_id = data.get('order_id')
        vehicle_id = data.get('vehicle_id')
        surplus_kwh = data.get('surplus_kwh', 0)
        
        if not order_id or not vehicle_id:
            return jsonify({"success": False, "error": "order_id and vehicle_id required"}), 400
        
        result = surplus_routing_service.execute_truck_loading(
            plant_id=plant_id,
            order_id=order_id,
            vehicle_id=vehicle_id,
            surplus_kwh=surplus_kwh
        )
        
        return jsonify({
            "success": True,
            "plant_id": plant_id,
            "timestamp": datetime.now().isoformat(),
            **result
        })
        
    except Exception as e:
        print(f"[ERROR] Truck dispatch failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@surplus_routing_bp.route('/grid-export/<plant_id>', methods=['POST'])
def export_to_grid(plant_id):
    """
    Manually trigger grid export
    
    Request body:
        - surplus_kwh: Amount of energy to export
        - price_per_kwh: Optional, default 4.25 INR
    """
    try:
        from services.surplus_routing_service import surplus_routing_service
        
        data = request.get_json() or {}
        surplus_kwh = data.get('surplus_kwh', 0)
        price_per_kwh = data.get('price_per_kwh', 4.25)
        
        if not surplus_kwh:
            return jsonify({"success": False, "error": "surplus_kwh required"}), 400
        
        # Find nearest grid point
        plant_lat, plant_lon = surplus_routing_service._get_plant_location(plant_id)
        grid_location = surplus_routing_service.find_nearest_grid_point(plant_lat, plant_lon)
        
        result = surplus_routing_service.execute_grid_export(
            plant_id=plant_id,
            surplus_kwh=surplus_kwh,
            grid_location=grid_location,
            price_per_kwh=price_per_kwh
        )
        
        return jsonify({
            "success": True,
            "plant_id": plant_id,
            "timestamp": datetime.now().isoformat(),
            **result
        })
        
    except Exception as e:
        print(f"[ERROR] Grid export failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@surplus_routing_bp.route('/find-grid/<plant_id>', methods=['GET'])
def find_grid_point(plant_id):
    """
    Find nearest grid point for a plant
    Uses Google Maps API with fallback to cached points
    """
    try:
        from services.surplus_routing_service import surplus_routing_service
        
        plant_lat, plant_lon = surplus_routing_service._get_plant_location(plant_id)
        grid_location = surplus_routing_service.find_nearest_grid_point(plant_lat, plant_lon)
        
        return jsonify({
            "success": True,
            "plant_id": plant_id,
            "plant_location": {"lat": plant_lat, "lon": plant_lon},
            "grid_point": grid_location
        })
        
    except Exception as e:
        print(f"[ERROR] Find grid point failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@surplus_routing_bp.route('/eligible-orders/<plant_id>', methods=['GET'])
def get_eligible_orders(plant_id):
    """Get pending/confirmed orders for expedited fulfillment"""
    try:
        from services.surplus_routing_service import surplus_routing_service
        
        orders = surplus_routing_service.get_eligible_orders(plant_id)
        
        return jsonify({
            "success": True,
            "plant_id": plant_id,
            "eligible_orders": orders,
            "count": len(orders)
        })
        
    except Exception as e:
        print(f"[ERROR] Get eligible orders failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@surplus_routing_bp.route('/idle-vehicles', methods=['GET'])
def get_idle_vehicles():
    """Get available vehicles with status='idle'"""
    try:
        from services.surplus_routing_service import surplus_routing_service
        
        vehicles = surplus_routing_service.get_idle_vehicles()
        
        return jsonify({
            "success": True,
            "idle_vehicles": vehicles,
            "count": len(vehicles)
        })
        
    except Exception as e:
        print(f"[ERROR] Get idle vehicles failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =========================================
# GRAPH DATA ENDPOINTS
# =========================================

@surplus_routing_bp.route('/graph/export-24h/<plant_id>', methods=['GET'])
def get_export_graph_24h(plant_id):
    """
    Get 24H grid export data for time-series chart
    Aggregated by 10-minute buckets
    """
    try:
        from services.surplus_routing_service import surplus_routing_service
        
        data = surplus_routing_service.get_grid_export_24h(plant_id)
        
        return jsonify({
            "success": True,
            "plant_id": plant_id,
            "data": data,
            "meta": {
                "bucket_size": "10 minutes",
                "period": "24 hours"
            }
        })
        
    except Exception as e:
        print(f"[ERROR] Get export graph failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@surplus_routing_bp.route('/graph/import-export/<plant_id>', methods=['GET'])
def get_import_export_summary(plant_id):
    """
    Get import vs export summary for comparison chart
    """
    try:
        from services.surplus_routing_service import surplus_routing_service
        
        days = request.args.get('days', 30, type=int)
        summary = surplus_routing_service.get_grid_import_export_summary(plant_id, days)
        
        return jsonify({
            "success": True,
            "plant_id": plant_id,
            "summary": summary,
            "period_days": days
        })
        
    except Exception as e:
        print(f"[ERROR] Get import/export summary failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@surplus_routing_bp.route('/live-overflow/<plant_id>', methods=['GET'])
def get_live_overflow(plant_id):
    """
    Get real-time overflow counter for live display
    """
    try:
        from services.surplus_routing_service import surplus_routing_service
        
        overflow = surplus_routing_service.get_live_overflow(plant_id)
        
        return jsonify({
            "success": True,
            "plant_id": plant_id,
            "timestamp": datetime.now().isoformat(),
            "live_overflow_kw": overflow.get('overflow_kw', 0),
            "is_overflow": overflow.get('is_overflow', False),
            "details": overflow
        })
        
    except Exception as e:
        print(f"[ERROR] Get live overflow failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@surplus_routing_bp.route('/dashboard/<plant_id>', methods=['GET'])
def get_surplus_dashboard(plant_id):
    """
    Get complete surplus routing dashboard data
    Combines all data needed for UI
    """
    try:
        from services.surplus_routing_service import surplus_routing_service
        
        # Get all data
        overflow_status = surplus_routing_service.check_overflow_condition(plant_id)
        eligible_orders = surplus_routing_service.get_eligible_orders(plant_id)
        idle_vehicles = surplus_routing_service.get_idle_vehicles()
        export_24h = surplus_routing_service.get_grid_export_24h(plant_id)
        import_export = surplus_routing_service.get_grid_import_export_summary(plant_id)
        
        # Find nearest grid point
        plant_lat, plant_lon = surplus_routing_service._get_plant_location(plant_id)
        nearest_grid = surplus_routing_service.find_nearest_grid_point(plant_lat, plant_lon)
        
        return jsonify({
            "success": True,
            "plant_id": plant_id,
            "timestamp": datetime.now().isoformat(),
            
            # Live status
            "overflow_status": overflow_status,
            "live_overflow_kw": overflow_status.get('overflow_kw', 0),
            
            # Available resources
            "eligible_orders": eligible_orders,
            "idle_vehicles": idle_vehicles,
            
            # Grid info
            "nearest_grid_point": nearest_grid,
            
            # Charts
            "export_24h_chart": export_24h,
            "import_export_summary": import_export,
            
            # Priority action recommendation
            "recommended_action": _get_recommended_action(overflow_status, eligible_orders, idle_vehicles)
        })
        
    except Exception as e:
        print(f"[ERROR] Get surplus dashboard failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


def _get_recommended_action(overflow_status: dict, orders: list, vehicles: list) -> dict:
    """Determine recommended action based on current state"""
    if not overflow_status.get('is_overflow'):
        return {
            "action": "none",
            "reason": "No overflow detected",
            "priority": 0
        }
    
    if orders and vehicles:
        return {
            "action": "truck_loading",
            "reason": f"{len(orders)} pending orders, {len(vehicles)} idle vehicles available",
            "priority": 1,
            "order_id": orders[0]['id'] if orders else None,
            "vehicle_id": vehicles[0]['id'] if vehicles else None
        }
    
    return {
        "action": "grid_export",
        "reason": "No eligible orders or idle vehicles - export to grid",
        "priority": 2
    }


print("[OK] Surplus Routing routes initialized")
