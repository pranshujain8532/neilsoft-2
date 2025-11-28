import tensorflow as tf

print("=" * 60)
print("TENSORFLOW VERIFICATION")
print("=" * 60)
print(f"TensorFlow Version: {tf.__version__}")
print(f"GPU Available: {len(tf.config.list_physical_devices('GPU')) > 0}")
print(f"CPU Devices: {len(tf.config.list_physical_devices('CPU'))}")
print("=" * 60)
print("✅ TensorFlow is installed and working!")
print("=" * 60)
