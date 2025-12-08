import numpy as np
import os
from typing import Dict, List, Tuple, Optional
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
    print("[WARN] TensorFlow not available for StorageAnomalyDetector")

try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False


class StorageAnomalyDetector:
    def __init__(self, model_path: str = 'models/saved/storage_anomaly_lstm.h5'):
        self.model_path = model_path
        self.model = None
        self.scaler_params = None
        self.threshold = 0.1 
        self.sequence_length = 10 
        self.n_features = 4 
        
        self.supabase: Optional[Client] = None
        self._init_supabase()
        
        if HAS_TF:
            if os.path.exists(model_path):
                self.load_model()
            else:
                self.build_model()
    
    def _init_supabase(self):
        if not HAS_SUPABASE:
            return
        
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
        
        if url and key:
            self.supabase = create_client(url, key)
    
    def build_model(self):
        if not HAS_TF:
            return
        
        inputs = layers.Input(shape=(self.sequence_length, self.n_features))
        
        x = layers.LSTM(64, activation='relu', return_sequences=True)(inputs)
        x = layers.LSTM(32, activation='relu', return_sequences=False)(x)
        
        latent = layers.Dense(16, activation='relu', name='latent_space')(x)
        
        x = layers.RepeatVector(self.sequence_length)(latent)
        
        x = layers.LSTM(32, activation='relu', return_sequences=True)(x)
        x = layers.LSTM(64, activation='relu', return_sequences=True)(x)
        
        outputs = layers.TimeDistributed(layers.Dense(self.n_features))(x)
        
        self.model = Model(inputs=inputs, outputs=outputs, name='StorageAnomalyLSTM')
        
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        
        print("[OK] Storage Anomaly Detector LSTM Autoencoder built")
        print(f"   Input shape: ({self.sequence_length}, {self.n_features})")
        print(f"   Latent space: 16 dimensions")
    
    def fetch_training_data(self, days: int = 30) -> Optional[np.ndarray]:
        if not self.supabase:
            print("[WARN] Supabase not initialized, using synthetic data")
            return None
        
        try:
            containers_response = self.supabase.table('containers').select('id').execute()
            containers = containers_response.data
            
            if not containers:
                print("[WARN] No containers found")
                return None
            
            all_sequences = []
            
            for container in containers:
                container_id = container['id']
                
                readings_response = self.supabase.table('storage_sensor_readings') \
                    .select('*') \
                    .eq('container_id', container_id) \
                    .order('timestamp', desc=True) \
                    .limit(500) \
                    .execute()
                
                readings = readings_response.data
                
                if len(readings) < self.sequence_length:
                    continue
                
                time_groups = {}
                for r in readings:
                    ts = r['timestamp']
                    if ts not in time_groups:
                        time_groups[ts] = {}
                    time_groups[ts][r['sensor_type']] = r['value']
                
                data_points = []
                for ts in sorted(time_groups.keys()):
                    point = time_groups[ts]
                    data_points.append([
                        point.get('pressure', 350),
                        point.get('temperature', 25),
                        point.get('level', 50),
                        point.get('purity', 99.9)
                    ])
                
                for i in range(len(data_points) - self.sequence_length):
                    seq = data_points[i:i + self.sequence_length]
                    all_sequences.append(seq)
            
            if all_sequences:
                print(f"[OK] Fetched {len(all_sequences)} sequences from Supabase")
                return np.array(all_sequences)
            
            return None
            
        except Exception as e:
            print(f"[ERROR] Error fetching training data: {e}")
            return None
    
    def generate_synthetic_data(self, n_samples: int = 5000) -> Tuple[np.ndarray, np.ndarray]:
        np.random.seed(42)
        
        normal_sequences = []
        anomaly_sequences = []
        
        for _ in range(int(n_samples * 0.8)):
            seq = []
            pressure = np.random.uniform(340, 360)
            temperature = np.random.uniform(20, 35)
            level = np.random.uniform(40, 80)
            purity = np.random.uniform(99.9, 99.99)
            
            for t in range(self.sequence_length):
                pressure += np.random.normal(0, 0.5)
                temperature += np.random.normal(0, 0.2)
                level += np.random.normal(0, 0.3)
                purity += np.random.normal(0, 0.001)
                
                pressure = np.clip(pressure, 330, 370)
                temperature = np.clip(temperature, 15, 45)
                level = np.clip(level, 10, 95)
                purity = np.clip(purity, 99.5, 99.999)
                
                seq.append([pressure, temperature, level, purity])
            
            normal_sequences.append(seq)
        
        for _ in range(int(n_samples * 0.2)):
            seq = []
            anomaly_type = np.random.choice(['pressure_spike', 'temp_anomaly', 'leak', 'purity_drop'])
            anomaly_start = np.random.randint(3, self.sequence_length - 2)
            
            pressure = np.random.uniform(340, 360)
            temperature = np.random.uniform(20, 35)
            level = np.random.uniform(40, 80)
            purity = np.random.uniform(99.9, 99.99)
            
            for t in range(self.sequence_length):
                if t >= anomaly_start:
                    if anomaly_type == 'pressure_spike':
                        pressure += np.random.uniform(5, 15)
                    elif anomaly_type == 'temp_anomaly':
                        temperature += np.random.uniform(3, 10)
                    elif anomaly_type == 'leak':
                        level -= np.random.uniform(2, 5)
                    elif anomaly_type == 'purity_drop':
                        purity -= np.random.uniform(0.1, 0.5)
                else:
                    pressure += np.random.normal(0, 0.5)
                    temperature += np.random.normal(0, 0.2)
                    level += np.random.normal(0, 0.3)
                    purity += np.random.normal(0, 0.001)
                
                seq.append([pressure, temperature, level, purity])
            
            anomaly_sequences.append(seq)
        
        X_normal = np.array(normal_sequences)
        X_anomaly = np.array(anomaly_sequences)
        
        return X_normal, X_anomaly
    
    def normalize_data(self, X: np.ndarray, fit: bool = False) -> np.ndarray:
        if fit:
            self.scaler_params = {
                'min': X.min(axis=(0, 1)),
                'max': X.max(axis=(0, 1))
            }
        
        if self.scaler_params is None:
            self.scaler_params = {
                'min': np.array([300, 0, 0, 99]),
                'max': np.array([400, 100, 100, 100])
            }
        
        X_norm = (X - self.scaler_params['min']) / (self.scaler_params['max'] - self.scaler_params['min'] + 1e-8)
        return X_norm
    
    def train(self, epochs: int = 50, batch_size: int = 32) -> Dict:
        if not HAS_TF:
            print("[WARN] TensorFlow not available")
            return {'success': False, 'error': 'TensorFlow not available'}
        
        print("[INFO] Training Storage Anomaly Detector...")
        
        real_data = self.fetch_training_data()
        
        if real_data is not None and len(real_data) > 100:
            print(f"   Using {len(real_data)} real sequences from Supabase")
            X_train = real_data
            X_normal, X_anomaly = X_train, None
        else:
            print("   Using synthetic data for training")
            X_normal, X_anomaly = self.generate_synthetic_data(n_samples=10000)
            X_train = X_normal  
        
        X_train_norm = self.normalize_data(X_train, fit=True)
        
        early_stop = EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )
        
        history = self.model.fit(
            X_train_norm, X_train_norm,  
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
            callbacks=[early_stop],
            verbose=1
        )
        
        reconstructions = self.model.predict(X_train_norm, verbose=0)
        mse = np.mean(np.power(X_train_norm - reconstructions, 2), axis=(1, 2))
        self.threshold = np.percentile(mse, 95)  
        
        val_loss = min(history.history['val_loss'])
        
        print(f"\n[OK] Training completed!")
        print(f"   Validation Loss: {val_loss:.6f}")
        print(f"   Anomaly Threshold: {self.threshold:.6f}")
        
        self.save_model()
        
        return {
            'success': True,
            'val_loss': val_loss,
            'threshold': self.threshold,
            'epochs_trained': len(history.history['loss'])
        }
    
    def detect_anomaly(self, sensor_data: Dict) -> Dict:
        if not HAS_TF or self.model is None:
            return self._fallback_detection(sensor_data)
        
        try:
            container_id = sensor_data.get('container_id')
            
            if self.supabase and container_id:
                readings = self._fetch_recent_readings(container_id)
            else:
                readings = sensor_data.get('readings', [])
            
            if len(readings) < self.sequence_length:
                if readings:
                    while len(readings) < self.sequence_length:
                        readings.insert(0, readings[0])
                else:
                    return {'is_anomaly': False, 'anomaly_score': 0, 'message': 'Insufficient data'}
            
            sequence = np.array([readings[-self.sequence_length:]])
            sequence_norm = self.normalize_data(sequence)
            
            reconstruction = self.model.predict(sequence_norm, verbose=0)
            
            mse = np.mean(np.power(sequence_norm - reconstruction, 2), axis=(1, 2))[0]
            
            is_anomaly = mse > self.threshold
            anomaly_score = min(1.0, mse / (self.threshold * 2))
            
            feature_errors = np.mean(np.power(sequence_norm - reconstruction, 2), axis=1)[0]
            feature_names = ['pressure', 'temperature', 'level', 'purity']
            anomalous_features = [
                feature_names[i] for i, err in enumerate(feature_errors)
                if err > np.mean(feature_errors) + np.std(feature_errors)
            ]
            
            result = {
                'is_anomaly': bool(is_anomaly),
                'anomaly_score': float(anomaly_score),
                'reconstruction_error': float(mse),
                'threshold': float(self.threshold),
                'anomalous_sensors': anomalous_features,
                'confidence': float(1 - mse / (self.threshold * 3)) if mse < self.threshold * 3 else 0.1,
                'timestamp': datetime.now().isoformat()
            }
            
            if is_anomaly and self.supabase and container_id:
                self._create_alert(container_id, result)
            
            return result
            
        except Exception as e:
            print(f"[ERROR] Error in anomaly detection: {e}")
            return self._fallback_detection(sensor_data)
    
    def _fetch_recent_readings(self, container_id: str) -> List[List[float]]:
        try:
            response = self.supabase.table('storage_sensor_readings') \
                .select('*') \
                .eq('container_id', container_id) \
                .order('timestamp', desc=True) \
                .limit(50) \
                .execute()
            
            readings = response.data
            
            time_groups = {}
            for r in readings:
                ts = r['timestamp']
                if ts not in time_groups:
                    time_groups[ts] = {}
                time_groups[ts][r['sensor_type']] = r['value']
            
            data_points = []
            for ts in sorted(time_groups.keys()):
                point = time_groups[ts]
                data_points.append([
                    point.get('pressure', 350),
                    point.get('temperature', 25),
                    point.get('level', 50),
                    point.get('purity', 99.9)
                ])
            
            return data_points
            
        except Exception as e:
            print(f"Error fetching readings: {e}")
            return []
    
    def _create_alert(self, container_id: str, result: Dict):
        try:
            existing = self.supabase.table('storage_alerts') \
                .select('id') \
                .eq('container_id', container_id) \
                .eq('status', 'open') \
                .execute()
            
            if existing.data and len(existing.data) > 0:
                print(f"[INFO] Container {container_id} already has an open alert - skipping duplicate")
                return
            
            alert_data = {
                'container_id': container_id,
                'alert_type': 'anomaly_detected',
                'severity': 'high' if result['anomaly_score'] > 0.7 else 'medium',
                'title': f"Anomaly detected in {', '.join(result['anomalous_sensors']) or 'sensors'}",
                'description': f"ML model detected abnormal patterns. Score: {result['anomaly_score']:.2f}",
                'status': 'open'
            }
            
            self.supabase.table('storage_alerts').insert(alert_data).execute()
            print(f"[WARN] Alert created for container {container_id}")
            
        except Exception as e:
            print(f"Error creating alert: {e}")
    
    def _fallback_detection(self, sensor_data: Dict) -> Dict:
        readings = sensor_data.get('readings', [])
        
        if not readings:
            return {'is_anomaly': False, 'anomaly_score': 0, 'message': 'No data provided'}
        
        last_reading = readings[-1] if readings else [350, 25, 50, 99.9]
        pressure, temperature, level, purity = last_reading
        
        anomalies = []
        score = 0
        
        if pressure > 380 or pressure < 300:
            anomalies.append('pressure')
            score += 0.3
        if temperature > 50 or temperature < 10:
            anomalies.append('temperature')
            score += 0.3
        if level < 15 or level > 95:
            anomalies.append('level')
            score += 0.2
        if purity < 99.5:
            anomalies.append('purity')
            score += 0.2
        
        return {
            'is_anomaly': score > 0.3,
            'anomaly_score': min(1.0, score),
            'anomalous_sensors': anomalies,
            'confidence': 0.6,
            'method': 'rule_based',
            'timestamp': datetime.now().isoformat()
        }
    
    def save_model(self):
        if not HAS_TF or self.model is None:
            return
        
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        
        params_path = self.model_path.replace('.h5', '_params.json')
        with open(params_path, 'w') as f:
            json.dump({
                'threshold': float(self.threshold),
                'scaler_min': self.scaler_params['min'].tolist() if self.scaler_params else None,
                'scaler_max': self.scaler_params['max'].tolist() if self.scaler_params else None
            }, f)
        
        print(f"[OK] Anomaly detector saved to {self.model_path}")
    
    def load_model(self):
        if not HAS_TF:
            return
        
        try:
            self.model = keras.models.load_model(self.model_path)
            
            params_path = self.model_path.replace('.h5', '_params.json')
            if os.path.exists(params_path):
                with open(params_path, 'r') as f:
                    params = json.load(f)
                    self.threshold = params.get('threshold', 0.1)
                    if params.get('scaler_min'):
                        self.scaler_params = {
                            'min': np.array(params['scaler_min']),
                            'max': np.array(params['scaler_max'])
                        }
            
            print(f"[OK] Anomaly detector loaded from {self.model_path}")
            
        except Exception as e:
            print(f"[WARN] Could not load model: {e}")
            self.build_model()


storage_anomaly_detector = StorageAnomalyDetector()
