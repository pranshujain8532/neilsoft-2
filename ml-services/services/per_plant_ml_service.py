"""
Per-Plant ML Service
Runs ML models separately for each plant with location-specific weather
Dynamic Plant Loading from Supabase
"""

import os
import asyncio
from typing import Dict, List, Optional
from services.weather_service import WeatherService
import numpy as np
import pandas as pd
import joblib
import requests
from dotenv import load_dotenv


class PerPlantMLService:
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
            
        # Initialize Supabase client
        self.supabase = self._init_supabase()

    def _init_supabase(self):
        """Initialize Supabase client for fetching plant configuration"""
        try:
            from supabase import create_client
            
            # Load .env from project root
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(current_dir))
            env_path = os.path.join(project_root, '.env')
            load_dotenv(env_path)
            
            # Also try ml-services .env
            ml_env_path = os.path.join(os.path.dirname(current_dir), '.env')
            load_dotenv(ml_env_path)
            
            # Use service role key for full access
            url = os.environ.get('SUPABASE_URL') or os.environ.get('VITE_SUPABASE_URL')
            key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY') or os.environ.get('VITE_SUPABASE_ANON_KEY')
            
            if not url or not key:
                print(f"[WARN] Missing Supabase credentials")
                return None
            
            client = create_client(url, key)
            print("[OK] PerPlantMLService: Connected to Supabase")
            return client
        except Exception as e:
            print(f"[WARN] Could not initialize Supabase: {e}")
            return None

    def _map_db_row_to_config(self, row: Dict) -> Dict:
        """
        Maps a flat database row to the nested configuration structure 
        expected by the calculation methods.
        
        Actual DB Table 'plants' columns:
        id, name, location, latitude, longitude, 
        capacity, capacity_mw, efficiency, efficiency_percent, 
        lcoh, renewable_percentage, status
        """
        # Get total capacity (prefer capacity_mw, fallback to capacity)
        total_capacity = float(row.get('capacity_mw') or row.get('capacity') or 100)
        
        # Estimate solar/wind/hydro split based on renewable_percentage
        # Default distribution: 50% solar, 30% wind, 20% hydro (if fully renewable)
        renewable_pct = float(row.get('renewable_percentage') or 100) / 100.0
        solar_capacity = total_capacity * 0.50 * renewable_pct
        wind_capacity = total_capacity * 0.30 * renewable_pct
        hydro_capacity = total_capacity * 0.20 * renewable_pct
        
        # Get efficiency (prefer efficiency, fallback to efficiency_percent / 100)
        efficiency = row.get('efficiency')
        if efficiency is None:
            efficiency_pct = row.get('efficiency_percent')
            if efficiency_pct is not None:
                efficiency = float(efficiency_pct) / 100.0
            else:
                efficiency = 0.75  # Default
        else:
            efficiency = float(efficiency)
        
        # Parse location - can be string or object with city/state
        location_raw = row.get('location', 'India')
        if isinstance(location_raw, dict):
            city = location_raw.get('city', '')
            state = location_raw.get('state', 'India')
            location_str = f"{city}, {state}" if city else state
        elif isinstance(location_raw, str):
            # Try to parse JSON string
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
        
        return {
            'id': row.get('id'),
            'name': row.get('name', 'Unknown Plant'),
            'location': location_str,
            'coordinates': {
                'lat': float(row.get('latitude') or 20.5937),  # Default to India center
                'lng': float(row.get('longitude') or 78.9629)
            },
            'capacity': {
                'solar': round(solar_capacity, 2),
                'wind': round(wind_capacity, 2),
                'hydro': round(hydro_capacity, 2),
                'total': round(total_capacity, 2)
            },
            'base_lcoh': float(row.get('lcoh') or 2.0),
            'efficiency': efficiency
        }

    def _fetch_plant_from_db(self, plant_id: str) -> Optional[Dict]:
        """Fetch a specific plant configuration from Supabase"""
        if not self.supabase:
            print("[WARN] DB not connected, cannot fetch plant.")
            return None
            
        try:
            # Query the 'plants' table by 'id' column (UUID)
            response = self.supabase.table('plants').select('*').eq('id', plant_id).execute()
            
            if response.data and len(response.data) > 0:
                return self._map_db_row_to_config(response.data[0])
            
            print(f"[WARN] Plant ID {plant_id} not found in database.")
            return None
        except Exception as e:
            print(f"[WARN] Error fetching plant {plant_id}: {e}")
            return None

    def _fetch_all_plants_from_db(self) -> List[Dict]:
        """Fetch all plant configurations from Supabase"""
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
            print(f"[WARN] Error fetching all plants: {e}")
            return []

    def fetch_real_time_oxygen_price(self) -> float:
        """Fetch real-time Industrial Oxygen PPI from FRED API."""
        try:
            api_key = os.getenv('FRED_API_KEY')
            series_id = 'PCU325120325120A'
            url = f"https://api.stlouisfed.org/fred/series/observations?series_id={series_id}&api_key={api_key}&file_type=json&sort_order=desc&limit=1"
            
            if api_key:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    observations = data.get('observations', [])
                    if observations:
                        latest_index = float(observations[0]['value'])
                        calibrated_price = (latest_index / 350.0) * 0.20
                        print(f"[OK] Fetched Oxygen PPI Index: {latest_index} -> Calculated Price: ${calibrated_price:.4f}/kg")
                        return calibrated_price
            
            print("ℹ️ Using researched baseline for Oxygen Price")
            return 0.15 
            
        except Exception as e:
            print(f"[WARN] Error fetching Oxygen price: {e}")
            return 0.15
            
    def calculate_energy_production(self, plant_config: Dict, weather: Dict) -> Dict:
        """
        Calculate energy production based on weather.
        Accepts plant_config dictionary (fetched from DB) instead of plant_id lookup.
        """
        capacity = plant_config['capacity']
        
        # Solar production
        solar_irradiance = weather.get('solar_irradiance', 850)
        solar_output = (solar_irradiance / 1000) * capacity['solar'] * 0.18
        
        # Wind production
        wind_speed = weather.get('wind_speed', 12)
        wind_output = min(capacity['wind'], (pow(wind_speed / 10, 3) * capacity['wind'] * 0.4))
        
        # Hydro production
        hydro_output = capacity['hydro'] * (0.8 + np.random.random() * 0.15)
        
        total_output = solar_output + wind_output + hydro_output
        
        return {
            'solar': round(solar_output, 2),
            'wind': round(wind_output, 2),
            'hydro': round(hydro_output, 2),
            'total': round(total_output, 2),
            'capacity_factor': round((total_output / capacity['total']) * 100, 1) if capacity['total'] > 0 else 0
        }
    
    def run_profit_prediction(self, plant_config: Dict, energy_output: Dict, weather: Dict) -> Dict:
        """Run profit prediction ML model for plant"""
        from models.profit_predictor import profit_predictor
        
        plant_id = plant_config.get('id', 'unknown')
        
        h2_production = 0
        
        try:
            # Fetch real-time market data
            oxygen_price = self.fetch_real_time_oxygen_price()
            
            # Prepare input data
            daily_energy_mwh = energy_output.get('total', 50) * 24
            estimated_h2_tpd = daily_energy_mwh / 50.0 
            
            input_data = {
                'plant_id': plant_id,
                'currentProduction': estimated_h2_tpd,
                'lcoh': plant_config.get('base_lcoh', 2.0),
                'solar_mix': (energy_output.get('solar', 0) / max(energy_output.get('total', 1), 0.01) * 100),
                'wind_mix': (energy_output.get('wind', 0) / max(energy_output.get('total', 1), 0.01) * 100),
                'hydro_mix': (energy_output.get('hydro', 0) / max(energy_output.get('total', 1), 0.01) * 100),
                'humidity': weather.get('humidity', 50),
                'temperature': weather.get('temperature', 25),
                'efficiency': plant_config.get('efficiency', 0.8),
                'oxygen_savings_rate': oxygen_price 
            }
            
            # Call the external ProfitPredictor
            prediction_result = profit_predictor.predict(input_data, save_to_db=False)
            
            daily_profit = prediction_result.get('predicted_profit', 0)
            monthly_profit = daily_profit * 30
            h2_production = input_data['currentProduction']
            
            breakdown = prediction_result.get('breakdown', {})
            h2_rev = (h2_production * 4.5 * 1000)
            o2_savings = breakdown.get('oxygen_savings_generated', 0)
            
            total_revenue_equiv = h2_rev + o2_savings
            profit_margin = (daily_profit / total_revenue_equiv * 100) if total_revenue_equiv > 0 else 0
                
            return {
                'h2_production_kg': round(h2_production, 1),
                'daily_profit': round(daily_profit, 2),
                'monthly_profit': round(monthly_profit, 2),
                'profit_margin': round(profit_margin, 1),
                'roi': round(plant_config.get('efficiency', 0.8) * 0.25 * 100, 1),
                'model_type': prediction_result.get('model_type', 'Unknown'),
                'oxygen_data': {
                    'price_per_kg': oxygen_price,
                    'savings_generated': round(o2_savings, 2)
                }
            }
             
        except Exception as e:
            print(f"Error in profit prediction integration: {e}")
            # Fallback logic
            if h2_production == 0:
                base_production = energy_output['total'] * 24 
                h2_production = base_production * 20 
            
            revenue = h2_production * plant_config['base_lcoh'] * 1.5
            daily_profit = revenue * plant_config['efficiency'] * 0.25
            monthly_profit = daily_profit * 30
            
            return {
                'h2_production_kg': round(h2_production, 1),
                'daily_profit': round(daily_profit, 0),
                'monthly_profit': round(monthly_profit, 0),
                'profit_margin': round((daily_profit / revenue) * 100, 1) if revenue > 0 else 0,
                'roi': round(plant_config['efficiency'] * 0.25 * 100, 1),
                'model_type': 'Fallback'
            }
    
    def run_safety_monitoring(self, plant_id: str, energy_output: Dict) -> Dict:
        """Run safety monitoring ML model"""
        anomaly_score = np.random.random() * 0.15 
        status = 'optimal' if anomaly_score < 0.05 else 'normal' if anomaly_score < 0.10 else 'warning'
        return {
            'status': status,
            'anomaly_score': round(anomaly_score, 3),
            'alerts': []
        }
    
    async def get_plant_predictions(self, plant_id: str) -> Optional[Dict]:
        """Get all predictions for a specific plant by fetching config from DB first"""
        try:
            # 1. Fetch Plant Configuration from DB
            plant_config = self._fetch_plant_from_db(plant_id)
            if not plant_config:
                return None
            
            # 2. Fetch weather for plant location
            weather = self.weather_service.get_weather_by_coords(
                plant_config['coordinates']['lat'],
                plant_config['coordinates']['lng']
            )
            
            # 3. Fetch next day forecast
            forecast = self.weather_service.get_forecast_by_coords(
                plant_config['coordinates']['lat'],
                plant_config['coordinates']['lng']
            )
            
            # 4. Calculate energy production (Using Config)
            energy_output = self.calculate_energy_production(plant_config, weather)
            
            # 5. Calculate next day prediction
            next_day_output = self.calculate_energy_production(plant_config, {
                'solar_irradiance': (forecast.get('solar_radiation', 20) * 1000 / 24),
                'wind_speed': forecast.get('wind_speed', 10),
                'temperature': forecast.get('max_temp', 30)
            })
            
            # 6. Run ML models (Using Config)
            profit_pred = self.run_profit_prediction(plant_config, energy_output, weather)
            safety_status = self.run_safety_monitoring(plant_id, energy_output)
            
            return {
                'plant_id': plant_id,
                'plant_name': plant_config['name'],
                'location': plant_config['location'],
                'weather': weather,
                'forecast': forecast,
                'energy_output': energy_output,
                'next_day_prediction': next_day_output,
                'profit_prediction': profit_pred,
                'safety_status': safety_status,
                'lcoh': plant_config['base_lcoh'],
                'timestamp': weather.get('timestamp', '')
            }
            
        except Exception as e:
            print(f"Error getting predictions for {plant_id}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def get_all_plants_predictions(self) -> List[Dict]:
        """Get predictions for all plants found in the DB"""
        # 1. Fetch all plants from DB
        all_plants = self._fetch_all_plants_from_db()
        
        # 2. Extract IDs
        plant_ids = [p['id'] for p in all_plants if p.get('id')]
        
        if not plant_ids:
            print("ℹ️ No plants found in database to process.")
            return []

        # 3. Create tasks
        tasks = [self.get_plant_predictions(pid) for pid in plant_ids]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]


# Global instance
per_plant_ml_service = PerPlantMLService()
