"""
Weather API Integration Service
Fetches real-time weather data and forecasts for energy forecasting
"""

import requests
from typing import Dict, Optional, List
import os
from datetime import datetime, timedelta
import math

class WeatherService:
    def __init__(self, api_key: Optional[str] = None):
        # OpenWeatherMap API
        self.api_key = api_key or os.getenv('WEATHER_API_KEY', '')
        self.base_url = 'https://api.openweathermap.org/data/2.5'
        
    def get_weather_by_coords(self, lat: float, lon: float) -> Dict:
        """Get current weather data by coordinates"""
        
        if not self._is_api_configured():
            return self._get_mock_weather(lat, lon)
        
        try:
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            response = requests.get(f'{self.base_url}/weather', params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            return self._parse_weather_data(data, lat, lon)
            
        except Exception as e:
            print(f"Weather API error: {e}, using mock data")
            return self._get_mock_weather(lat, lon)

    def get_forecast_by_coords(self, lat: float, lon: float) -> List[Dict]:
        """Get 24-hour weather forecast"""
        
        if not self._is_api_configured():
            return self._get_mock_forecast(lat, lon)
            
        try:
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric',
                'cnt': 8  # 8 * 3 hours = 24 hours
            }
            
            response = requests.get(f'{self.base_url}/forecast', params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            forecasts = []
            for item in data.get('list', []):
                forecasts.append(self._parse_weather_data(item, lat, lon))
                
            return forecasts
            
        except Exception as e:
            print(f"Forecast API error: {e}, using mock forecast")
            return self._get_mock_forecast(lat, lon)
    
    def _is_api_configured(self) -> bool:
        return bool(self.api_key and self.api_key != 'your_openweathermap_api_key')

    def _calculate_solar_position(self, dt: datetime, lat: float, lon: float) -> float:
        """
        Calculate solar elevation angle in degrees.
        Returns > 0 for day, <= 0 for night.
        """
        # Day of year
        doy = dt.timetuple().tm_yday
        
        # Fractional year (radians)
        gamma = 2 * math.pi * (doy - 1 + (dt.hour - 12) / 24) / 365
        
        # Equation of time (minutes)
        eqtime = 229.18 * (0.000075 + 0.001868 * math.cos(gamma) - 0.032077 * math.sin(gamma) \
                 - 0.014615 * math.cos(2 * gamma) - 0.040849 * math.sin(2 * gamma))
        
        # Solar declination angle (radians)
        decl = 0.006918 - 0.399912 * math.cos(gamma) + 0.070257 * math.sin(gamma) \
               - 0.006758 * math.cos(2 * gamma) + 0.000907 * math.sin(2 * gamma) \
               - 0.002697 * math.cos(3 * gamma) + 0.00148 * math.sin(3 * gamma)
        
        # Time offset (minutes)
        time_offset = eqtime + 4 * lon - 60 * 0 # Assuming UTC for simplicity in this calculation
        
        # True solar time (minutes)
        tst = dt.hour * 60 + dt.minute + dt.second / 60 + time_offset
        
        # Solar hour angle (degrees)
        ha = (tst / 4) - 180
        
        # Convert to radians
        lat_rad = math.radians(lat)
        ha_rad = math.radians(ha)
        
        # Solar zenith angle (radians)
        zenith = math.acos(math.sin(lat_rad) * math.sin(decl) + \
                          math.cos(lat_rad) * math.cos(decl) * math.cos(ha_rad))
        
        # Solar elevation angle (degrees)
        elevation = 90 - math.degrees(zenith)
        
        return elevation

    def _parse_weather_data(self, data: Dict, lat: float = 0, lon: float = 0) -> Dict:
        """Parse OpenWeatherMap API response with accurate solar irradiance"""
        
        main = data.get('main', {})
        wind = data.get('wind', {})
        clouds = data.get('clouds', {})
        sys = data.get('sys', {})
        
        # Get timestamp
        timestamp = data.get('dt')
        if timestamp:
            dt = datetime.fromtimestamp(timestamp)
        else:
            dt = datetime.now()

        # Calculate accurate solar irradiance
        cloud_cover = clouds.get('all', 0)  # 0-100%
        
        # Calculate sun elevation
        elevation = self._calculate_solar_position(dt, lat, lon)
        
        if elevation > 0:
            # Day time: Calculate irradiance based on elevation and cloud cover
            # Max irradiance at zenith ~1000 W/m²
            # Simple model: I = I_max * sin(elevation) * (1 - 0.75 * (cloud_cover/100)^3)
            max_irradiance = 1000 * math.sin(math.radians(elevation))
            cloud_factor = 1 - 0.75 * ((cloud_cover / 100) ** 3)
            solar_irradiance = max(0, max_irradiance * cloud_factor)
        else:
            # Night time
            solar_irradiance = 0
        
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
            'timestamp': dt.isoformat(),
            'source': 'OpenWeatherMap',
            'is_day': elevation > 0
        }
    
    def _get_mock_weather(self, lat: float, lon: float) -> Dict:
        """Generate realistic mock weather data based on time"""
        import random
        
        dt = datetime.now()
        elevation = self._calculate_solar_position(dt, lat, lon)
        
        # Temperature varies by time
        base_temp = 25
        if elevation > 0:
            temp_variation = 5 * math.sin(math.radians(elevation))
        else:
            temp_variation = -3
            
        temperature = base_temp + temp_variation + random.uniform(-1, 1)
        
        # Solar irradiance
        if elevation > 0:
            max_irradiance = 1000 * math.sin(math.radians(elevation))
            solar_irradiance = max_irradiance * random.uniform(0.8, 1.0)
        else:
            solar_irradiance = 0
        
        return {
            'temperature': round(temperature, 1),
            'humidity': random.randint(40, 80),
            'pressure': random.randint(1010, 1020),
            'wind_speed': round(abs(random.gauss(5, 2)), 1),
            'wind_direction': random.randint(0, 360),
            'cloud_cover': random.randint(0, 30),
            'solar_irradiance': round(solar_irradiance, 2),
            'description': 'clear' if solar_irradiance > 500 else 'partly cloudy',
            'location': f'Location ({lat:.2f}, {lon:.2f})',
            'timestamp': dt.isoformat(),
            'source': 'Mock Data (Time-Aware)',
            'is_day': elevation > 0
        }

    def _get_mock_forecast(self, lat: float, lon: float) -> List[Dict]:
        """Generate 24h mock forecast"""
        forecasts = []
        start_time = datetime.now()
        
        for i in range(8): # 24 hours in 3-hour steps
            dt = start_time + timedelta(hours=i*3)
            
            # Simulate weather for this time
            elevation = self._calculate_solar_position(dt, lat, lon)
            
            if elevation > 0:
                solar_irradiance = 1000 * math.sin(math.radians(elevation))
            else:
                solar_irradiance = 0
                
            forecasts.append({
                'timestamp': dt.isoformat(),
                'temperature': 25 + (5 if elevation > 0 else -3),
                'solar_irradiance': round(max(0, solar_irradiance), 2),
                'wind_speed': 5.0,
                'description': 'forecast'
            })
            
        return forecasts

    def test_api_key(self) -> Dict:
        """Test if the weather API key is valid"""
        if not self._is_api_configured():
            return {
                'valid': False,
                'message': 'No API key configured. Using mock weather data.',
                'mock_mode': True
            }
        
        try:
            params = {'q': 'London,UK', 'appid': self.api_key, 'units': 'metric'}
            response = requests.get(f'{self.base_url}/weather', params=params, timeout=5)
            
            if response.status_code == 200:
                return {'valid': True, 'message': 'Weather API key is valid!', 'mock_mode': False}
            else:
                return {'valid': False, 'message': f'API error: {response.status_code}', 'mock_mode': True}
                
        except Exception as e:
            return {'valid': False, 'message': f'Connection error: {str(e)}', 'mock_mode': True}

# Global instance
weather_service = WeatherService()
