import { getActiveUser, setActiveUser, mergeGuestNotes } from "./storage.js";
import { loadNotesForCurrentUser, ensureAtLeastOneNote, persistNotes } from "./noteManager.js";
import { getFolders, saveFolders, syncFoldersFromCloud } from "./folderManager.js";
import { renderNotesList, renderActiveNote, updateUserDisplay, renderFolders, updateToolbarMetadata, renderNotesDashboard, renderDashboardSkeletons } from "./renderer.js";
import { wireFiltersAndSearch, wireSort, wireTagInput, wireCrudButtons, wireFolderButtons, wireThemeSelector, syncThemeSelector, wireEditorPatternSelector, syncEditorPatternSelector, wireDropdowns, wireLibraryNav } from "./eventHandlers.js";
import { wireFormattingToolbar } from "./formattingToolbar.js";
import { wireUploadButtons } from "./mediaManager.js";
import { wireAuthButtons } from "./authButtons.js";
import { wireImportExport } from "./exportImport.js";
// wireAIAssistant is superseded by wireEditorQuickTools for the AI popover
import { wireThemeToggle } from "./themeManager.js";
import { getActiveFilter, getSelectedDate } from "./filterSearchSort.js";
import { wireSidebarToggle, wireToolbarToggle, wireSidebarResize, wireToolTabs } from "./layoutManager.js";
import { initSmartCalendar } from "./smartCalendar.js";
import { wireProfileManager, updateHeaderAvatar } from "./profileManager.js";
import { wireSlashCommands } from "./slashCommands.js";
import { handleArchiveNote, handleUnarchiveNote, removeTagFromActiveNote, handleDeleteNote } from "./noteOperations.js";
// mailFeature.js is superseded by editorQuickTools.js for the mail popover
import { wireShareFeature, checkSharedUrl } from "./shareFeature.js";
import { wireShapeManager } from "./shapeManager.js";
import { wireTagManager } from "./tagManager.js";
import { wireAutoSave } from "./autoSave.js";
import { getCurrentUser } from "./authService.js";
import { wireEditorQuickTools } from "./editorQuickTools.js";
import { upgradeToolbarSelects } from "./customSelect.js";
import { generateTextWithGemini } from "./geminiAPI.js";
import { initStudyAssistant, onActiveNoteChanged } from "./studyAssistant.js";


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
  onActiveNoteChanged(note);

  // If we're entering Dashboard mode (noteId is null), refresh the dashboard grid
  if (!noteId) {
    callbacks.renderNotesDashboard();
  }
}

