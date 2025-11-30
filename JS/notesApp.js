// ========================================
// IMPORTS - Load external modules
// ========================================
// Import storage functions to manage note persistence and user sessions
import { getNotes, setNotes, getActiveUser, clearActiveUser } from "./storage.js";
// Import function to fetch sample/demo notes from an API
import { fetchSampleNotes } from "./apiClient.js";
// Import constant that defines the localStorage key for theme settings
import { THEME_KEY } from "./constants.js";

// ========================================
// TAG COLORS CONFIGURATION
// ========================================
// Maps tag names to hex color codes for visual styling of tags in the UI
const TAG_COLORS = {
  work: "#6aa6ff",
  personal: "#ff85a1",
  ideas: "#faca6b",
  todo: "#88ffc3",
  remote: "#b084ff",
};

// ========================================
// GLOBAL STATE VARIABLES
// ========================================
// Array storing all user notes
let notes = [];
// ID of the currently selected/displayed note
let activeNoteId = null;
// Username of the logged-in user (null if not logged in)
let activeUser = null;

// ========================================
// UTILITY SELECTORS
// ========================================
// Shorthand for querySelector to select single DOM elements
const $ = (selector) => document.querySelector(selector);
// Shorthand for querySelectorAll, returns array of matching elements
const $all = (selector) => Array.from(document.querySelectorAll(selector));
// Sets "dark" as the default theme if user hasn't saved a preference
const DEFAULT_THEME = "dark";

// ========================================
// TAG & COLOR UTILITIES
// ========================================
/**
 * Returns the hex color for a given tag
 * - Returns dark blue (#0f1526) if tag is empty
 * - Looks up color in TAG_COLORS object (case-insensitive)
 * - Falls back to medium blue (#4f6b95) if tag not found
 */
function getTagColor(tag) {
  if (!tag) return "#0f1526";
  return TAG_COLORS[tag.toLowerCase()] || "#4f6b95";
}

// ========================================
// DATE UTILITIES
// ========================================
/**
 * Converts ISO date string to local date in "YYYY-MM-DD" format (en-CA locale)
 * Returns empty string if date is invalid or not provided
 */
function toLocalDateString(dateLike) {
  if (!dateLike) return "";
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-CA");
}

// ========================================
// THEME UTILITIES
// ========================================
/**
 * Retrieves saved theme preference from localStorage
 * Returns "dark" or "light"; defaults to "dark" if not saved or localStorage unavailable
 */
function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Applies theme to the UI by:
 * 1. Normalizing theme to "light" or "dark"
 * 2. Setting data-theme attribute on body element for CSS styling
 * 3. Updating theme toggle button text to show opposite mode
 */
function applyTheme(theme) {
  const normalized = theme === "light" ? "light" : "dark";
  const bodyEl = document.body;
  if (bodyEl) {
    bodyEl.dataset.theme = normalized;
  }
  const toggleBtn = $("#theme-toggle");
  if (toggleBtn) {
    toggleBtn.textContent = normalized === "light" ? "Dark mode" : "Light mode";
  }
}

/**
 * Persists theme preference to localStorage and applies it to UI
 * Silently fails if localStorage is unavailable
 */
function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore storage issues
  }
  applyTheme(theme);
}

/**
 * Prevents XSS attacks by escaping HTML special characters to entities
 * Converts: & < > " '
 * Used before inserting user-generated content into the DOM
 */
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}

// ========================================
// NOTE CREATION & PERSISTENCE
// ========================================
/**
 * Creates a new note object with default values
 * - Generates unique ID using crypto.randomUUID or fallback timestamp
 * - Merges provided partial properties with defaults
 * @param {Object} partial - Partial note object with optional title, content, tags, createdAt, updatedAt
 * @returns {Object} Complete note object with all required properties
 */
function createNote(partial = {}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    title: partial.title || "",
    content: partial.content || "",
    tags: Array.isArray(partial.tags) ? partial.tags : [],
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
  };
}

