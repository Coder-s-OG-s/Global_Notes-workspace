import { setNotes, getNotes as getStoredNotes } from "./storage.js";

// Creates a new note object with default values and a unique ID
export function createNote(partial = {}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    title: partial.title || "",
    content: partial.content || "",
    tags: Array.isArray(partial.tags) ? partial.tags : [],
    folderId: partial.folderId || null, // Add folder association
    theme: partial.theme || "classic-blue", // Default theme
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
  };
}//check this

// Creates a new folder object with a unique ID and current timestamp
export function createFolder(name) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name: name || "New Folder",
    createdAt: new Date().toISOString(),
  };
}

// Saves the notes array to storage for the specified user
export function persistNotes(activeUser, notes) {
  setNotes(activeUser, notes);
}

// Ensures there's at least one note by creating a welcome note if none exist
export async function ensureAtLeastOneNote(notes, activeUser) {
  if (!notes.length) {
    // Create welcome note as default
    const initial = createNote({
      title: "Welcome to Notes Workspace",
      content:
        "This is your first note. Use the sidebar to switch notes, add tags above, and search from the top bar.\n\nYour notes are saved locally in this browser.",
      tags: ["ideas"],
    });
    notes.push(initial);
    persistNotes(activeUser, notes);
  }
  return notes;
}

// Retrieves all notes for the currently active user
export function loadNotesForCurrentUser(activeUser) {
  return getStoredNotes(activeUser);
}