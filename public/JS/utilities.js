// ========================================
// TAG & COLOR UTILITIES
// ========================================
const TAG_COLORS = {
  work: "#6aa6ff",
  personal: "#ff85a1",
  ideas: "#faca6b",
  todo: "#88ffc3",
  remote: "#b084ff",
};

// Returns a color associated with a tag, or a default color if none is defined
export function getTagColor(tag) {
  if (!tag) return "#0f1526";
  // Check case-insensitive
  const lowerTag = tag.toLowerCase();
  if (TAG_COLORS[lowerTag]) {
    return TAG_COLORS[lowerTag];
  }
  return "#4f6b95"; // Default fallback
}

// Registers a set of custom tags with their colors
export function registerCustomTags(customTags) {
  customTags.forEach(tag => {
    if (tag.name && tag.color) {
      TAG_COLORS[tag.name.toLowerCase()] = tag.color;
    }
  });
}

// ========================================
// DATE UTILITIES
// ========================================
// Converts a date-like object to a localized date string (YYYY-MM-DD format)
export function toLocalDateString(dateLike) {
  if (!dateLike) return "";
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-CA");
}

// Formats an ISO date string into a more readable format (e.g., 'Jan 1, 2023')
export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Formats an ISO date string into a relative format (e.g. '20h ago', '1 day ago')
export function formatRelativeTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 0) return formatDate(iso);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 2) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(iso);
}

// ========================================
// HTML ESCAPING UTILITY
// ========================================
// Escapes HTML special characters to prevent XSS attacks
export function escapeHtml(str = "") {
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
// UNIFIED APPS & TOOLS DROPDOWN WIRING
// ========================================
export function wireAppsDropdown() {
    const toggle = document.getElementById("apps-dropdown-toggle");
    const menu = document.getElementById("apps-menu");
    const wrapper = document.getElementById("apps-dropdown-wrapper");

    if (!toggle || !menu) return;

    // Highlight current active tool page
    const highlightActiveTool = () => {
        const currentPath = window.location.pathname;
        const items = menu.querySelectorAll("a.dropdown-item");
        items.forEach(item => {
            const href = item.getAttribute("href");
            let isActive = false;

            if (href === "/app.html" && (currentPath === "/app.html" || currentPath === "/" || currentPath === "/index.html" || currentPath.endsWith("/app.html"))) {
                isActive = true;
            } else if (href && href !== "/app.html") {
                const cleanHref = href.replace("/HTML/", "").replace("/", "");
                if (currentPath.includes(cleanHref)) {
                    isActive = true;
                }
            }

            if (isActive) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });
    };

    highlightActiveTool();

    if (toggle.dataset.wired === "true") return;
    toggle.dataset.wired = "true";

    const handleToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        highlightActiveTool();
        document.querySelectorAll(".dropdown-menu").forEach(el => {
            if (el !== menu) el.classList.add("hidden");
        });
        document.querySelectorAll(".overflow-menu").forEach(el => el.classList.add("hidden"));
        menu.classList.toggle("hidden");
    };

    toggle.addEventListener("click", handleToggle);

    document.addEventListener("click", (e) => {
        if (wrapper && !wrapper.contains(e.target)) {
            menu.classList.add("hidden");
        }
    });

    menu.addEventListener("click", (e) => {
        const link = e.target.closest("a.dropdown-item");
        if (link) {
            const href = link.getAttribute("href");
            if (href) {
                e.preventDefault();
                e.stopPropagation();
                menu.classList.add("hidden");

                if (href === "/app.html") {
                    localStorage.setItem('lastPage', 'dashboard');
                } else if (href.includes("code-workspace")) {
                    localStorage.setItem('lastPage', 'code-workspace');
                } else if (href.includes("student-hub")) {
                    localStorage.setItem('lastPage', 'student-hub');
                } else if (href.includes("ui-designer")) {
                    localStorage.setItem('lastPage', 'ui-designer');
                } else if (href.includes("pdf-editor")) {
                    localStorage.setItem('lastPage', 'pdf-editor');
                }

                const currentPath = window.location.pathname;
                if (currentPath === href || (href === "/app.html" && (currentPath === "/app.html" || currentPath === "/"))) {
                    window.location.reload();
                } else {
                    window.location.href = href;
                }
            }
        }
    });
}

// ========================================
// TOAST NOTIFICATIONS
// ========================================
/**
 * Shows a toast notification.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'warning'} type - Toast type.
 * @param {number} duration - Auto-dismiss time in ms (default 4000).
 */
export function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  };


  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || ''}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));

  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }
}

function dismissToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.remove('show');
  setTimeout(() => toast.remove(), 300);
}

