import { supabase } from "./supabaseClient.js";

/**
 * Signs up a new user with email and password.
 * Also stores the username in metadata for the profile trigger to pick up.
 */
export async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username,
                avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`
            }
        }
    });

    if (error) throw error;
    return data;
}

/**
 * Signs in an existing user.
 */
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;
    return data;
}

/**
 * Signs out the current user.
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/**
 * Gets the current active session.
 */
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
}

/**
 * Initiates OAuth login (Google/GitHub).
 * @param {string} provider - 'google' or 'github'
 */
export async function signInWithProvider(provider) {
    const redirectUrl = window.location.origin;
    console.log("Initiating OAuth with redirect to:", redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
            redirectTo: redirectUrl
        }
    });

    if (error) throw error;
    return data;
}

/**
 * Get current user details
 */
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
