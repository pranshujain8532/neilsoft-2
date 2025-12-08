import requests
import os
from dotenv import load_dotenv

load_dotenv()

def check_fred():
    api_key = os.getenv('FRED_API_KEY')
    print(f"API Key present: {bool(api_key)}")
    
    # Hydrogen
    h2_series = 'WPU061302'
    url_h2 = f"https://api.stlouisfed.org/fred/series/observations?series_id={h2_series}&api_key={api_key}&file_type=json&sort_order=desc&limit=1"
    
    try:
        r = requests.get(url_h2, timeout=10)
        data = r.json()
        val = data['observations'][0]['value']
        print(f"H2 Index ({h2_series}): {val}")
        
        # Calibration check
        price = (float(val) / 250.0) * 4.50
        print(f"Calculated H2 Price: ${price:.2f}/kg")
        
    except Exception as e:
        print(f"H2 Error: {e}")

    # Oxygen
    o2_series = 'PCU325120325120A'
    url_o2 = f"https://api.stlouisfed.org/fred/series/observations?series_id={o2_series}&api_key={api_key}&file_type=json&sort_order=desc&limit=1"
    
    try:
        r = requests.get(url_o2, timeout=10)
        data = r.json()
        val = data['observations'][0]['value']
        print(f"O2 Index ({o2_series}): {val}")
        
        # Calibration check
        price = (float(val) / 350.0) * 0.20
        print(f"Calculated O2 Price: ${price:.2f}/kg")
        
    except Exception as e:
        print(f"O2 Error: {e}")

if __name__ == "__main__":
    check_fred()
