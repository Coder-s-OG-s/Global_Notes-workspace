import { setNotes, getNotes as getStoredNotes } from "./storage.js";

export function createNote(partial = {}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    title: partial.title || "",
    content: partial.content || "",
    tags: Array.isArray(partial.tags) ? partial.tags : [],
    folderId: partial.folderId || null, // Add folder association
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
  };
}

export function createFolder(name) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    name: name || "New Folder",
    createdAt: new Date().toISOString(),
  };
}

export function persistNotes(activeUser, notes) {
  setNotes(activeUser, notes);
}

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

export function loadNotesForCurrentUser(activeUser) {
  return getStoredNotes(activeUser);
}