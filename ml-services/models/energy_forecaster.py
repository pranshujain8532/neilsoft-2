"""
Energy Production Forecasting Models
Predicts solar, wind, and hydro energy output based on weather conditions
"""

import numpy as np
from typing import Dict
import json
import os

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    HAS_TF = True
except ImportError:
    HAS_TF = False


class EnergyForecaster:
    def __init__(self):
        self.solar_model = None
        self.wind_model = None
        self.hydro_model = None
        
        if HAS_TF:
            self.build_models()
    
    def build_models(self):
        """Build forecasting models for each energy source"""
        # Solar model: Input (irradiance, temperature, time) -> Output (MW)
        self.solar_model = keras.Sequential([
            layers.Dense(32, activation='relu', input_shape=(3,)),
            layers.Dense(16, activation='relu'),
            layers.Dense(1, activation='linear')
        ])
        
        # Wind model: Input (wind_speed, direction, temperature) -> Output (MW)
        self.wind_model = keras.Sequential([
            layers.Dense(32, activation='relu', input_shape=(3,)),
            layers.Dense(16, activation='relu'),
            layers.Dense(1, activation='linear')
        ])
        
        # Hydro model: Input (water_flow, head_height) -> Output (MW)
        self.hydro_model = keras.Sequential([
            layers.Dense(24, activation='relu', input_shape=(2,)),
            layers.Dense(12, activation='relu'),
            layers.Dense(1, activation='linear')
        ])
        
        for model in [self.solar_model, self.wind_model, self.hydro_model]:
            model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        
        print("[OK] Energy forecasting models built")
    
    def generate_training_data_solar(self, num_samples=1000):
        """Generate solar training data using real historical weather"""
        from services.weather_service import weather_service
        
        print("   Fetching historical weather data for Solar training...")
        # Fetch data for a sunny location (e.g., Gujarat)
        df = weather_service.get_historical_weather(23.0225, 72.5714, days=365)
        
        if df is not None and not df.empty:
            # Filter for daylight hours (irradiance > 0)
            df = df[df['irradiance'] > 0]
            
            # Sample if we have more data than needed
            if len(df) > num_samples:
                df = df.sample(n=num_samples, random_state=42)
            
            X = df[['irradiance', 'temperature']].values
            # Add hour of day
            hours = pd.to_datetime(df['time']).dt.hour.values.reshape(-1, 1)
            X = np.hstack((X, hours))
            
            # Calculate target power (y) using physics formula
            # P = η * A * G
            y = []
            for i in range(len(X)):
                irradiance = X[i][0]
                hour = X[i][2]
                
                hour_factor = np.sin((hour - 6) * np.pi / 12) if 6 <= hour <= 18 else 0
                power = 0.18 * irradiance * hour_factor / 100  # Normalized to MW
                y.append(power)
                
            return np.array(X), np.array(y)
            
        else:
            print("   Failed to fetch real data, falling back to synthetic generation")
            return self._generate_synthetic_solar(num_samples)

    def _generate_synthetic_solar(self, num_samples):
        """Fallback synthetic data generator"""
        np.random.seed(42)
        X = []
        y = []
        for _ in range(num_samples):
            irradiance = np.random.uniform(0, 1000)
            temp = np.random.uniform(15, 40)
            hour = np.random.randint(0, 24)
            hour_factor = np.sin((hour - 6) * np.pi / 12) if 6 <= hour <= 18 else 0
            power = 0.18 * irradiance * hour_factor / 100
            X.append([irradiance, temp, hour])
            y.append(power)
        return np.array(X), np.array(y)
    
    def generate_training_data_wind(self, num_samples=1000):
        """Generate wind training data using real historical weather"""
        from services.weather_service import weather_service
        
        print("   Fetching historical weather data for Wind training...")
        # Fetch data for a windy location (e.g., Kutch)
        df = weather_service.get_historical_weather(23.7337, 69.8597, days=365)
        
        if df is not None and not df.empty:
            if len(df) > num_samples:
                df = df.sample(n=num_samples, random_state=43)
                
            X = df[['wind_speed', 'wind_direction', 'temperature']].values
            
            y = []
            for i in range(len(X)):
                wind_speed = X[i][0]
                
                # Wind power: P = 0.5 * ρ * A * v³ * Cp
                if wind_speed < 3:
                    power = 0
                elif wind_speed > 20:
                    power = 0
                else:
                    power = 0.4 * (wind_speed ** 3) / 100
                y.append(power)
                
            return np.array(X), np.array(y)
        else:
            print("   Failed to fetch real data, falling back to synthetic generation")
            return self._generate_synthetic_wind(num_samples)

    def _generate_synthetic_wind(self, num_samples):
        """Fallback synthetic data generator"""
        np.random.seed(43)
        X = []
        y = []
        for _ in range(num_samples):
            wind_speed = np.random.uniform(0, 25)
            direction = np.random.uniform(0, 360)
            temp = np.random.uniform(-10, 35)
            if wind_speed < 3 or wind_speed > 20:
                power = 0
            else:
                power = 0.4 * (wind_speed ** 3) / 100
            X.append([wind_speed, direction, temp])
            y.append(power)
        return np.array(X), np.array(y)
    
    def generate_training_data_hydro(self, num_samples=1000):
        """Generate hydro training data"""
        np.random.seed(44)
        
        X = []
        y = []
        
        for _ in range(num_samples):
            # Water flow (m³/s), Head height (m)
            flow = np.random.uniform(5, 100)
            head = np.random.uniform(10, 200)
            
            # Hydro power: P = η * ρ * g * Q * H
            # η = efficiency (~85%), ρ = density, g = gravity, Q = flow, H = head
            efficiency = 0.85
            power = efficiency * 9.81 * flow * head / 1000  # Convert to MW
            
            X.append([flow, head])
            y.append(power)
        
        return np.array(X), np.array(y)
    
    def train_all(self, epochs=50):
        """Train all forecasting models with accuracy tracking"""
        if not HAS_TF:
            print("[WARN]  TensorFlow not available")
            return
        
        results = {}
        
        print("🔄 Training Solar Forecaster...")
        X_solar, y_solar = self.generate_training_data_solar(num_samples=2000)
        history_solar = self.solar_model.fit(
            X_solar, y_solar, 
            epochs=epochs, 
            validation_split=0.2,
            verbose=0
        )
        solar_mae = min(history_solar.history['val_mae'])
        solar_acc = max(0, 100 - (solar_mae / (y_solar.mean() + 0.001) * 100))
        print(f"   [OK] Solar MAE: {solar_mae:.3f}, Accuracy: {solar_acc:.1f}%")
        results['solar'] = solar_acc
        
        print("🔄 Training Wind Forecaster...")
        X_wind, y_wind = self.generate_training_data_wind(num_samples=2000)
        history_wind = self.wind_model.fit(
            X_wind, y_wind, 
            epochs=epochs, 
            validation_split=0.2,
            verbose=0
        )
        wind_mae = min(history_wind.history['val_mae'])
        wind_acc = max(0, 100 - (wind_mae / (y_wind.mean() + 0.001) * 100))
        print(f"   [OK] Wind MAE: {wind_mae:.3f}, Accuracy: {wind_acc:.1f}%")
        results['wind'] = wind_acc
        
        print("🔄 Training Hydro Forecaster...")
        X_hydro, y_hydro = self.generate_training_data_hydro(num_samples=2000)
        history_hydro = self.hydro_model.fit(
            X_hydro, y_hydro, 
            epochs=epochs, 
            validation_split=0.2,
            verbose=0
        )
        hydro_mae = min(history_hydro.history['val_mae'])
        hydro_acc = max(0, 100 - (hydro_mae / (y_hydro.mean() + 0.001) * 100))
        print(f"   [OK] Hydro MAE: {hydro_mae:.3f}, Accuracy: {hydro_acc:.1f}%")
        results['hydro'] = hydro_acc
        
        avg_acc = (solar_acc + wind_acc + hydro_acc) / 3
        print(f"\n[DATA] Energy Forecasters Training Complete!")
        print(f"   Average Accuracy: {avg_acc:.1f}%")
        
        if avg_acc >= 80:
            print(f"   🎯 Target accuracy achieved!")
        else:
            print(f"   [WARN]  Consider additional training")
        
        return results
    
    def forecast_energy(self, weather_data: Dict, plant_capacity: Dict) -> Dict:
        """Forecast energy production for next period"""
        
        # Solar forecast
        if HAS_TF and self.solar_model:
            solar_input = np.array([[
                weather_data.get('irradiance', 500),
                weather_data.get('temperature', 25),
                weather_data.get('hour', 12)
            ]])
            solar_mw = float(self.solar_model.predict(solar_input, verbose=0)[0][0])
            solar_mw *= plant_capacity.get('solar', 50)  # Scale by capacity
        else:
            solar_mw = plant_capacity.get('solar', 50) * 0.6  # 60% of capacity
        
        # Wind forecast
        if HAS_TF and self.wind_model:
            wind_input = np.array([[
                weather_data.get('wind_speed', 8),
                weather_data.get('wind_direction', 180),
                weather_data.get('temperature', 25)
            ]])
            wind_mw = float(self.wind_model.predict(wind_input, verbose=0)[0][0])
            wind_mw *= plant_capacity.get('wind', 30)
        else:
            wind_mw = plant_capacity.get('wind', 30) * 0.5
        
        # Hydro forecast
        if HAS_TF and self.hydro_model:
            hydro_input = np.array([[
                weather_data.get('water_flow', 50),
                weather_data.get('head_height', 100)
            ]])
            hydro_mw = float(self.hydro_model.predict(hydro_input, verbose=0)[0][0])
            hydro_mw *= plant_capacity.get('hydro', 20)
        else:
            hydro_mw = plant_capacity.get('hydro', 20) * 0.7
        
        total_mw = solar_mw + wind_mw + hydro_mw
        
        return {
            'solar_mw': max(0, solar_mw),
            'wind_mw': max(0, wind_mw),
            'hydro_mw': max(0, hydro_mw),
            'total_mw': max(0, total_mw),
            'energy_mix': {
                'solar': (solar_mw / total_mw * 100) if total_mw > 0 else 0,
                'wind': (wind_mw / total_mw * 100) if total_mw > 0 else 0,
                'hydro': (hydro_mw / total_mw * 100) if total_mw > 0 else 0,
            },
            'confidence': 0.80 if HAS_TF else 0.55
        }


# Create global instance
energy_forecaster = EnergyForecaster()
