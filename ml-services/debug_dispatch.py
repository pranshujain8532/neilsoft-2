"""Debug Smart Dispatch - Test the recommender directly"""
import os
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
from models.plant_recommender import HybridPlantRecommender

# Init
URL = os.getenv('SUPABASE_URL')
KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')
GMAP = os.getenv('GOOGLE_MAPS_API_KEY')

print("=== SMART DISPATCH DEBUG ===")
print(f"Supabase URL: {URL[:30]}...")
print(f"Google Maps API: {'Set' if GMAP else 'NOT SET'}")

# Get Data
supabase = create_client(URL, KEY)

print("\n--- Plants ---")
plants = supabase.table('plants').select('id,name,status,latitude,longitude').execute()
for p in plants.data:
    print(f"  {p['name']}: status={p['status']}, lat={p.get('latitude')}, lng={p.get('longitude')}")

print("\n--- Vehicles ---")
vehicles = supabase.table('vehicles').select('id,registration,status').execute()
for v in vehicles.data:
    print(f"  {v['registration']}: status={v['status']}")

print("\n--- Orders (Confirmed or Pending) ---")
orders = supabase.table('orders').select('id,status,delivery_address,quantity').in_('status', ['pending', 'confirmed']).execute()
for o in orders.data:
    print(f"  Order #{o['id'][:8]}: status={o['status']}, qty={o.get('quantity')}, addr={o.get('delivery_address', 'N/A')[:30]}...")

# Test Recommender
if orders.data:
    print("\n--- Testing Recommender ---")
    engine = HybridPlantRecommender(URL, KEY, GMAP)
    test_order = orders.data[0]
    print(f"Testing with Order: {test_order['id'][:8]}")
    
    result = engine.recommend_for_order(test_order)
    
    if result:
        print(f"[OK] SUCCESS!")
        print(f"   Plant: {result['plant']['name']}")
        print(f"   Transport: {result['transport_method']}")
        print(f"   Explanation: {result['explanation']}")
    else:
        print("[ERROR] FAILED: recommend_for_order returned None")
else:
    print("\n[WARN] No pending/confirmed orders to test with")
