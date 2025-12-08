-- Create table for vehicle sensor logs
CREATE TABLE IF NOT EXISTS public.sensor_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mileage NUMERIC NOT NULL,
    engine_temp NUMERIC NOT NULL,
    oil_pressure NUMERIC NOT NULL,
    wear_score NUMERIC, -- Optional: Actual wear score if known (for training)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sensor_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous read/write (for demo purposes)
-- IN PRODUCTION: Restrict this to authenticated service roles only!
CREATE POLICY "Allow public access" ON public.sensor_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Create table for maintenance events (optional, if moving away from mock data)
CREATE TABLE IF NOT EXISTS public.maintenance_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending', -- pending, in-progress, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for maintenance events
ALTER TABLE public.maintenance_events ENABLE ROW LEVEL SECURITY;

-- Create policy for maintenance events
CREATE POLICY "Allow public access" ON public.maintenance_events
    FOR ALL USING (true) WITH CHECK (true);

-- Insert some dummy data for sensor logs
INSERT INTO public.sensor_logs (vehicle_id, mileage, engine_temp, oil_pressure, wear_score)
VALUES 
    ('GJ-01-AB-1234', 15000, 85.5, 42.0, 0.15),
    ('MH-02-CD-5678', 25000, 92.0, 38.5, 0.45),
    ('DL-03-EF-9012', 5000, 78.0, 45.0, 0.05);
