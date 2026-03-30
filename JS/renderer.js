import { getTagColor, escapeHtml, formatDate, showConfirm } from "./utilities.js";
import { applyFilterSearchAndSort } from "./filterSearchSort.js";
//import { getFolders } from "./folderManager.js";

const $ = (selector) => document.querySelector(selector);
const $all = (selector) => Array.from(document.querySelectorAll(selector));

// Renders the list of notes in the sidebar, filtered by folder and search criteria
// NOTE: Rendering list items in sidebar is now disabled as per user request to prioritize grid view.
export function renderNotesList(notes, activeNoteId, setActiveNote, activeFolderId, noteActions) {
  const listEl = $("#notes-list");
  if (!listEl) return;
  listEl.innerHTML = "";
  // Sidebar list is cleared; notes are now only primary in the dashboard grid.
}

// Displays the currently selected note in the main editor area
export function renderActiveNote(note, removeTagFromActiveNote) {
  const titleInput = $("#title");
  const contentInput = $("#content");
  const tagsContainer = $("#tags");
  const editorSection = $(".editor");

  const dashboardView = $("#dashboard-view");
  const editorView = $("#editor-view");
  const layout = $(".layout");

  if (!note) {
    if (dashboardView) dashboardView.classList.remove("hidden");
    if (editorView) editorView.classList.add("hidden");
    if (layout) layout.classList.remove("fullscreen-editor");

    if (titleInput) titleInput.value = "";
    if (contentInput) {
      contentInput.innerHTML = "";
      contentInput.removeAttribute("data-pattern");
    }
    if (tagsContainer) tagsContainer.innerHTML = "";
    if (editorSection) editorSection.removeAttribute("data-theme");
    return;
  }

  // Switch to Editor View
  if (dashboardView) dashboardView.classList.add("hidden");
  if (editorView) editorView.classList.remove("hidden");
  if (layout) layout.classList.add("fullscreen-editor");

  if (titleInput) titleInput.value = note.title || "";
  if (contentInput) {
    contentInput.innerHTML = note.content || "";
    // Apply editor pattern
    contentInput.setAttribute("data-pattern", note.editorPattern || "plain");
  }

  // Update Favorite Button State
  const favBtn = $("#toggle-favorite");
  const favIcon = favBtn?.querySelector("svg");
  if (favBtn && favIcon) {
    if (note.isFavorite) {
      favIcon.setAttribute("fill", "currentColor");
      favIcon.style.fill = "currentColor"; // Force fill via style
      favBtn.classList.add("active");
      favBtn.style.color = "var(--accent)"; // Gold color for star
    } else {
      favIcon.setAttribute("fill", "none");
      favIcon.style.fill = ""; // Clear forced fill
      favBtn.classList.remove("active");
      favBtn.style.color = ""; // Reset
    }
  }

  // Update Toolbar Metadata
  updateToolbarMetadata(note);

  // Apply editor theme
  if (editorSection) {
    if (note.theme) {
      editorSection.setAttribute("data-theme", note.theme);
    } else {
      editorSection.removeAttribute("data-theme");
    }
  }

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
  }//check this

  // Update Archive Button State in overflow menu
  const archiveBtn = $("#archive-note");
  if (archiveBtn) {
    const archiveIcon = note.isArchived 
      ? `<svg class="overflow-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M3 14v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6M8 12h8"/></svg>`
      : `<svg class="overflow-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
    
    archiveBtn.innerHTML = `${archiveIcon} ${note.isArchived ? 'Unarchive' : 'Archive'}`;
  }

  $all(".notes-list .note-item").forEach((li) => {
    li.classList.toggle("active", li.dataset.id === note.id);
  });
}

// Updates the UI to show/hide user information and auth buttons
export function updateUserDisplay(activeUser) {
  const pill = $("#user-pill");
  const nameEl = $("#user-name");
  const loginBtn = $("#login");


  if (!pill || !nameEl) return;

  if (activeUser) {
    pill.classList.remove("hidden");
    nameEl.textContent = `@${activeUser} `;
    loginBtn?.classList.add("hidden");
  } else {
    pill.classList.add("hidden");
    nameEl.textContent = "";
    loginBtn?.classList.remove("hidden");
  }
}

/**
 * Render folder list in sidebar
 * @param {Array} folders - All folders
 * @param {string} activeFolderId - Currently selected folder ID
 * @param {Function} setActiveFolder - Callback to set active folder
 */
// Renders the folders list in the sidebar with the currently active folder highlighted
const FOLDER_ICON = `<svg class="folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
const ALL_NOTES_ICON = `<svg class="folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;

export function renderFolders(folders, activeFolderId, setActiveFolder) {
  const foldersEl = $("#folders-list");
  if (!foldersEl) return;
  foldersEl.innerHTML = "";

  // Helper to create pill
  const createFolderPill = (id, name, isCustom = false) => {
    const li = document.createElement("li");
    const isActive = (id === activeFolderId || (!id && !activeFolderId));
    li.className = "folder-pill-container" + (isActive ? " active" : "");
    if (isCustom) {
      li.dataset.dragId = id;
      li.dataset.id = id;
    }

    const pill = document.createElement("div");
    pill.className = "folder-tab";
    pill.addEventListener("click", () => setActiveFolder(id));

    // Name & Icon
    const btn = document.createElement("div");
    btn.className = "folder-tab-btn";
    const iconHtml = FOLDER_ICON;
    btn.innerHTML = `<span class="tab-icon">${iconHtml}</span> <span class="tab-name">${escapeHtml(name)}</span>`;

    pill.appendChild(btn);

    if (isCustom) {
      const actions = document.createElement("div");
      actions.className = "tab-actions";

      // Rename
      const renameBtn = document.createElement("button");
      renameBtn.className = "tab-action-btn rename";
      renameBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      renameBtn.title = "Rename";
      
      // Delete
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "tab-action-btn delete";
      deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      deleteBtn.title = "Delete";

      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
      pill.appendChild(actions);
    }

    li.appendChild(pill);
    return li;
  };

  // 1. "All Notes" Pill removed as requested
  
  // 2. Custom Folders
  folders.forEach((folder) => {
    foldersEl.appendChild(createFolderPill(folder.id, folder.name, true));
  });
}

/**
 * Updates the visual active state of the sidebar (Library vs Folders)
 * @param {string|null} activeFolderId - The currently active folder ID (or null)
 * @param {string|null} activeLibraryId - The ID of the active library item (e.g., 'nav-all-notes', 'nav-recent')
 */
export function updateSidebarSelection(activeFolderId, activeLibraryId) {
  // 1. Handle Library Items
  const libraryItems = document.querySelectorAll('.library-item');
  libraryItems.forEach(item => {
    if (activeLibraryId && item.id === activeLibraryId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // 2. Handle Folders
  const folderItems = document.querySelectorAll('.folder-pill-container');
  folderItems.forEach(item => {
    // If we have a folder ID, highlight it. 
    if (activeFolderId && !activeLibraryId && item.dataset.id === activeFolderId) {
      // Note: In renderFolders we used dataset.dragId for custom folders.
      // Let's rely on the fact renderFolders handles its own active state class assignment during render,
      // BUT we might need to clear it if a Library item is clicked without re-rendering?
      // Actually, renderFolders rerenders the list. So we just need to make sure we don't accidentally keep one active.
      // Use logic: If activeLibraryId is present, ensure no folder is active.
      // Wait, renderFolders takes activeFolderId. If we pass null, it highlights nothing.
      // So we just need to handle the Library side.
    }
  });

  // If activeLibraryId is passed, we highlight that.
  // We assume renderFolders is called separately with the correct ID.
}

/**
 * Updates the toolbar metadata (word count, char count, last saved).
 * @param {Object} note - The current note object.
 * @param {string} [overrideContent] - Optional DOM content if we want real-time updates without saving yet.
 */
export function updateToolbarMetadata(note, overrideContent) {
  if (!note) return;

  const metadataTime = $("#metadata-time");
  const metadataCount = $("#metadata-count");

  if (metadataTime) {
    metadataTime.textContent = `Last edited: ${formatDate(note.updatedAt)}`;
  }

  if (metadataCount) {
    const raw = overrideContent !== undefined ? overrideContent : (note.content || "");
    // Strip HTML once
    const text = raw.replace(/<[^>]*>/g, " ");
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const charCount = text.replace(/\s/g, "").length; // use clean text for char count too or similar
    metadataCount.textContent = `${wordCount} words / ${charCount} chars`;
  }
}

/**
 * Renders the dashboard grid with notes and folders interleaved.
 */
export function renderNotesDashboard(notes, folders, activeFolderId, activeLibraryFilter, setActiveNote, callbacks) {
  const gridEl = $("#dashboard-grid");
  const titleEl = $(".dashboard-title");
  const statsEl = $("#dashboard-stats");

  if (!gridEl) return;
  gridEl.innerHTML = "";

  let filteredNotes = [];
  let showFoldersInGrid = false;

  // 1. Determine which notes and whether folders should be shown
  if (activeLibraryFilter === 'favorites') {
    filteredNotes = notes.filter(n => n.isFavorite && !n.isArchived);
    if (titleEl) titleEl.textContent = "Favorite Notes";
  } else if (activeLibraryFilter === 'archived') {
    filteredNotes = notes.filter(n => n.isArchived);
    if (titleEl) titleEl.textContent = "Archived Notes";
  } else if (activeFolderId) {
    // Specific Folder Selected
    filteredNotes = notes.filter(n => n.folderId === activeFolderId && !n.isArchived);
    const folder = folders.find(f => f.id === activeFolderId);
    if (titleEl) titleEl.textContent = folder ? `Folder: ${folder.name}` : "Folder Notes";
  } else {
    // My Workspace / All Notes
    // User wants folders integrated in this view
    filteredNotes = notes.filter(n => !n.folderId && !n.isArchived);
    if (titleEl) titleEl.textContent = "My Workspace";
    showFoldersInGrid = true;
  }

  // 2. Apply Sort/Search to visible items
  const visibleNotes = applyFilterSearchAndSort(filteredNotes);
  
  if (statsEl) {
    const totalItems = visibleNotes.length + (showFoldersInGrid ? folders.length : 0);
    statsEl.textContent = `${totalItems} items`;
  }

  // 3. Render Folder Icons at Top (if applicable)
  if (showFoldersInGrid && folders.length > 0) {
    const foldersRow = document.createElement("div");
    foldersRow.className = "dashboard-folders-icons-row";
    
    folders.forEach(folder => {
      const folderItem = document.createElement("div");
      folderItem.className = "dashboard-folder-icon-item";
      folderItem.addEventListener("click", () => {
        const navEvent = new CustomEvent('nav-folder', { detail: { id: folder.id } });
        document.dispatchEvent(navEvent);
      });

      folderItem.innerHTML = `
        <div class="folder-mini-info">
          <div class="folder-mini-icon">${FOLDER_ICON}</div>
          <span class="folder-mini-name">${escapeHtml(folder.name)}</span>
        </div>
        <div class="folder-mini-actions">
          <button class="folder-mini-action rename" title="Rename Folder">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="folder-mini-action delete" title="Delete Folder">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      // Set dataset id for event handlers
      folderItem.dataset.id = folder.id;

      // Navigate on clicking info area
      folderItem.querySelector('.folder-mini-info').addEventListener('click', (e) => {
        e.stopPropagation();
        const navEvent = new CustomEvent('nav-folder', { detail: { id: folder.id } });
        document.dispatchEvent(navEvent);
      });

      folderItem.querySelector('.folder-mini-action.rename').addEventListener('click', (e) => {
        e.stopPropagation();
        const renameEvent = new CustomEvent('rename-folder', { detail: { id: folder.id } });
        document.dispatchEvent(renameEvent);
      });

      folderItem.querySelector('.folder-mini-action.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        const deleteEvent = new CustomEvent('delete-folder', { detail: { id: folder.id } });
        document.dispatchEvent(deleteEvent);
      });

      foldersRow.appendChild(folderItem);
    });

    gridEl.appendChild(foldersRow);
  }

  if (!visibleNotes.length && (!showFoldersInGrid || !folders.length)) {
    gridEl.innerHTML = '<div class="note-card empty-dashboard"><p>No items found. Start by creating a note or folder!</p></div>';
    return;
  }

  // 4. Render Notes
  visibleNotes.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card";
    if (note.theme) card.setAttribute("data-theme", note.theme);

    const rawContent = (note.content || "");
    const plainContent = rawContent.replace(/<[^>]*>/g, " ");
    const previewText = plainContent.trim().slice(0, 150) + (plainContent.trim().length > 150 ? "…" : "");

    const archiveIcon = note.isArchived 
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M3 14v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6M8 12h8"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;

    const tagsHtml = (note.tags && note.tags.length > 0)
      ? `<div class="note-card-tags">${note.tags.map(tag => `<span class="chip small tag-chip" style="--tag-color:${getTagColor(tag)}">${escapeHtml(tag)}</span>`).join('')}</div>`
      : '';

    card.innerHTML = `
      <h3 class="note-title">${escapeHtml(note.title || "Untitled note")}</h3>
      <p class="note-preview-compact">${escapeHtml(previewText || "Empty note")}</p>
      ${tagsHtml}
      <div class="note-card-footer">
        <time class="note-time-label">${formatDate(note.updatedAt)}</time>
        <div class="note-card-actions">
           <button class="note-card-archive" title="${note.isArchived ? 'Unarchive' : 'Archive'} Note">
            ${archiveIcon}
          </button>
          <button class="note-card-delete" title="Delete Note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;

    card.addEventListener("click", () => setActiveNote(note.id));

    const archiveBtn = card.querySelector(".note-card-archive");
    if (archiveBtn && callbacks) {
      archiveBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (note.isArchived) {
          callbacks.unarchiveNote(note.id);
        } else {
          callbacks.archiveNote(note.id);
        }
      });
    }

    const deleteBtn = card.querySelector(".note-card-delete");
    if (deleteBtn && callbacks) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.deleteNote(note.id);
      });
    }

    gridEl.appendChild(card);
  });
}
