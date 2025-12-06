import threading
import time
import numpy as np
import requests
import statistics
from datetime import datetime
from supabase import create_client

# Reuse your existing logic, but wrapped for buffering
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    HAS_TF = True
except ImportError:
    HAS_TF = False

class BackgroundEnergyService:
    def __init__(self, supabase_url, supabase_key, weather_api_key):
        self.supabase = create_client(supabase_url, supabase_key)
        self.weather_api_key = weather_api_key
        self.running = False
        
        # ML Models (Same as before)
        self.solar_model = None
        self.wind_model = None
        self.hydro_model = None
        if HAS_TF:
            self._build_models()

        # --- BUFFER CONFIGURATION ---
        self.data_buffer = {} # Stores 10-min snapshots: { plant_id: [records] }
        self.collection_interval = 600 # Collect data every 10 minutes (600s)
        self.upload_interval = 14400   # Upload average every 4 hours (14400s)
        self.last_upload_time = time.time()

    def start(self):
        """Start the background thread"""
        if not self.running:
            self.running = True
            thread = threading.Thread(target=self._run_loop, daemon=True)
            thread.start()
            print("⏳ Background Energy Aggregator Service Started (4hr Upload Cycle)")

    def _run_loop(self):
        """Main loop: Collects often, Uploads rarely"""
        while self.running:
            try:
                # 1. Collect Data (Fast Cycle)
                self._collect_snapshot()
                
                # 2. Check if 4 hours passed
                current_time = time.time()
                if (current_time - self.last_upload_time) >= self.upload_interval:
                    self._process_averages_and_upload()
                    self.last_upload_time = current_time
                    
            except Exception as e:
                print(f"⚠️ Error in Background Energy Loop: {e}")
            
            # Sleep for collection interval
            time.sleep(self.collection_interval)

    def _collect_snapshot(self):
        """Fetches current data and stores in RAM buffer (No DB Upload yet)"""
        plants = self.supabase.table('plants').select('*').execute().data
        
        for plant in plants:
            pid = plant['id']
            ptype = plant.get('plant_type', 'solar')
            capacity = float(plant.get('capacity_mw') or 50)
            
            # Fetch Live Weather
            lat, lon = plant.get('latitude', 0), plant.get('longitude', 0)
            weather = self._fetch_weather(lat, lon)
            if not weather: continue

            # Calculate Physics/ML Output
            predicted_mw = self._predict_mw(ptype, capacity, weather)
            
            # Initialize buffer for this plant if not exists
            if pid not in self.data_buffer:
                self.data_buffer[pid] = []
            
            # Add snapshot to buffer
            self.data_buffer[pid].append({
                'weather': weather,
                'output_mw': predicted_mw,
                'timestamp': datetime.now()
            })
        
        print(f"   Sampled {len(plants)} plants. Buffer size: {len(next(iter(self.data_buffer.values())))} samples.")

    def _process_averages_and_upload(self):
        """Calculates 4-hour averages and uploads to Supabase"""
        print("\n📊 4 Hours Passed. Aggregating and Uploading Data...")
        
        history_batch = []
        prediction_batch = []
        
        for pid, records in self.data_buffer.items():
            if not records: continue
            
            # --- CALCULATE AVERAGES ---
            avg_mw = statistics.mean([r['output_mw'] for r in records])
            
            # Average Weather (Extract keys, avg them, rebuild dict)
            avg_weather = {}
            keys = records[0]['weather'].keys() # temp, speed, etc
            for k in keys:
                values = [r['weather'][k] for r in records if isinstance(r['weather'][k], (int, float))]
                if values:
                    avg_weather[k] = round(sum(values) / len(values), 2)
            
            # --- PREPARE DB UPLOAD ---
            
            # 1. Production History (The "Actual" Average)
            history_batch.append({
                'plant_id': pid,
                'production_kg': 0, 
                'energy_generated_mw': round(avg_mw, 2),
                'weather_snapshot': avg_weather,
                'timestamp': datetime.now().isoformat()
            })

            # 2. Prediction (For Next 4 Hours - Using the trend)
            # Simple logic: Assume next 4 hours is similar to avg of last 4 hours (Persistence Model)
            prediction_batch.append({
                'plant_id': pid,
                'prediction_type': '4hr_avg_forecast',
                'input_data': {'source': '4hr_rolling_avg', 'weather': avg_weather},
                'output_data': {'expected_mw': round(avg_mw, 2), 'confidence': 0.90},
                'created_at': datetime.now().isoformat()
            })

            # 3. Profit Prediction (Using the Profit Model)
            try:
                from models.profit_predictor import profit_predictor
                
                # Convert MW to approx kg H2 (Mock conversion: 1 MW ~ 20 kg/hr * 4 hrs)
                est_production_kg = avg_mw * 20 * 4 
                
                # Mock cost factors (In real app, fetch from DB)
                lcoh = 2.5 
                labor_cost = 500
                
                profit_input = {
                    'plant_id': pid,
                    'currentProduction': est_production_kg,
                    'lcoh': lcoh,
                    'labor_cost': labor_cost
                }
                
                # Get prediction (Don't save internally, we'll batch save)
                profit_result = profit_predictor.predict(profit_input, save_to_db=False)
                
                prediction_batch.append({
                    'plant_id': pid,
                    'prediction_type': 'profitability',
                    'input_data': profit_input,
                    'output_data': profit_result,
                    'created_at': datetime.now().isoformat()
                })
                
            except Exception as e:
                print(f"⚠️ Profit Prediction Error: {e}")

        # --- BULK INSERT ---
        if history_batch:
            self.supabase.table('production_history').insert(history_batch).execute()
            print(f"✅ Uploaded {len(history_batch)} aggregated history records.")
            
        if prediction_batch:
            self.supabase.table('ml_predictions').insert(prediction_batch).execute()
            print(f"✅ Uploaded {len(prediction_batch)} forecast/profit records.")

        # Clear Buffer
        self.data_buffer = {} 

    # --- Helpers ---
    def _fetch_weather(self, lat, lon):
        try:
            # Use the shared WeatherService (Open-Meteo)
            from services.weather_service import weather_service
            w_data = weather_service.get_weather_by_coords(lat, lon)
            
            # Map Open-Meteo keys to what our logic expects
            return {
                'temp': w_data.get('temperature', 25),
                'pressure': w_data.get('pressure', 1013),
                'humidity': w_data.get('humidity', 50),
                'wind_speed': w_data.get('wind_speed', 5),
                'wind_deg': w_data.get('wind_direction', 0),
                'clouds': w_data.get('cloud_cover', 0),
                'solar_irradiance': w_data.get('solar_irradiance', 0)
            }
        except Exception as e:
            print(f"⚠️ Weather Fetch Error: {e}")
            return None

    def _predict_mw(self, ptype, capacity, w):
        # Your specific physics/ML logic here
        if ptype == 'solar':
            return (capacity * 0.18) * ((100-w['clouds'])/100) # Simplified
        elif ptype == 'wind':
            if 3 < w['wind_speed'] < 25:
                return capacity * (w['wind_speed']**3)/(12**3)
        elif ptype == 'hydro':
             return capacity * 0.7 # Placeholder
        return 0

    def _build_models(self):
        # Initialize Keras models here if needed for deeper prediction
        pass
