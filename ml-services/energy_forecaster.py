import numpy as np
import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Tuple
from supabase import create_client, Client

# --- Configuration ---
ML_PORT = 5001
# Replace with your actual keys
WEATHER_API_KEY = "e168c270a2561b64d8db9ebbba2dc2bd" 
SUPABASE_URL = "https://mnigrozyrnimwzczehbr.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uaWdyb3p5cm5pbXd6Y3plaGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODcyMDksImV4cCI6MjA3OTc2MzIwOX0.vZoZMCpnwHhpm7A59dGgSuIRwjzooWROttYqkZ-wKGw"

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    HAS_TF = True
except ImportError:
    HAS_TF = False
    print("[WARN] TensorFlow not found. Using fallback logic.")

class EnergyMLService:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.solar_model = None
        self.wind_model = None
        self.hydro_model = None
        
        if HAS_TF:
            self._build_models()
        
    def _build_models(self):
        """Initialize Neural Networks"""
        # Solar: [Irradiance, Temp, Hour] -> MW
        self.solar_model = keras.Sequential([
            layers.Dense(64, activation='relu', input_shape=(3,)),
            layers.Dense(32, activation='relu'),
            layers.Dense(1, activation='linear')
        ])
        # Wind: [Speed, Direction, Temp] -> MW
        self.wind_model = keras.Sequential([
            layers.Dense(64, activation='relu', input_shape=(3,)),
            layers.Dense(32, activation='relu'),
            layers.Dense(1, activation='linear')
        ])
        # Hydro: [Flow, Head] -> MW
        self.hydro_model = keras.Sequential([
            layers.Dense(64, activation='relu', input_shape=(2,)),
            layers.Dense(32, activation='relu'),
            layers.Dense(1, activation='linear')
        ])
        
        for model in [self.solar_model, self.wind_model, self.hydro_model]:
            model.compile(optimizer='adam', loss='mse', metrics=['mae'])

    # ---------------------------------------------------------
    # 1. PHYSICS ENGINE (Used for Synthetic Data & Ground Truth)
    # ---------------------------------------------------------
    def calculate_physics_output(self, ptype, capacity, w_data, hour=12):
        """
        Calculates the 'Actual' output based on physics.
        We use this to generate synthetic training data AND to log 
        'Actual Production' into the history table since we don't have real sensors.
        """
        mw = 0
        if ptype == 'solar':
            # w_data: [irradiance, temp, hour]
            irr, temp = w_data[0], w_data[1]
            # Efficiency drops as temp rises above 25
            temp_loss = max(0, (temp - 25) * 0.005)
            hour_factor = np.sin((hour - 6) * np.pi / 12) if 6 <= hour <= 18 else 0
            mw = (capacity * 0.18) * (irr/1000) * hour_factor * (1 - temp_loss)

        elif ptype == 'wind':
            # w_data: [speed, direction, temp]
            ws = w_data[0]
            if 3 < ws < 25:
                mw = capacity * (ws ** 3) / (12 ** 3) # Rated at 12m/s
                mw = min(mw, capacity)
            else:
                mw = 0

        elif ptype == 'hydro':
            # w_data: [flow, head]
            flow, head = w_data[0], w_data[1]
            # P = rho * g * Q * H * eff
            mw = 9.81 * flow * head * 0.85 / 1000
            mw = min(mw, capacity)

        return max(0, float(mw))

    # ---------------------------------------------------------
    # 2. TRAINING (Synthetic RAM + Real Supabase History)
    # ---------------------------------------------------------
    def train_models(self):
        if not HAS_TF: return
        print("\nStarting Model Training...")

        # A. Generate Synthetic Data (In-Memory)
        # --------------------------------------
        print("   1. Generating 5000 synthetic physics records...")
        data = {'solar': ([], []), 'wind': ([], []), 'hydro': ([], [])}
        
        for _ in range(5000):
            # Solar
            irr, temp, h = np.random.uniform(0, 1000), np.random.uniform(10, 45), np.random.randint(6, 19)
            mw = self.calculate_physics_output('solar', 50, [irr, temp, h], h)
            data['solar'][0].append([irr, temp, h])
            data['solar'][1].append(mw)
            
            # Wind
            ws, wd, t = np.random.uniform(0, 25), np.random.uniform(0, 360), np.random.uniform(-5, 35)
            mw = self.calculate_physics_output('wind', 30, [ws, wd, t])
            data['wind'][0].append([ws, wd, t])
            data['wind'][1].append(mw)
            
            # Hydro
            fl, hd = np.random.uniform(10, 100), np.random.uniform(20, 150)
            mw = self.calculate_physics_output('hydro', 100, [fl, hd])
            data['hydro'][0].append([fl, hd])
            data['hydro'][1].append(mw)

        # B. Fetch Real History (Supabase)
        # --------------------------------------
        print("   2. Fetching real history from Supabase...")
        try:
            # Only fetch rows where we have logged the actual MW and weather
            real_hist = self.supabase.table('production_history')\
                .select('energy_generated_mw, weather_snapshot, plants(plant_type)')\
                .not_.is_('energy_generated_mw', 'null')\
                .not_.is_('weather_snapshot', 'null')\
                .limit(2000).execute().data

            if real_hist:
                print(f"      Found {len(real_hist)} real records. Integrating...")
                for row in real_hist:
                    try:
                        ptype = row['plants'].get('plant_type')
                        mw = row['energy_generated_mw']
                        w = row['weather_snapshot']
                        
                        if ptype == 'solar':
                            data['solar'][0].append([w.get('irradiance', 0), w.get('temperature', 25), w.get('hour', 12)])
                            data['solar'][1].append(mw)
                        elif ptype == 'wind':
                            data['wind'][0].append([w.get('wind_speed', 0), w.get('wind_direction', 0), w.get('temperature', 25)])
                            data['wind'][1].append(mw)
                        elif ptype == 'hydro':
                            data['hydro'][0].append([w.get('water_flow', 0), w.get('head_height', 0)])
                            data['hydro'][1].append(mw)
                    except Exception as inner_e:
                        print(f"      Error processing row: {inner_e}")
                        continue
        except Exception as e:
            print(f"   Error fetching/processing history: {e}")
            # import traceback
            # traceback.print_exc()

        # C. Train
        # --------------------------------------
        print("   3. Training Neural Networks (100 Epochs)...")
        if data['solar'][0]: self.solar_model.fit(np.array(data['solar'][0]), np.array(data['solar'][1]), epochs=100, verbose=0)
        if data['wind'][0]: self.wind_model.fit(np.array(data['wind'][0]), np.array(data['wind'][1]), epochs=100, verbose=0)
        if data['hydro'][0]: self.hydro_model.fit(np.array(data['hydro'][0]), np.array(data['hydro'][1]), epochs=100, verbose=0)
        print("Models Trained and Ready.")

    # ---------------------------------------------------------
    # 3. OPERATION: Forecast & Log Actuals
    # ---------------------------------------------------------
    def get_weather(self, lat, lon):
        """Returns (Current Weather, Tomorrow Forecast)"""
        try:
            base = "https://api.openweathermap.org/data/2.5"
            curr = requests.get(f"{base}/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric").json()
            fore = requests.get(f"{base}/forecast?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric").json()
            
            tomorrow_w = {}
            if 'list' in fore:
                # Find noon tomorrow (approx 8th 3-hour slot)
                tomorrow_w = fore['list'][8] if len(fore['list']) > 8 else fore['list'][0]
            
            return curr, tomorrow_w
        except Exception as e:
            print(f"[ERROR] Weather API Error: {e}")
            return None, None

    def run_daily_cycle(self):
        """
        1. Logs ACTUAL production (using physics as 'real' proxy) to production_history.
        2. Predicts FUTURE production (using AI) to ml_predictions.
        """
        print("\nStarting Daily Plant Cycle...")
        plants = self.supabase.table('plants').select('*').execute().data
        
        predictions_batch = []
        history_batch = []
        
        for plant in plants:
            pid = plant['id']
            ptype = plant.get('plant_type', 'solar')
            capacity = float(plant.get('capacity_mw') or 50)
            lat = plant.get('latitude', 0)
            lon = plant.get('longitude', 0)
            
            curr_w, fut_w = self.get_weather(lat, lon)
            if not curr_w: continue

            # --- A. Log ACTUAL Production (The Ground Truth) ---
            # We calculate this using physics to simulate the plant running right now
            curr_temp = curr_w['main']['temp']
            curr_hour = datetime.now().hour
            
            actual_mw = 0
            weather_snap = {}
            
            if ptype == 'solar':
                curr_irr = (100 - curr_w['clouds']['all']) * 10
                actual_mw = self.calculate_physics_output('solar', capacity, [curr_irr, curr_temp, curr_hour], curr_hour)
                weather_snap = {'irradiance': curr_irr, 'temperature': curr_temp, 'hour': curr_hour}
                
            elif ptype == 'wind':
                ws = curr_w['wind']['speed']
                wd = curr_w['wind']['deg']
                actual_mw = self.calculate_physics_output('wind', capacity, [ws, wd, curr_temp])
                weather_snap = {'wind_speed': ws, 'wind_direction': wd, 'temperature': curr_temp}
                
            elif ptype == 'hydro':
                # Simulate hydro flow based on recent rain (mock)
                rain = curr_w.get('rain', {}).get('1h', 0)
                flow = 50 + (rain * 5)
                actual_mw = self.calculate_physics_output('hydro', capacity, [flow, 100])
                weather_snap = {'water_flow': flow, 'head_height': 100}

            # Add to History Batch
            history_batch.append({
                'plant_id': pid,
                'production_kg': 0, # Required by schema, unused here
                'energy_generated_mw': actual_mw, # The target variable
                'weather_snapshot': weather_snap, # The feature variables
                'timestamp': datetime.now().isoformat()
            })
            print(f"   {plant['name']}: Logged Actual {actual_mw:.2f} MW")


            # --- B. Predict TOMORROW'S Production (The AI Forecast) ---
            if HAS_TF and fut_w:
                pred_mw = 0
                fut_temp = fut_w['main']['temp']
                input_data = {}
                
                if ptype == 'solar':
                    fut_irr = (100 - fut_w['clouds']['all']) * 10
                    inp = np.array([[fut_irr, fut_temp, 12]]) # Predict for noon
                    pred_mw = float(self.solar_model.predict(inp, verbose=0)[0][0])
                    input_data = {'irradiance': fut_irr, 'temp': fut_temp, 'target_hour': 12}
                    
                elif ptype == 'wind':
                    ws = fut_w['wind']['speed']
                    wd = fut_w['wind']['deg']
                    inp = np.array([[ws, wd, fut_temp]])
                    pred_mw = float(self.wind_model.predict(inp, verbose=0)[0][0])
                    input_data = {'speed': ws, 'direction': wd}
                    
                elif ptype == 'hydro':
                    rain = fut_w.get('rain', {}).get('3h', 0)
                    flow = 50 + (rain * 5)
                    inp = np.array([[flow, 100]])
                    pred_mw = float(self.hydro_model.predict(inp, verbose=0)[0][0])
                    input_data = {'rain_forecast': rain, 'est_flow': flow}

                pred_mw = max(0, min(pred_mw, capacity))
                
                predictions_batch.append({
                    'plant_id': pid,
                    'prediction_type': 'next_day_forecast',
                    'input_data': input_data,
                    'output_data': {'expected_mw': pred_mw, 'confidence': 0.82},
                    'created_at': datetime.now().isoformat()
                })

        # --- C. Upload to Supabase ---
        if history_batch:
            self.supabase.table('production_history').insert(history_batch).execute()
            print("   Saved Actuals to 'production_history'")
            
        if predictions_batch:
            self.supabase.table('ml_predictions').insert(predictions_batch).execute()
            print("   Saved Forecasts to 'ml_predictions'")

if __name__ == "__main__":
    service = EnergyMLService()
    
    # 1. Train on Memory Data + Database History
    service.train_models()
    
    # 2. Run the cycle (Log Actuals -> Predict Future)
    service.run_daily_cycle()
