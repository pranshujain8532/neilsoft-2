import threading
import time
import os
import requests
import json
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

class LogisticsService:
    def __init__(self):
        self.running = False
        self.update_interval = 30  
        self.google_maps_api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        if not self.google_maps_api_key:
             self.google_maps_api_key = "AIzaSyDyaStNd9U3Q0BF4tDi-URy8ez19VpN57U"

    def start(self):
        if not self.running:
            self.running = True
            self.update_thread = threading.Thread(target=self._update_loop, daemon=True)
            self.update_thread.start()
            print("[OK] Logistics service started")

    def stop(self):
        self.running = False
        print("🛑 Logistics service stopped")

    def _update_loop(self):
        while self.running:
            try:
                self._update_fleet_status()
                time.sleep(self.update_interval)
            except Exception as e:
                print(f"Error in logistics update loop: {e}")
                time.sleep(self.update_interval)

    def _update_fleet_status(self):
        try:
            response = supabase.table('vehicles').select('*').eq('status', 'in-transit').execute()
            vehicles = response.data

            for vehicle in vehicles:
                self._update_single_vehicle(vehicle)

        except Exception as e:
            print(f"Error updating fleet status: {e}")

    def _update_single_vehicle(self, vehicle):
        try:
            route = vehicle.get('current_route')
            if not route or ' to ' not in route:
                return

            origin, destination = route.split(' to ')
            
            eta_text, duration_value = self._get_google_maps_eta(origin, destination)
            
            if eta_text:
                supabase.table('vehicles').update({
                    'eta': eta_text,
                    'destination_name': destination,
                    'last_updated': datetime.now().isoformat()
                }).eq('id', vehicle['id']).execute()

        except Exception as e:
            print(f"Error updating vehicle {vehicle.get('registration')}: {e}")

    def _get_google_maps_eta(self, origin, destination):
        try:
            url = "https://maps.googleapis.com/maps/api/distancematrix/json"
            params = {
                'origins': origin,
                'destinations': destination,
                'key': self.google_maps_api_key,
                'mode': 'driving'
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data['status'] == 'OK':
                element = data['rows'][0]['elements'][0]
                if element['status'] == 'OK':
                    duration_text = element['duration']['text']
                    duration_value = element['duration']['value'] 
                    return duration_text, duration_value
            
            return None, None

        except Exception as e:
            print(f"Google Maps API error: {e}")
            return None, None

    def optimize_order_fulfillment(self, order_details):
        try:
            print(f"[INFO] Optimizing Order: {order_details.get('id')}")

            from models.plant_recommender import HybridPlantRecommender
            
            URL = os.getenv('SUPABASE_URL')
            KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
            GMAP = os.getenv('GOOGLE_MAPS_API_KEY')
            
            engine = HybridPlantRecommender(URL, KEY, GMAP)
            
            recommendation = engine.recommend_for_order(order_details)
            
            if not recommendation:
                print("[WARN] No suitable plant found via AI Recommender")
                return None
                
            selected_plant = recommendation['plant']
            transport_method = recommendation['transport_method']
            explanation = recommendation['explanation']
            
            print(f"[OK] AI Selected: {selected_plant['name']} ({transport_method})")
            
            selected_vehicle = None
            
            update_payload = {
                'assigned_plant_id': selected_plant['id'],
                'transport_method': transport_method,
                'ai_explanation': explanation,
                'status': 'processing'
            }
            supabase.table('orders').update(update_payload).eq('id', order_details['id']).execute()

            if transport_method == 'pipeline':
                print("   🧪 Pipeline Transport - No Vehicle Assigned")
                supabase.table('orders').update({'status': 'in-transit'}).eq('id', order_details['id']).execute()
                
            else:
                print("   🚛 Truck Transport - Searching for Vehicle...")
                response = supabase.table('vehicles').select('*').eq('status', 'idle').execute()
                vehicles = response.data
                
                if vehicles:
                    selected_vehicle = vehicles[0]
                    print(f"   🚚 Assigned vehicle: {selected_vehicle.get('registration')}")
                    
                    supabase.table('vehicles').update({
                        'current_order': order_details['id'],
                        'status': 'in-transit',
                        'current_route': f"{selected_plant['name']} to {order_details.get('delivery_address', 'Customer')}"
                    }).eq('id', selected_vehicle['id']).execute()
                    
                    supabase.table('orders').update({'status': 'in-transit'}).eq('id', order_details['id']).execute()
                else:
                    print("   [WARN] No idle vehicles available for truck transport")
                    raise Exception("No idle vehicles available for truck transport")

            return {
                'plant': selected_plant,
                'vehicle': selected_vehicle, 
                'transport_method': transport_method,
                'explanation': explanation,
                'optimization_method': 'hybrid_ai'
            }

        except Exception as e:
            print(f"[ERROR] Error optimizing order: {e}")
            import traceback
            traceback.print_exc()
            return None

logistics_service = LogisticsService()
