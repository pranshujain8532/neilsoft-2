import os
from supabase import create_client, Client
from dotenv import load_dotenv
import json

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing env vars")
    exit(1)

supabase: Client = create_client(url, key)

try:
    with open('events_schema.txt', 'w') as f:
        res = supabase.table('maintenance_events').select('*').limit(1).execute()
        if res.data:
            f.write(f"KEYS: {list(res.data[0].keys())}\n")
            f.write(f"SAMPLE: {json.dumps(res.data[0])}\n")
        else:
            f.write("Table 'maintenance_events' is empty.\n")
    print("Schema written to events_schema.txt")
except Exception as e:
    print(f"Error: {e}")
