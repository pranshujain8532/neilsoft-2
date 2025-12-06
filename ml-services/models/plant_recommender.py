"""
HYBRID Plant Recommendation System
Logic: 
1. Geocode Order Address
2. Filter: If Distance > 500km, MUST use Pipeline (else ignore plant)
3. Score: Availability (15%) + Renewable (5%) + Capacity (35%) + Distance (25%) + Cost (20%)
4. Explain decision in plain English
"""

import numpy as np
import os
import googlemaps
from typing import Dict, List, Optional, Tuple
from supabase import create_client, Client
from dotenv import load_dotenv

# Try to import TensorFlow (Optional)
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    HAS_TF = True
except ImportError:
    HAS_TF = False
    print("⚠️ TensorFlow not available, using rule-based only")

class HybridPlantRecommender:
    def __init__(self, supabase_url, supabase_key, google_maps_key, model_path='models/saved/plant_recommender_nn.h5'):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.gmaps = googlemaps.Client(key=google_maps_key) if google_maps_key else None
        
        # Scoring Weights (Total 1.0)
        self.rule_weights = {
            'capacity_match': 0.35,
            'distance': 0.25,
            'lcoh': 0.20,
            'availability': 0.15,  # Priority as requested
            'renewable_score': 0.05 # Reduced as requested
        }

    # --- GEOLOCATION HELPER ---
    def get_coordinates(self, address: str) -> Tuple[float, float]:
        """Convert address to Lat/Lon using Google Maps API"""
        if not self.gmaps:
            # Fallback for testing if no API Key
            print("⚠️ No Google Maps Key. Returning Default (Nagpur, India Center)")
            return 21.1458, 79.0882 
        
        try:
            geocode_result = self.gmaps.geocode(address)
            if geocode_result:
                loc = geocode_result[0]['geometry']['location']
                return loc['lat'], loc['lng']
        except Exception as e:
            print(f"⚠️ Geocoding error: {e}")
        
        return 21.1458, 79.0882

    def calculate_distance(self, lat1, lon1, lat2, lon2) -> float:
        """Haversine distance in km"""
        from math import radians, sin, cos, sqrt, atan2
        R = 6371 # Earth radius km
        dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c

    # --- SCORING ENGINE ---
    def score_plant(self, plant: Dict, order_details: Dict) -> Tuple[float, Dict]:
        # 1. Parse Plant Data
        p_cap = float(plant.get('capacity_mw', 50)) * 1000 # Convert MW to kg/day approx
        p_lcoh = float(plant.get('lcoh', 2.5))
        p_avail = 1.0 if plant.get('status') == 'operational' else 0.0
        p_renew = float(plant.get('renewable_percentage', 0)) / 100
        
        o_qty = float(order_details.get('quantity', 1000))
        dist = order_details.get('distance_km', 500)

        # 2. Normalize Metrics (0.0 to 1.0)
        # Capacity: Bell curve peaking at 50% utilization
        cap_ratio = min(o_qty / (p_cap + 1), 1.0)
        s_cap = 1.0 - abs(cap_ratio - 0.5)

        # Distance: Closer is better (0 score at 2000km)
        s_dist = max(0, 1.0 - (dist / 2000))

        # LCOH: Cheaper is better ($1 = 1.0 score, $5 = 0.0 score)
        s_lcoh = max(0, 1.0 - (p_lcoh - 1.0) / 4.0)

        # 3. Calculate Final Score
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

    # --- MAIN PROCESS ---
    def process_pending_orders(self):
        print("\n🔄 RECOMMENDATION ENGINE STARTING...")
        
        # 1. Fetch Data
        orders = self.supabase.table('orders').select('*').eq('status', 'pending').execute().data
        plants = self.supabase.table('plants').select('*').execute().data
        
        if not orders:
            print("   ✅ No pending orders.")
            return

        for order in orders:
            print(f"\n📦 Processing Order #{order['id'][:8]} (Qty: {order['quantity']}kg)")
            
            # 2. Get Customer Location
            if order.get('delivery_latitude') and order.get('delivery_longitude'):
                o_lat, o_lon = order['delivery_latitude'], order['delivery_longitude']
            else:
                addr = order.get('delivery_address', 'India')
                print(f"   📍 Geocoding address: {addr}")
                o_lat, o_lon = self.get_coordinates(addr)
                # Save coords to DB so we don't pay for API again
                self.supabase.table('orders').update({'delivery_latitude': o_lat, 'delivery_longitude': o_lon}).eq('id', order['id']).execute()

            # 3. Filter Candidates (The Pipeline Rule)
            valid_plants = []
            
            for plant in plants:
                p_lat = float(plant.get('latitude') or 0)
                p_lon = float(plant.get('longitude') or 0)
                dist_km = self.calculate_distance(p_lat, p_lon, o_lat, o_lon)
                
                has_pipeline = plant.get('pipeline_available', False)
                if isinstance(plant.get('pipeline_available'), str):
                     if plant.get('pipeline_available').lower() == 'true':
                         has_pipeline = True
                
                # --- STRICT LOGIC ---
                # "If distance > 500km, see ONLY plants with pipeline"
                is_viable = True
                if dist_km > 500 and not has_pipeline:
                    is_viable = False
                    print(f"   ❌ Skipping {plant['name']} (Dist: {int(dist_km)}km, No Pipeline)")
                
                if is_viable:
                    plant['calc_distance'] = dist_km
                    valid_plants.append(plant)

            # Fallback: If ALL plants were skipped, bring them back (don't fail the order)
            if not valid_plants:
                print("   ⚠️ No plants met strict criteria. Falling back to all plants.")
                for p in plants:
                    p['calc_distance'] = self.calculate_distance(float(p['latitude']), float(p['longitude']), o_lat, o_lon)
                    valid_plants.append(p)

            # 4. Score Valid Candidates
            best_plant = None
            best_score = -1
            best_explanation = ""
            transport_method = "truck"
            best_contribs = {}

            for plant in valid_plants:
                score, contribs = self.score_plant(plant, {'quantity': order['quantity'], 'distance_km': plant['calc_distance']})
                
                # Boost score if priority user
                if order.get('priority_score', 0) > 0:
                    score += 0.1 # Flat boost
                
                if score > best_score:
                    best_score = score
                    best_plant = plant
                    best_contribs = contribs
                    
                    # Determine Transport Method
                    is_pipe = plant.get('pipeline_available', False)
                    if plant['calc_distance'] > 500 and is_pipe:
                        transport_method = "pipeline"
                    else:
                        transport_method = "truck"

            # 5. Generate Explanation & Save
            if best_plant:
                # Sort factors by impact
                factors = sorted(best_contribs.items(), key=lambda x: x[1], reverse=True)
                top_1 = factors[0]
                top_2 = factors[1]
                
                explanation = f"I picked {best_plant['name']} because {top_1[0]} (+{top_1[1]}) and {top_2[0]} (+{top_2[1]}) were strong factors."
                
                if transport_method == 'pipeline':
                    explanation += " Chosen via Pipeline availability (Long Distance)."
                elif best_plant.get('lcoh', 0) > 2.0:
                    explanation += f" High Cost (-{best_contribs['Low Cost']}) was outweighed by Availability."

                # Update Supabase
                update_payload = {
                    'assigned_plant_id': best_plant['id'],
                    'status': 'assigned',
                    'transport_method': transport_method,
                    'ai_explanation': explanation
                }
                self.supabase.table('orders').update(update_payload).eq('id', order['id']).execute()
                self.supabase.table('orders').update(update_payload).eq('id', order['id']).execute()
                print(f"   ✅ ASSIGNED: {best_plant['name']} via {transport_method.upper()}")
                print(f"   📝 {explanation}")

    # --- SINGLE ORDER API ---
    def recommend_for_order(self, order: Dict) -> Dict:
        """
        Recommend a plant for a single order object.
        
        Logic:
        1. Calculate distance from each plant to customer
        2. If ALL plants > 500km OR ALL plants < 500km -> use recommendation on ALL plants
        3. If MIXED (some < 500km, some > 500km) -> filter to plants < 500km, then recommend
        
        Returns: { 'plant': ..., 'transport_method': 'truck'|'pipeline', 'explanation': ... }
        """
        print(f"\n🧠 AI Recommender: Analyzing Order #{order.get('id', 'NEW')[:8] if order.get('id') else 'NEW'}")

        # 1. Fetch Plants
        plants = self.supabase.table('plants').select('*').eq('status', 'operational').execute().data
        if not plants:
            print("   ❌ No operational plants found")
            return None

        # 2. Geocode customer location
        if order.get('delivery_latitude') and order.get('delivery_longitude'):
            o_lat, o_lon = order['delivery_latitude'], order['delivery_longitude']
        else:
            addr = order.get('delivery_address', 'India')
            print(f"   📍 Geocoding: {addr[:50]}...")
            o_lat, o_lon = self.get_coordinates(addr)
        
        # 3. Calculate distance for ALL plants
        plants_with_distance = []
        for plant in plants:
            p_lat = float(plant.get('latitude') or 0)
            p_lon = float(plant.get('longitude') or 0)
            dist_km = self.calculate_distance(p_lat, p_lon, o_lat, o_lon)
            plant['calc_distance'] = dist_km
            plants_with_distance.append(plant)
            print(f"   📏 {plant['name']}: {int(dist_km)}km")
        
        # 4. Categorize plants by distance
        plants_under_500 = [p for p in plants_with_distance if p['calc_distance'] <= 500]
        plants_over_500 = [p for p in plants_with_distance if p['calc_distance'] > 500]
        
        print(f"\n   📊 Distance Analysis:")
        print(f"      Plants ≤500km: {len(plants_under_500)}")
        print(f"      Plants >500km: {len(plants_over_500)}")
        
        # 5. Determine which plants to consider for recommendation
        if len(plants_under_500) == 0:
            # ALL plants are > 500km -> Use all plants, likely need pipeline
            candidates = plants_with_distance
            print(f"   ⚡ All plants far (>500km). Considering all for recommendation.")
        elif len(plants_over_500) == 0:
            # ALL plants are <= 500km -> Use all plants, trucks will work
            candidates = plants_with_distance
            print(f"   ✅ All plants close (≤500km). Considering all for recommendation.")
        else:
            # MIXED -> Filter to only plants under 500km (prefer truck routes)
            candidates = plants_under_500
            print(f"   🔍 Mixed distances. Filtering to {len(plants_under_500)} close plants.")

        # 6. Score candidates using recommendation system
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
            print("   ❌ No plant could be selected")
            return None

        # 7. Determine transport method based on selected plant's distance
        transport_method = "truck"
        has_pipeline = False
        if isinstance(best_plant.get('pipeline_available'), bool):
            has_pipeline = best_plant.get('pipeline_available')
        elif isinstance(best_plant.get('pipeline_available'), str):
            if best_plant.get('pipeline_available').lower() == 'true':
                has_pipeline = True

        # Only use pipeline if distance > 500km AND plant has pipeline capability
        if best_plant['calc_distance'] > 500 and has_pipeline:
            transport_method = "pipeline"
            print(f"   🧪 Selected plant is {int(best_plant['calc_distance'])}km away with pipeline -> Pipeline Transport")
        else:
            print(f"   🚛 Selected plant is {int(best_plant['calc_distance'])}km away -> Truck Transport")

        # 8. Generate Explanation
        factors = sorted(best_contribs.items(), key=lambda x: x[1], reverse=True)
        explanation = f"Selected {best_plant['name']} based on {factors[0][0]} and {factors[1][0]}."
        
        if transport_method == 'pipeline':
            explanation += " Using Pipeline for long-distance delivery."
        elif best_plant.get('lcoh', 0) > 2.0:
            explanation += " Prioritized availability over cost."

        print(f"   ✅ SELECTED: {best_plant['name']} (Score: {best_score:.3f}) via {transport_method.upper()}")

        return {
            'plant': best_plant,
            'transport_method': transport_method,
            'explanation': explanation,
            'score': best_score,
            'details': best_contribs
        }

if __name__ == "__main__":
    # Load keys
    URL = os.getenv('SUPABASE_URL')
    KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
    GMAP = os.getenv('GOOGLE_MAPS_API_KEY')
    
    engine = HybridPlantRecommender(URL, KEY, GMAP)
    engine.process_pending_orders()
