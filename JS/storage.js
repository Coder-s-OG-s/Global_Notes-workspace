// ========================================
// IMPORTS - Load configuration constants
// ========================================
// Import storage key constants from constants.js:
// - NOTES_STORAGE_PREFIX: Base prefix for all note storage keys
// - ACTIVE_USER_KEY: Key for storing currently logged-in user
// - ACCOUNT_KEY: Key for storing array of user accounts
import { NOTES_STORAGE_PREFIX, ACTIVE_USER_KEY, ACCOUNT_KEY } from "./constants.js";

// ========================================
// STORAGE KEY MANAGEMENT
// ========================================
/**
 * Generates a unique localStorage key for a user's notes
 * - Combines NOTES_STORAGE_PREFIX with username
 * - Uses "guest" as username if no user provided (for anonymous users)
 * - Format: "NOTES_STORAGE_PREFIX.username" or "NOTES_STORAGE_PREFIX.guest"
 * @param {string|null} user - Username or null for guest
 * @returns {string} Unique storage key for this user's notes
 */
export function storageKeyForUser(user) {
  // If user is null/undefined, use "guest" as the username
  // This allows anonymous users to have their own note storage
  return `${NOTES_STORAGE_PREFIX}.${user || "guest"}`;
}

/**
 * Retrieves all notes for a specific user from localStorage
 * - Generates storage key using storageKeyForUser()
 * - Attempts to retrieve and parse JSON data
 * - Validates that retrieved data is an array (defensive programming)
 * - Returns empty array if key doesn't exist, is invalid JSON, or is not an array
 * - Silently catches errors to prevent crashes (graceful degradation)
 * @param {string|null} user - Username to retrieve notes for
 * @returns {Array} Array of note objects, or empty array if none found/error occurs
 */
export function getNotes(user) {
  try {
    // Retrieve the raw JSON string from localStorage using the user's unique key
    const raw = localStorage.getItem(storageKeyForUser(user));
    // If key doesn't exist, return empty array (no notes yet)
    if (!raw) return [];
    // Parse JSON string back into JavaScript object/array
    const parsed = JSON.parse(raw);
    // Validate that parsed data is actually an array (not an object or other type)
    // This prevents errors if corrupted data is stored
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Catch any errors: missing key, invalid JSON, parse errors, localStorage unavailable
    // Return empty array to allow app to continue functioning
    return [];
  }
}

/**
 * Saves notes array to localStorage for a specific user
 * - Generates storage key using storageKeyForUser()
 * - Converts notes array to JSON string
 * - Stores in localStorage
 * - Logs error if save fails but doesn't throw (non-blocking)
 * @param {string|null} user - Username to save notes for
 * @param {Array} notes - Array of note objects to persist
 */
export function setNotes(user, notes) {
  try {
    // Convert notes array to JSON string and store in localStorage
    // Uses user-specific key so each user has separate note storage
    localStorage.setItem(storageKeyForUser(user), JSON.stringify(notes));
  } catch (err) {
    // Log error if storage fails (quota exceeded, localStorage disabled, etc.)
    // but don't throw - app should continue to function in memory
    console.error("Failed to save notes", err);
  }
}

/**
 * Retrieves the currently active (logged-in) user from localStorage
 * - Attempts to get value from ACTIVE_USER_KEY
 * - Returns null if key doesn't exist or localStorage is unavailable
 * - Used to determine which user's notes to load on app startup
 * @returns {string|null} Username of active user, or null if no user is logged in
 */
export function getActiveUser() {
  try {
    // Retrieve username from localStorage using ACTIVE_USER_KEY constant
    // If key doesn't exist, returns null (|| null ensures explicit null, not undefined)
    return localStorage.getItem(ACTIVE_USER_KEY) || null;
  } catch {
    // Catch errors if localStorage is unavailable (private browsing, quota exceeded, etc.)
    return null;
  }
}

/**
 * Saves the currently active (logged-in) user to localStorage
 * - Only saves if username is provided (truthy check)
 * - Used when user successfully logs in
 * - Enables persistence of login state across browser sessions
 * @param {string} username - Username to set as active user
 */
