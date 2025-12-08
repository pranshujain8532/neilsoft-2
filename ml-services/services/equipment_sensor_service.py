"""
Equipment Sensor Service
Manages real-time sensor data for plant equipment
Fetches from Supabase DB ONLY - NO MOCK DATA
"""

import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from supabase import create_client

# Initialize Supabase
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
supabase = None

if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("[OK] Equipment Sensor Service connected to Supabase")
    except Exception as e:
        print(f"[WARN] Failed to connect to Supabase: {e}")


class EquipmentSensorService:
    """Service for managing equipment sensor data - DB ONLY, NO MOCK DATA"""
    
    def __init__(self):
        self.supabase = supabase
    
    def get_equipment_by_plant(self, plant_id: str) -> List[Dict]:
        """Get all equipment for a plant from plant_equipment table"""
        if not self.supabase:
            print("[WARN] No DB connection")
            return []
        
        try:
            response = self.supabase.table('plant_equipment').select('*').eq('plant_id', plant_id).execute()
            if not response.data:
                print(f"[INFO] No equipment found for plant {plant_id}")
                return []
            return response.data
        except Exception as e:
            print(f"[ERROR] Failed to fetch equipment: {e}")
            return []
    
    def get_equipment_sensor_data(self, equipment_id: str, hours: int = 48) -> List[Dict]:
        """Get sensor data history from equipment_sensor_data table"""
        if not self.supabase:
            return []
        
        try:
            since = datetime.now() - timedelta(hours=hours)
            response = self.supabase.table('equipment_sensor_data') \
                .select('*') \
                .eq('equipment_id', equipment_id) \
                .gte('recorded_at', since.isoformat()) \
                .order('recorded_at') \
                .execute()
            
            if not response.data:
                print(f"[INFO] No sensor data found for equipment {equipment_id}")
                return []
            return response.data
        except Exception as e:
            print(f"[ERROR] Failed to fetch sensor data: {e}")
            return []
    
    def get_energy_sources_by_plant(self, plant_id: str) -> List[Dict]:
        """Get all energy sources from energy_sources table"""
        if not self.supabase:
            return []
        
        try:
            response = self.supabase.table('energy_sources').select('*').eq('plant_id', plant_id).execute()
            if not response.data:
                print(f"[INFO] No energy sources found for plant {plant_id}")
                return []
            return response.data
        except Exception as e:
            print(f"[ERROR] Failed to fetch energy sources: {e}")
            return []
    
    def update_equipment_status(self, equipment_id: str, status: str) -> Dict:
        """Update equipment status in plant_equipment table"""
        if not self.supabase:
            return {'success': False, 'error': 'No DB connection'}
        
        try:
            response = self.supabase.table('plant_equipment') \
                .update({'status': status, 'updated_at': datetime.now().isoformat()}) \
                .eq('id', equipment_id) \
                .execute()
            return {'success': True, 'equipment_id': equipment_id, 'status': status}
        except Exception as e:
            print(f"[ERROR] Failed to update status: {e}")
            return {'success': False, 'error': str(e)}
    
    def update_equipment_thresholds(self, equipment_id: str, thresholds: Dict) -> Dict:
        """Update equipment thresholds in plant_equipment table"""
        if not self.supabase:
            return {'success': False, 'error': 'No DB connection'}
        
        try:
            update_data = {'updated_at': datetime.now().isoformat()}
            if 'max_temperature' in thresholds:
                update_data['max_temperature'] = thresholds['max_temperature']
            if 'max_pressure' in thresholds:
                update_data['max_pressure'] = thresholds['max_pressure']
            if 'max_uptime_hours' in thresholds:
                update_data['max_uptime_hours'] = thresholds['max_uptime_hours']
            
            response = self.supabase.table('plant_equipment') \
                .update(update_data) \
                .eq('id', equipment_id) \
                .execute()
            return {'success': True, 'equipment_id': equipment_id, 'updated': update_data}
        except Exception as e:
            print(f"[ERROR] Failed to update thresholds: {e}")
            return {'success': False, 'error': str(e)}
    
    def update_energy_source_condition(self, source_id: str, condition: str, notes: str = None) -> Dict:
        """Update energy source condition in energy_sources table"""
        if not self.supabase:
            return {'success': False, 'error': 'No DB connection'}
        
        try:
            update_data = {
                'condition': condition,
                'updated_at': datetime.now().isoformat()
            }
            if notes:
                update_data['notes'] = notes
            
            response = self.supabase.table('energy_sources') \
                .update(update_data) \
                .eq('id', source_id) \
                .execute()
            return {'success': True, 'source_id': source_id, 'condition': condition}
        except Exception as e:
            print(f"[ERROR] Failed to update energy source: {e}")
            return {'success': False, 'error': str(e)}
    
    def record_sensor_reading(self, equipment_id: str, reading: Dict) -> Dict:
        """Record a new sensor reading to equipment_sensor_data table"""
        if not self.supabase:
            return {'success': False, 'error': 'No DB connection'}
        
        try:
            data = {
                'equipment_id': equipment_id,
                'temperature': reading.get('temperature', 25),
                'pressure': reading.get('pressure', 1),
                'uptime_hours': reading.get('uptime_hours', 0),
                'vibration': reading.get('vibration', 0),
                'power_consumption': reading.get('power_consumption', 75),
                'recorded_at': datetime.now().isoformat()
            }
            
            response = self.supabase.table('equipment_sensor_data').insert(data).execute()
            return {'success': True, 'reading_id': response.data[0]['id'] if response.data else None}
        except Exception as e:
            print(f"[ERROR] Failed to record sensor reading: {e}")
            return {'success': False, 'error': str(e)}
    
    def check_and_execute_auto_shutdown(self, plant_id: str) -> Dict:
        """Check equipment status and execute auto-shutdown if >=80% offline"""
        equipment = self.get_equipment_by_plant(plant_id)
        
        if not equipment:
            return {'shutdown_executed': False, 'reason': 'No equipment found'}
        
        offline_count = sum(1 for eq in equipment if eq.get('status') == 'offline')
        total = len(equipment)
        offline_percent = offline_count / total if total > 0 else 0
        
        if offline_percent >= 0.8:
            # Execute auto-shutdown
            for eq in equipment:
                if eq.get('status') == 'operational':
                    self.update_equipment_status(eq['id'], 'offline')
            
            # Log shutdown event
            if self.supabase:
                try:
                    self.supabase.table('plant_shutdown_predictions').insert({
                        'plant_id': plant_id,
                        'predicted_shutdown_date': datetime.now().isoformat(),
                        'days_until_shutdown': 0,
                        'reason': f'Auto-shutdown: {int(offline_percent * 100)}% equipment offline',
                        'non_operational_percent': offline_percent * 100,
                        'auto_shutdown_triggered': True,
                        'shutdown_executed_at': datetime.now().isoformat()
                    }).execute()
                except Exception as e:
                    print(f"[ERROR] Failed to log shutdown: {e}")
            
            # Update plant status
            if self.supabase:
                try:
                    self.supabase.table('plants').update({
                        'status': 'offline'
                    }).eq('id', plant_id).execute()
                except Exception as e:
                    print(f"[ERROR] Failed to update plant status: {e}")
            
            return {
                'shutdown_executed': True,
                'plant_id': plant_id,
                'offline_percent': offline_percent * 100,
                'timestamp': datetime.now().isoformat()
            }
        
        return {'shutdown_executed': False, 'offline_percent': offline_percent * 100}
    
    def save_maintenance_prediction(self, prediction: Dict) -> Dict:
        """Save ML maintenance prediction to equipment_maintenance_predictions table"""
        if not self.supabase:
            return {'success': False, 'error': 'No DB connection'}
        
        try:
            data = {
                'equipment_id': prediction.get('equipment_id'),
                'predicted_maintenance_date': prediction.get('predicted_maintenance_date'),
                'days_until_maintenance': prediction.get('days_until_maintenance'),
                'confidence_score': prediction.get('confidence_score'),
                'failure_probability': prediction.get('failure_probability'),
                'recommended_action': prediction.get('recommended_action'),
                'model_version': prediction.get('model_version', '1.0')
            }
            
            self.supabase.table('equipment_maintenance_predictions').insert(data).execute()
            return {'success': True}
        except Exception as e:
            print(f"[ERROR] Failed to save prediction: {e}")
            return {'success': False, 'error': str(e)}
    
    def save_prevention_recommendations(self, plant_id: str, recommendations: List[Dict]) -> Dict:
        """Save prevention recommendations to shutdown_prevention_recommendations table"""
        if not self.supabase:
            return {'success': False, 'error': 'No DB connection'}
        
        try:
            for rec in recommendations:
                data = {
                    'plant_id': plant_id,
                    'equipment_id': rec.get('equipment_id'),
                    'recommendation': rec.get('recommendation'),
                    'action_type': rec.get('action_type'),
                    'priority': rec.get('priority'),
                    'estimated_impact': rec.get('estimated_impact'),
                    'estimated_cost': rec.get('estimated_cost', 0)
                }
                self.supabase.table('shutdown_prevention_recommendations').insert(data).execute()
            return {'success': True, 'count': len(recommendations)}
        except Exception as e:
            print(f"[ERROR] Failed to save recommendations: {e}")
            return {'success': False, 'error': str(e)}


# Global instance
equipment_sensor_service = EquipmentSensorService()
