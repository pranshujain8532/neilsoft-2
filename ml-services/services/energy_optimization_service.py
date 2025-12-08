import numpy as np
from datetime import datetime
import random

class EnergyOptimizationService:
    def __init__(self):
        self.sources = ['Solar', 'Wind', 'Hydro', 'Grid']
        
    def get_optimization_data(self):
        physics_params = {
            'ambient_temp_c': round(random.uniform(20, 35), 2),
            'ambient_pressure_bar': round(random.uniform(0.98, 1.02), 3),
            'humidity_percent': round(random.uniform(40, 80), 1),
            'solar_irradiance_wm2': round(random.uniform(0, 1000), 1),
            'wind_speed_ms': round(random.uniform(0, 15), 2),
            
            'stack_temp_c': round(random.uniform(60, 80), 2),
            'operating_pressure_bar': round(random.uniform(20, 30), 2),
            'voltage_efficiency': round(random.uniform(0.65, 0.85), 3),
            'current_density_acm2': round(random.uniform(0.2, 0.6), 3),
            'gibbs_free_energy_kj_mol': 237.13,
            'enthalpy_change_kj_mol': 285.8,
            'entropy_change_j_mol_k': 163.2,
            'thermal_neutral_voltage': 1.48,
            'reversible_voltage': 1.23,
            'ohmic_resistance_ohm_cm2': round(random.uniform(0.1, 0.3), 3),
            'activation_overpotential_v': round(random.uniform(0.05, 0.15), 3),
            'concentration_overpotential_v': round(random.uniform(0.01, 0.05), 3),
            'bubble_coverage_factor': round(random.uniform(0.05, 0.2), 2),
            'electrolyte_conductivity_sm': round(random.uniform(0.4, 0.6), 3),
            
            'electrolyte_flow_rate_lpm': round(random.uniform(100, 200), 1),
            'gas_purity_h2_percent': round(random.uniform(99.5, 99.99), 3),
            'water_consumption_l_kg': round(random.uniform(9, 11), 2),
            'pump_efficiency': round(random.uniform(0.7, 0.9), 2),
            'heat_exchanger_coefficient': round(random.uniform(500, 800), 1),
            
            'grid_frequency_hz': round(random.uniform(49.8, 50.2), 3),
            'power_factor': round(random.uniform(0.9, 0.99), 2),
            'harmonic_distortion_thd': round(random.uniform(1, 5), 1),
        }
        
        market_data = {
            'grid_price': round(random.uniform(40, 120), 2),  
            'solar_lcoe': 35.0,
            'wind_lcoe': 45.0,
            'hydro_lcoe': 50.0,
            'carbon_tax': 25.0
        }
        
        scores = {}
        
        scores['Solar'] = (physics_params['solar_irradiance_wm2'] / 1000) * 0.8 + \
                          (100 / market_data['solar_lcoe']) * 0.2
                          
        scores['Wind'] = (min(physics_params['wind_speed_ms'], 12) / 12) * 0.8 + \
                         (100 / market_data['wind_lcoe']) * 0.2
                         
        scores['Hydro'] = 0.6 + (100 / market_data['hydro_lcoe']) * 0.2
        
        scores['Grid'] = (100 / market_data['grid_price']) * 0.9
        
        optimal_source = max(scores, key=scores.get)
        
        reasons = {
            'Solar': f"High solar irradiance ({physics_params['solar_irradiance_wm2']} W/m²) makes Solar the most efficient choice right now.",
            'Wind': f"Strong wind conditions ({physics_params['wind_speed_ms']} m/s) provide optimal power generation.",
            'Hydro': "Hydro offers stable baseload power while other renewables are intermittent.",
            'Grid': f"Grid prices are exceptionally low (${market_data['grid_price']}/MWh), making it cost-effective to switch."
        }
        
        return {
            'physics_params': physics_params,
            'market_data': market_data,
            'current_mix': {
                'solar': round(random.uniform(20, 40), 1),
                'wind': round(random.uniform(10, 30), 1),
                'hydro': round(random.uniform(10, 20), 1),
                'grid': round(random.uniform(5, 15), 1)
            },
            'recommendation': {
                'optimal_source': optimal_source,
                'efficiency_score': round(scores[optimal_source], 3),
                'reason': reasons[optimal_source],
                'projected_savings': round(random.uniform(50, 200), 2)
            },
            'timestamp': datetime.now().isoformat()
        }

energy_optimization_service = EnergyOptimizationService()
