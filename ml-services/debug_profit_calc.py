from services.per_plant_ml_service import per_plant_ml_service
from models.profit_predictor import profit_predictor
import asyncio
import json

async def debug_one_plant():
    print("🔍 Fetching all plants...")
    plants = per_plant_ml_service._fetch_all_plants_from_db()
    
    if not plants:
        print("❌ No plants found.")
        return

    plant = plants[0] # Take the first plant
    print(f"\n🏭 Analyzing Plant: {plant['name']}")
    print(f"   ID: {plant['id']}")
    print(f"   Config: {json.dumps(plant, indent=2)}")

    # Mock weather
    weather = {'solar_irradiance': 850, 'wind_speed': 12, 'temperature': 25}
    
    # Calculate Energy
    energy_output = per_plant_ml_service.calculate_energy_production(plant, weather)
    print(f"\n⚡ Energy Output: {energy_output}")
    
    daily_mwh = energy_output['total'] * 24
    h2_tpd = daily_mwh / 50.0
    print(f"   Daily MWh: {daily_mwh}")
    print(f"   Est H2 TPD: {h2_tpd}")
    print(f"   Est H2 kg: {h2_tpd * 1000}")

    # Profit Calc
    lcoh = plant.get('base_lcoh', 2.0)
    h2_price = 4.5 # Default from predictor
    
    revenue = h2_tpd * 1000 * h2_price
    cost = h2_tpd * 1000 * lcoh
    gross = revenue - cost
    print(f"\n💰 Financials (Manual Check):")
    print(f"   Price: ${h2_price}/kg, LCOH: ${lcoh}/kg")
    print(f"   Revenue: ${revenue:,.2f}")
    print(f"   Cost: ${cost:,.2f}")
    print(f"   Gross Profit: ${gross:,.2f}")

    # Run actual prediction logic
    print("\n🤖 Running Predictor...")
    try:
        pred = per_plant_ml_service.run_profit_prediction(plant, energy_output, weather)
        print(f"   Prediction Result: {json.dumps(pred, indent=2)}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_one_plant())
