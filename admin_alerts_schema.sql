-- ============================================================
-- ADMIN ALERTS SYSTEM - Lightweight Schema
-- Stores alert history for H2-OptiPlant
-- ============================================================

-- Admin Alerts Table
CREATE TABLE IF NOT EXISTS admin_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type TEXT NOT NULL,  -- e.g., 'H2_LEAK', 'TEMP_CRITICAL'
    severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'WARNING', 'INFO')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    trigger_value FLOAT,
    threshold_value FLOAT,
    context JSONB DEFAULT '{}'::JSONB,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')),
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_alerts_status ON admin_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_plant ON admin_alerts(plant_id, status);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity ON admin_alerts(severity, status);

-- Enable RLS
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
CREATE POLICY "Authenticated users can view alerts" ON admin_alerts
    FOR SELECT USING (true);

CREATE POLICY "Service role can insert alerts" ON admin_alerts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update alerts" ON admin_alerts
    FOR UPDATE USING (true);
