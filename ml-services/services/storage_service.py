"""
Storage Health Monitoring Service
Uses thermodynamic parameters to monitor container health
"""

import random
from datetime import datetime

class StorageService:
    def __init__(self):
        pass
        
    def get_storage_health(self):
        containers = []
        
        for i in range(1, 5):
            # Thermodynamic parameters for storage
            pressure = round(random.uniform(340, 360), 2)  # Target 350 bar
            temp = round(random.uniform(20, 45), 2)
            stress_cycles = random.randint(100, 5000)
            
            # Calculate health based on physics
            # Hoop stress formula approximation
            hoop_stress = (pressure * 100) / (2 * 5) # Simplified
            material_fatigue = (stress_cycles / 10000) * 0.1
            
            health_score = 100 - (abs(pressure - 350) * 0.5) - (temp > 40 and (temp-40)*2 or 0) - (material_fatigue * 100)
            
            status = 'Optimal'
            if health_score < 90: status = 'Maintenance Required'
            if health_score < 70: status = 'Critical'
            
            containers.append({
                'id': f'TK-{i:02d}',
                'type': 'Type IV Composite',
                'pressure_bar': pressure,
                'temperature_c': temp,
                'stress_cycles': stress_cycles,
                'hoop_stress_mpa': round(hoop_stress, 1),
                'health_score': round(health_score, 1),
                'status': status,
                'last_inspection': datetime.now().strftime('%Y-%m-%d')
            })
            
        return {
            'containers': containers,
            'timestamp': datetime.now().isoformat()
        }

storage_service = StorageService()
