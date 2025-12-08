"""
Storage Health Monitoring Service
Enhanced to fetch real data from Supabase and integrate with ML models
"""

import os
from datetime import datetime
from typing import Dict, List, Optional

try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False


try:
    from models.storage_health_predictor import storage_health_predictor
    from models.storage_anomaly_detector import storage_anomaly_detector
    ML_MODELS_AVAILABLE = True
except ImportError:
    ML_MODELS_AVAILABLE = False


class StorageService:
    """
    Storage service for fetching container data and running health analysis.
    Integrates with Supabase for real-time data and ML models for predictions.
    """
    
    def __init__(self):
        self.supabase: Optional[Client] = None
        self._init_supabase()
    
    def _init_supabase(self):
        """Initialize Supabase client"""
        if not HAS_SUPABASE:
            return
        
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
        
        if url and key:
            self.supabase = create_client(url, key)
    
    def get_storage_health(self) -> Dict:
        """
        Get health status for all storage containers.
        Fetches real data from Supabase and enhances with ML predictions.
        """
        containers = self._fetch_containers()
        
        enhanced_containers = []
        for container in containers:
            enhanced = self._enhance_container_with_ml(container)
            enhanced_containers.append(enhanced)
        

        total_capacity = sum(c.get('capacity', 0) for c in containers)
        total_filled = sum(
            c.get('capacity', 0) * c.get('fill_percentage', 0) / 100
            for c in containers
        )
        avg_health = (
            sum(c.get('health_score', 0) for c in enhanced_containers) / len(enhanced_containers)
            if enhanced_containers else 0
        )
        
        critical_count = sum(
            1 for c in enhanced_containers
            if c.get('health_status') == 'Critical'
        )
        
        return {
            'containers': enhanced_containers,
            'summary': {
                'total_containers': len(enhanced_containers),
                'total_capacity_kg': total_capacity,
                'total_filled_kg': round(total_filled, 1),
                'fill_percentage': round(total_filled / total_capacity * 100, 1) if total_capacity else 0,
                'average_health_score': round(avg_health, 1),
                'critical_containers': critical_count
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def _fetch_containers(self) -> List[Dict]:
        """Fetch all containers from Supabase"""
        if not self.supabase:
            return self._generate_mock_containers()
        
        try:
            response = self.supabase.table('containers').select('*').execute()
            return response.data or []
        except Exception as e:
            print(f"Error fetching containers: {e}")
            return self._generate_mock_containers()
    
    def _enhance_container_with_ml(self, container: Dict) -> Dict:
        """Enhance container data with ML predictions"""
        enhanced = dict(container)
        
        if ML_MODELS_AVAILABLE:
            # Ensure hoop stress is calculated if missing
            if not enhanced.get('hoop_stress_mpa') and enhanced.get('pressure_bar') is not None:
                enhanced['hoop_stress_mpa'] = round(enhanced['pressure_bar'] * 0.5, 1) # Simplified calculation
            
            # Format stress cycles for display
            cycles = enhanced.get('stress_cycles', 0)
            enhanced['stress_cycles_display'] = "New" if cycles == 0 else str(cycles)
            
            try:

                health_pred = storage_health_predictor.predict(container)
                enhanced['health_score'] = health_pred.get('health_score', container.get('health_score', 85))
                enhanced['health_status'] = health_pred.get('health_status', 'Unknown')
                enhanced['maintenance_probability'] = health_pred.get('maintenance_probability', 0)
                enhanced['recommendations'] = health_pred.get('recommendations', [])
                enhanced['next_inspection_recommended'] = health_pred.get('next_inspection_recommended')
                

                anomaly_result = storage_anomaly_detector.detect_anomaly({
                    'container_id': container.get('id')
                })
                enhanced['anomaly_detected'] = anomaly_result.get('is_anomaly', False)
                enhanced['anomaly_score'] = anomaly_result.get('anomaly_score', 0)
                
            except Exception as e:
                print(f"Error in ML enhancement: {e}")

                enhanced = self._calculate_basic_health(enhanced)
        else:
            enhanced = self._calculate_basic_health(enhanced)
        
        return enhanced
    
    def _calculate_basic_health(self, container: Dict) -> Dict:
        """Calculate health using physics-based rules (fallback)"""
        pressure = container.get('pressure_bar', 350)
        temp = container.get('temperature_c', 25)
        stress_cycles = container.get('stress_cycles', 1000)
        

        hoop_stress = pressure * 0.5
        material_fatigue = (stress_cycles / 10000) * 0.1
        

        health_score = 100 - (abs(pressure - 350) * 0.5) - (
            (temp - 40) * 2 if temp > 40 else 0
        ) - (material_fatigue * 100)
        
        health_score = max(0, min(100, health_score))
        
        if health_score >= 90:
            status = 'Optimal'
        elif health_score >= 70:
            status = 'Good'
        elif health_score >= 50:
            status = 'Maintenance Required'
        else:
            status = 'Critical'
        
        container['health_score'] = round(health_score, 1)
        container['health_status'] = status
        container['hoop_stress_mpa'] = round(hoop_stress, 1)
        
        # Format stress cycles
        cycles = container.get('stress_cycles', 0)
        container['stress_cycles_display'] = "New" if cycles == 0 else str(cycles)
        
        return container
    
    def _generate_mock_containers(self) -> List[Dict]:
        """Generate mock container data when Supabase is not available"""
        import random
        
        containers = []
        storage_types = ['compressed_gas', 'liquid', 'lohc']
        
        for i in range(1, 5):
            pressure = round(random.uniform(340, 360), 2)
            temp = round(random.uniform(20, 45), 2)
            stress_cycles = random.randint(100, 5000)
            
            containers.append({
                'id': f'container-{i}',
                'name': f'Tank-{i:02d}',
                'storage_type': random.choice(storage_types),
                'capacity': random.randint(5000, 15000),
                'fill_percentage': round(random.uniform(30, 90), 1),
                'pressure_bar': pressure,
                'temperature_c': temp,
                'stress_cycles': stress_cycles,
                'hydrogen_purity_percent': round(random.uniform(99.9, 99.99), 3),
                'status': 'Optimal',
                'last_inspection_date': datetime.now().strftime('%Y-%m-%d')
            })
        
        return containers
    
    def get_container_by_id(self, container_id: str) -> Optional[Dict]:
        """Get a specific container with full ML analysis"""
        if not self.supabase:
            return None
        
        try:
            response = self.supabase.table('containers') \
                .select('*') \
                .eq('id', container_id) \
                .single() \
                .execute()
            
            if response.data:
                return self._enhance_container_with_ml(response.data)
            return None
            
        except Exception as e:
            print(f"Error fetching container: {e}")
            return None
    
    def get_sensor_readings(self, container_id: str, limit: int = 50) -> List[Dict]:
        """Get recent sensor readings for a container"""
        if not self.supabase:
            return []
        
        try:
            response = self.supabase.table('storage_sensor_readings') \
                .select('*') \
                .eq('container_id', container_id) \
                .order('timestamp', desc=True) \
                .limit(limit) \
                .execute()
            
            return response.data or []
            
        except Exception as e:
            print(f"Error fetching sensor readings: {e}")
            return []
    
    def get_active_alerts(self, container_id: str = None) -> List[Dict]:
        """Get active alerts, optionally filtered by container"""
        if not self.supabase:
            return []
        
        try:
            query = self.supabase.table('storage_alerts') \
                .select('*') \
                .eq('status', 'open') \
                .order('detected_at', desc=True)
            
            if container_id:
                query = query.eq('container_id', container_id)
            
            response = query.execute()
            return response.data or []
            
        except Exception as e:
            print(f"Error fetching alerts: {e}")
            return []
    
    def get_transactions(self, container_id: str = None, limit: int = 50) -> List[Dict]:
        """Get storage transactions"""
        if not self.supabase:
            return []
        
        try:
            query = self.supabase.table('storage_transactions') \
                .select('*') \
                .order('transaction_date', desc=True) \
                .limit(limit)
            
            if container_id:
                query = query.eq('container_id', container_id)
            
            response = query.execute()
            return response.data or []
            
        except Exception as e:
            print(f"Error fetching transactions: {e}")
            return []



storage_service = StorageService()
