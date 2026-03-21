import { createNote, persistNotes } from "./noteManager.js";
import { renderActiveNote, renderNotesList } from "./renderer.js";
import { deleteNote as deleteNoteFromCloud } from "./supabaseStorage.js";
import { showToast, showConfirm } from "./utilities.js";

const $ = (selector) => document.querySelector(selector);

// Reads and returns all tags currently displayed in the UI
export function readTagsFromUI() {
  const tagsContainer = $("#tags");
  if (!tagsContainer) return [];
  return Array.from(tagsContainer.querySelectorAll(".chip.small")).map((el) => el.textContent.trim());
}

// Adds a new tag to the currently active note if it doesn't already exist
export function addTagToActiveNote(notes, activeNoteId, tag, activeUser) {
  const trimmed = tag.trim();
  if (!trimmed) return;
  const note = notes.find((n) => n.id === activeNoteId);
  if (!note) return;
  note.tags = note.tags || [];
  if (!note.tags.includes(trimmed)) {
    note.tags.push(trimmed);
    note.updatedAt = new Date().toISOString();
    persistNotes(activeUser, notes);
    return true;
  }
  return false;
}

// Removes a specific tag from the currently active note
export function removeTagFromActiveNote(notes, activeNoteId, tag, activeUser, callbacks) {
  const note = notes.find((n) => n.id === activeNoteId);
  if (!note || !note.tags) return;
  note.tags = note.tags.filter((t) => t !== tag);
  note.updatedAt = new Date().toISOString();
  persistNotes(activeUser, notes);
  callbacks.renderActiveNote();
  callbacks.renderNotesList();
}

// Saves the current state of the active note including title, content, and tags
export function handleSaveNote(notes, activeNoteId, activeUser, getActiveFilter, callbacks) {
  // Check if user is logged in
  if (!activeUser) {
    const shouldLogin = confirm("You need to be logged in to save notes. Would you like to log in now?");
    if (shouldLogin) {
      window.location.href = "./HTML/signup.html";
    }
    return;
  }

  const note = notes.find((n) => n.id === activeNoteId);
  if (!note) return;
  const titleInput = $("#title");
  const contentInput = $("#content");
  note.title = titleInput ? titleInput.value.trim() : "";
  note.content = contentInput ? contentInput.innerHTML : "";

  let tagsFromUi = readTagsFromUI();
  const activeFilter = getActiveFilter();
  if ((!tagsFromUi || !tagsFromUi.length) && activeFilter && activeFilter !== "all") {
    tagsFromUi = [activeFilter];
  }
  note.tags = tagsFromUi;

  note.updatedAt = new Date().toISOString();
  persistNotes(activeUser, notes);
  callbacks.renderNotesList();
}

// Toggles the archived status of a note
export function handleArchiveNote(notes, noteId, activeUser, callbacks) {
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;
  note.isArchived = true;
  note.updatedAt = new Date().toISOString();
  persistNotes(activeUser, notes);
  callbacks.renderNotesList();
  if (callbacks.activeNoteId === noteId) {
    callbacks.renderActiveNote();
  }
}

export function handleUnarchiveNote(notes, noteId, activeUser, callbacks) {
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;
  note.isArchived = false;
  note.updatedAt = new Date().toISOString();
  persistNotes(activeUser, notes);
  callbacks.renderNotesList();
  if (callbacks.activeNoteId === noteId) {
    callbacks.renderActiveNote();
  }
}

// Creates a new note with optional initial tags and folder assignment
export function handleNewNote(notes, activeUser, getActiveFilter, getSelectedDate, callbacks, activeFolderId) {
  const activeFilter = getActiveFilter();
  const initialTags = activeFilter && activeFilter !== "all" ? [activeFilter] : [];
  const selectedDate = getSelectedDate();
  const nowIso = new Date().toISOString();
  const createdIso = selectedDate ? `${selectedDate}T00:00:00.000Z` : nowIso;
  const newNote = createNote({
    tags: initialTags,
    createdAt: createdIso,
    updatedAt: createdIso,
    folderId: activeFolderId // Assign to current folder
  });
  notes.unshift(newNote);
  persistNotes(activeUser, notes);
  callbacks.setActiveNote(newNote.id);
}

// Handles deletion of any note with a professional confirmation dialog.
export async function handleDeleteNote(notes, noteId, activeUser, callbacks) {
  if (!noteId) return;

  const noteToDelete = notes.find(n => n.id === noteId);
  const noteTitle = noteToDelete?.title || "Untitled note";

  // Use the professional confirm dialog from utilities.js
  const confirmed = await showConfirm(
    "Delete Note",
    `Are you sure you want to permanently delete "${noteTitle}"? This action cannot be undone.`,
    "Delete Note"
  );
  if (!confirmed) return;

  try {
    // Check if we are deleting the note currently open in the editor
    const currentActiveId = (typeof callbacks.getActiveNoteId === 'function') ? callbacks.getActiveNoteId() : null;
    const wasActive = currentActiveId === noteId;

    // Filter out the note
    const filteredNotes = notes.filter((n) => n.id !== noteId);
    
    // Attempt cloud deletion but don't let it block local UI if it fails
    if (activeUser) {
      deleteNoteFromCloud(noteId).catch(err => {
        console.error("Cloud deletion failed", err);
      });
    }

    // Update notes array
    notes.splice(0, notes.length, ...filteredNotes);

    // Persist changes locally
    await persistNotes(activeUser, notes);

    if (wasActive) {
      // If we deleted the ACTIVE note, navigate away
      const nextActiveId = filteredNotes.length > 0 ? filteredNotes[0].id : null;
      callbacks.setActiveNote(nextActiveId);
    } else {
      // If we deleted a card from the grid, just refresh the dashboard
      callbacks.renderNotesList();
      callbacks.renderNotesDashboard();
    }

    showToast(`"${noteTitle}" deleted`, "success");
  } catch (error) {
    console.error("Deletion failed", error);
    showToast("Failed to delete note", "error");
  }
}

// Creates a copy of the active note with a new ID and current timestamp
export function handleDuplicateNote(notes, activeNoteId, activeUser, callbacks) {
  const note = notes.find((n) => n.id === activeNoteId);
  if (!note) return;
  const copy = createNote({
    title: note.title ? `${note.title} (Copy)` : "Untitled note (Copy)",
    content: note.content,
    tags: [...(note.tags || [])],
  });
  notes.unshift(copy);
  persistNotes(activeUser, notes);
  callbacks.setActiveNote(copy.id);
}

// Toggles the favorite status of the active note
export function handleToggleFavorite(notes, activeNoteId, activeUser, callbacks) {
  const note = notes.find((n) => n.id === activeNoteId);
  if (!note) return;
  note.isFavorite = !note.isFavorite; // Toggle
  note.updatedAt = new Date().toISOString();

  persistNotes(activeUser, notes);
  callbacks.renderActiveNote();
  callbacks.renderNotesList();
}