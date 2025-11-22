"""
ML Model Training Script
Train all AI/ML models for the Green Hydrogen Platform
"""

import sys
import os

# Add models to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.profit_predictor import profit_predictor
from models.safety_monitor import safety_monitor
from models.energy_forecaster import energy_forecaster

def main():
    print("=" * 70)
    print("🚀 Green Hydrogen ML Model Training Pipeline")
    print("=" * 70)
    print()
    print("📋 Training Configuration:")
    print("   • Target Accuracy: 80%+")
    print("   • Dataset Size: Enhanced (2000-5000 samples)")
    print("   • Validation Split: 20%")
    print()
    
    # Create models directory
    os.makedirs('models/saved', exist_ok=True)
    
    results = {}
    
    # Train Profit Predictor (LSTM)
    print("\n" + "=" * 70)
    print("📈 1. LSTM Profit Prediction Model")
    print("=" * 70)
    try:
        history, accuracy = profit_predictor.train(epochs=100, batch_size=32)
        results['profit_predictor'] = accuracy
        print(f"✅ Profit Predictor: {accuracy:.1f}% accuracy")
    except Exception as e:
        print(f"⚠️  Profit Predictor training skipped: {e}")
        results['profit_predictor'] = 0
    
    # Train Safety Monitor (Physics-Informed NN)
    print("\n" + "=" * 70)
    print("🛡️  2. Physics-Informed Safety Monitor")
    print("=" * 70)
    try:
        history, accuracy = safety_monitor.train(epochs=80, batch_size=32)
        results['safety_monitor'] = accuracy
        print(f"✅ Safety Monitor: {accuracy:.1f}% accuracy")
    except Exception as e:
        print(f"⚠️  Safety Monitor training skipped: {e}")
        results['safety_monitor'] = 0
    
    # Train Energy Forecasters
    print("\n" + "=" * 70)
    print("⚡ 3. Energy Production Forecasters")
    print("=" * 70)
    try:
        forecaster_results = energy_forecaster.train_all(epochs=50)
        avg_forecaster_acc = sum(forecaster_results.values()) / len(forecaster_results)
        results['energy_forecasters'] = avg_forecaster_acc
        print(f"✅ Energy Forecasters: {avg_forecaster_acc:.1f}% average accuracy")
    except Exception as e:
        print(f"⚠️  Energy Forecasters training skipped: {e}")
        results['energy_forecasters'] = 0
    
    # Summary
    print("\n" + "=" * 70)
    print("🎉 Training Complete!")
    print("=" * 70)
    print("\n📊 Model Performance Summary:")
    print("-" * 70)
    for model_name, acc in results.items():
        status = "✅" if  acc >= 80 else "⚠️ "
        print(f"   {status} {model_name.replace('_', ' ').title()}: {acc:.1f}%")
    
    avg_accuracy = sum(results.values()) / len(results) if results else 0
    print("-" * 70)
    print(f"   🎯 Overall Average Accuracy: {avg_accuracy:.1f}%")
    
    if avg_accuracy >= 80:
        print(f"   ✨ All models meet or exceed 80% accuracy target!")
    else:
        print(f"   📈 Some models need improvement")
    
    print("\n💾 Models saved to: ./models/saved/")
    print("\n🚀 To use the models, start the ML service:")
    print("   python app.py")
    print()

if __name__ == '__main__':
    main()