// ========================================
// CONFIRM DIALOG
// ========================================
/**
 * Shows a confirmation dialog. Returns a promise that resolves to true/false.
 * @param {string} title - Dialog title.
 * @param {string} message - Dialog message.
 * @param {string} confirmLabel - Label for the confirm button (default "Delete").
 * @returns {Promise<boolean>}
 */
export function showConfirm(title, message, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    const dialog = document.getElementById('confirm-dialog');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    const closeBtn = dialog ? dialog.querySelector('.confirm-close') : null;
    const badgeEl = document.getElementById('confirm-icon-badge');

    if (!dialog || !okBtn || !cancelBtn) { 
      resolve(confirm(message)); 
      return; 
    }

    const isDanger = (confirmLabel.toLowerCase().includes('delete') || confirmLabel.toLowerCase().includes('remove') || title.toLowerCase().includes('delete'));

    dialog.classList.remove('alert-danger', 'alert-primary', 'alert-error', 'alert-info');
    if (isDanger) {
      dialog.classList.add('alert-danger');
      okBtn.className = 'btn danger';
      if (badgeEl) {
        badgeEl.className = 'dialog-icon-badge danger';
        badgeEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      }
    } else {
      dialog.classList.add('alert-primary');
      okBtn.className = 'btn primary';
      if (badgeEl) {
        badgeEl.className = 'dialog-icon-badge primary';
        badgeEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      }
    }

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    okBtn.textContent = confirmLabel;

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onOk = () => {
      cleanup();
      resolve(true);
    };

    const onClose = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
      dialog.removeEventListener('close', onClose);
      if (closeBtn) closeBtn.removeEventListener('click', onCancel);
      if (dialog.open) dialog.close();
    };

    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    dialog.addEventListener('close', onClose);
    if (closeBtn) closeBtn.addEventListener('click', onCancel);

    dialog.showModal();
  });
}

/**
 * Shows a custom prompt dialog. Returns a promise that resolves to the string or null.
 * @param {string} title - Dialog title.
 * @param {string} defaultValue - Initial value.
 * @param {string} confirmLabel - Label for the confirm button.
 * @returns {Promise<string|null>}
 */
export function showPrompt(title, defaultValue = '', confirmLabel = 'OK') {
  return new Promise((resolve) => {
    const dialog = document.getElementById('prompt-dialog');
    const titleEl = document.getElementById('prompt-title');
    const inputEl = document.getElementById('prompt-input');
    const okBtn = document.getElementById('prompt-ok');
    const cancelBtn = document.getElementById('prompt-cancel');
    const closeBtn = dialog ? dialog.querySelector('.confirm-close') : null;

    if (!dialog || !okBtn || !cancelBtn || !inputEl) {
      resolve(prompt(title, defaultValue));
      return;
    }

    if (titleEl) titleEl.textContent = title;
    inputEl.value = defaultValue;
    okBtn.textContent = confirmLabel;

    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    const onOk = (e) => {
      if (e) e.preventDefault();
      const val = inputEl.value;
      cleanup();
      resolve(val);
    };

    const onClose = () => {
      cleanup();
      resolve(null);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Enter') {
        onOk();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };

    const cleanup = () => {
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
      dialog.removeEventListener('close', onClose);
      inputEl.removeEventListener('keydown', onKeyDown);
      if (closeBtn) closeBtn.removeEventListener('click', onCancel);
      if (dialog.open) dialog.close();
    };

    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    dialog.addEventListener('close', onClose);
    inputEl.addEventListener('keydown', onKeyDown);
    if (closeBtn) closeBtn.addEventListener('click', onCancel);

    dialog.showModal();
    // Auto-focus and select text
    setTimeout(() => {
      inputEl.focus();
      inputEl.select();
    }, 50);
  });
}

