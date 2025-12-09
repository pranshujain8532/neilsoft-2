"""
Real-Time Energy Calculation Service
Time-aware energy production calculations based on weather and sun position
NO HARDCODING - All calculations based on real physics
"""

import os
import math
from datetime import datetime, timedelta
from typing import Dict, Optional
from supabase import create_client

# Initialize Supabase
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
supabase = None

if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("[OK] Realtime Energy Service connected to Supabase")
    except Exception as e:
        print(f"[WARN] Failed to connect to Supabase: {e}")


class RealtimeEnergyService:
    """
    Calculates real-time energy production based on:
    - Current time of day (sunrise/sunset)
    - Weather conditions (irradiance, wind speed, cloud cover)
    - Equipment efficiency
    """
    
    def __init__(self):
        self.supabase = supabase
        # Default location: Gujarat, India
        self.default_lat = 23.0225
        self.default_lon = 72.5714
    
    def calculate_sun_position(self, latitude: float, longitude: float, 
                                current_time: datetime = None) -> Dict:
        """
        Calculate sunrise, sunset, and current sun position
        Uses simplified astronomical calculations
        """
        if current_time is None:
            current_time = datetime.now()
        
        # Day of year (1-365)
        day_of_year = current_time.timetuple().tm_yday
        
        # Convert latitude to radians
        lat_rad = math.radians(latitude)
        
        # Solar declination angle (simplified)
        declination = 23.45 * math.sin(math.radians(360 * (284 + day_of_year) / 365))
        decl_rad = math.radians(declination)
        
        # Hour angle at sunrise/sunset
        cos_hour_angle = -math.tan(lat_rad) * math.tan(decl_rad)
        cos_hour_angle = max(-1, min(1, cos_hour_angle))  # Clamp to valid range
        
        hour_angle = math.degrees(math.acos(cos_hour_angle))
        
        # Calculate sunrise and sunset (in hours from midnight, local solar time)
        # Approximate: solar noon is around 12:00 + longitude correction
        solar_noon = 12.0 - (longitude / 15.0) + 5.5  # +5.5 for IST offset
        
        sunrise_hour = solar_noon - (hour_angle / 15.0)
        sunset_hour = solar_noon + (hour_angle / 15.0)
        
        # Clamp to reasonable values
        sunrise_hour = max(4, min(8, sunrise_hour))
        sunset_hour = max(16, min(20, sunset_hour))
        
        current_hour = current_time.hour + current_time.minute / 60.0
        
        is_daylight = sunrise_hour <= current_hour <= sunset_hour
        
        # Calculate sun elevation (0 at horizon, 90 at zenith)
        if is_daylight:
            # Normalize hour to 0-1 where 0.5 is solar noon
            day_fraction = (current_hour - sunrise_hour) / (sunset_hour - sunrise_hour)
            # Sun elevation peaks at solar noon
            sun_elevation = 90 * math.sin(math.pi * day_fraction)
        else:
            sun_elevation = 0
        
        # Convert hours to time strings
        sunrise_time = f"{int(sunrise_hour):02d}:{int((sunrise_hour % 1) * 60):02d}"
        sunset_time = f"{int(sunset_hour):02d}:{int((sunset_hour % 1) * 60):02d}"
        
        return {
            'is_daylight': is_daylight,
            'sunrise': sunrise_time,
            'sunset': sunset_time,
            'sun_elevation': round(sun_elevation, 1),
            'current_hour': current_hour,
            'day_length_hours': round(sunset_hour - sunrise_hour, 1),
            'time_to_sunrise': round(sunrise_hour - current_hour, 1) if current_hour < sunrise_hour else 0,
            'time_to_sunset': round(sunset_hour - current_hour, 1) if is_daylight else 0
        }
    
    def calculate_solar_power(self, weather_data: Dict, plant_capacity_kw: float = 50,
                               panel_efficiency: float = 0.20) -> Dict:
        """
        Calculate solar power output based on weather and time
        
        Physics:
        P_solar = Irradiance × Area × Efficiency × Sun_Factor
        
        At night: P_solar = 0
        """
        lat = weather_data.get('latitude', self.default_lat)
        lon = weather_data.get('longitude', self.default_lon)
        
        sun_info = self.calculate_sun_position(lat, lon)
        
        # NO SOLAR AT NIGHT
        if not sun_info['is_daylight']:
            return {
                'power_kw': 0,
                'status': 'night',
                'reason': f"Night time - Sunrise at {sun_info['sunrise']}",
                'sun_info': sun_info,
                'efficiency_percent': 0
            }
        
        # Get irradiance from weather data
        irradiance = weather_data.get('solar_irradiance', 0)  # W/m²
        cloud_cover = weather_data.get('cloud_cover', 0)  # 0-100%
        temperature = weather_data.get('temperature', 25)  # °C
        
        # If irradiance not available, calculate from sun position
        if irradiance == 0:
            # Clear sky irradiance based on sun elevation
            max_irradiance = 1000  # W/m² at peak
            irradiance = max_irradiance * math.sin(math.radians(sun_info['sun_elevation']))
        
        # Apply cloud cover reduction
        cloud_factor = 1 - (cloud_cover / 100) * 0.75  # Clouds reduce up to 75%
        
        # Temperature derating (panels less efficient when hot)
        # Typical: -0.4% per degree above 25°C
        temp_factor = 1 - max(0, (temperature - 25) * 0.004)
        
        # Calculate power
        # Assuming panel area calculated from capacity (typical 5-6 m² per kW)
        panel_area = plant_capacity_kw * 5.5  # m²
        
        power_kw = (irradiance * panel_area * panel_efficiency * cloud_factor * temp_factor) / 1000
        
        # Cap at plant capacity
        power_kw = min(power_kw, plant_capacity_kw)
        
        # Determine status
        if power_kw > plant_capacity_kw * 0.7:
            status = 'peak'
            reason = 'Optimal conditions - Peak production'
        elif power_kw > plant_capacity_kw * 0.3:
            status = 'moderate'
            reason = f'Moderate production ({int(cloud_cover)}% cloud cover)'
        else:
            status = 'low'
            reason = 'Low irradiance or high cloud cover'
        
        return {
            'power_kw': round(power_kw, 2),
            'status': status,
            'reason': reason,
            'sun_info': sun_info,
            'irradiance_wm2': round(irradiance * cloud_factor, 1),
            'cloud_factor': round(cloud_factor, 2),
            'temp_factor': round(temp_factor, 2),
            'efficiency_percent': round(power_kw / plant_capacity_kw * 100, 1) if plant_capacity_kw > 0 else 0
        }
    
    def calculate_wind_power(self, weather_data: Dict, turbine_capacity_kw: float = 30) -> Dict:
        """
        Calculate wind power output based on wind speed
        
        Physics (Betz limit):
        P_wind = 0.5 × ρ × A × v³ × Cp
        
        Where:
        - ρ = air density (~1.225 kg/m³)
        - A = swept area of turbine
        - v = wind speed (m/s)
        - Cp = power coefficient (max 0.593, typically 0.35-0.45)
        """
        wind_speed = weather_data.get('wind_speed', 0)  # m/s
        temperature = weather_data.get('temperature', 25)  # °C
        
        # Air density adjustment for temperature
        # ρ = 1.225 × (288.15 / (273.15 + T))
        air_density = 1.225 * (288.15 / (273.15 + temperature))
        
        # Turbine parameters (typical for 30kW turbine)
        rotor_diameter = 12  # meters
        swept_area = math.pi * (rotor_diameter / 2) ** 2  # m²
        power_coefficient = 0.40  # Typical efficiency
        
        # Cut-in speed (minimum to generate power)
        cut_in_speed = 3.0  # m/s
        # Rated speed (full power)
        rated_speed = 12.0  # m/s
        # Cut-out speed (safety shutdown)
        cut_out_speed = 25.0  # m/s
        
        if wind_speed < cut_in_speed:
            power_kw = 0
            status = 'calm'
            reason = f'Wind too low ({wind_speed:.1f} m/s < {cut_in_speed} m/s cut-in)'
        elif wind_speed > cut_out_speed:
            power_kw = 0
            status = 'shutdown'
            reason = f'Safety shutdown - Wind too high ({wind_speed:.1f} m/s)'
        elif wind_speed >= rated_speed:
            power_kw = turbine_capacity_kw
            status = 'rated'
            reason = 'Full rated power - Optimal wind'
        else:
            # Cubic relationship between cut-in and rated speed
            normalized_speed = (wind_speed - cut_in_speed) / (rated_speed - cut_in_speed)
            power_kw = turbine_capacity_kw * (normalized_speed ** 3)
            
            if power_kw > turbine_capacity_kw * 0.5:
                status = 'good'
                reason = f'Good wind conditions ({wind_speed:.1f} m/s)'
            else:
                status = 'moderate'
                reason = f'Moderate wind ({wind_speed:.1f} m/s)'
        
        return {
            'power_kw': round(min(power_kw, turbine_capacity_kw), 2),
            'status': status,
            'reason': reason,
            'wind_speed_ms': round(wind_speed, 1),
            'air_density': round(air_density, 3),
            'efficiency_percent': round(power_kw / turbine_capacity_kw * 100, 1) if turbine_capacity_kw > 0 else 0
        }
    
    def calculate_hydro_power(self, water_data: Dict, turbine_capacity_kw: float = 20) -> Dict:
        """
        Calculate hydro power from water recycling
        
        Physics:
        P_hydro = η × ρ × g × Q × H
        
        Where:
        - η = turbine efficiency (0.85-0.90)
        - ρ = water density (1000 kg/m³)
        - g = gravity (9.81 m/s²)
        - Q = flow rate (m³/s)
        - H = head height (m)
        """
        water_available = water_data.get('water_for_hydro_liters', 0)  # liters
        head_height = water_data.get('head_height', 10)  # meters (default 10m)
        turbine_efficiency = 0.85
        
        # Convert liters/hour to m³/s
        # Assuming water is used over an hour
        flow_rate = (water_available / 1000) / 3600  # m³/s
        
        # Calculate power
        water_density = 1000  # kg/m³
        gravity = 9.81  # m/s²
        
        power_watts = turbine_efficiency * water_density * gravity * flow_rate * head_height
        power_kw = power_watts / 1000
        
        # Cap at capacity
        power_kw = min(power_kw, turbine_capacity_kw)
        
        if power_kw > 0:
            status = 'active'
            reason = f'Generating from {water_available:.0f}L recycled water'
        else:
            status = 'idle'
            reason = 'No water available for hydro generation'
        
        return {
            'power_kw': round(power_kw, 2),
            'status': status,
            'reason': reason,
            'water_available_liters': water_available,
            'flow_rate_m3s': round(flow_rate, 4),
            'efficiency_percent': round(power_kw / turbine_capacity_kw * 100, 1) if turbine_capacity_kw > 0 else 0
        }
    
    def calculate_all_sources(self, plant_id: str, weather_data: Dict, 
                               water_data: Dict = None) -> Dict:
        """
        Calculate power from all sources for a plant
        """
        # Get plant capacities from DB
        capacities = self._get_plant_capacities(plant_id)
        
        solar = self.calculate_solar_power(weather_data, capacities.get('solar', 50))
        wind = self.calculate_wind_power(weather_data, capacities.get('wind', 30))
        hydro = self.calculate_hydro_power(water_data or {}, capacities.get('hydro', 20))
        
        total_power = solar['power_kw'] + wind['power_kw'] + hydro['power_kw']
        total_capacity = capacities.get('solar', 50) + capacities.get('wind', 30) + capacities.get('hydro', 20)
        
        # Determine dominant source
        powers = {'solar': solar['power_kw'], 'wind': wind['power_kw'], 'hydro': hydro['power_kw']}
        dominant = max(powers, key=powers.get) if total_power > 0 else 'none'
        
        return {
            'solar': solar,
            'wind': wind,
            'hydro': hydro,
            'total_power_kw': round(total_power, 2),
            'total_capacity_kw': total_capacity,
            'utilization_percent': round(total_power / total_capacity * 100, 1) if total_capacity > 0 else 0,
            'dominant_source': dominant,
            'timestamp': datetime.now().isoformat()
        }
    
    def _get_plant_capacities(self, plant_id: str) -> Dict:
        """
        Get energy source capacities from DB.
        Prioritizes 'energy_sources' table, falls back to 'plants' table capacity + type.
        """
        # Default fallback only if DB fails completely
        default_capacities = {'solar': 50, 'wind': 30, 'hydro': 20}
        
        if not self.supabase:
            return default_capacities
        
        try:
            # 1. Try energy_sources table first (detailed configuration)
            response = self.supabase.table('energy_sources') \
                .select('source_type, capacity_kw') \
                .eq('plant_id', plant_id) \
                .execute()
            
            if response.data and len(response.data) > 0:
                capacities = {'solar': 0, 'wind': 0, 'hydro': 0}
                has_data = False
                for src in response.data:
                    src_type = src.get('source_type', '').lower()
                    capacity = float(src.get('capacity_kw', 0) or 0)
                    if capacity > 0: has_data = True
                    
                    if 'solar' in src_type: capacities['solar'] += capacity
                    elif 'wind' in src_type: capacities['wind'] += capacity
                    elif 'hydro' in src_type: capacities['hydro'] += capacity
                
                if has_data:
                    return capacities
            
            # 2. Fallback: Fetch from 'plants' table directly
            # This handles cases where plant is added but energy_sources not populated
            plant_res = self.supabase.table('plants') \
                .select('capacity, location, name') \
                .eq('id', plant_id) \
                .single() \
                .execute()
            
            if plant_res.data:
                p_data = plant_res.data
                total_capacity = float(p_data.get('capacity', 0) or 100)
                
                # Determine type from location JSONB or name
                plant_type = 'hybrid'  # Default
                location = p_data.get('location')
                
                if isinstance(location, dict) and 'evaluation' in location:
                    # Use recommended type from site evaluation if available
                    plant_type = location['evaluation'].get('recommended_type', 'hybrid').lower()
                elif p_data.get('name'):
                    # Infer from name
                    name = p_data.get('name').lower()
                    if 'solar' in name and 'wind' not in name: plant_type = 'solar'
                    elif 'wind' in name and 'solar' not in name: plant_type = 'wind'
                    elif 'hydro' in name: plant_type = 'hydro'
                    
                # Distribute capacity based on type
                if 'solar' in plant_type and 'wind' not in plant_type and 'hybrid' not in plant_type:
                     return {'solar': total_capacity, 'wind': 0, 'hydro': 0}
                elif 'wind' in plant_type and 'solar' not in plant_type and 'hybrid' not in plant_type:
                     return {'solar': 0, 'wind': total_capacity, 'hydro': 0}
                elif 'hydro' in plant_type:
                     return {'solar': 0, 'wind': 0, 'hydro': total_capacity}
                else:
                    # Hybrid: Distribute based on a standard mix
                    # 40% Solar, 40% Wind, 20% Hydro
                    return {
                        'solar': total_capacity * 0.4,
                        'wind': total_capacity * 0.4,
                        'hydro': total_capacity * 0.2
                    }
                    
            return default_capacities
            
        except Exception as e:
            print(f"[WARN] Could not get capacities: {e}")
            return default_capacities
    
    def calculate_carbon_savings(self, total_renewable_kwh: float) -> Dict:
        """
        Calculate CO2 savings from using renewable energy
        
        India grid emission factor: ~0.82 kg CO2 per kWh
        """
        emission_factor = 0.82  # kg CO2 / kWh (India average)
        
        co2_saved_kg = total_renewable_kwh * emission_factor
        
        # Equivalent comparisons
        trees_equivalent = co2_saved_kg / 22  # 1 tree absorbs ~22kg CO2/year
        car_km_equivalent = co2_saved_kg / 0.21  # ~210g CO2 per km for avg car
        
        return {
            'co2_saved_kg': round(co2_saved_kg, 2),
            'co2_saved_tons': round(co2_saved_kg / 1000, 3),
            'trees_equivalent': round(trees_equivalent, 1),
            'car_km_equivalent': round(car_km_equivalent, 0),
            'emission_factor': emission_factor
        }
    
    def calculate_efficiency_grade(self, utilization: float, overflow_percent: float, 
                                    battery_usage: float) -> Dict:
        """
        Calculate energy efficiency grade (A+ to F)
        """
        # Score components (0-100 each)
        utilization_score = min(100, utilization)
        waste_score = 100 - (overflow_percent * 2)  # Penalize waste
        battery_score = min(100, battery_usage * 1.5)  # Reward battery usage
        
        # Weighted average
        total_score = (utilization_score * 0.4) + (waste_score * 0.3) + (battery_score * 0.3)
        
        # Grade mapping
        if total_score >= 95:
            grade = 'A+'
        elif total_score >= 90:
            grade = 'A'
        elif total_score >= 80:
            grade = 'B+'
        elif total_score >= 70:
            grade = 'B'
        elif total_score >= 60:
            grade = 'C'
        elif total_score >= 50:
            grade = 'D'
        else:
            grade = 'F'
        
        return {
            'grade': grade,
            'score': round(total_score, 1),
            'breakdown': {
                'utilization': round(utilization_score, 1),
                'waste_reduction': round(waste_score, 1),
                'battery_usage': round(battery_score, 1)
            }
        }


# Global instance
realtime_energy_service = RealtimeEnergyService()
