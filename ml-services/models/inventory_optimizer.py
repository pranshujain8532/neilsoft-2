"""
Inventory Optimizer using Deep Q-Network (DQN) - Reinforcement Learning
Learns optimal reorder policies to minimize costs while avoiding stockouts
"""

import numpy as np
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import json
from collections import deque
import random

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers, Model
    from tensorflow.keras.optimizers import Adam
    HAS_TF = True
except ImportError:
    HAS_TF = False
    print("[WARN] TensorFlow not available for InventoryOptimizer")

try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False


class ReplayBuffer:
    """Experience Replay Buffer for DQN"""
    
    def __init__(self, capacity: int = 10000):
        self.buffer = deque(maxlen=capacity)
    
    def push(self, state, action, reward, next_state, done):
        self.buffer.append((state, action, reward, next_state, done))
    
    def sample(self, batch_size: int):
        batch = random.sample(self.buffer, batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)
        return (
            np.array(states),
            np.array(actions),
            np.array(rewards),
            np.array(next_states),
            np.array(dones)
        )
    
    def __len__(self):
        return len(self.buffer)


class InventoryEnvironment:
    """
    Simulated environment for inventory management.
    
    State Space:
    - Current fill level (%)
    - Days of supply remaining
    - Current demand rate (kg/day)
    - Pending orders count
    - Lead time remaining (days)
    - Day of week
    - Month
    - Alert status (0/1)
    
    Action Space:
    - 0: No action
    - 1: Small reorder (10% capacity)
    - 2: Medium reorder (25% capacity)
    - 3: Large reorder (50% capacity)
    - 4: Emergency reorder (75% capacity)
    """
    
    def __init__(self, container_capacity: float = 10000):
        self.capacity = container_capacity
        self.current_level = container_capacity * 0.5  # Start at 50%
        self.daily_demand = 200  # kg/day average
        self.lead_time = 3  # Days for delivery
        self.pending_order = 0
        self.pending_lead_time = 0
        self.day = 0
        self.stockout_occurred = False
        
        # Cost parameters
        self.holding_cost_per_kg = 0.5  # $/kg/day
        self.stockout_cost_per_kg = 10.0  # $/kg shortage
        self.order_cost_fixed = 100  # $ per order
        self.order_cost_per_kg = 5.0  # $/kg
        
        self.state_size = 8
        self.action_size = 5
    
    def reset(self) -> np.ndarray:
        """Reset environment to initial state"""
        self.current_level = self.capacity * np.random.uniform(0.3, 0.8)
        self.daily_demand = np.random.uniform(150, 300)
        self.pending_order = 0
        self.pending_lead_time = 0
        self.day = 0
        self.stockout_occurred = False
        return self._get_state()
    
    def _get_state(self) -> np.ndarray:
        """Get current state representation"""
        fill_level = self.current_level / self.capacity
        days_of_supply = self.current_level / (self.daily_demand + 1e-8)
        demand_rate = self.daily_demand / 300  # Normalized
        pending = 1 if self.pending_order > 0 else 0
        lead_time_remaining = self.pending_lead_time / self.lead_time if self.pending_order else 0
        day_of_week = self.day % 7 / 7
        month = (self.day // 30 % 12) / 12
        alert = 1 if fill_level < 0.2 else 0
        
        return np.array([
            fill_level,
            min(1, days_of_supply / 30),  # Cap at 30 days
            demand_rate,
            pending,
            lead_time_remaining,
            day_of_week,
            month,
            alert
        ], dtype=np.float32)
    
    def step(self, action: int) -> Tuple[np.ndarray, float, bool, Dict]:
        """Execute action and return next state, reward, done, info"""
        
        # Process action
        order_amounts = [0, 0.1, 0.25, 0.5, 0.75]  # As fraction of capacity
        order_amount = order_amounts[action] * self.capacity
        
        reward = 0
        info = {'action': action, 'order_amount': order_amount}
        
        # Place order if action > 0 and no pending order
        if action > 0 and self.pending_order == 0:
            self.pending_order = order_amount
            self.pending_lead_time = self.lead_time
            reward -= self.order_cost_fixed + order_amount * self.order_cost_per_kg
            info['order_placed'] = True
        elif action > 0:
            # Cannot place order, small penalty for invalid action
            reward -= 10
            info['order_placed'] = False
        
        # Receive pending order if lead time elapsed
        if self.pending_order > 0:
            self.pending_lead_time -= 1
            if self.pending_lead_time <= 0:
                self.current_level = min(self.capacity, self.current_level + self.pending_order)
                info['order_received'] = self.pending_order
                self.pending_order = 0
        
        # Consume demand
        demand_today = self.daily_demand * np.random.uniform(0.8, 1.2)  # Stochastic demand
        
        if self.current_level >= demand_today:
            self.current_level -= demand_today
            reward -= self.current_level * self.holding_cost_per_kg / 100  # Holding cost
        else:
            # Stockout
            shortage = demand_today - self.current_level
            self.current_level = 0
            reward -= shortage * self.stockout_cost_per_kg
            self.stockout_occurred = True
            info['stockout'] = shortage
        
        # Increment day
        self.day += 1
        
        # Episode ends after 90 days or repeated stockouts
        done = self.day >= 90
        
        info['day'] = self.day
        info['level'] = self.current_level
        info['reward'] = reward
        
        return self._get_state(), reward, done, info


class InventoryOptimizer:
    """
    Deep Q-Network for optimizing inventory reorder decisions.
    
    Uses:
    - Epsilon-greedy exploration
    - Experience replay
    - Target network for stability
    """
    
    def __init__(self, model_path: str = 'models/saved/inventory_dqn.h5'):
        self.model_path = model_path
        self.model = None
        self.target_model = None
        self.replay_buffer = ReplayBuffer(capacity=50000)
        
        # DQN hyperparameters
        self.state_size = 8
        self.action_size = 5
        self.gamma = 0.99  # Discount factor
        self.epsilon = 1.0  # Exploration rate
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.learning_rate = 0.001
        self.batch_size = 64
        self.update_target_every = 10
        
        # Environment
        self.env = InventoryEnvironment()
        
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
        """Build DQN architecture"""
        if not HAS_TF:
            return
        
        # Main Q-Network
        inputs = layers.Input(shape=(self.state_size,))
        x = layers.Dense(64, activation='relu')(inputs)
        x = layers.Dense(64, activation='relu')(x)
        x = layers.Dense(32, activation='relu')(x)
        outputs = layers.Dense(self.action_size, activation='linear')(x)
        
        self.model = Model(inputs=inputs, outputs=outputs, name='DQN')
        self.model.compile(optimizer=Adam(learning_rate=self.learning_rate), loss='mse')
        
        # Target Network (for stable training)
        self.target_model = Model(inputs=inputs, outputs=outputs, name='TargetDQN')
        self.target_model.set_weights(self.model.get_weights())
        
        print("[OK] Inventory Optimizer DQN built")
        print(f"   State size: {self.state_size}")
        print(f"   Action size: {self.action_size}")
    
    def select_action(self, state: np.ndarray, training: bool = False) -> int:
        """Select action using epsilon-greedy policy"""
        if training and np.random.random() < self.epsilon:
            return np.random.randint(self.action_size)
        
        if HAS_TF and self.model:
            state = np.expand_dims(state, axis=0)
            q_values = self.model.predict(state, verbose=0)[0]
            return int(np.argmax(q_values))
        else:
            # Fallback: rule-based policy
            return self._rule_based_action(state)
    
    def _rule_based_action(self, state: np.ndarray) -> int:
        """Rule-based fallback policy"""
        fill_level = state[0]
        days_of_supply = state[1] * 30
        pending = state[3]
        
        if pending:
            return 0  # Wait for pending order
        
        if fill_level < 0.15 or days_of_supply < 3:
            return 4  # Emergency reorder
        elif fill_level < 0.25 or days_of_supply < 7:
            return 3  # Large reorder
        elif fill_level < 0.4 or days_of_supply < 14:
            return 2  # Medium reorder
        elif fill_level < 0.5 or days_of_supply < 21:
            return 1  # Small reorder
        else:
            return 0  # No action
    
    def train_step(self):
        """Perform one training step on a batch from replay buffer"""
        if len(self.replay_buffer) < self.batch_size:
            return None
        
        if not HAS_TF or self.model is None:
            return None
        
        # Sample batch
        states, actions, rewards, next_states, dones = self.replay_buffer.sample(self.batch_size)
        
        # Compute target Q-values
        next_q_values = self.target_model.predict(next_states, verbose=0)
        max_next_q = np.max(next_q_values, axis=1)
        
        targets = rewards + (1 - dones) * self.gamma * max_next_q
        
        # Current Q-values
        current_q = self.model.predict(states, verbose=0)
        
        # Update only the Q-value for the action taken
        for i, action in enumerate(actions):
            current_q[i, action] = targets[i]
        
        # Train
        loss = self.model.train_on_batch(states, current_q)
        
        return loss
    
    def train(self, episodes: int = 500) -> Dict:
        """Train the DQN agent"""
        if not HAS_TF:
            print("[WARN] TensorFlow not available")
            return {'success': False, 'error': 'TensorFlow not available'}
        
        print("🔄 Training Inventory Optimizer DQN...")
        
        rewards_history = []
        stockouts_history = []
        
        for episode in range(episodes):
            state = self.env.reset()
            total_reward = 0
            stockouts = 0
            done = False
            
            while not done:
                # Select and execute action
                action = self.select_action(state, training=True)
                next_state, reward, done, info = self.env.step(action)
                
                # Store experience
                self.replay_buffer.push(state, action, reward, next_state, done)
                
                # Train
                self.train_step()
                
                # Track metrics
                total_reward += reward
                if 'stockout' in info:
                    stockouts += 1
                
                state = next_state
            
            rewards_history.append(total_reward)
            stockouts_history.append(stockouts)
            
            # Update target network
            if episode % self.update_target_every == 0:
                self.target_model.set_weights(self.model.get_weights())
            
            # Decay epsilon
            self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)
            
            # Print progress
            if (episode + 1) % 50 == 0:
                avg_reward = np.mean(rewards_history[-50:])
                avg_stockouts = np.mean(stockouts_history[-50:])
                print(f"   Episode {episode + 1}/{episodes} | "
                      f"Avg Reward: {avg_reward:.1f} | "
                      f"Avg Stockouts: {avg_stockouts:.2f} | "
                      f"Epsilon: {self.epsilon:.3f}")
        
        # Final metrics
        final_avg_reward = np.mean(rewards_history[-100:])
        final_avg_stockouts = np.mean(stockouts_history[-100:])
        
        print(f"\n[OK] Training completed!")
        print(f"   Final Avg Reward: {final_avg_reward:.1f}")
        print(f"   Final Avg Stockouts: {final_avg_stockouts:.2f}")
        
        self.save_model()
        
        return {
            'success': True,
            'final_avg_reward': final_avg_reward,
            'final_avg_stockouts': final_avg_stockouts,
            'episodes_trained': episodes
        }
    
    def optimize(self, container_data: Dict = None) -> Dict:
        """
        Get optimal inventory action for current state.
        
        Args:
            container_data: Optional container data or fetches from Supabase
        
        Returns:
            Dict with recommended action, explanation, and metrics
        """
        # Build state from container data
        if container_data:
            state = self._build_state_from_container(container_data)
        elif self.supabase:
            state = self._fetch_current_state()
        else:
            state = self.env._get_state()
        
        # Get action
        action = self.select_action(state, training=False)
        
        # Get Q-values for all actions
        if HAS_TF and self.model:
            q_values = self.model.predict(np.expand_dims(state, 0), verbose=0)[0]
            confidence = float(np.max(q_values) - np.mean(q_values)) / (np.std(q_values) + 1e-8)
            confidence = min(1.0, max(0.5, confidence))
        else:
            q_values = [0] * self.action_size
            confidence = 0.6
        
        # Action descriptions
        action_names = [
            'No reorder',
            'Small reorder (10% capacity)',
            'Medium reorder (25% capacity)',
            'Large reorder (50% capacity)',
            'Emergency reorder (75% capacity)'
        ]
        
        # Generate explanation
        fill_level = state[0] * 100
        days_of_supply = state[1] * 30
        
        result = {
            'recommended_action': action,
            'action_name': action_names[action],
            'q_values': {
                action_names[i]: round(float(q_values[i]), 2)
                for i in range(self.action_size)
            },
            'current_state': {
                'fill_level_percent': round(fill_level, 1),
                'days_of_supply': round(days_of_supply, 1),
                'pending_order': bool(state[3]),
                'alert_status': bool(state[7])
            },
            'explanation': self._generate_explanation(action, state),
            'confidence': round(confidence, 2),
            'model_type': 'dqn' if HAS_TF and self.model else 'rule_based',
            'timestamp': datetime.now().isoformat()
        }
        
        # Save recommendation to Supabase
        if self.supabase:
            self._save_recommendation(result)
        
        return result
    
    def _build_state_from_container(self, data: Dict) -> np.ndarray:
        """Build state array from container data"""
        capacity = data.get('capacity', 10000)
        current_level = data.get('current_level', capacity * 0.5)
        daily_demand = data.get('estimated_daily_demand', 200)
        
        fill_level = current_level / capacity
        days_of_supply = current_level / (daily_demand + 1e-8)
        
        now = datetime.now()
        
        return np.array([
            fill_level,
            min(1, days_of_supply / 30),
            daily_demand / 300,
            data.get('pending_order', 0) > 0,
            0,  # Lead time
            now.weekday() / 7,
            now.month / 12,
            1 if fill_level < 0.2 else 0
        ], dtype=np.float32)
    
    def _fetch_current_state(self) -> np.ndarray:
        """Fetch current inventory state from Supabase"""
        try:
            # Get containers
            response = self.supabase.table('containers').select('*').execute()
            containers = response.data
            
            if not containers:
                return self.env._get_state()
            
            # Aggregate across all containers
            total_capacity = sum(c.get('capacity', 10000) for c in containers)
            total_level = sum(
                c.get('capacity', 10000) * c.get('fill_percentage', 50) / 100
                for c in containers
            )
            
            # Estimate daily demand from recent transactions
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            tx_response = self.supabase.table('storage_transactions') \
                .select('volume_kg') \
                .eq('transaction_type', 'outflow') \
                .gte('transaction_date', week_ago) \
                .execute()
            
            transactions = tx_response.data
            daily_demand = sum(t['volume_kg'] for t in transactions) / 7 if transactions else 200
            
            fill_level = total_level / total_capacity if total_capacity else 0.5
            days_of_supply = total_level / (daily_demand + 1e-8)
            
            now = datetime.now()
            
            return np.array([
                fill_level,
                min(1, days_of_supply / 30),
                min(1, daily_demand / 1000),
                0,  # Pending order status
                0,  # Lead time
                now.weekday() / 7,
                now.month / 12,
                1 if fill_level < 0.2 else 0
            ], dtype=np.float32)
            
        except Exception as e:
            print(f"Error fetching state: {e}")
            return self.env._get_state()
    
    def _generate_explanation(self, action: int, state: np.ndarray) -> str:
        """Generate human-readable explanation for the action"""
        fill_level = state[0] * 100
        days_of_supply = state[1] * 30
        pending = state[3]
        alert = state[7]
        
        if action == 0:
            if pending:
                return "Order already pending. Waiting for delivery before placing new order."
            elif fill_level > 50:
                return f"Inventory level adequate at {fill_level:.0f}%. No reorder needed."
            else:
                return f"Current supply of {days_of_supply:.0f} days is sufficient for now."
        
        elif action == 1:
            return f"Fill level at {fill_level:.0f}% with {days_of_supply:.0f} days supply. Small reorder recommended to maintain optimal levels."
        
        elif action == 2:
            return f"Fill level at {fill_level:.0f}%. Medium reorder recommended to replenish before reaching critical levels."
        
        elif action == 3:
            return f"Fill level at {fill_level:.0f}% is below optimal. Large reorder recommended to ensure adequate supply."
        
        elif action == 4:
            if alert:
                return f"[WARN] CRITICAL: Fill level at {fill_level:.0f}%! Emergency reorder required immediately to prevent stockout."
            else:
                return f"Low inventory with only {days_of_supply:.0f} days supply. Emergency reorder strongly recommended."
        
        return "Action recommended based on current inventory state."
    
    def _save_recommendation(self, recommendation: Dict):
        """Save recommendation to Supabase ml_predictions table"""
        try:
            self.supabase.table('ml_predictions').insert({
                'prediction_type': 'inventory_optimization',
                'input_data': recommendation['current_state'],
                'output_data': {
                    'action': recommendation['recommended_action'],
                    'action_name': recommendation['action_name'],
                    'confidence': recommendation['confidence']
                }
            }).execute()
        except Exception as e:
            print(f"Error saving recommendation: {e}")
    
    def save_model(self):
        """Save the trained model"""
        if not HAS_TF or self.model is None:
            return
        
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        
        # Save hyperparameters
        params_path = self.model_path.replace('.h5', '_params.json')
        with open(params_path, 'w') as f:
            json.dump({
                'epsilon': self.epsilon,
                'gamma': self.gamma,
                'learning_rate': self.learning_rate
            }, f)
        
        print(f"💾 Inventory optimizer saved to {self.model_path}")
    
    def load_model(self):
        """Load pre-trained model"""
        if not HAS_TF:
            return
        
        try:
            self.model = keras.models.load_model(self.model_path)
            self.target_model = keras.models.load_model(self.model_path)
            
            params_path = self.model_path.replace('.h5', '_params.json')
            if os.path.exists(params_path):
                with open(params_path, 'r') as f:
                    params = json.load(f)
                    self.epsilon = params.get('epsilon', 0.01)
            
            print(f"[OK] Inventory optimizer loaded from {self.model_path}")
            
        except Exception as e:
            print(f"[WARN] Could not load model: {e}")
            self.build_model()


# Global instance
inventory_optimizer = InventoryOptimizer()
