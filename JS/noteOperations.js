import { createNote, persistNotes } from "./noteManager.js";
import { renderActiveNote, renderNotesList } from "./renderer.js";

const $ = (selector) => document.querySelector(selector);

export function readTagsFromUI() {
  const tagsContainer = $("#tags");
  if (!tagsContainer) return [];
  return Array.from(tagsContainer.querySelectorAll(".chip.small")).map((el) => el.textContent.trim());
}

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

export function removeTagFromActiveNote(notes, activeNoteId, tag, activeUser, callbacks) {
  const note = notes.find((n) => n.id === activeNoteId);
  if (!note || !note.tags) return;
  note.tags = note.tags.filter((t) => t !== tag);
  note.updatedAt = new Date().toISOString();
  persistNotes(activeUser, notes);
  callbacks.renderActiveNote();
  callbacks.renderNotesList();
}

export function handleSaveNote(notes, activeNoteId, activeUser, getActiveFilter, callbacks) {
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

export function handleDeleteNote(notes, activeNoteId, activeUser, callbacks) {
  if (!activeNoteId) return;
  if (notes.length === 1) {
    const only = notes[0];
    only.title = "";
    only.content = "";
    only.tags = [];
    only.updatedAt = new Date().toISOString();
    persistNotes(activeUser, notes);
    callbacks.renderActiveNote();
    callbacks.renderNotesList();
    return;
  }
  // Filter out the note to delete
  const filteredNotes = notes.filter((n) => n.id !== activeNoteId);
  // Update the notes array by removing deleted note
  notes.splice(0, notes.length, ...filteredNotes);
  // Set active note to first remaining note
  const nextActiveId = filteredNotes.length > 0 ? filteredNotes[0].id : null;
  persistNotes(activeUser, notes);
  callbacks.setActiveNote(nextActiveId);
}

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