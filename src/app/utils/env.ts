// src/utils/env.ts
export const getEnvVar = (key: string): string => {
  // For Vite (most common)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  
  // For development debugging - shows what's available
  console.warn(`Environment variable ${key} not found. Available Vite env vars:`, 
    typeof import.meta !== 'undefined' ? Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')) : []);
  
  throw new Error(`Missing environment variable: ${key}`);
};

// Specific getters for your Supabase variables
export const getSupabaseUrl = () => getEnvVar('VITE_SUPABASE_URL');
export const getSupabaseAnonKey = () => getEnvVar('VITE_SUPABASE_ANON_KEY');