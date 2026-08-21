import { getTagColor, formatDate, showConfirm, showPrompt, showFolderModal, showToast } from "./utilities.js";
import { getSelectedDate } from "./filterSearchSort.js";
import { saveSingleNote } from "./storage.js";
import {
  handleNewNote,
  handleSaveNote,
  handleDeleteNote,
  handleDuplicateNote,
  handleToggleFavorite,
  handleArchiveNote,
  handleUnarchiveNote,
  addTagToActiveNote
} from "./noteOperations.js";
import {
  createNewFolder,
  deleteFolder,
  renameFolder,
  getFolders
} from "./folderManager.js";

const $ = (selector) => document.querySelector(selector);
const $all = (selector) => Array.from(document.querySelectorAll(selector));

// Sets up event listeners for filter chips, search input, and date filter
export function wireFiltersAndSearch(callbacks) {
  $all(".filters .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $all(".filters .chip").forEach((c) => {
        const isTarget = c === chip;
        c.classList.toggle("active", isTarget);
        c.setAttribute("aria-pressed", String(isTarget));
      });
      callbacks.renderNotesList();
    });
  });

  const searchInput = $("#search");
  let searchTimeout;
  searchInput?.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      callbacks.renderNotesList();
    }, 300);
  });
}

// Handles the sort dropdown functionality for notes list
export function wireSort(callbacks) {
  const select = $("#sort");
  select?.addEventListener("change", () => callbacks.renderNotesList());
}

// Manages tag input field for adding new tags to the active note
// DEPRECATED: Replaced by tagManager.js
export function wireTagInput(state, callbacks) {
  // Functionality moved to Tag Manager
}

// Connects all CRUD (Create, Read, Update, Delete) buttons to their respective handlers
export function wireCrudButtons(state, getActiveFilter, callbacks) {
  $("#new-note")?.addEventListener("click", () => {
    handleNewNote(state.notes, state.activeUser, getActiveFilter, getSelectedDate, callbacks, state.activeFolderId);
  });

  $("#save-note")?.addEventListener("click", async () => {
    if (!state.activeUser) {
      const shouldLogin = await showConfirm(
        "Login Required",
        "You need to be logged in to save notes. Would you like to log in now?",
        "Log In"
      );
      if (shouldLogin) {
        window.location.href = "/HTML/signup.html";
      }
      return;
    }
    handleSaveNote(state.notes, state.activeNoteId, state.activeUser, getActiveFilter, callbacks);
  });

  $("#delete-note")?.addEventListener("click", () => {
    handleDeleteNote(state.notes, state.activeNoteId, state.activeUser, callbacks);
  });

  $("#delete-note-main")?.addEventListener("click", () => {
    handleDeleteNote(state.notes, state.activeNoteId, state.activeUser, callbacks);
  });

  $("#duplicate-note")?.addEventListener("click", () => {
    handleDuplicateNote(state.notes, state.activeNoteId, state.activeUser, callbacks);
  });

  $("#toggle-favorite")?.addEventListener("click", () => {
    handleToggleFavorite(state.notes, state.activeNoteId, state.activeUser, callbacks);
  });

  $("#archive-note")?.addEventListener("click", () => {
    const note = state.notes.find(n => n.id === state.activeNoteId);
    if (!note) return;
    if (note.isArchived) {
      handleUnarchiveNote(state.notes, note.id, state.activeUser, callbacks);
    } else {
      handleArchiveNote(state.notes, note.id, state.activeUser, callbacks);
    }
  });
}

