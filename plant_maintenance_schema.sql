-- ============================================
-- PLANT MAINTENANCE MODULE - COMPLETE SCHEMA
-- Run this SQL in Supabase SQL Editor
-- Table names match the ML models exactly
-- ============================================

-- 1. Plant Equipment Table (Main equipment table)
CREATE TABLE IF NOT EXISTS plant_equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    equipment_type VARCHAR(50) NOT NULL CHECK (equipment_type IN ('electrolyzer', 'purifier', 'cooler', 'compressor')),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'offline', 'warning')),
    temperature DECIMAL(6,2) DEFAULT 25,
    pressure DECIMAL(6,2) DEFAULT 1,
    uptime_hours INTEGER DEFAULT 0,
    health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    max_temperature DECIMAL(6,2) DEFAULT 85,
    max_pressure DECIMAL(6,2) DEFAULT 15,
    max_uptime_hours INTEGER DEFAULT 8760,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plant_equipment_plant ON plant_equipment(plant_id);

-- 2. Equipment Sensor Data Table (For graphs and ML training)
CREATE TABLE IF NOT EXISTS equipment_sensor_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id UUID REFERENCES plant_equipment(id) ON DELETE CASCADE,
    temperature DECIMAL(6,2),
    pressure DECIMAL(6,2),
    uptime_hours INTEGER,
    vibration DECIMAL(6,3),
    power_consumption DECIMAL(8,2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_data_equipment ON equipment_sensor_data(equipment_id, recorded_at DESC);

-- 3. Energy Sources Table
CREATE TABLE IF NOT EXISTS energy_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('solar_panel', 'hydro_turbine', 'windmill', 'battery')),
    name VARCHAR(255) NOT NULL,
    condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'critical')),
    efficiency_percent DECIMAL(5,2) DEFAULT 85,
    is_operational BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_energy_sources_plant ON energy_sources(plant_id);

-- 4. Equipment Maintenance Predictions Table (ML predictions)
CREATE TABLE IF NOT EXISTS equipment_maintenance_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id UUID REFERENCES plant_equipment(id) ON DELETE CASCADE,
    predicted_maintenance_date TIMESTAMP WITH TIME ZONE,
    days_until_maintenance INTEGER,
    confidence_score DECIMAL(5,4),
    failure_probability DECIMAL(5,4),
    recommended_action TEXT,
    model_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_predictions_equipment ON equipment_maintenance_predictions(equipment_id, created_at DESC);

-- 5. Shutdown Prevention Recommendations Table
CREATE TABLE IF NOT EXISTS shutdown_prevention_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    equipment_id UUID,
    recommendation TEXT NOT NULL,
    action_type VARCHAR(50),
    priority VARCHAR(20) CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    estimated_impact TEXT,
    estimated_cost DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prevention_recommendations_plant ON shutdown_prevention_recommendations(plant_id);

-- 6. Plant Shutdown Predictions Table
CREATE TABLE IF NOT EXISTS plant_shutdown_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    predicted_shutdown_date TIMESTAMP WITH TIME ZONE,
    days_until_shutdown INTEGER,
    reason TEXT,
    non_operational_percent DECIMAL(5,2),
    auto_shutdown_triggered BOOLEAN DEFAULT false,
    shutdown_executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shutdown_predictions_plant ON plant_shutdown_predictions(plant_id, created_at DESC);

-- ============================================
-- SEED DATA FOR FIRST PLANT
-- ============================================

DO $$
DECLARE
    plant_uuid UUID;
    eq_electrolyzer UUID;
    eq_purifier UUID;
    eq_cooler UUID;
    eq_compressor UUID;
