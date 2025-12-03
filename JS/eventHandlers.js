import { getSelectedDate } from "./filterSearchSort.js";
import { 
  handleNewNote, 
  handleSaveNote, 
  handleDeleteNote, 
  handleDuplicateNote,
  addTagToActiveNote 
} from "./noteOperations.js";

const $ = (selector) => document.querySelector(selector);
const $all = (selector) => Array.from(document.querySelectorAll(selector));

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

export function wireSort(callbacks) {
  const select = $("#sort");
  select?.addEventListener("change", () => callbacks.renderNotesList());
}

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

export function wireCrudButtons(state, getActiveFilter, callbacks) {
  $("#new-note")?.addEventListener("click", () => {
    handleNewNote(state.notes, state.activeUser, getActiveFilter, getSelectedDate, callbacks);
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