// Handles folder-related operations: create, rename, edit color, and delete folders
export function wireFolderButtons(state, callbacks) {
  let isCreating = false;

  const handleCreateFolder = async () => {
    if (isCreating) return;
    isCreating = true;
    try {
      const folderData = await showFolderModal("Create New Folder", "", "blue", "Create");
      if (folderData && folderData.name) {
        const newFolder = await createNewFolder(state.activeUser, folderData.name, folderData.color);
        if (newFolder) {
          const folderId = newFolder.id || newFolder._id;
          const exists = state.folders.some(f => (f.id && f.id === folderId) || (f._id && f._id === folderId));
          if (!exists) {
            state.folders.push(newFolder);
          }
          callbacks.renderFolders();
          callbacks.renderNotesDashboard();
        }
      }
    } finally {
      isCreating = false;
    }
  };

  // Listen for clicks on any create folder element across the UI
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#create-folder, .create-folder-btn, [data-action='create-folder'], #header-create-folder, .add-folder-3d-card");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      handleCreateFolder();
    }
  });

  document.addEventListener("trigger-create-folder", () => {
    handleCreateFolder();
  });

  document.addEventListener("delete-folder", async (event) => {
    const folderId = event.detail.id;
    if (!folderId) return;

    const confirmed = await showConfirm(
      "Delete Folder",
      `Are you sure you want to delete this folder? Notes inside will be moved back to "All Notes".`,
      "Delete Folder"
    );
    if (!confirmed) return;

    await deleteFolder(state.activeUser, folderId, state.notes);
    state.folders = state.folders.filter((f) => f.id !== folderId && f._id !== folderId);

    if (state.activeFolderId === folderId) {
      callbacks.setActiveFolder(null); // This already calls renderNotesDashboard internally
    } else {
      callbacks.renderFolders();
      callbacks.renderNotesList();
      callbacks.renderNotesDashboard(); // Ensure grid UI reflects deletion
    }
  });

  document.addEventListener("rename-folder", async (event) => {
    const folderId = event.detail.id;
    if (!folderId) return;

    const currentFolder = state.folders.find((f) => f.id === folderId || f._id === folderId);
    const currentName = currentFolder ? currentFolder.name : "";
    const currentColor = currentFolder ? currentFolder.color || "blue" : "blue";

    const folderData = await showFolderModal("Edit Folder", currentName, currentColor, "Save");
    if (!folderData || !folderData.name) return;

    await renameFolder(state.activeUser, folderId, folderData.name, folderData.color);
    if (currentFolder) {
      currentFolder.name = folderData.name;
      currentFolder.color = folderData.color;
    }
    callbacks.renderFolders();
    callbacks.renderNotesList();
    callbacks.renderNotesDashboard();
  });

  document.addEventListener("update-folder-color", (event) => {
    const { id, color } = event.detail;
    if (!id || !color) return;

    const currentFolder = state.folders.find((f) => f.id === id || f._id === id);
    if (currentFolder) {
      currentFolder.color = color;
      updateFolderColor(state.activeUser, id, color, state.folders);
      callbacks.renderFolders();
      callbacks.renderNotesDashboard();
    }
  });

  document.addEventListener("update-note-color", (event) => {
    const { id, color } = event.detail;
    if (!id || !color) return;

    const note = state.notes.find((n) => n.id === id || n._id === id);
    if (note) {
      note.color = color;
      note.theme = color;
      if (callbacks.persistNotes) callbacks.persistNotes();
      if (callbacks.saveSingleNote) callbacks.saveSingleNote(note);
      callbacks.renderNotesDashboard();
    }
  });

  document.addEventListener("move-note-to-folder", async (event) => {
    const { noteId, folderId } = event.detail;
    if (!noteId) return;

    const note = state.notes.find((n) => n.id === noteId || n._id === noteId);
    if (note) {
      note.folderId = folderId || null;
      note.updatedAt = new Date().toISOString();
      if (state.activeUser && state.activeUser !== 'guest') {
        await saveSingleNote(state.activeUser, note);
      }
      showToast(folderId ? "Moved note to folder" : "Moved note to root workspace", "success");
      callbacks.renderNotesDashboard();
      callbacks.renderFolders();
      callbacks.renderNotesList();
    }
  });
}

// Moves a note to a specified folder and updates its timestamp
export async function moveNoteToFolder(noteId, folderId, notes, activeUser, callbacks) {
  const note = notes.find((n) => n.id === noteId || n._id === noteId);
  if (note) {
    note.folderId = folderId || null;
    note.updatedAt = new Date().toISOString();
    if (activeUser && activeUser !== 'guest') {
      await saveSingleNote(activeUser, note);
    }
    if (callbacks) {
      if (callbacks.renderNotesList) callbacks.renderNotesList();
      if (callbacks.renderNotesDashboard) callbacks.renderNotesDashboard();
      if (callbacks.renderFolders) callbacks.renderFolders();
    }
  }
}

// Handles theme selector dropdown for changing note card appearance
export function wireThemeSelector(state, callbacks) {
  const themeSelect = $("#note-theme");
  if (!themeSelect) return;

  themeSelect.addEventListener("change", () => {
    const selectedTheme = themeSelect.value;
    const note = state.notes.find((n) => n.id === state.activeNoteId);

    if (note) {
      note.theme = selectedTheme;
      note.updatedAt = new Date().toISOString();
      callbacks.persistNotes();
      callbacks.renderNotesList();
      callbacks.renderActiveNote();
    }
  });
}

