"""
Weather API Integration Service
Fetches real-time weather data for energy forecasting
"""

import requests
from typing import Dict, Optional
import os
from datetime import datetime

class WeatherService:
    def __init__(self, api_key: Optional[str] = None):
        # OpenWeatherMap API (can be replaced with any weather service)
        self.api_key = api_key or os.getenv('WEATHER_API_KEY', '')
        self.base_url = 'https://api.openweathermap.org/data/2.5/weather'
        
    def get_weather_by_coords(self, lat: float, lon: float) -> Dict:
        """Get current weather data by coordinates"""
        
        # If no API key, return mock data
        if not self.api_key or self.api_key == 'your_openweathermap_api_key':
            return self._get_mock_weather(lat, lon)
        
        try:
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'  # Celsius
            }
            
            response = requests.get(self.base_url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            return self._parse_weather_data(data)
            
        except Exception as e:
            print(f"Weather API error: {e}, using mock data")
            return self._get_mock_weather(lat, lon)
    
    def get_weather_by_city(self, city: str, country_code: str = 'IN') -> Dict:
        """Get current weather data by city name"""
        
        if not self.api_key or self.api_key == 'your_openweathermap_api_key':
            return self._get_mock_weather(23.0, 72.0)  # Default to Gujarat coords
        
        try:
            params = {
                'q': f'{city},{country_code}',
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(self.base_url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            return self._parse_weather_data(data)
            
        except Exception as e:
            print(f"Weather API error: {e}, using mock data")
            return self._get_mock_weather(23.0, 72.0)
    
    def _parse_weather_data(self, data: Dict) -> Dict:
        """Parse OpenWeatherMap API response"""
        
        # Extract relevant data for energy forecasting
        main = data.get('main', {})
        wind = data.get('wind', {})
        clouds = data.get('clouds', {})
        
        # Calculate solar irradiance estimate (simplified)
        cloud_cover = clouds.get('all', 0)  # 0-100%
        max_irradiance = 1000  # W/m² on clear day
        solar_irradiance = max_irradiance * (1 - cloud_cover / 100)
        
        return {
            'temperature': main.get('temp', 25),
            'humidity': main.get('humidity', 60),
            'pressure': main.get('pressure', 1013),
            'wind_speed': wind.get('speed', 5),
            'wind_direction': wind.get('deg', 180),
            'cloud_cover': cloud_cover,
            'solar_irradiance': round(solar_irradiance, 2),
            'description': data.get('weather', [{}])[0].get('description', 'clear'),
            'location': data.get('name', 'Unknown'),
            'timestamp': datetime.now().isoformat(),
            'source': 'OpenWeatherMap'
        }
    
    def _get_mock_weather(self, lat: float, lon: float) -> Dict:
        """Generate realistic mock weather data"""
        import random
        import math
        
        # Vary by time of day
        hour = datetime.now().hour
        
        # Temperature varies by time
        base_temp = 25
        temp_variation = 10 * math.sin((hour - 6) * math.pi / 12)
        temperature = base_temp + temp_variation + random.uniform(-2, 2)
        
        # Solar irradiance based on time
        if 6 <= hour <= 18:
            solar_angle = math.sin((hour - 6) * math.pi / 12)
            solar_irradiance = 1000 * solar_angle + random.uniform(-50, 50)
        else:
            solar_irradiance = 0
        
        # Wind speed (random with bias)
        wind_speed = abs(random.gauss(8, 3))
        
        return {
            'temperature': round(temperature, 1),
            'humidity': random.randint(40, 80),
            'pressure': random.randint(1010, 1020),
            'wind_speed': round(wind_speed, 1),
            'wind_direction': random.randint(0, 360),
            'cloud_cover': random.randint(0, 60),
            'solar_irradiance': round(max(0, solar_irradiance), 2),
            'description': 'partly cloudy',
            'location': f'Location ({lat:.2f}, {lon:.2f})',
            'timestamp': datetime.now().isoformat(),
            'source': 'Mock Data',
            'water_flow': round(random.uniform(30, 60), 2),  # m³/s for hydro
            'head_height': round(random.uniform(80, 120), 2),  # m for hydro
        }
    
    def test_api_key(self) -> Dict:
        """Test if the weather API key is valid"""
        if not self.api_key or self.api_key == 'your_openweathermap_api_key':
            return {
                'valid': False,
                'message': 'No API key configured. Using mock weather data.',
                'mock_mode': True
            }
        
        try:
            # Test with a known location
            params = {
                'q': 'London,UK',
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(self.base_url, params=params, timeout=5)
            
            if response.status_code == 200:
                return {
                    'valid': True,
                    'message': 'Weather API key is valid!',
                    'mock_mode': False,
                    'provider': 'OpenWeatherMap'
                }
            elif response.status_code == 401:
                return {
                    'valid': False,
                    'message': 'Invalid API key. Using mock weather data.',
                    'mock_mode': True
                }
            else:
                return {
                    'valid': False,
                    'message': f'API error: {response.status_code}. Using mock data.',
                    'mock_mode': True
                }
                
        except Exception as e:
            return {
                'valid': False,
                'message': f'Connection error: {str(e)}. Using mock data.',
                'mock_mode': True
            }

# Global instance
weather_service = WeatherService()
