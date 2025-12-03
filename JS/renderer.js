import { getTagColor, escapeHtml, formatDate } from "./utilities.js";
import { applyFilterSearchAndSort } from "./filterSearchSort.js";

const $ = (selector) => document.querySelector(selector);
const $all = (selector) => Array.from(document.querySelectorAll(selector));

export function renderNotesList(notes, activeNoteId, setActiveNote) {
  const listEl = $("#notes-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const visibleNotes = applyFilterSearchAndSort(notes);
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
