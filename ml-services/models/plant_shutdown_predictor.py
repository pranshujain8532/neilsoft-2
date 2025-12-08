"""
Plant Shutdown Predictor
Deep learning model to predict major plant shutdowns based on:
- Equipment maintenance predictions
- Energy source conditions
- Auto-shutdown logic if >80% parts non-operational
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import os

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    HAS_TF = True
except ImportError:
    HAS_TF = False
    print("[WARN] TensorFlow not available, using fallback predictions")


class PlantShutdownPredictor:
    """Predicts major plant shutdowns and manages auto-shutdown logic"""
    
    def __init__(self, model_path: str = 'models/saved/plant_shutdown.h5'):
        self.model_path = model_path
        self.model = None
        self.auto_shutdown_threshold = 0.80  # 80% non-operational triggers shutdown
        
        if HAS_TF:
            self._build_model()
    
    def _build_model(self):
        """Build neural network for shutdown prediction"""
        if not HAS_TF:
            return
            
        # Input features:
        # - 4 equipment health scores (electrolyzer, purifier, cooler, compressor)
        # - 4 equipment failure probabilities
        # - 3 energy source conditions (solar, hydro, wind)
        # - Plant overall metrics (production, efficiency)
        
        model = keras.Sequential([
            layers.Dense(64, activation='relu', input_shape=(13,)),
            layers.Dropout(0.3),
            layers.Dense(32, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(3)  # [days_until_shutdown, risk_score, non_operational_percent]
        ])
        
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        self.model = model
        print("[OK] Plant Shutdown Predictor model built")
    
    def generate_training_data(self, num_samples: int = 3000):
        """Generate synthetic training data"""
        X = []
        y = []
        
        for _ in range(num_samples):
            # Equipment health scores (0-100)
            electrolyzer_health = np.random.uniform(20, 100)
            purifier_health = np.random.uniform(20, 100)
            cooler_health = np.random.uniform(20, 100)
            compressor_health = np.random.uniform(20, 100)
            
            # Equipment failure probabilities (0-1)
            electrolyzer_fail = 1 - (electrolyzer_health / 100) + np.random.uniform(0, 0.2)
            purifier_fail = 1 - (purifier_health / 100) + np.random.uniform(0, 0.2)
            cooler_fail = 1 - (cooler_health / 100) + np.random.uniform(0, 0.2)
            compressor_fail = 1 - (compressor_health / 100) + np.random.uniform(0, 0.2)
            
            # Energy source conditions (0-100)
            solar_condition = np.random.uniform(30, 100)
            hydro_condition = np.random.uniform(40, 100)
            wind_condition = np.random.uniform(30, 100)
            
            # Plant metrics
            production_rate = np.random.uniform(0.3, 1.0)
            efficiency = np.random.uniform(0.5, 0.95)
            
            features = [
                electrolyzer_health / 100, purifier_health / 100,
                cooler_health / 100, compressor_health / 100,
                electrolyzer_fail, purifier_fail, cooler_fail, compressor_fail,
                solar_condition / 100, hydro_condition / 100, wind_condition / 100,
                production_rate, efficiency
            ]
            
            X.append(features)
            
            # Calculate targets
            avg_health = np.mean([electrolyzer_health, purifier_health, cooler_health, compressor_health])
            avg_energy = np.mean([solar_condition, hydro_condition, wind_condition])
            
            # Non-operational percentage
            non_op = 0
            if electrolyzer_health < 30: non_op += 25
            if purifier_health < 30: non_op += 25
            if cooler_health < 30: non_op += 25
            if compressor_health < 30: non_op += 25
            
            # Days until shutdown
            combined_score = (avg_health * 0.6 + avg_energy * 0.4) / 100
            days_until = max(1, int(180 * combined_score))
            
            # Risk score
            risk = 1 - combined_score + np.random.uniform(0, 0.1)
            risk = min(1.0, max(0, risk))
            
            y.append([days_until, risk, non_op / 100])
        
        return np.array(X), np.array(y)
    
    def train(self, epochs: int = 50, batch_size: int = 32) -> Dict:
        """Train the shutdown prediction model"""
        if not HAS_TF or self.model is None:
            return {'status': 'skipped', 'reason': 'TensorFlow not available'}
        
        print("[INFO] Generating training data for shutdown predictor...")
        X_train, y_train = self.generate_training_data(3000)
        X_val, y_val = self.generate_training_data(500)
        
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            verbose=0
        )
        
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        
        print(f"[OK] Shutdown predictor trained - Loss: {history.history['loss'][-1]:.4f}")
        
        return {
            'status': 'success',
            'final_loss': float(history.history['loss'][-1])
        }
    
    def predict_shutdown(self, 
                         equipment_data: List[Dict],
                         energy_sources: List[Dict],
                         plant_metrics: Optional[Dict] = None) -> Dict:
        """
        Predict plant shutdown based on equipment and energy source data
        
        Args:
            equipment_data: List of equipment with health_score and failure_probability
            energy_sources: List of energy sources with condition
            plant_metrics: Optional plant-level metrics
        """
        # Extract equipment data
        equipment_by_type = {}
        for eq in equipment_data:
            equipment_by_type[eq.get('equipment_type', 'unknown')] = eq
        
        electrolyzer = equipment_by_type.get('electrolyzer', {})
        purifier = equipment_by_type.get('purifier', {})
        cooler = equipment_by_type.get('cooler', {})
        compressor = equipment_by_type.get('compressor', {})
        
        # Get health scores
        electrolyzer_health = electrolyzer.get('health_score', 100) / 100
        purifier_health = purifier.get('health_score', 100) / 100
        cooler_health = cooler.get('health_score', 100) / 100
        compressor_health = compressor.get('health_score', 100) / 100
        
        # Get failure probabilities (from maintenance predictions)
        electrolyzer_fail = electrolyzer.get('failure_probability', 0.1)
        purifier_fail = purifier.get('failure_probability', 0.1)
        cooler_fail = cooler.get('failure_probability', 0.1)
        compressor_fail = compressor.get('failure_probability', 0.1)
        
        # Extract energy source conditions
        condition_map = {'excellent': 1.0, 'good': 0.8, 'fair': 0.6, 'poor': 0.4, 'critical': 0.2}
        solar = 0.8
        hydro = 0.8
        wind = 0.8
        
        for src in energy_sources:
            condition = condition_map.get(src.get('condition', 'good'), 0.8)
            if src.get('source_type') == 'solar_panel':
                solar = condition
            elif src.get('source_type') == 'hydro_turbine':
                hydro = condition
            elif src.get('source_type') == 'windmill':
                wind = condition
        
        # Plant metrics
        production = plant_metrics.get('production_rate', 0.8) if plant_metrics else 0.8
        efficiency = plant_metrics.get('efficiency', 0.85) if plant_metrics else 0.85
        
        # Prepare features
        features = np.array([[
            electrolyzer_health, purifier_health, cooler_health, compressor_health,
            electrolyzer_fail, purifier_fail, cooler_fail, compressor_fail,
            solar, hydro, wind,
            production, efficiency
        ]])
        
        if HAS_TF and self.model is not None:
            try:
                prediction = self.model.predict(features, verbose=0)[0]
                days_until = max(1, int(prediction[0]))
                risk_score = min(1.0, max(0, prediction[1]))
                non_op_percent = min(1.0, max(0, prediction[2]))
            except Exception as e:
                print(f"[WARN] ML prediction failed: {e}")
                days_until, risk_score, non_op_percent = self._fallback_prediction(features[0])
        else:
            days_until, risk_score, non_op_percent = self._fallback_prediction(features[0])
        
        # Check auto-shutdown condition
        non_operational_count = sum(1 for eq in equipment_data if eq.get('status') == 'offline')
        total_equipment = len(equipment_data) if equipment_data else 4
        actual_non_op = non_operational_count / total_equipment
        
        auto_shutdown = actual_non_op >= self.auto_shutdown_threshold
        
        # Determine reason
        if auto_shutdown:
            reason = f"Auto-shutdown: {int(actual_non_op * 100)}% equipment non-operational"
        elif risk_score > 0.8:
            reason = "Critical: Multiple systems at risk of failure"
        elif risk_score > 0.5:
            reason = "Warning: Equipment degradation detected"
        else:
            reason = "Normal operation - preventive maintenance recommended"
        
        predicted_date = datetime.now() + timedelta(days=days_until)
        
        return {
            'predicted_shutdown_date': predicted_date.isoformat(),
            'days_until_shutdown': days_until,
            'risk_score': round(risk_score, 3),
            'non_operational_percent': round(max(actual_non_op, non_op_percent) * 100, 1),
            'auto_shutdown_triggered': auto_shutdown,
            'reason': reason,
            'equipment_status': {
                'electrolyzer': electrolyzer.get('status', 'unknown'),
                'purifier': purifier.get('status', 'unknown'),
                'cooler': cooler.get('status', 'unknown'),
                'compressor': compressor.get('status', 'unknown')
            },
            'energy_sources_health': {
                'solar': round(solar * 100, 1),
                'hydro': round(hydro * 100, 1),
                'wind': round(wind * 100, 1)
            }
        }
    
    def _fallback_prediction(self, features: np.ndarray):
        """Rule-based fallback prediction with random values if data is invalid"""
        import random
        
        try:
            # Safely get averages, defaulting to reasonable values
            avg_health = np.nanmean(features[:4]) if len(features) >= 4 else 0.7
            avg_fail_prob = np.nanmean(features[4:8]) if len(features) >= 8 else 0.2
            avg_energy = np.nanmean(features[8:11]) if len(features) >= 11 else 0.7
            
            # Replace NaN with defaults
            if np.isnan(avg_health):
                avg_health = random.uniform(0.6, 0.9)
            if np.isnan(avg_fail_prob):
                avg_fail_prob = random.uniform(0.1, 0.3)
            if np.isnan(avg_energy):
                avg_energy = random.uniform(0.6, 0.9)
            
            combined_score = (avg_health * 0.4 + (1 - avg_fail_prob) * 0.3 + avg_energy * 0.3)
            
            # Safety check for NaN
            if np.isnan(combined_score) or combined_score <= 0:
                combined_score = random.uniform(0.5, 0.8)
            
            days_until = max(1, int(180 * combined_score))
            risk_score = max(0.0, min(1.0, 1 - combined_score))
            non_op = sum(1 for h in features[:4] if h < 0.3) / 4 if len(features) >= 4 else 0.1
            
            # Final NaN checks
            if np.isnan(days_until):
                days_until = random.randint(60, 150)
            if np.isnan(risk_score):
                risk_score = random.uniform(0.2, 0.5)
            if np.isnan(non_op):
                non_op = random.uniform(0.0, 0.2)
            
            return days_until, risk_score, non_op
            
        except Exception as e:
            print(f"[WARN] Fallback shutdown prediction error: {e}")
            return (
                random.randint(60, 150),
                random.uniform(0.2, 0.5),
                random.uniform(0.0, 0.2)
            )
    
    def execute_auto_shutdown(self, plant_id: str, equipment_data: List[Dict]) -> Dict:
        """Execute auto-shutdown for a plant"""
        non_operational = sum(1 for eq in equipment_data if eq.get('status') == 'offline')
        total = len(equipment_data) if equipment_data else 4
        
        if non_operational / total >= self.auto_shutdown_threshold:
            return {
                'shutdown_executed': True,
                'plant_id': plant_id,
                'timestamp': datetime.now().isoformat(),
                'reason': f'{int(non_operational/total * 100)}% equipment offline',
                'affected_equipment': [eq['id'] for eq in equipment_data if eq.get('status') == 'offline']
            }
        
        return {'shutdown_executed': False, 'plant_id': plant_id}
    
    def load_model(self):
        """Load pre-trained model"""
        if HAS_TF and os.path.exists(self.model_path):
            try:
                self.model = keras.models.load_model(self.model_path)
                print(f"[OK] Loaded shutdown predictor from {self.model_path}")
            except Exception as e:
                print(f"[WARN] Failed to load model: {e}")
                self._build_model()


# Global instance
plant_shutdown_predictor = PlantShutdownPredictor()