// Manages dropdown toggles (Preferences, Profile, Overflow)
export function wireDropdowns() {
  const toggleDropdown = (wrapperId, menuId) => {
    const wrapper = document.getElementById(wrapperId);
    const menu = document.getElementById(menuId);
    const btn = wrapper?.querySelector("button");

    if (!wrapper || !menu || !btn) return;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Close others
      document.querySelectorAll(".dropdown-menu").forEach(el => {
        if (el !== menu) el.classList.add("hidden");
      });
      document.querySelectorAll(".overflow-menu").forEach(el => el.classList.add("hidden"));
      // Close editor tool popovers (AI/Mail)
      document.querySelectorAll(".editor-tool-popover.open").forEach(p => p.classList.remove("open"));
      document.querySelectorAll(".editor-tool-trigger.active, .ai-pill-btn.active, .mail-pill-btn.active").forEach(t => t.classList.remove("active"));
      menu.classList.toggle("hidden");
    });
  };

  toggleDropdown("apps-dropdown-wrapper", "apps-menu");
  toggleDropdown("preferences-dropdown-wrapper", "preferences-menu");
  toggleDropdown("user-pill", "profile-menu");


  // Overflow menu (editor actions)
  const overflowTrigger = document.querySelector(".overflow-trigger");
  const overflowMenu = document.querySelector(".overflow-menu");
  if (overflowTrigger && overflowMenu) {
    overflowTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".dropdown-menu").forEach(el => el.classList.add("hidden"));
      // Close editor tool popovers (AI/Mail)
      document.querySelectorAll(".editor-tool-popover.open").forEach(p => p.classList.remove("open"));
      overflowMenu.classList.toggle("hidden");
    });
  }

  // Click outside to close all
  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-menu").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".overflow-menu").forEach(el => el.classList.add("hidden"));
  });

  // Prevent overflow menu clicks from closing itself
  overflowMenu?.addEventListener("click", (e) => {
    // Only stop propagation for non-action items (the menu container itself)
    // Action items should close the menu after their handler fires
  });
}

// Updates the theme selector to match the current note's theme
export function syncThemeSelector(activeNote) {
  const themeSelect = $("#note-theme");
  if (!themeSelect || !activeNote) return;

  themeSelect.value = activeNote.theme || "";
}

// Handles editor pattern selector dropdown for changing text area background
export function wireEditorPatternSelector(state, callbacks) {
  const patternSelect = $("#editor-pattern");
  if (!patternSelect) return;

  patternSelect.addEventListener("change", () => {
    const selectedPattern = patternSelect.value;
    const note = state.notes.find((n) => n.id === state.activeNoteId);

    if (note) {
      note.editorPattern = selectedPattern;
      note.updatedAt = new Date().toISOString();
      callbacks.persistNotes();
      callbacks.renderActiveNote();
    }
  });
}

// Updates the editor pattern selector to match the current note's pattern
export function syncEditorPatternSelector(activeNote) {
  const patternSelect = $("#editor-pattern");
  if (!patternSelect || !activeNote) return;

  patternSelect.value = activeNote.editorPattern || "plain";
}

// Wires up the new Library Section navigation
export function wireLibraryNav(state, callbacks) {
  const navItems = [
    { id: "nav-all-notes", action: "all" },
    { id: "nav-recent", action: "recent" },
    { id: "nav-favorites", action: "favorites" },
    { id: "nav-archived", action: "archived" }
  ];

  /* 
   * Helper to set active visual state. 
   * In a real app, this might be reactive. Here we manually toggle classes 
   * or rely on a centralized render. Ideally, callbacks.setActiveLibraryItem(id) would handle it.
   */

  navItems.forEach((item) => {
    const el = document.getElementById(item.id);
    if (!el) return;

    el.addEventListener("click", (e) => {
      e.preventDefault();

      // 1. Visual Update
      document.querySelectorAll(".library-item").forEach((li) => li.classList.remove("active"));
      document.querySelectorAll(".folder-item").forEach((li) => li.classList.remove("active")); // Deselect folders
      el.classList.add("active");

      // 2. Logic Update
      callbacks.setActiveFolder(null, item.id); // Clear folder selection but keep library visual state

      if (item.action === "all") {
        callbacks.setActiveLibraryFilter('all');
      } else if (item.action === "recent") {
        callbacks.setActiveLibraryFilter('all');
        const sortSelect = document.getElementById("sort");
        if (sortSelect) {
          sortSelect.value = "updated-desc";
          sortSelect.dispatchEvent(new Event("change"));
        }
      } else if (item.action === "favorites") {
        callbacks.setActiveLibraryFilter('favorites');
      } else if (item.action === "archived") {
        callbacks.setActiveLibraryFilter('archived');
      }

      // Refresh list
      callbacks.renderNotesList();
    });
  });
}