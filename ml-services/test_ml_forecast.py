import asyncio
import sys
import os

# Add current directory to path so we can import services
sys.path.append(os.getcwd())

from services.per_plant_ml_service import per_plant_ml_service
from services.weather_service import weather_service

async def test_forecast():
    print("Testing ML Forecast Logic...")
    
    # Test coordinates (Gujarat)
    lat, lon = 23.0225, 72.5714
    
    # 1. Test Weather Service Irradiance Calculation
    print("\n1. Testing Weather Service (Current):")
    weather = weather_service.get_weather_by_coords(lat, lon)
    print(f"Time: {weather['timestamp']}")
    print(f"Is Day: {weather.get('is_day', 'N/A')}")
    print(f"Solar Irradiance: {weather['solar_irradiance']} W/m2")
    print(f"Cloud Cover: {weather['cloud_cover']}%")
    
    if weather['solar_irradiance'] == 0 and not weather['is_day']:
        print("✅ Correct: Irradiance is 0 at night.")
    elif weather['solar_irradiance'] > 0 and not weather['is_day']:
        print("❌ Error: Irradiance > 0 at night!")
    
    # 2. Test Forecast Fetching
    print("\n2. Testing 24h Forecast:")
    forecast = weather_service.get_forecast_by_coords(lat, lon)
    print(f"Forecast intervals: {len(forecast)}")
    
    daylight_intervals = [f for f in forecast if f['solar_irradiance'] > 0]
    print(f"Intervals with sun: {len(daylight_intervals)}")
    
    if len(daylight_intervals) > 0:
        print("✅ Correct: Forecast includes daylight hours.")
    else:
        print("⚠️ Warning: No daylight in next 24h? (Possible if near pole or heavy storm, unlikely for India)")

    # 3. Test Plant Prediction
    print("\n3. Testing Plant Prediction (Gujarat):")
    prediction = await per_plant_ml_service.get_plant_predictions('gujarat')
    
    if prediction:
        print(f"Plant: {prediction['plant_name']}")
        print(f"24h Energy Output: {prediction['energy_output']['total_24h']} MWh")
        print(f"  - Solar: {prediction['energy_output']['solar_24h']} MWh")
        print(f"  - Wind: {prediction['energy_output']['wind_24h']} MWh")
        print(f"Daily Profit Prediction: ${prediction['profit_prediction']['daily_profit']}")
    else:
        print("❌ Error: Prediction failed")

if __name__ == "__main__":
    asyncio.run(test_forecast())
