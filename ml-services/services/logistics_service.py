import threading
import time
import os
import requests
import json
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

class LogisticsService:
    def __init__(self):
        self.running = False
        self.update_interval = 30  # seconds
        self.google_maps_api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        # Fallback key if env var is missing (using the one from Transport.tsx for demo)
        if not self.google_maps_api_key:
             self.google_maps_api_key = "AIzaSyDyaStNd9U3Q0BF4tDi-URy8ez19VpN57U"

    def start(self):
        """Start background logistics updates"""
        if not self.running:
            self.running = True
            self.update_thread = threading.Thread(target=self._update_loop, daemon=True)
            self.update_thread.start()
            print("✅ Logistics service started")

    def stop(self):
        """Stop background updates"""
        self.running = False
        print("🛑 Logistics service stopped")

    def _update_loop(self):
        """Main update loop"""
        while self.running:
            try:
                self._update_fleet_status()
                time.sleep(self.update_interval)
            except Exception as e:
                print(f"Error in logistics update loop: {e}")
                time.sleep(self.update_interval)

    def _update_fleet_status(self):
        """Update status and ETA for all active vehicles"""
        try:
            # Fetch vehicles in transit
            response = supabase.table('vehicles').select('*').eq('status', 'in-transit').execute()
            vehicles = response.data

            for vehicle in vehicles:
                self._update_single_vehicle(vehicle)

        except Exception as e:
            print(f"Error updating fleet status: {e}")

    def _update_single_vehicle(self, vehicle):
        """Calculate and update ETA for a single vehicle"""
        try:
            route = vehicle.get('current_route')
            if not route or ' to ' not in route:
                return

            origin, destination = route.split(' to ')
            
            # Calculate ETA using Google Maps
            eta_text, duration_value = self._get_google_maps_eta(origin, destination)
            
            if eta_text:
                # Update Supabase
                supabase.table('vehicles').update({
                    'eta': eta_text,
                    'destination_name': destination,
                    'last_updated': datetime.now().isoformat()
                }).eq('id', vehicle['id']).execute()
                # print(f"Updated vehicle {vehicle['registration']} ETA: {eta_text}")

        except Exception as e:
            print(f"Error updating vehicle {vehicle.get('registration')}: {e}")

    def _get_google_maps_eta(self, origin, destination):
        """Get ETA from Google Maps Distance Matrix API"""
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
                    duration_value = element['duration']['value'] # seconds
                    return duration_text, duration_value
            
            return None, None

        except Exception as e:
            print(f"Google Maps API error: {e}")
            return None, None

    def optimize_order_fulfillment(self, order_details):
        """Select best plant for order using ML recommender"""
        try:
            # Fetch all operational plants
            response = supabase.table('plants').select('*').eq('status', 'operational').execute()
            plants = response.data
            
            if not plants:
                return None

            # Import here to avoid circular imports
            from models.plant_recommender import plant_recommender
            
            # Convert Supabase plant data to format expected by recommender
            formatted_plants = []
            for p in plants:
                formatted_plants.append({
                    '_id': p['id'],
                    'name': p['name'],
                    'capacity': p.get('capacity_mw', 50), # TPD approximation
                    'location': {
                        'coordinates': {
                            'lat': p.get('latitude', 0),
                            'lng': p.get('longitude', 0)
                        }
                    },
                    'lcoh': 2.5, # Default if not in DB
                    'status': p['status']
                })

            # Get recommendations
            recommendations = plant_recommender.recommend_plants(formatted_plants, order_details, top_n=1)
            
            if recommendations:
                selected_plant = recommendations[0]
                
                # Find nearest idle vehicle
                # For simplicity, just find any idle vehicle, but ideally calculate distance to plant
                response = supabase.table('vehicles').select('*').eq('status', 'idle').execute()
                vehicles = response.data
                
                selected_vehicle = None
                if vehicles:
                    selected_vehicle = vehicles[0] # Pick the first one for now
                
                return {
                    'plant': selected_plant,
                    'vehicle': selected_vehicle
                }
            
            return None

        except Exception as e:
            print(f"Error optimizing order: {e}")
            return None

# Global instance
logistics_service = LogisticsService()
