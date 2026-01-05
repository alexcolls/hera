import { createClient } from '@supabase/supabase-js'

// Simple admin client for backend services (API routes/Workers) that might not have user context
// For actual user operations, use the SSR client.
// For this MVP "system", we'll use a service role client or just the anon client if RLS permits.
// Better yet, for server-side operations without cookies, just use the standard supabase-js client.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Note: In production, for writing to jobs/storage from backend without user session, 
// you might need the SERVICE_ROLE_KEY if RLS is strict. 
// For now, we assume public access or we use the anon key.
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
