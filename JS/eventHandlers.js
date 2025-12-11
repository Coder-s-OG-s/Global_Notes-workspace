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
export function wireTagInput(state, callbacks) {
  const addTagInput = $("#add-tag");
  if (!addTagInput) return;
  addTagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = addTagInput.value.replace(",", "").trim();
      if (value) {
        addTagToActiveNote(state.notes, state.activeNoteId, value, state.activeUser, callbacks);
        callbacks.renderActiveNote();
        callbacks.renderNotesList();
      }
      addTagInput.value = "";
    }
  });
}

// Connects all CRUD (Create, Read, Update, Delete) buttons to their respective handlers
export function wireCrudButtons(state, getActiveFilter, callbacks) {
  $("#new-note")?.addEventListener("click", () => {
    handleNewNote(state.notes, state.activeUser, getActiveFilter, getSelectedDate, callbacks, state.activeFolderId);
  });

  $("#save-note")?.addEventListener("click", () => {
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
    }
  });
}

// Updates the theme selector to match the current note's theme
export function syncThemeSelector(activeNote) {
  const themeSelect = $("#note-theme");
  if (!themeSelect || !activeNote) return;

  themeSelect.value = activeNote.theme || "classic-blue";
}