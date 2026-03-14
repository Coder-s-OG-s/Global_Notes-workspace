import { supabase } from "./supabaseClient.js";
import { saveFolder as saveFolderToCloud, fetchFolders as fetchCloudFolders, deleteFolder as deleteFolderFromCloud } from "./supabaseStorage.js";
import { showToast } from "./utilities.js";

// Folder Storage Keys
const FOLDERS_STORAGE_KEY = "notesWorkspace.folders";

/**
 * Get all folders for current user (from localStorage)
 * @param {string} activeUser - Current user
 * @returns {Array} Array of folder objects
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
 * Save folders to localStorage and sync to Supabase
 * @param {string} activeUser - Current user
 * @param {Array} folders - Array of folder objects
 */
export function saveFolders(activeUser, folders) {
  try {
    const key = `${FOLDERS_STORAGE_KEY}.${activeUser || "guest"}`;
    localStorage.setItem(key, JSON.stringify(folders));

    // Sync each folder to Supabase
    if (activeUser && activeUser !== 'guest') {
      folders.forEach(folder => {
        saveFolderToCloud({
          id: folder.id,
          name: folder.name,
          created_at: folder.createdAt
        }).catch(() => {
          showToast("Folder sync failed — saved locally only", "warning");
        });
      });
    }
  } catch (err) {
    showToast("Failed to save folders", "error");
  }
}

/**
 * Create new folder
 * @param {string} activeUser - Current user
 * @param {string} folderName - Name of the folder
 * @returns {Object} Created folder object
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
 * Delete folder and move its notes to root
 * @param {string} activeUser - Current user
 * @param {string} folderId - ID of folder to delete
 * @param {Array} notes - All notes array
 */
export function deleteFolder(activeUser, folderId, notes) {
  const folders = getFolders(activeUser);
  // Remove folder
  const updatedFolders = folders.filter((f) => f.id !== folderId);
  saveFolders(activeUser, updatedFolders);

  // Delete from Supabase
  if (activeUser && activeUser !== 'guest') {
    deleteFolderFromCloud(folderId).catch(() => {
      showToast("Folder deleted locally but cloud sync failed", "warning");
    });
  }

  // Move notes from this folder to root (folderId = null)
  notes.forEach((note) => {
    if (note.folderId === folderId) {
      note.folderId = null;
    }
  });
}

/**
 * Rename folder
 * @param {string} activeUser - Current user
 * @param {string} folderId - ID of folder to rename
 * @param {string} newName - New folder name
 */
export function renameFolder(activeUser, folderId, newName) {
  const folders = getFolders(activeUser);
  const folder = folders.find((f) => f.id === folderId);
  if (folder) {
    folder.name = newName;
    saveFolders(activeUser, folders);
  }
}

/**
 * Fetches folders from Supabase and merges with local.
 * Called once on app load to sync cloud folders into localStorage.
 * @param {string} activeUser - Current user
 * @returns {Array} Merged folders array
 */
export async function syncFoldersFromCloud(activeUser) {
  if (!activeUser || activeUser === 'guest') return getFolders(activeUser);

  try {
    const session = await supabase.auth.getSession();
    if (!session?.data?.session?.user) return getFolders(activeUser);

    const cloudFolders = await fetchCloudFolders();
    const localFolders = getFolders(activeUser);

    // Merge: cloud takes precedence by ID, local-only folders preserved
    const foldersMap = new Map();
    cloudFolders.forEach(f => foldersMap.set(f.id, {
      id: f.id,
      name: f.name,
      createdAt: f.created_at
    }));
    localFolders.forEach(f => {
      if (!foldersMap.has(f.id)) {
        foldersMap.set(f.id, f);
      }
    });

    const merged = Array.from(foldersMap.values());

    // Update localStorage with merged result
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
 * @param {Array} notes - All notes
 * @param {string} folderId - Folder ID (null for root)
 * @returns {Array} Notes in that folder
 */
export function getNotesByFolder(notes, folderId) {
  return notes.filter((note) => note.folderId === folderId);
}
