/**
 * folderManager.js
 * Database-only storage: Manages folders exclusively via MongoDB Atlas backend.
 * Removes LocalStorage folder persistence.
 */

import { showToast, getApiUrl } from "./utilities.js";
import { getAuthHeaders } from "./storage.js";

// In-memory runtime folder cache per session
let inMemoryFolders = [];

/**
 * Get all folders for current user (from Database)
 */
export function getFolders(activeUser) {
  if (!activeUser || activeUser === "guest") {
    inMemoryFolders = [];
    return [];
  }
  return inMemoryFolders;
}

/**
 * Save / sync folders to MongoDB Database
 */
export async function saveFolders(activeUser, folders) {
  if (!activeUser || activeUser === "guest") {
    inMemoryFolders = [];
    return;
  }

  inMemoryFolders = folders || [];

  try {
    const syncPromises = inMemoryFolders.map(async (folder) => {
      const method = folder._id ? "PUT" : "POST";
      const path = folder._id ? `/api/folders/${folder._id}` : "/api/folders";

      return fetch(getApiUrl(path), {
        method,
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(folder),
      });
    });

    const responses = await Promise.allSettled(syncPromises);

    for (let i = 0; i < responses.length; i++) {
      const res = responses[i];
      if (res.status === "fulfilled" && res.value.ok) {
        const serverFolder = await res.value.json();
        if (serverFolder._id && inMemoryFolders[i]) {
          inMemoryFolders[i]._id = serverFolder._id;
          inMemoryFolders[i].id = serverFolder._id;
        }
      }
    }
  } catch (err) {
    showToast("Failed to sync folders to database", "warning");
  }
}

/**
 * Create new folder directly in Database
 */
export async function createNewFolder(activeUser, folderName, folderColor = "blue") {
  if (!activeUser || activeUser === "guest") {
    showToast("Please sign in to create folders", "warning");
    return null;
  }

  const newFolder = {
    name: folderName || "New Folder",
    color: folderColor || "blue",
    createdAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(getApiUrl("/api/folders"), {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify(newFolder),
    });

    if (res.ok) {
      const created = await res.json();
      const folderObj = {
        ...created,
        id: created._id || created.id,
      };
      inMemoryFolders.push(folderObj);
      return folderObj;
    }
  } catch (err) {
    console.error("Failed to create folder in database:", err);
  }

  return null;
}

/**
 * Delete folder directly from Database
 */
export async function deleteFolder(activeUser, folderId, notes = []) {
  if (!activeUser || activeUser === "guest" || !folderId) return;

  inMemoryFolders = inMemoryFolders.filter(
    (f) => f.id !== folderId && f._id !== folderId
  );

  try {
    await fetch(getApiUrl(`/api/folders/${folderId}`), {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include"
    });
  } catch (err) {
    showToast("Cloud folder deletion failed", "warning");
  }

  if (Array.isArray(notes)) {
    notes.forEach((note) => {
      if (note.folderId === folderId) {
        note.folderId = null;
      }
    });
  }
}

/**
 * Rename or update folder properties directly in Database
 */
export async function renameFolder(activeUser, folderId, newName, newColor) {
  if (!activeUser || activeUser === "guest") return;

  const folder = inMemoryFolders.find((f) => f.id === folderId || f._id === folderId);
  if (folder) {
    if (newName !== undefined && newName !== null) folder.name = newName;
    if (newColor !== undefined && newColor !== null) folder.color = newColor;
    await saveFolders(activeUser, inMemoryFolders);
  }
}

/**
 * Update color of an existing folder
 */
export async function updateFolderColor(activeUser, folderId, newColor, currentFolders = null) {
  if (!activeUser || activeUser === "guest") return;

  const folders = currentFolders || inMemoryFolders;
  const folder = folders.find((f) => f.id === folderId || f._id === folderId);
  if (folder) {
    folder.color = newColor || "blue";
    await saveFolders(activeUser, folders);
  }
}

/**
 * Fetches folders directly from MongoDB database
 */
export async function syncFoldersFromCloud(activeUser) {
  if (!activeUser || activeUser === "guest") {
    inMemoryFolders = [];
    return [];
  }

  try {
    const response = await fetch(getApiUrl("/api/folders"), {
      credentials: "include",
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      return inMemoryFolders;
    }

    const cloudFolders = await response.json();
    inMemoryFolders = cloudFolders.map((f) => ({
      ...f,
      id: f.id || f._id,
    }));
    inMemoryFolders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return inMemoryFolders;
  } catch (err) {
    console.error("Failed to sync folders from database:", err);
    return inMemoryFolders;
  }
}

/**
 * Get notes in a specific folder
 */
export function getNotesByFolder(notes, folderId) {
  if (!Array.isArray(notes)) return [];
  return notes.filter((note) => note.folderId === folderId);
}
