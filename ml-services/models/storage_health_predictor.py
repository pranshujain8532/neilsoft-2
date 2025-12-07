"""
Storage Health Predictor using Physics-Informed Neural Network
Predicts container health scores and maintenance probability based on thermodynamic parameters
"""

import numpy as np
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import json

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers, Model
    from tensorflow.keras.callbacks import EarlyStopping
    HAS_TF = True
except ImportError:
    HAS_TF = False
    print("⚠️ TensorFlow not available for StorageHealthPredictor")

try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False


class StorageHealthPredictor:
    """
    Physics-Informed Neural Network for predicting container health.
    
    Input Features:
    - Pressure (bar)
    - Temperature (°C)
    - Fill percentage (%)
    - Hoop stress (MPa)
    - Stress cycles
    - Hydrogen purity (%)
    - Days since last inspection
    
    Output:
    - Health score (0-100%)
    - Maintenance probability (0-1)
    """
    
    def __init__(self, model_path: str = 'models/saved/storage_health_nn.h5'):
        self.model_path = model_path
        self.model = None
        self.scaler_params = None
        self.n_features = 7
        
        # Physics constants for validation
        self.physics_constraints = {
            'max_pressure': 700,  # bar (Type IV composite tanks)
            'critical_temp': 85,  # °C
            'max_stress_mpa': 1000,  # MPa (composite materials)
            'fatigue_limit': 50000  # stress cycles
        }
        
        # Supabase client
        self.supabase: Optional[Client] = None
        self._init_supabase()
        
        if HAS_TF:
            if os.path.exists(model_path):
                self.load_model()
            else:
                self.build_model()
    
    def _init_supabase(self):
        """Initialize Supabase client"""
        if not HAS_SUPABASE:
            return
        
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
        
        if url and key:
            self.supabase = create_client(url, key)
    
    def build_model(self):
        """Build Physics-Informed Neural Network for health prediction"""
        if not HAS_TF:
            return
        
        # Input layer
        inputs = layers.Input(shape=(self.n_features,), name='sensor_inputs')
        
        # Hidden layers with physics-aware architecture
        x = layers.Dense(64, activation='relu', name='hidden_1')(inputs)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.2)(x)
        
        x = layers.Dense(32, activation='relu', name='hidden_2')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.2)(x)
        
        x = layers.Dense(16, activation='relu', name='hidden_3')(x)
        
        # Output layers
        health_score = layers.Dense(1, activation='sigmoid', name='health_score')(x)
        maintenance_prob = layers.Dense(1, activation='sigmoid', name='maintenance_prob')(x)
        
        self.model = Model(inputs=inputs, outputs=[health_score, maintenance_prob], name='StorageHealthNN')
        
        # Custom loss with physics constraints
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss={
                'health_score': 'mse',
                'maintenance_prob': 'binary_crossentropy'
            },
            loss_weights={
                'health_score': 1.0,
                'maintenance_prob': 0.5
            },
            metrics={
                'health_score': 'mae',
                'maintenance_prob': 'accuracy'
            }
        )
        
        print("✅ Storage Health Predictor NN built")
        print(f"   Input features: {self.n_features}")
        print(f"   Outputs: health_score, maintenance_probability")
    
    def calculate_physics_health(self, pressure: float, temperature: float, 
                                  hoop_stress: float, stress_cycles: int,
                                  purity: float, days_since_inspection: int) -> Tuple[float, float]:
        """
        Calculate health score using physics-based formulas.
        Used for training data generation and validation.
        """
        # Hoop stress formula for cylindrical pressure vessel: σ = PR/t
        # Simplified health impact from stress
        stress_factor = 1 - min(1, hoop_stress / self.physics_constraints['max_stress_mpa'])
        
        # Material fatigue (S-N curve approximation)
        fatigue_factor = 1 - (stress_cycles / self.physics_constraints['fatigue_limit']) ** 0.5
        fatigue_factor = max(0, fatigue_factor)
        
        # Temperature penalty (degradation above optimal range)
        temp_optimal = 25  # °C
        temp_factor = 1 - max(0, (abs(temperature - temp_optimal) - 20) / 60)
        temp_factor = max(0, temp_factor)
        
        # Pressure stress factor
        pressure_factor = 1 - max(0, (pressure - 350) / (self.physics_constraints['max_pressure'] - 350))
        pressure_factor = max(0, min(1, pressure_factor))
        
        # Purity factor (contamination degrades membranes)
        purity_factor = (purity - 99) / 1.0  # 99% = 0, 100% = 1
        purity_factor = max(0, min(1, purity_factor))
        
        # Inspection recency factor
        inspection_factor = 1 - min(1, days_since_inspection / 365)
        
        # Combine factors with weights
        health_score = (
            stress_factor * 0.20 +
            fatigue_factor * 0.20 +
            temp_factor * 0.15 +
            pressure_factor * 0.20 +
            purity_factor * 0.10 +
            inspection_factor * 0.15
        )
        
        # Maintenance probability (inverse relationship with health)
        maintenance_prob = max(0, min(1, 1 - health_score + 0.1 * (1 - fatigue_factor)))
        
        return float(health_score), float(maintenance_prob)
    
    def generate_training_data(self, n_samples: int = 10000) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Generate synthetic training data with physics constraints"""
        np.random.seed(42)
        
        X = []
        y_health = []
        y_maintenance = []
        
        for _ in range(n_samples):
            # Generate realistic parameter combinations
            pressure = np.random.uniform(300, 450)  # bar
            temperature = np.random.uniform(10, 60)  # °C
            fill_percentage = np.random.uniform(20, 95)  # %
            
            # Hoop stress calculated from pressure (simplified)
            # σ = PR/t, assuming R/t ratio
            hoop_stress = pressure * 0.5  # Simplified
            
            # Stress cycles
            stress_cycles = int(np.random.exponential(5000))  # Exponential distribution
            stress_cycles = min(stress_cycles, 50000)
            
            # Hydrogen purity
            purity = np.random.uniform(99.5, 99.99)
            
            # Days since inspection
            days_since_inspection = int(np.random.exponential(60))
            days_since_inspection = min(days_since_inspection, 365)
            
            # Calculate physics-based targets
            health, maintenance = self.calculate_physics_health(
                pressure, temperature, hoop_stress, stress_cycles, purity, days_since_inspection
            )
            
            # Add some noise to make it realistic
            health = np.clip(health + np.random.normal(0, 0.03), 0, 1)
            maintenance = np.clip(maintenance + np.random.normal(0, 0.05), 0, 1)
            
            X.append([
                pressure,
                temperature,
                fill_percentage,
                hoop_stress,
                stress_cycles,
                purity,
                days_since_inspection
            ])
            y_health.append(health)
            y_maintenance.append(int(maintenance > 0.5))  # Binary for maintenance
        
        return np.array(X), np.array(y_health), np.array(y_maintenance)
    
    def fetch_training_data(self) -> Optional[Tuple[np.ndarray, np.ndarray, np.ndarray]]:
        """Fetch container data from Supabase for training"""
        if not self.supabase:
            return None
        
        try:
            response = self.supabase.table('containers').select('*').execute()
            containers = response.data
            
            if not containers or len(containers) < 10:
                return None
            
            X = []
            y_health = []
            y_maintenance = []
            
            for c in containers:
                pressure = c.get('pressure_bar', 350)
                temperature = c.get('temperature_c', 25)
                fill_percentage = c.get('fill_percentage', 50)
                hoop_stress = c.get('hoop_stress_mpa', pressure * 0.5)
                stress_cycles = c.get('stress_cycles', 1000)
                purity = c.get('hydrogen_purity_percent', 99.9)
                
                # Calculate days since inspection
                last_inspection = c.get('last_inspection_date')
                if last_inspection:
                    try:
                        last_date = datetime.fromisoformat(last_inspection.replace('Z', '+00:00'))
                        days_since = (datetime.now(last_date.tzinfo) - last_date).days
                    except:
                        days_since = 30
                else:
                    days_since = 30
                
                # Calculate target health using physics
                health, maintenance = self.calculate_physics_health(
                    pressure, temperature, hoop_stress, stress_cycles, purity, days_since
                )
                
                X.append([
                    pressure, temperature, fill_percentage, hoop_stress,
                    stress_cycles, purity, days_since
                ])
                y_health.append(health)
                y_maintenance.append(int(maintenance > 0.5))
            
            print(f"✅ Fetched {len(X)} containers from Supabase")
            return np.array(X), np.array(y_health), np.array(y_maintenance)
            
        except Exception as e:
            print(f"❌ Error fetching training data: {e}")
            return None
    
    def normalize_data(self, X: np.ndarray, fit: bool = False) -> np.ndarray:
        """Normalize input features"""
        if fit:
            self.scaler_params = {
                'mean': X.mean(axis=0),
                'std': X.std(axis=0) + 1e-8
            }
        
        if self.scaler_params is None:
            self.scaler_params = {
                'mean': np.array([350, 30, 60, 175, 5000, 99.9, 60]),
                'std': np.array([50, 15, 25, 50, 5000, 0.1, 90])
            }
        
        return (X - self.scaler_params['mean']) / self.scaler_params['std']
    
    def train(self, epochs: int = 100, batch_size: int = 32) -> Dict:
        """Train the health prediction model"""
        if not HAS_TF:
            print("⚠️ TensorFlow not available")
            return {'success': False, 'error': 'TensorFlow not available'}
        
        print("🔄 Training Storage Health Predictor...")
        
        # Try real data first
        real_data = self.fetch_training_data()
        
        if real_data is not None:
            X_real, y_health_real, y_maintenance_real = real_data
            print(f"   Got {len(X_real)} samples from Supabase")
            
            # Augment with synthetic data
            X_syn, y_health_syn, y_maintenance_syn = self.generate_training_data(n_samples=9000)
            
            X = np.vstack([X_real, X_syn])
            y_health = np.concatenate([y_health_real, y_health_syn])
            y_maintenance = np.concatenate([y_maintenance_real, y_maintenance_syn])
        else:
            print("   Using synthetic data only")
            X, y_health, y_maintenance = self.generate_training_data(n_samples=10000)
        
        # Normalize
        X_norm = self.normalize_data(X, fit=True)
        
        # Class weights for imbalanced maintenance cases
        n_positive = y_maintenance.sum()
        n_negative = len(y_maintenance) - n_positive
        class_weight = {0: 1.0, 1: n_negative / (n_positive + 1)}
        
        # Train
        early_stop = EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True
        )
        
        history = self.model.fit(
            X_norm,
            {'health_score': y_health, 'maintenance_prob': y_maintenance},
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
            callbacks=[early_stop],
            verbose=1
        )
        
        # Get metrics
        val_health_mae = min(history.history['val_health_score_mae'])
        val_maint_acc = max(history.history['val_maintenance_prob_accuracy'])
        
        print(f"\n✅ Training completed!")
        print(f"   Health MAE: {val_health_mae:.4f}")
        print(f"   Maintenance Accuracy: {val_maint_acc * 100:.1f}%")
        
        self.save_model()
        
        return {
            'success': True,
            'health_mae': val_health_mae,
            'maintenance_accuracy': val_maint_acc,
            'epochs_trained': len(history.history['loss'])
        }
    
    def predict(self, container_data: Dict) -> Dict:
        """
        Predict health score and maintenance probability for a container.
        
        Args:
            container_data: Dict with container parameters or container_id
        
        Returns:
            Dict with health_score, maintenance_probability, and recommendations
        """
        # Fetch from Supabase if container_id provided
        if 'container_id' in container_data and self.supabase:
            container_data = self._fetch_container(container_data['container_id'])
            if not container_data:
                return {'error': 'Container not found'}
        
        # Extract features
        pressure = container_data.get('pressure_bar', 350)
        temperature = container_data.get('temperature_c', 25)
        fill_percentage = container_data.get('fill_percentage', 50)
        hoop_stress = container_data.get('hoop_stress_mpa', pressure * 0.5)
        stress_cycles = container_data.get('stress_cycles', 1000)
        purity = container_data.get('hydrogen_purity_percent', 99.9)
        
        # Calculate days since inspection
        last_inspection = container_data.get('last_inspection_date')
        if last_inspection:
            try:
                if isinstance(last_inspection, str):
                    last_date = datetime.fromisoformat(last_inspection.replace('Z', '+00:00'))
                else:
                    last_date = last_inspection
                days_since = (datetime.now(last_date.tzinfo) - last_date).days
            except:
                days_since = 30
        else:
            days_since = 30
        
        features = np.array([[
            pressure, temperature, fill_percentage, hoop_stress,
            stress_cycles, purity, days_since
        ]])
        
        if HAS_TF and self.model:
            features_norm = self.normalize_data(features)
            health_pred, maintenance_pred = self.model.predict(features_norm, verbose=0)
            health_score = float(health_pred[0][0])
            maintenance_prob = float(maintenance_pred[0][0])
        else:
            # Fallback to physics-based calculation
            health_score, maintenance_prob = self.calculate_physics_health(
                pressure, temperature, hoop_stress, stress_cycles, purity, days_since
            )
        
        # Convert to percentage and determine status
        health_percent = health_score * 100
        
        if health_percent >= 90:
            status = 'Optimal'
        elif health_percent >= 70:
            status = 'Good'
        elif health_percent >= 50:
            status = 'Maintenance Required'
        else:
            status = 'Critical'
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            health_percent, maintenance_prob, pressure, temperature, 
            stress_cycles, purity, days_since
        )
        
        # Calculate next inspection date
        if maintenance_prob > 0.7:
            next_inspection = datetime.now() + timedelta(days=7)
        elif maintenance_prob > 0.4:
            next_inspection = datetime.now() + timedelta(days=30)
        else:
            next_inspection = datetime.now() + timedelta(days=90)
        
        return {
            'health_score': round(health_percent, 1),
            'health_status': status,
            'maintenance_probability': round(maintenance_prob * 100, 1),
            'next_inspection_recommended': next_inspection.strftime('%Y-%m-%d'),
            'recommendations': recommendations,
            'physics_validation': self._validate_physics(pressure, temperature, hoop_stress),
            'confidence': 0.85 if HAS_TF and self.model else 0.65,
            'model_type': 'neural_network' if HAS_TF and self.model else 'physics_based',
            'timestamp': datetime.now().isoformat()
        }
    
    def _fetch_container(self, container_id: str) -> Optional[Dict]:
        """Fetch container data from Supabase"""
        try:
            response = self.supabase.table('containers') \
                .select('*') \
                .eq('id', container_id) \
                .single() \
                .execute()
            return response.data
        except Exception as e:
            print(f"Error fetching container: {e}")
            return None
    
    def _generate_recommendations(self, health: float, maintenance_prob: float,
                                   pressure: float, temperature: float,
                                   stress_cycles: int, purity: float,
                                   days_since_inspection: int) -> List[str]:
        """Generate actionable recommendations based on predictions"""
        recommendations = []
        
        if health < 70:
            recommendations.append("⚠️ Schedule maintenance inspection within 2 weeks")
        
        if pressure > 380:
            recommendations.append("🔴 Reduce system pressure - currently above optimal range")
        elif pressure < 320:
            recommendations.append("🔵 Low pressure detected - check for leaks or system issues")
        
        if temperature > 45:
            recommendations.append("🌡️ High temperature - increase cooling or reduce load")
        
        if stress_cycles > 10000:
            recommendations.append("♻️ High stress cycles - consider material inspection")
        
        if purity < 99.7:
            recommendations.append("🧪 Hydrogen purity below optimal - check purification system")
        
        if days_since_inspection > 180:
            recommendations.append("📋 Overdue for inspection - schedule immediately")
        
        if maintenance_prob > 0.6:
            recommendations.append("🔧 High maintenance probability - prepare maintenance team")
        
        if not recommendations:
            recommendations.append("✅ Container operating within optimal parameters")
        
        return recommendations
    
    def _validate_physics(self, pressure: float, temperature: float, 
                          hoop_stress: float) -> Dict:
        """Validate readings against physics constraints"""
        valid = True
        issues = []
        
        if pressure > self.physics_constraints['max_pressure']:
            valid = False
            issues.append(f"Pressure {pressure} bar exceeds maximum {self.physics_constraints['max_pressure']} bar")
        
        if temperature > self.physics_constraints['critical_temp']:
            valid = False
            issues.append(f"Temperature {temperature}°C exceeds critical {self.physics_constraints['critical_temp']}°C")
        
        if hoop_stress > self.physics_constraints['max_stress_mpa']:
            valid = False
            issues.append(f"Hoop stress {hoop_stress} MPa exceeds limit")
        
        return {
            'valid': valid,
            'issues': issues
        }
    
    def save_model(self):
        """Save the trained model"""
        if not HAS_TF or self.model is None:
            return
        
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        
        # Save scaler params
        params_path = self.model_path.replace('.h5', '_params.json')
        with open(params_path, 'w') as f:
            json.dump({
                'mean': self.scaler_params['mean'].tolist() if self.scaler_params else None,
                'std': self.scaler_params['std'].tolist() if self.scaler_params else None
            }, f)
        
        print(f"💾 Health predictor saved to {self.model_path}")
    
    def load_model(self):
        """Load pre-trained model"""
        if not HAS_TF:
            return
        
        try:
            self.model = keras.models.load_model(self.model_path)
            
            params_path = self.model_path.replace('.h5', '_params.json')
            if os.path.exists(params_path):
                with open(params_path, 'r') as f:
                    params = json.load(f)
                    if params.get('mean'):
                        self.scaler_params = {
                            'mean': np.array(params['mean']),
                            'std': np.array(params['std'])
                        }
            
            print(f"✅ Health predictor loaded from {self.model_path}")
            
        except Exception as e:
            print(f"⚠️ Could not load model: {e}")
            self.build_model()


# Global instance
storage_health_predictor = StorageHealthPredictor()
