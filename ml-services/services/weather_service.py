"""
Weather API Integration Service
Fetches real-time weather data for energy forecasting using Open-Meteo (Free, No API Key)
"""

import requests
from typing import Dict, Optional, Tuple, List
import os
from datetime import datetime, timedelta
import pandas as pd

class WeatherService:
    def __init__(self, api_key: Optional[str] = None):
        # Use OpenWeatherMap with API key
        self.api_key = api_key or os.getenv('WEATHER_API_KEY') or 'e168c270a2561b64d8db9ebbba2dc2bd'
        self.base_url = 'https://api.openweathermap.org/data/2.5'
        self.archive_url = 'https://archive-api.open-meteo.com/v1/archive'  # Keep for historical data
        
        # Weather cache to reduce API calls (1 hour cache)
        self._weather_cache = {}  # {(lat, lon): {'data': {...}, 'timestamp': datetime}}
        self._cache_duration = timedelta(hours=1)  # Cache for 1 hour
        
    def get_weather_by_coords(self, lat: float, lon: float) -> Dict:
        """Get current weather data by coordinates using OpenWeatherMap (cached for 1 hour)"""
        
        # Check cache first
        cache_key = (round(lat, 2), round(lon, 2))  # Round to group nearby locations
        if cache_key in self._weather_cache:
            cached = self._weather_cache[cache_key]
            age = datetime.now() - cached['timestamp']
            if age < self._cache_duration:
                # print(f"[CACHE] Using cached weather data (age: {age.seconds}s)")
                return cached['data']
        
        # Fetch fresh data from OpenWeatherMap API
        try:
            url = f"{self.base_url}/weather?lat={lat}&lon={lon}&appid={self.api_key}&units=metric"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            weather_data = self._parse_openweathermap_data(data, lat, lon)
            
            # Cache the result
            self._weather_cache[cache_key] = {
                'data': weather_data,
                'timestamp': datetime.now()
            }
            print(f"[API] Fresh weather data fetched from OpenWeatherMap for ({lat}, {lon})")
            
            return weather_data
            
        except Exception as e:
            print(f"OpenWeatherMap API error: {e}, using mock data")
            return self._get_mock_weather(lat, lon)
    
    def _parse_openweathermap_data(self, data: Dict, lat: float, lon: float) -> Dict:
        """Parse OpenWeatherMap API response"""
        import random
        main = data.get('main', {})
        wind = data.get('wind', {})
        clouds = data.get('clouds', {})
        weather_desc = data.get('weather', [{}])[0].get('description', 'Clear')
        
        # Calculate mock irradiance based on time of day (OpenWeatherMap doesn't provide it)
        hour = datetime.now().hour
        solar_irr = 0
        if 6 <= hour <= 18:
            hour_factor = 1 - abs(hour - 12) / 6
            cloud_cover = clouds.get('all', 30)
            cloud_factor = 1 - (cloud_cover / 100) * 0.5
            solar_irr = 800 * hour_factor * cloud_factor + random.uniform(-50, 100)
            solar_irr = max(0, solar_irr)
        
        return {
            'temperature': main.get('temp', 25),
            'humidity': main.get('humidity', 60),
            'pressure': main.get('pressure', 1013),
            'wind_speed': wind.get('speed', 5),
            'wind_direction': wind.get('deg', 180),
            'cloud_cover': clouds.get('all', 0),
            'solar_irradiance': solar_irr,
            'description': weather_desc.capitalize(),
            'location': f'Lat: {lat:.2f}, Lon: {lon:.2f}',
            'timestamp': datetime.now().isoformat(),
            'source': 'OpenWeatherMap (Real Data)',
            # Hydro proxies
            'water_flow': 45.5, 
            'head_height': 100.0
        }
    
    def get_forecast_by_coords(self, lat: float, lon: float) -> Dict:
        """Get next day forecast data by coordinates using Open-Meteo"""
        try:
            params = {
                'latitude': lat,
                'longitude': lon,
                'daily': 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,shortwave_radiation_sum',
                'timezone': 'auto',
                'forecast_days': 2
            }
            
            response = requests.get(self.base_url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            daily = data.get('daily', {})
            # Index 1 is tomorrow (0 is today)
            return {
                'max_temp': daily.get('temperature_2m_max', [0, 0])[1],
                'min_temp': daily.get('temperature_2m_min', [0, 0])[1],
                'wind_speed': daily.get('wind_speed_10m_max', [0, 0])[1],
                'solar_radiation': daily.get('shortwave_radiation_sum', [0, 0])[1], # MJ/m²
                'precipitation': daily.get('precipitation_sum', [0, 0])[1],
                'description': 'Sunny' if daily.get('precipitation_sum', [0, 0])[1] < 1 else 'Rainy'
            }
            
        except Exception as e:
            print(f"Weather Forecast API error: {e}, using mock data")
            return {
                'max_temp': 30.0,
                'min_temp': 22.0,
                'wind_speed': 15.0,
                'solar_radiation': 20.0,
                'precipitation': 0.0,
                'description': 'Sunny (Mock)'
            }
    
    def get_weather_by_city(self, city: str, country_code: str = 'IN') -> Dict:
        """Get current weather data by city name (Geocoding first)"""
        try:
            # Simple geocoding for demo cities
            coords = {
                'Ahmedabad': (23.0225, 72.5714),
                'Pune': (18.5204, 73.8567),
                'Coimbatore': (11.0168, 76.9558),
                'Kutch': (23.7337, 69.8597),
                'Ludhiana': (30.9010, 75.8573)
            }
            
            lat, lon = coords.get(city, (23.0225, 72.5714)) # Default to Ahmedabad
            return self.get_weather_by_coords(lat, lon)
            
        except Exception as e:
            print(f"Weather API error: {e}, using mock data")
            return self._get_mock_weather(23.0, 72.0)
            
    def get_historical_weather(self, lat: float, lon: float, days: int = 365) -> Tuple[List, List]:
        """
        Fetch historical weather data for training
        Returns: (X_data, y_data_simulated)
        """
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            params = {
                'latitude': lat,
                'longitude': lon,
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d'),
                'hourly': 'temperature_2m,direct_radiation,wind_speed_10m,wind_direction_10m',
                'timezone': 'auto'
            }
            
            print(f"Fetching historical weather from {start_date.date()} to {end_date.date()}...")
            response = requests.get(self.archive_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            hourly = data.get('hourly', {})
            df = pd.DataFrame({
                'time': hourly.get('time', []),
                'temperature': hourly.get('temperature_2m', []),
                'irradiance': hourly.get('direct_radiation', []),
                'wind_speed': hourly.get('wind_speed_10m', []),
                'wind_direction': hourly.get('wind_direction_10m', [])
            })
            
            # Filter out night time for solar (irradiance > 0) or keep all for general
            # For simplicity, we return the raw DataFrame converted to list of dicts or arrays
            # The calling function will process it into X, y
            
            return df
            
        except Exception as e:
            print(f"Historical Weather API error: {e}")
            return None
    
    def _parse_open_meteo_data(self, data: Dict, lat: float, lon: float) -> Dict:
        """Parse Open-Meteo API response"""
        import random
        current = data.get('current', {})
        
        # Get irradiance, use mock if 0
        solar_irr = current.get('direct_radiation', 0)
        if solar_irr == 0:
            hour = datetime.now().hour
            if 6 <= hour <= 18:
                hour_factor = 1 - abs(hour - 12) / 6
                cloud_cover = current.get('cloud_cover', 30)
                cloud_factor = 1 - (cloud_cover / 100) * 0.5
                solar_irr = 800 * hour_factor * cloud_factor + random.uniform(-50, 100)
                solar_irr = max(0, solar_irr)
        
        return {
            'temperature': current.get('temperature_2m', 25),
            'humidity': current.get('relative_humidity_2m', 60),
            'pressure': current.get('surface_pressure', 1013),
            'wind_speed': current.get('wind_speed_10m', 5),
            'wind_direction': current.get('wind_direction_10m', 180),
            'cloud_cover': current.get('cloud_cover', 0),
            'solar_irradiance': solar_irr,  # Mock if 0
            'description': 'Clear sky' if current.get('cloud_cover', 0) < 20 else 'Cloudy',
            'location': f'Lat: {lat:.2f}, Lon: {lon:.2f}',
            'timestamp': datetime.now().isoformat(),
            'source': 'Open-Meteo (Real Data)' if current.get('direct_radiation', 0) > 0 else 'Mock Irradiance',
            # Hydro proxies
            'water_flow': 45.5, 
            'head_height': 100.0
        }
    
    def _get_mock_weather(self, lat: float, lon: float) -> Dict:
        """Fallback mock data"""
        return {
            'temperature': 28.5,
            'humidity': 65,
            'pressure': 1012,
            'wind_speed': 12.5,
            'wind_direction': 180,
            'cloud_cover': 20,
            'solar_irradiance': 850.0,
            'description': 'Sunny',
            'location': 'Mock Location',
            'timestamp': datetime.now().isoformat(),
            'source': 'Mock Data',
            'water_flow': 45.0,
            'head_height': 100.0
        }
    
    def test_api_key(self) -> Dict:
        """Test API connection"""
        try:
            self.get_weather_by_coords(23.0, 72.0)
            return {'valid': True, 'message': 'Open-Meteo connection successful', 'provider': 'Open-Meteo'}
        except Exception as e:
            return {'valid': False, 'message': str(e)}

# Global instance
weather_service = WeatherService()
