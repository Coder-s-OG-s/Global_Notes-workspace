
import { getActiveUser } from "./storage.js";
import { loadNotesForCurrentUser, ensureAtLeastOneNote, persistNotes } from "./noteManager.js";
import { getFolders, saveFolders } from "./folderManager.js";
import { renderNotesList, renderActiveNote, updateUserDisplay, renderFolders } from "./renderer.js";
import { wireFiltersAndSearch, wireSort, wireTagInput, wireCrudButtons, wireFolderButtons, wireThemeSelector, syncThemeSelector } from "./eventHandlers.js";
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

// Sets the currently active note and updates the UI to reflect the change
function setActiveNote(noteId) {
  state.activeNoteId = noteId;
  const note = state.notes.find((n) => n.id === noteId);
  callbacks.renderNotesList();
  callbacks.renderActiveNote();
  // Sync theme selector with active note's theme
  syncThemeSelector(note);
}

const callbacks = {
  // Callback to set the active note and update UI
  setActiveNote,
  // Sets the active folder and refreshes the folders and notes list
  setActiveFolder: (folderId) => {
    state.activeFolderId = folderId;
    callbacks.renderFolders();
    callbacks.renderNotesList();
  },
  // Renders the list of notes in the sidebar
  renderNotesList: () => renderNotesList(state.notes, state.activeNoteId, setActiveNote, state.activeFolderId),
  // Renders the currently active note in the main editor
  renderActiveNote: () => renderActiveNote(state.notes.find((n) => n.id === state.activeNoteId), () => { }),
  // Renders the folders list in the sidebar
  renderFolders: () => renderFolders(state.folders, state.activeFolderId, callbacks.setActiveFolder),
  // Updates the UI to show the current user's information
  updateUserDisplay: () => updateUserDisplay(state.activeUser),
  // Saves all notes to storage
  persistNotes: () => persistNotes(state.activeUser, state.notes),
  // Loads notes and folders for the current user, ensuring at least one note exists
  loadNotesForCurrentUser: async () => {
    state.notes = loadNotesForCurrentUser(state.activeUser);
    state.folders = getFolders(state.activeUser);
    await ensureAtLeastOneNote(state.notes, state.activeUser);
    if (!state.activeNoteId && state.notes.length) {
      state.activeNoteId = state.notes[0].id;
    }
  },
};

// Initializes the application by setting up state, loading data, and wiring up event handlers
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
  wireThemeSelector(state, callbacks);

  // Initial UI render
  callbacks.updateUserDisplay();
  callbacks.renderFolders();
  callbacks.renderNotesList();
  callbacks.renderActiveNote();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}


