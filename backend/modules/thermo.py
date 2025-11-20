def calculate_efficiency(energy_input_kw, h2_production_kg_hr):
    """
    Calculate electrolyzer efficiency based on Lower Heating Value (LHV) of Hydrogen.
    LHV of H2 = 33.3 kWh/kg
    """
    if energy_input_kw <= 0:
        return 0.0
    
    # Energy content of produced hydrogen (kWh)
    h2_energy_content_kwh = h2_production_kg_hr * 33.3
    
    # Efficiency = (Energy Output / Energy Input) * 100
    efficiency = (h2_energy_content_kwh / energy_input_kw) * 100
    
    # Cap at theoretical max (just in case of simulation noise)
    return min(efficiency, 100.0)

def calculate_compression_energy(h2_flow_rate, p_in, p_out):
    """
    Calculate energy required for compression (Isentropic).
    """
    # Simplified formula placeholder
    return h2_flow_rate * (p_out / p_in) * 0.5 # Dummy factor
