import numpy as np
import os
import googlemaps
from typing import Dict, List, Optional, Tuple
from supabase import create_client, Client
from dotenv import load_dotenv

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    HAS_TF = True
except ImportError:
    HAS_TF = False
    print("[WARN] TensorFlow not available, using rule-based only")

class HybridPlantRecommender:
    def __init__(self, supabase_url, supabase_key, google_maps_key, model_path='models/saved/plant_recommender_nn.h5'):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.gmaps = googlemaps.Client(key=google_maps_key) if google_maps_key else None
        
        self.rule_weights = {
            'capacity_match': 0.35,
            'distance': 0.25,
            'lcoh': 0.20,
            'availability': 0.15,
            'renewable_score': 0.05
        }

    def get_coordinates(self, address: str) -> Tuple[float, float]:
        if not self.gmaps:
            print("[WARN] No Google Maps Key. Returning Default (Nagpur, India Center)")
            return 21.1458, 79.0882 
        
        try:
            geocode_result = self.gmaps.geocode(address)
            if geocode_result:
                loc = geocode_result[0]['geometry']['location']
                return loc['lat'], loc['lng']
        except Exception as e:
            print(f"[WARN] Geocoding error: {e}")
        
        return 21.1458, 79.0882

    def calculate_distance(self, lat1, lon1, lat2, lon2) -> float:
        from math import radians, sin, cos, sqrt, atan2
        R = 6371
        dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c

    def score_plant(self, plant: Dict, order_details: Dict) -> Tuple[float, Dict]:
        p_cap = float(plant.get('capacity_mw', 50)) * 1000
        p_lcoh = float(plant.get('lcoh', 2.5))
        p_avail = 1.0 if plant.get('status') == 'operational' else 0.0
        p_renew = float(plant.get('renewable_percentage', 0)) / 100
        
        o_qty = float(order_details.get('quantity', 1000))
        dist = order_details.get('distance_km', 500)

        cap_ratio = min(o_qty / (p_cap + 1), 1.0)
        s_cap = 1.0 - abs(cap_ratio - 0.5)

        s_dist = max(0, 1.0 - (dist / 2000))

        s_lcoh = max(0, 1.0 - (p_lcoh - 1.0) / 4.0)

        w = self.rule_weights
        final_score = (
            w['capacity_match'] * s_cap +
            w['distance'] * s_dist +
            w['lcoh'] * s_lcoh +
            w['availability'] * p_avail +
            w['renewable_score'] * p_renew
        )
        
        contributions = {
            'Capacity': round(w['capacity_match'] * s_cap, 2),
            'Distance': round(w['distance'] * s_dist, 2),
            'Low Cost': round(w['lcoh'] * s_lcoh, 2),
            'Availability': round(w['availability'] * p_avail, 2),
            'Renewable': round(w['renewable_score'] * p_renew, 2)
        }
        return final_score, contributions

    def process_pending_orders(self):
        print("\n🔄 RECOMMENDATION ENGINE STARTING...")
        
        orders = self.supabase.table('orders').select('*').eq('status', 'pending').execute().data
        plants = self.supabase.table('plants').select('*').execute().data
        
        if not orders:
            print("   [OK] No pending orders.")
            return

        for order in orders:
            print(f"\n📦 Processing Order #{order['id'][:8]} (Qty: {order['quantity']}kg)")
            
            if order.get('delivery_latitude') and order.get('delivery_longitude'):
                o_lat, o_lon = order['delivery_latitude'], order['delivery_longitude']
            else:
                addr = order.get('delivery_address', 'India')
                print(f"   📍 Geocoding address: {addr}")
                o_lat, o_lon = self.get_coordinates(addr)
                self.supabase.table('orders').update({'delivery_latitude': o_lat, 'delivery_longitude': o_lon}).eq('id', order['id']).execute()

            valid_plants = []
            
            for plant in plants:
                p_lat = float(plant.get('latitude') or 0)
                p_lon = float(plant.get('longitude') or 0)
                dist_km = self.calculate_distance(p_lat, p_lon, o_lat, o_lon)
                
                has_pipeline = plant.get('pipeline_available', False)
                if isinstance(plant.get('pipeline_available'), str):
                     if plant.get('pipeline_available').lower() == 'true':
                         has_pipeline = True
                
                is_viable = True
                if dist_km > 500 and not has_pipeline:
                    is_viable = False
                    print(f"   [ERROR] Skipping {plant['name']} (Dist: {int(dist_km)}km, No Pipeline)")
                
                if is_viable:
                    plant['calc_distance'] = dist_km
                    valid_plants.append(plant)

            if not valid_plants:
                print("   [WARN] No plants met strict criteria. Falling back to all plants.")
                for p in plants:
                    p['calc_distance'] = self.calculate_distance(float(p['latitude']), float(p['longitude']), o_lat, o_lon)
                    valid_plants.append(p)

            best_plant = None
            best_score = -1
            best_explanation = ""
            transport_method = "truck"
            best_contribs = {}

            for plant in valid_plants:
                score, contribs = self.score_plant(plant, {'quantity': order['quantity'], 'distance_km': plant['calc_distance']})
                
                if order.get('priority_score', 0) > 0:
                    score += 0.1
                
                if score > best_score:
                    best_score = score
                    best_plant = plant
                    best_contribs = contribs
                    
                    is_pipe = plant.get('pipeline_available', False)
                    if plant['calc_distance'] > 500 and is_pipe:
                        transport_method = "pipeline"
                    else:
                        transport_method = "truck"

            if best_plant:
                factors = sorted(best_contribs.items(), key=lambda x: x[1], reverse=True)
                top_1 = factors[0]
                top_2 = factors[1]
                
                explanation = f"I picked {best_plant['name']} because {top_1[0]} (+{top_1[1]}) and {top_2[0]} (+{top_2[1]}) were strong factors."
                
                if transport_method == 'pipeline':
                    explanation += " Chosen via Pipeline availability (Long Distance)."
                elif best_plant.get('lcoh', 0) > 2.0:
                    explanation += f" High Cost (-{best_contribs['Low Cost']}) was outweighed by Availability."

                update_payload = {
                    'assigned_plant_id': best_plant['id'],
                    'status': 'assigned',
                    'transport_method': transport_method,
                    'ai_explanation': explanation
                }
                self.supabase.table('orders').update(update_payload).eq('id', order['id']).execute()
                self.supabase.table('orders').update(update_payload).eq('id', order['id']).execute()
                print(f"   [OK] ASSIGNED: {best_plant['name']} via {transport_method.upper()}")
                print(f"   📝 {explanation}")

    def recommend_for_order(self, order: Dict) -> Dict:
        print(f"\n🧠 AI Recommender: Analyzing Order #{order.get('id', 'NEW')[:8] if order.get('id') else 'NEW'}")

        plants = self.supabase.table('plants').select('*').eq('status', 'operational').execute().data
        if not plants:
            print("   [ERROR] No operational plants found")
            return None

        if order.get('delivery_latitude') and order.get('delivery_longitude'):
            o_lat, o_lon = order['delivery_latitude'], order['delivery_longitude']
        else:
            addr = order.get('delivery_address', 'India')
            print(f"   📍 Geocoding: {addr[:50]}...")
            o_lat, o_lon = self.get_coordinates(addr)
        
        plants_with_distance = []
        for plant in plants:
            p_lat = float(plant.get('latitude') or 0)
            p_lon = float(plant.get('longitude') or 0)
            dist_km = self.calculate_distance(p_lat, p_lon, o_lat, o_lon)
            plant['calc_distance'] = dist_km
            plants_with_distance.append(plant)
            print(f"   📏 {plant['name']}: {int(dist_km)}km")
        
        plants_under_500 = [p for p in plants_with_distance if p['calc_distance'] <= 500]
        plants_over_500 = [p for p in plants_with_distance if p['calc_distance'] > 500]
        
        print(f"\n   [DATA] Distance Analysis:")
        print(f"      Plants ≤500km: {len(plants_under_500)}")
        print(f"      Plants >500km: {len(plants_over_500)}")
        
        if len(plants_under_500) == 0:
            candidates = plants_with_distance
            print(f"   ⚡ All plants far (>500km). Considering all for recommendation.")
        elif len(plants_over_500) == 0:
            candidates = plants_with_distance
            print(f"   [OK] All plants close (≤500km). Considering all for recommendation.")
        else:
            candidates = plants_under_500
            print(f"   [INFO] Mixed distances. Filtering to {len(plants_under_500)} close plants.")

        best_plant = None
        best_score = -1
        best_contribs = {}

        for plant in candidates:
            score, contribs = self.score_plant(plant, {'quantity': order.get('quantity', 1000), 'distance_km': plant['calc_distance']})
            
            if order.get('priority_score', 0) > 0:
                score += 0.1
            
            if score > best_score:
                best_score = score
                best_plant = plant
                best_contribs = contribs

        if not best_plant:
            print("   [ERROR] No plant could be selected")
            return None

        transport_method = "truck"
        has_pipeline = False
        if isinstance(best_plant.get('pipeline_available'), bool):
            has_pipeline = best_plant.get('pipeline_available')
        elif isinstance(best_plant.get('pipeline_available'), str):
            if best_plant.get('pipeline_available').lower() == 'true':
                has_pipeline = True

        if best_plant['calc_distance'] > 500 and has_pipeline:
            transport_method = "pipeline"
            print(f"   🧪 Selected plant is {int(best_plant['calc_distance'])}km away with pipeline -> Pipeline Transport")
        else:
            print(f"   🚛 Selected plant is {int(best_plant['calc_distance'])}km away -> Truck Transport")

        factors = sorted(best_contribs.items(), key=lambda x: x[1], reverse=True)
        explanation = f"Selected {best_plant['name']} based on {factors[0][0]} and {factors[1][0]}."
        
        if transport_method == 'pipeline':
            explanation += " Using Pipeline for long-distance delivery."
        elif best_plant.get('lcoh', 0) > 2.0:
            explanation += " Prioritized availability over cost."

        print(f"   [OK] SELECTED: {best_plant['name']} (Score: {best_score:.3f}) via {transport_method.upper()}")

        return {
            'plant': best_plant,
            'transport_method': transport_method,
            'explanation': explanation,
            'score': best_score,
            'details': best_contribs
        }

if __name__ == "__main__":
    URL = os.getenv('SUPABASE_URL')
    KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
    GMAP = os.getenv('GOOGLE_MAPS_API_KEY')
    
    engine = HybridPlantRecommender(URL, KEY, GMAP)
    engine.process_pending_orders()
