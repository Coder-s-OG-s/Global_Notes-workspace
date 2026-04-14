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
 * HYBRID: Saves to LocalStorage immediately, then syncs to MongoDB.
 */
export async function setNotes(username, notes) {
  try {
    // 1. Save to LocalStorage first (Offline-First)
    localStorage.setItem(storageKeyForUser(username), JSON.stringify(notes));

    // 2. If authenticated, Sync to MongoDB
    if (username && username !== 'guest') {
      const syncPromises = notes.map(async (note) => {
        // If the note has a MongoDB _id, it's an update (PUT)
        const method = note._id ? 'PUT' : 'POST';
        const url = note._id ? `/api/notes/${note._id}` : '/api/notes';
        
        return fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note)
        });
      });
      
      const results = await Promise.allSettled(syncPromises);
      
      // Update local storage with the _ids returned by the server for new notes
      let storageUpdated = false;
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status === 'fulfilled' && res.value.ok) {
          const serverNote = await res.value.json();
          if (serverNote._id && !notes[i]._id) {
            notes[i]._id = serverNote._id;
            storageUpdated = true;
          }
        }
      }

      if (storageUpdated) {
        localStorage.setItem(storageKeyForUser(username), JSON.stringify(notes));
      }
    }
  } catch (err) {
    showToast("Failed to sync with cloud", "warning");
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
