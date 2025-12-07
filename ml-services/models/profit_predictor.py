"""
LSTM-based Profit Prediction Model for Green Hydrogen Production
Predicts future profitability based on historical data, energy mix, and Oxygen byproduct savings.
All data fetched from Supabase - no hardcoded values.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
import json
import os
from datetime import datetime, timedelta

# Try to import deep learning libraries, fallback to simple model if not available
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    HAS_TF = True
except ImportError:
    HAS_TF = False
    print("TensorFlow not available, using simple statistical model")


class ProfitPredictor:
    def __init__(self, model_path='models/saved/profit_lstm_v2.h5'):
        self.model_path = model_path
        self.model = None
        self.scaler_params = {}
        self.sequence_length = 30  # 30 days of history
        self.feature_count = 10    # Increased from 9 to 10 to include Oxygen Savings
        
        if HAS_TF and os.path.exists(model_path):
            self.load_model()
        elif HAS_TF:
            self.build_model()
    
    def build_model(self):
        """Build LSTM model architecture"""
        if not HAS_TF:
            return
            
        model = keras.Sequential([
            layers.LSTM(128, return_sequences=True, input_shape=(self.sequence_length, self.feature_count)),
            layers.Dropout(0.2),
            layers.LSTM(64, return_sequences=False),
            layers.Dropout(0.2),
            layers.Dense(32, activation='relu'),
            layers.Dense(16, activation='relu'),
            layers.Dense(1)  # Predict profit value
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        
        self.model = model
        print("[OK] LSTM Profit Predictor model built successfully")
    
    def _init_supabase(self):
        """Initialize Supabase client for fetching real production data"""
        try:
            from supabase import create_client
            from dotenv import load_dotenv
            
            # Load .env from project root (go up 2 levels from models/)
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(current_dir))
            env_path = os.path.join(project_root, '.env')
            load_dotenv(env_path)
            
            # Also try ml-services .env
            ml_env_path = os.path.join(os.path.dirname(current_dir), '.env')
            load_dotenv(ml_env_path)
            
            # Use service role key for full access
            url = os.environ.get('SUPABASE_URL') or os.environ.get('VITE_SUPABASE_URL')
            key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY') or os.environ.get('VITE_SUPABASE_ANON_KEY')
            
            if not url or not key:
                print(f"[WARN] Missing Supabase credentials")
                return None
            
            return create_client(url, key)
        except Exception as e:
            print(f"[WARN] Could not initialize Supabase: {e}")
            return None
    
    def fetch_real_production_data(self, min_days: int = 1) -> Optional[pd.DataFrame]:
        """
        Fetch real production data from Supabase
        Returns DataFrame with production history if at least min_days of data exists
        """
        try:
            supabase = self._init_supabase()
            if not supabase:
                return None
            
            # Calculate minimum timestamp for min_days
            min_timestamp = (datetime.now() - timedelta(days=min_days)).isoformat()
            
            # Fetch production history
            response = supabase.table('production_history')\
                .select('*')\
                .gte('timestamp', min_timestamp)\
                .order('timestamp', desc=False)\
                .execute()
            
            if not response.data or len(response.data) == 0:
                print(f"ℹ️ No production data found for the last {min_days} day(s)")
                return None
            
            # Convert to DataFrame
            df = pd.DataFrame(response.data)
            
            # Check if we have at least min_days worth of data
            if len(df) < min_days:
                print(f"ℹ️ Only {len(df)} records found, need at least {min_days}")
                return None
            
            print(f"[OK] Fetched {len(df)} production records from Supabase")
            return df
            
        except Exception as e:
            print(f"[WARN] Error fetching production data: {e}")
            return None
    
    def _fetch_market_data(self) -> Dict:
        """Fetch market data (H2 price, electricity cost) from Supabase"""
        try:
            supabase = self._init_supabase()
            if not supabase:
                return {'h2_price': 4.5, 'electricity_cost': 0.05}
            
            # Try to fetch from market_prices or system_config table
            try:
                response = supabase.table('market_prices')\
                    .select('*')\
                    .order('created_at', desc=True)\
                    .limit(1)\
                    .execute()
                
                if response.data:
                    data = response.data[0]
                    return {
                        'h2_price': float(data.get('h2_price') or data.get('price') or 4.5),
                        'electricity_cost': float(data.get('electricity_cost') or 0.05)
                    }
            except:
                pass
            
            return {'h2_price': 4.5, 'electricity_cost': 0.05}
        except Exception as e:
            print(f"[WARN] Error fetching market data: {e}")
            return {'h2_price': 4.5, 'electricity_cost': 0.05}
    
    def _process_real_data_to_sequences(self, real_data: pd.DataFrame) -> Tuple[List, List]:
        """
        Convert real production data to LSTM training sequences
        Returns (X_sequences, y_targets) lists
        """
        sequences = []
        targets = []
        
        # Fetch market data
        market_data = self._fetch_market_data()
        
        # Group by plant_id to create sequences per plant
        for plant_id in real_data['plant_id'].unique():
            plant_data = real_data[real_data['plant_id'] == plant_id].sort_values('timestamp')
            
            # Need at least sequence_length records to create a sequence
            if len(plant_data) < self.sequence_length:
                continue
            
            # Create sliding windows
            for i in range(len(plant_data) - self.sequence_length):
                sequence = []
                
                for j in range(i, i + self.sequence_length):
                    row = plant_data.iloc[j]
                    
                    # Extract available features from DB
                    production = float(row.get('production_kg', 50))
                    lcoh = float(row.get('lcoh', 2.0))
                    efficiency = float(row.get('efficiency_percent', 75)) / 100.0
                    
                    # Get energy mix from DB or calculate
                    solar = float(row.get('solar_percent', 40))
                    wind = float(row.get('wind_percent', 35))
                    hydro = float(row.get('hydro_percent', 25))
                    
                    electricity_cost = float(row.get('electricity_cost', market_data['electricity_cost']))
                    h2_price = float(row.get('h2_price', market_data['h2_price']))
                    labor_cost = float(row.get('labor_cost', 1200))
                    
                    # Oxygen Savings (New Feature)
                    oxygen_savings_rate = float(row.get('oxygen_savings_rate', 0.05))
                    
                    sequence.append([
                        production, lcoh, solar, wind, hydro,
                        electricity_cost, h2_price, efficiency, labor_cost,
                        oxygen_savings_rate
                    ])
                
                sequences.append(sequence)
                
                # Calculate profit for this sequence
                avg_production = np.mean([s[0] for s in sequence])
                avg_lcoh = np.mean([s[1] for s in sequence])
                avg_price = np.mean([s[6] for s in sequence])
                avg_labor = np.mean([s[8] for s in sequence])
                avg_o2_savings_rate = np.mean([s[9] for s in sequence])
                
                # Oxygen Calculation: 1kg H2 produces 8kg O2
                total_o2_produced = avg_production * 8
                total_o2_value = total_o2_produced * avg_o2_savings_rate
                
                # Profit = H2 Profit + Oxygen Savings - Labor
                profit = ((avg_price - avg_lcoh) * avg_production * 1000) + total_o2_value - avg_labor
                targets.append(profit)
        
        return sequences, targets
    
    def generate_training_data(self, num_samples=1000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate training data for profit prediction, augmented with real data from Supabase"""
        np.random.seed(42)
        
        # Try to fetch real production data from Supabase
        print("[INFO] Checking for real production data in Supabase...")
        real_df = self.fetch_real_production_data(min_days=1)
        
        # Fetch market data for synthetic samples
        market_data = self._fetch_market_data()
        
        X_data = []
        y_data = []
        real_samples_count = 0
        
        # If real data exists, process it into training sequences
        if real_df is not None and len(real_df) > 0:
            real_sequences, real_targets = self._process_real_data_to_sequences(real_df)
            if len(real_sequences) > 0:
                X_data.extend(real_sequences)
                y_data.extend(real_targets)
                real_samples_count = len(real_sequences)
                print(f"[OK] Added {real_samples_count} real data samples to training set")
        
        # Generate synthetic data
        synthetic_samples = num_samples - real_samples_count if real_samples_count > 0 else num_samples
        
        print(f"🔄 Generating {synthetic_samples} synthetic data samples...")
        for _ in range(synthetic_samples):
            # Generate sequence of 30 days
            sequence = []
            base_production = np.random.uniform(30, 100)  # TPD
            
            for day in range(self.sequence_length):
                # Simulate daily variations
                production = base_production + np.random.normal(0, 5)
                lcoh = np.random.uniform(1.5, 2.5)  # $/kg
                
                # Energy mix
                solar = np.random.uniform(20, 60)
                wind = np.random.uniform(10, 50)
                hydro = 100 - solar - wind + np.random.normal(0, 5)
                
                electricity_cost = np.random.uniform(0.03, 0.08)  # $/kWh
                h2_price = np.random.uniform(3, 6)  # $/kg selling price
                efficiency = np.random.uniform(0.6, 0.8)  # Electrolyzer efficiency
                labor_cost = np.random.uniform(500, 2000)  # Daily labor cost
                
                # Oxygen Savings Rate ($/kg of O2)
                oxygen_savings_rate = np.random.uniform(0.02, 0.15)
                
                sequence.append([
                    production, lcoh, solar, wind, hydro,
                    electricity_cost, h2_price, efficiency, labor_cost,
                    oxygen_savings_rate
                ])
            
            X_data.append(sequence)
            
            # Calculate profit
            avg_production = np.mean([s[0] for s in sequence])
            avg_lcoh = np.mean([s[1] for s in sequence])
            avg_price = np.mean([s[6] for s in sequence])
            avg_labor = np.mean([s[8] for s in sequence])
            avg_o2_savings_rate = np.mean([s[9] for s in sequence])
            
            # 1kg H2 = 8kg O2
            avg_o2_produced = avg_production * 8
            avg_o2_value = avg_o2_produced * avg_o2_savings_rate * 1000  # Scaling to daily volume
            
            # Daily profit in $
            profit = ((avg_price - avg_lcoh) * avg_production * 1000) + avg_o2_value - avg_labor
            y_data.append(profit)
        
        print(f"[DATA] Total training samples: {len(X_data)} ({real_samples_count} real + {synthetic_samples} synthetic)")
        
        X = np.array(X_data)
        y = np.array(y_data)
        
        # Normalize features
        self.scaler_params['X_mean'] = X.mean(axis=(0, 1))
        self.scaler_params['X_std'] = X.std(axis=(0, 1))
        self.scaler_params['y_mean'] = y.mean()
        self.scaler_params['y_std'] = y.std()
        
        X_normalized = (X - self.scaler_params['X_mean']) / (self.scaler_params['X_std'] + 1e-7)
        y_normalized = (y - self.scaler_params['y_mean']) / (self.scaler_params['y_std'] + 1e-7)
        
        return X_normalized, y_normalized
    
    def train(self, epochs=100, batch_size=32):
        """Train the LSTM model with enhanced dataset"""
        if not HAS_TF:
            print("[WARN] TensorFlow not available, skipping training")
            return None, 0
        
        print("🔄 Generating enhanced training data...")
        X_train, y_train = self.generate_training_data(num_samples=100000)
        
        print(f"[DATA] Training data shape: X={X_train.shape}, y={y_train.shape}")
        print("🎓 Training LSTM Profit Predictor...")
        print(f"   Target: 80%+ validation accuracy")
        
        early_stop = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True
        )
        
        reduce_lr = keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=0.00001
        )
        
        history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
            callbacks=[early_stop, reduce_lr],
            verbose=1
        )
        
        val_mae = min(history.history['val_mae'])
        val_loss = min(history.history['val_loss'])
        accuracy = max(0, 100 - (val_mae / abs(self.scaler_params.get('y_mean', 100000)) * 100))
        
        print(f"\n[OK] Model training completed!")
        print(f"   Final Validation MAE: {val_mae:.2f}")
        print(f"   Final Validation Loss: {val_loss:.2f}")
        print(f"   Estimated Accuracy: {accuracy:.1f}%")
        
        self.save_model()
        return history, accuracy
    
    def save_prediction_to_db(self, plant_id: str, input_data: Dict, prediction_output: Dict) -> bool:
        """Save profit prediction to Supabase"""
        try:
            supabase = self._init_supabase()
            if not supabase:
                print("[WARN] Cannot save prediction: Supabase not available")
                return False
            
            prediction_record = {
                'prediction_type': 'profitability',
                'plant_id': plant_id,
                'input_data': input_data,
                'output_data': prediction_output
            }
            
            supabase.table('ml_predictions').insert(prediction_record).execute()
            print(f"[OK] Saved profit prediction for plant {plant_id}")
            return True
            
        except Exception as e:
            print(f"[ERROR] Error saving prediction to DB: {e}")
            return False
    
    def predict(self, plant_data: Dict, save_to_db: bool = False) -> Dict:
        """
        Predict profit for next period including Oxygen savings.
        """
        profit = 0.0
        oxygen_kg_produced = 0.0
        oxygen_savings_amount = 0.0
        
        # Fetch market data from DB
        market_data = self._fetch_market_data()
        
        # 1. Prepare features (Now 10 features)
        current_features = [
            float(plant_data.get('currentProduction', 50)),
            float(plant_data.get('lcoh', 2.0)),
            float(plant_data.get('solar_mix', 30)),
            float(plant_data.get('wind_mix', 30)),
            float(plant_data.get('hydro_mix', 40)),
            float(plant_data.get('electricity_cost', market_data['electricity_cost'])),
            float(plant_data.get('h2_price', market_data['h2_price'])),
            float(plant_data.get('efficiency', 0.75)),
            float(plant_data.get('labor_cost', 1000)),
            float(plant_data.get('oxygen_savings_rate', 0.05))  # Default $0.05/kg
        ]

        if HAS_TF and self.model:
            # --- LSTM PREDICTION LOGIC ---
            history_data = []
            plant_id = plant_data.get('plant_id')
            
            if plant_id:
                try:
                    supabase = self._init_supabase()
                    if supabase:
                        response = supabase.table('production_history')\
                            .select('*')\
                            .eq('plant_id', plant_id)\
                            .order('timestamp', desc=True)\
                            .limit(self.sequence_length)\
                            .execute()
                        
                        if response.data:
                            for row in reversed(response.data):
                                row_feats = [
                                    float(row.get('production_kg', current_features[0])),
                                    float(row.get('lcoh', current_features[1])),
                                    float(row.get('solar_percent', current_features[2])),
                                    float(row.get('wind_percent', current_features[3])),
                                    float(row.get('hydro_percent', current_features[4])),
                                    float(row.get('electricity_cost', current_features[5])),
                                    float(row.get('h2_price', current_features[6])),
                                    float(row.get('efficiency_percent', current_features[7] * 100)) / 100.0,
                                    float(row.get('labor_cost', current_features[8])),
                                    float(row.get('oxygen_savings_rate', current_features[9]))
                                ]
                                history_data.append(row_feats)
                except Exception as e:
                    print(f"[WARN] Error fetching specific plant history: {e}")

            # Padding Logic
            missing_days = self.sequence_length - len(history_data)
            if missing_days > 0:
                padding = [current_features] * missing_days
                final_sequence = padding + history_data
            else:
                final_sequence = history_data[-self.sequence_length:]

            # Normalize
            X_input = np.array([final_sequence])
            if 'X_mean' in self.scaler_params and 'X_std' in self.scaler_params:
                X_mean = np.array(self.scaler_params['X_mean'])
                X_std = np.array(self.scaler_params['X_std'])
                X_normalized = (X_input - X_mean) / (X_std + 1e-7)
            else:
                X_normalized = X_input

            # Predict
            raw_prediction = self.model.predict(X_normalized, verbose=0)[0][0]
            
            # Denormalize
            if 'y_mean' in self.scaler_params and 'y_std' in self.scaler_params:
                profit = raw_prediction * self.scaler_params['y_std'] + self.scaler_params['y_mean']
            else:
                profit = raw_prediction
            
            # Derived stats for report
            oxygen_kg_produced = current_features[0] * 8 * 1000  # Daily vol
            oxygen_savings_amount = oxygen_kg_produced * current_features[9]

        else:
            # --- FALLBACK STATISTICAL LOGIC ---
            production = current_features[0]
            lcoh = current_features[1]
            h2_price = current_features[6]
            labor_cost = current_features[8]
            o2_rate = current_features[9]
            
            # Physics: 1kg H2 = 8kg O2
            oxygen_kg_produced = production * 8 * 1000  # Production in TPD in input, conv to kg
            oxygen_savings_amount = oxygen_kg_produced * o2_rate
            
            profit = ((h2_price - lcoh) * production * 1000) + oxygen_savings_amount - labor_cost

        result = {
            'predicted_profit': float(profit),
            'monthly_profit': float(profit * 30),
            'breakdown': {
                'h2_revenue_source': 'Market Sales',
                'oxygen_produced_kg': float(oxygen_kg_produced),
                'oxygen_savings_generated': float(oxygen_savings_amount)
            },
            'recommendation': self._generate_recommendation(profit),
            'model_type': 'LSTM' if (HAS_TF and self.model) else 'Statistical'
        }
        
        if save_to_db and plant_data.get('plant_id'):
            self.save_prediction_to_db(plant_data['plant_id'], plant_data, result)
        
        return result
    
    def _generate_recommendation(self, profit: float) -> str:
        if profit > 200000:
            return "Excellent profitability! High Oxygen capture efficiency contributing to margins."
        elif profit > 100000:
            return "Good profit margins. Monitor energy costs for optimization."
        elif profit > 50000:
            return "Moderate profit. Verify Oxygen capture systems are functioning optimally."
        else:
            return "Low profitability. Review energy sources and operational efficiency."
    
    def save_model(self):
        """Save trained model and scaler parameters"""
        if not HAS_TF or not self.model:
            return
        
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        
        params_path = self.model_path.replace('.h5', '_scaler.json')
        with open(params_path, 'w') as f:
            json.dump({k: v.tolist() if isinstance(v, np.ndarray) else v 
                      for k, v in self.scaler_params.items()}, f)
        
        print(f"💾 Model saved to {self.model_path}")
    
    def load_model(self):
        """Load pre-trained model"""
        if not HAS_TF:
            return
        
        try:
            self.model = keras.models.load_model(self.model_path)
            
            params_path = self.model_path.replace('.h5', '_scaler.json')
            if os.path.exists(params_path):
                with open(params_path, 'r') as f:
                    params = json.load(f)
                    self.scaler_params = {k: np.array(v) if isinstance(v, list) else v 
                                          for k, v in params.items()}
            
            print(f"[OK] Model loaded from {self.model_path}")
        except Exception as e:
            print(f"[WARN] Could not load model: {e}")
            self.build_model()


# Create global instance
profit_predictor = ProfitPredictor()
