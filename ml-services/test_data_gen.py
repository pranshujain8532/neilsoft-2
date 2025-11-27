import sys
import os

# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.energy_forecaster import energy_forecaster

print("Testing Data Generation...")
try:
    X, y = energy_forecaster.generate_training_data_solar(num_samples=100)
    print(f"Solar Data Generated: X shape={X.shape}, y shape={y.shape}")
    print(f"Sample X: {X[0]}")
    print(f"Sample y: {y[0]}")
    
    X_wind, y_wind = energy_forecaster.generate_training_data_wind(num_samples=100)
    print(f"Wind Data Generated: X shape={X_wind.shape}, y shape={y_wind.shape}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
