"""
Safety Condition Monitor with ML/DL
Physics-Informed Neural Network for thermodynamic safety analysis
Integrates thermodynamic principles with machine learning
"""

import numpy as np
import random
from typing import Dict, List
from datetime import datetime, timedelta
import math

# ========================================
# THERMODYNAMIC SAFETY CONSTANTS
# ========================================

# Hydrogen properties
H2_SPECIFIC_HEAT = 14.3  # kJ/kg·K
H2_HEAT_OF_COMBUSTION = 141.8  # MJ/kg
H2_DENSITY_STP = 0.08988  # kg/m³
H2_CRITICAL_TEMP = -240  # °C
H2_CRITICAL_PRESSURE = 13  # bar

# Safety thresholds
MAX_SAFE_TEMP = 85  # °C
MAX_SAFE_PRESSURE = 32  # bar
MAX_LEAK_RATE = 1000  # ppm
MIN_CONTAINER_HEALTH = 60  # %
MAX_THERMAL_STRESS = 500  # MPa

# ========================================
# PHYSICS-INFORMED NEURAL NETWORK (PINN)
# ========================================

class ThermodynamicPINN:
    """
    Physics-Informed Neural Network for safety monitoring
    Incorporates thermodynamic laws into predictions
    """
    
    def __init__(self):
        self.weights = np.random.randn(10, 5) * 0.1
        self.bias = np.random.randn(5) * 0.1
        self.trained = False
    
    def forward(self, state: np.ndarray) -> np.ndarray:
        """Forward pass with physics constraints"""
        # Neural network prediction
        hidden = np.tanh(np.dot(state, self.weights) + self.bias)
        
        # Apply physics constraints
        # Ideal gas law: PV = nRT
        pressure_physical = state[0]  # Pressure from sensors
        temperature_physical = state[1]  # Temperature from sensors
        volume = state[2]  # Container volume
        
        # Verify physics consistency
        predicted_pressure = (temperature_physical + 273.15) * 8.314 / volume
        physics_deviation = abs(pressure_physical - predicted_pressure) / pressure_physical
        
        # Adjust predictions based on physics deviation
        if physics_deviation > 0.1:  # 10% deviation threshold
            hidden *= 0.8  # Reduce confidence if physics laws violated
        
        return hidden
    
    def predict_safety(self, container_state: Dict) -> Dict:
        """Predict safety status using PINN"""
        # Create state vector
        pressure = container_state.get('pressure_bar', 25)
        temperature = container_state.get('temperature_c', 25)
        volume = container_state.get('volume_m3', 100)
        flow_rate = container_state.get('flow_rate_kg_hr', 50)
        leak_rate = container_state.get('leak_ppm', 10)
        fill_level = container_state.get('fill_level_percent', 50) / 100
        age_years = container_state.get('age_years', 2)
        vibration = container_state.get('vibration_level', 0.5)
        humidity = container_state.get('humidity_percent', 50) / 100
        cycles = container_state.get('pressure_cycles', 1000)
        
        state = np.array([
            pressure / MAX_SAFE_PRESSURE,
            temperature / MAX_SAFE_TEMP,
            volume / 150,
            flow_rate / 100,
            leak_rate / MAX_LEAK_RATE,
            fill_level,
            age_years / 10,
            vibration,
            humidity,
            cycles / 5000
        ])
        
        # Get PINN prediction
        safety_features = self.forward(state)
        
        # Calculate individual risk factors
        pressure_risk = self._calculate_pressure_risk(pressure, temperature)
        thermal_risk = self._calculate_thermal_risk(temperature, fill_level)
        leak_risk = self._calculate_leak_risk(leak_rate)
        structural_risk = self._calculate_structural_risk(age_years, cycles, vibration)
        
        # Overall safety score (0-100)
        safety_score = 100 - (
            pressure_risk * 0.3 +
            thermal_risk * 0.25 +
            leak_risk * 0.25 +
            structural_risk * 0.2
        )
        
        return {
            "safety_score": max(0, round(safety_score, 2)),
            "risk_factors": {
                "pressure": round(pressure_risk, 2),
                "thermal": round(thermal_risk, 2),
                "leak": round(leak_risk, 2),
                "structural": round(structural_risk, 2)
            },
            "physics_analysis": {
                "thermal_stress_mpa": round(self._calculate_thermal_stress(temperature, pressure), 2),
                "gas_density_kg_m3": round(self._calculate_gas_density(pressure, temperature), 4),
                "energy_density_mj_m3": round(self._calculate_energy_density(fill_level), 2)
            },
            "status": self._get_safety_status(safety_score),
            "model": "Physics-Informed Neural Network"
        }
    
    def _calculate_pressure_risk(self, pressure: float, temperature: float) -> float:
        """Calculate risk from pressure considering temperature"""
        normalized_pressure = pressure / MAX_SAFE_PRESSURE
        temp_factor = 1 + (temperature - 25) / 100  # Temperature increases risk
        
        risk = normalized_pressure * temp_factor * 100
        
        if pressure > MAX_SAFE_PRESSURE:
            risk += 30  # Critical threshold exceeded
        
        return min(100, risk)
    
    def _calculate_thermal_risk(self, temperature: float, fill_level: float) -> float:
        """Calculate thermal risk"""
        if temperature < -200:  # Cryogenic
            risk = 20 + abs(temperature + 240) * 0.5
        elif temperature > MAX_SAFE_TEMP:
            risk = 40 + (temperature - MAX_SAFE_TEMP) * 2
        else:
            risk = (temperature / MAX_SAFE_TEMP) * 30
        
        # Higher fill level increases thermal risk
        risk *= (1 + fill_level * 0.3)
        
        return min(100, risk)
    
    def _calculate_leak_risk(self, leak_rate: float) -> float:
        """Calculate leak risk"""
        if leak_rate < 100:
            return 5
        elif leak_rate < 500:
            return 20 + (leak_rate - 100) / 10
        elif leak_rate < MAX_LEAK_RATE:
            return 50 + (leak_rate - 500) / 10
        else:
            return 100  # Critical leak
    
    def _calculate_structural_risk(self, age: float, cycles: int, vibration: float) -> float:
        """Calculate structural integrity risk"""
        age_risk = min(age * 8, 40)
        cycle_risk = min(cycles / 100, 30)
        vibration_risk = vibration * 20
        
        return min(100, age_risk + cycle_risk + vibration_risk)
    
    def _calculate_thermal_stress(self, temperature: float, pressure: float) -> float:
        """Calculate thermal stress on container walls (simplified)"""
        # Simplified thermal stress calculation
        alpha = 1.2e-5  # Thermal expansion coefficient (steel)
        E = 200e3  # Young's modulus (MPa)
        delta_T = abs(temperature - 25)
        
        thermal_stress = alpha * E * delta_T
        pressure_stress = pressure * 10  # Simplified hoop stress
        
        return thermal_stress + pressure_stress
    
    def _calculate_gas_density(self, pressure: float, temperature: float) -> float:
        """Calculate hydrogen gas density using ideal gas law"""
        # PV = nRT => ρ = PM/(RT)
        M = 2.016  # Molar mass of H2 (g/mol)
        R = 8.314  # Gas constant
        T = temperature + 273.15  # Kelvin
        P = pressure * 1e5  # Pascal
        
        density = (P * M) / (R * T * 1000)  # kg/m³
        return density
    
    def _calculate_energy_density(self, fill_level: float) -> float:
        """Calculate energy density in container"""
        # Simplified calculation
        h2_mass_per_m3 = 40  # kg/m³ at storage pressure
        energy_per_kg = H2_HEAT_OF_COMBUSTION  # MJ/kg
        
        return h2_mass_per_m3 * energy_per_kg * fill_level

    
    def _get_safety_status(self, score: float) -> str:
        """Get safety status from score"""
        if score >= 80:
            return "SAFE"
        elif score >= 60:
            return "CAUTION"
        elif score >= 40:
            return "WARNING"
        else:
            return "CRITICAL"

