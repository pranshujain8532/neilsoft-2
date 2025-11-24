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
        """Calculate realistic distance between two locations"""
        # Simple Euclidean distance using lat/lng
        lat1, lng1 = loc1.get('lat', 0), loc1.get('lng', 0)
        lat2, lng2 = loc2.get('lat', 0), loc2.get('lng', 0)
        
        # Approximate distance in km
        distance = math.sqrt((lat1 - lat2)**2 + (lng1 - lng2)**2) * 111  # degrees to km
        return max(distance, 1)  # Minimum 1km
    
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
    
    def optimize_with_profit(self, origin, destinations, order_value, fuel_cost_per_km=15, driver_cost_per_hour=200):
        """
        Optimize plant selection based on PROFIT MAXIMIZATION
        
        Considers:
        - Transport cost (distance × fuel_cost)
        - Production cost at each plant
        - Delivery time
        - Net profit = order_value - total_costs
        
        Returns plant with highest profit margin
        """
        if not destinations:
            return None
        
        plant_scores = []
        avg_speed = 60  # km/h
        
        for dest in destinations:
            # Calculate distance
            distance = self._calculate_distance(origin, dest)
            
            # Cost calculations
            transport_cost = distance * fuel_cost_per_km
            delivery_time_hours = distance / avg_speed
            driver_cost = delivery_time_hours * driver_cost_per_hour
            production_cost = dest.get('production_cost', 2000)  # Default ₹2000/unit
            
            # Total cost
            total_cost = transport_cost + driver_cost + production_cost
            
            # Profit calculation
            net_profit = order_value - total_cost
            profit_margin = (net_profit / order_value) * 100 if order_value > 0 else 0
            
            # Efficiency factor (higher efficiency = lower actual production cost)
            efficiency = dest.get('efficiency', 0.8)
            adjusted_profit = net_profit * efficiency
            
            # Store results
            plant_scores.append({
                'plant_name': dest['name'],
                'plant_id': dest.get('id', dest['name']),
                'distance_km': round(distance, 2),
                'delivery_time_hours': round(delivery_time_hours, 2),
                'costs': {
                    'transport': round(transport_cost, 2),
                    'driver': round(driver_cost, 2),
                    'production': production_cost,
                    'total': round(total_cost, 2)
                },
                'revenue': order_value,
                'net_profit': round(net_profit, 2),
                'profit_margin_percent': round(profit_margin, 2),
                'efficiency_factor': efficiency,
                'adjusted_profit_score': round(adjusted_profit, 2),
                'lat': dest.get('lat'),
'lng': dest.get('lng')
            })
        
        # Sort by adjusted profit score (highest first)
        plant_scores.sort(key=lambda x: x['adjusted_profit_score'], reverse=True)
        
        selected_plant = plant_scores[0] if plant_scores else None
        
        return {
            'selected_plant': selected_plant,
            'all_options': plant_scores,
            'optimization_method': 'profit_maximization',
            'safety_checks': self._generate_safety_checks('high')
        }

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

@logistics_bp.route('/optimize-profit', methods=['POST'])
def optimize_profit():
    """
    Profit-based plant selection endpoint
    
    Expected payload:
    {
        "origin": {"lat": 19.0760, "lng": 72.8777},
        "destinations": [
            {
                "name": "Plant A",
                "id": "plant-123",
                "lat": 23.0225,
                "lng": 72.5714,
                "production_cost": 2000,
                "efficiency": 0.85
            }
        ],
        "order_value": 5000,
        "fuel_cost_per_km": 15,
        "driver_cost_per_hour": 200
    }
    """
    data = request.json
    origin = data.get('origin', {})
    destinations = data.get('destinations', [])
    order_value = data.get('order_value', 0)
    fuel_cost = data.get('fuel_cost_per_km', 15)
    driver_cost = data.get('driver_cost_per_hour', 200)
    
    if not destinations:
        return jsonify({'error': 'Destinations are required'}), 400
    
    if order_value <= 0:
        return jsonify({'error': 'Order value must be greater than 0'}), 400
    
    result = optimizer.optimize_with_profit(origin, destinations, order_value, fuel_cost, driver_cost)
    return jsonify(result), 200
