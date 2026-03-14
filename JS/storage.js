import { NOTES_STORAGE_PREFIX, ACTIVE_USER_KEY, ACCOUNT_KEY } from "./constants.js";
import * as db from "./supabaseStorage.js";
import { supabase } from "./supabaseClient.js";
import { showToast } from "./utilities.js";

// Tracks whether Supabase notes table has is_favorite/is_archived columns.
// null = not checked yet, true = has them, false = missing (needs migration)
let _hasExtendedColumns = null;

export function storageKeyForUser(user) {
  return `${NOTES_STORAGE_PREFIX}.${user || "guest"}`;
}

export async function getNotes(user) {
  let finalNotes = [];

  try {
    // Check for Supabase session
    const session = await supabase.auth.getSession();
    const currentUser = session?.data?.session?.user;

    // 1. Try fetching from Supabase if authenticated
    let cloudNotes = [];
    if (currentUser && user !== 'guest') {
      try {
        console.log("Fetching notes from Supabase...");
        const dbNotes = await db.fetchNotes();
        // Map DB (snake_case) to App (camelCase)
        cloudNotes = dbNotes.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tags: n.tags || [],
          folderId: n.folder_id,
          theme: n.theme,
          editorPattern: n.editor_pattern,
          isFavorite: n.is_favorite || false,
          isArchived: n.is_archived || false,
          createdAt: n.created_at,
          updatedAt: n.updated_at
        }));
      } catch (err) {
        console.error("Supabase fetch failed", err);
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

    // 3. Merge Cloud and Local (Union by ID, preferring Cloud for content if timestamps equal? Or just union)
    // Simple Merge: Map by ID. If same ID exists in both, prefer Cloud (assuming it's synced) 
    // BUT we want to ensure NEW local items (guest merge) are included.
    // If a note exists in Local but NOT Cloud, include it.
    // If a note exists in BOTH, use Cloud (assuming Sync manages conflicts)
    // Actually, if we just merged guest notes, they are in Local. They might not be in Cloud yet.
    // So if Local has a note that Cloud doesn't, we MUST include it.

    const notesMap = new Map();

    // First add Cloud notes
    cloudNotes.forEach(n => notesMap.set(n.id, n));

    // Then add Local notes if they don't exist in map OR if we want to support offline edits
    // For now, let's just add missing local notes to the list
    localNotes.forEach(n => {
      if (!notesMap.has(n.id)) {
        notesMap.set(n.id, n);
      }
      // Optional: Conflict resolution if timestamps differ? 
      // For this specific bug (Guest Merge), the ID (timestamp usually) won't collide with old Cloud notes.
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
 * HYBRID: If authenticated, Syncs to Supabase. Else LocalStorage.
 * Note: 'notes' is the full array. For Supabase, we upsert them all.
 */
export async function setNotes(user, notes) {
  try {
    // 1. Save to LocalStorage first (Offline-First / Cache)
    try {
      localStorage.setItem(storageKeyForUser(user), JSON.stringify(notes));
    } catch (storageErr) {
      if (storageErr.name === 'QuotaExceededError' || storageErr.code === 22) {
        showToast("Storage full — some data may not be saved locally. Consider exporting your notes.", "error", 6000);
      }
    }

    const session = await supabase.auth.getSession();
    const currentUser = session?.data?.session?.user;

    // 2. If authenticated, Sync to Supabase
    if (currentUser && user !== 'guest') {
      const dbNotes = notes.map(n => {
        const row = {
          id: n.id,
          user_id: currentUser.id,
          title: n.title,
          content: n.content,
          tags: n.tags,
          folder_id: n.folderId,
          theme: n.theme,
          editor_pattern: n.editorPattern,
          created_at: n.createdAt,
          updated_at: n.updatedAt
        };
        if (_hasExtendedColumns !== false) {
          row.is_favorite = n.isFavorite || false;
          row.is_archived = n.isArchived || false;
        }
        return row;
      });

      const { error } = await supabase.from('notes').upsert(dbNotes);

      if (error && _hasExtendedColumns === null) {
        const fallbackNotes = dbNotes.map(({ is_favorite, is_archived, ...rest }) => rest);
        const { error: retryError } = await supabase.from('notes').upsert(fallbackNotes);
        if (!retryError) {
          _hasExtendedColumns = false;
        } else {
          showToast("Cloud sync failed — changes saved locally only", "warning");
        }
      } else if (error) {
        showToast("Cloud sync failed — changes saved locally only", "warning");
      } else if (!error && _hasExtendedColumns === null) {
        _hasExtendedColumns = true;
      }
    }
  } catch (err) {
    showToast("Failed to save notes — please try again", "error");
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
