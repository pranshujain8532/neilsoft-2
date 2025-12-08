-- =========================================================
-- SMART SURPLUS ROUTING SCHEMA
-- Handles overflow: Production > (Plant Capacity + Battery)
-- Priority 1: Truck Loading | Priority 2: Grid Export
-- =========================================================

-- =========================================================
-- 1. GRID TRANSACTIONS TABLE (Import/Export Tracking)
-- =========================================================

CREATE TABLE IF NOT EXISTS grid_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL,
    
    -- Transaction type: 'import' (from grid) or 'export' (to grid)
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('import', 'export')),
    
    -- Energy metrics
    kwh_transferred DECIMAL(12, 4) NOT NULL,
    price_per_kwh DECIMAL(8, 4) DEFAULT 8.50,  -- INR per kWh
    total_cost_inr DECIMAL(12, 2),
    
    -- Grid location info (from Google Maps API or fallback)
    grid_location_data JSONB DEFAULT '{}'::jsonb,
    -- Example: {"name": "Ahmedabad Substation", "lat": 23.0225, "lon": 72.5714, "distance_km": 15.2}
    
    -- Overflow context
    overflow_reason TEXT,
    production_at_trigger DECIMAL(12, 4),  -- kW at trigger time
    capacity_at_trigger DECIMAL(12, 4),    -- Total plant + battery capacity
    surplus_at_trigger DECIMAL(12, 4),     -- Excess kW
    
    -- Timing
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_grid_trans_plant ON grid_transactions(plant_id);
CREATE INDEX IF NOT EXISTS idx_grid_trans_type ON grid_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_grid_trans_triggered ON grid_transactions(triggered_at DESC);


