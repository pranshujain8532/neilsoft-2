import random

def check_safety_status():
    """
    Simulate safety checks for pressure, temperature, and leakage.
    """
    # Simulate sensor readings
    pressure = random.uniform(28, 32) # Bar
    temperature = random.uniform(60, 85) # Celsius
    h2_leak_ppm = random.uniform(0, 50) # PPM
    
    status = "SAFE"
    alerts = []
    
    if pressure > 31:
        status = "WARNING"
        alerts.append("High Pressure Detected")
    
    if temperature > 80:
        status = "WARNING"
        alerts.append("High Temperature Detected")
        
    if h2_leak_ppm > 100:
        status = "CRITICAL"
        alerts.append("H2 Leak Detected!")
        
    return {
        "overall_status": status,
        "alerts": alerts,
        "metrics": {
            "pressure_bar": round(pressure, 2),
            "temperature_c": round(temperature, 2),
            "leak_ppm": round(h2_leak_ppm, 2)
        }
    }
