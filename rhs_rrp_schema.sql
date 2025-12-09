-- ============================================================
-- RHS-RRP: Resilient Hot Standby & Rapid Recovery Protocol
-- Database Schema for PostgreSQL/Supabase
-- ============================================================

-- 1. STANDBY EVENTS LOG
-- Tracks FSM state transitions with full audit trail
CREATE TABLE IF NOT EXISTS standby_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    previous_state TEXT NOT NULL DEFAULT 'OPERATIONAL',
    new_state TEXT NOT NULL,
    trigger_source TEXT NOT NULL CHECK (trigger_source IN ('ML_PREDICTOR', 'MANUAL', 'VPP_SIGNAL', 'SAFETY_ABORT')),
    failure_probability FLOAT CHECK (failure_probability >= 0 AND failure_probability <= 100),
    notes TEXT,
    operator_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STANDBY TELEMETRY (High-Frequency Logging)
-- Critical physics parameters during Hot Standby mode
CREATE TABLE IF NOT EXISTS standby_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Electrochemical Health
    membrane_resistance_ohm FLOAT,
    hydrogen_crossover_ppm FLOAT,
    
    -- Thermal Management
    stack_temperature_c FLOAT,
    coolant_inlet_temp_c FLOAT,
    coolant_outlet_temp_c FLOAT,
    thermal_gradient_delta FLOAT,
    
    -- Pressure System
    internal_pressure_bar FLOAT,
    anode_pressure_bar FLOAT,
    cathode_pressure_bar FLOAT,
    
    -- Electrical (Protection Mode)
    protection_current_amps FLOAT,
    stack_voltage_v FLOAT,
    
    -- Economics
    energy_cost_idle_usd FLOAT,
    
    -- Restart Readiness
    restart_readiness_index FLOAT CHECK (restart_readiness_index >= 0 AND restart_readiness_index <= 100)
);

-- 3. ACTIVE POLARIZATION LOGS (Anti-Corrosion Pulses)
-- Proves extended lifespan through galvanic protection
CREATE TABLE IF NOT EXISTS active_polarization_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    pulse_timestamp TIMESTAMPTZ DEFAULT NOW(),
    pulse_duration_ms INTEGER DEFAULT 500,
    pulse_voltage_v FLOAT,
    pulse_current_ma FLOAT,
    membrane_response_mv FLOAT,
    corrosion_prevention_score FLOAT CHECK (corrosion_prevention_score >= 0 AND corrosion_prevention_score <= 1)
);

-- 4. VPP GRID SIGNALS (Virtual Power Plant Integration)
-- Demand Response and Grid Services logging
CREATE TABLE IF NOT EXISTS vpp_grid_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    grid_frequency_hz FLOAT,
    grid_voltage_kv FLOAT,
    requested_action TEXT CHECK (requested_action IN ('ABSORB_LOAD', 'REDUCE_LOAD', 'STANDBY_WARM', 'NONE')),
    power_absorbed_kw FLOAT DEFAULT 0,
    response_time_ms INTEGER,
    revenue_earned_usd FLOAT DEFAULT 0
);

-- 5. DIGITAL SHADOW SIMULATIONS
-- AI-Augmented Confidence scores
CREATE TABLE IF NOT EXISTS digital_shadow_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    simulated_at TIMESTAMPTZ DEFAULT NOW(),
    simulation_horizon_sec INTEGER DEFAULT 10,
    restart_rupture_probability FLOAT,
    thermal_stress_factor FLOAT,
    pressure_stress_factor FLOAT,
    recommendation TEXT,
    confidence_score FLOAT
);

-- Enable RLS
ALTER TABLE standby_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE standby_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_polarization_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vpp_grid_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_shadow_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_standby_events_plant ON standby_events(plant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_standby_telemetry_plant ON standby_telemetry(plant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_polarization_plant ON active_polarization_logs(plant_id, pulse_timestamp DESC);
