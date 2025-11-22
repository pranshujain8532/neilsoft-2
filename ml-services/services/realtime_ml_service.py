"""
Real-Time ML Prediction Service
Continuously updates ML predictions using latest weather data
"""

import threading
import time
from typing import Dict, List
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.weather_service import weather_service
from models.energy_forecaster import energy_forecaster
from models.profit_predictor import profit_predictor
from models.safety_monitor import safety_monitor

class RealtimeMLService:
    def __init__(self):
        self.running = False
        self.update_interval = 10  # seconds
        self.latest_predictions = {}
        self.latest_weather = {}
        
    def start(self):
        """Start real-time prediction updates"""
        if not self.running:
            self.running = True
            self.update_thread = threading.Thread(target=self._update_loop, daemon=True)
            self.update_thread.start()
            print("✅ Real-time ML service started")
    
    def stop(self):
        """Stop real-time updates"""
        self.running = False
        print("🛑 Real-time ML service stopped")
    
    def _update_loop(self):
        """Main update loop"""
        while self.running:
            try:
                self._update_predictions()
                time.sleep(self.update_interval)
            except Exception as e:
                print(f"Error in ML update loop: {e}")
                time.sleep(self.update_interval)
    
    def _update_predictions(self):
        """Update all ML predictions with latest data"""
        
        # Get latest weather for default location (Gujarat, India)
        weather = weather_service.get_weather_by_coords(23.0225, 72.5714)
        self.latest_weather = weather
        
        # Update energy forecast based on weather
        try:
            plant_capacity = {
                'solar': 80,  # MW
                'wind': 50,
                'hydro': 20
            }
            
            weather_data = {
                'irradiance': weather.get('solar_irradiance', 500),
                'temperature': weather.get('temperature', 25),
                'hour': time.localtime().tm_hour,
                'wind_speed': weather.get('wind_speed', 8),
                'wind_direction': weather.get('wind_direction', 180),
                'water_flow': weather.get('water_flow', 50),
                'head_height': weather.get('head_height', 100)
            }
            
            energy_forecast = energy_forecaster.forecast_energy(weather_data, plant_capacity)
            self.latest_predictions['energy'] = energy_forecast
            
        except Exception as e:
            print(f"Energy forecast error: {e}")
        
        # Update safety monitoring (using random sensor data for demo)
        try:
            import random
            machine_data = {
                'pressure': random.uniform(10, 25),
                'temperature': weather.get('temperature', 25) + random.uniform(15, 35),
                'flowRate': random.uniform(15, 35),
                'current': random.uniform(1500, 3500)
            }
            
            safety_result = safety_monitor.check_safety(machine_data)
            self.latest_predictions['safety'] = safety_result
            
        except Exception as e:
            print(f"Safety monitoring error: {e}")
        
        # Update profit prediction
        try:
            plant_data = {
                'currentProduction': 50 + random.uniform(-10, 10),
                'lcoh': 1.85 + random.uniform(-0.15, 0.15)
            }
            
            profit_prediction = profit_predictor.predict(plant_data)
            self.latest_predictions['profit'] = profit_prediction
            
        except Exception as e:
            print(f"Profit prediction error: {e}")
        
        self.latest_predictions['timestamp'] = time.time()
    
    def get_latest_predictions(self) -> Dict:
        """Get the most recent predictions"""
        return {
            'predictions': self.latest_predictions,
            'weather': self.latest_weather,
            'update_interval': self.update_interval,
            'last_update': self.latest_predictions.get('timestamp', 0)
        }

# Global instance
realtime_ml_service = RealtimeMLService()
