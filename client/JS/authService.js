/**
 * authService.js
 * Refactored to use the local Express backend with MongoDB and Passport.js
 */

export async function getCurrentUser() {
    try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error("Error fetching user session:", error);
        return null;
    }
}

export async function signOut() {
    try {
        window.location.href = '/api/auth/logout';
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
        window.location.href = '/api/auth/google';
    } else if (provider === 'github') {
        window.location.href = '/api/auth/github';
    }
}

// Note: signUp and signIn with email/password would need a local implementation 
// in the backend if you want them, but the request emphasized Google and GitHub.
