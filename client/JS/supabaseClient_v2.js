import config from './config.js';

// Initialize Supabase Client using Global Object (Robust & Browser-Compatible)
// Fallback to window.supabase which is loaded via script tag in index.html - DO NOT REVERT TO ESM IMPORT
const { createClient } = window.supabase;

const { SUPABASE_URL, SUPABASE_ANON_KEY } = config;

// Create a single instance of the client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Optional: Log to verify init
console.log("Supabase Client Initialized via Global (v2)");

export { supabase };
