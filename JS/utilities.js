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

  const icons = { success: '✓', error: '✕', warning: '⚠' };

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
    if (!dialog) { resolve(confirm(message)); return; }

    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const okBtn = document.getElementById('confirm-ok');
    okBtn.textContent = confirmLabel;

    const cleanup = () => {
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
      dialog.removeEventListener('close', onClose);
      dialog.close();
    };

    const onCancel = () => { cleanup(); resolve(false); };
    const onOk = () => { cleanup(); resolve(true); };
    const onClose = () => { cleanup(); resolve(false); };

    const cancelBtn = document.getElementById('confirm-cancel');
    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    dialog.addEventListener('close', onClose);

    dialog.showModal();
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