import { getTagColor, escapeHtml, formatDate, formatRelativeTime, showConfirm } from "./utilities.js";
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
  const createFolderPill = (id, name, color = "blue", isCustom = false) => {
    const li = document.createElement("li");
    const isActive = (id === activeFolderId || (!id && !activeFolderId));
    li.className = "folder-pill-container" + (isActive ? " active" : "");
    li.dataset.color = color || "blue";
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

      // Rename / Edit
      const renameBtn = document.createElement("button");
      renameBtn.className = "tab-action-btn rename";
      renameBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      renameBtn.title = "Edit Folder";
      renameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const renameEvent = new CustomEvent("rename-folder", { detail: { id } });
        document.dispatchEvent(renameEvent);
      });
      
      // Delete
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "tab-action-btn delete";
      deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      deleteBtn.title = "Delete Folder";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const deleteEvent = new CustomEvent("delete-folder", { detail: { id } });
        document.dispatchEvent(deleteEvent);
      });

      actions.appendChild(renameBtn);
      actions.appendChild(deleteBtn);
      pill.appendChild(actions);
    }

    li.appendChild(pill);
    return li;
  };

  // Custom Folders
  folders.forEach((folder) => {
    foldersEl.appendChild(createFolderPill(folder.id || folder._id, folder.name, folder.color, true));
  });
}

/**
 * Updates the visual active state of the sidebar (Library vs Folders)
 */
