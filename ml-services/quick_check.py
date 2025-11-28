import os
from dotenv import load_dotenv
from supabase import create_client
import json

load_dotenv()
supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_KEY'))

vehicles = supabase.table('vehicles').select('status').execute()
plants = supabase.table('plants').select('status').execute()

idle_vehicles = [v for v in vehicles.data if v.get('status') == 'idle']
active_plants = [p for p in plants.data if p.get('status') == 'Active']

result = {
    'total_vehicles': len(vehicles.data),
    'idle_vehicles': len(idle_vehicles),
    'total_plants': len(plants.data),
    'active_plants': len(active_plants)
}

print(json.dumps(result, indent=2))
