import numpy as np
from typing import Dict, List
import json
import os

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    HAS_TF = True
except ImportError:
    HAS_TF = False


class SafetyMonitor:
    def __init__(self, model_path='models/saved/safety_pinn.h5'):
        self.model_path = model_path
        self.model = None
        
        self.thresholds = {
            'pressure': {'min': 1, 'max': 30, 'critical': 35}, 
            'temperature': {'min': 15, 'max': 80, 'critical': 90}, 
            'flow_rate': {'min': 0.5, 'max': 50, 'critical': 60}, 
            'current': {'min': 100, 'max': 5000, 'critical': 6000},  
        }
        
        if HAS_TF and os.path.exists(model_path):
            self.load_model()
        elif HAS_TF:
            self.build_model()
    
    def build_model(self):
        if not HAS_TF:
            return
        
        inputs = layers.Input(shape=(4,))
        
        x = layers.Dense(64, activation='tanh')(inputs)
        x = layers.Dense(64, activation='tanh')(x)
        x = layers.Dense(32, activation='tanh')(x)
        
        safety_score = layers.Dense(1, activation='sigmoid', name='safety_score')(x)
        anomaly = layers.Dense(1, activation='sigmoid', name='anomaly')(x)
        
        self.model = keras.Model(inputs=inputs, outputs=[safety_score, anomaly])
        
        self.model.compile(
            optimizer='adam',
            loss={'safety_score': 'mse', 'anomaly': 'binary_crossentropy'},
            metrics={'safety_score': 'mae', 'anomaly': 'accuracy'}
        )
        
        print("[OK] Physics-Informed Safety Monitor built  successfully")
    
    def generate_training_data(self, num_samples=2000):
        np.random.seed(42)
        
        X_data = []
        y_safety = []
        y_anomaly = []
        
        for _ in range(num_samples):
            if np.random.random() < 0.8:
                pressure = np.random.uniform(5, 25) 
                temperature = np.random.uniform(25, 70) 
                flow_rate = np.random.uniform(5, 40)
                current = np.random.uniform(500, 4000) 
                
                safety = 1.0 - (pressure / 30 + temperature / 90) / 2
                anomaly_flag = 0
            else:
                pressure = np.random.uniform(28, 40)
                temperature = np.random.uniform(75, 100)
                flow_rate = np.random.uniform(45, 70)
                current = np.random.uniform(5000, 7000)
                
                safety = 0.3 * np.random.random()
                anomaly_flag = 1
            
            X_data.append([pressure, temperature, flow_rate, current])
            y_safety.append(safety)
            y_anomaly.append(anomaly_flag)
        
        return np.array(X_data), np.array(y_safety), np.array(y_anomaly)
    
    def train(self, epochs=80, batch_size=32):
        if not HAS_TF:
            print("[WARN]  TensorFlow not available")
            return
        
        print("🔄 Generating enhanced safety training data...")
        X, y_safety, y_anomaly = self.generate_training_data(num_samples=3000)
        
        print(f"[DATA] Training data: {X.shape[0]} samples")
        print("🎓 Training Physics-Informed Safety Monitor...")
        print(f"   Target: 80%+ anomaly detection accuracy")
        
        early_stop = keras.callbacks.EarlyStopping(
            monitor='val_anomaly_accuracy',
            patience=10,
            restore_best_weights=True,
            mode='max'
        )
        
        history = self.model.fit(
            X, {'safety_score': y_safety, 'anomaly': y_anomaly},
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
            callbacks=[early_stop],
            verbose=1
        )
        
        val_accuracy = max(history.history['val_anomaly_accuracy']) * 100
        val_loss = min(history.history['val_loss'])
        
        print(f"\n[OK] Safety model training completed!")
        print(f"   Validation Anomaly Accuracy: {val_accuracy:.1f}%")
        print(f"   Validation Loss: {val_loss:.4f}")
        
        if val_accuracy >= 80:
            print(f"   🎯 Target accuracy achieved!")
        else:
            print(f"   [WARN]  Accuracy: {val_accuracy:.1f}%, consider retraining")
        
        self.save_model()
        return history, val_accuracy
    
    def check_safety(self, machine_data: Dict) -> Dict:
        pressure = machine_data.get('pressure', 15)
        temperature = machine_data.get('temperature', 50)
        flow_rate = machine_data.get('flowRate', 20)
        current = machine_data.get('current', 2000)
        
        alerts = []
        safety_level = 'SAFE'
        
        for param, value in [
            ('pressure', pressure),
            ('temperature', temperature),
            ('flow_rate', flow_rate),
            ('current', current)
        ]:
            thresh = self.thresholds[param]
            
            if value > thresh['critical'] or value < thresh['min']:
                alerts.append(f'{param.upper()} CRITICAL: {value}')
                safety_level = 'CRITICAL'
            elif value > thresh['max']:
                alerts.append(f'{param.upper()} WARNING: {value}')
                if safety_level == 'SAFE':
                    safety_level = 'WARNING'
        
        if HAS_TF and self.model:
            X = np.array([[pressure, temperature, flow_rate, current]])
            safety_score, anomaly = self.model.predict(X, verbose=0)
            safety_score = float(safety_score[0][0])
            anomaly_prob = float(anomaly[0][0])
        else:
            safety_score = 1.0 - max(
                (pressure - 15) / 20,
                (temperature - 40) / 50,
                0
            )
            anomaly_prob = 0.1 if len(alerts) > 0 else 0.01
        
        return {
            'safety_level': safety_level,
            'safety_score': max(0, min(1, safety_score)),
            'anomaly_probability': anomaly_prob,
            'alerts': alerts,
            'recommendations': self._get_recommendations(safety_level, alerts),
            'physics_check': 'PASS' if safety_level != 'CRITICAL' else 'FAIL'
        }
    
    def _get_recommendations(self, level: str, alerts: List[str]) -> List[str]:
        recs = []
        
        if level == 'CRITICAL':
            recs.append("🚨 IMMEDIATE ACTION REQUIRED! Initiate emergency shutdown protocol.")
        elif level == 'WARNING':
            recs.append("[WARN]  Reduce operational load and monitor closely.")
        
        for alert in alerts:
            if 'PRESSURE' in alert:
                recs.append("Check pressure relief valves and reduce flow rate.")
            elif 'TEMPERATURE' in alert:
                recs.append("Increase cooling system capacity and reduce load.")
            elif 'FLOW' in alert:
                recs.append("Inspect flow meters and adjust compressor settings.")
            elif 'CURRENT' in alert:
                recs.append("Reduce electrolyzer load and inspect electrical connections.")
        
        return recs
    
    def save_model(self):
        if not HAS_TF or not self.model:
            return
        
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        print(f"💾 Safety model saved to {self.model_path}")
    
    def load_model(self):
        if not HAS_TF:
            return
        
        try:
            self.model = keras.models.load_model(self.model_path)
            print(f"[OK] Safety model loaded from {self.model_path}")
        except Exception as e:
            print(f"[WARN]  Could not load model: {e}")
            self.build_model()


safety_monitor = SafetyMonitor()