/**
 * Saves current notes array to storage for the active user
 * Uses setNotes from storage.js to persist data
 */
function persistNotes() {
  setNotes(activeUser, notes);
}

/**
 * Ensures user always has at least one note
 * - Fetches sample notes from API if none exist
 * - Creates welcome note as fallback if API fails
 * - Sets first note as active note
 * - Persists notes to storage
 */
async function ensureAtLeastOneNote() {
  if (!notes.length) {
    const remote = await fetchSampleNotes();
    if (remote.length) {
      notes = remote.map((item) =>
        createNote({
          title: item.title,
          content: item.body,
          tags: ["remote"],
        })
      );
    } else {
      const initial = createNote({
        title: "Welcome to Notes Workspace",
        content:
          "This is your first note. Use the sidebar to switch notes, add tags above, and search from the top bar.\n\nYour notes are saved locally in this browser.",
        tags: ["ideas"],
      });
      notes.push(initial);
    }
    activeNoteId = notes[0].id;
    persistNotes();
  } else if (!activeNoteId) {
    activeNoteId = notes[0].id;
  }
}

/**
 * Retrieves notes from storage for current user
 * Ensures at least one note exists by calling ensureAtLeastOneNote()
 */
async function loadNotesForCurrentUser() {
  notes = getNotes(activeUser);
  await ensureAtLeastOneNote();
}

// ========================================
// USER DISPLAY & FORMATTING
// ========================================
/**
 * Updates header to show/hide user info based on login status
 * - Shows username if logged in, hides login/signup buttons
 * - Shows login/signup buttons if not logged in
 */
function updateUserDisplay() {
  const pill = $("#user-pill");
  const nameEl = $("#user-name");
  const loginBtn = $("#login");
  const signupBtn = $("#signup");

  if (!pill || !nameEl) return;

  if (activeUser) {
    pill.classList.remove("hidden");
    nameEl.textContent = `@${activeUser}`;
    loginBtn?.classList.add("hidden");
    signupBtn?.classList.add("hidden");
  } else {
    pill.classList.add("hidden");
    nameEl.textContent = "";
    loginBtn?.classList.remove("hidden");
    signupBtn?.classList.remove("hidden");
  }
}

/**
 * Converts ISO date to readable format (e.g., "Jan 15, 2025")
 * Returns empty string if date is invalid
 */
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ========================================
// FILTER, SEARCH & SORT UTILITIES
// ========================================
/**
 * Returns the currently selected filter tag (work, personal, ideas, etc.)
 * Defaults to "all" if no filter active
 */
function getActiveFilter() {
  const activeChip = document.querySelector(".filters .chip.active");
  return activeChip ? activeChip.dataset.filter || "all" : "all";
}

/**
 * Retrieves and normalizes search input text
 * Returns empty string if search box doesn't exist
 */
function getSearchQuery() {
  const input = $("#search");
  return input ? input.value.trim().toLowerCase() : "";
}

/**
 * Returns selected sort option (defaults to "updated_desc")
 * Possible values: "updated_desc", "updated_asc", "title_asc", "title_desc"
 */
function getSortMode() {
  const select = $("#sort");
  return select ? select.value : "updated_desc";
}

/**
 * Returns the selected date filter value
 * Format: YYYY-MM-DD
 */
function getSelectedDate() {
  const input = $("#date-filter");
  return input && input.value ? input.value : "";
}

/**
 * Applies all active filters, search, and sorting to notes
 * Process:
 * 1. Filter: Includes only notes with the selected tag (if not "all")
 * 2. Search: Matches query against title, content, and tags
 * 3. Date: Filters by creation/update date (if selected)
 * 4. Sort: Arranges by update date or title (ascending/descending)
 * @param {Array} baseNotes - Array of notes to filter and sort
 * @returns {Array} Filtered and sorted array of notes
 */
