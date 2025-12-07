import os
from dotenv import load_dotenv
from supabase import create_client
import json

load_dotenv()
supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_KEY'))

plants = supabase.table('plants').select('name, status').execute()

print("Plant statuses:")
for p in plants.data:
    print(f"  {p.get('name', 'Unknown')}: '{p.get('status', 'NULL')}'")

# Count unique statuses
statuses = {}
for p in plants.data:
    status = p.get('status', 'NULL')
    statuses[status] = statuses.get(status, 0) + 1

print(f"\nStatus counts: {json.dumps(statuses, indent=2)}")
