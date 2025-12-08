-- ============================================
-- SMART SURPLUS MANAGEMENT SYSTEM
-- Database Schema Updates + SQL Queries
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: SCHEMA UPDATES (ALTER TABLES)
-- ============================================

-- 1.1 Add 'hydro' to battery charging_from options
ALTER TABLE public.battery_storage 
DROP CONSTRAINT IF EXISTS battery_storage_charging_from_check;

ALTER TABLE public.battery_storage 
ADD CONSTRAINT battery_storage_charging_from_check 
CHECK (charging_from = ANY (ARRAY['solar'::text, 'wind'::text, 'hydro'::text, 'grid'::text, NULL::text]));

-- 1.2 Add dominant_source tracking to battery_storage
ALTER TABLE public.battery_storage 
ADD COLUMN IF NOT EXISTS last_charge_source text,
ADD COLUMN IF NOT EXISTS last_charge_amount_kwh numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_charge_timestamp timestamp with time zone;

-- ============================================
-- PART 2: NEW TABLES
-- ============================================

-- 2.1 Energy Overflow Log - Tracks wasted energy by source
CREATE TABLE IF NOT EXISTS public.energy_overflow_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    plant_id uuid,
    source_type text NOT NULL CHECK (source_type = ANY (ARRAY['solar'::text, 'wind'::text, 'hydro'::text])),
    overflow_kwh numeric NOT NULL DEFAULT 0,
    reason text DEFAULT 'battery_full'::text CHECK (reason = ANY (ARRAY['battery_full'::text, 'capacity_exceeded'::text, 'grid_unavailable'::text])),
    total_production_kwh numeric,
    plant_capacity_kwh numeric,
    battery_level_percent numeric,
    recorded_at timestamp with time zone DEFAULT now(),
    CONSTRAINT energy_overflow_log_pkey PRIMARY KEY (id),
    CONSTRAINT energy_overflow_log_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_overflow_log_plant_time ON public.energy_overflow_log(plant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_overflow_log_source ON public.energy_overflow_log(source_type, recorded_at DESC);

-- 2.2 Battery Charging Sessions - Detailed attribution tracking
CREATE TABLE IF NOT EXISTS public.battery_charging_sessions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    plant_id uuid,
    source_type text NOT NULL CHECK (source_type = ANY (ARRAY['solar'::text, 'wind'::text, 'hydro'::text, 'grid'::text])),
    energy_charged_kwh numeric NOT NULL DEFAULT 0,
    surplus_total_kwh numeric,  -- Total surplus at this moment
    battery_level_before numeric,
    battery_level_after numeric,
    is_dominant_source boolean DEFAULT true,
    charging_efficiency_percent numeric DEFAULT 95,
    session_start timestamp with time zone DEFAULT now(),
    session_end timestamp with time zone,
    CONSTRAINT battery_charging_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT battery_charging_sessions_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_charging_sessions_plant_time ON public.battery_charging_sessions(plant_id, session_start DESC);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_source ON public.battery_charging_sessions(source_type);

-- 2.3 Energy Production Snapshots - For real-time calculations
CREATE TABLE IF NOT EXISTS public.energy_production_snapshots (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    plant_id uuid,
    solar_output_kw numeric DEFAULT 0,
    wind_output_kw numeric DEFAULT 0,
    hydro_output_kw numeric DEFAULT 0,
    total_production_kw numeric DEFAULT 0,
    plant_capacity_kw numeric,
    surplus_kw numeric DEFAULT 0,
    dominant_source text,
    battery_charging_kw numeric DEFAULT 0,
    battery_level_percent numeric,
    overflow_kw numeric DEFAULT 0,
    recorded_at timestamp with time zone DEFAULT now(),
    CONSTRAINT energy_production_snapshots_pkey PRIMARY KEY (id),
    CONSTRAINT energy_production_snapshots_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_production_snapshots_plant_time ON public.energy_production_snapshots(plant_id, recorded_at DESC);

-- ============================================
-- PART 3: HELPER FUNCTIONS
-- ============================================

-- 3.1 Function to calculate surplus and determine dominant source
CREATE OR REPLACE FUNCTION calculate_energy_surplus(
    p_plant_id uuid,
    p_solar_kw numeric,
    p_wind_kw numeric,
    p_hydro_kw numeric
) RETURNS TABLE (
    total_production_kw numeric,
    plant_capacity_kw numeric,
    surplus_kw numeric,
    dominant_source text,
    has_surplus boolean
) AS $$
DECLARE
    v_capacity numeric;
BEGIN
    -- Get plant capacity
    SELECT capacity INTO v_capacity FROM plants WHERE id = p_plant_id;
    IF v_capacity IS NULL THEN v_capacity := 100; END IF;
    
    -- Calculate totals
    total_production_kw := COALESCE(p_solar_kw, 0) + COALESCE(p_wind_kw, 0) + COALESCE(p_hydro_kw, 0);
    plant_capacity_kw := v_capacity;
    surplus_kw := GREATEST(0, total_production_kw - v_capacity);
    
    -- Determine dominant source
    IF p_solar_kw >= p_wind_kw AND p_solar_kw >= p_hydro_kw THEN
        dominant_source := 'solar';
    ELSIF p_wind_kw >= p_solar_kw AND p_wind_kw >= p_hydro_kw THEN
        dominant_source := 'wind';
    ELSE
        dominant_source := 'hydro';
    END IF;
    
    has_surplus := surplus_kw > 0;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 3.2 Function to process surplus and route to battery/overflow
CREATE OR REPLACE FUNCTION process_energy_surplus(
    p_plant_id uuid,
    p_solar_kw numeric,
    p_wind_kw numeric,
    p_hydro_kw numeric
) RETURNS TABLE (
    energy_to_battery_kwh numeric,
    energy_overflow_kwh numeric,
    dominant_source text,
    new_battery_level numeric
) AS $$
DECLARE
    v_surplus record;
    v_battery record;
    v_available_capacity numeric;
    v_charge_amount numeric;
    v_overflow numeric;
BEGIN
    -- Calculate surplus
    SELECT * INTO v_surplus FROM calculate_energy_surplus(p_plant_id, p_solar_kw, p_wind_kw, p_hydro_kw);
    
    dominant_source := v_surplus.dominant_source;
    
    IF NOT v_surplus.has_surplus THEN
        energy_to_battery_kwh := 0;
        energy_overflow_kwh := 0;
        -- Get current battery level
        SELECT charge_percent INTO new_battery_level FROM battery_storage WHERE plant_id = p_plant_id;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Get battery status
    SELECT * INTO v_battery FROM battery_storage WHERE plant_id = p_plant_id;
    
    IF v_battery IS NULL THEN
        -- No battery, all surplus is overflow
        energy_to_battery_kwh := 0;
        energy_overflow_kwh := v_surplus.surplus_kw;
        new_battery_level := 0;
    ELSE
        -- Calculate available battery capacity (in kW for this interval)
        v_available_capacity := (v_battery.battery_capacity_kwh - v_battery.current_charge_kwh);
        
        -- Charge battery with surplus (limited by available capacity)
        v_charge_amount := LEAST(v_surplus.surplus_kw, v_available_capacity);
        v_overflow := GREATEST(0, v_surplus.surplus_kw - v_available_capacity);
        
        energy_to_battery_kwh := v_charge_amount;
        energy_overflow_kwh := v_overflow;
        
        -- Update battery
        IF v_charge_amount > 0 THEN
            UPDATE battery_storage SET
                current_charge_kwh = current_charge_kwh + v_charge_amount,
                charge_percent = LEAST(100, ((current_charge_kwh + v_charge_amount) / battery_capacity_kwh) * 100),
                is_charging = true,
                charging_from = v_surplus.dominant_source,
                last_charge_source = v_surplus.dominant_source,
                last_charge_amount_kwh = v_charge_amount,
                last_charge_timestamp = now(),
                updated_at = now()
            WHERE plant_id = p_plant_id;
            
            -- Log charging session
            INSERT INTO battery_charging_sessions (plant_id, source_type, energy_charged_kwh, surplus_total_kwh, 
                battery_level_before, battery_level_after, is_dominant_source)
            VALUES (p_plant_id, v_surplus.dominant_source, v_charge_amount, v_surplus.surplus_kw,
                v_battery.charge_percent, 
                LEAST(100, ((v_battery.current_charge_kwh + v_charge_amount) / v_battery.battery_capacity_kwh) * 100),
                true);
            
            -- Log transaction
            INSERT INTO energy_storage_transactions (plant_id, transaction_type, source, energy_kwh, 
                battery_level_before, battery_level_after)
            VALUES (p_plant_id, 'charge', v_surplus.dominant_source, v_charge_amount,
                v_battery.charge_percent, 
                LEAST(100, ((v_battery.current_charge_kwh + v_charge_amount) / v_battery.battery_capacity_kwh) * 100));
        END IF;
        
        -- Log overflow if any
        IF v_overflow > 0 THEN
            INSERT INTO energy_overflow_log (plant_id, source_type, overflow_kwh, reason, 
                total_production_kwh, plant_capacity_kwh, battery_level_percent)
            VALUES (p_plant_id, v_surplus.dominant_source, v_overflow, 'battery_full',
                v_surplus.total_production_kw, v_surplus.plant_capacity_kw, 
                LEAST(100, ((v_battery.current_charge_kwh + v_charge_amount) / v_battery.battery_capacity_kwh) * 100));
            
            -- Log overflow transaction
            INSERT INTO energy_storage_transactions (plant_id, transaction_type, source, energy_kwh,
                battery_level_before, battery_level_after)
            VALUES (p_plant_id, 'overflow', v_surplus.dominant_source, v_overflow,
                v_battery.charge_percent, v_battery.charge_percent);
        END IF;
        
        SELECT charge_percent INTO new_battery_level FROM battery_storage WHERE plant_id = p_plant_id;
    END IF;
    
    -- Log production snapshot
    INSERT INTO energy_production_snapshots (plant_id, solar_output_kw, wind_output_kw, hydro_output_kw,
        total_production_kw, plant_capacity_kw, surplus_kw, dominant_source, 
        battery_charging_kw, battery_level_percent, overflow_kw)
    VALUES (p_plant_id, p_solar_kw, p_wind_kw, p_hydro_kw,
        v_surplus.total_production_kw, v_surplus.plant_capacity_kw, v_surplus.surplus_kw, v_surplus.dominant_source,
        energy_to_battery_kwh, new_battery_level, energy_overflow_kwh);
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 4: SQL QUERIES FOR VISUALIZATION
-- ============================================

-- QUERY A: Energy Mix - Total Energy Renewed vs Plant Capacity (Last 24h)
-- Use this query for Graph A
/*
SELECT 
    date_trunc('hour', recorded_at) AS hour,
    SUM(solar_output_kw) AS solar_kwh,
    SUM(wind_output_kw) AS wind_kwh,
    SUM(hydro_output_kw) AS hydro_kwh,
    SUM(total_production_kw) AS total_production_kwh,
    AVG(plant_capacity_kw) AS plant_capacity_kwh,
    SUM(surplus_kw) AS surplus_kwh
FROM energy_production_snapshots
WHERE plant_id = 'YOUR_PLANT_ID'
  AND recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', recorded_at)
ORDER BY hour;
*/

-- QUERY B: Storage - Total Energy charged to battery (Last 24h)
/*
SELECT 
    date_trunc('hour', session_start) AS hour,
    SUM(energy_charged_kwh) AS total_charged_kwh,
    COUNT(*) AS charge_sessions
FROM battery_charging_sessions
WHERE plant_id = 'YOUR_PLANT_ID'
  AND session_start >= NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', session_start)
ORDER BY hour;
*/

-- QUERY C: Source Analysis - Battery Charging Source Breakdown (Last 24h)
/*
SELECT 
    source_type,
    SUM(energy_charged_kwh) AS total_kwh,
    COUNT(*) AS session_count,
    ROUND((SUM(energy_charged_kwh) / 
        (SELECT SUM(energy_charged_kwh) FROM battery_charging_sessions 
         WHERE plant_id = 'YOUR_PLANT_ID' AND session_start >= NOW() - INTERVAL '24 hours')
    ) * 100, 2) AS percentage
FROM battery_charging_sessions
WHERE plant_id = 'YOUR_PLANT_ID'
  AND session_start >= NOW() - INTERVAL '24 hours'
GROUP BY source_type
ORDER BY total_kwh DESC;
*/

-- QUERY D: Overflow Analysis by Source (Last 24h)
/*
SELECT 
    source_type,
    SUM(overflow_kwh) AS total_overflow_kwh,
    COUNT(*) AS overflow_events,
    AVG(battery_level_percent) AS avg_battery_level_when_overflow
FROM energy_overflow_log
WHERE plant_id = 'YOUR_PLANT_ID'
  AND recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY source_type
ORDER BY total_overflow_kwh DESC;
*/

-- ============================================
-- PART 5: SAMPLE DATA (OPTIONAL)
-- ============================================

-- Seed battery storage for first plant if not exists
DO $$
DECLARE
    v_plant_id uuid;
BEGIN
    SELECT id INTO v_plant_id FROM plants LIMIT 1;
    
    IF v_plant_id IS NOT NULL THEN
        INSERT INTO battery_storage (plant_id, battery_capacity_kwh, current_charge_kwh, charge_percent, is_charging, health_percent)
        SELECT v_plant_id, 500, 200, 40, false, 98
        WHERE NOT EXISTS (SELECT 1 FROM battery_storage WHERE plant_id = v_plant_id);
    END IF;
END $$;

-- Done!
SELECT 'Smart Surplus Management Schema Created Successfully!' AS result;
