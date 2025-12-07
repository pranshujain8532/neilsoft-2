from flask import Blueprint, request, jsonify
import numpy as np
from datetime import datetime, timedelta

predictions_bp = Blueprint('predictions', __name__)

# Import models from models folder
try:
    from models.profit_predictor import profit_predictor as profit_pred_model
    HAS_PROFIT_MODEL = True
except ImportError:
    HAS_PROFIT_MODEL = False

# Fallback ProfitPredictor if model not available
class ProfitPredictor:
    """
    LSTM-based profit prediction model
    Inputs: weather, machine count, labor, grid energy, H2 price, storage health
    Output: Predicted profit for next 24 hours
    """
    def predict(self, data):
        # Use proper model if available
        if HAS_PROFIT_MODEL:
            return profit_pred_model.predict(data)
        
        # Simplified fallback prediction logic
        base_profit = 10000
        
        # Weather impact
        if data.get('weatherCondition') == 'sunny':
            weather_multiplier = 1.2
        elif data.get('weatherCondition') == 'cloudy':
            weather_multiplier = 0.9
        else:
            weather_multiplier = 1.0
        
        # Machine efficiency
        machine_factor = data.get('machineCount', 10) * 120
        
        # Labor productivity
        labor_factor = data.get('laborCount', 25) * 50
        
        # Energy cost penalty
        energy_cost = data.get('gridEnergyUsed', 1000) * 0.08
        
        # H2 price benefit
        h2_revenue = data.get('h2StockPrice', 3.5) * 2000
        
        predicted_profit = (base_profit + machine_factor + labor_factor + h2_revenue - energy_cost) * weather_multiplier
        
        return {
            'predictedProfit': round(predicted_profit, 2),
            'breakdown': {
                'machineFactor': machine_factor,
                'laborFactor': labor_factor,
                'energyCost': energy_cost,
                'h2Revenue': h2_revenue,
                'weatherMultiplier': weather_multiplier
            }
        }


class SafetyMonitor:
    """
    Physics-informed neural network for safety monitoring
    Monitors temperature, pressure, leakage detection
    """
    def check_safety(self, data):
        alerts = []
        severity = 'normal'
        
        temp = data.get('temperature', 25)
        pressure = data.get('pressure', 30)
        
        # Temperature checks
        if temp > 80:
            alerts.append('Critical temperature detected')
            severity = 'critical'
        elif temp > 60:
            alerts.append('High temperature warning')
            severity = 'warning'
        
        # Pressure checks
        if pressure > 400:
            alerts.append('Pressure exceeds safe limits')
            severity = 'critical'
        elif pressure > 370:
            alerts.append('Elevated pressure detected')
            if severity != 'critical':
                severity = 'warning'
        
        return {
            'severity': severity,
            'alerts': alerts,
            'recommendations': self._get_recommendations(alerts),
            'safetyScore': self._calculate_safety_score(temp, pressure)
        }
    
    def _get_recommendations(self, alerts):
        if not alerts:
            return ['All systems operating normally']
        
        recommendations = []
        for alert in alerts:
            if 'temperature' in alert.lower():
                recommendations.append('Activate emergency cooling systems')
                recommendations.append('Reduce electrolyzer load by 30%')
            if 'pressure' in alert.lower():
                recommendations.append('Open relief valves')
                recommendations.append('Verify compressor status')
        
        return recommendations
    
    def _calculate_safety_score(self, temp, pressure):
        temp_score = max(0, 100 - (temp - 25) * 2)
        pressure_score = max(0, 100 - (pressure - 350) * 5)
        return round((temp_score + pressure_score) / 2, 1)

profit_predictor = ProfitPredictor()
safety_monitor = SafetyMonitor()

@predictions_bp.route('/profit', methods=['POST'])
def predict_profit():
    """
    Profit prediction endpoint
    Request body: {
        "plantId": "...",
        "currentData": {
            "weatherCondition": "sunny",
            "machineCount": 10,
            "laborCount": 25,
            "gridEnergyUsed": 1200,
            "h2StockPrice": 3.5
        }
    }
    Request body: {
        "plantId": "...",
        "hours": 24
    }
    """
    data = request.json
    hours = data.get('hours', 24)
    
    # Generate mock forecast data
    forecast = []
    base_time = datetime.now()
    
    for i in range(hours):
        hour_time = base_time + timedelta(hours=i)
        hour = hour_time.hour
        
        # Simulate solar pattern
        if 6 <= hour <= 18:
            solar = 40 + 20 * np.sin((hour - 6) * np.pi / 12)
        else:
            solar = 0
        
        # Simulate wind pattern (more steady)
        wind = 25 + 10 * np.random.randn()
        
        forecast.append({
            'timestamp': hour_time.isoformat(),
            'hour': hour,
            'solar': max(0, round(solar, 2)),
            'wind': max(0, round(wind, 2)),
            'total': max(0, round(solar + wind, 2))
        })
    
    return jsonify({
        'forecast': forecast,
        'averageGeneration': round(np.mean([f['total'] for f in forecast]), 2)
    }), 200