function applyFilterSearchAndSort(baseNotes) {
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
      const localDate = toLocalDateString(source);
      return localDate === selectedDate;
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

/**
 * Renders the notes list in the sidebar
 * Process:
 * 1. Clears existing list
 * 2. Applies filters, search, and sorting via applyFilterSearchAndSort()
 * 3. Shows empty message if no notes match filters/search
 * 4. For each note, creates a card with title, date, preview, and tags
 * 5. Highlights active note with "active" class
 * 6. Adds click handler to select note
 */
function renderNotesList() {
  const listEl = $("#notes-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const visibleNotes = applyFilterSearchAndSort(notes);
  if (!visibleNotes.length) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "note-item";
    emptyLi.innerHTML =
      '<div class="note-card"><p class="note-preview">No notes match your search or filters. Click “New note” to start or clear filters.</p></div>';
    listEl.appendChild(emptyLi);
    return;
  }

  visibleNotes.forEach((note) => {
    const li = document.createElement("li");
    li.className = "note-item" + (note.id === activeNoteId ? " active" : "");
    li.dataset.id = note.id;
    li.dataset.tags = (note.tags || []).join(", ");

    const btn = document.createElement("button");
    btn.className = "note-card";

    const plainContent = (note.content || "").replace(/<[^>]*>/g, "");
    const previewText =
      plainContent && plainContent.trim().length > 0
        ? plainContent.trim().slice(0, 120) + (plainContent.trim().length > 120 ? "…" : "")
        : "Empty note";

    const safeTitle = escapeHtml(note.title || "Untitled note");
    const safeDatetime = escapeHtml(note.updatedAt || "");
    const friendlyDate = escapeHtml(formatDate(note.updatedAt));
    const safePreview = escapeHtml(previewText);

    const tagsHtml = (note.tags || [])
      .map(
        (t) =>
          `<span class="tag" style="--tag-color:${getTagColor(t)}">${escapeHtml(t)}</span>`
      )
      .join("");

    btn.innerHTML = `
      <div class="note-meta">
        <h3 class="note-title">${safeTitle}</h3>
        <time class="note-time" datetime="${safeDatetime}">
          ${friendlyDate}
        </time>
      </div>
      <p class="note-preview">${safePreview}</p>
      <div class="tag-row">${tagsHtml}</div>
    `;

    btn.addEventListener("click", () => {
      setActiveNote(note.id);
    });

    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

/**
 * Populates the main editor with the active note's data
 * Process:
 * 1. Finds note by activeNoteId
 * 2. Fills title input with note title
 * 3. Fills content editor with note content
 * 4. Renders tag chips for each tag with remove handlers
 * 5. Highlights active note in sidebar list
 */
function renderActiveNote() {
  const note = notes.find((n) => n.id === activeNoteId);
  const titleInput = $("#title");
  const contentInput = $("#content");
  const tagsContainer = $("#tags");

  if (!note) {
    if (titleInput) titleInput.value = "";
    if (contentInput) contentInput.value = "";
    if (tagsContainer) tagsContainer.innerHTML = "";
    return;
  }

  if (titleInput) titleInput.value = note.title || "";
  if (contentInput) contentInput.innerHTML = note.content || "";

  if (tagsContainer) {
    tagsContainer.innerHTML = "";
    (note.tags || []).forEach((tag) => {
      const chip = document.createElement("button");
      chip.className = "chip small tag-chip";
      chip.textContent = tag;
      chip.type = "button";
      chip.style.setProperty("--tag-color", getTagColor(tag));
      chip.addEventListener("click", () => removeTagFromActiveNote(tag));
      tagsContainer.appendChild(chip);
    });
  }

  $all(".notes-list .note-item").forEach((li) => {
    li.classList.toggle("active", li.dataset.id === activeNoteId);
  });
}

/**
 * Sets a note as active and re-renders both list and editor UI
 * @param {string} noteId - ID of note to activate
 */
function setActiveNote(noteId) {
  activeNoteId = noteId;
  renderNotesList();
  renderActiveNote();
}

/**
 * Extracts all tag values from the tag container DOM elements
 * @returns {Array} Array of tag strings currently in the tags container
 */
function readTagsFromUI() {
  const tagsContainer = $("#tags");
  if (!tagsContainer) return [];
  return Array.from(tagsContainer.querySelectorAll(".chip.small")).map((el) => el.textContent.trim());
}

/**
 * Adds a tag to the active note if not already present
 * - Updates note's updatedAt timestamp
 * - Persists changes to storage
 * - Re-renders UI to reflect changes
 * @param {string} tag - Tag text to add
 */
function addTagToActiveNote(tag) {
  const trimmed = tag.trim();
  if (!trimmed) return;
  const note = notes.find((n) => n.id === activeNoteId);
  if (!note) return;
  note.tags = note.tags || [];
  if (!note.tags.includes(trimmed)) {
    note.tags.push(trimmed);
    note.updatedAt = new Date().toISOString();
    persistNotes();
    renderActiveNote();
    renderNotesList();
  }
}

/**
 * Removes a tag from the active note
 * - Updates note's updatedAt timestamp
 * - Persists changes to storage
 * - Re-renders UI to reflect changes
 * @param {string} tag - Tag text to remove
 */
function removeTagFromActiveNote(tag) {
  const note = notes.find((n) => n.id === activeNoteId);
  if (!note || !note.tags) return;
  note.tags = note.tags.filter((t) => t !== tag);
  note.updatedAt = new Date().toISOString();
  persistNotes();
  renderActiveNote();
  renderNotesList();
}

/**
 * Saves the active note with updated title, content, and tags from the editor UI
 * - Reads values from editor inputs
 * - Falls back to active filter as default tag if none specified
 * - Updates updatedAt timestamp
 * - Persists changes to storage
 * - Re-renders list to show updated dates
 */
function handleSaveNote() {
  const note = notes.find((n) => n.id === activeNoteId);
  if (!note) return;
  const titleInput = $("#title");
  const contentInput = $("#content");
  note.title = titleInput ? titleInput.value.trim() : "";
  note.content = contentInput ? contentInput.innerHTML : "";

  // Read tags from the UI; if none set, fall back to the active filter
  let tagsFromUi = readTagsFromUI();
  const activeFilter = getActiveFilter();
  if ((!tagsFromUi || !tagsFromUi.length) && activeFilter && activeFilter !== "all") {
    tagsFromUi = [activeFilter];
  }
  note.tags = tagsFromUi;

  note.updatedAt = new Date().toISOString();
  persistNotes();
  renderNotesList();
}

/**
 * Creates a new note with the current filter as initial tag
 * - Uses selected date filter as creation date if one is active
 * - Adds note to top of list (unshift)
 * - Sets new note as active
 * - Persists and renders UI
 */
function handleNewNote() {
  const activeFilter = getActiveFilter();
  const initialTags = activeFilter && activeFilter !== "all" ? [activeFilter] : [];
  const selectedDate = getSelectedDate();
  const nowIso = new Date().toISOString();
  const createdIso = selectedDate ? `${selectedDate}T00:00:00.000Z` : nowIso;
  const newNote = createNote({ tags: initialTags, createdAt: createdIso, updatedAt: createdIso });
  notes.unshift(newNote);
  activeNoteId = newNote.id;
  persistNotes();
  renderNotesList();
  renderActiveNote();
}

/**
 * Deletes the active note or clears its content if it's the last note
 * - If last note remains: clear title, content, tags but keep the note
 * - Otherwise: remove note and set first remaining note as active
 * - Persists changes and re-renders UI
 */
function handleDeleteNote() {
  if (!activeNoteId) return;
  if (notes.length === 1) {
    const only = notes[0];
    only.title = "";
    only.content = "";
    only.tags = [];
    only.updatedAt = new Date().toISOString();
    persistNotes();
    renderActiveNote();
    renderNotesList();
    return;
  }
  notes = notes.filter((n) => n.id !== activeNoteId);
  activeNoteId = notes[0] ? notes[0].id : null;
  persistNotes();
  renderNotesList();
  renderActiveNote();
}

/**
 * Creates a duplicate of the active note with "(Copy)" suffix
 * - Copies title, content, and tags
 * - Adds duplicate to top of notes list
 * - Sets duplicate as active note
 * - Persists and renders UI
 */
function handleDuplicateNote() {
  const note = notes.find((n) => n.id === activeNoteId);
  if (!note) return;
  const copy = createNote({
    title: note.title ? `${note.title} (Copy)` : "Untitled note (Copy)",
    content: note.content,
    tags: [...(note.tags || [])],
  });
  notes.unshift(copy);
  activeNoteId = copy.id;
  persistNotes();
  renderNotesList();
  renderActiveNote();
}

// ========================================
// EVENT HANDLERS & WIRING
// ========================================
/**
 * Wires up filter chips and search functionality
 * - Makes filter chips mutually exclusive (only one active at a time)
 * - Updates aria-pressed for accessibility
 * - Re-renders list on search input, date change
 * - Clear date button resets date filter
 */
function wireFiltersAndSearch() {
  $all(".filters .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $all(".filters .chip").forEach((c) => {
        const isTarget = c === chip;
        c.classList.toggle("active", isTarget);
        c.setAttribute("aria-pressed", String(isTarget));
      });
      renderNotesList();
    });
  });

  const searchInput = $("#search");
  searchInput?.addEventListener("input", () => renderNotesList());

  const dateInput = $("#date-filter");
  dateInput?.addEventListener("change", () => renderNotesList());

  const clearDateBtn = $("#clear-date");
  clearDateBtn?.addEventListener("click", () => {
    if (dateInput) {
      dateInput.value = "";
    }
    renderNotesList();
  });
}