BEGIN
    -- Get first plant
    SELECT id INTO plant_uuid FROM plants LIMIT 1;
    
    IF plant_uuid IS NOT NULL THEN
        -- Insert Equipment if not exists
        INSERT INTO plant_equipment (id, plant_id, equipment_type, name, status, temperature, pressure, uptime_hours, health_score, max_temperature, max_pressure, max_uptime_hours)
        SELECT gen_random_uuid(), plant_uuid, 'electrolyzer', 'Electrolyzer-1', 'operational', 45.0, 150.0, 2663, 95, 85, 15, 8760
        WHERE NOT EXISTS (SELECT 1 FROM plant_equipment WHERE plant_id = plant_uuid AND equipment_type = 'electrolyzer');
        
        INSERT INTO plant_equipment (id, plant_id, equipment_type, name, status, temperature, pressure, uptime_hours, health_score, max_temperature, max_pressure, max_uptime_hours)
        SELECT gen_random_uuid(), plant_uuid, 'purifier', 'Hydrogen Purifier', 'operational', 38.5, 6.2, 1890, 88, 60, 8, 6000
        WHERE NOT EXISTS (SELECT 1 FROM plant_equipment WHERE plant_id = plant_uuid AND equipment_type = 'purifier');
        
        INSERT INTO plant_equipment (id, plant_id, equipment_type, name, status, temperature, pressure, uptime_hours, health_score, max_temperature, max_pressure, max_uptime_hours)
        SELECT gen_random_uuid(), plant_uuid, 'cooler', 'Cooling System', 'operational', 28.2, 3.5, 3200, 92, 45, 5, 10000
        WHERE NOT EXISTS (SELECT 1 FROM plant_equipment WHERE plant_id = plant_uuid AND equipment_type = 'cooler');
        
        INSERT INTO plant_equipment (id, plant_id, equipment_type, name, status, temperature, pressure, uptime_hours, health_score, max_temperature, max_pressure, max_uptime_hours)
        SELECT gen_random_uuid(), plant_uuid, 'compressor', 'H2 Compressor', 'operational', 62.8, 18.5, 4100, 78, 90, 20, 5000
        WHERE NOT EXISTS (SELECT 1 FROM plant_equipment WHERE plant_id = plant_uuid AND equipment_type = 'compressor');
        
        -- Insert Energy Sources if not exists
        INSERT INTO energy_sources (plant_id, source_type, name, condition, efficiency_percent, is_operational)
        SELECT plant_uuid, 'solar_panel', 'Solar Panel Array', 'excellent', 97, true
        WHERE NOT EXISTS (SELECT 1 FROM energy_sources WHERE plant_id = plant_uuid AND source_type = 'solar_panel');
        
        INSERT INTO energy_sources (plant_id, source_type, name, condition, efficiency_percent, is_operational)
        SELECT plant_uuid, 'hydro_turbine', 'Hydro Turbine Generator', 'good', 72, true
        WHERE NOT EXISTS (SELECT 1 FROM energy_sources WHERE plant_id = plant_uuid AND source_type = 'hydro_turbine');
        
        INSERT INTO energy_sources (plant_id, source_type, name, condition, efficiency_percent, is_operational)
        SELECT plant_uuid, 'windmill', 'Wind Turbine System', 'good', 83, true
        WHERE NOT EXISTS (SELECT 1 FROM energy_sources WHERE plant_id = plant_uuid AND source_type = 'windmill');
        
        -- Insert sample sensor data for each equipment
        FOR eq_electrolyzer IN SELECT id FROM plant_equipment WHERE plant_id = plant_uuid AND equipment_type = 'electrolyzer' LOOP
            INSERT INTO equipment_sensor_data (equipment_id, temperature, pressure, uptime_hours, vibration, power_consumption)
            SELECT eq_electrolyzer, 44 + random()*3, 148 + random()*5, 2660 + i, random()*0.5, 75 + random()*10
            FROM generate_series(1, 48) i
            WHERE NOT EXISTS (SELECT 1 FROM equipment_sensor_data WHERE equipment_id = eq_electrolyzer);
        END LOOP;
        
        FOR eq_purifier IN SELECT id FROM plant_equipment WHERE plant_id = plant_uuid AND equipment_type = 'purifier' LOOP
            INSERT INTO equipment_sensor_data (equipment_id, temperature, pressure, uptime_hours, vibration, power_consumption)
            SELECT eq_purifier, 37 + random()*3, 5.8 + random()*0.8, 1880 + i, random()*0.3, 45 + random()*8
            FROM generate_series(1, 48) i
            WHERE NOT EXISTS (SELECT 1 FROM equipment_sensor_data WHERE equipment_id = eq_purifier);
        END LOOP;
        
    END IF;
END $$;

-- Done!
SELECT 'Schema created successfully!' AS result;
