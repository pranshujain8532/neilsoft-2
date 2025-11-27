import sys
import os
import traceback

# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.energy_forecaster import energy_forecaster

print("🚀 Starting Energy Forecaster Training Test...")
try:
    results = energy_forecaster.train_all(epochs=5)
    print("🏁 Test Complete")
    print("Results:", results)
except Exception as e:
    print("❌ Test Failed:")
    traceback.print_exc()
