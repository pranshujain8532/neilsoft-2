"""
Plant Recommendation System
Recommends optimal plant for order fulfillment based on capacity, location, energy mix
"""

import numpy as np
from typing import Dict, List

class PlantRecommender:
    def __init__(self):
        self.weights = {
            'capacity_match': 0.35,
            'distance': 0.25,
            'lcoh': 0.20,
            'renewable_score': 0.15,
            'availability': 0.05
        }
    
    def calculate_distance(self, plant_coords: Dict, customer_coords: Dict) -> float:
        """Calculate haversine distance between coordinates"""
        from math import radians, sin, cos, sqrt, atan2
        
        lat1, lon1 = radians(plant_coords.get('lat', 0)), radians(plant_coords.get('lng', 0))
        lat2, lon2 = radians(customer_coords.get('lat', 0)), radians(customer_coords.get('lng', 0))
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return 6371 * c  # km
    
    def score_plant(self, plant: Dict, order: Dict) -> Dict:
        """Score a plant for an order"""
        
        # Capacity match score
        order_quantity = order.get('quantity', 1000)  # kg
        plant_capacity = plant.get('capacity', 50) * 1000  # Convert TPD to kg/day
        capacity_ratio = min(order_quantity / plant_capacity, 1.0)
        capacity_score = 1.0 - abs(capacity_ratio - 0.5) # Peak at 50% utilization
        
        # Distance score
        if plant.get('location', {}).get('coordinates') and order.get('delivery_location', {}).get('coordinates'):
            distance = self.calculate_distance(
                plant['location']['coordinates'],
                order['delivery_location']['coordinates']
            )
            distance_score = max(0, 1.0 - distance / 1000)  # Normalize to 1000km
        else:
            distance_score = 0.5
        
        # LCOH score (lower is better)
        lcoh = plant.get('lcoh', 2.0)
        lcoh_score = max(0, 1.0 - (lcoh - 1.0) / 2.0)  # Normalize $1-3/kg range
        
        # Renewable energy score
        energy_mix = plant.get('energySources', {})
        solar = energy_mix.get('solar', {}).get('current', 0)
        wind = energy_mix.get('wind', {}).get('current', 0)
        hydro = energy_mix.get('hydro', {}).get('current', 0)
        total_renewable = solar + wind + hydro
        total_capacity = plant.get('totalEnergyCapacity', 100)
        renewable_score = (total_renewable / total_capacity) if total_capacity > 0 else 0
        
        # Availability score
        status = plant.get('status', 'active')
        availability_score = 1.0 if status == 'active' else 0.3
        
        # Calculate weighted final score
        final_score = (
            self.weights['capacity_match'] * capacity_score +
            self.weights['distance'] * distance_score +
            self.weights['lcoh'] * lcoh_score +
            self.weights['renewable_score'] * renewable_score +
            self.weights['availability'] * availability_score
        )
        
        return {
            'plant_id': plant.get('_id', 'unknown'),
            'plant_name': plant.get('name', 'Unknown'),
            'final_score': final_score,
            'breakdown': {
                'capacity_match': capacity_score,
                'distance': distance_score,
                'lcoh': lcoh_score,
                'renewable': renewable_score,
                'availability': availability_score
            },
            'estimated_distance_km': distance if 'distance' in locals() else None,
            'estimated_cost': lcoh * order_quantity,
            'renewable_percentage': renewable_score * 100
        }
    
    def recommend_plants(self, plants: List[Dict], order: Dict, top_n: int = 3) -> List[Dict]:
        """Recommend top N plants for an order"""
        
        scored_plants = []
        for plant in plants:
            score_data = self.score_plant(plant, order)
            scored_plants.append(score_data)
        
        # Sort by final score (descending)
        scored_plants.sort(key=lambda x: x['final_score'], reverse=True)
        
        return scored_plants[:top_n]


# Create global instance
plant_recommender = PlantRecommender()
