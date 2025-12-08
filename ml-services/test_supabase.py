from supabase import create_client, Client
import os

SUPABASE_URL = "https://mnigrozyrnimwzczehbr.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uaWdyb3p5cm5pbXd6Y3plaGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODcyMDksImV4cCI6MjA3OTc2MzIwOX0.vZoZMCpnwHhpm7A59dGgSuIRwjzooWROttYqkZ-wKGw"

def test_connection():
    print("Testing Supabase connection...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Client created.")
        
        # Try a simple select
        print("Attempting to fetch production_history...")
        response = supabase.table('production_history').select('*').limit(1).execute()
        print("Response received.")
        print(response)
        print("[OK] Connection successful!")
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")

if __name__ == "__main__":
    test_connection()
