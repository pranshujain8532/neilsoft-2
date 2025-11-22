"""
Recommendation System with Reinforcement Learning
Multi-agent system for plant selection, improvement suggestions, and order routing
"""

import numpy as np
import random
from typing import Dict, List, Tuple
from datetime import datetime

# ========================================
# MULTI-AGENT RL SYSTEM
# ========================================

class RecommendationAgent:
    """Base class for recommendation agents"""
    
    def __init__(self, name: str, state_size: int, action_size: int):
        self.name = name
        self.state_size = state_size
        self.action_size = action_size
        self.policy_network = np.random.rand(state_size, action_size)
        self.value_network = np.random.rand(state_size)
        self.learning_rate = 0.001
        
    def get_action_probabilities(self, state: np.ndarray) -> np.ndarray:
        """Get action probabilities using policy network"""
        logits = np.dot(state, self.policy_network)
        exp_logits = np.exp(logits - np.max(logits))
        return exp_logits / np.sum(exp_logits)
    
    def select_action(self, state: np.ndarray) -> int:
        """Select action using current policy"""
        probs = self.get_action_probabilities(state)
        return np.random.choice(self.action_size, p=probs)

# ========================================
# AGENT 1: PLANT SELECTION FOR ORDERS
# ========================================

class PlantSelectionAgent(RecommendationAgent):
    """Recommends optimal plant for customer orders"""
    
    def __init__(self):
        # State: [production_capacity, distance, energy_availability, cost_efficiency, customer_priority]
        # Actions: [Plant1, Plant2, Plant3, Plant4, Plant5]
        super().__init__("PlantSelector", state_size=5, action_size=5)
        self.train()
    
    def train(self):
        """Train agent with simulated experience"""
        for episode in range(500):
            # Simulate training episode
            state = np.random.rand(self.state_size)
            action = self.select_action(state)
            reward = self._simulate_reward(state, action)
            
            # Simple policy gradient update (PPO-style)
            advantage = reward - np.dot(state, self.value_network)
            self.policy_network[:, action] += self.learning_rate * advantage * state
            self.value_network += self.learning_rate * (reward - np.dot(state, self.value_network)) * state
        
        print(f"✓ {self.name} trained")
    
    def _simulate_reward(self, state: np.ndarray, action: int) -> float:
        """Simulate reward for plant selection"""
        # Reward based on capacity, proximity, and efficiency
        capacity_match = state[0]
        proximity_bonus = 1 - state[1]  # Lower distance = higher reward
        energy_bonus = state[2]
        cost_bonus = 1 - state[3]  # Lower cost = higher reward
        
        base_reward = capacity_match * 30 + proximity_bonus * 25 + energy_bonus * 20 + cost_bonus * 25
        
        # Add noise
        return base_reward + random.uniform(-5, 5)
    
    def recommend_plant(self, order: Dict, plants: List[Dict]) -> Dict:
        """Recommend best plant for order"""
        recommendations = []
        
        for plant in plants:
            # Create state vector
            production_capacity = min(plant['current_capacity_available'] / order['quantity_kg'], 1.0)
            distance = plant['distance_to_customer_km'] / 500  # Normalize
            energy_availability = plant['energy_score']
            cost_efficiency = plant['cost_efficiency_score']
            customer_priority = order.get('priority_level', 0.5)
            
            state = np.array([production_capacity, distance, energy_availability, cost_efficiency, customer_priority])
            
            # Get action probabilities
            probs = self.get_action_probabilities(state)
            plant_score = probs[plants.index(plant)]
            
            # Calculate detailed scores
            match_score = (
                production_capacity * 30 +
                (1 - distance) * 25 +
                energy_availability * 20 +
                cost_efficiency * 25
            )
            
            recommendations.append({
                "plant_id": plant['plant_id'],
                "plant_name": plant['name'],
                "match_score": round(match_score, 2),
                "confidence": round(plant_score * 100, 2),
                "estimated_delivery_days": round(plant['distance_to_customer_km'] / 200, 1),
                "cost_estimate_usd": round(order['quantity_kg'] * plant['price_per_kg'], 2),
                "benefits": self._get_plant_benefits(plant, order),
                "requires_approval": True
            })
        
        # Sort by match score
        recommendations.sort(key=lambda x: x['match_score'], reverse=True)
        
        return {
            "order_id": order.get('id'),
            "recommendations": recommendations[:3],  # Top 3
            "top_choice": recommendations[0],
            "recommendation_reason": self._explain_recommendation(recommendations[0], order)
        }
    
    def _get_plant_benefits(self, plant: Dict, order: Dict) -> List[str]:
        """Get benefits of selecting this plant"""
        benefits = []
        
        if plant['energy_score'] > 0.8:
            benefits.append("High renewable energy availability")
        if plant['cost_efficiency_score'] > 0.7:
            benefits.append("Cost-effective production")
        if plant['distance_to_customer_km'] < 100:
            benefits.append("Fast delivery (< 1 day)")
        if plant['current_capacity_available'] > order['quantity_kg'] * 2:
            benefits.append("High production capacity")
        
        return benefits
    
    def _explain_recommendation(self, plant: Dict, order: Dict) -> str:
        """Explain why this plant is recommended"""
        reasons = []
        
        if plant['match_score'] > 80:
            reasons.append("excellent overall match")
        if plant['estimated_delivery_days'] < 1:
            reasons.append("fastest delivery option")
        if plant['cost_estimate_usd'] < order.get('budget', float('inf')):
            reasons.append("within budget")
        
        return f"{plant['plant_name']} is recommended due to " + ", ".join(reasons)

