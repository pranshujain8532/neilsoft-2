"""
Enhanced Transport Optimizer Service
=====================================
Multi-factor route scoring with realistic cost calculations.

ALWAYS returns TWO recommendations:
- Fastest: Optimized for speed
- Cheapest: Optimized for cost

Cost Calculation:
- Base fee (fixed handling/loading cost)
- Distance rate (per km)
- Quantity rate (per kg for handling)

Multi-Criteria Scoring:
- Cost: 35%
- Time: 25%
- Safety: 20%
- Quality: 15%
- Carbon: 5%
"""

import os
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from math import radians, sin, cos, sqrt, atan2
from dotenv import load_dotenv

load_dotenv()

# Try to import Supabase
try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
    print("[Transport] Supabase not available")

# Try to import Google Maps
try:
    import googlemaps
    HAS_GMAPS = True
except ImportError:
    HAS_GMAPS = False
    print("[Transport] Google Maps not available")


class TransportOptimizer:
    """
    Enhanced transport optimizer with realistic cost calculations.
    ALWAYS returns Fastest + Cheapest options.
    """
    
    # Transport mode configurations with REALISTIC costs
    TRANSPORT_MODES = {
        'hydrogen_truck': {
            'name': 'Hydrogen Truck',
            'icon': '🚗',
            'base_cost_inr': 8000,       # Base handling/loading fee
            'cost_per_km': 12,            # ₹12 per km
            'cost_per_kg': 5,             # ₹5 per kg handling
            'speed_kmh': 58,              # Fastest truck
            'co2_per_km': 0.02,           # Low emission (H2 powered)
            'safety_score': 0.92,
            'quality_loss_per_hour': 0.001,
            'description': 'Zero-emission hydrogen fuel cell truck'
        },
        'diesel_truck': {
            'name': 'Diesel Truck',
            'icon': '🚚',
            'base_cost_inr': 5000,        # Lower base cost
            'cost_per_km': 7,             # ₹7 per km (cheaper diesel)
            'cost_per_kg': 3,             # ₹3 per kg handling
            'speed_kmh': 55,              # Standard speed
            'co2_per_km': 0.85,           # High emissions
            'safety_score': 0.85,
            'quality_loss_per_hour': 0.0015,
            'description': 'Cost-effective diesel transport'
        },
        'lohc_truck': {
            'name': 'LOHC Truck',
            'icon': '🛢️',
            'base_cost_inr': 12000,
            'cost_per_km': 10,
            'cost_per_kg': 8,
            'speed_kmh': 50,
            'co2_per_km': 0.1,
            'safety_score': 0.95,
            'quality_loss_per_hour': 0.0005,
            'description': 'Liquid Organic Hydrogen Carrier - safest option'
        },
        'compressed_540bar': {
            'name': 'Compressed Gas (540 bar)',
            'icon': '🚛',
            'base_cost_inr': 7000,
            'cost_per_km': 9,
            'cost_per_kg': 4,
            'speed_kmh': 52,
            'co2_per_km': 0.15,
            'safety_score': 0.80,
            'quality_loss_per_hour': 0.0008,
            'description': 'High pressure compressed hydrogen'
        },
        'liquid_h2': {
            'name': 'Liquid H2 Tanker',
            'icon': '🧊',
            'base_cost_inr': 15000,
            'cost_per_km': 8,
            'cost_per_kg': 6,
            'speed_kmh': 48,
            'co2_per_km': 0.08,
            'safety_score': 0.75,
            'quality_loss_per_hour': 0.002,
            'description': 'Cryogenic liquid hydrogen transport'
        },
        'pipeline': {
            'name': 'Hydrogen Pipeline',
            'icon': '🔵',
            'base_cost_inr': 2000,
            'cost_per_km': 0.5,
            'cost_per_kg': 1,
            'speed_kmh': 500,
            'co2_per_km': 0.001,
            'safety_score': 0.98,
            'quality_loss_per_hour': 0.0001,
            'description': 'Dedicated pipeline for continuous flow'
        }
    }
    
    # Scoring weights
    WEIGHTS = {
        'cost': 0.35,
        'time': 0.25,
        'safety': 0.20,
        'quality': 0.15,
        'carbon': 0.05
    }
    
    def __init__(self):
        """Initialize the transport optimizer with API clients."""
        self.supabase = None
        self.gmaps = None
        
        # Initialize Supabase
        if HAS_SUPABASE:
            url = os.getenv('SUPABASE_URL')
            key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
            if url and key:
                self.supabase = create_client(url, key)
                print("[Transport] Supabase connected")
        
        # Initialize Google Maps
        if HAS_GMAPS:
            api_key = os.getenv('GOOGLE_MAPS_API_KEY')
            if api_key:
                self.gmaps = googlemaps.Client(key=api_key)
                print("[Transport] Google Maps connected")
    
    # ========== DISTANCE & GEOCODING ==========
    
    def geocode_address(self, address: str) -> Tuple[float, float]:
        """Get coordinates for an address using Google Maps or fallback."""
        # Try Google Maps first
        if self.gmaps:
            try:
                result = self.gmaps.geocode(address)
                if result:
                    loc = result[0]['geometry']['location']
                    return (loc['lat'], loc['lng'])
            except Exception as e:
                print(f"[Transport] Geocode error: {e}")
        
        # Fallback: Use Nominatim
        try:
            response = requests.get(
                'https://nominatim.openstreetmap.org/search',
                params={'q': address, 'format': 'json', 'limit': 1},
                headers={'User-Agent': 'HydrogenTransport/1.0'},
                timeout=5
            )
            if response.status_code == 200 and response.json():
                data = response.json()[0]
                return (float(data['lat']), float(data['lon']))
        except Exception as e:
            print(f"[Transport] Nominatim error: {e}")
        
        # Final fallback: India center
        return (20.5937, 78.9629)
    
    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in km."""
        R = 6371  # Earth's radius in km
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def get_route_info(self, origin: str, destination: str) -> Dict:
        """Get route info using Google Maps Distance Matrix or fallback."""
        
        # Try Google Maps Distance Matrix first
        if self.gmaps:
            try:
                result = self.gmaps.distance_matrix(
                    origins=[origin],
                    destinations=[destination],
                    mode='driving',
                    departure_time=datetime.now()
                )
                
                if result['rows'][0]['elements'][0]['status'] == 'OK':
                    element = result['rows'][0]['elements'][0]
                    distance_meters = element['distance']['value']
                    duration_secs = element['duration']['value']
                    traffic_secs = element.get('duration_in_traffic', {}).get('value', duration_secs)
                    
                    return {
                        'distance_km': distance_meters / 1000,
                        'duration_mins': duration_secs / 60,
                        'duration_in_traffic_mins': traffic_secs / 60
                    }
            except Exception as e:
                print(f"[Transport] Distance Matrix error: {e}")
        
        # Fallback: Estimate based on geocoding
        origin_coords = self.geocode_address(origin)
        dest_coords = self.geocode_address(destination)
        distance = self.haversine_distance(origin_coords[0], origin_coords[1], dest_coords[0], dest_coords[1])
        
        # Apply road factor (1.3x straight line distance)
        road_distance = distance * 1.3
        
        return {
            'distance_km': road_distance,
            'duration_mins': road_distance / 50 * 60,
            'duration_in_traffic_mins': road_distance / 45 * 60
        }
    
    # ========== WEATHER & SAFETY ==========
    
    def get_weather_risk(self, lat: float, lon: float) -> float:
        """Get weather-based risk factor using Open-Meteo API."""
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,wind_speed_10m"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                current = data.get('current', {})
                
                wind = current.get('wind_speed_10m', 0)
                precip = current.get('precipitation', 0)
                
                wind_risk = min(wind / 50, 1.0) * 0.3
                precip_risk = min(precip / 10, 1.0) * 0.3
                
                return round(wind_risk + precip_risk, 2)
        except Exception as e:
            print(f"[Transport] Weather API error: {e}")
        
        return 0.1  # Default low risk
    
    # ========== COST & METRICS CALCULATION ==========
    
    def calculate_option_metrics(self, mode_key: str, distance_km: float, quantity_kg: float) -> Dict:
        """
        Calculate all metrics for a transport option with REALISTIC costs.
        
        Cost = Base Fee + (Distance × Per-km Rate) + (Quantity × Per-kg Rate)
        """
        mode = self.TRANSPORT_MODES[mode_key]
        
        # Travel time
        travel_time_hours = distance_km / mode['speed_kmh']
        
        # REALISTIC cost calculation
        base_cost = mode['base_cost_inr']
        distance_cost = distance_km * mode['cost_per_km']
        quantity_cost = quantity_kg * mode['cost_per_kg']
        total_cost = base_cost + distance_cost + quantity_cost
        
        # CO2 emissions (per km, not per kg)
        co2_emissions = distance_km * mode['co2_per_km']
        
        # Quality loss (based on travel time)
        quality_loss = travel_time_hours * mode['quality_loss_per_hour'] * 100
        
        return {
            'mode': mode_key,
            'mode_name': mode['name'],
            'mode_icon': mode['icon'],
            'description': mode['description'],
            'distance_km': round(distance_km, 2),
            'quantity_kg': quantity_kg,
            'travel_time_hours': round(travel_time_hours, 2),
            'travel_time_mins': round(travel_time_hours * 60, 0),
            'total_cost_inr': round(total_cost, 0),
            'co2_kg': round(co2_emissions, 2),
            'quality_loss_percent': round(quality_loss, 2),
            'safety_base_score': mode['safety_score']
        }
    
    def score_option(self, metrics: Dict, weather_risk: float, all_options: List[Dict]) -> Dict:
        """
        Score a transport option using multi-criteria scoring.
        
        Weights: Cost 35%, Time 25%, Safety 20%, Quality 15%, Carbon 5%
        """
        # Normalize against all options
        costs = [o['total_cost_inr'] for o in all_options]
        times = [o['travel_time_hours'] for o in all_options]
        carbons = [o['co2_kg'] for o in all_options]
        qualities = [o['quality_loss_percent'] for o in all_options]
        
        # Calculate normalized scores (lower is better for cost/time/carbon/quality)
        cost_range = max(costs) - min(costs) if max(costs) != min(costs) else 1
        time_range = max(times) - min(times) if max(times) != min(times) else 1
        carbon_range = max(carbons) - min(carbons) if max(carbons) != min(carbons) else 1
        quality_range = max(qualities) - min(qualities) if max(qualities) != min(qualities) else 1
        
        cost_score = 1 - (metrics['total_cost_inr'] - min(costs)) / cost_range
        time_score = 1 - (metrics['travel_time_hours'] - min(times)) / time_range
        carbon_score = 1 - (metrics['co2_kg'] - min(carbons)) / carbon_range
        quality_score = 1 - (metrics['quality_loss_percent'] - min(qualities)) / quality_range
        
        # Safety score with weather adjustment
        safety_score = max(0, metrics['safety_base_score'] - weather_risk)
        
        # Calculate weighted final score
        final_score = (
            self.WEIGHTS['cost'] * cost_score +
            self.WEIGHTS['time'] * time_score +
            self.WEIGHTS['safety'] * safety_score +
            self.WEIGHTS['carbon'] * carbon_score +
            self.WEIGHTS['quality'] * quality_score
        )
        
        return {
            **metrics,
            'scores': {
                'cost': round(cost_score, 3),
                'time': round(time_score, 3),
                'safety': round(safety_score, 3),
                'carbon': round(carbon_score, 3),
                'quality': round(quality_score, 3),
                'final': round(final_score, 3)
            },
            'weather_risk': weather_risk
        }
    
    # ========== MAIN OPTIMIZATION ==========
    
    def optimize_route(self, origin: str, destination: str, quantity_kg: float, 
                       priority: str = 'normal', order_id: str = None) -> Dict:
        """
        Main optimization method.
        ALWAYS returns TWO options: Fastest and Cheapest
        """
        print(f"\n[Transport] Optimizing route: {origin} -> {destination}")
        print(f"[Transport] Quantity: {quantity_kg}kg, Priority: {priority}")
        
        # 1. Get route information
        route_info = self.get_route_info(origin, destination)
        distance_km = route_info['distance_km']
        print(f"[Transport] Distance: {distance_km:.2f}km")
        
        # 2. Get weather risk for destination
        dest_coords = self.geocode_address(destination)
        weather_risk = self.get_weather_risk(dest_coords[0], dest_coords[1])
        print(f"[Transport] Weather risk: {weather_risk}")
        
        # 3. ALWAYS use Hydrogen Truck (fastest) and Diesel Truck (cheapest)
        # These are the two primary options for all distances
        modes_to_evaluate = ['hydrogen_truck', 'diesel_truck']
        
        # Add LOHC for very long distances (>1500km) as a safer option
        if distance_km > 1500:
            modes_to_evaluate.append('lohc_truck')
        
        # Add compressed gas for shorter distances
        if distance_km < 800:
            modes_to_evaluate.append('compressed_540bar')
        
        print(f"[Transport] Evaluating modes: {modes_to_evaluate}")
        
        # 4. Calculate metrics for all modes
        all_options = []
        for mode_key in modes_to_evaluate:
            metrics = self.calculate_option_metrics(mode_key, distance_km, quantity_kg)
            all_options.append(metrics)
        
        # 5. Score all options
        scored_options = []
        for option in all_options:
            scored = self.score_option(option, weather_risk, all_options)
            scored_options.append(scored)
        
        # 6. Sort to find Fastest and Cheapest
        by_time = sorted(scored_options, key=lambda x: x['travel_time_hours'])
        by_cost = sorted(scored_options, key=lambda x: x['total_cost_inr'])
        
        # 7. Build final recommendations - ALWAYS two options
        fastest = by_time[0].copy()
        fastest['recommendation'] = 'fastest'
        fastest['recommendation_label'] = 'Fastest'
        
        cheapest = by_cost[0].copy()
        cheapest['recommendation'] = 'cheapest'
        cheapest['recommendation_label'] = 'Cheapest'
        
        # Calculate ETAs
        now = datetime.now()
        for opt in [fastest, cheapest]:
            eta_time = now + timedelta(hours=opt['travel_time_hours'])
            opt['eta'] = f"{int(opt['travel_time_hours'])}h {int((opt['travel_time_hours'] % 1) * 60)}m"
            opt['eta_datetime'] = eta_time.isoformat()
        
        # Build final options list - ensure Fastest is first, Cheapest second
        final_options = [fastest]
        
        # Only add cheapest if it's different from fastest
        if cheapest['mode'] != fastest['mode']:
            final_options.append(cheapest)
        else:
            # If same mode is both fastest and cheapest, add the second fastest as alternative
            if len(by_time) > 1:
                alt_option = by_time[1].copy()
                alt_option['recommendation'] = 'cheapest'
                alt_option['recommendation_label'] = 'Cheapest'
                alt_option['eta'] = f"{int(alt_option['travel_time_hours'])}h {int((alt_option['travel_time_hours'] % 1) * 60)}m"
                final_options.append(alt_option)
        
        print(f"[Transport] Final options: {[o['mode_name'] for o in final_options]}")
        
        return {
            'success': True,
            'options': final_options,
            'route': {
                'origin': origin,
                'destination': destination,
                'distance_km': round(distance_km, 2),
                'quantity_kg': quantity_kg,
                'weather_risk': weather_risk
            },
            'all_scored_options': scored_options
        }
    
    # ========== VEHICLE & FLEET MANAGEMENT ==========
    
    def get_fleet_status(self) -> Dict:
        """Get current fleet status from Supabase."""
        if not self.supabase:
            return {'vehicles': [], 'stats': {'total': 0, 'in_transit': 0, 'idle': 0, 'loading': 0, 'utilization_percent': 0}}
        
        try:
            result = self.supabase.table('vehicles').select('*').execute()
            vehicles = result.data or []
            
            in_transit = [v for v in vehicles if v.get('status') == 'in-transit']
            idle = [v for v in vehicles if v.get('status') == 'idle']
            loading = [v for v in vehicles if v.get('status') == 'loading']
            
            total_capacity = sum(v.get('capacity', 0) for v in vehicles)
            current_load = sum(v.get('current_load', 0) for v in vehicles)
            
            utilization = (len(in_transit) / len(vehicles) * 100) if vehicles else 0
            
            return {
                'vehicles': vehicles,
                'stats': {
                    'total': len(vehicles),
                    'in_transit': len(in_transit),
                    'idle': len(idle),
                    'loading': len(loading),
                    'utilization_percent': round(utilization, 1),
                    'total_capacity_kg': total_capacity,
                    'current_load_kg': current_load
                }
            }
        except Exception as e:
            print(f"[Transport] Fleet status error: {e}")
            return {'vehicles': [], 'stats': {}}
    
    def get_vehicle_tracking(self, vehicle_id: str) -> Dict:
        """Get real-time tracking info for a vehicle."""
        if not self.supabase:
            return {'error': 'No database connection'}
        
        try:
            result = self.supabase.table('vehicles').select('*').eq('id', vehicle_id).single().execute()
            vehicle = result.data
            
            if vehicle:
                return {
                    'id': vehicle['id'],
                    'registration': vehicle.get('registration'),
                    'driver': vehicle.get('driver'),
                    'status': vehicle.get('status'),
                    'current_location': vehicle.get('current_location'),
                    'current_route': vehicle.get('current_route'),
                    'current_load': vehicle.get('current_load'),
                    'fuel_level': vehicle.get('fuel_level', 75),
                    'eta': vehicle.get('eta'),
                    'last_updated': datetime.now().isoformat()
                }
        except Exception as e:
            print(f"[Transport] Vehicle tracking error: {e}")
        
        return {'error': 'Vehicle not found'}
    
    def dispatch_vehicle(self, order_id: str, vehicle_id: str, transport_mode: str) -> Dict:
        """Dispatch a vehicle for an order."""
        if not self.supabase:
            return {'success': False, 'error': 'No database connection'}
        
        try:
            # Update vehicle status
            self.supabase.table('vehicles').update({
                'status': 'in-transit',
                'current_order': order_id
            }).eq('id', vehicle_id).execute()
            
            # Update order status
            self.supabase.table('orders').update({
                'status': 'in-transit',
                'transport_method': transport_mode
            }).eq('id', order_id).execute()
            
            return {
                'success': True,
                'message': f'Vehicle dispatched for order {order_id}',
                'vehicle_id': vehicle_id,
                'order_id': order_id
            }
        except Exception as e:
            print(f"[Transport] Dispatch error: {e}")
            return {'success': False, 'error': str(e)}


# Create singleton instance
transport_optimizer = TransportOptimizer()


def get_optimizer() -> TransportOptimizer:
    """Get the singleton transport optimizer instance."""
    global transport_optimizer
    return transport_optimizer