const callbacks = {
  get activeNoteId() { return state.activeNoteId; },
  setActiveNote,

  setActiveLibraryFilter: (filterType) => {
    state.activeLibraryFilter = filterType;
    state.activeFolderId = null; // Clear folder if library item selected
    state.activeNoteId = null; // Enter dashboard mode on navigation
    callbacks.renderNotesList();
    callbacks.renderActiveNote();
    callbacks.renderNotesDashboard();
  },

  setActiveFolder: (folderId, targetLibraryId = null) => {
    state.activeFolderId = folderId;
    if (folderId) state.activeLibraryFilter = 'all'; // Reset library filter if folder selected
    state.activeNoteId = null; // Enter dashboard mode on navigation

    callbacks.renderFolders();
    callbacks.renderNotesList();
    callbacks.renderActiveNote();
    callbacks.renderNotesDashboard();

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

    renderNotesList(filteredNotes, state.activeNoteId, setActiveNote, state.activeFolderId, {
      archiveNote: (id) => handleArchiveNote(state.notes, id, state.activeUser, callbacks),
      unarchiveNote: (id) => handleUnarchiveNote(state.notes, id, state.activeUser, callbacks),
      deleteNote: (id) => handleDeleteNote(state.notes, id, state.activeUser, callbacks)
    });
    callbacks.renderNotesDashboard();
    state.calendarWidget?.render();
  },
  // Renders the currently active note in the main editor
  renderActiveNote: () => renderActiveNote(
    state.notes.find((n) => n.id === state.activeNoteId),
    (tag) => removeTagFromActiveNote(state.notes, state.activeNoteId, tag, state.activeUser, callbacks)
  ),
  // Renders the folders list in the sidebar
  renderFolders: () => renderFolders(state.folders, state.activeFolderId, callbacks.setActiveFolder),
  // Renders the Dashboard Grid
  renderNotesDashboard: () => renderNotesDashboard(state.notes, state.folders, state.activeFolderId, state.activeLibraryFilter, setActiveNote, {
    archiveNote: (id) => handleArchiveNote(state.notes, id, state.activeUser, callbacks),
    unarchiveNote: (id) => handleUnarchiveNote(state.notes, id, state.activeUser, callbacks),
    deleteNote: (id) => handleDeleteNote(state.notes, id, state.activeUser, callbacks)
  }),
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
  getActiveNoteId: () => state.activeNoteId,
  renderDashboardSkeletons: () => renderDashboardSkeletons(state.activeFolderId, state.activeLibraryFilter),
  // Loads notes and folders for the current user, ensuring at least one note exists
  loadNotesForCurrentUser: async () => {
    callbacks.renderDashboardSkeletons();
    
    // Add artificial delay to make the loading animation visible and prevent flicker
    const start = Date.now();
    state.notes = await loadNotesForCurrentUser(state.activeUser);
    state.folders = await syncFoldersFromCloud(state.activeUser);
    
    const elapsed = Date.now() - start;
    if (elapsed < 800) {
      await new Promise(resolve => setTimeout(resolve, 800 - elapsed));
    }
    
    await ensureAtLeastOneNote(state.notes, state.activeUser);
    // Start with Dashboard (no active note) as requested
    state.activeNoteId = null;
  },
};

