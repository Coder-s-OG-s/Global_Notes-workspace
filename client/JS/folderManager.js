/**
 * folderManager.js
 * Refactored to use the local Express backend with MongoDB Atlas
 */

import { showToast } from "./utilities.js";

// Folder Storage Keys
const FOLDERS_STORAGE_KEY = "notesWorkspace.folders";

/**
 * Get all folders for current user (from localStorage)
 */
export function getFolders(activeUser) {
  try {
    const key = `${FOLDERS_STORAGE_KEY}.${activeUser || "guest"}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save folders to localStorage and sync to MongoDB
 */
export async function saveFolders(activeUser, folders) {
  try {
    const key = `${FOLDERS_STORAGE_KEY}.${activeUser || "guest"}`;
    localStorage.setItem(key, JSON.stringify(folders));

    // Sync each folder to MongoDB
    if (activeUser && activeUser !== 'guest') {
      const syncPromises = folders.map(async (folder) => {
        const method = folder._id ? 'PUT' : 'POST';
        const url = folder._id ? `/api/folders/${folder._id}` : '/api/folders';
        
        return fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(folder)
        });
      });
      
      const responses = await Promise.allSettled(syncPromises);
      
      // Update local folders if the server returned a new _id
      let storageUpdated = false;
      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        if (res.status === 'fulfilled' && res.value.ok) {
          const serverFolder = await res.value.json();
          if (serverFolder._id && folders[i] && !folders[i]._id) {
            folders[i]._id = serverFolder._id;
            storageUpdated = true;
          }
        }
      }
      if (storageUpdated) {
        localStorage.setItem(key, JSON.stringify(folders));
      }
    }
  } catch (err) {
    showToast("Failed to sync folders", "warning");
  }
}

/**
 * Create new folder
 */
export function createNewFolder(activeUser, folderName) {
  const folders = getFolders(activeUser);
  const newFolder = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name: folderName || "New Folder",
    createdAt: new Date().toISOString(),
  };
  folders.push(newFolder);
  saveFolders(activeUser, folders);
  return newFolder;
}

/**
 * Delete folder
 */
export function deleteFolder(activeUser, folderId, notes) {
  const folders = getFolders(activeUser);
  const updatedFolders = folders.filter((f) => f.id !== folderId && f._id !== folderId);
  saveFolders(activeUser, updatedFolders);

  // Delete from MongoDB
  if (activeUser && activeUser !== 'guest') {
    fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
      .catch(() => showToast("Cloud folder deletion failed", "warning"));
  }

  // Move notes to root
  notes.forEach((note) => {
    if (note.folderId === folderId) {
      note.folderId = null;
    }
  });
}

/**
 * Rename folder
 */
export function renameFolder(activeUser, folderId, newName) {
  const folders = getFolders(activeUser);
  const folder = folders.find((f) => f.id === folderId || f._id === folderId);
  if (folder) {
    folder.name = newName;
    saveFolders(activeUser, folders);
  }
}

/**
 * Fetches folders from MongoDB and merges with local
 */
export async function syncFoldersFromCloud(activeUser) {
  if (!activeUser || activeUser === 'guest') return getFolders(activeUser);

  try {
    const response = await fetch('/api/folders');
    if (!response.ok) return getFolders(activeUser);

    const cloudFolders = await response.json();
    const localFolders = getFolders(activeUser);

    const foldersMap = new Map();
    cloudFolders.forEach(f => {
      const key = f.id || f._id;
      foldersMap.set(key, { ...f, id: key });
    });
    
    localFolders.forEach(f => {
      // 1. Try to find by ID/ObjectId
      const matchById = foldersMap.get(f.id) || foldersMap.get(f._id);
      
      // 2. Try to find by Name (Migration helper to prevent duplicates)
      const matchByName = Array.from(foldersMap.values()).find(cf => cf.name === f.name);

      if (!matchById && !matchByName) {
        foldersMap.set(f.id, f);
      } else if (matchByName && !matchById) {
        // If we found a name match, update the cloud folder's local ID to our UUID
        // so they stay linked in the future
        const key = f.id || f._id;
        foldersMap.set(key, { ...matchByName, id: key });
      }
    });

    const merged = Array.from(foldersMap.values());
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const key = `${FOLDERS_STORAGE_KEY}.${activeUser}`;
    localStorage.setItem(key, JSON.stringify(merged));

    return merged;
  } catch (err) {
    console.error("Failed to sync folders from cloud:", err);
    return getFolders(activeUser);
  }
}

/**
 * Get notes in a specific folder
 */
export function getNotesByFolder(notes, folderId) {
  return notes.filter((note) => note.folderId === folderId);
}
