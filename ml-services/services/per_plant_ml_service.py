"""
Per-Plant ML Service
Runs ML models separately for each plant with location-specific weather
"""

import os
import asyncio
from typing import Dict, List
from services.weather_service import WeatherService
import numpy as np

class PerPlantMLService:
    def __init__(self):
        """Initialize per-plant ML service"""
        self.weather_service = WeatherService()
        
        # Plant configurations with locations
        self.plants = {
            'gujarat': {
                'name': 'Gujarat Green H2 Plant',
                'location': 'Ahmedabad, Gujarat',
                'coordinates': {'lat': 23.0225, 'lng': 72.5714},
                'capacity': {
                    'solar': 80,
                    'wind': 50,
                    'hydro': 20,
                    'total': 150
                },
                'base_lcoh': 1.75,
                'efficiency': 0.85
            },
            'maharashtra': {
                'name': 'Maharashtra Hydro-Wind Plant',
                'location': 'Pune, Maharashtra',
                'coordinates': {'lat': 18.5204, 'lng': 73.8567},
                'capacity': {
                    'solar': 40,
                    'wind': 60,
                    'hydro': 20,
                    'total': 120
                },
                'base_lcoh': 1.92,
                'efficiency': 0.82
            },
            'tamil_nadu': {
                'name': 'Tamil Nadu Solar Hub',
                'location': 'Chennai, Tamil Nadu',
                'coordinates': {'lat': 13.0827, 'lng': 80.2707},
                'capacity': {
                    'solar': 70,
                    'wind': 25,
                    'hydro': 5,
                    'total': 100
                },
                'base_lcoh': 2.05,
                'efficiency': 0.80
            }
        }
        
    def calculate_energy_production(self, plant_id: str, weather: Dict) -> Dict:
        """Calculate energy production based on weather"""
        plant = self.plants[plant_id]
        capacity = plant['capacity']
        
        # Solar production (depends on irradiance)
        solar_irradiance = weather.get('solar_irradiance', 850)
        solar_output = (solar_irradiance / 1000) * capacity['solar'] * 0.18
        
        # Wind production (cubic relationship with wind speed)
        wind_speed = weather.get('wind_speed', 12)
        wind_output = min(capacity['wind'], (pow(wind_speed / 10, 3) * capacity['wind'] * 0.4))
        
        # Hydro production (more stable)
        hydro_output = capacity['hydro'] * (0.8 + np.random.random() * 0.15)
        
        total_output = solar_output + wind_output + hydro_output
        
        return {
            'solar': round(solar_output, 2),
            'wind': round(wind_output, 2),
            'hydro': round(hydro_output, 2),
            'total': round(total_output, 2),
            'capacity_factor': round((total_output / capacity['total']) * 100, 1)
        }
    
    def run_profit_prediction(self, plant_id: str, energy_output: Dict, weather: Dict) -> Dict:
        """Run profit prediction ML model for plant"""
        plant = self.plants[plant_id]
        
        # Simulate ML model predictions
        base_production = energy_output['total'] * 24  # Daily production in MWh
        h2_production = base_production * 20  # kg H2 per MWh
        
        revenue = h2_production * plant['base_lcoh'] * 1.5  # Selling price markup
        
        # Weather impact on efficiency
        weather_factor = 1.0
        if weather.get('solar_irradiance', 850) > 800:
            weather_factor += 0.05
        if weather.get('wind_speed', 12) > 10:
            weather_factor += 0.03
        
        daily_profit = revenue * weather_factor * plant['efficiency'] * 0.25
        monthly_profit = daily_profit * 30
        
        return {
            'h2_production_kg': round(h2_production, 1),
            'daily_profit': round(daily_profit, 0),
            'monthly_profit': round(monthly_profit, 0),
            'profit_margin': round((daily_profit / revenue) * 100, 1) if revenue > 0 else 0,
            'roi': round(plant['efficiency'] * 0.25 * 100, 1),
            'ml_confidence': 0.87 + np.random.random() * 0.08
        }
    
    def run_safety_monitoring(self, plant_id: str, energy_output: Dict) -> Dict:
        """Run safety monitoring ML model"""
        # Simulate PINN-based anomaly detection
        anomaly_score = np.random.random() * 0.15  # Low anomaly scores are good
        
        status = 'optimal' if anomaly_score < 0.05 else 'normal' if anomaly_score < 0.10 else 'warning'
        
        return {
            'status': status,
            'anomaly_score': round(anomaly_score, 3),
            'confidence': 0.82 + np.random.random() * 0.10,
            'alerts': []
        }
    
    async def get_plant_predictions(self, plant_id: str) -> Dict:
        """Get all predictions for a specific plant"""
        try:
            plant = self.plants[plant_id]
            
            # Fetch weather for plant location
            weather = self.weather_service.get_weather_by_coords(
                plant['coordinates']['lat'],
                plant['coordinates']['lng']
            )
            
            # Calculate energy production
            energy_output = self.calculate_energy_production(plant_id, weather)
            
            # Run ML models
            profit_pred = self.run_profit_prediction(plant_id, energy_output, weather)
            safety_status = self.run_safety_monitoring(plant_id, energy_output)
            
            return {
                'plant_id': plant_id,
                'plant_name': plant['name'],
                'location': plant['location'],
                'weather': weather,
                'energy_output': energy_output,
                'profit_prediction': profit_pred,
                'safety_status': safety_status,
                'lcoh': plant['base_lcoh'],
                'timestamp': weather.get('timestamp', '')
            }
            
        except Exception as e:
            print(f"Error getting predictions for {plant_id}: {e}")
            return None
    
    async def get_all_plants_predictions(self) -> List[Dict]:
        """Get predictions for all plants"""
        tasks = [self.get_plant_predictions(plant_id) for plant_id in self.plants.keys()]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]

# Global instance
per_plant_ml_service = PerPlantMLService()