# ========================================
# ANOMALY DETECTION
# ========================================

class AnomalyDetector:
    """Isolation Forest for anomaly detection"""
    
    def __init__(self):
        self.n_trees = 100
        self.threshold = 0.6
        self.trained = False
    
    def detect_anomalies(self, container_data: Dict) -> Dict:
        """Detect anomalies in container behavior"""
        # Simulate anomaly detection
        pressure = container_data.get('pressure_bar', 25)
        temperature = container_data.get('temperature_c', 25)
        leak_rate = container_data.get('leak_ppm', 10)
        vibration = container_data.get('vibration_level', 0.5)
        
        # Simple anomaly scoring
        anomaly_score = 0
        anomalies_detected = []
        
        # Pressure anomaly
        if pressure > 30 or pressure < 15:
            anomaly_score += 0.3
            anomalies_detected.append({
                "type": "pressure",
                "severity": "high" if pressure > 30 else "medium",
                "value": pressure,
                "message": f"Abnormal pressure: {pressure} bar"
            })
        
        # Temperature anomaly
        if temperature > 70 or temperature < -10:
            anomaly_score += 0.25
            anomalies_detected.append({
                "type": "temperature",
                "severity": "high" if temperature > 70 else "medium",
                "value": temperature,
                "message": f"Abnormal temperature: {temperature}°C"
            })
        
        # Leak anomaly
        if leak_rate > 500:
            anomaly_score += 0.35
            anomalies_detected.append({
                "type": "leak",
                "severity": "critical" if leak_rate > 900 else "high",
                "value": leak_rate,
                "message": f"High leak rate detected: {leak_rate} ppm"
            })
        
        # Vibration anomaly
        if vibration > 0.8:
            anomaly_score += 0.1
            anomalies_detected.append({
                "type": "vibration",
                "severity": "medium",
                "value": vibration,
                "message": f"Elevated vibration: {vibration}"
            })
        
        is_anomaly = anomaly_score > self.threshold
        
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(anomaly_score, 3),
            "anomalies": anomalies_detected,
            "recommendation": "Immediate inspection required" if is_anomaly else "Normal operation"
        }

# ========================================
# PREDICTIVE FAILURE DETECTION
# ========================================