# ========================================
# AGENT 2: PLANT IMPROVEMENT ADVISOR
# ========================================

class PlantImprovementAgent(RecommendationAgent):
    """Suggests improvements for plant operations"""
    
    def __init__(self):
        # State: [efficiency, uptime, cost_index, safety_score, production_consistency]
        # Actions: [Equipment_Upgrade, Process_Optimization, Labor_Training, Energy_Efficiency, Maintenance_Improvement]
        super().__init__("PlantImprover", state_size=5, action_size=5)
        self.train()
    
    def train(self):
        """Train improvement advisor"""
        for episode in range(500):
            state = np.random.rand(self.state_size)
            action = self.select_action(state)
            reward = self._simulate_improvement_reward(state, action)
            
            # Update networks
            advantage = reward - np.dot(state, self.value_network)
            self.policy_network[:, action] += self.learning_rate * advantage * state
            self.value_network += self.learning_rate * (reward - np.dot(state, self.value_network)) * state
        
        print(f"✓ {self.name} trained")
    
    def _simulate_improvement_reward(self, state: np.ndarray, action: int) -> float:
        """Simulate reward for improvement action"""
        # Different actions have different effectiveness based on state
        effectiveness_matrix = {
            0: state[0] * 0.5,  # Equipment upgrade effective when efficiency is low
            1: state[4] * 0.6,  # Process optimization for consistency
            2: state[0] * 0.3,  # Labor training boosts efficiency
            3: (1 - state[2]) * 0.7,  # Energy efficiency reduces cost
            4: state[1] * 0.5   # Maintenance improves uptime
        }
        
        return effectiveness_matrix.get(action, 0) * 100 + random.uniform(-10, 10)
    
    def analyze_plant(self, plant: Dict) -> Dict:
        """Analyze plant and provide improvement recommendations"""
        # Create state vector
        efficiency = plant.get('efficiency_percent', 70) / 100
        uptime = plant.get('uptime_percent', 90) / 100
        cost_index = plant.get('cost_index', 0.5)
        safety_score = plant.get('safety_score', 85) / 100
        production_consistency = plant.get('consistency_score', 80) / 100
        
        state = np.array([efficiency, uptime, cost_index, safety_score, production_consistency])
        
        # Get action probabilities
        action_probs = self.get_action_probabilities(state)
        
        improvements = [
            {
                "category": "Equipment Upgrade",
                "priority": round(action_probs[0] * 100, 2),
                "suggestions": [
                    "Upgrade electrolyzers to latest PEM technology",
                    "Install advanced automation systems",
                    "Replace aging compressors"
                ],
                "expected_roi": round(random.uniform(1.2, 2.5), 2),
                "implementation_cost_usd": round(random.uniform(50000, 200000), 0)
            },
            {
                "category": "Process Optimization",
                "priority": round(action_probs[1] * 100, 2),
                "suggestions": [
                    "Optimize energy dispatch algorithms",
                    "Implement predictive maintenance scheduling",
                    "Streamline production workflow"
                ],
                "expected_roi": round(random.uniform(1.5, 3.0), 2),
                "implementation_cost_usd": round(random.uniform(20000, 80000), 0)
            },
            {
                "category": "Labor Training",
                "priority": round(action_probs[2] * 100, 2),
                "suggestions": [
                    "Advanced safety training programs",
                    "Operational efficiency workshops",
                    "Emergency response drills"
                ],
                "expected_roi": round(random.uniform(1.3, 2.0), 2),
                "implementation_cost_usd": round(random.uniform(10000, 40000), 0)
            },
            {
                "category": "Energy Efficiency",
                "priority": round(action_probs[3] * 100, 2),
                "suggestions": [
                    "Install solar panel tracking systems",
                    "Optimize battery storage usage",
                    "Reduce grid dependency"
                ],
                "expected_roi": round(random.uniform(1.8, 3.5), 2),
                "implementation_cost_usd": round(random.uniform(30000, 150000), 0)
            },
            {
                "category": "Maintenance Improvement",
                "priority": round(action_probs[4] * 100, 2),
                "suggestions": [
                    "Implement IoT sensor monitoring",
                    "Establish preventive maintenance schedule",
                    "Create spare parts inventory"
                ],
                "expected_roi": round(random.uniform(1.4, 2.3), 2),
                "implementation_cost_usd": round(random.uniform(25000, 100000), 0)
            }
        ]
        
        # Sort by priority
        improvements.sort(key=lambda x: x['priority'], reverse=True)
        
        # Identify bottlenecks
        bottlenecks = []
        if efficiency < 0.7:
            bottlenecks.append("Low electrolyzer efficiency")
        if uptime < 0.85:
            bottlenecks.append("Frequent equipment downtime")
        if cost_index > 0.6:
            bottlenecks.append("High operational costs")
        if safety_score < 0.8:
            bottlenecks.append("Safety concerns requiring attention")
        
        return {
            "plant_id": plant.get('plant_id'),
            "overall_health": round((efficiency + uptime + safety_score + production_consistency) * 25, 2),
            "bottlenecks": bottlenecks,
            "top_improvements": improvements[:3],
            "all_improvements": improvements,
            "estimated_annual_savings_usd": round(random.uniform(100000, 500000), 0)
        }

