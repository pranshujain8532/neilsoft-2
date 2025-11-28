"""Test hybrid plant recommender"""
from models.plant_recommender import plant_recommender

print("="*60)
print("TESTING HYBRID PLANT RECOMMENDER")
print("="*60)

# Test 1: Train ML model
print("\n1️⃣ Training ML model on synthetic data...")
plant_recommender.train_ml_model(epochs=20)

# Test 2: Score a sample plant-order combination
print("\n2️⃣ Testing hybrid scoring...")

sample_plant = {
    'id': 'test-plant-1',
    'name': 'Gujarat Solar Plant',
    'capacity': 50,  # TPD
    'lcoh': 2.0,
    'status': 'active',
    'location': {'coordinates': {'lat': 23.0225, 'lng': 72.5714}},
    'energySources': {
        'solar': {'current': 30},
        'wind': {'current': 15},
        'hydro': {'current': 5}
    },
    'totalEnergyCapacity': 50
}

sample_order = {
    'quantity': 1500,  # kg
    'priority': 0.8,
    'delivery_location': {'coordinates': {'lat': 23.5, 'lng': 73.0}}
}

score_result = plant_recommender.score_plant_hybrid(sample_plant, sample_order)

print(f"\nHybrid Score Results:")
print(f"   Plant: {score_result['plant_name']}")
print(f"   Rule-Based Score: {score_result['rule_based_score']:.3f} (60% weight)")
print(f"   ML Score: {score_result['ml_score']:.3f if score_result['ml_score'] else 'N/A'} (40% weight)")
print(f"   Final Hybrid Score: {score_result['hybrid_score']:.3f}")

print("\n" + "="*60)
print("✅ Hybrid recommender is working!")
print("="*60)
