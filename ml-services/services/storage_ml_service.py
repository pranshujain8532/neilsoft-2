import threading
import time
import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import numpy as np

try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False

try:
    from models.storage_anomaly_detector import storage_anomaly_detector
    from models.storage_health_predictor import storage_health_predictor
    from models.demand_forecaster import demand_forecaster
    from models.inventory_optimizer import inventory_optimizer
    MODELS_AVAILABLE = True
except ImportError as e:
    print(f"[WARN] Storage ML models not available: {e}")
    MODELS_AVAILABLE = False


class StorageMLService:
    def __init__(self):
        self.running = False
        self.thread = None
        
        self.anomaly_interval = 30  
        self.health_interval = 3600  
        self.forecast_interval = 86400  
        self.optimization_interval = 3600  
        
        self.last_anomaly_check = 0
        self.last_health_check = 0
        self.last_forecast = 0
        self.last_optimization = 0
        
        self.latest_predictions = {
            'anomaly': {},
            'health': {},
            'forecast': {},
            'optimization': {}
        }
        
        self.supabase: Optional[Client] = None
        self._init_supabase()
    
    def _init_supabase(self):
        if not HAS_SUPABASE:
            return
        
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
        
        if url and key:
            self.supabase = create_client(url, key)
            print("[OK] Storage ML Service: Supabase initialized")
    
    def start(self):
        if self.running:
            print("[WARN] Storage ML Service already running")
            return
        
        if not MODELS_AVAILABLE:
            print("[WARN] Storage ML models not available, service not started")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        print("[OK] Storage ML Service started")
    
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("🛑 Storage ML Service stopped")
    
    def _run_loop(self):
        self._run_all_predictions()
        
        while self.running:
            try:
                current_time = time.time()
                
                if current_time - self.last_anomaly_check >= self.anomaly_interval:
                    self._run_anomaly_detection()
                    self.last_anomaly_check = current_time
                
                if current_time - self.last_health_check >= self.health_interval:
                    self._run_health_predictions()
                    self.last_health_check = current_time
                
                if current_time - self.last_forecast >= self.forecast_interval:
                    self._run_demand_forecast()
                    self.last_forecast = current_time
                
                if current_time - self.last_optimization >= self.optimization_interval:
                    self._run_inventory_optimization()
                    self.last_optimization = current_time
                
                time.sleep(10)  
                
            except Exception as e:
                print(f"[ERROR] Error in Storage ML Service loop: {e}")
                time.sleep(30)  
    
    def _run_all_predictions(self):
        print("🔄 Running initial storage ML predictions...")
        
        self._run_anomaly_detection()
        self._run_health_predictions()
        self._run_demand_forecast()
        self._run_inventory_optimization()
        
        self.last_anomaly_check = time.time()
        self.last_health_check = time.time()
        self.last_forecast = time.time()
        self.last_optimization = time.time()
        
        print("[OK] Initial predictions completed")
    
    def _get_containers(self) -> List[Dict]:
        if not self.supabase:
            return []
        
        try:
            response = self.supabase.table('containers').select('*').execute()
            return response.data or []
        except Exception as e:
            print(f"Error fetching containers: {e}")
            return []
    
    def _run_anomaly_detection(self):
        containers = self._get_containers()
        
        for container in containers:
            try:
                result = storage_anomaly_detector.detect_anomaly({
                    'container_id': container['id']
                })
                
                self.latest_predictions['anomaly'][container['id']] = result
                
                self._save_prediction(
                    container_id=container['id'],
                    prediction_type='anomaly_detection',
                    input_data={'container_id': container['id']},
                    output_data=result
                )
                
                if result.get('is_anomaly'):
                    print(f"[WARN] Anomaly detected in container {container.get('name', container['id'])}")
                    
            except Exception as e:
                print(f"Error in anomaly detection for {container['id']}: {e}")
    
    def _run_health_predictions(self):
        containers = self._get_containers()
        
        for container in containers:
            try:
                result = storage_health_predictor.predict(container)
                
                self.latest_predictions['health'][container['id']] = result
                
                self._save_prediction(
                    container_id=container['id'],
                    prediction_type='health_prediction',
                    input_data={
                        'pressure_bar': container.get('pressure_bar'),
                        'temperature_c': container.get('temperature_c'),
                        'fill_percentage': container.get('fill_percentage')
                    },
                    output_data=result
                )
                
                if 'health_score' in result:
                    self._update_container_health(container['id'], result)
                    
            except Exception as e:
                print(f"Error in health prediction for {container['id']}: {e}")
    
    def _run_demand_forecast(self):
        try:
            result = demand_forecaster.forecast()
            
            self.latest_predictions['forecast'] = result
            
            self._save_prediction(
                prediction_type='demand_forecast',
                input_data={'lookback_days': 30},
                output_data=result
            )
            
            print(f"📈 Demand forecast updated: {result['forecast_24h']['value']} kg (24h)")
            
        except Exception as e:
            print(f"Error in demand forecast: {e}")
    
    def _run_inventory_optimization(self):
        try:
            result = inventory_optimizer.optimize()
            
            self.latest_predictions['optimization'] = result
            
            self._save_prediction(
                prediction_type='inventory_optimization',
                input_data=result.get('current_state', {}),
                output_data={
                    'action': result['recommended_action'],
                    'action_name': result['action_name'],
                    'explanation': result['explanation'],
                    'confidence': result['confidence']
                }
            )
            
            if result['recommended_action'] > 0:
                print(f"📦 Inventory recommendation: {result['action_name']}")
            
        except Exception as e:
            print(f"Error in inventory optimization: {e}")
    
    def _save_prediction(self, prediction_type: str, input_data: Dict, 
                         output_data: Dict, container_id: str = None):
        if not self.supabase:
            return
        
        try:
            data = {
                'prediction_type': prediction_type,
                'input_data': input_data,
                'output_data': output_data
            }
            
            if container_id:
                try:
                    response = self.supabase.table('containers') \
                        .select('plant_id') \
                        .eq('id', container_id) \
                        .single() \
                        .execute()
                    if response.data and response.data.get('plant_id'):
                        data['plant_id'] = response.data['plant_id']
                except:
                    pass
            
            self.supabase.table('ml_predictions').insert(data).execute()
            
        except Exception as e:
            print(f"Error saving prediction: {e}")
    
    def _update_container_health(self, container_id: str, health_data: Dict):
        if not self.supabase:
            return
        
        try:
            update_data = {
                'health_score': health_data.get('health_score'),
                'status': health_data.get('health_status')
            }
            
            if 'next_inspection_recommended' in health_data:
                update_data['next_inspection_due'] = health_data['next_inspection_recommended']
            
            self.supabase.table('containers') \
                .update(update_data) \
                .eq('id', container_id) \
                .execute()
                
        except Exception as e:
            print(f"Error updating container health: {e}")
    
    def get_latest_predictions(self) -> Dict:
        return {
            'anomaly': self.latest_predictions['anomaly'],
            'health': self.latest_predictions['health'],
            'forecast': self.latest_predictions['forecast'],
            'optimization': self.latest_predictions['optimization'],
            'last_update': {
                'anomaly': datetime.fromtimestamp(self.last_anomaly_check).isoformat() if self.last_anomaly_check else None,
                'health': datetime.fromtimestamp(self.last_health_check).isoformat() if self.last_health_check else None,
                'forecast': datetime.fromtimestamp(self.last_forecast).isoformat() if self.last_forecast else None,
                'optimization': datetime.fromtimestamp(self.last_optimization).isoformat() if self.last_optimization else None
            },
            'service_running': self.running
        }
    
    def get_container_analysis(self, container_id: str) -> Dict:
        container_data = None
        
        if self.supabase:
            try:
                response = self.supabase.table('containers') \
                    .select('*') \
                    .eq('id', container_id) \
                    .single() \
                    .execute()
                container_data = response.data
            except Exception as e:
                print(f"Error fetching container: {e}")
        
        if not container_data:
            return {'error': 'Container not found'}
        
        analysis = {
            'container': container_data,
            'anomaly': storage_anomaly_detector.detect_anomaly({'container_id': container_id}),
            'health': storage_health_predictor.predict(container_data),
            'timestamp': datetime.now().isoformat()
        }
        
        if container_data.get('capacity'):
            analysis['inventory'] = inventory_optimizer.optimize({
                'capacity': container_data['capacity'],
                'current_level': container_data['capacity'] * container_data.get('fill_percentage', 50) / 100,
                'estimated_daily_demand': 200  
            })
        
        return analysis
    
    def train_all_models(self) -> Dict:
        results = {}
        
        print("🎓 Training all storage ML models...")
        
        try:
            print("\n1️⃣ Training Anomaly Detector...")
            results['anomaly_detector'] = storage_anomaly_detector.train(epochs=30)
        except Exception as e:
            results['anomaly_detector'] = {'error': str(e)}
        
        try:
            print("\n2️⃣ Training Health Predictor...")
            results['health_predictor'] = storage_health_predictor.train(epochs=50)
        except Exception as e:
            results['health_predictor'] = {'error': str(e)}
        
        try:
            print("\n3️⃣ Training Demand Forecaster...")
            results['demand_forecaster'] = demand_forecaster.train(epochs=50)
        except Exception as e:
            results['demand_forecaster'] = {'error': str(e)}
        
        try:
            print("\n4️⃣ Training Inventory Optimizer...")
            results['inventory_optimizer'] = inventory_optimizer.train(episodes=200)
        except Exception as e:
            results['inventory_optimizer'] = {'error': str(e)}
        
        print("\n[OK] All models training completed!")
        
        return results


storage_ml_service = StorageMLService()
