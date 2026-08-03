import { NOTES_STORAGE_PREFIX, ACTIVE_USER_KEY } from "./constants.js";
import { showToast } from "./utilities.js";

export function storageKeyForUser(user) {
  return `${NOTES_STORAGE_PREFIX}.${user || "guest"}`;
}

/**
 * GET NOTES
 * HYBRID: Fetches from MongoDB if authenticated, merges with LocalStorage.
 */
export async function getNotes(username) {
  let cloudNotes = [];
  let localNotes = [];

  try {
    // 1. Try fetching from MongoDB API if not guest
    if (username && username !== 'guest') {
      try {
        console.log("Fetching notes from MongoDB Atlas...");
        const response = await fetch('/api/notes');
        if (response.ok) {
          cloudNotes = await response.json();
        }
      } catch (err) {
        console.error("MongoDB fetch failed", err);
      }
    }

    // 2. Fetch from LocalStorage
    const raw = localStorage.getItem(storageKeyForUser(username));
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

    // 3. Smart Merge Logic (Cloud wins, but we map IDs to prevent duplicates)
    const notesMap = new Map();
    
    // Add cloud notes first
    cloudNotes.forEach(n => {
      // Each note from server has an _id. 
      // We also look at its 'id' field (if we stored our client UUID there)
      const key = n.id || n._id;
      notesMap.set(key, { ...n, id: key });
    });

    // Add local notes only if they aren't already represented by a cloud note
    localNotes.forEach(n => {
      if (!notesMap.has(n.id) && !notesMap.has(n._id)) {
        notesMap.set(n.id, n);
      }
    });

    const finalNotes = Array.from(notesMap.values());
    finalNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Update LocalStorage to keep them in sync
    localStorage.setItem(storageKeyForUser(username), JSON.stringify(finalNotes));

    return finalNotes;

  } catch (e) {
    console.error("Error getting notes:", e);
    return [];
  }
}

/**
 * SET NOTES
 * Saves to LocalStorage immediately.
 */
export async function setNotes(username, notes) {
  try {
    localStorage.setItem(storageKeyForUser(username), JSON.stringify(notes));
  } catch (err) {
    showToast("Failed to save notes locally", "warning");
  }
}

/**
 * SAVE SINGLE NOTE
 * Syncs ONLY the specific modified note to cloud storage & local storage.
 * Prevents mass network requests, data leakage, and bandwidth flooding.
 */
export async function saveSingleNote(username, note) {
  if (!note) return;
  try {
    const userKey = storageKeyForUser(username);
    const localData = localStorage.getItem(userKey);
    let notes = localData ? JSON.parse(localData) : [];

    const idx = notes.findIndex((n) => n.id === note.id || (note._id && n._id === note._id));
    if (idx !== -1) {
      notes[idx] = { ...notes[idx], ...note };
    } else {
      notes.unshift(note);
    }
    localStorage.setItem(userKey, JSON.stringify(notes));

    // Sync ONLY this single note to MongoDB if authenticated
    if (username && username !== "guest") {
      const method = note._id ? "PUT" : "POST";
      const url = note._id ? `/api/notes/${note._id}` : "/api/notes";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });

      if (res.ok) {
        const serverNote = await res.json();
        if (serverNote._id && !note._id) {
          note._id = serverNote._id;
          if (idx !== -1) notes[idx]._id = serverNote._id;
          localStorage.setItem(userKey, JSON.stringify(notes));
        }
      }
    }
  } catch (err) {
    console.error("Cloud sync error for single note:", err);
  }
}

export function getActiveUser() {
  return localStorage.getItem(ACTIVE_USER_KEY) || null;
}

export function setActiveUser(username) {
  if (!username) return;
  localStorage.setItem(ACTIVE_USER_KEY, username);
}

export function clearActiveUser() {
  localStorage.removeItem(ACTIVE_USER_KEY);
}

export async function deleteNote(username, noteId) {
  if (!username || username === 'guest' || !noteId) return;
  
  try {
    if (String(noteId).length > 20) {
      await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      });
    }
  } catch (err) {
    console.error("Cloud deletion failed", err);
  }
}

export function mergeGuestNotes(username) {
  if (!username) return;
  const guestKey = storageKeyForUser(null);
  const userKey = storageKeyForUser(username);
  const guestData = localStorage.getItem(guestKey);
  if (!guestData) return;

  try {
    const guestNotes = JSON.parse(guestData);
    if (!Array.isArray(guestNotes) || guestNotes.length === 0) return;
    const existingData = localStorage.getItem(userKey);
    const userNotes = existingData ? JSON.parse(existingData) : [];
    const combinedNotes = [...userNotes, ...guestNotes];
    localStorage.setItem(userKey, JSON.stringify(combinedNotes));
    localStorage.removeItem(guestKey);
    return true;
  } catch (err) {
    return false;
  }
}
