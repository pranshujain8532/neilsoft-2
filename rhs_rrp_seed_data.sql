-- ============================================================
-- RHS-RRP Seed Data
-- Run AFTER running rhs_rrp_schema.sql
-- ============================================================

-- 1. Create a demo standby state for existing plants
-- First, get a plant ID to use
DO $$
DECLARE
    demo_plant_id UUID;
BEGIN
    -- Get first plant ID
    SELECT id INTO demo_plant_id FROM plants LIMIT 1;
    
    IF demo_plant_id IS NOT NULL THEN
        -- Insert initial standby event (plant is operational)
        INSERT INTO standby_events (plant_id, previous_state, new_state, trigger_source, failure_probability, notes)
        VALUES (demo_plant_id, 'COLD_START', 'OPERATIONAL', 'MANUAL', 0, 'System initialized');
        
        -- Insert some baseline telemetry
        INSERT INTO standby_telemetry (
            plant_id, 
            membrane_resistance_ohm, 
            hydrogen_crossover_ppm,
            stack_temperature_c, 
            coolant_inlet_temp_c, 
            coolant_outlet_temp_c,
            thermal_gradient_delta,
            internal_pressure_bar, 
            anode_pressure_bar,
            cathode_pressure_bar,
            protection_current_amps, 
            stack_voltage_v,
            energy_cost_idle_usd,
            restart_readiness_index
        ) VALUES 
        (demo_plant_id, 0.145, 5.2, 65.0, 58.0, 62.0, 4.0, 30.0, 29.5, 30.5, 0.0, 48.0, 0.0, 100.0),
        (demo_plant_id, 0.147, 5.1, 64.8, 58.2, 62.1, 3.9, 30.1, 29.6, 30.4, 0.0, 48.2, 0.0, 100.0),
        (demo_plant_id, 0.144, 5.3, 65.2, 57.9, 61.8, 3.9, 29.9, 29.4, 30.3, 0.0, 47.8, 0.0, 100.0);
        
        -- Insert some VPP baseline signals
        INSERT INTO vpp_grid_signals (plant_id, grid_frequency_hz, grid_voltage_kv, requested_action, power_absorbed_kw, response_time_ms, revenue_earned_usd)
        VALUES 
        (demo_plant_id, 50.00, 33.0, 'NONE', 0, 0, 0),
        (demo_plant_id, 50.02, 33.1, 'NONE', 0, 0, 0),
        (demo_plant_id, 49.98, 32.9, 'NONE', 0, 0, 0);
        
        RAISE NOTICE 'RHS-RRP seed data created for plant: %', demo_plant_id;
    ELSE
        RAISE NOTICE 'No plants found. Please create a plant first.';
    END IF;
END $$;

-- 2. Create a view for easy dashboard queries
CREATE OR REPLACE VIEW rhs_rrp_dashboard_view AS
SELECT 
    p.id as plant_id,
    p.name as plant_name,
    COALESCE(se.new_state, 'OPERATIONAL') as current_state,
    st.membrane_resistance_ohm,
    st.stack_temperature_c,
    st.coolant_inlet_temp_c,
    st.coolant_outlet_temp_c,
    st.thermal_gradient_delta,
    st.internal_pressure_bar,
    st.protection_current_amps,
    st.restart_readiness_index,
    st.recorded_at as telemetry_time,
    vpp.grid_frequency_hz,
    vpp.requested_action as vpp_action,
    vpp.power_absorbed_kw
FROM plants p
LEFT JOIN LATERAL (
    SELECT new_state FROM standby_events 
    WHERE plant_id = p.id 
    ORDER BY created_at DESC LIMIT 1
) se ON true
LEFT JOIN LATERAL (
    SELECT * FROM standby_telemetry 
    WHERE plant_id = p.id 
    ORDER BY recorded_at DESC LIMIT 1
) st ON true
LEFT JOIN LATERAL (
    SELECT * FROM vpp_grid_signals 
    WHERE plant_id = p.id 
    ORDER BY received_at DESC LIMIT 1
) vpp ON true;