export function updateSidebarSelection(activeFolderId, activeLibraryId) {
  const libraryItems = document.querySelectorAll('.library-item');
  libraryItems.forEach(item => {
    if (activeLibraryId && item.id === activeLibraryId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * Updates the toolbar metadata (word count, char count, last saved).
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
    const text = raw.replace(/<[^>]*>/g, " ");
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const charCount = text.replace(/\s/g, "").length;
    metadataCount.textContent = `${wordCount} words / ${charCount} chars`;
  }
}

/**
 * Renders the dashboard grid with notes and 3D glassmorphic folders interleaved.
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
    const folder = folders.find(f => f.id === activeFolderId || f._id === activeFolderId || String(f.id) === String(activeFolderId) || String(f._id) === String(activeFolderId));
    const targetFolderIds = new Set();
    if (folder) {
      if (folder.id) targetFolderIds.add(String(folder.id));
      if (folder._id) targetFolderIds.add(String(folder._id));
    } else {
      targetFolderIds.add(String(activeFolderId));
    }
    filteredNotes = notes.filter(n => n.folderId && targetFolderIds.has(String(n.folderId)) && !n.isArchived);
    if (titleEl) titleEl.textContent = folder ? `Folder: ${folder.name}` : "Folder Notes";
  } else {
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

  // 3. Render 3D Glassmorphic Folders Section at Top (if applicable)
  if (showFoldersInGrid) {
    const foldersSection = document.createElement("div");
    foldersSection.className = "dashboard-3d-folders-container";

    const foldersHeader = document.createElement("div");
    foldersHeader.className = "dashboard-folders-header";
    foldersHeader.style.display = "flex";
    foldersHeader.style.alignItems = "center";
    foldersHeader.style.justifyContent = "space-between";
    foldersHeader.innerHTML = `
      <h3 class="dashboard-section-subtitle">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        Folders <span class="folders-count">(${folders.length})</span>
      </h3>
      <button type="button" class="btn ghost small create-folder-btn" id="header-create-folder" title="Create New Folder" style="display: flex; align-items: center; gap: 6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Folder
      </button>
    `;
    foldersSection.appendChild(foldersHeader);

    const foldersGrid = document.createElement("div");
    foldersGrid.className = "dashboard-3d-folders-grid";

    folders.forEach(folder => {
      const folderId = folder.id || folder._id;
      const folderColor = folder.color || "blue";
      const targetFolderIds = new Set();
      if (folder.id) targetFolderIds.add(String(folder.id));
      if (folder._id) targetFolderIds.add(String(folder._id));
      const notesInFolder = notes.filter(n => n.folderId && targetFolderIds.has(String(n.folderId)) && !n.isArchived);
      const noteCount = notesInFolder.length;

      const card = document.createElement("div");
      card.className = "folder-3d-card";
      card.dataset.id = folderId;
      card.dataset.color = folderColor;

      card.innerHTML = `
        <div class="folder-3d-wrapper">
          <!-- Back flap & tab -->
          <div class="folder-3d-back">
            <div class="folder-3d-tab"></div>
          </div>
          
          <!-- Paper documents stack -->
          <div class="folder-3d-papers">
            <div class="paper-sheet sheet-3"></div>
            <div class="paper-sheet sheet-2"></div>
            <div class="paper-sheet sheet-1">
              <div class="sheet-line"></div>
              <div class="sheet-line short"></div>
            </div>
          </div>
          
          <!-- Front glass pocket -->
          <div class="folder-3d-front">
            <div class="folder-3d-glass-lip"></div>
            <div class="folder-3d-badge">${noteCount} ${noteCount === 1 ? 'note' : 'notes'}</div>
          </div>

          <!-- Hover Quick Actions -->
          <div class="folder-3d-actions">
            <button type="button" class="folder-action-btn rename-btn" title="Edit Folder">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button type="button" class="folder-action-btn delete-btn" title="Delete Folder">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>

        <!-- Matching label beneath -->
        <span class="folder-3d-title">${escapeHtml(folder.name)}</span>
      `;

      // Folder Drag and Drop Target
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        card.classList.add("drag-over");
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });

      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over");
        const noteId = e.dataTransfer ? e.dataTransfer.getData("text/plain") : null;
        if (noteId) {
          const moveEvent = new CustomEvent("move-note-to-folder", {
            detail: { noteId, folderId }
          });
          document.dispatchEvent(moveEvent);
        }
      });

      // Main Folder Click -> Navigate
      const wrapper = card.querySelector('.folder-3d-wrapper');
      wrapper.addEventListener('click', (e) => {
        if (e.target.closest('.folder-3d-actions')) {
          return;
        }
        const navEvent = new CustomEvent('nav-folder', { detail: { id: folderId } });
        document.dispatchEvent(navEvent);
      });

      // Rename Click
      card.querySelector('.rename-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const renameEvent = new CustomEvent('rename-folder', { detail: { id: folderId } });
        document.dispatchEvent(renameEvent);
      });

      // Delete Click
      card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const deleteEvent = new CustomEvent('delete-folder', { detail: { id: folderId } });
        document.dispatchEvent(deleteEvent);
      });

      foldersGrid.appendChild(card);
    });

    foldersSection.appendChild(foldersGrid);
    gridEl.appendChild(foldersSection);
  }

  if (!visibleNotes.length && (!showFoldersInGrid || !folders.length)) {
    gridEl.innerHTML = '<div class="note-card empty-dashboard"><p>No items found. Start by creating a note or folder!</p></div>';
    return;
  }

  // 4. Render Notes
  visibleNotes.forEach((note, index) => {
    const card = document.createElement("div");
    
    // Determine card color theme (Amber, Emerald, Coral, Purple, Rose, Teal, Slate, Blue)
    const folderObj = note.folderId ? folders.find(f => f.id === note.folderId || f._id === note.folderId || String(f.id) === String(note.folderId) || String(f._id) === String(note.folderId)) : null;
    const colorList = ['amber', 'emerald', 'coral', 'purple', 'rose', 'teal', 'slate', 'blue'];
    let noteColor = note.color || note.theme;
    
    // Normalize old theme names
    if (noteColor === 'forest-green') noteColor = 'emerald';
    else if (noteColor === 'sunset-orange') noteColor = 'coral';
    else if (noteColor === 'classic-blue') noteColor = 'blue';
    else if (noteColor === 'elegant-purple') noteColor = 'purple';
    else if (noteColor === 'rose-gold') noteColor = 'rose';
    else if (noteColor === 'ocean-teal') noteColor = 'teal';
    else if (noteColor === 'slate-gray') noteColor = 'slate';

    if (!noteColor || !colorList.includes(noteColor)) {
      if (folderObj && folderObj.color) {
        noteColor = folderObj.color;
      } else {
        const hash = (note.id || note._id || note.title || String(index)).split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        noteColor = colorList[hash % colorList.length];
      }
    }

    card.className = "note-card";
    card.dataset.color = noteColor;
    card.dataset.id = note.id || note._id;
    card.setAttribute("draggable", "true");
    card.addEventListener("dragstart", (e) => {
      if (e.dataTransfer) {
        e.dataTransfer.setData("text/plain", note.id || note._id);
        e.dataTransfer.effectAllowed = "move";
      }
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });

    const rawContent = (note.content || "");
    const plainContent = rawContent.replace(/<[^>]*>/g, " ");
    const previewText = plainContent.trim().slice(0, 140) + (plainContent.trim().length > 140 ? "…" : "");

    // Extract image thumbnail if note has an <img> tag
    const imgMatch = rawContent.match(/<img[^>]+src=["']([^"']+)["']/i);
    let topPreviewHtml = "";
    if (imgMatch && imgMatch[1]) {
      topPreviewHtml = `
        <div class="note-card-top-preview note-card-media-preview">
          <img src="${escapeHtml(imgMatch[1])}" alt="Note image preview" loading="lazy" />
          <span class="note-media-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            JPEG
          </span>
        </div>
      `;
    } else if (plainContent.trim()) {
      topPreviewHtml = `
        <div class="note-card-top-preview note-card-preview-text">
          <p>${escapeHtml(previewText)}</p>
        </div>
      `;
    } else if (note.drawing || note.sketch || (note.tags && note.tags.some(t => t.toLowerCase() === 'drawing' || t.toLowerCase() === 'sketch'))) {
      topPreviewHtml = `
        <div class="note-card-top-preview note-card-preview-sketch">
          <svg viewBox="0 0 180 130" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="width: 82%; height: 82%;">
            <defs>
              <pattern id="card-hatch-${index}" width="5" height="5" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" stroke-width="1.5" />
              </pattern>
            </defs>
            <circle cx="82" cy="62" r="36" stroke-width="2.2" />
            <path d="M 82 26 L 82 62 L 116 52" stroke-width="2.5" />
            <path d="M 82 62 L 52 88" stroke-width="2.5" />
            <polygon points="82,62 96,28 82,26" fill="currentColor" />
            <path d="M 82 62 L 116 52 A 36 36 0 0 1 66 96 Z" fill="url(#card-hatch-${index})" stroke-width="2" />
          </svg>
        </div>
      `;
    } else {
      topPreviewHtml = `
        <div class="note-card-top-preview note-card-preview-text empty-preview">
          <p style="opacity: 0.5; font-style: italic;">No additional content</p>
        </div>
      `;
    }

    // Determine circular bottom-right icon badge based on note color/type (matches user prompt design image!)
    let badgeIconSvg = "";
    if (noteColor === "amber") {
      // Puzzle piece icon (matches Drawing note in user screenshot)
      badgeIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.439 7.85c-.049-.322.059-.648.289-.878l1.564-1.564a2.218 2.218 0 0 0-3.137-3.137l-1.564 1.564c-.23.23-.556.338-.878.289a3.218 3.218 0 0 0-3.665 2.19 3.218 3.218 0 0 0-2.008 2.008c-.049.322-.338.556-.878.289l-1.564-1.564a2.218 2.218 0 0 0-3.137 3.137l1.564 1.564c.23.23.338.556.289.878a3.218 3.218 0 0 0 2.19 3.665 3.218 3.218 0 0 0 2.008 2.008c.322.049.556.338.289.878l-1.564 1.564a2.218 2.218 0 0 0 3.137 3.137l1.564-1.564c.23-.23.556-.338.878-.289a3.218 3.218 0 0 0 3.665-2.19 3.218 3.218 0 0 0 2.008-2.008c.049-.322.338-.556.878-.289l1.564 1.564a2.218 2.218 0 0 0 3.137-3.137l-1.564-1.564c-.23-.23-.338-.556-.289-.878a3.218 3.218 0 0 0-2.19-3.665z"/></svg>`;
    } else if (noteColor === "emerald") {
      // Paint palette icon (matches Art classes note in user screenshot)
      badgeIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.71 1.7-1.63 0-.44-.17-.85-.46-1.15-.29-.3-.46-.71-.46-1.16 0-.92.76-1.66 1.68-1.66h2.12c2.97 0 5.42-2.45 5.42-5.42 0-4.97-4.48-9-10-9z"/></svg>`;
    } else if (noteColor === "purple") {
      // Sparkles AI icon
      badgeIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg>`;
    } else if (noteColor === "rose") {
      // Heart icon
      badgeIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    } else if (noteColor === "coral") {
      // Idea flame icon
      badgeIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
    } else if (noteColor === "teal") {
      // Compass icon
      badgeIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`;
    } else if (noteColor === "slate") {
      // Code brackets icon
      badgeIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
    } else {
      // Default Blue Document icon
      badgeIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    }

    const archiveIcon = note.isArchived 
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M3 14v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6M8 12h8"/></svg>`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;

    const timeLabelText = formatRelativeTime(note.updatedAt || note.createdAt);

    card.innerHTML = `
      <!-- Top Media / Visual Sketch Preview -->
      ${topPreviewHtml}

      <!-- Bottom Details & Badge -->
      <div class="note-card-bottom">
        <div class="note-card-meta">
          <h3 class="note-card-title">${escapeHtml(note.title || "Untitled note")}</h3>
          <time class="note-card-time">${escapeHtml(timeLabelText)}</time>
        </div>
        <div class="note-card-badge-icon" title="Note Category">
          ${badgeIconSvg}
        </div>
      </div>

      <!-- Quick Hover Actions -->
      <div class="note-card-hover-actions">
        <button type="button" class="note-card-action-btn note-folder-trigger" title="Move to Folder">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button type="button" class="note-card-action-btn note-color-trigger" title="Change Color">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z"/></svg>
        </button>
        <button type="button" class="note-card-action-btn note-card-archive" title="${note.isArchived ? 'Unarchive' : 'Archive'} Note">
          ${archiveIcon}
        </button>
        <button type="button" class="note-card-action-btn note-card-delete delete-btn" title="Delete Note">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>

      <!-- Color Popover Swatches -->
      <div class="folder-3d-color-popover note-card-color-popover hidden">
        <button type="button" class="swatch swatch-blue ${noteColor==='blue'?'active':''}" data-color="blue" title="Blue"></button>
        <button type="button" class="swatch swatch-amber ${noteColor==='amber'?'active':''}" data-color="amber" title="Amber"></button>
        <button type="button" class="swatch swatch-coral ${noteColor==='coral'?'active':''}" data-color="coral" title="Coral"></button>
        <button type="button" class="swatch swatch-emerald ${noteColor==='emerald'?'active':''}" data-color="emerald" title="Emerald"></button>
        <button type="button" class="swatch swatch-purple ${noteColor==='purple'?'active':''}" data-color="purple" title="Purple"></button>
        <button type="button" class="swatch swatch-rose ${noteColor==='rose'?'active':''}" data-color="rose" title="Rose"></button>
        <button type="button" class="swatch swatch-teal ${noteColor==='teal'?'active':''}" data-color="teal" title="Teal"></button>
        <button type="button" class="swatch swatch-slate ${noteColor==='slate'?'active':''}" data-color="slate" title="Slate"></button>
      </div>

      <!-- Move to Folder Popover -->
      <div class="note-card-folder-popover hidden">
        <div class="popover-folder-option ${!note.folderId ? 'active' : ''}" data-folder-id="">
          <span>Root Workspace</span>
        </div>
        ${folders.map(f => `
          <div class="popover-folder-option ${(note.folderId === f.id || note.folderId === f._id) ? 'active' : ''}" data-folder-id="${f.id || f._id}">
            <span>${escapeHtml(f.name)}</span>
          </div>
        `).join('')}
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest('.note-card-hover-actions') || e.target.closest('.note-card-color-popover') || e.target.closest('.note-card-folder-popover')) {
        return;
      }
      setActiveNote(note.id || note._id);
    });

    // Move to Folder Trigger
    const folderTrigger = card.querySelector('.note-folder-trigger');
    const folderPopover = card.querySelector('.note-card-folder-popover');
    if (folderTrigger && folderPopover) {
      folderTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        folderPopover.classList.toggle('hidden');
      });

      folderPopover.querySelectorAll('.popover-folder-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetFolderId = opt.dataset.folderId || null;
          folderPopover.classList.add('hidden');
          const moveEvent = new CustomEvent('move-note-to-folder', {
            detail: { noteId: note.id || note._id, folderId: targetFolderId }
          });
          document.dispatchEvent(moveEvent);
        });
      });
    }

    // Quick Color Trigger Button
    const colorBtn = card.querySelector('.note-color-trigger');
    const popover = card.querySelector('.note-card-color-popover');
    if (colorBtn && popover) {
      colorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popover.classList.toggle('hidden');
      });

      popover.querySelectorAll('.swatch').forEach(swatch => {
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          const selectedColor = swatch.dataset.color;
          card.dataset.color = selectedColor;
          note.color = selectedColor;
          note.theme = selectedColor;
          popover.classList.add('hidden');
          const updateEvent = new CustomEvent('update-note-color', {
            detail: { id: note.id || note._id, color: selectedColor }
          });
          document.dispatchEvent(updateEvent);
        });
      });
    }

    const archiveBtn = card.querySelector(".note-card-archive");
    if (archiveBtn && callbacks) {
      archiveBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (note.isArchived) {
          callbacks.unarchiveNote(note.id || note._id);
        } else {
          callbacks.archiveNote(note.id || note._id);
        }
      });
    }

    const deleteBtn = card.querySelector(".note-card-delete");
    if (deleteBtn && callbacks) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.deleteNote(note.id || note._id);
      });
    }

    gridEl.appendChild(card);
  });
}

/**
 * Renders skeletal loaders in the dashboard grid while fetching notes/folders.
 * @param {string|null} activeFolderId - The active folder ID.
 * @param {string} activeLibraryFilter - The active library filter.
 */
export function renderDashboardSkeletons(activeFolderId, activeLibraryFilter) {
  const gridEl = $("#dashboard-grid");
  if (!gridEl) return;
  gridEl.innerHTML = "";

  const titleEl = $(".dashboard-title");
  const statsEl = $("#dashboard-stats");

  if (statsEl) {
    statsEl.textContent = "Loading...";
  }

  // 1. Set title based on current filter/folder
  if (activeLibraryFilter === 'favorites') {
    if (titleEl) titleEl.textContent = "Favorite Notes";
  } else if (activeLibraryFilter === 'archived') {
    if (titleEl) titleEl.textContent = "Archived Notes";
  } else if (activeFolderId) {
    if (titleEl) titleEl.textContent = "Folder Notes";
  } else {
    if (titleEl) titleEl.textContent = "My Workspace";
  }

  // 2. Render Folder Skeletons (only if in All Notes / My Workspace view)
  const showFolders = !activeFolderId && activeLibraryFilter !== 'favorites' && activeLibraryFilter !== 'archived';
  if (showFolders) {
    const foldersRow = document.createElement("div");
    foldersRow.className = "dashboard-folders-icons-row skeleton-folders-row";
    
    // Render 3 folder skeletons
    for (let i = 0; i < 3; i++) {
      const folderItem = document.createElement("div");
      folderItem.className = "dashboard-folder-icon-item skeleton-folder-loader";
      folderItem.innerHTML = `
        <div class="folder-mini-info">
          <div class="skeleton-icon skeleton"></div>
          <div class="skeleton-text skeleton" style="width: ${60 + (i * 10)}px;"></div>
        </div>
      `;
      foldersRow.appendChild(folderItem);
    }
    gridEl.appendChild(foldersRow);
  }

  // 3. Render 6 Note Skeletons
  for (let i = 0; i < 6; i++) {
    const card = document.createElement("div");
    card.className = "note-card skeleton-note-loader";
    card.innerHTML = `
      <div class="skeleton-title skeleton"></div>
      <div class="skeleton-line skeleton" style="width: 90%;"></div>
      <div class="skeleton-line skeleton" style="width: 80%;"></div>
      <div class="skeleton-line skeleton" style="width: 50%;"></div>
      <div class="skeleton-footer-loader">
        <div class="skeleton-footer skeleton"></div>
      </div>
    `;
    gridEl.appendChild(card);
  }
}

