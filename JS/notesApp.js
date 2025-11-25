import { getNotes, setNotes, getActiveUser, clearActiveUser } from "./storage.js";
import { fetchSampleNotes } from "./apiClient.js";

const TAG_COLORS = {
  work: "#6aa6ff",
  personal: "#ff85a1",
  ideas: "#faca6b",
  todo: "#88ffc3",
  remote: "#b084ff",
};

let notes = [];
let activeNoteId = null;
let activeUser = null;

const $ = (selector) => document.querySelector(selector);
const $all = (selector) => Array.from(document.querySelectorAll(selector));

function getTagColor(tag) {
  if (!tag) return "#0f1526";
  return TAG_COLORS[tag.toLowerCase()] || "#4f6b95";
}

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

function persistNotes() {
  setNotes(activeUser, notes);
}

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

async function loadNotesForCurrentUser() {
  notes = getNotes(activeUser);
  await ensureAtLeastOneNote();
}

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

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getActiveFilter() {
  const activeChip = document.querySelector(".filters .chip.active");
  return activeChip ? activeChip.dataset.filter || "all" : "all";
}

function getSearchQuery() {
  const input = $("#search");
  return input ? input.value.trim().toLowerCase() : "";
}

function getSortMode() {
  const select = $("#sort");
  return select ? select.value : "updated_desc";
}

function applyFilterSearchAndSort(baseNotes) {
  const filter = getActiveFilter();
  const query = getSearchQuery();
  const sortMode = getSortMode();

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

function renderNotesList() {
  const listEl = $("#notes-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const visibleNotes = applyFilterSearchAndSort(notes);
  if (!visibleNotes.length) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "note-item";
    emptyLi.innerHTML =
      '<div class="note-card"><p class="note-preview">No notes yet. Click “New note” to start.</p></div>';
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

    btn.innerHTML = `
      <div class="note-meta">
        <h3 class="note-title">${note.title || "Untitled note"}</h3>
        <time class="note-time" datetime="${note.updatedAt || ""}">
          ${formatDate(note.updatedAt)}
        </time>
      </div>
      <p class="note-preview">${previewText}</p>
      <div class="tag-row">
        ${(note.tags || [])
          .map(
            (t) => `<span class="tag" style="--tag-color:${getTagColor(t)}">${t}</span>`
          )
          .join("")}
      </div>
    `;

    btn.addEventListener("click", () => {
      setActiveNote(note.id);
    });

    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

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

function setActiveNote(noteId) {
  activeNoteId = noteId;
  renderNotesList();
  renderActiveNote();
}

function readTagsFromUI() {
  const tagsContainer = $("#tags");
  if (!tagsContainer) return [];
  return Array.from(tagsContainer.querySelectorAll(".chip.small")).map((el) => el.textContent.trim());
}

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

function removeTagFromActiveNote(tag) {
  const note = notes.find((n) => n.id === activeNoteId);
  if (!note || !note.tags) return;
  note.tags = note.tags.filter((t) => t !== tag);
  note.updatedAt = new Date().toISOString();
  persistNotes();
  renderActiveNote();
  renderNotesList();
}

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

function handleNewNote() {
  const activeFilter = getActiveFilter();
  const initialTags = activeFilter && activeFilter !== "all" ? [activeFilter] : [];
  const newNote = createNote({ tags: initialTags });
  notes.unshift(newNote);
  activeNoteId = newNote.id;
  persistNotes();
  renderNotesList();
  renderActiveNote();
}

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
}

function wireSort() {
  const select = $("#sort");
  select?.addEventListener("change", () => renderNotesList());
}

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

function wireCrudButtons() {
  $("#new-note")?.addEventListener("click", handleNewNote);
  $("#save-note")?.addEventListener("click", handleSaveNote);
  $("#delete-note")?.addEventListener("click", handleDeleteNote);
  $("#duplicate-note")?.addEventListener("click", handleDuplicateNote);
}

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
}

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

function parseNotesFromTextFormat(text) {
  if (!text || typeof text !== "string") return [];

  const lines = text.split(/\r?\n/);
  const result = [];
  let current = null;
  let collectingContent = false;
  let contentLines = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("=== NOTE")) {
      current = { title: "", content: "", tags: [], createdAt: "", updatedAt: "" };
      collectingContent = false;
      contentLines = [];
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("=== END NOTE")) {
      current.content = contentLines.join("\n");
      if (!current.title && !current.content && (!current.tags || !current.tags.length)) {
        current = null;
        collectingContent = false;
        contentLines = [];
        continue;
      }
      result.push(current);
      current = null;
      collectingContent = false;
      contentLines = [];
      continue;
    }

    if (collectingContent) {
      contentLines.push(rawLine);
      continue;
    }

    if (line.toLowerCase().startsWith("title:")) {
      current.title = line.slice("title:".length).trim();
    } else if (line.toLowerCase().startsWith("tags:")) {
      const tagPart = line.slice("tags:".length).trim();
      current.tags = tagPart
        ? tagPart.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
    } else if (line.toLowerCase().startsWith("created:")) {
      current.createdAt = line.slice("created:".length).trim();
    } else if (line.toLowerCase().startsWith("updated:")) {
      current.updatedAt = line.slice("updated:".length).trim();
    } else if (line === "Content:") {
      collectingContent = true;
      contentLines = [];
    }
  }

  return result;
}

function importNotesFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");

    // First try JSON (backward compatible with existing exports)
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        notes = parsed.map((n) =>
          createNote({
            ...n,
            id: n.id || undefined,
          })
        );
        activeNoteId = notes[0] ? notes[0].id : null;
        persistNotes();
        renderNotesList();
        renderActiveNote();
        return;
      }
    } catch {
      // Not JSON, fall through to text parsing
    }

    // Try custom plain-text format
    const parsedTextNotes = parseNotesFromTextFormat(text);
    if (!parsedTextNotes.length) {
      alert("Import failed: file is not valid JSON or supported text format.");
      return;
    }

    notes = parsedTextNotes.map((n) =>
      createNote({
        title: n.title,
        content: n.content,
        tags: n.tags,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })
    );
    activeNoteId = notes[0] ? notes[0].id : null;
    persistNotes();
    renderNotesList();
    renderActiveNote();
  };
  reader.readAsText(file);
}

function wireImportExport() {
  $("#export")?.addEventListener("click", exportNotes);

  const fileInput = $("#importFile");
  const importBtn = $("#import");
  if (importBtn && fileInput) {
    importBtn.addEventListener("click", () => {
      // fileInput.value = "";
      fileInput.click();
    });
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) importNotesFromFile(file);
    });
  }
}

async function initApp() {
  activeUser = getActiveUser();
  await loadNotesForCurrentUser();
  wireFiltersAndSearch();
  wireSort();
  wireTagInput();
  wireCrudButtons();
  wireFormattingToolbar();
  wireAuthButtons();
  wireImportExport();
  updateUserDisplay();
  renderNotesList();
  renderActiveNote();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initApp();
  });
} else {
  initApp();
}


