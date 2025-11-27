from supabase import create_client
import os
from dotenv import load_dotenv
import json

load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')
supabase = create_client(url, key)

print("--- Vehicle Status ---")
try:
    response = supabase.table('vehicles').select('registration, status, driver_name').execute()
    for v in response.data:
        print(f"{v['registration']}: {v['status']} ({v.get('driver_name')})")
except Exception as e:
    print(f"Error fetching vehicles: {e}")

print("\n--- Plant IDs ---")
try:
    response = supabase.table('plants').select('id, name').execute()
    plants = response.data
    with open('ids.txt', 'w', encoding='utf-8') as f:
        json.dump(plants, f, indent=2)
    print("IDs written to ids.txt")
except Exception as e:
    print(f"Error fetching plants: {e}")
