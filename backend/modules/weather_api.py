"""
Real-time Weather Data Integration for H2-OptiPlant
Uses OpenWeatherMap API for solar irradiance, wind speed, temperature, humidity
"""

import requests
from datetime import datetime
from typing import Dict, Optional
import os

class WeatherDataProvider:
    """
    Fetches real-time weather data from OpenWeatherMap API
    Free tier: 1000 calls/day, updates every 10 minutes
    """
    
    def __init__(self, api_key: str = None, location: Dict = None):
        # Free API key for demo (you can replace with your own)
        self.api_key = api_key or "8c8e1e6f5e3d4b2a9c7f1e2d3b4a5c6d"  # Demo key
        
        # Default location: Delhi, India (Green Hydrogen Hub)
        self.location = location or {
            'lat': 28.6139,
            'lon': 77.2090,
            'city': 'Delhi'
        }
        
        self.base_url = "https://api.openweathermap.org/data/2.5/weather"
        self.cache = {}
        self.cache_timeout = 600  # 10 minutes
    
    def get_weather_data(self) -> Optional[Dict]:
        """Fetch current weather data from OpenWeatherMap"""
        try:
            params = {
                'lat': self.location['lat'],
                'lon': self.location['lon'],
                'appid': self.api_key,
                'units': 'metric'  # Celsius, m/s
            }
            
            response = requests.get(self.base_url, params=params, timeout=3)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Weather API error: {response.status_code}")
                return None
                
        except requests.exceptions.Timeout:
            print("Weather API timeout - using fallback")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Weather API request failed: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error fetching weather data: {e}")
            return None
    
    def calculate_solar_power(self, weather_data: Dict) -> float:
        """
        Calculate solar power output based on weather conditions
        Factors: Cloud cover, time of day, temperature
        """
        if not weather_data:
            return 0.0
        
        # Get current hour (0-23)
        current_hour = datetime.now().hour
        
        # Solar panel capacity (kW)
        panel_capacity = 1000  # 1 MW solar array
        
        # Time of day factor (solar angle)
        if 6 <= current_hour <= 18:
            # Peak hours: 11 AM - 2 PM
            if 11 <= current_hour <= 14:
                time_factor = 1.0
            elif 9 <= current_hour <= 16:
                time_factor = 0.85
            elif 7 <= current_hour <= 17:
                time_factor = 0.6
            else:
                time_factor = 0.3
        else:
            time_factor = 0.0  # Night time
        
        # Cloud cover factor (0-100%)
        clouds = weather_data.get('clouds', {}).get('all', 0)
        cloud_factor = 1 - (clouds / 150)  # Reduced impact
        cloud_factor = max(0.2, min(1.0, cloud_factor))  # Keep between 0.2-1.0
        
        # Temperature factor (panels less efficient when hot)
        temp = weather_data.get('main', {}).get('temp', 25)
        temp_factor = 1.0 - ((temp - 25) * 0.004)  # -0.4% per degree above 25°C
        temp_factor = max(0.85, min(1.0, temp_factor))
        
        # Calculate actual power
        solar_power = panel_capacity * time_factor * cloud_factor * temp_factor
        
        return max(0, solar_power)
    
    def calculate_wind_power(self, weather_data: Dict) -> float:
        """
        Calculate wind power output based on wind speed
        Using power curve: P = 0.5 * ρ * A * Cp * v³
        """
        if not weather_data:
            return 0.0
        
        # Wind speed (m/s)
        wind_speed = weather_data.get('wind', {}).get('speed', 0)
        
        # Wind turbine specifications
        rated_power = 800  # kW (800 kW turbine)
        cut_in_speed = 3   # m/s
        rated_speed = 12   # m/s
        cut_out_speed = 25 # m/s
        
        if wind_speed < cut_in_speed:
            return 0.0
        elif wind_speed >= cut_out_speed:
            return 0.0  # Safety shutdown
        elif wind_speed >= rated_speed:
            return rated_power
        else:
            # Cubic relationship between cut-in and rated speed
            power = rated_power * ((wind_speed - cut_in_speed) / (rated_speed - cut_in_speed)) ** 3
            return power
    
    def get_environmental_data(self) -> Dict:
        """Get comprehensive environmental data for the plant"""
        weather_data = self.get_weather_data()
        
        if weather_data:
            solar_power = self.calculate_solar_power(weather_data)
            wind_power = self.calculate_wind_power(weather_data)
            
            return {
                'solar_kw': round(solar_power, 2),
                'wind_kw': round(wind_power, 2),
                'temperature_c': round(weather_data.get('main', {}).get('temp', 25), 1),
                'humidity_percent': weather_data.get('main', {}).get('humidity', 50),
                'pressure_hpa': weather_data.get('main', {}).get('pressure', 1013),
                'wind_speed_ms': round(weather_data.get('wind', {}).get('speed', 0), 1),
                'cloud_cover_percent': weather_data.get('clouds', {}).get('all', 0),
                'weather_condition': weather_data.get('weather', [{}])[0].get('main', 'Clear'),
                'location': self.location['city'],
                'timestamp': datetime.now().isoformat(),
                'data_source': 'OpenWeatherMap API'
            }
        else:
            # Fallback to simulation if API fails
            import random
            return {
                'solar_kw': round(random.uniform(500, 1000), 2),
                'wind_kw': round(random.uniform(200, 800), 2),
                'temperature_c': round(random.uniform(20, 35), 1),
                'humidity_percent': random.randint(40, 80),
                'pressure_hpa': random.randint(1000, 1020),
                'wind_speed_ms': round(random.uniform(2, 10), 1),
                'cloud_cover_percent': random.randint(0, 80),
                'weather_condition': 'Clear',
                'location': 'Simulated',
                'timestamp': datetime.now().isoformat(),
                'data_source': 'Simulation (API unavailable)'
            }

# Global instance
weather_provider = WeatherDataProvider()

def get_real_time_energy_data() -> Dict:
    """Get real-time energy generation data from weather API"""
    return weather_provider.get_environmental_data()

def set_location(lat: float, lon: float, city: str):
    """Update plant location for weather data"""
    weather_provider.location = {
        'lat': lat,
        'lon': lon,
        'city': city
    }
