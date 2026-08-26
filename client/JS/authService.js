/**
 * authService.js
 * Refactored to use the local Express backend with MongoDB and Passport.js
 */

import { getAuthHeaders, getApiUrl } from "./storage.js";

export async function getCurrentUser() {
    try {
        const response = await fetch(getApiUrl('/api/auth/user'), { 
            credentials: 'include',
            headers: getAuthHeaders()
        });
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        return null;
    }
}

export async function signOut() {
    try {
        window.location.href = getApiUrl('/api/auth/logout');
    } catch (error) {
        console.error("Error signing out:", error);
    }
}

/**
 * Initiates OAuth login (Google/GitHub).
 * Redirects the browser directly to the server's auth endpoints.
 * @param {string} provider - 'google' or 'github'
 */
export function signInWithProvider(provider) {
    if (provider === 'google') {
        window.location.href = getApiUrl('/api/auth/google');
    } else if (provider === 'github') {
        window.location.href = getApiUrl('/api/auth/github');
    } else {
        console.error('Unsupported provider:', provider);
    }
}
