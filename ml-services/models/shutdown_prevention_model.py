"""
Shutdown Prevention Model
ML-based recommendation engine for preventing plant shutdowns
Suggests actions like cleaning solar panels, stopping turbines, reducing uptime
"""

import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
import os

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    HAS_TF = True
except ImportError:
    HAS_TF = False


# Prevention action templates
PREVENTION_ACTIONS = {
    'electrolyzer': [
        {'action': 'Reduce operating temperature', 'impact': 'Extends equipment life by 15-20%', 'cost': 'Low'},
        {'action': 'Clean membrane filters', 'impact': 'Improves efficiency by 5-10%', 'cost': 'Medium'},
        {'action': 'Check water quality input', 'impact': 'Prevents corrosion damage', 'cost': 'Low'},
        {'action': 'Calibrate pressure sensors', 'impact': 'Prevents false readings', 'cost': 'Low'},
        {'action': 'Schedule stack replacement', 'impact': 'Prevents major failure', 'cost': 'High'}
    ],
    'purifier': [
        {'action': 'Replace filter cartridges', 'impact': 'Restores 95% efficiency', 'cost': 'Medium'},
        {'action': 'Clean absorption beds', 'impact': 'Improves purity by 2-3%', 'cost': 'Low'},
        {'action': 'Check seal integrity', 'impact': 'Prevents hydrogen leaks', 'cost': 'Low'},
        {'action': 'Reduce throughput rate', 'impact': 'Decreases wear by 30%', 'cost': 'Low'}
    ],
    'cooler': [
        {'action': 'Clean cooling fins', 'impact': 'Improves heat dissipation by 25%', 'cost': 'Low'},
        {'action': 'Check refrigerant levels', 'impact': 'Maintains cooling capacity', 'cost': 'Low'},
        {'action': 'Replace fan bearings', 'impact': 'Reduces noise and vibration', 'cost': 'Medium'},
        {'action': 'Flush cooling system', 'impact': 'Removes scale buildup', 'cost': 'Low'}
    ],
    'compressor': [
        {'action': 'Change lubricating oil', 'impact': 'Extends bearing life by 40%', 'cost': 'Low'},
        {'action': 'Clean intake filters', 'impact': 'Improves compression efficiency', 'cost': 'Low'},
        {'action': 'Check valve seals', 'impact': 'Prevents pressure loss', 'cost': 'Medium'},
        {'action': 'Reduce operating pressure', 'impact': 'Decreases stress on seals', 'cost': 'Low'},
        {'action': 'Schedule piston ring replacement', 'impact': 'Prevents major rebuild', 'cost': 'High'}
    ],
    'solar_panel': [
        {'action': 'Clean solar panels', 'impact': 'Restores 10-30% efficiency', 'cost': 'Low'},
        {'action': 'Check inverter connections', 'impact': 'Prevents power loss', 'cost': 'Low'},
        {'action': 'Inspect for physical damage', 'impact': 'Early crack detection', 'cost': 'Low'},
        {'action': 'Realign tracking system', 'impact': 'Optimizes sun exposure', 'cost': 'Medium'}
    ],
    'hydro_turbine': [
        {'action': 'Reduce turbine RPM temporarily', 'impact': 'Decreases wear by 20%', 'cost': 'Low'},
        {'action': 'Clean intake screens', 'impact': 'Improves water flow', 'cost': 'Low'},
        {'action': 'Inspect runner blades', 'impact': 'Detects cavitation damage', 'cost': 'Medium'},
        {'action': 'Check bearing temperatures', 'impact': 'Early failure detection', 'cost': 'Low'}
    ],
    'windmill': [
        {'action': 'Stop turbines for inspection', 'impact': 'Extends gearbox life', 'cost': 'Low'},
        {'action': 'Grease main bearings', 'impact': 'Reduces friction by 40%', 'cost': 'Low'},
        {'action': 'Check blade pitch control', 'impact': 'Optimizes power capture', 'cost': 'Medium'},
        {'action': 'Inspect blade leading edges', 'impact': 'Prevents erosion damage', 'cost': 'Low'}
    ]
}


