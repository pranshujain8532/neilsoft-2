import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')

if not url or not key:
    print("Missing Supabase credentials")
    sys.exit(1)

supabase = create_client(url, key)

print("=== VEHICLE STATUS ===")
vehicles = supabase.table('vehicles').select('id, registration, driver, status, current_order').execute()
print(f"Total vehicles: {len(vehicles.data)}")
for v in vehicles.data:
    print(f"  {v['registration']}: {v['status']} (driver: {v.get('driver', 'N/A')})")

idle_count = len([v for v in vehicles.data if v['status'] == 'idle'])
print(f"\nIdle vehicles: {idle_count}")

print("\n=== PLANT STATUS ===")
plants = supabase.table('plants').select('id, name, status, capacity_mw, latitude, longitude').execute()
print(f"Total plants: {len(plants.data)}")
for p in plants.data:
    print(f"  {p['name']}: {p.get('status', 'N/A')} (capacity: {p.get('capacity_mw', 'N/A')} MW)")

active_plants = [p for p in plants.data if p.get('status') == 'Active']
print(f"\nActive plants: {len(active_plants)}")

print("\n=== DIAGNOSIS ===")
if idle_count == 0:
    print("ERROR: No idle vehicles found")
if len(active_plants) == 0:
    print("ERROR: No active plants found")
if idle_count > 0 and len(active_plants) > 0:
    print("OK: Both idle vehicles and active plants exist")
    print("Issue might be in the recommendation logic or plant data format")
