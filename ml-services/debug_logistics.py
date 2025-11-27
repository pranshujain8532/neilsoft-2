from supabase import create_client
import os
from dotenv import load_dotenv
import json

# Load env vars
load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')

if not url or not key:
    print("Error: Missing Supabase credentials")
    exit(1)

supabase = create_client(url, key)

print("--- Syncing Driver Names ---")
try:
    # 1. Fetch all vehicles
    response = supabase.table('vehicles').select('*').execute()
    vehicles = response.data
    
    for v in vehicles:
        updates = {}
        # Sync driver_name
        if v.get('driver') and v.get('driver') != v.get('driver_name'):
            updates['driver_name'] = v.get('driver')
            
        # Fix specific mappings if needed
        if v.get('registration') == 'TN-02-CD-5678':
            updates['driver'] = 'Suresh Babu'
            updates['driver_name'] = 'Suresh Babu'
        elif v.get('registration') == 'MH-03-EF-9012':
            updates['driver'] = 'Amit Sharma'
            updates['driver_name'] = 'Amit Sharma'
        elif v.get('registration') == 'GJ-01-AB-1234':
            updates['driver'] = 'Rajesh Kumar'
            updates['driver_name'] = 'Rajesh Kumar'
        elif v.get('registration') == 'KA-04-GH-3456':
            updates['driver'] = 'Priya Patel'
            updates['driver_name'] = 'Priya Patel'
            
        if updates:
            print(f"Updating {v.get('registration')}: {updates}")
            supabase.table('vehicles').update(updates).eq('id', v['id']).execute()
            
    print("Sync complete.")

except Exception as e:
    print(f"Error syncing drivers: {e}")

print("\n--- Checking Idle Vehicles ---")
try:
    response = supabase.table('vehicles').select('*').eq('status', 'idle').execute()
    vehicles = response.data
    print(f"Found {len(vehicles)} idle vehicles:")
    for v in vehicles:
        print(f" - {v.get('registration')} ({v.get('driver_name')}) - Status: {v.get('status')}")
except Exception as e:
    print(f"Error fetching vehicles: {e}")
