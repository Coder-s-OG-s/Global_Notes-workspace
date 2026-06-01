import { toLocalDateString } from "./utilities.js";

const $ = (selector) => document.querySelector(selector);

// Gets the currently selected filter from the UI (e.g., 'all', 'work', 'personal')
export function getActiveFilter() {
  const activeChip = document.querySelector(".filters .chip.active");
  return activeChip ? activeChip.dataset.filter || "all" : "all";
}

// Retrieves and formats the current search query from the search input
export function getSearchQuery() {
  const input = $("#search");
  return input ? input.value.trim().toLowerCase() : "";
}

// Gets the current sort mode from the sort dropdown (e.g., 'updated_desc', 'title_asc')
export function getSortMode() {
  const select = $("#sort");
  return select ? select.value : "updated-desc";
}

// Retrieves the selected date from the date filter input
export function getSelectedDate() {
  const input = $("#date-filter");
  return input && input.value ? input.value : "";
}

// Applies all active filters, searches, and sorting to the notes list
export function applyFilterSearchAndSort(baseNotes) {
  const filter = getActiveFilter();
  const query = getSearchQuery();
  const sortMode = getSortMode();
  const selectedDate = getSelectedDate();

  let result = [...baseNotes];

  if (filter && filter !== "all") {
    result = result.filter((note) => note.tags && note.tags.includes(filter));
  }

  if (query) {
    result = result.filter((note) => {
      const haystack = [note.title || "", note.content || "", (note.tags || []).join(" ")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  if (selectedDate) {
    result = result.filter((note) => {
      const source = note.createdAt || note.updatedAt;
      if (!source) return false;
      const iso = typeof source === "string" ? source : String(source);
      const datePart = iso.split("T")[0];
      return datePart === selectedDate;
    });
  }

  result.sort((a, b) => {
    switch (sortMode) {
      case "updated-asc":
        return (a.updatedAt || "").localeCompare(b.updatedAt || "");
      case "title-asc":
        return (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
      case "title-desc":
        return (b.title || "").localeCompare(a.title || "", undefined, { sensitivity: "base" });
      case "updated-desc":
      default:
        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    }
  }); //check this

  return result;
}