import { getActiveUser, setActiveUser, mergeGuestNotes } from "./storage.js";
import { loadNotesForCurrentUser, ensureAtLeastOneNote, persistNotes } from "./noteManager.js";
import { getFolders, saveFolders } from "./folderManager.js";
import { renderNotesList, renderActiveNote, updateUserDisplay, renderFolders } from "./renderer.js";
import { wireFiltersAndSearch, wireSort, wireTagInput, wireCrudButtons, wireFolderButtons, wireThemeSelector, syncThemeSelector, wireEditorPatternSelector, syncEditorPatternSelector, wireDropdowns, wireLibraryNav } from "./eventHandlers.js";
import { wireFormattingToolbar } from "./formattingToolbar.js";
import { wireUploadButtons } from "./mediaManager.js";
import { wireAuthButtons } from "./authButtons.js";
import { wireImportExport } from "./exportImport.js";
import { wireAIAssistant } from './aiAssistant.js';
import { wireThemeToggle } from "./themeManager.js";
import { getActiveFilter, getSelectedDate } from "./filterSearchSort.js";
import { wireSidebarToggle, wireToolbarToggle, wireSidebarResize, wireToolTabs } from "./layoutManager.js";
import { initSmartCalendar } from "./smartCalendar.js";
import { wireProfileManager, updateHeaderAvatar } from "./profileManager.js";
import { wireSlashCommands } from "./slashCommands.js";
import { wireMailFeature } from "./mailFeature.js";
import { wireShareFeature, checkSharedUrl } from "./shareFeature.js";
import { wireShapeManager } from "./shapeManager.js";
import { wireTagManager } from "./tagManager.js";
import { wireAutoSave } from "./autoSave.js";
import { getSession } from "./authService.js";
import { wireEditorQuickTools } from "./editorQuickTools.js";


// Global state
const state = {
  notes: [],
  activeNoteId: null,
  activeUser: null,
  folders: [],
  activeFolderId: null, // null means "All Notes"
  activeLibraryFilter: 'all', // 'all', 'recent', 'favorites', 'trash'
  calendarWidget: null
};

// Sets the currently active note and updates the UI to reflect the change
function setActiveNote(noteId) {
  state.activeNoteId = noteId;
  const note = state.notes.find((n) => n.id === noteId);
  callbacks.renderNotesList();
  callbacks.renderActiveNote();
  syncThemeSelector(note);
  syncEditorPatternSelector(note);
}

const callbacks = {
  setActiveNote,

  setActiveLibraryFilter: (filterType) => {
    state.activeLibraryFilter = filterType;
    state.activeFolderId = null; // Clear folder if library item selected
    callbacks.renderNotesList();
  },

  setActiveFolder: (folderId, targetLibraryId = null) => {
    state.activeFolderId = folderId;
    if (folderId) state.activeLibraryFilter = 'all'; // Reset library filter if folder selected

    callbacks.renderFolders();
    callbacks.renderNotesList();

    if (folderId) {
      import("./renderer.js").then(module => {
        module.updateSidebarSelection(folderId, null);
      });
    } else {
      const libId = targetLibraryId || 'nav-all-notes';
      import("./renderer.js").then(module => {
        module.updateSidebarSelection(null, libId);
      });
    }
  },

  renderNotesList: () => {
    let filteredNotes = state.notes;

    // Apply Library Filters
    if (state.activeLibraryFilter === 'favorites') {
      filteredNotes = state.notes.filter(n => n.isFavorite && !n.isArchived);
    } else if (state.activeLibraryFilter === 'archived') {
      filteredNotes = state.notes.filter(n => n.isArchived);
    } else {
      // Default: 'all' or other
      filteredNotes = state.notes.filter(n => !n.isArchived);
    }
    // 'recent' is just a sort, handled by the sort dropdown or default logic

    renderNotesList(filteredNotes, state.activeNoteId, setActiveNote, state.activeFolderId);
    state.calendarWidget?.render();
  },
  // Renders the currently active note in the main editor
  renderActiveNote: () => renderActiveNote(state.notes.find((n) => n.id === state.activeNoteId), () => { }),
  // Renders the folders list in the sidebar
  renderFolders: () => renderFolders(state.folders, state.activeFolderId, callbacks.setActiveFolder),
  // Updates the UI to show the current user's information
  updateUserDisplay: () => {
    updateUserDisplay(state.activeUser);
    updateHeaderAvatar(state.activeUser);
  },
  // Saves all notes to storage
  persistNotes: async () => {
    await persistNotes(state.activeUser, state.notes);
    state.calendarWidget?.render(); // Update calendar indicators
  },
  // Loads notes and folders for the current user, ensuring at least one note exists
  loadNotesForCurrentUser: async () => {
    state.notes = await loadNotesForCurrentUser(state.activeUser);
    state.folders = getFolders(state.activeUser);
    await ensureAtLeastOneNote(state.notes, state.activeUser);
    if (!state.activeNoteId && state.notes.length) {
      state.activeNoteId = state.notes[0].id;
    }
  },
};

// Initializes the application by setting up state, loading data, and wiring up event handlers
async function initApp() {
  // Apply theme immediately to prevent flickering or failures if auth hangs
  wireThemeToggle();

  // Load user session
  // Check Supabase session first (especially after OAuth redirect)
  const session = await getSession();
  if (session?.user) {
    // If Supabase has a user, ensure it's set as active (syncs to localStorage)
    const username = session.user.user_metadata?.username || session.user.email;
    setActiveUser(username);
    state.activeUser = username;

    // Merge any Guest notes that might exist locally
    const didMerge = mergeGuestNotes(username);

    // Load notes for current user
    await callbacks.loadNotesForCurrentUser();

    // If we successfully merged guest notes, sync them to cloud immediately
    if (didMerge) {
      console.log("Syncing merged guest notes to cloud...");
      await callbacks.persistNotes();
    }
  } else {
    // Fallback to local storage (e.g. if offline or guest)
    state.activeUser = getActiveUser();
    // Load notes for current user (guest)
    await callbacks.loadNotesForCurrentUser();
  }

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
  wireImportExport(state);
  wireAIAssistant(state, callbacks);



  wireThemeSelector(state, callbacks);
  wireEditorPatternSelector(state, callbacks);
  wireSidebarToggle();
  wireToolbarToggle();
  wireSidebarResize();
  wireToolTabs();
  wireProfileManager(state, callbacks);
  wireSlashCommands();
  wireMailFeature();
  wireShareFeature(state, callbacks);
  wireShapeManager();
  wireTagManager(state, callbacks);
  wireAutoSave(state, callbacks);
  wireDropdowns();
  wireLibraryNav(state, callbacks); // Wire new Sidebar Library
  wireEditorQuickTools(); // Wire editor bar AI & Mail quick-tool popovers

  // Initialize Smart Calendar
  state.calendarWidget = initSmartCalendar(state, callbacks);

  // Initial UI render
  callbacks.updateUserDisplay();
  callbacks.renderFolders();
  callbacks.renderNotesList();
  callbacks.renderActiveNote();

  // Check for shared URL params LAST (User's preferred flow)
  checkSharedUrl();
}

// Redirect 0.0.0.0 to localhost to avoid "Not Secure" warning on desktop
if (window.location.hostname === '0.0.0.0') {
  window.location.hostname = 'localhost';
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
