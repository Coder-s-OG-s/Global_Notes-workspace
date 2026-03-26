import { account, ID } from './appwriteClient.js';

/**
 * Signs up a new user with email and password.
 * Appwrite also stores the name automatically.
 */
export async function signUp(email, password, username) {
    try {
        const response = await account.create(
            ID.unique(),
            email,
            password,
            username
        );

        // Optionally store avatar in user preferences
        await account.updatePrefs({
            avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`,
            username: username
        });

        // After signup, automatically log them in
        return await signIn(email, password);
    } catch (error) {
        throw error;
    }
}

/**
 * Signs in an existing user.
 */
export async function signIn(email, password) {
    try {
        return await account.createEmailPasswordSession(email, password);
    } catch (error) {
        throw error;
    }
}

/**
 * Signs out the current user.
 */
export async function signOut() {
    try {
        await account.deleteSession('current');
    } catch (error) {
        throw error;
    }
}

/**
 * Gets the current active session.
 */
export async function getSession() {
    try {
        return await account.getSession('current');
    } catch (error) {
        return null;
    }
}

/**
 * Initiates OAuth login (Google/GitHub).
 * @param {string} provider - 'google' or 'github'
 */
export async function signInWithProvider(provider) {
    const redirectUrl = new URL('../app.html', window.location.href).href;
    console.log("Initiating Appwrite OAuth with redirect to:", redirectUrl);

    // Appwrite uses createOAuth2Session
    // Note: Provider strings must be 'google', 'github', etc.
    return account.createOAuth2Session(
        provider,
        redirectUrl,
        redirectUrl // Failure redirect
    );
}

/**
 * Get current user details
 */
export async function getCurrentUser() {
    try {
        return await account.get();
    } catch (error) {
        return null;
    }
}