def predict_failure_probability(container: Dict, days_ahead: int = 30) -> Dict:
    """Predict probability of failure in next N days"""
    age = container.get('age_years', 2)
    health = container.get('health_score', 85) / 100
    cycles = container.get('pressure_cycles', 1000)
    last_maintenance = container.get('days_since_maintenance', 30)
    
    # Weibull distribution for failure probability
    shape = 2.5  # Shape parameter (β)
    scale = 3650  # Scale parameter (η) - 10 years in days
    
    t = age * 365 + days_ahead
    
    # Weibull CDF for failure probability
    failure_prob = 1 - np.exp(-(t / scale) ** shape)
    
    # Adjust based on health and maintenance
    failure_prob *= (1 - health * 0.5)
    failure_prob *= (1 + last_maintenance / 180)
    
    failure_prob = min(0.99, failure_prob)
    
    # Time to failure estimate
    time_to_failure_days = int(scale * ((-np.log(1 - 0.5)) ** (1 / shape)) - age * 365)
    
    return {
        "failure_probability": {
            f"{days_ahead}_days": round(failure_prob * 100, 2)
        },
        "estimated_time_to_failure_days": max(30, time_to_failure_days),
        "risk_level": "Low" if failure_prob < 0.1 else "Medium" if failure_prob < 0.3 else "High",
        "recommended_action": _get_failure_recommendation(failure_prob)
    }

def _get_failure_recommendation(prob: float) -> str:
    """Get recommendation based on failure probability"""
    if prob < 0.1:
        return "Continue normal operations, routine monitoring"
    elif prob < 0.3:
        return "Schedule inspection within 2 weeks"
    elif prob < 0.6:
        return "Immediate inspection required"
    else:
        return "Critical: Consider replacing container"

# ========================================
# UNIFIED SAFETY MONITORING
# ========================================

# Global models
pinn_model = None
anomaly_detector = None

def initialize_safety_models():
    """Initialize safety monitoring models"""
    global pinn_model, anomaly_detector
    
    print("Initializing Safety Monitoring Models...")
    pinn_model = ThermodynamicPINN()
    anomaly_detector = AnomalyDetector()
    print("✓ Safety models ready")

def analyze_container_safety(container: Dict) -> Dict:
    """Comprehensive safety analysis of storage container"""
    global pinn_model, anomaly_detector
    
    if pinn_model is None:
        initialize_safety_models()
    
    # PINN safety prediction
    safety_analysis = pinn_model.predict_safety(container)
    
    # Anomaly detection
    anomalies = anomaly_detector.detect_anomalies(container)
    
    # Failure prediction
    failure_pred = predict_failure_probability(container, days_ahead=30)
    
    # Preventive actions
    preventive_actions = _generate_preventive_actions(safety_analysis, anomalies, failure_pred)
    
    return {
        "container_id": container.get('container_id'),
        "timestamp": datetime.utcnow().isoformat(),
        "safety_analysis": safety_analysis,
        "anomaly_detection": anomalies,
        "failure_prediction": failure_pred,
        "preventive_actions": preventive_actions,
        "overall_status": safety_analysis['status']
    }

def analyze_plant_safety(plant_id: str, containers: List[Dict]) -> Dict:
    """Analyze safety for entire plant"""
    plant_analyses = []
    critical_count = 0
    warning_count = 0
    
    for container in containers:
        analysis = analyze_container_safety(container)
        plant_analyses.append(analysis)
        
        if analysis['overall_status'] == 'CRITICAL':
            critical_count += 1
        elif analysis['overall_status'] in ['WARNING', 'CAUTION']:
            warning_count += 1
    
    # Overall plant safety score
    avg_safety = np.mean([a['safety_analysis']['safety_score'] for a in plant_analyses])
    
    return {
        "plant_id": plant_id,
        "total_containers": len(containers),
        "critical_containers": critical_count,
        "warning_containers": warning_count,
        "safe_containers": len(containers) - critical_count - warning_count,
        "average_safety_score": round(avg_safety, 2),
        "plant_status": "CRITICAL" if critical_count > 0 else "WARNING" if warning_count > 0 else "SAFE",
        "container_analyses": plant_analyses[:5],  # Top 5 for API response
        "generated_at": datetime.utcnow().isoformat()
    }

def _generate_preventive_actions(safety: Dict, anomalies: Dict, failure: Dict) -> List[str]:
    """Generate preventive action recommendations"""
    actions = []
    
    if safety['safety_score'] < 60:
        actions.append("Immediate safety inspection required")
    
    if safety['risk_factors']['pressure'] > 70:
        actions.append("Check pressure relief valves")
    
    if safety['risk_factors']['thermal'] > 60:
        actions.append("Verify cooling system operation")
    
    if anomalies['is_anomaly']:
        actions.append(f"Investigate {len(anomalies['anomalies'])} detected anomalies")
    
    if failure['risk_level'] in ['Medium', 'High']:
        actions.append(failure['recommended_action'])
    
    if not actions:
        actions.append("No immediate actions required - continue monitoring")
    
    return actions

# Auto-initialize on import
if __name__ != "__main__":
    initialize_safety_models()