-- =========================================================
-- 2. TRUCK LOADING SESSIONS TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS truck_loading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL,
    
    -- Link to existing tables
    vehicle_id UUID NOT NULL,  -- References vehicles(id)
    order_id UUID,             -- References orders(id) - optional
    
    -- Energy loaded
    energy_loaded_kwh DECIMAL(12, 4) NOT NULL,
    hydrogen_kg DECIMAL(10, 4),  -- Converted H2 amount
    
    -- Surplus context
    surplus_at_trigger DECIMAL(12, 4),
    dominant_source VARCHAR(20),  -- solar, wind, hydro
    battery_level_percent DECIMAL(5, 2),
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    loading_duration_minutes INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'loading' CHECK (status IN ('loading', 'completed', 'cancelled')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_truck_loading_plant ON truck_loading_sessions(plant_id);
CREATE INDEX IF NOT EXISTS idx_truck_loading_vehicle ON truck_loading_sessions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_truck_loading_started ON truck_loading_sessions(started_at DESC);


-- =========================================================
-- 3. OVERFLOW EVENTS LOG
-- =========================================================

CREATE TABLE IF NOT EXISTS overflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL,
    
    -- Overflow metrics
    total_production_kw DECIMAL(12, 4) NOT NULL,
    plant_capacity_kw DECIMAL(12, 4) NOT NULL,
    battery_capacity_kw DECIMAL(12, 4) NOT NULL,
    battery_level_percent DECIMAL(5, 2),
    overflow_kw DECIMAL(12, 4) NOT NULL,  -- Surplus amount
    
    -- Resolution
    resolution_type VARCHAR(30) CHECK (resolution_type IN ('truck_loading', 'grid_export', 'wasted', 'pending')),
    resolution_id UUID,  -- Link to truck_loading_sessions or grid_transactions
    
    -- Timing
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overflow_plant ON overflow_events(plant_id);
CREATE INDEX IF NOT EXISTS idx_overflow_detected ON overflow_events(detected_at DESC);


-- =========================================================
-- 4. KNOWN GRID POINTS (CACHE FOR SUBSTATIONS)
-- =========================================================

CREATE TABLE IF NOT EXISTS known_grid_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Location
    name VARCHAR(200) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    
    -- Type
    point_type VARCHAR(50) DEFAULT 'substation' CHECK (point_type IN ('substation', 'power_grid', 'interconnection')),
    
    -- Capacity
    max_import_kw DECIMAL(12, 4),
    max_export_kw DECIMAL(12, 4),
    
    -- Pricing
    import_price_per_kwh DECIMAL(8, 4) DEFAULT 8.50,
    export_price_per_kwh DECIMAL(8, 4) DEFAULT 4.25,  -- Typically lower than import
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Cache metadata
    source VARCHAR(50) DEFAULT 'google_maps',
    last_verified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pre-populate with known Gujarat substations (fallback data)
INSERT INTO known_grid_points (name, address, latitude, longitude, point_type, max_export_kw)
VALUES 
    ('Ahmedabad 220kV Substation', 'Ahmedabad, Gujarat', 23.0225, 72.5714, 'substation', 50000),
    ('Gandhinagar Grid Station', 'Gandhinagar, Gujarat', 23.2156, 72.6369, 'substation', 75000),
    ('Vadodara Power Grid', 'Vadodara, Gujarat', 22.3072, 73.1812, 'substation', 60000),
    ('Surat Electrical Substation', 'Surat, Gujarat', 21.1702, 72.8311, 'substation', 80000),
    ('Rajkot Grid Interconnection', 'Rajkot, Gujarat', 22.3039, 70.8022, 'interconnection', 45000)
ON CONFLICT DO NOTHING;


-- =========================================================
-- 5. ADD WIND SOURCE TO ENERGY_SOURCES (FIX WIND ISSUE)
-- NOTE: Run this separately if your energy_sources table has different columns
-- =========================================================

-- First, check what columns exist in your energy_sources table:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'energy_sources';

-- Simple version - adjust columns as needed based on your table structure
-- INSERT INTO energy_sources (plant_id, source_type, capacity_kw)
-- SELECT DISTINCT es.plant_id, 'wind_turbine', 30
-- FROM energy_sources es
-- WHERE NOT EXISTS (
--     SELECT 1 FROM energy_sources es2 
--     WHERE es2.plant_id = es.plant_id 
--     AND es2.source_type ILIKE '%wind%'
-- )
-- ON CONFLICT DO NOTHING;


-- =========================================================
-- 6. HELPER VIEWS
-- =========================================================

-- NOTE: These views depend on specific table structures.
-- Uncomment and adjust based on your actual table columns.

-- View: Current overflow status per plant
-- (Commented out - requires energy_production_snapshots.total_power_kw column)
/*
CREATE OR REPLACE VIEW v_plant_overflow_status AS
SELECT 
    p.id as plant_id,
    p.name as plant_name,
    COALESCE(eps.total_power_kw, 0) as current_production_kw,
    COALESCE(SUM(es.capacity_kw), 100) as plant_capacity_kw,
    COALESCE(bs.capacity_kwh, 100) as battery_capacity_kwh,
    COALESCE(bs.current_charge_kwh, 0) as battery_current_kwh,
    COALESCE(bs.current_charge_kwh / NULLIF(bs.capacity_kwh, 0) * 100, 0) as battery_percent,
    CASE 
        WHEN COALESCE(eps.total_power_kw, 0) > 
             (COALESCE(SUM(es.capacity_kw), 100) + (COALESCE(bs.capacity_kwh, 100) - COALESCE(bs.current_charge_kwh, 0)))
        THEN true 
        ELSE false 
    END as is_overflow,
    GREATEST(0, 
        COALESCE(eps.total_power_kw, 0) - 
        (COALESCE(SUM(es.capacity_kw), 100) + (COALESCE(bs.capacity_kwh, 100) - COALESCE(bs.current_charge_kwh, 0)))
    ) as overflow_kw
FROM plants p
LEFT JOIN energy_sources es ON es.plant_id = p.id
LEFT JOIN battery_storage bs ON bs.plant_id = p.id
LEFT JOIN LATERAL (
    SELECT total_power_kw 
    FROM energy_production_snapshots 
    WHERE plant_id = p.id 
    ORDER BY created_at DESC 
    LIMIT 1
) eps ON true
GROUP BY p.id, p.name, eps.total_power_kw, bs.capacity_kwh, bs.current_charge_kwh;
*/


-- View: Grid export summary (24h aggregated by 10 minutes)
CREATE OR REPLACE VIEW v_grid_export_24h AS
SELECT 
    plant_id,
    date_trunc('hour', triggered_at) + 
        (EXTRACT(MINUTE FROM triggered_at)::int / 10) * INTERVAL '10 minutes' AS time_bucket,
    SUM(kwh_transferred) AS export_kwh,
    COUNT(*) AS transaction_count,
    AVG(price_per_kwh) AS avg_price
FROM grid_transactions
WHERE transaction_type = 'export'
  AND triggered_at >= NOW() - INTERVAL '24 hours'
GROUP BY plant_id, time_bucket
ORDER BY time_bucket;


-- View: Grid import vs export totals
CREATE OR REPLACE VIEW v_grid_import_export_summary AS
SELECT 
    plant_id,
    transaction_type,
    SUM(kwh_transferred) AS total_kwh,
    SUM(total_cost_inr) AS total_cost,
    COUNT(*) AS transaction_count,
    date_trunc('day', triggered_at) AS day
FROM grid_transactions
WHERE triggered_at >= NOW() - INTERVAL '30 days'
GROUP BY plant_id, transaction_type, date_trunc('day', triggered_at)
ORDER BY day DESC;


-- =========================================================
-- 7. ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE grid_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_loading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE overflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE known_grid_points ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Allow read for authenticated" ON grid_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated" ON truck_loading_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated" ON overflow_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated" ON known_grid_points FOR SELECT TO authenticated USING (true);

-- Service role full access
CREATE POLICY "Service role full access" ON grid_transactions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON truck_loading_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON overflow_events FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON known_grid_points FOR ALL TO service_role USING (true);


-- =========================================================
-- 8. USEFUL QUERIES FOR FRONTEND
-- =========================================================

-- Query A: 24H Grid Export Chart (10-minute buckets)
-- SELECT * FROM v_grid_export_24h WHERE plant_id = 'your-plant-id';

-- Query B: Import vs Export Comparison (30 days)
-- SELECT * FROM v_grid_import_export_summary WHERE plant_id = 'your-plant-id';

-- Query C: Live Overflow Status
-- SELECT * FROM v_plant_overflow_status WHERE plant_id = 'your-plant-id';

-- Query D: Find idle vehicles
-- SELECT * FROM vehicles WHERE status = 'idle' ORDER BY health_score DESC;

-- Query E: Find pending orders for expedited fulfillment
-- SELECT * FROM orders WHERE status IN ('pending', 'confirmed') ORDER BY created_at ASC;