/**
 * Wires up sort dropdown
 * Re-renders list whenever sort option changes
 */
function wireSort() {
  const select = $("#sort");
  select?.addEventListener("change", () => renderNotesList());
}

/**
 * Wires up tag input field
 * - Listens for Enter or comma key in tag input
 * - Adds tag when pressed and clears input
 */
function wireTagInput() {
  const addTagInput = $("#add-tag");
  if (!addTagInput) return;
  addTagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = addTagInput.value.replace(",", "").trim();
      if (value) addTagToActiveNote(value);
      addTagInput.value = "";
    }
  });
}

/**
 * Wires up CRUD operation buttons
 * - New: Creates new note
 * - Save: Saves active note
 * - Delete: Deletes active note
 * - Duplicate: Creates copy of active note
 */
function wireCrudButtons() {
  $("#new-note")?.addEventListener("click", handleNewNote);
  $("#save-note")?.addEventListener("click", handleSaveNote);
  $("#delete-note")?.addEventListener("click", handleDeleteNote);
  $("#duplicate-note")?.addEventListener("click", handleDuplicateNote);
}

/**
 * Inserts HTML at current cursor position in content editor
 * - Uses DOM selection API to find cursor position
 * - Fallback: appends to end if no selection
 */
function insertHtmlAtCursor(html) {
  const contentEl = $("#content");
  if (!contentEl) return;

  contentEl.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    contentEl.insertAdjacentHTML("beforeend", html);
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const fragment = range.createContextualFragment(html);
  range.insertNode(fragment);
}