function ensureFolderDialogExists() {
  let dialog = document.getElementById('folder-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog folder-modal-dialog alert-primary';
    dialog.id = 'folder-dialog';
    dialog.innerHTML = `
      <div class="confirm-content folder-modal-content">
        <button type="button" class="confirm-close" aria-label="Close dialog">✕</button>
        <div class="dialog-icon-badge primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
        </div>
        <h3 class="confirm-title" id="folder-dialog-title">Create Folder</h3>
        <div class="folder-modal-body" style="width: 100%;">
          <label class="folder-modal-label" for="folder-name-input">Folder Name</label>
          <input type="text" id="folder-name-input" class="prompt-input-field" placeholder="e.g. 2024, Recipes, Italian..." autocomplete="off">
          
          <label class="folder-modal-label" style="margin-top: 16px;">Choose Theme Color</label>
          <div class="folder-color-selector" id="folder-color-selector">
            <button type="button" class="color-swatch-btn" data-color="rose" title="Red" style="--swatch-c: #EF4444; background-color: #EF4444;"></button>
            <button type="button" class="color-swatch-btn" data-color="coral" title="Orange" style="--swatch-c: #F97316; background-color: #F97316;"></button>
            <button type="button" class="color-swatch-btn" data-color="amber" title="Yellow" style="--swatch-c: #EAB308; background-color: #EAB308;"></button>
            <button type="button" class="color-swatch-btn" data-color="emerald" title="Green" style="--swatch-c: #10B981; background-color: #10B981;"></button>
            <button type="button" class="color-swatch-btn selected" data-color="blue" title="Blue" style="--swatch-c: #0052FF; background-color: #0052FF;"></button>
            <button type="button" class="color-swatch-btn" data-color="purple" title="Purple" style="--swatch-c: #A855F7; background-color: #A855F7;"></button>
            <button type="button" class="color-swatch-btn" data-color="slate" title="Gray" style="--swatch-c: #64748B; background-color: #64748B;"></button>
          </div>

          <div class="folder-modal-preview-wrapper">
            <div class="folder-3d-card" id="folder-preview-card" data-color="blue" style="pointer-events: none;">
              <div class="folder-3d-wrapper">
                <div class="folder-3d-back"><div class="folder-3d-tab"></div></div>
                <div class="folder-3d-papers">
                  <div class="paper-sheet sheet-3"></div>
                  <div class="paper-sheet sheet-2"></div>
                  <div class="paper-sheet sheet-1">
                    <div class="sheet-line"></div>
                    <div class="sheet-line short"></div>
                  </div>
                </div>
                <div class="folder-3d-front">
                  <div class="folder-3d-glass-lip"></div>
                </div>
              </div>
              <span class="folder-3d-title" id="folder-preview-label">Preview Folder</span>
            </div>
          </div>
        </div>
        <div class="dialog-divider"></div>
        <div class="confirm-actions">
          <button type="button" class="btn secondary" id="folder-cancel">Cancel</button>
          <button type="button" class="btn primary" id="folder-ok">Save Folder</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
  }
  return dialog;
}

/**
 * Shows a custom folder modal dialog with name input and color selection swatches.
 * Returns a promise that resolves to { name: string, color: string } or null if cancelled.
 */
export function showFolderModal(title = "Create Folder", initialName = "", initialColor = "blue", confirmLabel = "Save Folder") {
  return new Promise((resolve) => {
    const dialog = ensureFolderDialogExists();

    const titleEl = document.getElementById('folder-dialog-title');
    const inputEl = document.getElementById('folder-name-input');
    const okBtn = document.getElementById('folder-ok');
    const cancelBtn = document.getElementById('folder-cancel');
    const closeBtn = dialog.querySelector('.confirm-close');
    const colorSwatches = dialog.querySelectorAll('.color-swatch-btn');
    const previewCard = document.getElementById('folder-preview-card');
    const previewLabel = document.getElementById('folder-preview-label');

    let selectedColor = initialColor || "blue";

    if (titleEl) titleEl.textContent = title;
    if (inputEl) inputEl.value = initialName;
    if (okBtn) okBtn.textContent = confirmLabel;

    const updatePreview = () => {
      if (previewCard) previewCard.dataset.color = selectedColor;
      if (previewLabel) previewLabel.textContent = inputEl.value.trim() || "Preview Folder";
    };

    colorSwatches.forEach(btn => {
      const isSelected = btn.dataset.color === selectedColor;
      btn.classList.toggle('selected', isSelected);
    });

    updatePreview();

    const swatchListeners = [];
    colorSwatches.forEach(btn => {
      const handler = (e) => {
        e.preventDefault();
        selectedColor = btn.dataset.color;
        colorSwatches.forEach(b => b.classList.toggle('selected', b === btn));
        updatePreview();
      };
      btn.addEventListener('click', handler);
      swatchListeners.push({ btn, handler });
    });

    const onInputChange = () => updatePreview();
    inputEl.addEventListener('input', onInputChange);

    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    const onOk = (e) => {
      if (e) e.preventDefault();
      const val = inputEl.value.trim();
      if (!val) {
        inputEl.focus();
        return;
      }
      cleanup();
      resolve({ name: val, color: selectedColor });
    };

    const onClose = () => {
      cleanup();
      resolve(null);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Enter') {
        onOk(e);
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };

    const cleanup = () => {
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
      dialog.removeEventListener('close', onClose);
      inputEl.removeEventListener('keydown', onKeyDown);
      inputEl.removeEventListener('input', onInputChange);
      if (closeBtn) closeBtn.removeEventListener('click', onCancel);
      swatchListeners.forEach(({ btn, handler }) => btn.removeEventListener('click', handler));
      if (dialog.open) dialog.close();
    };

    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    dialog.addEventListener('close', onClose);
    inputEl.addEventListener('keydown', onKeyDown);
    if (closeBtn) closeBtn.addEventListener('click', onCancel);

    try {
      if (dialog.open) dialog.close();
      dialog.showModal();
    } catch (err) {
      console.warn("Folder dialog showModal warning:", err);
    }
    setTimeout(() => {
      inputEl.focus();
      inputEl.select();
    }, 50);
  });
}

// ========================================
// HTML SANITIZATION
// ========================================
/**
 * Strips HTML tags from a string, returning plain text.
 * Uses a safe approach that avoids innerHTML-based XSS.
 */
export function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Shows a custom alert dialog. Returns a promise that resolves when closed.
 * @param {string} title - Dialog title.
 * @param {string} message - Dialog message.
 * @param {string} btnLabel - Label for the OK button or status type.
 * @param {string} [type] - Optional explicit status type ('success'|'error'|'warning'|'info').
 * @returns {Promise<void>}
 */
export function showAlert(title, message, btnLabel = 'OK', type = null) {
  let finalType = 'info';
  let finalBtnLabel = 'OK';

  if (typeof btnLabel === 'string' && ['success', 'error', 'danger', 'warning', 'info'].includes(btnLabel.toLowerCase())) {
    finalType = btnLabel.toLowerCase();
    finalBtnLabel = 'OK';
  } else {
    if (btnLabel) finalBtnLabel = btnLabel;
    if (type) {
      finalType = type.toLowerCase();
    } else {
      const text = (title + ' ' + message).toLowerCase();
      if (text.includes('error') || text.includes('fail') || text.includes('unable') || text.includes('invalid') || text.includes('could not')) {
        finalType = 'error';
      } else if (text.includes('success') || text.includes('saved') || text.includes('created') || text.includes('completed')) {
        finalType = 'success';
      } else if (text.includes('warn') || text.includes('caution') || text.includes('attention')) {
        finalType = 'warning';
      }
    }
  }

  return new Promise((resolve) => {
    const dialog = document.getElementById('alert-dialog');
    const titleEl = document.getElementById('alert-title');
    const messageEl = document.getElementById('alert-message');
    const okBtn = document.getElementById('alert-ok');
    const closeBtn = dialog ? dialog.querySelector('.confirm-close') : null;
    const badgeEl = document.getElementById('alert-icon-badge');

    if (!dialog || !okBtn) {
      if (window._nativeAlert) {
        window._nativeAlert(message);
      } else {
        alert(message);
      }
      resolve();
      return;
    }

    dialog.classList.remove('alert-success', 'alert-error', 'alert-warning', 'alert-info', 'alert-danger');
    dialog.classList.add(`alert-${finalType}`);

    if (badgeEl) {
      badgeEl.className = `dialog-icon-badge ${finalType}`;
      if (finalType === 'success') {
        badgeEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      } else if (finalType === 'error' || finalType === 'danger') {
        badgeEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      } else if (finalType === 'warning') {
        badgeEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
      } else {
        badgeEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      }
    }

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    okBtn.textContent = finalBtnLabel;

    const onOk = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      okBtn.removeEventListener('click', onOk);
      dialog.removeEventListener('close', onOk);
      if (closeBtn) closeBtn.removeEventListener('click', onOk);
      if (dialog.open) dialog.close();
    };

    okBtn.addEventListener('click', onOk);
    dialog.addEventListener('close', onOk);
    if (closeBtn) closeBtn.addEventListener('click', onOk);

    dialog.showModal();
  });
}

// Global window.alert override
if (typeof window !== 'undefined') {
  if (!window._nativeAlert) {
    window._nativeAlert = window.alert;
  }
  window.alert = function(message) {
    const dialog = document.getElementById('alert-dialog');
    if (!dialog) {
      if (window._nativeAlert) {
        window._nativeAlert(message);
      } else {
        console.warn("Native alert fallback missing. Message:", message);
      }
      return;
    }
    showAlert("Alert", message);
  };
}

/**
 * Maps relative API endpoints to backend port 3000 during local development across non-3000 ports (e.g. port 80 / XAMPP).
 */
export function getApiUrl(path) {
  if (!path) return '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '3000') {
    return `http://localhost:3000${cleanPath}`;
  }
  return cleanPath;
}