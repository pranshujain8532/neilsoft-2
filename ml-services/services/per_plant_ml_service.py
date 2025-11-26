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
        
    def calculate_24h_energy_production(self, plant_id: str, forecast: List[Dict]) -> Dict:
        """Calculate total energy production for next 24h based on forecast"""
        plant = self.plants[plant_id]
        capacity = plant['capacity']
        
        total_solar = 0
        total_wind = 0
        total_hydro = 0
        
        # Forecast provides 3-hour intervals. We have 8 intervals for 24 hours.
        # We assume the weather holds for the 3-hour block.
        hours_per_block = 3
        
        for weather_block in forecast:
            # Solar production (MWh)
            # Formula: Irradiance (kW/m2) * Capacity (MW) * Efficiency * Hours
            solar_irradiance_kw = weather_block.get('solar_irradiance', 0) / 1000
            block_solar = solar_irradiance_kw * capacity['solar'] * 0.18 * hours_per_block
            total_solar += block_solar
            
            # Wind production (MWh)
            wind_speed = weather_block.get('wind_speed', 0)
            # Simplified power curve: P = 0.5 * rho * A * v^3 * Cp
            # We use a normalized capacity factor based on wind speed
            # Rated speed approx 12 m/s
            wind_factor = min(1.0, pow(wind_speed / 12, 3))
            block_wind = capacity['wind'] * wind_factor * 0.4 * hours_per_block
            total_wind += block_wind
            
            # Hydro production (MWh) - assumed constant but with small random fluctuation
            hydro_factor = 0.8 + np.random.random() * 0.1
            block_hydro = capacity['hydro'] * hydro_factor * hours_per_block
            total_hydro += block_hydro
            
        total_energy = total_solar + total_wind + total_hydro
        
        return {
            'solar_24h': round(total_solar, 2),
            'wind_24h': round(total_wind, 2),
            'hydro_24h': round(total_hydro, 2),
            'total_24h': round(total_energy, 2),
            'capacity_factor': round((total_energy / (capacity['total'] * 24)) * 100, 1)
        }

    def optimize_energy_mix(self, plant_id: str, current_weather: Dict) -> Dict:
        """
        Smart Grid Logic: Optimize energy mix based on real-time conditions.
        - Night: Boost Hydro/Wind to compensate for lack of Solar.
        - Day: Maximize Solar, conserve Hydro.
        - High Wind: Maximize Wind, reduce Hydro (save water).
        """
        plant = self.plants[plant_id]
        capacity = plant['capacity']
        
        # 1. Calculate Real-Time Potentials
        
        # Solar Potential
        solar_irradiance = current_weather.get('solar_irradiance', 0)
        is_day = current_weather.get('is_day', False)
        # Solar output depends linearly on irradiance
        current_solar = (solar_irradiance / 1000) * capacity['solar']
        
        # Wind Potential
        wind_speed = current_weather.get('wind_speed', 0)
        # Cubic power curve
        wind_factor = min(1.0, pow(wind_speed / 12, 3))
        current_wind = capacity['wind'] * wind_factor
        
        # Hydro Potential (Base)
        current_hydro = capacity['hydro'] * 0.8 # Base load
        
        # 2. Apply Smart Optimization Logic
        optimization_mode = "Standard"
        
        if not is_day or solar_irradiance < 50:
            # NIGHT MODE: Solar is dead.
            # Strategy: Boost Hydro to max capacity to compensate.
            current_hydro = capacity['hydro'] * 1.0 # Max hydro
            optimization_mode = "Night Mode: Hydro Boost"
            
            if wind_speed > 8:
                 optimization_mode += " + Wind Priority"
                 
        elif wind_speed > 15:
            # HIGH WIND MODE
            # Strategy: Wind is abundant. Reduce Hydro to save water reservoir.
            current_hydro = capacity['hydro'] * 0.4 # Min hydro
            optimization_mode = "High Wind: Hydro Conservation"
            
        else:
            # DAY MODE
            # Strategy: Balanced mix, Solar taking the lead.
            optimization_mode = "Day Mode: Solar Priority"
            
        # 3. Calculate Final Mix Percentages
        total_current_power = current_solar + current_wind + current_hydro
        
        if total_current_power > 0:
            mix = {
                'solar': round((current_solar / total_current_power) * 100, 0),
                'wind': round((current_wind / total_current_power) * 100, 0),
                'hydro': round((current_hydro / total_current_power) * 100, 0)
            }
        else:
            # Fallback if everything is 0 (unlikely)
            mix = {'solar': 0, 'wind': 0, 'hydro': 0}
            
        return {
            'mix': mix,
            'current_power_mw': round(total_current_power, 2),
            'optimization_mode': optimization_mode,
            'sources': {
                'solar_mw': round(current_solar, 2),
                'wind_mw': round(current_wind, 2),
                'hydro_mw': round(current_hydro, 2)
            }
        }
    
    def run_profit_prediction(self, plant_id: str, energy_24h: Dict, current_weather: Dict) -> Dict:
        """Run profit prediction ML model for plant based on 24h forecast"""
        plant = self.plants[plant_id]
        
        # Production in MWh for next 24h
        total_energy_mwh = energy_24h['total_24h']
        
        # Electrolyzer efficiency: approx 50 kWh per kg H2 -> 20 kg H2 per MWh
        h2_production_kg = total_energy_mwh * 20
        
        # Revenue calculation
        # Market price fluctuates, base is $4-6/kg, but LCOH is cost.
        # Let's assume selling price is LCOH + Margin
        selling_price = plant['base_lcoh'] * 1.5
        revenue = h2_production_kg * selling_price
        
        # Operational costs (simplified)
        op_cost = h2_production_kg * plant['base_lcoh']
        
        daily_profit = revenue - op_cost
        
        # Monthly projection (simple extrapolation for now)
        monthly_profit = daily_profit * 30
        
        return {
            'h2_production_kg': round(h2_production_kg, 1),
            'daily_profit': round(daily_profit, 0),
            'monthly_profit': round(monthly_profit, 0),
            'profit_margin': round(((revenue - op_cost) / revenue) * 100, 1) if revenue > 0 else 0,
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
            
            # 1. Fetch current weather for display
            current_weather = self.weather_service.get_weather_by_coords(
                plant['coordinates']['lat'],
                plant['coordinates']['lng']
            )
            
            # 2. Fetch 24h forecast for accurate prediction
            forecast = self.weather_service.get_forecast_by_coords(
                plant['coordinates']['lat'],
                plant['coordinates']['lng']
            )
            
            # 3. Calculate energy production for next 24h
            energy_24h = self.calculate_24h_energy_production(plant_id, forecast)
            
            # 4. Optimize Real-Time Energy Mix
            optimized_mix = self.optimize_energy_mix(plant_id, current_weather)
            
            # 5. Run ML models
            profit_pred = self.run_profit_prediction(plant_id, energy_24h, current_weather)
            safety_status = self.run_safety_monitoring(plant_id, energy_24h)
            
            return {
                'plant_id': plant_id,
                'plant_name': plant['name'],
                'location': plant['location'],
                'weather': current_weather,
                'energy_output': energy_24h, # This now contains 24h totals
                'current_mix': optimized_mix, # NEW: Dynamic mix
                'profit_prediction': profit_pred,
                'safety_status': safety_status,
                'lcoh': plant['base_lcoh'],
                'timestamp': current_weather.get('timestamp', '')
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
