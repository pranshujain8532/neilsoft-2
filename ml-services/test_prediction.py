"""Quick test to verify prediction and database saving"""
from models.profit_predictor import profit_predictor

# Test prediction with database save
test_plant_data = {
    'plant_id': 'd599596e-f03d-4770-9fb0-f134ded1f324',
    'currentProduction': 550,
    'lcoh': 2.0,
    'labor_cost': 1200
}

print("Testing profit prediction...")
prediction = profit_predictor.predict(test_plant_data, save_to_db=True)

print(f"\n[OK] Results:")
print(f"   Predicted Profit: ${prediction['predicted_profit']:,.2f}")
print(f"   Confidence: {prediction['confidence'] * 100:.1f}%")
print(f"   Model Type: {prediction['model_type']}")
print(f"   Recommendation: {prediction['recommendation']}")
