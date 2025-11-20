import random
import pandas as pd
from datetime import datetime, timedelta

def predict_energy_generation():
    """
    Mock ML prediction for next 24 hours of renewable energy generation.
    """
    # Generate mock time series
    now = datetime.now()
    predictions = []
    
    for i in range(24):
        time_point = now + timedelta(hours=i)
        # Simple sine wave simulation for solar (day/night)
        hour = time_point.hour
        if 6 <= hour <= 18:
            solar_pred = 500 + 500 * random.random() # Peak during day
        else:
            solar_pred = 0
            
        wind_pred = 300 + 200 * random.random() # Random wind
        
        predictions.append({
            "timestamp": time_point.isoformat(),
            "solar_kw": round(solar_pred, 2),
            "wind_kw": round(wind_pred, 2),
            "predicted_h2_kg": round((solar_pred + wind_pred) * 0.02, 2)
        })
        
    return {
        "model_accuracy": "94.5%",
        "forecast": predictions
    }
