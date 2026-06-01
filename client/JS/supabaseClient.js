import config from './config.js';

// Initialize Supabase Client using Global Object (Robust & Browser-Compatible)
// Fallback to window.supabase which is loaded via script tag in index.html - DO NOT REVERT TO ESM IMPORT
const { createClient } = window.supabase;

const { SUPABASE_URL, SUPABASE_ANON_KEY } = config;

// Create a single instance of the client
let supabase;

try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === '' || SUPABASE_ANON_KEY === '') {
        throw new Error("Supabase credentials missing in config.js");
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client Initialized");
} catch (error) {
    console.warn("Supabase Init Failed (App running in Local/Offline mode):", error.message);

    // Create a Mock Client to prevent app crash and allow LocalStorage features to work
    supabase = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
            signInWithPassword: async () => ({ error: { message: "Service Unavailable: Missing Config" } }),
            signInWithOAuth: async () => ({ error: { message: "Service Unavailable: Missing Config" } }),
            signOut: async () => ({ error: null }),
            signUp: async () => ({ error: { message: "Service Unavailable: Missing Config" } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        },
        from: (table) => ({
            select: () => ({
                eq: () => ({ data: [], error: { message: "Offline Mode" } }),
                data: [],
                error: { message: "Offline Mode" }
            }),
            upsert: async () => ({ error: { message: "Offline Mode" } }),
            delete: () => ({ eq: async () => ({ error: { message: "Offline Mode" } }) }),
        })
    };
}

export { supabase };
