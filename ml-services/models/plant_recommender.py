"""
HYBRID Plant Recommendation System
Combines Rule-Based Logic (60%) + TensorFlow ML Learning (40%)
Learns from historical order assignment patterns for better recommendations
"""

import numpy as np
import os
from typing import Dict, List, Optional, Tuple

# Try to import TensorFlow
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    HAS_TF = True
except ImportError:
    HAS_TF = False
    print("⚠️ TensorFlow not available, using rule-based only")


class HybridPlantRecommender:
    def __init__(self, model_path='models/saved/plant_recommender_nn.h5'):
        self.model_path = model_path
        self.ml_model = None
        self.scaler_params = {}
        
        # Hybrid weights: 60% rule-based, 40% ML
        self.hybrid_weights = {
            'rule_based': 0.6,
            'ml_based': 0.4
        }
        
        # Rule-based scoring weights
        self.rule_weights = {
            'capacity_match': 0.35,
            'distance': 0.25,
            'lcoh': 0.20,
            'renewable_score': 0.15,
            'availability': 0.05
        }
        
        # Try to load existing ML model
        if HAS_TF and os.path.exists(model_path):
            self.load_ml_model()
        elif HAS_TF:
            self.build_ml_model()
    
    def build_ml_model(self):
        """Build TensorFlow neural network for pattern learning"""
        if not HAS_TF:
            return
        
        # Neural network to learn plant-order matching patterns
        # Input: [order_quantity, order_priority, plant_capacity, plant_lcoh, distance, renewable%]
        model = keras.Sequential([
            layers.Dense(64, activation='relu', input_shape=(6,)),
            layers.Dropout(0.2),
            layers.Dense(32, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(1, activation='sigmoid')  # Probability that this plant is good match
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        self.ml_model = model
        print("✅ Hybrid Plant Recommender: TensorFlow ML model built")
    
    def fetch_historical_orders(self) -> Optional[List[Dict]]:
        """Fetch historical order assignments from Supabase"""
        try:
            from supabase import create_client
            from dotenv import load_dotenv
            
            # Load .env from project root
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(current_dir))
            env_path = os.path.join(project_root, '.env')
            load_dotenv(env_path)
            
            url = os.environ.get('VITE_SUPABASE_URL')
            key = os.environ.get('VITE_SUPABASE_ANON_KEY')
            
            if not url or not key:
                print("⚠️ Cannot fetch historical data: Supabase credentials missing")
                return None
            
            supabase = create_client(url, key)
            
            # Fetch orders with assigned plants (where we have outcomes)
            response = supabase.table('orders')\
                .select('*')\
                .not_.is_('assigned_plant_id', 'null')\
                .limit(1000)\
                .execute()
            
            if response.data and len(response.data) > 0:
                print(f"✅ Fetched {len(response.data)} historical orders for ML training")
                return response.data
            else:
                print("ℹ️  No historical orders found for ML training")
                return None
            
        except Exception as e:
            print(f"⚠️ Error fetching historical data: {e}")
            return None
    
    def train_ml_model(self, historical_orders: Optional[List[Dict]] = None, epochs=50):
        """Train ML model on historical order-plant assignments"""
        if not HAS_TF or not self.ml_model:
            print("⚠️ TensorFlow not available, skipping ML training")
            return
        
        if historical_orders is None:
            historical_orders = self.fetch_historical_orders()
        
        if not historical_orders or len(historical_orders) < 10:
            print("⚠️ Insufficient historical data for ML training (need 10+ orders)")
            return
        
        # TODO: Process historical orders into training data
        # For now, generate synthetic training data as placeholder
        print("🔄 Generating synthetic training data (placeholder for historical)...")
        X_train, y_train = self._generate_synthetic_training_data(samples=5000)
        
        print(f"📊 Training ML model on {len(X_train)} samples...")
        history = self.ml_model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=32,
            validation_split=0.2,
            verbose=0
        )
        
        accuracy = history.history['val_accuracy'][-1]
        print(f"✅ ML model trained! Validation accuracy: {accuracy*100:.1f}%")
        
        self.save_ml_model()
    
    def _generate_synthetic_training_data(self, samples=5000) -> Tuple[np.ndarray, np.ndarray]:
        """Generate synthetic training data for ML model"""
        np.random.seed(42)
        
        X_data = []
        y_data = []
        
        for _ in range(samples):
            # Features: order_quantity, order_priority, plant_capacity, plant_lcoh, distance, renewable%
            order_qty = np.random.uniform(100, 5000)  # kg
            order_priority = np.random.uniform(0, 1)  # 0=low, 1=high
            plant_capacity = np.random.uniform(500, 3000)  # kg/day
            plant_lcoh = np.random.uniform(1.5, 3.0)  # $/kg
            distance = np.random.uniform(0, 1000)  # km
            renewable_pct = np.random.uniform(0, 100)  # %
            
            # Label: 1 if good match, 0 if bad match (simulated logic)
            capacity_match = 1.0 if 0.3 <= (order_qty / plant_capacity) <= 0.7 else 0.0
            cost_ok = 1.0 if plant_lcoh < 2.5 else 0.0
            distance_ok = 1.0 if distance < 500 else 0.0
            
            # Good match if at least 2 out of 3 criteria met
            good_match = 1.0 if (capacity_match + cost_ok + distance_ok) >= 2.0 else 0.0
            
            X_data.append([order_qty, order_priority, plant_capacity, plant_lcoh, distance, renewable_pct])
            y_data.append(good_match)
        
        X = np.array(X_data)
        y = np.array(y_data)
        
        # Normalize features
        self.scaler_params['X_mean'] = X.mean(axis=0)
        self.scaler_params['X_std'] = X.std(axis=0) + 1e-7
        
        X_normalized = (X - self.scaler_params['X_mean']) / self.scaler_params['X_std']
        
        return X_normalized, y
    
    def calculate_distance(self, plant_coords: Dict, customer_coords: Dict) -> float:
        """Calculate haversine distance between coordinates"""
        from math import radians, sin, cos, sqrt, atan2
        
        lat1, lon1 = radians(plant_coords.get('lat', 0)), radians(plant_coords.get('lng', 0))
        lat2, lon2 = radians(customer_coords.get('lat', 0)), radians(customer_coords.get('lng', 0))
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return 6371 * c  # km
    
    def score_plant_rule_based(self, plant: Dict, order: Dict) -> float:
        """Calculate rule-based score (original logic)"""
        
        # Capacity match score
        order_quantity = order.get('quantity', 1000)  # kg
        plant_capacity = plant.get('capacity', 50) * 1000  # Convert TPD to kg/day
        capacity_ratio = min(order_quantity / plant_capacity, 1.0)
        capacity_score = 1.0 - abs(capacity_ratio - 0.5)  # Peak at 50% utilization
        
        # Distance score
        if plant.get('location', {}).get('coordinates') and order.get('delivery_location', {}).get('coordinates'):
            distance = self.calculate_distance(
                plant['location']['coordinates'],
                order['delivery_location']['coordinates']
            )
            distance_score = max(0, 1.0 - distance / 1000)  # Normalize to 1000km
        else:
            distance = 500  # Default
            distance_score = 0.5
        
        # LCOH score (lower is better)
        lcoh = plant.get('lcoh', 2.0)
        lcoh_score = max(0, 1.0 - (lcoh - 1.0) / 2.0)  # Normalize $1-3/kg range
        
        # Renewable energy score
        energy_mix = plant.get('energySources', {})
        solar = energy_mix.get('solar', {}).get('current', 0)
        wind = energy_mix.get('wind', {}).get('current', 0)
        hydro = energy_mix.get('hydro', {}).get('current', 0)
        total_renewable = solar + wind + hydro
        total_capacity = plant.get('totalEnergyCapacity', 100)
        renewable_score = (total_renewable / total_capacity) if total_capacity > 0 else 0
        
        # Availability score
        status = plant.get('status', 'active')
        availability_score = 1.0 if status == 'active' else 0.3
        
        # Calculate weighted rule-based score
        rule_score = (
            self.rule_weights['capacity_match'] * capacity_score +
            self.rule_weights['distance'] * distance_score +
            self.rule_weights['lcoh'] * lcoh_score +
            self.rule_weights['renewable_score'] * renewable_score +
            self.rule_weights['availability'] * availability_score
        )
        
        return rule_score
    
    def score_plant_ml(self, plant: Dict, order: Dict) -> float:
        """Calculate ML-based score using trained neural network"""
        if not HAS_TF or not self.ml_model:
            return 0.5  # Neutral score if ML not available
        
        # Extract features
        order_qty = order.get('quantity', 1000)
        order_priority = order.get('priority', 0.5)  # Between 0 and 1
        plant_capacity = plant.get('capacity', 50) * 1000  # kg/day
        plant_lcoh = plant.get('lcoh', 2.0)
        
        # Calculate distance
        if plant.get('location', {}).get('coordinates') and order.get('delivery_location', {}).get('coordinates'):
            distance = self.calculate_distance(
                plant['location']['coordinates'],
                order['delivery_location']['coordinates']
            )
        else:
            distance = 500
        
        # Calculate renewable %
        energy_mix = plant.get('energySources', {})
        solar = energy_mix.get('solar', {}).get('current', 0)
        wind = energy_mix.get('wind', {}).get('current', 0)
        hydro = energy_mix.get('hydro', {}).get('current', 0)
        total_renewable = solar + wind + hydro
        total_capacity = plant.get('totalEnergyCapacity', 100)
        renewable_pct = (total_renewable / total_capacity * 100) if total_capacity > 0 else 0
        
        # Prepare input features
        features = np.array([[order_qty, order_priority, plant_capacity, plant_lcoh, distance, renewable_pct]])
        
        # Normalize using saved scaler params
        if self.scaler_params:
            features = (features - self.scaler_params.get('X_mean', 0)) / self.scaler_params.get('X_std', 1)
        
        # Predict
        ml_score = self.ml_model.predict(features, verbose=0)[0][0]
        
        return float(ml_score)
    
    def score_plant_hybrid(self, plant: Dict, order: Dict) -> Dict:
        """Score a plant using HYBRID approach: 60% rule-based + 40% ML"""
        
        # Get both scores
        rule_score = self.score_plant_rule_based(plant, order)
        ml_score = self.score_plant_ml(plant, order)
        
        # Combine with 60-40 weighting
        hybrid_score = (
            self.hybrid_weights['rule_based'] * rule_score +
            self.hybrid_weights['ml_based'] * ml_score
        )
        
        return {
            'plant_id': plant.get('id', plant.get('_id', 'unknown')),
            'plant_name': plant.get('name', 'Unknown'),
            'hybrid_score': hybrid_score,
            'rule_based_score': rule_score,
            'ml_score': ml_score if HAS_TF else None,
            'score_breakdown': {
                'rule_based_weight': self.hybrid_weights['rule_based'],
                'ml_weight': self.hybrid_weights['ml_based'],
                'final': hybrid_score
            }
        }
    
    def recommend_plants(self, plants: List[Dict], order: Dict, top_n: int = 3) -> List[Dict]:
        """Recommend top N plants using HYBRID scoring"""
        
        scored_plants = []
        for plant in plants:
            score_data = self.score_plant_hybrid(plant, order)
            scored_plants.append(score_data)
        
        # Sort by hybrid score (descending)
        scored_plants.sort(key=lambda x: x['hybrid_score'], reverse=True)
        
        return scored_plants[:top_n]
    
    def save_ml_model(self):
        """Save trained ML model"""
        if not HAS_TF or not self.ml_model:
            return
        
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.ml_model.save(self.model_path)
        
        # Save scaler params
        import json
        params_path = self.model_path.replace('.h5', '_scaler.json')
        with open(params_path, 'w') as f:
            json.dump({k: v.tolist() if isinstance(v, np.ndarray) else v 
                      for k, v in self.scaler_params.items()}, f)
        
        print(f"💾 ML model saved to {self.model_path}")
    
    def load_ml_model(self):
        """Load pre-trained ML model"""
        if not HAS_TF:
            return
        
        try:
            self.ml_model = keras.models.load_model(self.model_path)
            
            import json
            params_path = self.model_path.replace('.h5', '_scaler.json')
            if os.path.exists(params_path):
                with open(params_path, 'r') as f:
                    params = json.load(f)
                    self.scaler_params = {k: np.array(v) if isinstance(v, list) else v 
                                        for k, v in params.items()}
            
            print(f"✅ ML model loaded from {self.model_path}")
        except Exception as e:
            print(f"⚠️  Could not load ML model: {e}")
            print(f"✅ ML model loaded from {self.model_path}")
        except Exception as e:
            print(f"⚠️  Could not load ML model: {e}")
            self.build_ml_model()

    def explain_prediction(self, plant: Dict, order: Dict) -> Dict:
        """Explain prediction using SHAP values"""
        if not HAS_TF or not self.ml_model:
            return {"error": "ML model not available"}
        
        try:
            import shap
            
            # Prepare input features (single sample)
            order_qty = order.get('quantity', 1000)
            order_priority = order.get('priority', 0.5)
            plant_capacity = plant.get('capacity', 50) * 1000
            plant_lcoh = plant.get('lcoh', 2.0)
            
            if plant.get('location', {}).get('coordinates') and order.get('delivery_location', {}).get('coordinates'):
                distance = self.calculate_distance(
                    plant['location']['coordinates'],
                    order['delivery_location']['coordinates']
                )
            else:
                distance = 500
            
            energy_mix = plant.get('energySources', {})
            total_renewable = (energy_mix.get('solar', {}).get('current', 0) + 
                             energy_mix.get('wind', {}).get('current', 0) + 
                             energy_mix.get('hydro', {}).get('current', 0))
            total_capacity = plant.get('totalEnergyCapacity', 100)
            renewable_pct = (total_renewable / total_capacity * 100) if total_capacity > 0 else 0
            
            features = np.array([[order_qty, order_priority, plant_capacity, plant_lcoh, distance, renewable_pct]])
            
            # Normalize
            if self.scaler_params:
                features = (features - self.scaler_params.get('X_mean', 0)) / self.scaler_params.get('X_std', 1)
            
            # Use KernelExplainer with a small background dataset (e.g. zeros or mean)
            # For speed, we use a small background summary
            background = np.zeros((10, 6)) # Placeholder background
            explainer = shap.KernelExplainer(self.ml_model.predict, background)
            shap_values = explainer.shap_values(features, nsamples=100)
            
            feature_names = ['Order Qty', 'Priority', 'Capacity', 'LCOH', 'Distance', 'Renewable %']
            
            # Format explanation
            explanation = []
            # shap_values is a list for multi-output, or array for single output
            vals = shap_values[0][0] if isinstance(shap_values, list) else shap_values[0]
            
            for i, name in enumerate(feature_names):
                explanation.append({
                    "feature": name,
                    "importance": float(vals[i]),
                    "value": float(features[0][i])
                })
            
            # Sort by absolute importance
            explanation.sort(key=lambda x: abs(x['importance']), reverse=True)
            
            return {"features": explanation}
            
        except ImportError:
            return {"error": "SHAP library not installed"}
        except Exception as e:
            print(f"SHAP explanation error: {e}")
            return {"error": str(e)}


# Create global instance
plant_recommender = HybridPlantRecommender()
