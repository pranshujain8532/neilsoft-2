import sys
import os
import time
from datetime import datetime
import numpy as np
from dotenv import load_dotenv
from supabase import create_client

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def debug_hourly_update():
    print("Starting debug update...")
    try:
        load_dotenv()
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_KEY')
        
        if not url or not key:
            print("Missing Supabase credentials")
            return

        supabase = create_client(url, key)
        
        # Fetch all plants
        response = supabase.table('plants').select('*').execute()
        plants = response.data
        print(f"Found {len(plants)} plants")
        
        # Import models
        print("Importing profit_predictor...")
        from models.profit_predictor import profit_predictor
        print("Import successful")
        
        for plant in plants:
            plant_id = plant['id']
            capacity = plant.get('capacity_mw', 50)
            print(f"Processing plant {plant.get('name')}...")
            
            # 1. Generate & Save Production Data
            efficiency = np.random.uniform(85, 98)
            production_kg = (capacity * 10) * (efficiency / 100)
            lcoh = np.random.uniform(1.8, 2.5)
            
            prod_data = {
                'plant_id': plant_id,
                'production_kg': round(production_kg, 2),
                'efficiency_percent': round(efficiency, 2),
                'lcoh': round(lcoh, 2),
                'timestamp': datetime.now().isoformat()
            }
            
            print(f"Inserting production data: {prod_data}")
            supabase.table('production_history').insert(prod_data).execute()
            
            # 2. Generate & Save ML Predictions
            profit_pred = profit_predictor.predict({
                'currentProduction': production_kg,
                'lcoh': lcoh,
                'labor_cost': 1200
            })
            
            ml_data_profit = {
                'prediction_type': 'profitability',
                'plant_id': plant_id,
                'input_data': {
                    'production': production_kg,
                    'lcoh': lcoh,
                    'labor_cost': 1200
                },
                'output_data': profit_pred
            }
            print(f"Inserting profit prediction")
            supabase.table('ml_predictions').insert(ml_data_profit).execute()
            
        print("Debug update completed successfully")

    except Exception as e:
        print("\n!!! ERROR OCCURRED !!!")
        print(f"Type: {type(e)}")
        print(f"Error: {e}")
        if hasattr(e, 'message'):
            print(f"Message: {e.message}")
        if hasattr(e, 'details'):
            print(f"Details: {e.details}")
        if hasattr(e, 'hint'):
            print(f"Hint: {e.hint}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_hourly_update()
