"""
Script to run profit predictions and save them to the database
This fetches all plants and generates profit predictions using the trained model
"""

import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.profit_predictor import profit_predictor
from supabase import create_client
from dotenv import load_dotenv

# Load environment
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

# Initialize Supabase
url = os.environ.get('VITE_SUPABASE_URL')
key = os.environ.get('VITE_SUPABASE_ANON_KEY')

if not url or not key:
    print("[ERROR] Missing Supabase credentials")
    exit(1)

supabase = create_client(url, key)

print("=" * 60)
print("PROFIT PREDICTION & DATABASE SAVE")
print("=" * 60)

# Fetch all plants
print("\n📋 Fetching plants from database...")
response = supabase.table('plants').select('*').execute()
plants = response.data

if not plants:
    print("[ERROR] No plants found")
    exit(1)

print(f"[OK] Found {len(plants)} plants\n")

# Generate predictions for each plant
for i, plant in enumerate(plants, 1):
    plant_id = plant['id']
    plant_name = plant.get('name', 'Unknown Plant')
    
    print(f"{'─' * 60}")
    print(f"[{i}/{len(plants)}] Processing: {plant_name}")
    print(f"Plant ID: {plant_id}")
    
    # Get recent production data for this plant
    try:
        prod_response = supabase.table('production_history')\
            .select('*')\
            .eq('plant_id', plant_id)\
            .order('timestamp', desc=True)\
            .limit(1)\
            .execute()
        
        if prod_response.data and len(prod_response.data) > 0:
            latest_prod = prod_response.data[0]
            production_kg = latest_prod.get('production_kg', 500)
            lcoh = latest_prod.get('lcoh', 2.0)
            print(f"   Latest production: {production_kg} kg")
            print(f"   LCOH: ${lcoh}/kg")
        else:
            # Use defaults if no production data
            production_kg = 500
            lcoh = 2.0
            print(f"   Using default values")
    except Exception as e:
        print(f"   [WARN] Could not fetch production data: {e}")
        production_kg = 500
        lcoh = 2.0
    
    # Prepare input data
    plant_data = {
        'plant_id': plant_id,
        'currentProduction': production_kg,
        'lcoh': lcoh,
        'labor_cost': 1200
    }
    
    # Generate prediction and save to DB
    print(f"   🔮 Generating profit prediction...")
    prediction = profit_predictor.predict(plant_data, save_to_db=True)
    
    print(f"   💰 Predicted Daily Profit: ${prediction['predicted_profit']:,.2f}")
    print(f"   [DATA] Confidence: {prediction['confidence'] * 100:.1f}%")
    print(f"   🤖 Model: {prediction['model_type']}")
    print(f"   [TIP] {prediction['recommendation']}\n")

print("=" * 60)
print("[OK] All predictions generated and saved to database!")
print("=" * 60)