/**
 * Wires up text formatting toolbar
 * - Bold, underline, bullet list buttons use execCommand
 * - Text size control with localStorage persistence
 * - Text color control with dropdown reset
 */
function wireFormattingToolbar() {
  const contentEl = $("#content");
  if (!contentEl) return;

  function applyFormat(command) {
    contentEl.focus();
    try {
      document.execCommand(command, false, null);
    } catch (e) {
      console.error("Formatting command failed", command, e);
    }
  }

  $("#format-bold")?.addEventListener("click", () => applyFormat("bold"));
  $("#format-underline")?.addEventListener("click", () => applyFormat("underline"));
  $("#format-bullet")?.addEventListener("click", () => applyFormat("insertUnorderedList"));

  // Text size control
  const textSizeSelect = $("#text-size");
  if (textSizeSelect) {
    // Load saved size preference
    try {
      const savedSize = localStorage.getItem("notesWorkspace.textSize") || "15";
      textSizeSelect.value = savedSize;
      contentEl.style.fontSize = `${savedSize}px`;
    } catch {
      contentEl.style.fontSize = "15px";
    }

    textSizeSelect.addEventListener("change", (e) => {
      const size = e.target.value;
      contentEl.style.fontSize = `${size}px`;
      try {
        localStorage.setItem("notesWorkspace.textSize", size);
      } catch {
        // ignore storage issues
      }
    });
  }

  // Text color control
  const textColorSelect = $("#text-color");
  if (textColorSelect) {
    textColorSelect.addEventListener("change", (e) => {
      const color = e.target.value;
      contentEl.focus();
      if (color) {
        try {
          document.execCommand("foreColor", false, color);
        } catch (err) {
          console.error("Color command failed", err);
        }
      } else {
        // Reset to default - remove color formatting from selection
        try {
          document.execCommand("removeFormat", false, null);
        } catch (err) {
          console.error("Remove format failed", err);
        }
      }
      // Reset dropdown to default after applying
      setTimeout(() => {
        textColorSelect.value = "";
      }, 100);
    });
  }
}

