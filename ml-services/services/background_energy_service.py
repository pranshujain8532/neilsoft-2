import threading
import time
import numpy as np
import requests
import statistics
import traceback
from datetime import datetime
from supabase import create_client, Client
import os

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
        
        self.data_buffer = {} 
        self.collection_interval = 600 
        self.upload_interval = 14400   
        self.last_upload_time = time.time()

    def start(self):
        if not self.running:
            self.running = True
            thread = threading.Thread(target=self._run_loop, daemon=True)
            thread.start()
            print("⏳ Background Energy Aggregator Service Started (4hr Upload Cycle)")

    def _run_loop(self):
        while self.running:
            try:
                self._collect_snapshot()
                
                current_time = time.time()
                if (current_time - self.last_upload_time) >= self.upload_interval:
                    self._process_averages_and_upload()
                    self.last_upload_time = current_time
                    
            except Exception as e:
                print(f"[WARN] Error in Background Energy Loop: {e}")
                traceback.print_exc()
            
            time.sleep(self.collection_interval)

    def _collect_snapshot(self):
        try:
            plants = self.supabase.table('plants').select('*').execute().data
            
            for plant in plants:
                pid = plant['id']
                ptype = plant.get('plant_type', 'solar')
                capacity = float(plant.get('capacity_mw') or 50)
                
                lat, lon = plant.get('latitude', 0), plant.get('longitude', 0)
                weather = self._fetch_weather(lat, lon)
                if not weather: continue

                predicted_mw = self._predict_mw_consistent(ptype, capacity, weather)
                
                if pid not in self.data_buffer:
                    self.data_buffer[pid] = []
                
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
        print("\n[DATA] 4 Hours Passed. Aggregating and Uploading Data...")
        
        history_batch = []
        prediction_batch = []
        
        if not self.data_buffer:
            print("   [WARN] Buffer empty, skipping upload.")
            return

        try:
            for pid, records in self.data_buffer.items():
                if not records: continue
                
                avg_mw = statistics.mean([r['output_mw'] for r in records])
                
                avg_weather = {}
                keys = records[0]['weather'].keys() 
                for k in keys:
                    values = [r['weather'][k] for r in records if isinstance(r['weather'][k], (int, float))]
                    if values:
                        avg_weather[k] = round(sum(values) / len(values), 2)
                
                history_batch.append({
                    'plant_id': pid,
                    'production_kg': 0, 
                    'energy_generated_mw': round(avg_mw, 2),
                    'weather_snapshot': avg_weather,
                    'timestamp': datetime.now().isoformat()
                })

                prediction_batch.append({
                    'plant_id': pid,
                    'prediction_type': '4hr_avg_forecast',
                    'input_data': {'source': '4hr_rolling_avg', 'weather': avg_weather},
                    'output_data': {'expected_mw': round(avg_mw, 2), 'confidence': 0.90},
                    'created_at': datetime.now().isoformat()
                })

            if history_batch:
                self.supabase.table('production_history').insert(history_batch).execute()
                print(f"[OK] Uploaded {len(history_batch)} aggregated history records.")
                
            if prediction_batch:
                self.supabase.table('ml_predictions').insert(prediction_batch).execute()
                print(f"[OK] Uploaded {len(prediction_batch)} forecast records.")

            self.data_buffer = {} 
            print("[OK] RAM Buffer flushed.")

        except Exception as e:
            print(f"[ERROR] Upload Failed! Keeping data in buffer for retry. Error: {e}")

    def _predict_mw_consistent(self, ptype, capacity, w):
        if not energy_forecaster:
            return capacity * 0.5

        est_flow = 50 + (w.get('humidity', 50) * 0.5) 
        
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
            'head_height': 100 
        }

        capacity_dict = {
            ptype: capacity 
        }

        result = energy_forecaster.forecast_energy(model_input, capacity_dict)

        if ptype == 'solar':
            return result.get('solar_mw', 0)
        elif ptype == 'wind':
            return result.get('wind_mw', 0)
        elif ptype == 'hydro':
            return result.get('hydro_mw', 0)
            
        return result.get('total_mw', 0)

    def _fetch_weather(self, lat, lon):
        try:
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
                'solar_irradiance': 0 
            }
        except Exception as e:
            return None