class ShutdownPreventionModel:
    """Generates recommendations to prevent plant shutdowns"""
    
    def __init__(self):
        self.action_templates = PREVENTION_ACTIONS
    
    def generate_recommendations(self,
                                  equipment_data: List[Dict],
                                  energy_sources: List[Dict],
                                  maintenance_predictions: List[Dict],
                                  max_recommendations: int = 10) -> List[Dict]:
        """
        Generate prevention recommendations based on equipment and energy source status
        
        Args:
            equipment_data: List of equipment with status, health_score, etc.
            energy_sources: List of energy sources with condition
            maintenance_predictions: ML predictions for each equipment
            max_recommendations: Maximum number of recommendations to return
            
        Returns:
            List of prioritized recommendations
        """
        recommendations = []
        
        # Process equipment
        for equipment in equipment_data:
            eq_type = equipment.get('equipment_type', 'electrolyzer')
            health = equipment.get('health_score', 100)
            status = equipment.get('status', 'operational')
            temp = equipment.get('temperature', 25)
            pressure = equipment.get('pressure', 1)
            uptime = equipment.get('uptime_hours', 0)
            
            # Find matching prediction
            prediction = next(
                (p for p in maintenance_predictions if p.get('equipment_id') == equipment.get('id')),
                {}
            )
            failure_prob = prediction.get('failure_probability', 0)
            
            # Determine priority
            if failure_prob > 0.7 or health < 30 or status == 'offline':
                priority = 'critical'
            elif failure_prob > 0.4 or health < 60:
                priority = 'high'
            elif failure_prob > 0.2 or health < 80:
                priority = 'medium'
            else:
                priority = 'low'
            
            # Select appropriate actions based on condition
            actions = self.action_templates.get(eq_type, [])
            
            if temp > equipment.get('max_temperature', 80) * 0.8:
                recommendations.append({
                    'equipment_id': equipment.get('id'),
                    'equipment_type': eq_type,
                    'equipment_name': equipment.get('name', eq_type.title()),
                    'recommendation': f"Reduce operating temperature (currently {temp}C)",
                    'action_type': 'reduce_load',
                    'priority': 'high' if temp > equipment.get('max_temperature', 80) * 0.9 else 'medium',
                    'estimated_impact': 'Prevents thermal damage and extends life',
                    'estimated_cost': 0
                })
            
            if uptime > 5000:
                recommendations.append({
                    'equipment_id': equipment.get('id'),
                    'equipment_type': eq_type,
                    'equipment_name': equipment.get('name', eq_type.title()),
                    'recommendation': f"Schedule maintenance - high uptime ({int(uptime)} hours)",
                    'action_type': 'inspection',
                    'priority': priority,
                    'estimated_impact': 'Prevents unexpected failures',
                    'estimated_cost': 500
                })
            
            # Add template actions based on priority
            if priority in ['critical', 'high']:
                for action in actions[:2]:
                    recommendations.append({
                        'equipment_id': equipment.get('id'),
                        'equipment_type': eq_type,
                        'equipment_name': equipment.get('name', eq_type.title()),
                        'recommendation': action['action'],
                        'action_type': self._classify_action(action['action']),
                        'priority': priority,
                        'estimated_impact': action['impact'],
                        'estimated_cost': self._estimate_cost(action['cost'])
                    })
        
        # Process energy sources
        condition_priority = {'critical': 'critical', 'poor': 'high', 'fair': 'medium'}
        
        for source in energy_sources:
            src_type = source.get('source_type', 'solar_panel')
            condition = source.get('condition', 'good')
            
            if condition in condition_priority:
                priority = condition_priority[condition]
                actions = self.action_templates.get(src_type, [])
                
                for action in actions[:2]:
                    recommendations.append({
                        'equipment_id': source.get('id'),
                        'equipment_type': src_type,
                        'equipment_name': source.get('name', src_type.replace('_', ' ').title()),
                        'recommendation': action['action'],
                        'action_type': self._classify_action(action['action']),
                        'priority': priority,
                        'estimated_impact': action['impact'],
                        'estimated_cost': self._estimate_cost(action['cost'])
                    })
        
        # Sort by priority
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        recommendations.sort(key=lambda x: priority_order.get(x['priority'], 4))
        
        # Deduplicate and limit
        seen = set()
        unique_recommendations = []
        for rec in recommendations:
            key = f"{rec['equipment_id']}_{rec['recommendation']}"
            if key not in seen:
                seen.add(key)
                rec['created_at'] = datetime.now().isoformat()
                unique_recommendations.append(rec)
        
        return unique_recommendations[:max_recommendations]
    
    def _classify_action(self, action: str) -> str:
        """Classify action type"""
        action_lower = action.lower()
        
        if 'clean' in action_lower:
            return 'cleaning'
        elif 'inspect' in action_lower or 'check' in action_lower:
            return 'inspection'
        elif 'replace' in action_lower:
            return 'replacement'
        elif 'reduce' in action_lower or 'stop' in action_lower:
            return 'reduce_load'
        elif 'repair' in action_lower:
            return 'repair'
        else:
            return 'inspection'
    
    def _estimate_cost(self, cost_level: str) -> float:
        """Convert cost level to estimated value"""
        cost_map = {'Low': 200, 'Medium': 1000, 'High': 5000}
        return cost_map.get(cost_level, 500)
    
    def get_summary(self, recommendations: List[Dict]) -> Dict:
        """Get summary of recommendations"""
        if not recommendations:
            return {
                'total': 0,
                'by_priority': {},
                'by_type': {},
                'estimated_total_cost': 0
            }
        
        by_priority = {}
        by_type = {}
        total_cost = 0
        
        for rec in recommendations:
            priority = rec.get('priority', 'medium')
            action_type = rec.get('action_type', 'inspection')
            cost = rec.get('estimated_cost', 0)
            
            by_priority[priority] = by_priority.get(priority, 0) + 1
            by_type[action_type] = by_type.get(action_type, 0) + 1
            total_cost += cost
        
        return {
            'total': len(recommendations),
            'by_priority': by_priority,
            'by_type': by_type,
            'estimated_total_cost': total_cost
        }


# Global instance
shutdown_prevention_model = ShutdownPreventionModel()
