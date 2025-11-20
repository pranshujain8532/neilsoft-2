def calculate_lcoh():
    """
    Calculate Levelized Cost of Hydrogen (LCOH).
    Simplified model for hackathon demonstration.
    """
    # Assumptions
    capex_annualized = 500000 # $
    opex_annual = 150000 # $
    annual_production_kg = 200000 # kg
    
    lcoh = (capex_annualized + opex_annual) / annual_production_kg
    
    return {
        "lcoh_usd_per_kg": round(lcoh, 2),
        "currency": "USD",
        "breakdown": {
            "capex": capex_annualized,
            "opex": opex_annual,
            "production": annual_production_kg
        }
    }
