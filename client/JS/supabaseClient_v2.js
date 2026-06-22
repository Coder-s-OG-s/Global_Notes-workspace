import config from './config.js';

// L3: Added error guard — without this, missing config causes uncaught exception
// that crashes any feature importing this module.
const { SUPABASE_URL, SUPABASE_ANON_KEY } = config;

let supabase;

try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase credentials missing in config.js');
    }
    // Initialize Supabase Client using Global Object (loaded via script tag)
    const { createClient } = window.supabase;
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase Client Initialized via Global (v2)');
} catch (error) {
    console.warn('Supabase v2 Init Failed (App running in Local/Offline mode):', error.message);
    // Provide a no-op mock to prevent crashes in features that import this module
    supabase = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
        },
        from: () => ({
            select: () => ({ eq: () => ({ data: [], error: { message: 'Offline Mode' } }) }),
            upsert: async () => ({ error: { message: 'Offline Mode' } }),
            delete: () => ({ eq: async () => ({ error: { message: 'Offline Mode' } }) }),
        })
    };
}

export { supabase };