// Initializes the application by setting up state, loading data, and wiring up event handlers
async function initApp() {
  // Apply theme immediately to prevent flickering or failures if auth hangs
  wireThemeToggle();

  // Render skeletal loaders immediately while fetching user session and notes
  renderDashboardSkeletons(null, 'all');

  // Check if we are forcing guest mode (e.g. from continue as guest)
  const urlParams = new URLSearchParams(window.location.search);
  const forceGuest = urlParams.get('guest') === 'true';

  if (forceGuest) {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Remove the query param to prevent repeat logouts on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      // No active session to delete, which is fine
    }
  }

  // Load user session
  const user = await getCurrentUser();
  if (user) {
    const username = user.username || user.email || 'User';
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
  state.activeNoteId = null;

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

  wireThemeSelector(state, callbacks);
  wireEditorPatternSelector(state, callbacks);
  wireSidebarToggle();
  wireToolbarToggle();
  wireSidebarResize();
  wireToolTabs();
  wireProfileManager(state, callbacks);
  wireSlashCommands();
  // wireMailFeature(); // now handled by wireEditorQuickTools()
  wireShareFeature(state, callbacks);
  wireShapeManager();
  wireTagManager(state, callbacks);
  wireAutoSave(state, callbacks);
  wireDropdowns();
  wireLibraryNav(state, callbacks); // Wire new Sidebar Library
  wireEditorQuickTools(); // Wire editor bar AI & Mail quick-tool popovers
  upgradeToolbarSelects(); // Transform native selects into polished dropdowns

  // Wire Folder Navigation from Grid Cards
  document.addEventListener("nav-folder", (e) => {
    callbacks.setActiveFolder(e.detail.id);
  });

  // Wire Back to Dashboard
  const backBtn = document.getElementById("back-to-dashboard");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      setActiveNote(null);
    });
  }

  // Initialize Smart Calendar
  state.calendarWidget = initSmartCalendar(state, callbacks);

  // Live Metadata Update
  const contentInput = document.getElementById("content");
  if (contentInput) {
    // Tab trigger for inline AI code completion
    contentInput.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const containerNode = range.startContainer;
        
        if (containerNode.nodeType === Node.TEXT_NODE) {
          const textBeforeCursor = containerNode.textContent.substring(0, range.startOffset);
          const aiMatch = textBeforeCursor.match(/(?:\/\/|#)\s*AI:\s*([^\n\r]+)$/i);
          
          if (aiMatch) {
            e.preventDefault();
            const promptStr = aiMatch[1].trim();
            const matchIndex = textBeforeCursor.lastIndexOf(aiMatch[0]);
            
            const originalText = containerNode.textContent;
            const prefix = originalText.substring(0, matchIndex);
            const suffix = originalText.substring(range.startOffset);
            const tempText = `${aiMatch[0]} (Generating...)`;
            
            containerNode.textContent = prefix + tempText + suffix;
            
            const newOffset = prefix.length + tempText.length;
            const newRange = document.createRange();
            newRange.setStart(containerNode, newOffset);
            newRange.setEnd(containerNode, newOffset);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            generateTextWithGemini(
              `You are an expert programming assistant. Generate a clean code snippet based on this prompt: "${promptStr}".
Provide ONLY the code. Do NOT wrap it in markdown codeblocks (no \`\`\`), do NOT include explanations or conversational text. Return the raw code ready to insert.`
            ).then((aiCode) => {
              const currentText = containerNode.textContent;
              const genText = `${aiMatch[0]} (Generating...)`;
              const genIndex = currentText.indexOf(genText);
              
              if (genIndex !== -1) {
                const finalRange = document.createRange();
                finalRange.setStart(containerNode, genIndex);
                finalRange.setEnd(containerNode, genIndex + genText.length);
                finalRange.deleteContents();
                
                const pre = document.createElement('pre');
                pre.className = 'code-block-flashcard';
                pre.style.backgroundColor = '#1a1a24';
                pre.style.color = '#38bdf8';
                pre.style.padding = '12px';
                pre.style.borderRadius = '6px';
                pre.style.margin = '8px 0';
                pre.style.overflowX = 'auto';
                pre.style.fontFamily = 'monospace';
                
                const codeEl = document.createElement('code');
                codeEl.textContent = aiCode;
                pre.appendChild(codeEl);
                
                finalRange.insertNode(pre);
                
                const br = document.createElement('br');
                pre.parentNode.insertBefore(br, pre.nextSibling);
                
                const postRange = document.createRange();
                postRange.setStartAfter(pre.nextSibling);
                postRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(postRange);
                
                contentInput.dispatchEvent(new Event('input'));
              }
            }).catch((err) => {
              console.error(err);
              const currentText = containerNode.textContent;
              const genText = `${aiMatch[0]} (Generating...)`;
              const genIndex = currentText.indexOf(genText);
              if (genIndex !== -1) {
                const finalRange = document.createRange();
                finalRange.setStart(containerNode, genIndex);
                finalRange.setEnd(containerNode, genIndex + genText.length);
                finalRange.deleteContents();
                const errTextNode = document.createTextNode(`${aiMatch[0]} (Error generating code)`);
                finalRange.insertNode(errTextNode);
              }
            });
          }
        }
      }
    });

    // Utility for debouncing inside this scope
    let metadataTimeout;
    contentInput.addEventListener("input", () => {
      clearTimeout(metadataTimeout);
      metadataTimeout = setTimeout(() => {
        const activeNote = state.notes.find(n => n.id === state.activeNoteId);
        if (activeNote) {
          updateToolbarMetadata(activeNote, contentInput.innerHTML);
        }
      }, 500); // 500ms delay to keep UI responsive
    });
  }

  // Initial UI render
  callbacks.updateUserDisplay();
  callbacks.renderFolders();
  callbacks.renderNotesList();
  callbacks.renderActiveNote();
  callbacks.renderNotesDashboard();

  // Check for shared URL params LAST (User's preferred flow)
  checkSharedUrl();

  // Initialize Study Assistant
  initStudyAssistant(state, callbacks);

}


// Initial App Trigger
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
