import threading
import time
import numpy as np
import requests
import statistics
import traceback
from datetime import datetime
from supabase import create_client, Client
import os

# --- IMPORT SHARED LOGIC ---
# We import the global instance from the models package to ensure consistency
# between the Real-time Dashboard and this Background History Logger.
try:
    from models.energy_forecaster import energy_forecaster
except ImportError:
    print("[WARN] BackgroundService: Could not import energy_forecaster. Make sure models/energy_forecaster.py exists.")
    energy_forecaster = None

class BackgroundEnergyService:
    def __init__(self, supabase_url, supabase_key, weather_api_key):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.weather_api_key = weather_api_key
        self.running = False
        
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
                # 1. Collect Data (Fast Cycle - Every 10 mins)
                self._collect_snapshot()
                
                # 2. Check if 4 hours passed
                current_time = time.time()
                if (current_time - self.last_upload_time) >= self.upload_interval:
                    self._process_averages_and_upload()
                    self.last_upload_time = current_time
                    
            except Exception as e:
                print(f"[WARN] Error in Background Energy Loop: {e}")
                traceback.print_exc()
            
            # Sleep for collection interval
            time.sleep(self.collection_interval)

    def _collect_snapshot(self):
        """Fetches current data and stores in RAM buffer (No DB Upload yet)"""
        try:
            plants = self.supabase.table('plants').select('*').execute().data
            
            for plant in plants:
                pid = plant['id']
                ptype = plant.get('plant_type', 'solar')
                capacity = float(plant.get('capacity_mw') or 50)
                
                # Fetch Live Weather
                lat, lon = plant.get('latitude', 0), plant.get('longitude', 0)
                weather = self._fetch_weather(lat, lon)
                if not weather: continue

                # Calculate Output using the SHARED ML Model
                predicted_mw = self._predict_mw_consistent(ptype, capacity, weather)
                
                # Initialize buffer for this plant if not exists
                if pid not in self.data_buffer:
                    self.data_buffer[pid] = []
                
                # Add snapshot to buffer
                self.data_buffer[pid].append({
                    'weather': weather,
                    'output_mw': predicted_mw,
                    'timestamp': datetime.now()
                })
            
            count = len(next(iter(self.data_buffer.values()))) if self.data_buffer else 0
            print(f"   Sampled {len(plants)} plants. Buffer depth: {count} samples.")
            
        except Exception as e:
            print(f"Snapshot Error: {e}")

    def _process_averages_and_upload(self):
        """Calculates 4-hour averages and uploads to Supabase"""
        print("\n[DATA] 4 Hours Passed. Aggregating and Uploading Data...")
        
        history_batch = []
        prediction_batch = []
        
        # We process whatever is in the buffer
        if not self.data_buffer:
            print("   [WARN] Buffer empty, skipping upload.")
            return

        try:
            for pid, records in self.data_buffer.items():
                if not records: continue
                
                # --- CALCULATE AVERAGES ---
                avg_mw = statistics.mean([r['output_mw'] for r in records])
                
                # Average Weather (Extract keys, avg them, rebuild dict)
                avg_weather = {}
                keys = records[0]['weather'].keys() 
                for k in keys:
                    values = [r['weather'][k] for r in records if isinstance(r['weather'][k], (int, float))]
                    if values:
                        avg_weather[k] = round(sum(values) / len(values), 2)
                
                # --- PREPARE DB UPLOAD ---
                
                # 1. Production History (The "Ground Truth" for training)
                history_batch.append({
                    'plant_id': pid,
                    'production_kg': 0, # Legacy field
                    'energy_generated_mw': round(avg_mw, 2),
                    'weather_snapshot': avg_weather,
                    'timestamp': datetime.now().isoformat()
                })

                # 2. Prediction (Persistence Forecast)
                prediction_batch.append({
                    'plant_id': pid,
                    'prediction_type': '4hr_avg_forecast',
                    'input_data': {'source': '4hr_rolling_avg', 'weather': avg_weather},
                    'output_data': {'expected_mw': round(avg_mw, 2), 'confidence': 0.90},
                    'created_at': datetime.now().isoformat()
                })

            # --- BULK INSERT ---
            if history_batch:
                self.supabase.table('production_history').insert(history_batch).execute()
                print(f"[OK] Uploaded {len(history_batch)} aggregated history records.")
                
            if prediction_batch:
                self.supabase.table('ml_predictions').insert(prediction_batch).execute()
                print(f"[OK] Uploaded {len(prediction_batch)} forecast records.")

            # Clear Buffer ONLY after successful upload
            self.data_buffer = {} 
            print("[OK] RAM Buffer flushed.")

        except Exception as e:
            print(f"[ERROR] Upload Failed! Keeping data in buffer for retry. Error: {e}")

    # --- UPDATED: CONSISTENT PREDICTION LOGIC ---
    def _predict_mw_consistent(self, ptype, capacity, w):
        """
        Uses the shared 'energy_forecaster' so History matches Dashboard.
        """
        if not energy_forecaster:
            # Fallback if import failed
            return capacity * 0.5

        # 1. Map our flattened weather dict to what EnergyForecaster expects
        # EnergyForecaster expects keys like: 'irradiance', 'temperature', 'hour', etc.
        
        # Heuristics for missing Hydro data
        # (Hydro usually needs flow sensors, here we estimate based on humidity/rain if available)
        est_flow = 50 + (w.get('humidity', 50) * 0.5) 
        
        # Estimate Irradiance from Cloud Cover if API didn't provide it
        irr = w.get('solar_irradiance', 0)
        if irr == 0 and w.get('clouds') is not None:
             irr = (100 - w['clouds']) * 10 

        model_input = {
            'irradiance': irr,
            'temperature': w.get('temp', 25),
            'hour': datetime.now().hour,
            'wind_speed': w.get('wind_speed', 5),
            'wind_direction': w.get('wind_deg', 0),
            'water_flow': est_flow,
            'head_height': 100 # Default constant
        }

        # 2. Prepare Capacity Dict
        # The forecaster scales its output based on this dict
        capacity_dict = {
            ptype: capacity 
        }

        # 3. Get Prediction
        # forecast_energy returns a dict: {'solar_mw': ..., 'wind_mw': ..., 'total_mw': ...}
        result = energy_forecaster.forecast_energy(model_input, capacity_dict)

        # 4. Extract specific value
        if ptype == 'solar':
            return result.get('solar_mw', 0)
        elif ptype == 'wind':
            return result.get('wind_mw', 0)
        elif ptype == 'hydro':
            return result.get('hydro_mw', 0)
            
        return result.get('total_mw', 0)

    # --- Helpers ---
    def _fetch_weather(self, lat, lon):
        try:
            # Note: In production, consider caching this call if plants are close
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_api_key}&units=metric"
            data = requests.get(url, timeout=10).json()
            
            if data.get('cod') != 200:
                return None

            return {
                'temp': data['main']['temp'],
                'pressure': data['main']['pressure'],
                'humidity': data['main']['humidity'],
                'wind_speed': data['wind']['speed'],
                'wind_deg': data['wind'].get('deg', 0),
                'clouds': data['clouds']['all'],
                # OpenWeatherMap Standard doesn't always give irradiance, 
                # so we might default to 0 and calc it in _predict_mw_consistent
                'solar_irradiance': 0 
            }
        except Exception as e:
            # print(f"[WARN] Weather Fetch Error: {e}") 
            return None
