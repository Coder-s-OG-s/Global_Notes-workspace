import { NOTES_STORAGE_PREFIX, ACTIVE_USER_KEY } from "./constants.js";
import { showToast, getApiUrl } from "./utilities.js";

export { getApiUrl };

export function storageKeyForUser(user) {
  return `${NOTES_STORAGE_PREFIX}.${user || "guest"}`;
}

/**
 * Purges all cached notes, folders, and tags from LocalStorage.
 * Ensures data is never persisted locally for logged-out or logged-in users.
 */
export function purgeAllLocalStorageData() {
  try {
    if (typeof localStorage === 'undefined') return;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        key !== ACTIVE_USER_KEY &&
        key !== "activeUser" &&
        key !== "notesWorkspace.theme" &&
        key !== "codeWorkspace.theme" &&
        (key.startsWith(NOTES_STORAGE_PREFIX) ||
         key.startsWith("notesWorkspace.notes") ||
         key.includes("folders") ||
         key.includes("notes") ||
         key.includes("tags"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.warn("Purge localStorage data error:", e);
  }
}

export function getAuthHeaders(extraHeaders = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem("authToken") : null;
  return {
    ...extraHeaders,
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

/**
 * GET NOTES
 * Database-only storage: Fetches exclusively from MongoDB Atlas when authenticated.
 * Returns empty array and clears storage when unauthenticated / guest.
 */
export async function getNotes(username) {
  // Purge any local storage data unconditionally
  purgeAllLocalStorageData();

  if (!username || username === "guest") {
    return [];
  }

  try {
    console.log("Fetching notes directly from Database (MongoDB Atlas)...");
    const response = await fetch(getApiUrl("/api/notes"), { 
      credentials: "include",
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const cloudNotes = await response.json();
      const mappedNotes = cloudNotes.map((n) => ({
        ...n,
        id: n.id || n._id,
      }));
      mappedNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return mappedNotes;
    }
  } catch (err) {
    console.error("Database notes fetch failed:", err);
  }

  return [];
}

/**
 * SET NOTES
 * Database-only contract: No notes are stored in LocalStorage.
 */
export async function setNotes(username, notes) {
  purgeAllLocalStorageData();
  if (!username || username === "guest") {
    return;
  }
}

/**
 * SAVE SINGLE NOTE
 * Syncs the specific modified note directly to MongoDB database.
 * No note payload is saved to LocalStorage.
 */
export async function saveSingleNote(username, note) {
  purgeAllLocalStorageData();
  if (!note || !username || username === "guest") return;

  try {
    const method = note._id ? "PUT" : "POST";
    const path = note._id ? `/api/notes/${note._id}` : "/api/notes";

    const res = await fetch(getApiUrl(path), {
      method,
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify(note),
    });

    if (res.ok) {
      const serverNote = await res.json();
      if (serverNote._id) {
        note._id = serverNote._id;
        note.id = serverNote._id;
      }
    }
  } catch (err) {
    console.error("Database sync error for single note:", err);
    showToast("Database sync error", "warning");
  }
}

export function getActiveUser() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(ACTIVE_USER_KEY) || localStorage.getItem("activeUser") || null;
}

export function setActiveUser(username) {
  if (!username) return;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ACTIVE_USER_KEY, username);
    localStorage.setItem("activeUser", username);
  }
}

export function clearActiveUser() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem("activeUser");
    localStorage.removeItem("authToken");
  }
  purgeAllLocalStorageData();
}

export async function deleteNote(username, noteId) {
  purgeAllLocalStorageData();
  if (!username || username === "guest" || !noteId) return;

  try {
    const targetId = String(noteId);
    if (targetId.length > 5) {
      await fetch(getApiUrl(`/api/notes/${targetId}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
    }
  } catch (err) {
    console.error("Database deletion failed:", err);
  }
}

export function mergeGuestNotes(username) {
  purgeAllLocalStorageData();
  return false;
}

/**
 * AI Memory Preference Helpers (Explicit Opt-In Only)
 * Stores ONLY a short user preference string (e.g. "writing style"), NEVER raw note dumps.
 */
export function getAIMemoryEnabled() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem("gnw_ai_memory_enabled") === "true";
}

export function setAIMemoryEnabled(enabled) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem("gnw_ai_memory_enabled", enabled ? "true" : "false");
}

export function getAIMemoryPrompt() {
  if (typeof localStorage === 'undefined' || !getAIMemoryEnabled()) return "";
  return localStorage.getItem("gnw_ai_memory_text") || "";
}

export function setAIMemoryPrompt(text) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem("gnw_ai_memory_text", (text || "").trim().substring(0, 500));
}