# ========================================
# AGENT 3: CUSTOMER ORDER ROUTING
# ========================================

class OrderRoutingAgent(RecommendationAgent):
    """Optimizes customer order to plant matching"""
    
    def __init__(self):
        super().__init__("OrderRouter", state_size=6, action_size=5)
        self.train()
    
    def train(self):
        """Train order routing agent"""
        for episode in range(500):
            state = np.random.rand(self.state_size)
            action = self.select_action(state)
            reward = random.uniform(50, 100)
            
            advantage = reward - np.dot(state, self.value_network)
            self.policy_network[:, action] += self.learning_rate * advantage * state
            self.value_network += self.learning_rate * (reward - np.dot(state, self.value_network)) * state
        
        print(f"✓ {self.name} trained")
    
    def route_order(self, order: Dict, plants: List[Dict]) -> Dict:
        """Route customer order to optimal plant with approval mechanism"""
        plant_selector = PlantSelectionAgent()
        recommendation = plant_selector.recommend_plant(order, plants)
        
        # Add customer approval mechanism
        recommendation['approval_required'] = True
        recommendation['approval_options'] = [
            {"option": "approve", "label": "Approve recommended plant"},
            {"option": "alternative", "label": "Request alternative plant"},
            {"option": "custom", "label": "Choose custom plant"}
        ]
        
        return recommendation

# ========================================
# UNIFIED RECOMMENDATION SYSTEM
# ========================================

# Global agents
plant_selector_agent = None
improvement_agent = None
routing_agent = None

def initialize_recommendation_system():
    """Initialize all recommendation agents"""
    global plant_selector_agent, improvement_agent, routing_agent
    
    print("Initializing Recommendation System with Reinforcement Learning...")
    plant_selector_agent = PlantSelectionAgent()
    improvement_agent = PlantImprovementAgent()
    routing_agent = OrderRoutingAgent()
    print("✓ Recommendation System ready")

def get_plant_recommendation_for_order(order: Dict, plants: List[Dict]) -> Dict:
    """Get plant recommendation for customer order"""
    global plant_selector_agent
    if plant_selector_agent is None:
        initialize_recommendation_system()
    
    return plant_selector_agent.recommend_plant(order, plants)

def get_plant_improvements(plant: Dict) -> Dict:
    """Get improvement recommendations for a plant"""
    global improvement_agent
    if improvement_agent is None:
        initialize_recommendation_system()
    
    return improvement_agent.analyze_plant(plant)

def route_customer_order(order: Dict, plants: List[Dict]) -> Dict:
    """Route customer order with approval mechanism"""
    global routing_agent
    if routing_agent is None:
        initialize_recommendation_system()
    
    return routing_agent.route_order(order, plants)

# Auto-initialize on import
if __name__ != "__main__":
    initialize_recommendation_system()
