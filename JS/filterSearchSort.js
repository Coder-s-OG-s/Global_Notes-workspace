import { toLocalDateString } from "./utilities.js";

const $ = (selector) => document.querySelector(selector);

export function getActiveFilter() {
  const activeChip = document.querySelector(".filters .chip.active");
  return activeChip ? activeChip.dataset.filter || "all" : "all";
}

export function getSearchQuery() {
  const input = $("#search");
  return input ? input.value.trim().toLowerCase() : "";
}

export function getSortMode() {
  const select = $("#sort");
  return select ? select.value : "updated_desc";
}

export function getSelectedDate() {
  const input = $("#date-filter");
  return input && input.value ? input.value : "";
}

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
      case "updated_asc":
        return (a.updatedAt || "").localeCompare(b.updatedAt || "");
      case "title_asc":
        return (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
      case "title_desc":
        return (b.title || "").localeCompare(a.title || "", undefined, { sensitivity: "base" });
      case "updated_desc":
      default:
        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    }
  });

  return result;
}