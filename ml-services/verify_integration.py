"""
Integration Test for Per-Plant ML Service
Tests FRED API integration and Supabase data fetching
"""

import sys
import os
import asyncio

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.per_plant_ml_service import per_plant_ml_service


async def test_integrated_service():
    print("🧪 Testing Integrated Per-Plant ML Service (FRED API + Supabase Integration)...")
    print("=" * 70)
    
    # Test 1: Check DB connection and fetch all plants
    print("\n📋 Test 1: Fetching all plants from Supabase...")
    
    try:
        all_plants = per_plant_ml_service._fetch_all_plants_from_db()
        
        if not all_plants:
            print("⚠️ No plants found in database. Make sure plants table has data.")
            print("   Creating test with first available plant or returning early...")
            return False
        
        print(f"✅ Found {len(all_plants)} plants in database:")
        for plant in all_plants:
            print(f"   - {plant['name']} ({plant['id'][:8]}...) @ {plant['location']}")
        
        # Test 2: Get predictions for first plant
        first_plant_id = all_plants[0]['id']
        print(f"\n📊 Test 2: Fetching predictions for plant: {all_plants[0]['name']}...")
        
        result = await per_plant_ml_service.get_plant_predictions(first_plant_id)
        
        if result:
            print("\n✅ Prediction Result:")
            print(f"   Plant: {result.get('plant_name')}")
            print(f"   Location: {result.get('location')}")
            print(f"   LCOH: ${result.get('lcoh')}/kg")
            
            # Weather data
            weather = result.get('weather', {})
            print(f"\n🌤️ Weather Data:")
            print(f"   - Temperature: {weather.get('temperature', 'N/A')}°C")
            print(f"   - Wind Speed: {weather.get('wind_speed', 'N/A')} m/s")
            print(f"   - Solar Irradiance: {weather.get('solar_irradiance', 'N/A')} W/m²")
            
            # Energy output
            energy = result.get('energy_output', {})
            print(f"\n⚡ Energy Output:")
            print(f"   - Solar: {energy.get('solar', 'N/A')} MW")
            print(f"   - Wind: {energy.get('wind', 'N/A')} MW")
            print(f"   - Hydro: {energy.get('hydro', 'N/A')} MW")
            print(f"   - Total: {energy.get('total', 'N/A')} MW")
            print(f"   - Capacity Factor: {energy.get('capacity_factor', 'N/A')}%")
            
            # Profit prediction
            profit_data = result.get('profit_prediction', {})
            print(f"\n💰 Profit Prediction:")
            print(f"   - H2 Production: {profit_data.get('h2_production_kg', 'N/A')} kg/day")
            print(f"   - Daily Profit: ${profit_data.get('daily_profit', 'N/A')}")
            print(f"   - Monthly Profit: ${profit_data.get('monthly_profit', 'N/A')}")
            print(f"   - Profit Margin: {profit_data.get('profit_margin', 'N/A')}%")
            print(f"   - Model Type: {profit_data.get('model_type', 'N/A')}")
            
            # Oxygen Data
            oxygen_data = profit_data.get('oxygen_data', {})
            if oxygen_data:
                print(f"\n💨 Oxygen Savings Data:")
                print(f"   - Market Price: ${oxygen_data.get('price_per_kg', 'N/A')}/kg")
                print(f"   - Savings Generated: ${oxygen_data.get('savings_generated', 'N/A')}")
                
                if oxygen_data.get('price_per_kg', 0) > 0:
                    print("\n✅ Oxygen price fetched successfully!")
            
            # Safety status
            safety = result.get('safety_status', {})
            print(f"\n🛡️ Safety Status:")
            print(f"   - Status: {safety.get('status', 'N/A')}")
            print(f"   - Anomaly Score: {safety.get('anomaly_score', 'N/A')}")
            
            print("\n" + "=" * 70)
            print("✅ All tests passed!")
            return True
        else:
            print("\n❌ Error: Service returned None")
            return False
            
    except Exception as e:
        print(f"\n❌ Error during service execution: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_all_plants():
    """Test predictions for all plants in database"""
    print("\n🌍 Testing predictions for ALL plants...")
    print("=" * 70)
    
    try:
        results = await per_plant_ml_service.get_all_plants_predictions()
        
        if not results:
            print("⚠️ No prediction results returned")
            return False
        
        print(f"\n✅ Successfully generated predictions for {len(results)} plants:\n")
        
        for result in results:
            profit = result.get('profit_prediction', {})
            print(f"🏭 {result.get('plant_name')}")
            print(f"   Location: {result.get('location')}")
            print(f"   Daily Profit: ${profit.get('daily_profit', 0):,.2f}")
            print(f"   Model: {profit.get('model_type', 'N/A')}")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    # Windows asyncio policy fix if needed
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    print("\n" + "=" * 70)
    print("   PER-PLANT ML SERVICE INTEGRATION TEST")
    print("=" * 70)
    
    # Run single plant test
    success1 = asyncio.run(test_integrated_service())
    
    # Run all plants test
    success2 = asyncio.run(test_all_plants())
    
    print("\n" + "=" * 70)
    if success1 and success2:
        print("🎉 ALL INTEGRATION TESTS PASSED!")
    else:
        print("⚠️ Some tests failed. Check output above.")
    print("=" * 70 + "\n")
    
    sys.exit(0 if (success1 and success2) else 1)