/**
 * Wires up image upload and table insertion features
 * - Image button: Triggers file picker and converts to base64 data URL
 * - Image click: Cycles through small→medium→large sizes
 * - Table button: Prompts for dimensions and inserts styled table
 */
function wireUploadButtons() {
  const contentEl = $("#content");
  if (!contentEl) return;

  const imageBtn = $("#insert-image");
  const imageInput = $("#image-upload-input");
  if (imageBtn && imageInput) {
    imageBtn.addEventListener("click", () => {
      imageInput.value = "";
      imageInput.click();
    });

    imageInput.addEventListener("change", () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (!dataUrl) return;
        const safeName = escapeHtml(file.name || "image");
        const html = `<figure class="note-image note-image-size-medium"><img src="${dataUrl}" alt="${safeName}" /><figcaption class="note-image-caption" contenteditable="true">Add caption…</figcaption></figure>`;
        insertHtmlAtCursor(html);
      };
      reader.readAsDataURL(file);
    });
  }

  const tableBtn = $("#insert-table");
  if (tableBtn) {
    tableBtn.addEventListener("click", () => {
      let rows = parseInt(prompt("Number of rows?", "3"), 10);
      let cols = parseInt(prompt("Number of columns?", "3"), 10);
      if (!Number.isFinite(rows) || rows <= 0) rows = 2;
      if (!Number.isFinite(cols) || cols <= 0) cols = 2;

      const tableRowsHtml = Array.from({ length: rows })
        .map((_, rowIndex) => {
          const cellTag = rowIndex === 0 ? "th" : "td";
          const cellsHtml = Array.from({ length: cols })
            .map(() => `<${cellTag}>&nbsp;</${cellTag}>`)
            .join("");
          return `<tr>${cellsHtml}</tr>`;
        })
        .join("");

      const tableHtml = `<table class="note-table note-table-striped"><tbody>${tableRowsHtml}</tbody></table>`;
      insertHtmlAtCursor(tableHtml);
    });
  }

  function findClosestTableFromSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    let node = selection.getRangeAt(0).commonAncestorContainer;
    while (node && node !== document) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "TABLE" && node.classList.contains("note-table")) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  contentEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    const figure = target.closest("figure.note-image");
    if (!figure) return;

    if (figure.classList.contains("note-image-size-small")) {
      figure.classList.remove("note-image-size-small");
      figure.classList.add("note-image-size-medium");
    } else if (figure.classList.contains("note-image-size-medium")) {
      figure.classList.remove("note-image-size-medium");
      figure.classList.add("note-image-size-large");
    } else if (figure.classList.contains("note-image-size-large")) {
      figure.classList.remove("note-image-size-large");
      figure.classList.add("note-image-size-small");
    } else {
      figure.classList.add("note-image-size-medium");
    }
  });
}

