import { getTagColor, escapeHtml, formatDate } from "./utilities.js";
import { applyFilterSearchAndSort } from "./filterSearchSort.js";
import { getFolders } from "./folderManager.js";

const $ = (selector) => document.querySelector(selector);
const $all = (selector) => Array.from(document.querySelectorAll(selector));

export function renderNotesList(notes, activeNoteId, setActiveNote, activeFolderId) {
  const listEl = $("#notes-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  // Filter notes by folder
  // - When a specific folder is selected, show only notes in that folder
  // - When "All Notes" is selected (activeFolderId === null), show only notes not in any folder
  let notesToDisplay = notes;
  if (activeFolderId === null) {
    notesToDisplay = notes.filter((note) => !note.folderId);
  } else if (activeFolderId !== undefined) {
    notesToDisplay = notes.filter((note) => note.folderId === activeFolderId);
  }

  const visibleNotes = applyFilterSearchAndSort(notesToDisplay);
  if (!visibleNotes.length) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "note-item";
    emptyLi.innerHTML =
      '<div class="note-card"><p class="note-preview">No notes match your search or filters. Click "New note" to start or clear filters.</p></div>';
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

export function renderActiveNote(note, removeTagFromActiveNote) {
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
    li.classList.toggle("active", li.dataset.id === note.id);
  });
}

export function updateUserDisplay(activeUser) {
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
 * Render folder list in sidebar
 * @param {Array} folders - All folders
 * @param {string} activeFolderId - Currently selected folder ID
 * @param {Function} setActiveFolder - Callback to set active folder
 */
export function renderFolders(folders, activeFolderId, setActiveFolder) {
  const foldersEl = $("#folders-list");
  if (!foldersEl) return;
  foldersEl.innerHTML = "";

  // Add "All Notes" (unfiled notes) option
  const allNotesLi = document.createElement("li");
  allNotesLi.className = "folder-item" + (activeFolderId === null ? " active" : "");
  const allNotesBtn = document.createElement("button");
  allNotesBtn.className = "folder-btn folder-btn-root";
  allNotesBtn.textContent = "All notes";
  allNotesBtn.addEventListener("click", () => setActiveFolder(null));
  allNotesLi.appendChild(allNotesBtn);
  foldersEl.appendChild(allNotesLi);

  // Add folder items
  folders.forEach((folder) => {
    const li = document.createElement("li");
    li.className = "folder-item" + (folder.id === activeFolderId ? " active" : "");
    li.dataset.id = folder.id;

    const row = document.createElement("div");
    row.className = "folder-row";

    const btn = document.createElement("button");
    btn.className = "folder-btn folder-btn-folder";
    btn.textContent = folder.name ? escapeHtml(folder.name) : "Untitled folder";
    btn.addEventListener("click", () => setActiveFolder(folder.id));

    const actions = document.createElement("div");
    actions.className = "folder-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "folder-action-btn folder-rename-btn";
    renameBtn.title = "Rename folder";
    renameBtn.innerHTML = "✏️";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "folder-action-btn folder-delete-btn";
    deleteBtn.title = "Delete folder";
    deleteBtn.innerHTML = "🗑";

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(btn);
    row.appendChild(actions);

    li.appendChild(row);
    foldersEl.appendChild(li);
  });
}
