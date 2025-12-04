
import { getActiveUser } from "./storage.js";
import { loadNotesForCurrentUser, ensureAtLeastOneNote, persistNotes } from "./noteManager.js";
import { getFolders, saveFolders } from "./folderManager.js";
import { renderNotesList, renderActiveNote, updateUserDisplay, renderFolders } from "./renderer.js";
import { wireFiltersAndSearch, wireSort, wireTagInput, wireCrudButtons, wireFolderButtons } from "./eventHandlers.js";
import { wireFormattingToolbar } from "./formattingToolbar.js";
import { wireUploadButtons } from "./mediaManager.js";
import { wireAuthButtons } from "./authButtons.js";
import { wireImportExport } from "./exportImport.js";
import { wireThemeToggle } from "./themeManager.js";
import { getActiveFilter, getSelectedDate } from "./filterSearchSort.js";


// Global state
const state = {
  notes: [],
  activeNoteId: null,
  activeUser: null,
  folders: [],
  activeFolderId: null, // null means "All Notes"
};

function setActiveNote(noteId) {
  state.activeNoteId = noteId;
  const note = state.notes.find((n) => n.id === noteId);
  callbacks.renderNotesList();
  callbacks.renderActiveNote();
}

const callbacks = {
  setActiveNote,
  setActiveFolder: (folderId) => {
    state.activeFolderId = folderId;
    callbacks.renderFolders();
    callbacks.renderNotesList();
  },
  renderNotesList: () => renderNotesList(state.notes, state.activeNoteId, setActiveNote, state.activeFolderId),
  renderActiveNote: () => renderActiveNote(state.notes.find((n) => n.id === state.activeNoteId), () => { }),
  renderFolders: () => renderFolders(state.folders, state.activeFolderId, callbacks.setActiveFolder),
  updateUserDisplay: () => updateUserDisplay(state.activeUser),
  persistNotes: () => persistNotes(state.activeUser, state.notes),
  loadNotesForCurrentUser: async () => {
    state.notes = loadNotesForCurrentUser(state.activeUser);
    state.folders = getFolders(state.activeUser);
    await ensureAtLeastOneNote(state.notes, state.activeUser);
    if (!state.activeNoteId && state.notes.length) {
      state.activeNoteId = state.notes[0].id;
    }
  },
};

async function initApp() {
  // Load user session
  state.activeUser = getActiveUser();

  // Load notes for current user
  await callbacks.loadNotesForCurrentUser();

  // Set initial active note
  if (state.notes.length && !state.activeNoteId) {
    state.activeNoteId = state.notes[0].id;
  }

  // Wire up all event handlers
  wireFiltersAndSearch(callbacks);
  wireSort(callbacks);
  wireTagInput(state, callbacks);
  wireCrudButtons(state, getActiveFilter, callbacks);
  wireFolderButtons(state, callbacks);
  wireFormattingToolbar();
  wireUploadButtons();
  wireAuthButtons(state, callbacks);
  wireImportExport(state.notes);
  wireThemeToggle();

  // Initial UI render
  callbacks.updateUserDisplay();
  callbacks.renderFolders();
  callbacks.renderNotesList();
  callbacks.renderActiveNote();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initApp();
  });
} else {
  initApp();
}