export function setActiveUser(username) {
  // Only proceed if username is provided (not empty, null, or undefined)
  // Prevents saving invalid/empty usernames
  if (!username) return;
  // Store username in localStorage using ACTIVE_USER_KEY
  // This persists the user's login across page refreshes
  localStorage.setItem(ACTIVE_USER_KEY, username);
}

/**
 * Clears the active user from localStorage
 * - Removes ACTIVE_USER_KEY entry completely
 * - Called when user logs out
 * - Resets app to unauthenticated state
 */
export function clearActiveUser() {
  // Remove the ACTIVE_USER_KEY from localStorage
  // After this, getActiveUser() will return null until user logs in again
  localStorage.removeItem(ACTIVE_USER_KEY);
}

/**
 * Retrieves all registered user accounts from localStorage
 * - Accounts contain username and password hashes
 * - Returns empty array if no accounts exist or data is invalid
 * - Used for login/signup validation
 * @returns {Array} Array of account objects, or empty array if none found/error
 */
export function getAccounts() {
  try {
    // Retrieve raw JSON string of accounts from localStorage using ACCOUNT_KEY
    const raw = localStorage.getItem(ACCOUNT_KEY);
    // If key doesn't exist, no accounts have been created yet, return empty array
    if (!raw) return [];
    // Parse JSON string into JavaScript array of account objects
    const parsed = JSON.parse(raw);
    // Validate that parsed data is an array (defensive against corrupted data)
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Catch parsing errors or localStorage unavailability
    // Return empty array to allow signup flow to continue
    return [];
  }
}

/**
 * Saves all user accounts to localStorage
 * - Called after adding a new account or updating accounts
 * - Converts accounts array to JSON string for storage
 * - Silently fails if storage quota exceeded
 * @param {Array} accounts - Array of account objects to persist
 */
export function setAccounts(accounts) {
  // Convert accounts array to JSON string and store in localStorage
  // Each account should have structure: { username: "...", password: "..." }
  // (password should be hashed, not plaintext)
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accounts));
}

/**
 * Merges notes from guest account to the user account
 * - Appends guest notes to existing user notes
 * - Clears guest notes after successful merge
 * - Called during login/signup
 * @param {string} username - Username of the account to merge notes into
 */
export function mergeGuestNotes(username) {
  if (!username) return;

  const guestKey = storageKeyForUser(null);
  const userKey = storageKeyForUser(username);

  const guestData = localStorage.getItem(guestKey);
  if (!guestData) return;

  try {
    const guestNotes = JSON.parse(guestData);
    if (!Array.isArray(guestNotes) || guestNotes.length === 0) return;

    // Get existing user notes
    const existingData = localStorage.getItem(userKey);
    const userNotes = existingData ? JSON.parse(existingData) : [];

    // Merge notes (you might want to deduplicate by ID here, but reliable unique IDs make simple concat safe enough)
    const combinedNotes = [...userNotes, ...guestNotes];

    // Save merged notes
    localStorage.setItem(userKey, JSON.stringify(combinedNotes));

    // Clear guest notes to prevent re-merging later
    localStorage.removeItem(guestKey);

    console.log(`Merged ${guestNotes.length} guest notes into user ${username}`);
  } catch (err) {
    console.error("Failed to merge guest notes", err);
  }
}

/**
 * Updates a specific field for a user account
 * @param {string} username 
 * @param {Object} updates - Object containing fields to update (e.g. { avatar: "..." })
 */
export function updateAccountDetails(username, updates) {
  const accounts = getAccounts();
  const index = accounts.findIndex(a => a.username.toLowerCase() === username.toLowerCase());

  if (index !== -1) {
    accounts[index] = { ...accounts[index], ...updates };
    setAccounts(accounts);
    return true;
  }
  return false;
}

/**
 * Gets the account object for a username
 * @param {string} username
 * @returns {Object|null}
 */
export function getAccountDetails(username) {
  const accounts = getAccounts();
  return accounts.find(a => a.username.toLowerCase() === username.toLowerCase()) || null;
}


