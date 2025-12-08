
import os
import random
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')

if not url or not key:
    print("Error: Supabase credentials not found in .env")
    exit(1)

supabase = create_client(url, key)

def seed_stress_cycles():
    print("Fetching containers...")
    try:
        res = supabase.table('containers').select('*').execute()
        containers = res.data
        
        if not containers:
            print("No containers found to update.")
            return

        print(f"Found {len(containers)} containers.")
        
        # Hardcoded values map (index -> cycles)
        # 0: 0 (Test "New" label)
        # 1: 1500
        # 2: 4200 (High)
        # 3: 850 (Low)
        
        updates = {
            0: 0,
            1: 1540,
            2: 4250,
            3: 850
        }
        
        for i, container in enumerate(containers):
            if i in updates:
                cycles = updates[i]
                print(f"Updating Container {container.get('name', container['id'])} ({container['id']}) -> {cycles} cycles")
                
                supabase.table('containers').update({
                    'stress_cycles': cycles
                }).eq('id', container['id']).execute()
            else:
                # Random for others if any
                cycles = random.randint(100, 3000)
                print(f"Updating Container {container.get('name', container['id'])} ({container['id']}) -> {cycles} cycles (Random)")
                supabase.table('containers').update({
                    'stress_cycles': cycles
                }).eq('id', container['id']).execute()
                
        print("\n✅ Successfully updated stress cycles.")
        print("Please refresh the dashboard to see changes.")
        
    except Exception as e:
        print(f"Error updating containers: {e}")
        if hasattr(e, 'details'):
            print(f"Details: {e.details}")
        if hasattr(e, 'message'):
            print(f"Message: {e.message}")

if __name__ == "__main__":
    seed_stress_cycles()
