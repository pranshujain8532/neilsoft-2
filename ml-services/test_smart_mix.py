import asyncio
import sys
import os

# Add current directory to path so we can import services
sys.path.append(os.getcwd())

from services.per_plant_ml_service import per_plant_ml_service
from services.weather_service import weather_service

async def test_smart_mix():
    print("Testing Smart Energy Mix Optimization...")
    
    # Test coordinates (Gujarat)
    lat, lon = 23.0225, 72.5714
    
    # 1. Get Real-Time Weather
    print("\n1. Current Weather:")
    weather = weather_service.get_weather_by_coords(lat, lon)
    print(f"Time: {weather['timestamp']}")
    print(f"Is Day: {weather.get('is_day', 'N/A')}")
    print(f"Solar Irradiance: {weather['solar_irradiance']} W/m2")
    print(f"Wind Speed: {weather['wind_speed']} m/s")
    
    # 2. Get Plant Prediction with Optimization
    print("\n2. Plant Optimization (Gujarat):")
    prediction = await per_plant_ml_service.get_plant_predictions('gujarat')
    
    if prediction:
        mix = prediction['current_mix']
        print(f"Optimization Mode: {mix['optimization_mode']}")
        print(f"Current Mix: Solar {mix['mix']['solar']}%, Wind {mix['mix']['wind']}%, Hydro {mix['mix']['hydro']}%")
        print(f"Power Output: {mix['current_power_mw']} MW")
        
        # Verification Logic
        if not weather['is_day'] and mix['mix']['solar'] == 0:
            print("✅ Correct: Solar mix is 0% at night.")
        elif weather['is_day'] and mix['mix']['solar'] > 0:
             print("✅ Correct: Solar mix is active during day.")
             
        if "Night Mode" in mix['optimization_mode'] and not weather['is_day']:
            print("✅ Correct: Night Mode active.")
            
    else:
        print("❌ Error: Prediction failed")

if __name__ == "__main__":
    asyncio.run(test_smart_mix())
