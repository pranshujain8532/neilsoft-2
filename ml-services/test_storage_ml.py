"""
Test script for Storage ML models
Tests all 4 models: Anomaly Detector, Health Predictor, Demand Forecaster, Inventory Optimizer
"""

import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

print("=" * 70)
print("🧪 Storage ML Models Test Suite")
print("=" * 70)
print()


def test_anomaly_detector():
    """Test LSTM Autoencoder for anomaly detection"""
    print("1️⃣ Testing Storage Anomaly Detector (LSTM Autoencoder)")
    print("-" * 50)
    
    try:
        from models.storage_anomaly_detector import storage_anomaly_detector
        
        print(f"   Model loaded: {storage_anomaly_detector.model is not None}")
        print(f"   Sequence length: {storage_anomaly_detector.sequence_length}")
        print(f"   Features: {storage_anomaly_detector.n_features}")
        
        # Test with normal data
        normal_readings = [
            [350, 25, 60, 99.95],  # pressure, temp, level, purity
            [351, 25.1, 60.1, 99.95],
            [350.5, 25, 59.8, 99.94],
            [350.2, 25.2, 60, 99.95],
            [351, 25.1, 60.2, 99.95],
            [350.8, 25, 60, 99.94],
            [350.3, 25.3, 59.9, 99.95],
            [350.5, 25.1, 60.1, 99.95],
            [351.2, 25.2, 60, 99.94],
            [350.1, 25, 60, 99.95]
        ]
        
        result = storage_anomaly_detector.detect_anomaly({
            'readings': normal_readings
        })
        
        print(f"   Normal data test:")
        print(f"      Is Anomaly: {result['is_anomaly']}")
        print(f"      Anomaly Score: {result['anomaly_score']:.3f}")
        print(f"      Confidence: {result.get('confidence', 'N/A')}")
        
        # Test with anomalous data (pressure spike)
        anomaly_readings = [
            [350, 25, 60, 99.95],
            [351, 25.1, 60.1, 99.95],
            [355, 26, 60, 99.95],  # Starting anomaly
            [380, 35, 58, 99.90],  # Pressure spike, temp rise
            [395, 45, 55, 99.85],  # Critical
            [400, 50, 52, 99.80],
            [405, 55, 50, 99.75],
            [410, 58, 48, 99.70],
            [415, 60, 45, 99.65],
            [420, 62, 42, 99.60]
        ]
        
        result_anomaly = storage_anomaly_detector.detect_anomaly({
            'readings': anomaly_readings
        })
        
        print(f"   Anomalous data test:")
        print(f"      Is Anomaly: {result_anomaly['is_anomaly']}")
        print(f"      Anomaly Score: {result_anomaly['anomaly_score']:.3f}")
        print(f"      Anomalous Sensors: {result_anomaly.get('anomalous_sensors', [])}")
        
        print("   ✅ Anomaly Detector test passed")
        return True
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_health_predictor():
    """Test Physics-Informed Neural Network for health prediction"""
    print()
    print("2️⃣ Testing Storage Health Predictor (Physics-Informed NN)")
    print("-" * 50)
    
    try:
        from models.storage_health_predictor import storage_health_predictor
        
        print(f"   Model loaded: {storage_health_predictor.model is not None}")
        print(f"   Features: {storage_health_predictor.n_features}")
        
        # Test with healthy container
        healthy_container = {
            'pressure_bar': 350,
            'temperature_c': 25,
            'fill_percentage': 70,
            'hoop_stress_mpa': 175,
            'stress_cycles': 1000,
            'hydrogen_purity_percent': 99.95,
            'last_inspection_date': datetime.now().strftime('%Y-%m-%d')
        }
        
        result = storage_health_predictor.predict(healthy_container)
        
        print(f"   Healthy container test:")
        print(f"      Health Score: {result['health_score']:.1f}%")
        print(f"      Status: {result['health_status']}")
        print(f"      Maintenance Prob: {result['maintenance_probability']:.1f}%")
        print(f"      Recommendations: {len(result['recommendations'])}")
        
        # Test with degraded container
        degraded_container = {
            'pressure_bar': 390,
            'temperature_c': 55,
            'fill_percentage': 30,
            'hoop_stress_mpa': 250,
            'stress_cycles': 15000,
            'hydrogen_purity_percent': 99.60,
            'last_inspection_date': '2024-01-01'  # Old inspection
        }
        
        result_degraded = storage_health_predictor.predict(degraded_container)
        
        print(f"   Degraded container test:")
        print(f"      Health Score: {result_degraded['health_score']:.1f}%")
        print(f"      Status: {result_degraded['health_status']}")
        print(f"      Maintenance Prob: {result_degraded['maintenance_probability']:.1f}%")
        print(f"      Next Inspection: {result_degraded.get('next_inspection_recommended', 'N/A')}")
        
        print("   ✅ Health Predictor test passed")
        return True
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_demand_forecaster():
    """Test Bidirectional LSTM for demand forecasting"""
    print()
    print("3️⃣ Testing Demand Forecaster (Bidirectional LSTM with Attention)")
    print("-" * 50)
    
    try:
        from models.demand_forecaster import demand_forecaster
        
        print(f"   Model loaded: {demand_forecaster.model is not None}")
        print(f"   Lookback period: {demand_forecaster.lookback} days")
        print(f"   Features: {demand_forecaster.n_features}")
        
        # Run forecast
        result = demand_forecaster.forecast()
        
        print(f"   Forecast results:")
        print(f"      24h Forecast: {result['forecast_24h']['value']} kg")
        print(f"         Range: [{result['forecast_24h']['lower_bound']}, {result['forecast_24h']['upper_bound']}] kg")
        print(f"      7-day Forecast: {result['forecast_7d']['value']} kg")
        print(f"      30-day Forecast: {result['forecast_30d']['value']} kg")
        print(f"      Trend: {result['trend']}")
        print(f"      Season: {result['seasonality']['season']}")
        print(f"      Confidence: {result['confidence']:.2f}")
        print(f"      Model Type: {result['model_type']}")
        
        print("   ✅ Demand Forecaster test passed")
        return True
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_inventory_optimizer():
    """Test DQN for inventory optimization"""
    print()
    print("4️⃣ Testing Inventory Optimizer (Deep Q-Network)")
    print("-" * 50)
    
    try:
        from models.inventory_optimizer import inventory_optimizer
        
        print(f"   Model loaded: {inventory_optimizer.model is not None}")
        print(f"   State size: {inventory_optimizer.state_size}")
        print(f"   Action size: {inventory_optimizer.action_size}")
        print(f"   Gamma (discount): {inventory_optimizer.gamma}")
        
        # Test with different inventory states
        test_cases = [
            {'capacity': 10000, 'current_level': 8000, 'estimated_daily_demand': 200, 'name': 'High Inventory'},
            {'capacity': 10000, 'current_level': 3000, 'estimated_daily_demand': 200, 'name': 'Medium Inventory'},
            {'capacity': 10000, 'current_level': 1000, 'estimated_daily_demand': 200, 'name': 'Low Inventory'},
            {'capacity': 10000, 'current_level': 500, 'estimated_daily_demand': 300, 'name': 'Critical Inventory'}
        ]
        
        for case in test_cases:
            result = inventory_optimizer.optimize(container_data=case)
            print(f"   {case['name']} ({case['current_level']}/{case['capacity']} kg):")
            print(f"      Action: {result['action_name']}")
            print(f"      Confidence: {result['confidence']:.2f}")
        
        print("   ✅ Inventory Optimizer test passed")
        return True
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_storage_ml_service():
    """Test the integrated storage ML service"""
    print()
    print("5️⃣ Testing Storage ML Service Integration")
    print("-" * 50)
    
    try:
        from services.storage_ml_service import storage_ml_service
        
        print(f"   Service initialized: True")
        print(f"   Service running: {storage_ml_service.running}")
        
        # Get latest predictions
        predictions = storage_ml_service.get_latest_predictions()
        
        print(f"   Predictions available:")
        print(f"      Anomaly: {len(predictions['anomaly'])} containers")
        print(f"      Health: {len(predictions['health'])} containers")
        print(f"      Forecast: {'available' if predictions['forecast'] else 'pending'}")
        print(f"      Optimization: {'available' if predictions['optimization'] else 'pending'}")
        
        print("   ✅ Storage ML Service test passed")
        return True
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def run_all_tests():
    """Run all storage ML tests"""
    results = {
        'anomaly_detector': test_anomaly_detector(),
        'health_predictor': test_health_predictor(),
        'demand_forecaster': test_demand_forecaster(),
        'inventory_optimizer': test_inventory_optimizer(),
        'storage_ml_service': test_storage_ml_service()
    }
    
    print()
    print("=" * 70)
    print("📊 Test Summary")
    print("=" * 70)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {name}: {status}")
    
    print()
    print(f"   Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("   🎉 All tests passed!")
    else:
        print("   ⚠️  Some tests failed. Check logs above.")
    
    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