/**
 * Wires up authentication buttons
 * - Login/Signup: Navigate to signup page
 * - Logout: Save notes, clear user session, reset UI, navigate to signup
 */
function wireAuthButtons() {
  $("#login")?.addEventListener("click", () => {
    window.location.href = "./signup.html";
  });
  $("#signup")?.addEventListener("click", () => {
    window.location.href = "./signup.html";
  });
  $("#logout")?.addEventListener("click", () => {
    persistNotes();
    clearActiveUser();
    activeUser = null;
    loadNotesForCurrentUser();
    updateUserDisplay();
    renderNotesList();
    renderActiveNote();
    window.location.href = "./signup.html";
  });
}

/**
 * Formats all notes as plain text with metadata
 * Returns formatted string with title, tags, dates, and content for each note
 */
function formatNotesAsText() {
  if (!Array.isArray(notes) || notes.length === 0) {
    return "(No notes to export)";
  }

  return notes
    .map((note, index) => {
      const title = note.title || "Untitled note";
      const tags = (note.tags || []).join(", ") || "none";
      const created = note.createdAt || "";
      const updated = note.updatedAt || "";
      const content = note.content || "";

      const lines = [
        `=== NOTE ${index + 1} ===`,
        `Title: ${title}`,
        `Tags: ${tags}`,
      ];

      if (created) lines.push(`Created: ${created}`);
      if (updated) lines.push(`Updated: ${updated}`);

      lines.push("", "Content:");
      lines.push(content || "(empty)");
      lines.push("", "=== END NOTE " + (index + 1) + " ===", "");

      return lines.join("\n");
    })
    .join("\n");
}

/**
 * Exports all notes as a plain text file
 * - Formats notes using formatNotesAsText()
 * - Creates blob and triggers download as "notes-backup.txt"
 * - Cleans up resources (blob URL)
 */
function exportNotes() {
  const text = formatNotesAsText();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "notes-backup.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Wires up import/export button
 * Attaches export handler to export button
 */
function wireImportExport() {
  $("#export")?.addEventListener("click", exportNotes);
}

/**
 * Wires up theme toggle button
 * - Loads and applies stored theme on init
 * - Toggle button switches between light/dark and persists selection
 */
function wireThemeToggle() {
  const toggleBtn = $("#theme-toggle");
  if (!toggleBtn) {
    applyTheme(getStoredTheme());
    return;
  }

  applyTheme(getStoredTheme());

  toggleBtn.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
    persistTheme(nextTheme);
  });
}

// ========================================
// APP INITIALIZATION
// ========================================
/**
 * Initializes entire application
 * - Loads user and notes from storage
 * - Wires up all event handlers
 * - Renders initial UI
 */
async function initApp() {
  activeUser = getActiveUser();
  await loadNotesForCurrentUser();
  wireFiltersAndSearch();
  wireSort();
  wireTagInput();
  wireCrudButtons();
  wireFormattingToolbar();
  wireUploadButtons();
  wireAuthButtons();
  wireImportExport();
  wireThemeToggle();
  updateUserDisplay();
  renderNotesList();
  renderActiveNote();
}

/**
 * Waits for DOM to be ready before initializing the application
 * - If DOM is still loading: waits for DOMContentLoaded event
 * - Otherwise: calls initApp immediately
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initApp();
  });
} else {
  initApp();
}


