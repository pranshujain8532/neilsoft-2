"""
Real-Time ML Prediction Service
Continuously updates ML predictions using latest weather data and a trained Random Forest model
"""

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

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.weather_service import weather_service

class RealtimeMLService:
    def __init__(self):
        self.running = False
        self.update_interval = 10  # seconds
        self.latest_predictions = {}
        self.latest_weather = {}
        self.model = None
        self.model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models', 'trained_model.pkl')
        
    def start(self):
        """Start real-time prediction updates"""
        if not self.running:
            # Train model if not exists
            if not os.path.exists(self.model_path) or self.model is None:
                self._train_model()
            else:
                self.model = joblib.load(self.model_path)
                print("✅ Loaded existing ML model")

            self.running = True
            self.update_thread = threading.Thread(target=self._update_loop, daemon=True)
            self.update_thread.start()
            print("✅ Real-time ML service started")
    
    def stop(self):
        """Stop real-time updates"""
        self.running = False
        print("🛑 Real-time ML service stopped")
    
    def _train_model(self):
        """Train a Random Forest model on synthetic data"""
        print("🔄 Generating 100,000 synthetic data points for training...")
        
        # 1. Generate Synthetic Data
        n_samples = 100000
        np.random.seed(42)
        
        # Features: Irradiance, Temp, Wind Speed, Humidity
        irradiance = np.random.uniform(0, 1200, n_samples)
        temp = np.random.uniform(10, 45, n_samples)
        wind_speed = np.random.uniform(0, 25, n_samples)
        humidity = np.random.uniform(20, 90, n_samples)
        
        # Target: H2 Production (kg/day)
        # Formula: Base + (Irradiance * Efficiency) + (Wind * Factor) - (Temp penalty)
        h2_production = (
            (irradiance * 0.15) + 
            (wind_speed * 5.0) - 
            (abs(temp - 25) * 0.5) + 
            np.random.normal(0, 5, n_samples) # Noise
        )
        h2_production = np.maximum(0, h2_production) # No negative production
        
        X = pd.DataFrame({
            'irradiance': irradiance,
            'temperature': temp,
            'wind_speed': wind_speed,
            'humidity': humidity
        })
        y = h2_production
        
        # 2. Train Model
        print("🧠 Training Random Forest Regressor...")
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        
        self.model = RandomForestRegressor(n_estimators=50, n_jobs=-1)
        self.model.fit(X_train, y_train)
        
        score = self.model.score(X_test, y_test)
        print(f"✅ Model trained! R² Score: {score:.4f}")
        
        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(self.model, self.model_path)
        
    def _update_loop(self):
        """Main update loop"""
        last_db_update = 0
        db_update_interval = 3600  # 1 hour
        
        # For demo purposes, run immediately on start, then every hour
        # Check if we need to run immediately (e.g. if no data exists)
        self._save_hourly_data()
        last_db_update = time.time()

        while self.running:
            try:
                current_time = time.time()
                
                # Fast updates for in-memory cache (every 10s)
                self._update_predictions()
                
                # Hourly updates to Database
                if current_time - last_db_update >= db_update_interval:
                    print("⏰ Triggering hourly database update...")
                    self._save_hourly_data()
                    last_db_update = current_time
                
                time.sleep(self.update_interval)
            except Exception as e:
                print(f"Error in ML update loop: {e}")
                time.sleep(self.update_interval)
    
    def _update_predictions(self):
        """Update all ML predictions with latest data"""
        
        # Get latest weather for default location (Gujarat, India)
        weather = weather_service.get_weather_by_coords(23.0225, 72.5714)
        self.latest_weather = weather
        
        # Prepare input for model
        input_data = pd.DataFrame([{
            'irradiance': weather.get('solar_irradiance', 0),
            'temperature': weather.get('temperature', 25),
            'wind_speed': weather.get('wind_speed', 5),
            'humidity': weather.get('humidity', 50)
        }])
        
        # Predict H2 Production
        if self.model:
            prediction = self.model.predict(input_data)[0]
        else:
            prediction = 0
            
        # Calculate Efficiency (Mock logic based on production vs capacity)
        capacity = 100 # kg/day
        efficiency = min(100, (prediction / capacity) * 100) if capacity > 0 else 0
        
        self.latest_predictions = {
            'h2_production_kg': round(prediction, 2),
            'efficiency': round(efficiency, 2),
            'daily_profit': round(prediction * 5.5, 2), # $5.5 per kg
            'timestamp': time.time(),
            'ml_confidence': 0.92 # Static high confidence for demo
        }
        
        # print(f"Updated predictions: {self.latest_predictions}")
    
    def get_latest_predictions(self) -> Dict:
        """Get the most recent predictions"""
        return {
            'predictions': self.latest_predictions,
            'weather': self.latest_weather,
            'update_interval': self.update_interval,
            'last_update': self.latest_predictions.get('timestamp', 0)
        }

    def _save_hourly_data(self):
        """Save production and ML predictions to Supabase for all plants"""
        try:
            from supabase import create_client
            from dotenv import load_dotenv
            
            load_dotenv()
            url = os.environ.get('SUPABASE_URL')
            # Use Service Role Key if available to bypass RLS
            key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
            
            if not url or not key:
                print("⚠️ Missing Supabase credentials, skipping DB update")
                return

            supabase = create_client(url, key)
            
            # Fetch all plants
            response = supabase.table('plants').select('*').execute()
            plants = response.data
            
            if not plants:
                print("⚠️ No plants found for hourly update")
                return

            print(f"🔄 Processing hourly updates for {len(plants)} plants...")
            
            # Import models
            from models.profit_predictor import profit_predictor
            # from models.energy_forecaster import energy_forecaster # Assuming this exists
            
            for plant in plants:
                plant_id = plant['id']
                capacity = plant.get('capacity_mw', 50) # Using MW as proxy for TPD or similar
                
                # 1. Generate & Save Production Data
                # Simulate production based on capacity and random efficiency
                efficiency = np.random.uniform(85, 98)
                production_kg = (capacity * 10) * (efficiency / 100) # Mock formula
                lcoh = np.random.uniform(1.8, 2.5)
                
                # NOTE: We no longer write to 'production_history' here. 
                # That is now handled exclusively by BackgroundEnergyService.
                
                # 2. Generate & Save ML Predictions
                # Profit Prediction
                profit_pred = profit_predictor.predict({
                    'currentProduction': production_kg,
                    'lcoh': lcoh,
                    'labor_cost': 1200 # Mock labor cost
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
                
                # Energy Forecast (Mock if model not ready)
                ml_data_energy = {
                    'prediction_type': 'energy_forecast',
                    'plant_id': plant_id,
                    'input_data': {'capacity': capacity},
                    'output_data': {
                        'forecast_kwh': capacity * 1000 * 24, # Mock
                        'confidence': 0.95
                    }
                }
                supabase.table('ml_predictions').insert(ml_data_energy).execute()
                
            print("✅ Hourly database update completed successfully")

        except Exception as e:
            print(f"❌ Error in _save_hourly_data: {e}")

# Global instance
realtime_ml_service = RealtimeMLService()
