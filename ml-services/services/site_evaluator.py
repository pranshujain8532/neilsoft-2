"""
Green Hydrogen Site Feasibility Engine
Evaluates locations for Green Hydrogen plant viability using:
- Google Maps Platform (Solar, Places, Elevation APIs)
- OpenWeatherMap API (Wind, Rainfall)
"""

import os
import math
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from supabase import create_client

# Initialize Supabase
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
supabase = None

if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("[OK] Site Evaluator connected to Supabase")
    except Exception as e:
        print(f"[WARN] Failed to connect to Supabase: {e}")


class SiteEvaluator:
    """
    Green Hydrogen Site Feasibility Engine
    Uses Google Maps Platform + OpenWeatherMap for comprehensive site evaluation
    """
    
    # Hellman Power Law exponent for open terrain
    HELLMAN_ALPHA = 0.143
    
    # Reference heights (meters)
    WIND_MEASUREMENT_HEIGHT = 10  # Standard weather station height
    TURBINE_HUB_HEIGHT = 80       # Typical wind turbine hub height
    
    # Scoring thresholds
    SOLAR_THRESHOLDS = {
        'excellent': 2000,  # hours/year
        'good': 1500,
        'fair': 1200,
        'poor': 900
    }
    
    WIND_THRESHOLDS = {
        'excellent': 8.0,   # m/s at 80m
        'good': 6.0,
        'fair': 4.5,
        'poor': 3.0
    }
    
    HYDRO_THRESHOLDS = {
        'max_distance_km': 5.0,
        'excellent_head': 30,  # meters
        'good_head': 20,
        'min_head': 10
    }
    
    def __init__(self):
        self.supabase = supabase
        self.google_api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        self.weather_api_key = os.getenv('WEATHER_API_KEY')
        
        if not self.google_api_key:
            print("[WARN] GOOGLE_MAPS_API_KEY not set - some features may not work")
        if not self.weather_api_key:
            print("[WARN] WEATHER_API_KEY not set - wind evaluation will use fallback")
    
    # =========================================================================
    # SOLAR EVALUATION
    # =========================================================================
    
    def evaluate_solar(self, lat: float, lon: float) -> Dict:
        """
        Evaluate solar potential using Google Solar API with OpenWeatherMap fallback
        
        Returns:
            Dict with score, sunshine_hours, ghi, reasoning, and conditions
        """
        result = {
            'score': 0,
            'sunshine_hours_per_year': 0,
            'ghi_kwh_m2_day': 0,
            'max_panel_capacity_kw': 0,
            'data_source': 'fallback',
            'reasoning': '',
            'conditions': [],
            'grade': 'Poor'
        }
        
        try:
            # Primary: Try Google Solar API
            solar_data = self._call_google_solar_api(lat, lon)
            
            if solar_data and solar_data.get('success'):
                result['sunshine_hours_per_year'] = solar_data.get('sunshine_hours', 0)
                result['max_panel_capacity_kw'] = solar_data.get('max_capacity_kw', 0)
                result['data_source'] = 'google_solar_api'
                
                # Add conditions from Google Solar
                result['conditions'].append({
                    'metric': 'Annual Sunshine Hours',
                    'value': f"{solar_data.get('sunshine_hours', 0):,.0f} hrs/year",
                    'status': 'good' if solar_data.get('sunshine_hours', 0) > 1500 else 'fair'
                })
            else:
                # Fallback: OpenWeatherMap for GHI estimation
                weather_data = self._get_weather_solar_estimate(lat, lon)
                result['ghi_kwh_m2_day'] = weather_data.get('ghi', 0)
                result['sunshine_hours_per_year'] = weather_data.get('estimated_sunshine_hours', 0)
                result['data_source'] = 'openweathermap_estimate'
                
                result['conditions'].append({
                    'metric': 'Est. Solar Irradiance (GHI)',
                    'value': f"{weather_data.get('ghi', 0):.1f} kWh/m²/day",
                    'status': 'good' if weather_data.get('ghi', 0) > 5 else 'fair'
                })
            
            # Calculate score based on sunshine hours
            hours = result['sunshine_hours_per_year']
            if hours >= self.SOLAR_THRESHOLDS['excellent']:
                result['score'] = 85 + min(15, (hours - 2000) / 100)
                result['grade'] = 'Excellent'
                result['reasoning'] = f"Outstanding solar potential with {hours:,.0f} sunshine hours/year. Ideal for Solar-PEM electrolysis."
            elif hours >= self.SOLAR_THRESHOLDS['good']:
                result['score'] = 65 + (hours - 1500) / 25
                result['grade'] = 'Good'
                result['reasoning'] = f"Strong solar potential with {hours:,.0f} sunshine hours/year. Well-suited for solar hydrogen production."
            elif hours >= self.SOLAR_THRESHOLDS['fair']:
                result['score'] = 45 + (hours - 1200) / 15
                result['grade'] = 'Fair'
                result['reasoning'] = f"Moderate solar potential with {hours:,.0f} sunshine hours/year. Consider hybrid configuration."
            else:
                result['score'] = max(10, hours / 30)
                result['grade'] = 'Poor'
                result['reasoning'] = f"Limited solar potential with only {hours:,.0f} sunshine hours/year. Not recommended as primary source."
            
            # Add more conditions
            result['conditions'].extend([
                {
                    'metric': 'Solar Grade',
                    'value': result['grade'],
                    'status': 'good' if result['grade'] in ['Excellent', 'Good'] else 'fair' if result['grade'] == 'Fair' else 'poor'
                },
                {
                    'metric': 'Latitude Factor',
                    'value': f"{abs(lat):.1f}°",
                    'status': 'good' if abs(lat) < 35 else 'fair' if abs(lat) < 50 else 'poor'
                }
            ])
            
        except Exception as e:
            print(f"[ERROR] Solar evaluation failed: {e}")
            result['reasoning'] = f"Unable to evaluate solar potential: {str(e)}"
            result['conditions'].append({
                'metric': 'Data Availability',
                'value': 'Limited',
                'status': 'poor'
            })
        
        return result
    
    def _call_google_solar_api(self, lat: float, lon: float) -> Optional[Dict]:
        """Call Google Solar API buildingInsights endpoint"""
        if not self.google_api_key:
            return None
        
        try:
            url = f"https://solar.googleapis.com/v1/buildingInsights:findClosest"
            params = {
                'location.latitude': lat,
                'location.longitude': lon,
                'requiredQuality': 'LOW',
                'key': self.google_api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                solar_potential = data.get('solarPotential', {})
                
                return {
                    'success': True,
                    'sunshine_hours': solar_potential.get('maxSunshineHoursPerYear', 0),
                    'max_capacity_kw': solar_potential.get('solarPanelConfigs', [{}])[0].get('panelsCount', 0) * 0.4,
                    'roof_area_m2': solar_potential.get('wholeRoofStats', {}).get('areaMeters2', 0),
                    'carbon_offset_kg': solar_potential.get('carbonOffsetFactorKgPerMwh', 0)
                }
            else:
                print(f"[WARN] Google Solar API returned {response.status_code}")
                return None
                
        except Exception as e:
            print(f"[WARN] Google Solar API call failed: {e}")
            return None
    
    def _get_weather_solar_estimate(self, lat: float, lon: float) -> Dict:
        """Estimate solar potential from weather data"""
        try:
            if not self.weather_api_key:
                # Use latitude-based estimate
                abs_lat = abs(lat)
                if abs_lat < 25:
                    ghi = 5.5
                elif abs_lat < 35:
                    ghi = 5.0
                elif abs_lat < 45:
                    ghi = 4.0
                else:
                    ghi = 3.0
                
                return {
                    'ghi': ghi,
                    'estimated_sunshine_hours': ghi * 365 * 0.8
                }
            
            # Get current weather for cloud cover estimate
            url = f"https://api.openweathermap.org/data/2.5/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.weather_api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                clouds = data.get('clouds', {}).get('all', 50)
                
                # Estimate GHI based on cloud cover and latitude
                base_ghi = 6.0 - abs(lat - 23.5) * 0.05  # Peak at Tropic of Cancer
                ghi = max(2.0, base_ghi * (1 - clouds/200))
                
                return {
                    'ghi': ghi,
                    'estimated_sunshine_hours': ghi * 365 * 0.85,
                    'cloud_cover': clouds
                }
            
        except Exception as e:
            print(f"[WARN] Weather solar estimate failed: {e}")
        
        # Default fallback based on latitude
        return {
            'ghi': max(3.0, 5.5 - abs(lat - 25) * 0.04),
            'estimated_sunshine_hours': 1500
        }
    
    # =========================================================================
    # WIND EVALUATION (with Hellman Power Law)
    # =========================================================================
    
    def evaluate_wind(self, lat: float, lon: float) -> Dict:
        """
        Evaluate wind potential using OpenWeatherMap with Hellman Power Law extrapolation
        
        The Hellman Power Law: v2 = v1 * (z2/z1)^α
        Where:
            v1 = wind speed at measurement height (typically 10m)
            v2 = wind speed at hub height (80m for turbines)
            z1 = measurement height (10m)
            z2 = hub height (80m)
            α = Hellman exponent (0.143 for open terrain)
        """
        result = {
            'score': 0,
            'wind_speed_10m': 0,
            'wind_speed_80m': 0,
            'gust_speed': 0,
            'turbulence_intensity': 0,
            'direction': '',
            'reasoning': '',
            'conditions': [],
            'grade': 'Poor',
            'hellman_calculation': {}
        }
        
        try:
            # Get wind data from OpenWeatherMap
            wind_data = self._get_wind_data(lat, lon)
            
            v1 = wind_data.get('speed', 0)  # Wind speed at 10m
            gust = wind_data.get('gust', v1 * 1.2)
            direction = wind_data.get('direction', 0)
            
            result['wind_speed_10m'] = v1
            result['gust_speed'] = gust
            result['direction'] = self._degrees_to_cardinal(direction)
            
            # Apply Hellman Power Law: v2 = v1 * (z2/z1)^α
            z1 = self.WIND_MEASUREMENT_HEIGHT
            z2 = self.TURBINE_HUB_HEIGHT
            alpha = self.HELLMAN_ALPHA
            
            v2 = v1 * math.pow(z2 / z1, alpha)
            result['wind_speed_80m'] = round(v2, 2)
            
            # Store Hellman calculation details for frontend display
            result['hellman_calculation'] = {
                'formula': 'v₂ = v₁ × (z₂/z₁)^α',
                'v1': v1,
                'z1': z1,
                'z2': z2,
                'alpha': alpha,
                'height_ratio': round(z2 / z1, 2),
                'power_factor': round(math.pow(z2 / z1, alpha), 3),
                'v2': round(v2, 2)
            }
            
            # Calculate turbulence intensity (TI = σ/v ≈ gust_factor - 1)
            if v1 > 0:
                turbulence = (gust / v1) - 1
                result['turbulence_intensity'] = round(turbulence * 100, 1)
            
            # Add conditions
            result['conditions'].append({
                'metric': 'Wind Speed @ 10m',
                'value': f"{v1:.1f} m/s",
                'status': 'good' if v1 > 4 else 'fair' if v1 > 2.5 else 'poor'
            })
            
            result['conditions'].append({
                'metric': 'Extrapolated @ 80m',
                'value': f"{v2:.1f} m/s",
                'status': 'good' if v2 > 6 else 'fair' if v2 > 4.5 else 'poor'
            })
            
            result['conditions'].append({
                'metric': 'Turbulence Intensity',
                'value': f"{result['turbulence_intensity']:.0f}%",
                'status': 'good' if result['turbulence_intensity'] < 15 else 'fair' if result['turbulence_intensity'] < 25 else 'poor'
            })
            
            # Calculate score based on extrapolated wind speed at 80m
            if v2 >= self.WIND_THRESHOLDS['excellent']:
                result['score'] = 85 + min(15, (v2 - 8) * 5)
                result['grade'] = 'Excellent'
                result['reasoning'] = f"Outstanding wind resource at {v2:.1f} m/s @ 80m hub height. Ideal for large-scale Wind-Alkaline electrolysis."
            elif v2 >= self.WIND_THRESHOLDS['good']:
                result['score'] = 65 + (v2 - 6) * 10
                result['grade'] = 'Good'
                result['reasoning'] = f"Strong wind potential at {v2:.1f} m/s @ 80m. Hellman extrapolation shows viable turbine operation."
            elif v2 >= self.WIND_THRESHOLDS['fair']:
                result['score'] = 45 + (v2 - 4.5) * 13
                result['grade'] = 'Fair'
                result['reasoning'] = f"Moderate wind at {v2:.1f} m/s @ 80m. Consider smaller turbines or hybrid configuration."
            else:
                result['score'] = max(10, v2 * 10)
                result['grade'] = 'Poor'
                result['reasoning'] = f"Insufficient wind resource at {v2:.1f} m/s @ 80m. Wind power not recommended as primary source."
            
            # Add safety warning for high turbulence
            if result['turbulence_intensity'] > 20:
                result['conditions'].append({
                    'metric': '⚠️ Safety Note',
                    'value': 'High turbulence may require shutdown protocols',
                    'status': 'poor'
                })
            
        except Exception as e:
            print(f"[ERROR] Wind evaluation failed: {e}")
            result['reasoning'] = f"Unable to evaluate wind potential: {str(e)}"
        
        return result
    
    def _get_wind_data(self, lat: float, lon: float) -> Dict:
        """Get wind data from OpenWeatherMap"""
        try:
            if not self.weather_api_key:
                # Return demo data for presentation
                return {
                    'speed': 4.5,
                    'gust': 6.2,
                    'direction': 225
                }
            
            url = f"https://api.openweathermap.org/data/2.5/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.weather_api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                wind = data.get('wind', {})
                return {
                    'speed': wind.get('speed', 0),
                    'gust': wind.get('gust', wind.get('speed', 0) * 1.3),
                    'direction': wind.get('deg', 0)
                }
            
        except Exception as e:
            print(f"[WARN] Wind API call failed: {e}")
        
        return {'speed': 3.5, 'gust': 4.5, 'direction': 180}
    
    def _degrees_to_cardinal(self, degrees: float) -> str:
        """Convert wind direction degrees to cardinal direction"""
        directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
        idx = round(degrees / 22.5) % 16
        return directions[idx]
    
    # =========================================================================
    # HYDRO EVALUATION
    # =========================================================================
    
    def evaluate_hydro(self, lat: float, lon: float) -> Dict:
        """
        Evaluate hydro potential using:
        - Google Places API: Find nearby water bodies
        - Google Elevation API: Calculate gravity head
        - OpenWeatherMap: Check rainfall consistency
        """
        result = {
            'score': 0,
            'nearest_water_body': None,
            'distance_km': None,
            'elevation_head_m': 0,
            'rainfall_mm_per_year': 0,
            'reasoning': '',
            'conditions': [],
            'grade': 'Poor',
            'viable': False
        }
        
        try:
            # Step A: Find nearby water bodies using Google Places API
            water_bodies = self._find_water_bodies(lat, lon)
            
            if not water_bodies:
                result['reasoning'] = "No significant water bodies (dams, reservoirs, rivers) found within 5km radius. Hydro power not viable."
                result['conditions'].append({
                    'metric': 'Water Source',
                    'value': 'None within 5km',
                    'status': 'poor'
                })
                return result
            
            # Get nearest water body
            nearest = water_bodies[0]
            result['nearest_water_body'] = nearest.get('name', 'Water Body')
            result['distance_km'] = nearest.get('distance_km', 0)
            
            result['conditions'].append({
                'metric': 'Nearest Water Source',
                'value': f"{nearest.get('name', 'Water Body')} ({result['distance_km']:.1f} km)",
                'status': 'good' if result['distance_km'] < 3 else 'fair'
            })
            
            # Step B: Calculate elevation head
            water_lat = nearest.get('lat', lat)
            water_lon = nearest.get('lon', lon)
            
            site_elevation = self._get_elevation(lat, lon)
            water_elevation = self._get_elevation(water_lat, water_lon)
            
            head = water_elevation - site_elevation
            result['elevation_head_m'] = abs(head)  # We need positive head
            
            result['conditions'].append({
                'metric': 'Elevation Head',
                'value': f"{abs(head):.1f} m",
                'status': 'good' if abs(head) > 20 else 'fair' if abs(head) > 10 else 'poor'
            })
            
            # Step C: Check rainfall
            rainfall = self._get_annual_rainfall(lat, lon)
            result['rainfall_mm_per_year'] = rainfall
            
            result['conditions'].append({
                'metric': 'Annual Rainfall',
                'value': f"{rainfall:.0f} mm/year",
                'status': 'good' if rainfall > 1000 else 'fair' if rainfall > 500 else 'poor'
            })
            
            # Calculate viability and score
            if result['distance_km'] <= 5 and abs(head) >= 10:
                result['viable'] = True
                
                # Score based on head and distance
                head_score = min(50, abs(head) * 1.5)
                distance_score = max(0, 30 - result['distance_km'] * 6)
                rainfall_score = min(20, rainfall / 50)
                
                result['score'] = head_score + distance_score + rainfall_score
                
                if result['score'] >= 80:
                    result['grade'] = 'Excellent'
                    result['reasoning'] = f"Excellent hydro potential with {abs(head):.0f}m head from {nearest.get('name', 'water source')}. Strong rainfall ensures consistent flow."
                elif result['score'] >= 60:
                    result['grade'] = 'Good'
                    result['reasoning'] = f"Good hydro conditions with {abs(head):.0f}m elevation head. Distance of {result['distance_km']:.1f}km is manageable."
                elif result['score'] >= 40:
                    result['grade'] = 'Fair'
                    result['reasoning'] = f"Marginal hydro viability with {abs(head):.0f}m head. May require significant infrastructure investment."
                else:
                    result['grade'] = 'Poor'
                    result['viable'] = False
                    result['reasoning'] = f"Limited hydro potential. Head ({abs(head):.0f}m) or distance ({result['distance_km']:.1f}km) not optimal."
            else:
                result['reasoning'] = f"Hydro not viable: "
                if result['distance_km'] > 5:
                    result['reasoning'] += f"Water source too far ({result['distance_km']:.1f}km > 5km max). "
                if abs(head) < 10:
                    result['reasoning'] += f"Insufficient elevation head ({abs(head):.0f}m < 10m minimum)."
            
        except Exception as e:
            print(f"[ERROR] Hydro evaluation failed: {e}")
            result['reasoning'] = f"Unable to evaluate hydro potential: {str(e)}"
        
        return result
    
    def _find_water_bodies(self, lat: float, lon: float, radius_m: int = 5000) -> List[Dict]:
        """Find nearby dams, reservoirs, and rivers using Google Places API"""
        water_bodies = []
        
        try:
            if not self.google_api_key:
                # Return demo data for areas known for hydro
                if lat > 20 and lat < 25 and lon > 72 and lon < 76:
                    return [{
                        'name': 'Sardar Sarovar Dam',
                        'type': 'dam',
                        'distance_km': 2.5,
                        'lat': lat + 0.02,
                        'lon': lon + 0.01
                    }]
                return []
            
            # Search for water-related places
            keywords = ['dam', 'reservoir', 'river', 'lake']
            
            for keyword in keywords:
                url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                params = {
                    'location': f"{lat},{lon}",
                    'radius': radius_m,
                    'keyword': keyword,
                    'key': self.google_api_key
                }
                
                response = requests.get(url, params=params, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    for place in data.get('results', []):
                        place_lat = place.get('geometry', {}).get('location', {}).get('lat', lat)
                        place_lon = place.get('geometry', {}).get('location', {}).get('lng', lon)
                        
                        distance = self._haversine_distance(lat, lon, place_lat, place_lon)
                        
                        water_bodies.append({
                            'name': place.get('name', keyword.title()),
                            'type': keyword,
                            'distance_km': distance,
                            'lat': place_lat,
                            'lon': place_lon
                        })
            
            # Sort by distance
            water_bodies.sort(key=lambda x: x['distance_km'])
            
        except Exception as e:
            print(f"[WARN] Water body search failed: {e}")
        
        return water_bodies[:5]  # Return top 5 nearest
    
    def _get_elevation(self, lat: float, lon: float) -> float:
        """Get elevation using Google Elevation API"""
        try:
            if not self.google_api_key:
                # Rough estimate based on location
                return 200 + lat * 2
            
            url = f"https://maps.googleapis.com/maps/api/elevation/json"
            params = {
                'locations': f"{lat},{lon}",
                'key': self.google_api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                if results:
                    return results[0].get('elevation', 0)
            
        except Exception as e:
            print(f"[WARN] Elevation API failed: {e}")
        
        return 100  # Default fallback
    
    def _get_annual_rainfall(self, lat: float, lon: float) -> float:
        """Estimate annual rainfall from weather data"""
        try:
            # India average rainfall varies by region
            # Simplified estimation based on latitude/longitude
            if lon > 70 and lon < 90:  # India region
                if lat > 25:  # Northern India
                    return 800 + (lon - 70) * 20
                else:  # Southern India
                    return 1200 + (lon - 70) * 15
            
            return 1000  # Global average fallback
            
        except Exception as e:
            print(f"[WARN] Rainfall estimation failed: {e}")
            return 800
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in km"""
        R = 6371  # Earth's radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    # =========================================================================
    # BIOMASS & MSW EVALUATION (Module A)
    # =========================================================================
    
    def evaluate_biomass_msw(self, lat: float, lon: float) -> Dict:
        """
        Evaluate Biomass and MSW (Municipal Solid Waste) potential
        
        Logic:
        - MSW Path: If Urban_Density > High AND Traffic_Index > High
          → Calculate MSW Score (local waste collection feasibility)
        - Biomass Path: If Urban_Density > High AND Traffic_Index < Medium
          → Calculate Biomass Score (transport from neighboring states)
        
        Returns:
            Dict with score, source_type (MSW/BIOMASS), and reasoning
        """
        result = {
            'score': 0,
            'source_type': 'NONE',
            'urban_density': 0,
            'traffic_index': 0,
            'reasoning': '',
            'conditions': [],
            'grade': 'Poor'
        }
        
        try:
            # Get urban density
            urban_density = self._get_urban_density(lat, lon)
            traffic_index = self._get_traffic_density(lat, lon)
            
            result['urban_density'] = urban_density
            result['traffic_index'] = traffic_index
            
            result['conditions'].append({
                'metric': 'Urban Density',
                'value': f"{urban_density:.0f}%",
                'status': 'good' if urban_density > 60 else 'fair' if urban_density > 30 else 'poor'
            })
            
            result['conditions'].append({
                'metric': 'Traffic Index',
                'value': f"{traffic_index:.0f}%",
                'status': 'good' if traffic_index < 50 else 'fair' if traffic_index < 70 else 'poor'
            })
            
            # Decision logic
            if urban_density > 70 and traffic_index > 60:
                # MSW Path - High urban density + congested traffic favors local waste
                msw_score = self._calculate_msw_score(lat, lon, urban_density)
                result['score'] = msw_score
                result['source_type'] = 'MSW'
                result['reasoning'] = f'High urban density ({urban_density:.0f}%) with congested traffic ({traffic_index:.0f}%) favors Municipal Solid Waste collection.'
                
                result['conditions'].append({
                    'metric': 'Source Selected',
                    'value': 'MSW (Municipal Solid Waste)',
                    'status': 'good' if msw_score > 60 else 'fair'
                })
                
            elif urban_density > 50 and traffic_index < 40:
                # Biomass Path - Moderate density + low traffic favors transport
                biomass_score = self._calculate_biomass_score(lat, lon)
                result['score'] = biomass_score
                result['source_type'] = 'BIOMASS'
                result['reasoning'] = f'Moderate density ({urban_density:.0f}%) with good logistics ({traffic_index:.0f}% traffic) favors Biomass transport from agricultural regions.'
                
                result['conditions'].append({
                    'metric': 'Source Selected',
                    'value': 'Biomass (Agricultural)',
                    'status': 'good' if biomass_score > 60 else 'fair'
                })
                
            else:
                # Hybrid evaluation - compare both
                msw_score = self._calculate_msw_score(lat, lon, urban_density)
                biomass_score = self._calculate_biomass_score(lat, lon)
                
                if msw_score >= biomass_score:
                    result['score'] = msw_score
                    result['source_type'] = 'MSW'
                    result['reasoning'] = f'MSW selected over Biomass (Score: {msw_score:.0f} vs {biomass_score:.0f}) based on location characteristics.'
                else:
                    result['score'] = biomass_score
                    result['source_type'] = 'BIOMASS'
                    result['reasoning'] = f'Biomass selected over MSW (Score: {biomass_score:.0f} vs {msw_score:.0f}) based on agricultural proximity.'
            
            # Set grade
            if result['score'] >= 70:
                result['grade'] = 'Excellent'
            elif result['score'] >= 50:
                result['grade'] = 'Good'
            elif result['score'] >= 30:
                result['grade'] = 'Fair'
            else:
                result['grade'] = 'Poor'
                
        except Exception as e:
            print(f"[ERROR] Biomass/MSW evaluation failed: {e}")
            result['reasoning'] = f"Unable to evaluate Biomass/MSW potential: {str(e)}"
        
        return result
    
    def _get_urban_density(self, lat: float, lon: float) -> float:
        """Calculate urban density score (0-100) based on location"""
        try:
            # Use Google Places to estimate urban density
            if self.google_api_key:
                url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
                params = {
                    'location': f"{lat},{lon}",
                    'radius': 5000,
                    'key': self.google_api_key
                }
                response = requests.get(url, params=params, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    place_count = len(data.get('results', []))
                    # More places = higher density (max ~20 results)
                    return min(100, place_count * 5)
            
            # Fallback: Major Indian city proximity estimation
            major_cities = [
                (19.076, 72.877, 'Mumbai', 95),
                (28.613, 77.209, 'Delhi', 90),
                (12.972, 77.594, 'Bangalore', 85),
                (22.572, 88.363, 'Kolkata', 80),
                (13.082, 80.270, 'Chennai', 80),
                (17.385, 78.486, 'Hyderabad', 75),
                (23.022, 72.571, 'Ahmedabad', 70),
                (18.520, 73.856, 'Pune', 65),
            ]
            
            min_distance = float('inf')
            density = 30  # Rural default
            
            for city_lat, city_lon, name, city_density in major_cities:
                dist = self._haversine_distance(lat, lon, city_lat, city_lon)
                if dist < min_distance:
                    min_distance = dist
                    if dist < 50:
                        density = city_density * (1 - dist/100)
                    elif dist < 100:
                        density = city_density * 0.5
            
            return max(20, min(100, density))
            
        except Exception as e:
            print(f"[WARN] Urban density estimation failed: {e}")
            return 50  # Default moderate
    
    def _get_traffic_density(self, lat: float, lon: float) -> float:
        """Get traffic congestion index (0-100, higher = more congested)"""
        try:
            # Note: Would use TomTom or Google Routes API in production
            # Using correlation with urban density for demo
            urban = self._get_urban_density(lat, lon)
            
            # Traffic typically correlates with urban density but with variation
            import random
            variation = random.uniform(-10, 10)
            traffic = urban * 0.8 + variation
            
            return max(0, min(100, traffic))
            
        except Exception as e:
            print(f"[WARN] Traffic density estimation failed: {e}")
            return 50
    
    def _calculate_msw_score(self, lat: float, lon: float, urban_density: float = None) -> float:
        """Calculate MSW collection feasibility score"""
        if urban_density is None:
            urban_density = self._get_urban_density(lat, lon)
        
        # MSW is more viable in high-density urban areas
        base_score = urban_density * 0.6
        
        # Bonus for metropolitan areas
        if urban_density > 80:
            base_score += 20
        elif urban_density > 60:
            base_score += 10
        
        return min(100, base_score)
    
    def _calculate_biomass_score(self, lat: float, lon: float) -> float:
        """Calculate biomass transport viability score"""
        # Agricultural regions in India
        agricultural_zones = [
            (29.0, 76.0, 'Punjab', 90),
            (26.8, 80.9, 'UP', 85),
            (22.5, 88.3, 'West Bengal', 80),
            (20.0, 77.0, 'Maharashtra', 75),
            (15.0, 76.0, 'Karnataka', 70),
        ]
        
        max_score = 30  # Default low
        
        for zone_lat, zone_lon, name, zone_score in agricultural_zones:
            dist = self._haversine_distance(lat, lon, zone_lat, zone_lon)
            if dist < 200:  # Within 200km
                proximity_score = zone_score * (1 - dist/400)
                max_score = max(max_score, proximity_score)
        
        return min(100, max_score)
    
    # =========================================================================
    # GRID WHEELING / VIRTUAL PPA EVALUATION (Module B)
    # =========================================================================
    
    def evaluate_grid_wheeling(self, lat: float, lon: float) -> Dict:
        """
        Evaluate economic viability of grid wheeling / Virtual PPA
        
        Logic:
        Score = 100 × (1 - (Transmission_Loss + Wheeling_Charges))
        
        Returns:
            Dict with score, wheeling charges, transmission loss, and reasoning
        """
        result = {
            'score': 0,
            'wheeling_charge_per_kwh': 0,
            'transmission_loss_percent': 0,
            'grid_stability_index': 0,
            'state': 'Unknown',
            'reasoning': '',
            'conditions': [],
            'grade': 'Poor'
        }
        
        try:
            # Get state from coordinates
            state = self._get_state_from_coords(lat, lon)
            result['state'] = state
            
            # State-wise wheeling charges (₹/kWh) - based on Indian regulations
            wheeling_charges = {
                'Gujarat': 1.10,
                'Rajasthan': 0.95,
                'Maharashtra': 1.25,
                'Tamil Nadu': 1.35,
                'Karnataka': 1.20,
                'Andhra Pradesh': 1.15,
                'Telangana': 1.18,
                'Madhya Pradesh': 1.05,
                'Punjab': 1.30,
                'Haryana': 1.28,
                'default': 1.30
            }
            
            charge = wheeling_charges.get(state, wheeling_charges['default'])
            result['wheeling_charge_per_kwh'] = charge
            
            # Transmission loss estimate (typically 3-8% in India)
            transmission_loss = self._get_transmission_loss(lat, lon)
            result['transmission_loss_percent'] = transmission_loss
            
            # Grid stability index (0-100)
            grid_stability = self._get_grid_stability(lat, lon, state)
            result['grid_stability_index'] = grid_stability
            
            result['conditions'].append({
                'metric': 'State',
                'value': state,
                'status': 'good'
            })
            
            result['conditions'].append({
                'metric': 'Wheeling Charge',
                'value': f"₹{charge:.2f}/kWh",
                'status': 'good' if charge < 1.15 else 'fair' if charge < 1.30 else 'poor'
            })
            
            result['conditions'].append({
                'metric': 'Transmission Loss',
                'value': f"{transmission_loss:.1f}%",
                'status': 'good' if transmission_loss < 5 else 'fair' if transmission_loss < 7 else 'poor'
            })
            
            result['conditions'].append({
                'metric': 'Grid Stability',
                'value': f"{grid_stability:.0f}%",
                'status': 'good' if grid_stability > 80 else 'fair' if grid_stability > 60 else 'poor'
            })
            
            # Calculate score: 100 × (1 - (normalized_charge + loss)) × stability
            cost_factor = (charge / 2.0) + (transmission_loss / 100)  # Normalize
            score = 100 * (1 - cost_factor) * (grid_stability / 100)
            result['score'] = max(0, min(100, score))
            
            # Determine grade
            if result['score'] >= 70:
                result['grade'] = 'Excellent'
                result['reasoning'] = f'Grid wheeling highly viable in {state} with low charges (₹{charge}/kWh) and stable grid ({grid_stability}%).'
            elif result['score'] >= 50:
                result['grade'] = 'Good'
                result['reasoning'] = f'Grid wheeling viable in {state}. Consider Virtual PPA for remote renewable generation.'
            elif result['score'] >= 30:
                result['grade'] = 'Fair'
                result['reasoning'] = f'Marginal grid wheeling viability. High charges (₹{charge}/kWh) or transmission losses ({transmission_loss}%) reduce economics.'
            else:
                result['grade'] = 'Poor'
                result['reasoning'] = f'Grid wheeling not recommended. Combined losses and charges exceed viable threshold.'
                
        except Exception as e:
            print(f"[ERROR] Grid wheeling evaluation failed: {e}")
            result['reasoning'] = f"Unable to evaluate grid wheeling: {str(e)}"
        
        return result
    
    def _get_state_from_coords(self, lat: float, lon: float) -> str:
        """Get Indian state from coordinates using reverse geocoding"""
        try:
            if self.google_api_key:
                url = "https://maps.googleapis.com/maps/api/geocode/json"
                params = {
                    'latlng': f"{lat},{lon}",
                    'key': self.google_api_key
                }
                response = requests.get(url, params=params, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    for result in data.get('results', []):
                        for component in result.get('address_components', []):
                            if 'administrative_area_level_1' in component.get('types', []):
                                return component.get('long_name', 'Unknown')
            
            # Fallback: Approximate based on coordinates
            if lon < 74 and lat > 22:
                return 'Gujarat'
            elif lon > 74 and lon < 78 and lat > 25:
                return 'Rajasthan'
            elif lon > 72 and lon < 80 and lat > 16 and lat < 22:
                return 'Maharashtra'
            elif lon > 76 and lon < 80 and lat > 12 and lat < 16:
                return 'Karnataka'
            elif lon > 78 and lon < 85 and lat > 12 and lat < 16:
                return 'Tamil Nadu'
            else:
                return 'Unknown State'
                
        except Exception as e:
            print(f"[WARN] State detection failed: {e}")
            return 'Unknown'
    
    def _get_transmission_loss(self, lat: float, lon: float) -> float:
        """Estimate transmission loss based on grid infrastructure"""
        # Simplified model: higher losses in remote areas
        urban_density = self._get_urban_density(lat, lon)
        
        # Urban areas have better grid infrastructure
        if urban_density > 70:
            return 3.5 + (100 - urban_density) * 0.02
        else:
            return 5.0 + (70 - urban_density) * 0.05
    
    def _get_grid_stability(self, lat: float, lon: float, state: str = None) -> float:
        """Get grid stability index (0-100)"""
        # State-wise grid stability (higher = more stable)
        stability_map = {
            'Gujarat': 92,
            'Maharashtra': 88,
            'Karnataka': 85,
            'Tamil Nadu': 87,
            'Rajasthan': 80,
            'Madhya Pradesh': 75,
            'Punjab': 82,
            'Haryana': 80,
            'Andhra Pradesh': 78,
            'Telangana': 82,
            'default': 75
        }
        
        if state:
            return stability_map.get(state, stability_map['default'])
        return 75
    
    # =========================================================================
    # GEOTHERMAL EVALUATION (Module C)
    # =========================================================================
    
    def evaluate_geothermal(self, lat: float, lon: float) -> Dict:
        """
        Evaluate geothermal potential for baseload power
        
        Critical for 24/7 Electrolyzer efficiency
        
        Logic:
        - If Heat_Flow > 80 mW/m² → High potential
        - If Heat_Flow 50-80 → Moderate  
        - If Heat_Flow < 50 → Low potential
        
        Returns:
            Dict with score, heat_flow, baseload capability, and reasoning
        """
        result = {
            'score': 0,
            'heat_flow_mw_m2': 0,
            'rating': 'LOW',
            'nearest_zone': None,
            'distance_to_zone_km': None,
            'baseload_capable': False,
            'reasoning': '',
            'conditions': [],
            'grade': 'Poor'
        }
        
        try:
            # India geothermal zones with heat flow data (mW/m²)
            geothermal_zones = [
                {'name': 'Puga Valley, Ladakh', 'lat': 33.23, 'lon': 78.31, 'heat_flow': 150},
                {'name': 'Chumathang, Ladakh', 'lat': 33.38, 'lon': 78.38, 'heat_flow': 130},
                {'name': 'Tattapani, Chhattisgarh', 'lat': 23.43, 'lon': 81.31, 'heat_flow': 100},
                {'name': 'Manikaran, HP', 'lat': 32.03, 'lon': 77.35, 'heat_flow': 90},
                {'name': 'Surajkund, Jharkhand', 'lat': 24.12, 'lon': 85.64, 'heat_flow': 85},
                {'name': 'Rajgir, Bihar', 'lat': 25.02, 'lon': 85.42, 'heat_flow': 75},
                {'name': 'Unai, Gujarat', 'lat': 20.83, 'lon': 73.12, 'heat_flow': 70},
                {'name': 'Vajreshwari, Maharashtra', 'lat': 19.42, 'lon': 73.08, 'heat_flow': 65},
            ]
            
            # Find nearest geothermal zone
            min_distance = float('inf')
            heat_flow = 40  # Default background heat flow
            nearest_zone = None
            
            for zone in geothermal_zones:
                dist = self._haversine_distance(lat, lon, zone['lat'], zone['lon'])
                if dist < min_distance:
                    min_distance = dist
                    result['distance_to_zone_km'] = dist
                    
                    # Interpolate heat flow based on distance
                    if dist < 50:  # Within 50km
                        heat_flow = zone['heat_flow'] * (1 - dist/100)
                        nearest_zone = zone['name']
                    elif dist < 100:  # Within 100km
                        heat_flow = zone['heat_flow'] * 0.6 * (1 - dist/200)
                        nearest_zone = zone['name']
                    elif dist < 200:  # Within 200km
                        heat_flow = max(40, zone['heat_flow'] * 0.3)
                        nearest_zone = zone['name']
            
            result['heat_flow_mw_m2'] = round(heat_flow, 1)
            result['nearest_zone'] = nearest_zone
            
            # Add conditions
            result['conditions'].append({
                'metric': 'Heat Flow',
                'value': f"{heat_flow:.1f} mW/m²",
                'status': 'good' if heat_flow > 80 else 'fair' if heat_flow > 50 else 'poor'
            })
            
            if nearest_zone:
                result['conditions'].append({
                    'metric': 'Nearest Geothermal Zone',
                    'value': f"{nearest_zone} ({min_distance:.0f} km)",
                    'status': 'good' if min_distance < 50 else 'fair' if min_distance < 100 else 'poor'
                })
            
            # Score calculation based on heat flow
            if heat_flow >= 80:
                result['score'] = 75 + (heat_flow - 80) * 0.5
                result['rating'] = 'HIGH'
                result['baseload_capable'] = True
                result['grade'] = 'Excellent'
                result['reasoning'] = f'Excellent geothermal potential with {heat_flow:.0f} mW/m² heat flow near {nearest_zone}. Ideal for 24/7 baseload electrolysis.'
            elif heat_flow >= 50:
                result['score'] = 35 + (heat_flow - 50) * 1.33
                result['rating'] = 'MODERATE'
                result['baseload_capable'] = heat_flow >= 70
                result['grade'] = 'Good' if result['score'] >= 50 else 'Fair'
                result['reasoning'] = f'Moderate geothermal potential at {heat_flow:.0f} mW/m². May supplement primary renewable sources.'
            else:
                result['score'] = heat_flow * 0.7
                result['rating'] = 'LOW'
                result['baseload_capable'] = False
                result['grade'] = 'Poor'
                result['reasoning'] = f'Limited geothermal potential ({heat_flow:.0f} mW/m²). Not recommended as primary energy source.'
            
            result['conditions'].append({
                'metric': 'Baseload Capable',
                'value': 'Yes' if result['baseload_capable'] else 'No',
                'status': 'good' if result['baseload_capable'] else 'poor'
            })
            
            result['conditions'].append({
                'metric': 'Geothermal Rating',
                'value': result['rating'],
                'status': 'good' if result['rating'] == 'HIGH' else 'fair' if result['rating'] == 'MODERATE' else 'poor'
            })
            
        except Exception as e:
            print(f"[ERROR] Geothermal evaluation failed: {e}")
            result['reasoning'] = f"Unable to evaluate geothermal potential: {str(e)}"
        
        return result
    
    # =========================================================================
    # MAIN EVALUATION & 6-VECTOR DECISION MATRIX
    # =========================================================================
    
    def evaluate_site(self, lat: float, lon: float, name: str = None) -> Dict:
        """
        Complete site evaluation with 6-VECTOR FEASIBILITY MATRIX
        
        Evaluates:
        1. Solar (PV potential)
        2. Wind (Hellman extrapolation)
        3. Hydro (gravity head + water bodies)
        4. Biomass/MSW (urban density + traffic routing)
        5. Grid Wheeling (virtual PPA economics)
        6. Geothermal (heat flow potential)
        
        Returns:
            Dict with 6-vector matrix, fallback logic, and recommendation
        """
        print(f"[EVAL] 6-VECTOR Evaluation for site at ({lat}, {lon})...")
        
        # ======= PARALLEL EVALUATION OF ALL 6 SOURCES =======
        solar = self.evaluate_solar(lat, lon)
        wind = self.evaluate_wind(lat, lon)
        hydro = self.evaluate_hydro(lat, lon)
        biomass_msw = self.evaluate_biomass_msw(lat, lon)
        grid_wheeling = self.evaluate_grid_wheeling(lat, lon)
        geothermal = self.evaluate_geothermal(lat, lon)
        
        # ======= 6-VECTOR FEASIBILITY MATRIX =======
        feasibility_matrix = {
            'solar': {'score': solar['score'], 'grade': solar['grade'], 'data': solar},
            'wind': {'score': wind['score'], 'grade': wind['grade'], 'data': wind},
            'hydro': {'score': hydro['score'], 'grade': hydro['grade'], 'data': hydro},
            'biomass_msw': {'score': biomass_msw['score'], 'grade': biomass_msw['grade'], 'data': biomass_msw},
            'grid_wheeling': {'score': grid_wheeling['score'], 'grade': grid_wheeling['grade'], 'data': grid_wheeling},
            'geothermal': {'score': geothermal['score'], 'grade': geothermal['grade'], 'data': geothermal}
        }
        
        # All scores dict
        scores = {k: v['score'] for k, v in feasibility_matrix.items()}
        
        # Primary source scores
        primary_scores = [solar['score'], wind['score'], hydro['score']]
        
        # ======= FALLBACK LOGIC =======
        fallback_triggered = False
        fallback_reason = None
        
        # RED ZONE CHECK: All primary sources < 40%
        if all(s < 40 for s in primary_scores):
            fallback_triggered = True
            fallback_reason = 'PRIMARY_SOURCES_LOW'
            
            # Recommend Biomass/MSW as fallback
            recommendation_type = 'biomass_msw_fallback'
            recommendation = f'{biomass_msw["source_type"]} Energy Plant'
            electrolysis_type = 'Biogas-to-H2 with Reforming' if biomass_msw['source_type'] == 'BIOMASS' else 'MSW Gasification'
            primary_reason = f'⚠️ RED ZONE: Solar ({solar["score"]:.0f}%), Wind ({wind["score"]:.0f}%), Hydro ({hydro["score"]:.0f}%) all below 40%. Fallback to {biomass_msw["source_type"]} recommended.'
            
            print(f"[WARN] RED ZONE DETECTED - Triggering Biomass/MSW fallback")
            
        else:
            # Normal recommendation logic
            best_source = max(scores, key=scores.get)
            best_score = scores[best_source]
            
            # Check for viable hybrid combinations
            viable_sources = [s for s, score in scores.items() if score >= 60]
            primary_viable = [s for s in ['solar', 'wind', 'hydro'] if scores[s] >= 60]
            
            if len(primary_viable) >= 2:
                # Hybrid Plant recommendation
                recommendation_type = 'hybrid'
                recommendation = 'Hybrid Multi-Source Plant'
                
                if 'solar' in primary_viable and 'wind' in primary_viable:
                    electrolysis_type = 'Solar-Wind Hybrid with PEM/Alkaline'
                elif 'solar' in primary_viable and 'hydro' in primary_viable:
                    electrolysis_type = 'Solar-Hydro Hybrid with Baseload PEM'
                elif 'wind' in primary_viable and 'hydro' in primary_viable:
                    electrolysis_type = 'Wind-Hydro Hybrid with Alkaline'
                else:
                    electrolysis_type = 'Multi-Source Hybrid'
                
                primary_reason = f"Multiple viable sources detected: {', '.join([s.title() for s in primary_viable])}"
                
            elif best_source == 'solar' and best_score >= 50:
                recommendation_type = 'solar'
                recommendation = 'Solar-PEM Electrolysis Plant'
                electrolysis_type = 'PEM (Proton Exchange Membrane)'
                primary_reason = f"Solar is optimal with {solar['sunshine_hours_per_year']:,.0f} hrs/year sunshine"
                
            elif best_source == 'wind' and best_score >= 50:
                recommendation_type = 'wind'
                recommendation = 'Wind-Alkaline Electrolysis Plant'
                electrolysis_type = 'Alkaline (best for variable wind)'
                primary_reason = f"Wind is optimal with {wind['wind_speed_80m']:.1f} m/s at hub height"
                
            elif best_source == 'hydro' and hydro.get('viable', False):
                recommendation_type = 'hydro'
                recommendation = 'Hydro-Alkaline Electrolysis Plant'
                electrolysis_type = 'Alkaline (steady operation)'
                primary_reason = f"Hydro provides baseload with {hydro['elevation_head_m']:.0f}m head"
                
            elif best_source == 'geothermal' and geothermal.get('baseload_capable', False):
                recommendation_type = 'geothermal'
                recommendation = 'Geothermal Baseload Plant'
                electrolysis_type = 'PEM (24/7 baseload operation)'
                primary_reason = f"Geothermal offers 24/7 baseload at {geothermal['heat_flow_mw_m2']} mW/m²"
                
            elif best_source == 'grid_wheeling' and best_score >= 50:
                recommendation_type = 'grid_wheeling'
                recommendation = 'Virtual PPA / Grid Wheeling'
                electrolysis_type = 'Remote renewable + Grid transmission'
                primary_reason = f"Grid wheeling viable in {grid_wheeling['state']} with {grid_wheeling['wheeling_charge_per_kwh']:.2f}₹/kWh"
                
            elif biomass_msw['score'] >= 50:
                recommendation_type = 'biomass_msw'
                recommendation = f'{biomass_msw["source_type"]} Energy Plant'
                electrolysis_type = 'Biogas Reforming' if biomass_msw['source_type'] == 'BIOMASS' else 'MSW Gasification'
                primary_reason = f"{biomass_msw['source_type']} viable with {biomass_msw['score']:.0f}% score"
                
            else:
                recommendation_type = 'not_viable'
                recommendation = 'Site Not Recommended'
                electrolysis_type = 'N/A'
                primary_reason = "No energy source achieves viable threshold"
        
        # ======= BUILD DETAILED REASONS FOR ALL 6 SOURCES =======
        detailed_reasons = [
            {
                'source': 'Solar',
                'score': solar['score'],
                'grade': solar['grade'],
                'summary': solar['reasoning'],
                'icon': '☀️',
                'color': 'yellow'
            },
            {
                'source': 'Wind',
                'score': wind['score'],
                'grade': wind['grade'],
                'summary': wind['reasoning'],
                'icon': '💨',
                'color': 'blue',
                'physics': wind.get('hellman_calculation', {})
            },
            {
                'source': 'Hydro',
                'score': hydro['score'],
                'grade': hydro['grade'],
                'summary': hydro['reasoning'],
                'icon': '💧',
                'color': 'cyan'
            },
            {
                'source': f'Biomass/{biomass_msw["source_type"]}',
                'score': biomass_msw['score'],
                'grade': biomass_msw['grade'],
                'summary': biomass_msw['reasoning'],
                'icon': '🌿',
                'color': 'green',
                'is_fallback': fallback_triggered and recommendation_type == 'biomass_msw_fallback'
            },
            {
                'source': 'Grid Wheeling',
                'score': grid_wheeling['score'],
                'grade': grid_wheeling['grade'],
                'summary': grid_wheeling['reasoning'],
                'icon': '⚡',
                'color': 'purple'
            },
            {
                'source': 'Geothermal',
                'score': geothermal['score'],
                'grade': geothermal['grade'],
                'summary': geothermal['reasoning'],
                'icon': '🌋',
                'color': 'orange',
                'baseload_capable': geothermal.get('baseload_capable', False)
            }
        ]
        
        # Calculate overall viability score (weighted average across all 6)
        weights = {
            'solar': 0.25,
            'wind': 0.20,
            'hydro': 0.15,
            'biomass_msw': 0.15,
            'grid_wheeling': 0.10,
            'geothermal': 0.15
        }
        overall_score = sum(scores[k] * v for k, v in weights.items())
        
        # Zone classification
        if overall_score >= 70:
            zone = 'GREEN'
            zone_message = 'Excellent site viability'
        elif overall_score >= 50:
            zone = 'YELLOW'
            zone_message = 'Moderate site viability - consider optimization'
        elif overall_score >= 30:
            zone = 'ORANGE'
            zone_message = 'Limited viability - fallback sources recommended'
        else:
            zone = 'RED'
            zone_message = 'Poor viability - site not recommended'
        
        # ======= BUILD RESULT =======
        result = {
            'success': True,
            'location': {
                'latitude': lat,
                'longitude': lon,
                'name': name
            },
            # Full evaluations
            'evaluations': {
                'solar': solar,
                'wind': wind,
                'hydro': hydro,
                'biomass_msw': biomass_msw,
                'grid_wheeling': grid_wheeling,
                'geothermal': geothermal
            },
            # 6-Vector Matrix
            'feasibility_matrix': feasibility_matrix,
            'scores': scores,
            'overall_score': round(overall_score, 1),
            # Zone classification
            'zone': {
                'level': zone,
                'message': zone_message,
                'primary_scores_below_40': all(s < 40 for s in primary_scores)
            },
            # Recommendation
            'recommendation': {
                'type': recommendation_type,
                'title': recommendation,
                'electrolysis': electrolysis_type,
                'primary_reason': primary_reason,
                'detailed_reasons': detailed_reasons,
                'viable_sources': [s for s, score in scores.items() if score >= 50],
                # Fallback info
                'fallback_triggered': fallback_triggered,
                'fallback_reason': fallback_reason
            },
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"[EVAL] Complete. Zone: {zone} | Recommendation: {recommendation} (Score: {overall_score:.1f})")
        return result
    
    def add_plant_to_database(self, evaluation: Dict, plant_name: str, capacity_kw: float) -> Dict:
        """Add evaluated plant to the database"""
        if not self.supabase:
            return {'success': False, 'error': 'Database not connected'}
        
        try:
            location = evaluation.get('location', {})
            scores = evaluation.get('scores', {})
            rec = evaluation.get('recommendation', {})
            
            # Store evaluation data in location JSONB field (existing column)
            location_data = {
                'latitude': location.get('latitude'),
                'longitude': location.get('longitude'),
                'city': plant_name.split()[0] if plant_name else 'Unknown',
                'state': 'India',
                'evaluation': {
                    'solar_score': scores.get('solar', 0),
                    'wind_score': scores.get('wind', 0),
                    'hydro_score': scores.get('hydro', 0),
                    'overall_score': evaluation.get('overall_score', 0),
                    'recommended_type': rec.get('type', 'hybrid'),
                    'electrolysis': rec.get('electrolysis', 'PEM')
                }
            }
            
            # Convert capacity from kW to MW for the table
            capacity_mw = capacity_kw / 1000
            
            # Only use existing columns in the plants table
            plant_data = {
                'name': plant_name,
                'location': location_data,  # JSONB field
                'latitude': location.get('latitude'),
                'longitude': location.get('longitude'),
                'capacity': capacity_kw,
                'capacity_mw': capacity_mw,
                'status': 'active',
                'efficiency': 85 + (evaluation.get('overall_score', 0) / 10),  # Higher score = higher efficiency
                'efficiency_percent': 85 + (evaluation.get('overall_score', 0) / 10),
                'lcoh': max(1.5, 3.0 - (evaluation.get('overall_score', 0) / 50)),  # Higher score = lower LCOH
                'renewable_percentage': min(100, evaluation.get('overall_score', 0) + 10)
            }
            
            response = self.supabase.table('plants').insert(plant_data).execute()
            
            if response.data:
                return {
                    'success': True,
                    'plant_id': response.data[0].get('id'),
                    'message': f"Plant '{plant_name}' added successfully",
                    'evaluation_stored': True
                }
            
            return {'success': False, 'error': 'Insert returned no data'}
            
        except Exception as e:
            print(f"[ERROR] Failed to add plant: {e}")
            return {'success': False, 'error': str(e)}


# Global instance
site_evaluator = SiteEvaluator()
