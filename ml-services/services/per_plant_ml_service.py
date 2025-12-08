"""
Per-Plant ML Service
Runs ML models separately for each plant with location-specific weather
Dynamic Plant Loading from Supabase

OPTIMIZED FOR SPEED:
- Cached market prices (5-minute cache)
- Cached weather data (2-minute cache)
- Single Supabase connection reuse

REALISTIC PHYSICS-BASED CALCULATIONS:
- 24-hour solar profile with realistic capacity factor (30-45%)
- Load-dependent electrolyzer efficiency (55-75%)
- Complete operating costs (water, maintenance, depreciation)
"""

import os
import asyncio
import time
from typing import Dict, List, Optional
from datetime import datetime
from services.weather_service import WeatherService
import numpy as np
import joblib
import requests
from dotenv import load_dotenv


class PerPlantMLService:
    # Class-level cache for shared data (reduces API calls)
    _price_cache = {'oxygen': None, 'hydrogen': None, 'timestamp': 0}
    _weather_cache = {}  # {(lat,lng): {'data': ..., 'timestamp': ...}}
    CACHE_DURATION = 300  # 5 minutes for prices
    WEATHER_CACHE_DURATION = 120  # 2 minutes for weather
    
    def __init__(self):
        """Initialize per-plant ML service"""
        self.weather_service = WeatherService()
        self.model = None
        self.model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models', 'trained_model.pkl')
        
        # Load model if exists
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                print("[OK] PerPlantMLService: Loaded ML model")
        except Exception as e:
            print(f"[WARN] PerPlantMLService: Could not load model: {e}")
            
        # Initialize Supabase client ONCE
        self.supabase = self._init_supabase()
        
        # 24-hour solar profile (realistic - peaks at noon)
        self.SOLAR_HOURLY_PROFILE = [
            0.00, 0.00, 0.00, 0.00, 0.00, 0.05,
            0.15, 0.35, 0.55, 0.75, 0.90, 0.98,
            1.00, 0.98, 0.90, 0.75, 0.55, 0.35,
            0.15, 0.05, 0.00, 0.00, 0.00, 0.00
        ]
        
        # Electrolyzer efficiency parameters
        self.EFF_MIN = 0.55
        self.EFF_MAX = 0.75

    def _init_supabase(self):
        """Initialize Supabase client ONCE for reuse"""
        try:
            from supabase import create_client
            
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(current_dir))
            env_path = os.path.join(project_root, '.env')
            load_dotenv(env_path)
            
            ml_env_path = os.path.join(os.path.dirname(current_dir), '.env')
            load_dotenv(ml_env_path)
            
            url = os.environ.get('SUPABASE_URL') or os.environ.get('VITE_SUPABASE_URL')
            key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY') or os.environ.get('VITE_SUPABASE_ANON_KEY')
            
            if not url or not key:
                print("[WARN] Missing Supabase credentials")
                return None
            
            client = create_client(url, key)
            print("[OK] PerPlantMLService: Connected to Supabase")
            return client
        except Exception as e:
            print(f"[WARN] Could not initialize Supabase: {e}")
            return None

    def _map_db_row_to_config(self, row: Dict) -> Dict:
        """Maps a flat database row to nested config - FAST, no API calls"""
        total_capacity = float(row.get('capacity_mw') or row.get('capacity') or 100)
        
        renewable_pct = float(row.get('renewable_percentage') or 100) / 100.0
        solar_capacity = total_capacity * 0.50 * renewable_pct
        wind_capacity = total_capacity * 0.30 * renewable_pct
        hydro_capacity = total_capacity * 0.20 * renewable_pct
        
        efficiency = row.get('efficiency')
        if efficiency is None:
            efficiency_pct = row.get('efficiency_percent')
            efficiency = float(efficiency_pct) / 100.0 if efficiency_pct else 0.75
        else:
            efficiency = float(efficiency)
        
        if efficiency > 1.0:
            efficiency = efficiency / 100.0
        
        location_raw = row.get('location', 'India')
        if isinstance(location_raw, dict):
            city = location_raw.get('city', '')
            state = location_raw.get('state', 'India')
            location_str = f"{city}, {state}" if city else state
        elif isinstance(location_raw, str):
            try:
                import json
                loc_obj = json.loads(location_raw)
                city = loc_obj.get('city', '')
                state = loc_obj.get('state', 'India')
                location_str = f"{city}, {state}" if city else state
            except:
                location_str = location_raw
        else:
            location_str = 'India'
        
        # Operating cost parameters with fast defaults
        water_cost_per_kg = float(row.get('water_cost_per_kg') or 0.05)
        maintenance_percent = float(row.get('maintenance_percent') or 2.5)
        depreciation_years = int(row.get('depreciation_years') or 20)
        capex_usd = float(row.get('capex_usd') or 50000000)
        electrolyzer_capacity_mw = float(row.get('electrolyzer_capacity_mw') or total_capacity * 0.5)
        
        return {
            'id': row.get('id'),
            'name': row.get('name', 'Unknown Plant'),
            'location': location_str,
            'coordinates': {
                'lat': float(row.get('latitude') or 20.5937),
                'lng': float(row.get('longitude') or 78.9629)
            },
            'capacity': {
                'solar': round(solar_capacity, 2),
                'wind': round(wind_capacity, 2),
                'hydro': round(hydro_capacity, 2),
                'total': round(total_capacity, 2)
            },
            'base_lcoh': float(row.get('lcoh') or 2.0),
            'efficiency': efficiency,
            'operating_costs': {
                'water_cost_per_kg': water_cost_per_kg,
                'maintenance_percent': maintenance_percent,
                'depreciation_years': depreciation_years,
                'capex_usd': capex_usd,
                'electrolyzer_capacity_mw': electrolyzer_capacity_mw
            }
        }

    def _fetch_plant_from_db(self, plant_id: str) -> Optional[Dict]:
        """Fetch plant config - uses shared Supabase connection"""
        if not self.supabase:
            return None
            
        try:
            response = self.supabase.table('plants').select('*').eq('id', plant_id).execute()
            if response.data and len(response.data) > 0:
                return self._map_db_row_to_config(response.data[0])
            return None
        except Exception as e:
            print(f"[WARN] Error fetching plant {plant_id}: {e}")
            return None

    def _fetch_all_plants_from_db(self) -> List[Dict]:
        """Fetch all plants in ONE query"""
        if not self.supabase:
            return []
            
        try:
            response = self.supabase.table('plants').select('*').execute()
            if response.data:
                plants = [self._map_db_row_to_config(row) for row in response.data]
                print(f"[OK] Fetched {len(plants)} plants from database")
                return plants
            return []
        except Exception as e:
            print(f"[WARN] Error fetching plants: {e}")
            return []

    def get_cached_oxygen_price(self) -> float:
        """Get oxygen price with 5-minute cache - FAST after first call"""
        now = time.time()
        if (PerPlantMLService._price_cache['oxygen'] is not None and 
            now - PerPlantMLService._price_cache['timestamp'] < self.CACHE_DURATION):
            return PerPlantMLService._price_cache['oxygen']
        
        # Fetch fresh price
        price = self._fetch_oxygen_price_from_api()
        PerPlantMLService._price_cache['oxygen'] = price
        PerPlantMLService._price_cache['timestamp'] = now
        return price

    def get_cached_hydrogen_price(self) -> float:
        """Get hydrogen price with 5-minute cache - FAST after first call"""
        now = time.time()
        if (PerPlantMLService._price_cache['hydrogen'] is not None and 
            now - PerPlantMLService._price_cache['timestamp'] < self.CACHE_DURATION):
            return PerPlantMLService._price_cache['hydrogen']
        
        price = self._fetch_hydrogen_price_from_api()
        PerPlantMLService._price_cache['hydrogen'] = price
        PerPlantMLService._price_cache['timestamp'] = now
        return price

    def _fetch_oxygen_price_from_api(self) -> float:
        """Fetch oxygen price from FRED API - called only when cache expires"""
        try:
            api_key = os.getenv('FRED_API_KEY')
            if api_key:
                url = f"https://api.stlouisfed.org/fred/series/observations?series_id=PCU325120325120A&api_key={api_key}&file_type=json&sort_order=desc&limit=1"
                response = requests.get(url, timeout=3)  # 3 second timeout
                if response.status_code == 200:
                    data = response.json()
                    observations = data.get('observations', [])
                    if observations:
                        latest_index = float(observations[0]['value'])
                        return (latest_index / 350.0) * 0.20
            return 0.15  # Default
        except:
            return 0.15

    def _fetch_hydrogen_price_from_api(self) -> float:
        """Fetch hydrogen price from FRED API - called only when cache expires"""
        try:
            api_key = os.getenv('FRED_API_KEY')
            if api_key:
                url = f"https://api.stlouisfed.org/fred/series/observations?series_id=WPU061302&api_key={api_key}&file_type=json&sort_order=desc&limit=1"
                response = requests.get(url, timeout=3)
                if response.status_code == 200:
                    data = response.json()
                    observations = data.get('observations', [])
                    if observations:
                        latest_index = float(observations[0]['value'])
                        return round((latest_index / 250.0) * 4.50, 2)
            return 4.50
        except:
            return 4.50

    def get_cached_weather(self, lat: float, lng: float) -> Dict:
        """Get weather with 2-minute cache per location"""
        cache_key = (round(lat, 2), round(lng, 2))  # Round to reduce cache misses
        now = time.time()
        
        if cache_key in PerPlantMLService._weather_cache:
            cached = PerPlantMLService._weather_cache[cache_key]
            if now - cached['timestamp'] < self.WEATHER_CACHE_DURATION:
                return cached['data']
        
        # Fetch fresh weather
        weather = self.weather_service.get_weather_by_coords(lat, lng)
        PerPlantMLService._weather_cache[cache_key] = {
            'data': weather,
            'timestamp': now
        }
        return weather

    def calculate_electrolyzer_efficiency(self, load_percent: float) -> float:
        """Calculate efficiency based on load - FAST computation"""
        if load_percent <= 0:
            return 0.0
        
        normalized_load = min(1.0, load_percent / 100.0)
        efficiency = self.EFF_MIN + (self.EFF_MAX - self.EFF_MIN) * normalized_load
        
        if load_percent < 30:
            penalty = (30 - load_percent) / 30 * 0.10
            efficiency = max(self.EFF_MIN - 0.05, efficiency - penalty)
        
        return round(efficiency, 3)

    def calculate_energy_production(self, plant_config: Dict, weather: Dict) -> Dict:
        """Calculate REALISTIC energy production - FAST computation"""
        capacity = plant_config['capacity']
        
        # Solar: time-weighted capacity factor
        solar_irradiance = weather.get('solar_irradiance', 850)
        current_hour = datetime.now().hour
        solar_factor = self.SOLAR_HOURLY_PROFILE[current_hour]
        weather_factor = min(1.0, solar_irradiance / 1000.0)
        solar_output = capacity['solar'] * solar_factor * weather_factor * 0.18
        
        # Average solar CF for the day
        avg_solar_factor = sum(self.SOLAR_HOURLY_PROFILE) / 24
        solar_cf = avg_solar_factor * weather_factor * 100
        
        # Wind: power curve
        wind_speed = weather.get('wind_speed', 8)
        cut_in, rated_speed = 3.0, 12.0
        if wind_speed < cut_in:
            power_factor = 0.0
        elif wind_speed >= rated_speed:
            power_factor = 1.0
        else:
            power_factor = pow((wind_speed - cut_in) / (rated_speed - cut_in), 3)
        wind_output = capacity['wind'] * power_factor * 0.45
        wind_cf = 28 + (wind_speed / rated_speed) * 12  # 28-40%
        
        # Hydro: stable
        hydro_output = capacity['hydro'] * 0.85
        hydro_cf = 85.0
        
        total_output = solar_output + wind_output + hydro_output
        total_capacity = capacity['total']
        
        # Weighted capacity factor
        weighted_cf = 0
        if total_capacity > 0:
            weighted_cf = (
                (solar_cf * capacity['solar']) +
                (wind_cf * capacity['wind']) +
                (hydro_cf * capacity['hydro'])
            ) / total_capacity
        
        # Daily energy estimate
        daily_solar_mwh = capacity['solar'] * avg_solar_factor * weather_factor * 0.18 * 24
        daily_wind_mwh = capacity['wind'] * (wind_cf / 100) * 24
        daily_hydro_mwh = capacity['hydro'] * 0.85 * 24
        daily_energy_mwh = daily_solar_mwh + daily_wind_mwh + daily_hydro_mwh
        
        return {
            'solar': round(solar_output, 2),
            'wind': round(wind_output, 2),
            'hydro': round(hydro_output, 2),
            'total': round(total_output, 2),
            'capacity_factor': round(weighted_cf, 1),
            'daily_energy_mwh': round(daily_energy_mwh, 2)
        }

    def calculate_operating_costs(self, plant_config: Dict, h2_production_kg: float) -> Dict:
        """Calculate costs - FAST computation, no API calls"""
        ops = plant_config.get('operating_costs', {})
        
        water_cost = h2_production_kg * ops.get('water_cost_per_kg', 0.05)
        capex = ops.get('capex_usd', 50000000)
        daily_maintenance = (capex * ops.get('maintenance_percent', 2.5) / 100) / 365
        daily_depreciation = capex / ops.get('depreciation_years', 20) / 365
        electricity_rate = float(os.getenv('ELECTRICITY_RATE', 0.05))
        electricity_cost = h2_production_kg * 50 * electricity_rate
        labor_cost = 1500 * (ops.get('electrolyzer_capacity_mw', 50) / 50)
        
        total_cost = water_cost + daily_maintenance + daily_depreciation + electricity_cost + labor_cost
        
        return {
            'water_cost': round(water_cost, 2),
            'electricity_cost': round(electricity_cost, 2),
            'maintenance_cost': round(daily_maintenance, 2),
            'depreciation_cost': round(daily_depreciation, 2),
            'labor_cost': round(labor_cost, 2),
            'total_daily_cost': round(total_cost, 2)
        }

    def calculate_h2_production(self, energy_mwh: float, plant_config: Dict) -> Dict:
        """Calculate H2 production with efficiency - FAST computation"""
        ops = plant_config.get('operating_costs', {})
        electrolyzer_capacity_mw = ops.get('electrolyzer_capacity_mw', 50)
        
        max_daily_energy = electrolyzer_capacity_mw * 24
        load_percent = min(100, (energy_mwh / max_daily_energy * 100) if max_daily_energy > 0 else 0)
        
        efficiency = self.calculate_electrolyzer_efficiency(load_percent)
        base_consumption = 50  # kWh/kg at optimal
        actual_consumption = base_consumption / efficiency if efficiency > 0 else base_consumption
        
        available_energy_kwh = energy_mwh * 1000
        h2_production_kg = available_energy_kwh / actual_consumption
        o2_production_kg = h2_production_kg * 8
        
        return {
            'h2_production_kg': round(h2_production_kg, 1),
            'o2_production_kg': round(o2_production_kg, 1),
            'electrolyzer_load_percent': round(load_percent, 1),
            'electrolyzer_efficiency': round(efficiency * 100, 1)
        }
    
    def run_profit_prediction(self, plant_config: Dict, energy_output: Dict, weather: Dict) -> Dict:
        """
        Run profit prediction using correct LCOH-based formula.
        
        CORRECT FORMULA (no double-counting):
        - LCOH already includes: electricity, water, maintenance, depreciation, labor
        - Profit = (H2_selling_price - LCOH) × H2_production_kg + O2_revenue
        """
        try:
            # Use CACHED prices - fast after first call
            oxygen_price = self.get_cached_oxygen_price()
            h2_selling_price = self.get_cached_hydrogen_price()
            
            # Get LCOH from plant config (this is the production cost per kg)
            lcoh = plant_config.get('base_lcoh', 2.0)
            
            daily_energy_mwh = energy_output.get('daily_energy_mwh', energy_output.get('total', 50) * 8)
            
            production_data = self.calculate_h2_production(daily_energy_mwh, plant_config)
            h2_production_kg = production_data['h2_production_kg']
            o2_production_kg = production_data['o2_production_kg']
            electrolyzer_efficiency = production_data['electrolyzer_efficiency']
            
            # CORRECT PROFIT CALCULATION:
            # H2 Gross Margin = (Selling Price - LCOH) × Production
            # LCOH already includes electricity, water, maintenance, depreciation
            h2_gross_margin = (h2_selling_price - lcoh) * h2_production_kg
            
            # O2 byproduct is pure revenue (no additional cost to produce)
            o2_revenue = o2_production_kg * oxygen_price
            
            # Total Profit = H2 Margin + O2 Revenue
            daily_profit = h2_gross_margin + o2_revenue
            monthly_profit = daily_profit * 30
            
            # Also provide detailed breakdown for transparency
            h2_revenue = h2_production_kg * h2_selling_price
            h2_cost = h2_production_kg * lcoh
            
            return {
                'h2_production_kg': round(h2_production_kg, 1),
                'daily_profit': round(daily_profit, 2),
                'monthly_profit': round(monthly_profit, 2),
                'model_type': 'Physics-Based',
                'breakdown': {
                    'h2_revenue': round(h2_revenue, 2),
                    'h2_cost_lcoh': round(h2_cost, 2),
                    'h2_gross_margin': round(h2_gross_margin, 2),
                    'oxygen_produced_kg': round(o2_production_kg, 1),
                    'oxygen_revenue': round(o2_revenue, 2),
                    'total_revenue': round(h2_revenue + o2_revenue, 2)
                },
                'efficiency_data': {
                    'electrolyzer_load': production_data['electrolyzer_load_percent'],
                    'electrolyzer_efficiency': electrolyzer_efficiency
                },
                'market_data': {
                    'h2_price': h2_selling_price,
                    'oxygen_price': oxygen_price,
                    'lcoh': lcoh
                }
            }
             
        except Exception as e:
            print(f"Error in profit prediction: {e}")
            import traceback
            traceback.print_exc()
            return {
                'h2_production_kg': 0,
                'daily_profit': 0,
                'monthly_profit': 0,
                'model_type': 'Fallback'
            }
    
    def run_safety_monitoring(self, plant_id: str, energy_output: Dict) -> Dict:
        """Run safety check - FAST computation"""
        cf = energy_output.get('capacity_factor', 35)
        
        if cf > 50:
            anomaly_score = (cf - 50) / 100
        elif cf < 15:
            anomaly_score = (15 - cf) / 100
        else:
            anomaly_score = 0.02
        
        status = 'optimal' if anomaly_score < 0.05 else 'normal' if anomaly_score < 0.10 else 'warning'
        
        return {
            'status': status,
            'anomaly_score': round(anomaly_score, 3),
            'alerts': []
        }
    
    async def get_plant_predictions(self, plant_id: str) -> Optional[Dict]:
        """Get predictions for a plant - uses CACHED weather"""
        try:
            plant_config = self._fetch_plant_from_db(plant_id)
            if not plant_config:
                return None
            
            # Use CACHED weather
            weather = self.get_cached_weather(
                plant_config['coordinates']['lat'],
                plant_config['coordinates']['lng']
            )
            
            energy_output = self.calculate_energy_production(plant_config, weather)
            profit_pred = self.run_profit_prediction(plant_config, energy_output, weather)
            safety_status = self.run_safety_monitoring(plant_id, energy_output)
            
            return {
                'plant_id': plant_id,
                'plant_name': plant_config['name'],
                'location': plant_config['location'],
                'weather': weather,
                'energy_output': energy_output,
                'profit_prediction': profit_pred,
                'safety_status': safety_status,
                'lcoh': plant_config['base_lcoh'],
                'timestamp': weather.get('timestamp', '')
            }
            
        except Exception as e:
            print(f"Error getting predictions for {plant_id}: {e}")
            return None
    
    async def get_all_plants_predictions(self) -> List[Dict]:
        """Get predictions for all plants - PARALLEL execution"""
        all_plants = self._fetch_all_plants_from_db()
        plant_ids = [p['id'] for p in all_plants if p.get('id')]
        
        if not plant_ids:
            return []

        # Run all predictions in PARALLEL
        tasks = [self.get_plant_predictions(pid) for pid in plant_ids]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]


# Global instance
per_plant_ml_service = PerPlantMLService()
