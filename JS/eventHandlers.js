import { getSelectedDate } from "./filterSearchSort.js";
import {
  handleNewNote,
  handleSaveNote,
  handleDeleteNote,
  handleDuplicateNote,
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
  searchInput?.addEventListener("input", () => callbacks.renderNotesList());

  const dateInput = $("#date-filter");
  dateInput?.addEventListener("change", () => callbacks.renderNotesList());

  const clearDateBtn = $("#clear-date");
  clearDateBtn?.addEventListener("click", () => {
    if (dateInput) {
      dateInput.value = "";
    }
    callbacks.renderNotesList();
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

  $("#save-note")?.addEventListener("click", () => {
    if (!state.activeUser) {
      const shouldLogin = confirm("You need to be logged in to save notes. Would you like to log in now?");
      if (shouldLogin) {
        window.location.href = "./HTML/signup.html";
      }
      return;
    }
    handleSaveNote(state.notes, state.activeNoteId, state.activeUser, getActiveFilter, callbacks);
  });

  $("#delete-note")?.addEventListener("click", () => {
    handleDeleteNote(state.notes, state.activeNoteId, state.activeUser, callbacks);
  });

  $("#duplicate-note")?.addEventListener("click", () => {
    handleDuplicateNote(state.notes, state.activeNoteId, state.activeUser, callbacks);
  });
}

// Handles folder-related operations: create, rename, and delete folders
export function wireFolderButtons(state, callbacks) {
  const createFolderBtn = $("#create-folder");
  const foldersListEl = $("#folders-list");

  if (createFolderBtn) {
    createFolderBtn.addEventListener("click", () => {
      const folderName = prompt("Enter folder name:");
      if (folderName && folderName.trim()) {
        const newFolder = createNewFolder(state.activeUser, folderName.trim());
        state.folders.push(newFolder);
        callbacks.renderFolders();
      }
    });
  }

  if (foldersListEl) {
    foldersListEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (!target.classList.contains("folder-delete-btn") && !target.classList.contains("folder-rename-btn")) {
        return;
      }

      const folderItem = target.closest(".folder-item");
      if (!folderItem) return;
      const folderId = folderItem.dataset.id;
      if (!folderId) return;

      if (target.classList.contains("folder-delete-btn")) {
        event.stopPropagation();
        const confirmed = confirm("Delete this folder? Notes inside will move back to All Notes.");
        if (!confirmed) return;

        deleteFolder(state.activeUser, folderId, state.notes);
        state.folders = state.folders.filter((f) => f.id !== folderId);

        if (state.activeFolderId === folderId) {
          callbacks.setActiveFolder(null);
        } else {
          callbacks.renderFolders();
          callbacks.renderNotesList();
        }
      } else if (target.classList.contains("folder-rename-btn")) {
        event.stopPropagation();
        const currentFolder = state.folders.find((f) => f.id === folderId);
        const currentName = currentFolder ? currentFolder.name : "";
        const newName = prompt("Rename folder:", currentName);
        if (!newName || !newName.trim()) return;

        renameFolder(state.activeUser, folderId, newName.trim());
        if (currentFolder) {
          currentFolder.name = newName.trim();
        }
        callbacks.renderFolders();
      }
    });
  }
}

// Moves a note to a specified folder and updates its timestamp
export function moveNoteToFolder(noteId, folderId, notes) {
  const note = notes.find((n) => n.id === noteId);
  if (note) {
    note.folderId = folderId;
    note.updatedAt = new Date().toISOString();
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

// Manages dropdown toggles (Preferences, Profile)
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
      menu.classList.toggle("hidden");
    });
  };

  toggleDropdown("preferences-dropdown-wrapper", "preferences-menu");
  toggleDropdown("user-pill", "profile-menu");

  // Click outside to close
  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-menu").forEach(el => el.classList.add("hidden"));
  });
}

// Updates the theme selector to match the current note's theme
export function syncThemeSelector(activeNote) {
  const themeSelect = $("#note-theme");
  if (!themeSelect || !activeNote) return;

  themeSelect.value = activeNote.theme || "classic-blue";
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