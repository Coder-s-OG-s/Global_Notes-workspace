import { NOTES_STORAGE_PREFIX, ACTIVE_USER_KEY, ACCOUNT_KEY } from "./constants.js";
import * as db from "./appwriteStorage.js";
import { account, databases, ID } from "./appwriteClient.js";
import { showToast } from "./utilities.js";
import config from "./config.js";

// Tracks whether Appwrite database is initialized with current schema
let _hasExtendedColumns = true; 

export function storageKeyForUser(user) {
  return `${NOTES_STORAGE_PREFIX}.${user || "guest"}`;
}

export async function getNotes(user) {
  let finalNotes = [];

  try {
    // Check for Appwrite session
    let currentUser = null;
    try {
      currentUser = await account.get();
    } catch (e) {
      currentUser = null;
    }

    // 1. Try fetching from Appwrite if authenticated
    let cloudNotes = [];
    if (currentUser && user !== 'guest') {
      try {
        console.log("Fetching notes from Appwrite...");
        const dbNotes = await db.fetchNotes();
        // Map DB (snake_case) to App (camelCase)
        cloudNotes = dbNotes.map(n => ({
          id: n.$id || n.id,
          title: n.title,
          content: n.content,
          tags: typeof n.tags === 'string' ? JSON.parse(n.tags || '[]') : (n.tags || []),
          folderId: n.folder_id,
          theme: n.theme,
          editorPattern: n.editor_pattern,
          isFavorite: n.is_favorite || false,
          isArchived: n.is_archived || false,
          createdAt: n.$createdAt || n.created_at,
          updatedAt: n.$updatedAt || n.updated_at
        }));
      } catch (err) {
        console.error("Appwrite fetch failed", err);
      }
    }

    // 2. Fetch from LocalStorage
    let localNotes = [];
    const raw = localStorage.getItem(storageKeyForUser(user));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localNotes = parsed;
        }
      } catch (e) {
        console.error("Error parsing local notes", e);
      }
    }

    const notesMap = new Map();

    // First add Cloud notes
    cloudNotes.forEach(n => notesMap.set(n.id, n));

    // Then add Local notes if they don't exist in map
    localNotes.forEach(n => {
      if (!notesMap.has(n.id)) {
        notesMap.set(n.id, n);
      }
    });

    finalNotes = Array.from(notesMap.values());

    // Sort by updated descending
    finalNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  } catch (e) {
    console.error("Error getting notes:", e);
  }

  return finalNotes;
}

/**
 * Saves notes.
 * HYBRID: If authenticated, Syncs to Appwrite. Else LocalStorage.
 */
export async function setNotes(user, notes) {
  try {
    // 1. Save to LocalStorage first (Offline-First / Cache)
    try {
      localStorage.setItem(storageKeyForUser(user), JSON.stringify(notes));
    } catch (storageErr) {
      if (storageErr.name === 'QuotaExceededError' || storageErr.code === 22) {
        showToast("Storage full — some data may not be saved locally.", "error", 6000);
      }
    }

    let currentUser = null;
    try {
      currentUser = await account.get();
    } catch (e) {
      currentUser = null;
    }

    // 2. If authenticated, Sync to Appwrite
    if (currentUser && user !== 'guest') {
      const dbNotes = notes.map(n => {
        const row = {
          id: n.id || ID.unique(),
          user_id: currentUser.$id,
          title: n.title,
          content: n.content,
          tags: JSON.stringify(n.tags || []),
          folder_id: n.folderId,
          theme: n.theme,
          editor_pattern: n.editorPattern,
          created_at: n.createdAt,
          updated_at: n.updatedAt,
          is_favorite: n.isFavorite || false,
          is_archived: n.isArchived || false
        };
        return row;
      });

      // Appwrite doesn't have a single-call batch upsert for 100+ documents easily,
      // But we can iterate or use a cloud function. For simplicity, we save individual notes if small.
      // However, the original code used a single upsert. We will use a loop for now or promise.all
      const savePromises = dbNotes.map(row => db.saveNote(row));
      await Promise.allSettled(savePromises);
    }
  } catch (err) {
    showToast("Failed to sync notes — changes saved locally only", "warning");
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
    return true;
  } catch (err) {
    console.error("Failed to merge guest notes", err);
    return false;
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
    
    // Sync to Appwrite if authenticated
    account.get().then(user => {
        // Appwrite supports preferences which is easier for simple profile data
        account.updatePrefs(updates).catch(console.error);
    }).catch(() => {});

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



/**
 * Retrieves custom tags for a specific user
 * @param {string|null} user 
 * @returns {Array} Array of custom tag objects {name, color, description}
 */
export function getCustomTags(user) {
  try {
    const key = `${storageKeyForUser(user)}.tags`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves custom tags for a specific user
 * @param {string|null} user 
 * @param {Array} tags 
 */
export function saveCustomTags(user, tags) {
  try {
    const key = `${storageKeyForUser(user)}.tags`;
    localStorage.setItem(key, JSON.stringify(tags));
  } catch (err) {
    console.error("Failed to save custom tags", err);
  }
}
