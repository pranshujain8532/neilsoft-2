"""
Hydrogen Demand Forecaster using Bidirectional LSTM with Attention
Forecasts hydrogen consumption/transaction patterns for storage optimization
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
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
    HAS_TF = True
except ImportError:
    HAS_TF = False
    print("⚠️ TensorFlow not available for DemandForecaster")

try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False


class AttentionLayer(layers.Layer):
    """Custom Attention layer for focusing on important time steps"""
    
    def __init__(self, **kwargs):
        super(AttentionLayer, self).__init__(**kwargs)
    
    def build(self, input_shape):
        self.W = self.add_weight(
            name='attention_weight',
            shape=(input_shape[-1], input_shape[-1]),
            initializer='glorot_uniform',
            trainable=True
        )
        self.b = self.add_weight(
            name='attention_bias',
            shape=(input_shape[-1],),
            initializer='zeros',
            trainable=True
        )
        self.u = self.add_weight(
            name='attention_context',
            shape=(input_shape[-1],),
            initializer='glorot_uniform',
            trainable=True
        )
        super(AttentionLayer, self).build(input_shape)
    
    def call(self, x):
        # Compute attention scores
        score = tf.nn.tanh(tf.tensordot(x, self.W, axes=1) + self.b)
        attention_weights = tf.nn.softmax(tf.tensordot(score, self.u, axes=1), axis=1)
        
        # Apply attention
        context = x * tf.expand_dims(attention_weights, -1)
        context = tf.reduce_sum(context, axis=1)
        
        return context


class DemandForecaster:
    """
    Bidirectional LSTM with Attention for forecasting hydrogen demand.
    
    Features:
    - Learns from storage_transactions table
    - Multi-horizon forecasting (24h, 7d, 30d)
    - Accounts for seasonal patterns
    - Provides confidence intervals
    """
    
    def __init__(self, model_path: str = 'models/saved/demand_forecaster_lstm.h5'):
        self.model_path = model_path
        self.model = None
        self.scaler_params = None
        self.lookback = 30  # Days of history to use
        self.n_features = 5  # Volume, day_of_week, month, is_holiday, trend
        
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
        """Build Bidirectional LSTM with Attention architecture"""
        if not HAS_TF:
            return
        
        # Input
        inputs = layers.Input(shape=(self.lookback, self.n_features), name='sequence_input')
        
        # Bidirectional LSTM layers
        x = layers.Bidirectional(
            layers.LSTM(64, return_sequences=True, dropout=0.2)
        )(inputs)
        x = layers.Bidirectional(
            layers.LSTM(32, return_sequences=True, dropout=0.2)
        )(x)
        
        # Attention mechanism
        attention_output = AttentionLayer(name='attention')(x)
        
        # Dense layers
        x = layers.Dense(32, activation='relu')(attention_output)
        x = layers.Dropout(0.2)(x)
        x = layers.Dense(16, activation='relu')(x)
        
        # Multi-output for different forecast horizons
        forecast_24h = layers.Dense(1, activation='linear', name='forecast_24h')(x)
        forecast_7d = layers.Dense(1, activation='linear', name='forecast_7d')(x)
        forecast_30d = layers.Dense(1, activation='linear', name='forecast_30d')(x)
        
        self.model = Model(
            inputs=inputs,
            outputs=[forecast_24h, forecast_7d, forecast_30d],
            name='DemandForecasterLSTM'
        )
        
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss={
                'forecast_24h': 'mse',
                'forecast_7d': 'mse',
                'forecast_30d': 'mse'
            },
            loss_weights={
                'forecast_24h': 1.0,
                'forecast_7d': 0.8,
                'forecast_30d': 0.6
            },
            metrics=['mae']
        )
        
        print("✅ Demand Forecaster Bidirectional LSTM built")
        print(f"   Lookback period: {self.lookback} days")
        print(f"   Forecast horizons: 24h, 7d, 30d")
    
    def fetch_transaction_data(self, days: int = 365) -> Optional[np.ndarray]:
        """Fetch transaction history from Supabase"""
        if not self.supabase:
            return None
        
        try:
            # Fetch recent transactions
            start_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            response = self.supabase.table('storage_transactions') \
                .select('*') \
                .gte('transaction_date', start_date) \
                .order('transaction_date', desc=False) \
                .execute()
            
            transactions = response.data
            
            if not transactions or len(transactions) < self.lookback * 2:
                return None
            
            # Aggregate daily volumes
            daily_volumes = {}
            for t in transactions:
                date_str = t['transaction_date'][:10]  # YYYY-MM-DD
                volume = t['volume_kg']
                tx_type = t['transaction_type']
                
                if date_str not in daily_volumes:
                    daily_volumes[date_str] = {'inflow': 0, 'outflow': 0}
                
                daily_volumes[date_str][tx_type] += volume
            
            # Convert to time series
            dates = sorted(daily_volumes.keys())
            data = []
            
            for i, date in enumerate(dates):
                d = datetime.strptime(date, '%Y-%m-%d')
                
                # Net demand (outflow - inflow)
                net_demand = daily_volumes[date]['outflow'] - daily_volumes[date]['inflow']
                
                data.append([
                    net_demand,
                    d.weekday(),  # Day of week (0-6)
                    d.month,  # Month (1-12)
                    1 if d.weekday() >= 5 else 0,  # Is weekend
                    i / len(dates)  # Trend component
                ])
            
            print(f"✅ Fetched {len(data)} days of transaction data")
            return np.array(data)
            
        except Exception as e:
            print(f"❌ Error fetching transactions: {e}")
            return None
    
    def generate_synthetic_data(self, n_days: int = 365) -> np.ndarray:
        """Generate synthetic demand data with realistic patterns"""
        np.random.seed(42)
        
        data = []
        base_demand = 1000  # kg/day
        
        for day in range(n_days):
            date = datetime.now() - timedelta(days=n_days - day)
            
            # Weekly pattern (lower on weekends)
            weekly_factor = 1.0 if date.weekday() < 5 else 0.6
            
            # Monthly pattern (higher in winter for heating)
            month = date.month
            if month in [12, 1, 2]:  # Winter
                monthly_factor = 1.3
            elif month in [6, 7, 8]:  # Summer
                monthly_factor = 0.8
            else:
                monthly_factor = 1.0
            
            # Trend (gradual increase in hydrogen adoption)
            trend_factor = 1 + (day / n_days) * 0.2
            
            # Calculate demand with noise
            demand = (
                base_demand * 
                weekly_factor * 
                monthly_factor * 
                trend_factor + 
                np.random.normal(0, 100)
            )
            
            demand = max(0, demand)
            
            data.append([
                demand,
                date.weekday(),
                date.month,
                1 if date.weekday() >= 5 else 0,
                day / n_days  # Trend
            ])
        
        return np.array(data)
    
    def create_sequences(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Create training sequences with multi-horizon targets"""
        X = []
        y_24h = []
        y_7d = []
        y_30d = []
        
        for i in range(len(data) - self.lookback - 30):
            # Input sequence
            X.append(data[i:i + self.lookback])
            
            # Targets
            future_start = i + self.lookback
            y_24h.append(data[future_start, 0])  # Next day demand
            y_7d.append(np.mean(data[future_start:future_start + 7, 0]))  # 7-day average
            y_30d.append(np.mean(data[future_start:future_start + 30, 0]))  # 30-day average
        
        return np.array(X), np.array(y_24h), np.array(y_7d), np.array(y_30d)
    
    def normalize_data(self, X: np.ndarray, fit: bool = False) -> np.ndarray:
        """Normalize features"""
        if fit:
            self.scaler_params = {
                'mean': X.mean(axis=(0, 1)) if X.ndim == 3 else X.mean(axis=0),
                'std': X.std(axis=(0, 1)) + 1e-8 if X.ndim == 3 else X.std(axis=0) + 1e-8
            }
        
        if self.scaler_params is None:
            self.scaler_params = {
                'mean': np.array([1000, 3, 6, 0.3, 0.5]),
                'std': np.array([500, 2, 4, 0.5, 0.3])
            }
        
        return (X - self.scaler_params['mean']) / self.scaler_params['std']
    
    def train(self, epochs: int = 100, batch_size: int = 32) -> Dict:
        """Train the demand forecasting model"""
        if not HAS_TF:
            print("⚠️ TensorFlow not available")
            return {'success': False, 'error': 'TensorFlow not available'}
        
        print("🔄 Training Demand Forecaster...")
        
        # Try real data first
        real_data = self.fetch_transaction_data(days=365)
        
        if real_data is not None and len(real_data) > self.lookback * 3:
            print(f"   Using {len(real_data)} days of real transaction data")
            data = real_data
        else:
            print("   Using synthetic data for training")
            data = self.generate_synthetic_data(n_days=730)  # 2 years
        
        # Create sequences
        X, y_24h, y_7d, y_30d = self.create_sequences(data)
        
        # Normalize
        X_norm = self.normalize_data(X, fit=True)
        
        # Normalize targets
        demand_mean = self.scaler_params['mean'][0]
        demand_std = self.scaler_params['std'][0]
        y_24h_norm = (y_24h - demand_mean) / demand_std
        y_7d_norm = (y_7d - demand_mean) / demand_std
        y_30d_norm = (y_30d - demand_mean) / demand_std
        
        # Callbacks
        early_stop = EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True
        )
        
        reduce_lr = ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=0.0001
        )
        
        # Train
        history = self.model.fit(
            X_norm,
            {
                'forecast_24h': y_24h_norm,
                'forecast_7d': y_7d_norm,
                'forecast_30d': y_30d_norm
            },
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
            callbacks=[early_stop, reduce_lr],
            verbose=1
        )
        
        # Get metrics
        val_loss = min(history.history['val_loss'])
        
        print(f"\n✅ Training completed!")
        print(f"   Validation Loss: {val_loss:.4f}")
        
        self.save_model()
        
        return {
            'success': True,
            'val_loss': val_loss,
            'epochs_trained': len(history.history['loss'])
        }
    
    def forecast(self, container_id: str = None) -> Dict:
        """
        Generate demand forecast.
        
        Args:
            container_id: Optional specific container to forecast for
        
        Returns:
            Dict with multi-horizon forecasts and confidence intervals
        """
        # Fetch recent data
        if self.supabase:
            recent_data = self._fetch_recent_demand(container_id)
        else:
            recent_data = None
        
        if recent_data is None or len(recent_data) < self.lookback:
            # Use synthetic recent data
            recent_data = self.generate_synthetic_data(n_days=self.lookback)
        
        if HAS_TF and self.model:
            # Prepare sequence
            sequence = recent_data[-self.lookback:]
            sequence = np.expand_dims(sequence, axis=0)
            sequence_norm = self.normalize_data(sequence)
            
            # Predict
            forecast_24h, forecast_7d, forecast_30d = self.model.predict(sequence_norm, verbose=0)
            
            # Denormalize
            demand_mean = self.scaler_params['mean'][0]
            demand_std = self.scaler_params['std'][0]
            
            pred_24h = float(forecast_24h[0][0] * demand_std + demand_mean)
            pred_7d = float(forecast_7d[0][0] * demand_std + demand_mean)
            pred_30d = float(forecast_30d[0][0] * demand_std + demand_mean)
            
            confidence = 0.85
        else:
            # Fallback: simple moving average
            recent_demands = recent_data[:, 0]
            pred_24h = float(np.mean(recent_demands[-7:]))
            pred_7d = float(np.mean(recent_demands[-14:]))
            pred_30d = float(np.mean(recent_demands))
            confidence = 0.5
        
        # Calculate confidence intervals (approximate)
        std_factor = 0.15  # 15% uncertainty
        
        result = {
            'forecast_24h': {
                'value': max(0, round(pred_24h, 1)),
                'unit': 'kg',
                'lower_bound': max(0, round(pred_24h * (1 - std_factor), 1)),
                'upper_bound': round(pred_24h * (1 + std_factor), 1)
            },
            'forecast_7d': {
                'value': max(0, round(pred_7d * 7, 1)),
                'unit': 'kg',
                'lower_bound': max(0, round(pred_7d * 7 * (1 - std_factor), 1)),
                'upper_bound': round(pred_7d * 7 * (1 + std_factor), 1),
                'daily_average': max(0, round(pred_7d, 1))
            },
            'forecast_30d': {
                'value': max(0, round(pred_30d * 30, 1)),
                'unit': 'kg',
                'lower_bound': max(0, round(pred_30d * 30 * (1 - std_factor), 1)),
                'upper_bound': round(pred_30d * 30 * (1 + std_factor), 1),
                'daily_average': max(0, round(pred_30d, 1))
            },
            'trend': self._calculate_trend(recent_data),
            'seasonality': self._calculate_seasonality(),
            'confidence': confidence,
            'model_type': 'bidirectional_lstm' if HAS_TF and self.model else 'moving_average',
            'timestamp': datetime.now().isoformat()
        }
        
        return result
    
    def _fetch_recent_demand(self, container_id: str = None) -> Optional[np.ndarray]:
        """Fetch recent demand data"""
        try:
            query = self.supabase.table('storage_transactions') \
                .select('*') \
                .order('transaction_date', desc=True) \
                .limit(self.lookback * 5)
            
            if container_id:
                query = query.eq('container_id', container_id)
            
            response = query.execute()
            transactions = response.data
            
            if not transactions:
                return None
            
            # Aggregate daily
            daily = {}
            for t in transactions:
                date = t['transaction_date'][:10]
                if date not in daily:
                    daily[date] = 0
                if t['transaction_type'] == 'outflow':
                    daily[date] += t['volume_kg']
            
            # Convert to array
            dates = sorted(daily.keys())[-self.lookback:]
            data = []
            
            for i, date in enumerate(dates):
                d = datetime.strptime(date, '%Y-%m-%d')
                data.append([
                    daily[date],
                    d.weekday(),
                    d.month,
                    1 if d.weekday() >= 5 else 0,
                    i / len(dates)
                ])
            
            return np.array(data) if data else None
            
        except Exception as e:
            print(f"Error fetching recent demand: {e}")
            return None
    
    def _calculate_trend(self, data: np.ndarray) -> str:
        """Calculate demand trend"""
        if len(data) < 7:
            return 'stable'
        
        demands = data[:, 0]
        first_half = np.mean(demands[:len(demands)//2])
        second_half = np.mean(demands[len(demands)//2:])
        
        change = (second_half - first_half) / (first_half + 1e-8) * 100
        
        if change > 10:
            return 'increasing'
        elif change < -10:
            return 'decreasing'
        else:
            return 'stable'
    
    def _calculate_seasonality(self) -> Dict:
        """Get current seasonal factors"""
        now = datetime.now()
        month = now.month
        day_of_week = now.weekday()
        
        # Seasonal factor
        if month in [12, 1, 2]:
            season = 'winter'
            seasonal_factor = 1.3
        elif month in [6, 7, 8]:
            season = 'summer'
            seasonal_factor = 0.8
        else:
            season = 'transition'
            seasonal_factor = 1.0
        
        # Weekly factor
        if day_of_week >= 5:
            day_type = 'weekend'
            weekly_factor = 0.6
        else:
            day_type = 'weekday'
            weekly_factor = 1.0
        
        return {
            'season': season,
            'seasonal_factor': seasonal_factor,
            'day_type': day_type,
            'weekly_factor': weekly_factor
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
        
        print(f"💾 Demand forecaster saved to {self.model_path}")
    
    def load_model(self):
        """Load pre-trained model"""
        if not HAS_TF:
            return
        
        try:
            self.model = keras.models.load_model(
                self.model_path,
                custom_objects={'AttentionLayer': AttentionLayer}
            )
            
            params_path = self.model_path.replace('.h5', '_params.json')
            if os.path.exists(params_path):
                with open(params_path, 'r') as f:
                    params = json.load(f)
                    if params.get('mean'):
                        self.scaler_params = {
                            'mean': np.array(params['mean']),
                            'std': np.array(params['std'])
                        }
            
            print(f"✅ Demand forecaster loaded from {self.model_path}")
            
        except Exception as e:
            print(f"⚠️ Could not load model: {e}")
            self.build_model()


# Global instance
demand_forecaster = DemandForecaster()
