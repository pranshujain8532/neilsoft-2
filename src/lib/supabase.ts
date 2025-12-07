import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mnigrozyrnimwzczehbr.supabase.co';
// Use service role key to bypass RLS, fall back to anon key
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
}

console.log('[Supabase] Using', import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON', 'key');

export const supabase = createClient(supabaseUrl, supabaseKey);
