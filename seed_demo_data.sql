-- =========================================================
-- SEED DATA FOR RENEWABLE ENERGY DASHBOARD
-- Run this in Supabase SQL Editor to populate charts
-- =========================================================

-- Get the first plant ID
DO $$
DECLARE
    v_plant_id UUID;
BEGIN
    -- Get first plant
    SELECT id INTO v_plant_id FROM plants LIMIT 1;
    
    IF v_plant_id IS NULL THEN
        RAISE EXCEPTION 'No plants found in database';
    END IF;

    -- =========================================================
    -- 1. SEED GRID TRANSACTIONS (Last 7 days)
    -- =========================================================
    
    -- Grid Exports (energy sold to grid)
    INSERT INTO grid_transactions (plant_id, transaction_type, kwh_transferred, price_per_kwh, total_cost_inr, 
        grid_location_data, overflow_reason, triggered_at, status)
    VALUES
        (v_plant_id, 'export', 150.5, 4.25, 639.63, 
         '{"name": "Ahmedabad 220kV Substation", "distance_km": 15.2}', 
         'Battery full, surplus exported', NOW() - INTERVAL '6 days', 'completed'),
        (v_plant_id, 'export', 220.8, 4.25, 938.40, 
         '{"name": "Gandhinagar Grid Station", "distance_km": 28.5}', 
         'Peak solar production overflow', NOW() - INTERVAL '5 days', 'completed'),
        (v_plant_id, 'export', 85.2, 4.25, 362.10, 
         '{"name": "Ahmedabad 220kV Substation", "distance_km": 15.2}', 
         'Wind surge overflow', NOW() - INTERVAL '4 days', 'completed'),
        (v_plant_id, 'export', 310.5, 4.25, 1319.63, 
         '{"name": "400 KV Power Grid Substation", "distance_km": 34.8}', 
         'Combined solar+wind overflow', NOW() - INTERVAL '3 days', 'completed'),
        (v_plant_id, 'export', 175.0, 4.25, 743.75, 
         '{"name": "Ahmedabad 220kV Substation", "distance_km": 15.2}', 
         'Midday surplus', NOW() - INTERVAL '2 days', 'completed'),
        (v_plant_id, 'export', 420.3, 4.25, 1786.28, 
         '{"name": "400 KV Power Grid Substation", "distance_km": 34.8}', 
         'Maximum production day', NOW() - INTERVAL '1 day', 'completed'),
        (v_plant_id, 'export', 65.8, 4.25, 279.65, 
         '{"name": "Gandhinagar Grid Station", "distance_km": 28.5}', 
         'Morning overflow', NOW() - INTERVAL '12 hours', 'completed'),
        (v_plant_id, 'export', 95.2, 4.25, 404.60, 
         '{"name": "Ahmedabad 220kV Substation", "distance_km": 15.2}', 
         'Afternoon surplus', NOW() - INTERVAL '6 hours', 'completed');

    -- Grid Imports (energy bought from grid)
    INSERT INTO grid_transactions (plant_id, transaction_type, kwh_transferred, price_per_kwh, total_cost_inr, 
        grid_location_data, overflow_reason, triggered_at, status)
    VALUES
        (v_plant_id, 'import', 50.0, 8.50, 425.00, 
         '{"name": "Ahmedabad 220kV Substation", "distance_km": 15.2}', 
         'Night demand - battery low', NOW() - INTERVAL '5 days 3 hours', 'completed'),
        (v_plant_id, 'import', 75.5, 8.50, 641.75, 
         '{"name": "Gandhinagar Grid Station", "distance_km": 28.5}', 
         'Cloudy day - low solar', NOW() - INTERVAL '3 days 2 hours', 'completed'),
        (v_plant_id, 'import', 30.0, 8.50, 255.00, 
         '{"name": "Ahmedabad 220kV Substation", "distance_km": 15.2}', 
         'Emergency demand spike', NOW() - INTERVAL '1 day 4 hours', 'completed');

    RAISE NOTICE 'Successfully seeded grid transaction data for plant %', v_plant_id;
END $$;

-- Verify the data
SELECT 'Grid Transactions' as table_name, COUNT(*) as count FROM grid_transactions;

-- Show summary
SELECT 
    transaction_type,
    COUNT(*) as transactions,
    ROUND(SUM(kwh_transferred)::numeric, 2) as total_kwh,
    ROUND(SUM(total_cost_inr)::numeric, 2) as total_inr
FROM grid_transactions
GROUP BY transaction_type;

