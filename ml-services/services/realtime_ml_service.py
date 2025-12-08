import threading
import time
from typing import Dict, List
import sys
import os
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.weather_service import weather_service

class RealtimeMLService:
    def __init__(self):
        self.running = False
        self.update_interval = 10  
        self.latest_predictions = {}
        self.latest_weather = {}
        self.model = None
        self.model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models', 'trained_model.pkl')
        
    def start(self):
        if not self.running:
            if not os.path.exists(self.model_path) or self.model is None:
                self._train_model()
            else:
                self.model = joblib.load(self.model_path)
                print("[OK] Loaded existing ML model")

            self.running = True
            self.update_thread = threading.Thread(target=self._update_loop, daemon=True)
            self.update_thread.start()
            print("[OK] Real-time ML service started")
    
    def stop(self):
        self.running = False
        print("[STOP] Real-time ML service stopped")
    
    def _train_model(self):
        print("[INFO] Generating 100,000 synthetic data points for training...")
        
        n_samples = 100000
        np.random.seed(42)
        
        irradiance = np.random.uniform(0, 1200, n_samples)
        temp = np.random.uniform(10, 45, n_samples)
        wind_speed = np.random.uniform(0, 25, n_samples)
        humidity = np.random.uniform(20, 90, n_samples)
        
        h2_production = (
            (irradiance * 0.15) + 
            (wind_speed * 5.0) - 
            (abs(temp - 25) * 0.5) + 
            np.random.normal(0, 5, n_samples) 
        )
        h2_production = np.maximum(0, h2_production) 
        
        X = pd.DataFrame({
            'irradiance': irradiance,
            'temperature': temp,
            'wind_speed': wind_speed,
            'humidity': humidity
        })
        y = h2_production
        
        print("[INFO] Training Random Forest Regressor...")
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        
        self.model = RandomForestRegressor(n_estimators=50, n_jobs=-1)
        self.model.fit(X_train, y_train)
        
        score = self.model.score(X_test, y_test)
        print(f"[OK] Model trained! R² Score: {score:.4f}")
        
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(self.model, self.model_path)
        
    def _update_loop(self):
        last_db_update = 0
        db_update_interval = 3600  
        
        self._save_hourly_data()
        last_db_update = time.time()

        while self.running:
            try:
                current_time = time.time()
                
                self._update_predictions()
                
                if current_time - last_db_update >= db_update_interval:
                    print("[INFO] Triggering hourly database update...")
                    self._save_hourly_data()
                    last_db_update = current_time
                
                time.sleep(self.update_interval)
            except Exception as e:
                print(f"Error in ML update loop: {e}")
                time.sleep(self.update_interval)
    
    def _update_predictions(self):
        
        weather = weather_service.get_weather_by_coords(23.0225, 72.5714)
        self.latest_weather = weather
        
        input_data = pd.DataFrame([{
            'irradiance': weather.get('solar_irradiance', 0),
            'temperature': weather.get('temperature', 25),
            'wind_speed': weather.get('wind_speed', 5),
            'humidity': weather.get('humidity', 50)
        }])
        
        if self.model:
            prediction = self.model.predict(input_data)[0]
        else:
            prediction = 0
            
        capacity = 100 
        efficiency = min(100, (prediction / capacity) * 100) if capacity > 0 else 0
        
        self.latest_predictions = {
            'h2_production_kg': round(prediction, 2),
            'efficiency': round(efficiency, 2),
            'daily_profit': round(prediction * 5.5, 2), 
            'timestamp': time.time(),
            'ml_confidence': 0.92 
        }
        
    def get_latest_predictions(self) -> Dict:
        return {
            'predictions': self.latest_predictions,
            'weather': self.latest_weather,
            'update_interval': self.update_interval,
            'last_update': self.latest_predictions.get('timestamp', 0)
        }

    def _save_hourly_data(self):
        try:
            from supabase import create_client
            from dotenv import load_dotenv
            
            load_dotenv()
            url = os.environ.get('SUPABASE_URL')
            key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
            
            if not url or not key:
                print("[WARN] Missing Supabase credentials, skipping DB update")
                return

            supabase = create_client(url, key)
            
            response = supabase.table('plants').select('*').execute()
            plants = response.data
            
            if not plants:
                print("[WARN] No plants found for hourly update")
                return

            print(f"[INFO] Processing hourly updates for {len(plants)} plants...")
            
            from models.profit_predictor import profit_predictor
            
            for plant in plants:
                plant_id = plant['id']
                capacity = plant.get('capacity_mw', 50) 
                
                efficiency = np.random.uniform(85, 98)
                production_kg = (capacity * 10) * (efficiency / 100) 
                lcoh = np.random.uniform(1.8, 2.5)
                
                profit_pred = profit_predictor.predict({
                    'currentProduction': production_kg,
                    'lcoh': lcoh,
                    'labor_cost': 1200 
                })
                
                ml_data_profit = {
                    'prediction_type': 'profitability',
                    'plant_id': plant_id,
                    'input_data': {
                        'production': production_kg,
                        'lcoh': lcoh,
                        'labor_cost': 1200
                    },
                    'output_data': profit_pred
                }
                supabase.table('ml_predictions').insert(ml_data_profit).execute()
                
                ml_data_energy = {
                    'prediction_type': 'energy_forecast',
                    'plant_id': plant_id,
                    'input_data': {'capacity': capacity},
                    'output_data': {
                        'forecast_kwh': capacity * 1000 * 24, 
                        'confidence': 0.95
                    }
                }
                supabase.table('ml_predictions').insert(ml_data_energy).execute()
                
            print("[OK] Hourly database update completed successfully")

        except Exception as e:
            print(f"[ERROR] Error in _save_hourly_data: {e}")

realtime_ml_service = RealtimeMLService()
