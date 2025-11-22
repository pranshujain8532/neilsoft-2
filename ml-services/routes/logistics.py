from flask import Blueprint, request, jsonify
import math

logistics_bp = Blueprint('logistics', __name__)

class LogisticsOptimizer:
    """Vehicle routing and logistics optimization"""
    
    def optimize_route(self, origin, destinations, vehicle_capacity, safety_requirements):
        """Optimize delivery routes for hydrogen transport"""
        routes = []
        total_demand = sum(d.get('demand', 0) for d in destinations)
        trips_needed = math.ceil(total_demand / vehicle_capacity)
        
        remaining_destinations = destinations.copy()
        current_location = origin
        route_plan = []
        current_load = 0
        current_route = []
        
        while remaining_destinations:
            nearest = None
            min_distance = float('inf')
            
            for dest in remaining_destinations:
                distance = self._calculate_distance(current_location, dest)
                demand = dest.get('demand', 0)
                
                if current_load + demand <= vehicle_capacity and distance < min_distance:
                    nearest = dest
                    min_distance = distance
            
            if nearest:
                current_route.append({
                    'location': nearest['name'],
                    'distance': min_distance,
                    'demand': nearest.get('demand', 0)
                })
                current_load += nearest.get('demand', 0)
                current_location = nearest
                remaining_destinations.remove(nearest)
            else:
                route_plan.append({
                    'route': current_route,
                    'totalDistance': sum(r['distance'] for r in current_route),
                    'totalLoad': current_load
                })
                current_route = []
                current_load = 0
                current_location = origin
        
        if current_route:
            route_plan.append({
                'route': current_route,
                'totalDistance': sum(r['distance'] for r in current_route),
                'totalLoad': current_load
            })
        
        return {
            'vehiclesRequired': len(route_plan),
            'routes': route_plan,
            'totalDistance': sum(r['totalDistance'] for r in route_plan),
            'safetyChecks': self._generate_safety_checks(safety_requirements)
        }
    
    def _calculate_distance(self, loc1, loc2):
        """Simple distance calculation"""
        return abs(hash(loc1.get('name', '')) - hash(loc2.get('name', ''))) % 500 + 50
    
    def _generate_safety_checks(self, requirements):
        """Generate safety checklist for hydrogen transport"""
        return [
            'Verify pressure relief valves functional',
            'Check container integrity',
            'Ensure driver hydrogen safety certified',
            'Confirm route avoids high-traffic areas',
            'Emergency response kit onboard',
            'GPS tracking active',
            'Temperature monitoring operational'
        ]

optimizer = LogisticsOptimizer()

@logistics_bp.route('/optimize', methods=['POST'])
def optimize_logistics():
    """Logistics optimization endpoint"""
    data = request.json
    origin = data.get('origin', {})
    destinations = data.get('destinations', [])
    vehicle_capacity = data.get('vehicleCapacity', 500)
    safety_requirements = data.get('safetyRequirements', 'standard')
    
    if not destinations:
        return jsonify({'error': 'Destinations are required'}), 400
    
    result = optimizer.optimize_route(origin, destinations, vehicle_capacity, safety_requirements)
    return jsonify(result), 200
