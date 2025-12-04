// Folder Storage Keys
const FOLDERS_STORAGE_KEY = "notesWorkspace.folders";

/**
 * Get all folders for current user
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
 * Save folders to localStorage
 * @param {string} activeUser - Current user
 * @param {Array} folders - Array of folder objects
 */
export function saveFolders(activeUser, folders) {
  try {
    const key = `${FOLDERS_STORAGE_KEY}.${activeUser || "guest"}`;
    localStorage.setItem(key, JSON.stringify(folders));
  } catch (err) {
    console.error("Failed to save folders", err);
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
 * Get notes in a specific folder
 * @param {Array} notes - All notes
 * @param {string} folderId - Folder ID (null for root)
 * @returns {Array} Notes in that folder
 */
export function getNotesByFolder(notes, folderId) {
  return notes.filter((note) => note.folderId === folderId);
}