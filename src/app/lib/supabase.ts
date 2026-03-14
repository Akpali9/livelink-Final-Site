import { createClient } from '@supabase/supabase-js';

// Make sure you have these in your .env file (Vite prefixes env vars with VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables!');
}

// ✅ Named export
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
