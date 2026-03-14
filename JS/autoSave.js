/**
 * Handles Auto-Save functionality for notes.
 */

const $ = (selector) => document.querySelector(selector);

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {Function} - The debounced function.
 */
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Wires up the auto-save functionality.
 * @param {Object} state - The global application state.
 * @param {Object} callbacks - callbacks object with persistNotes, renderNotesList, etc.
 */
export function wireAutoSave(state, callbacks) {
    const titleInput = $("#title");
    const contentInput = $("#content");
    const autoSaveToggle = $("#auto-save-toggle");

    if (!titleInput || !contentInput || !autoSaveToggle) return;

    // Load auto-save preference from localStorage
    const savedAutoSavePref = localStorage.getItem("autoSaveEnabled");
    if (savedAutoSavePref === "true") {
        autoSaveToggle.checked = true;
    }

    // Save preference when toggled
    autoSaveToggle.addEventListener("change", () => {
        localStorage.setItem("autoSaveEnabled", autoSaveToggle.checked);
    });

    // The actual save function
    const performAutoSave = () => {
        // Only save if:
        // 1. Auto-save is enabled
        // 2. We have a valid active user (guests might not want auto-save or it might be confusing)
        // 3. We have an active note
        if (!autoSaveToggle.checked || !state.activeUser || !state.activeNoteId) return;

        const note = state.notes.find((n) => n.id === state.activeNoteId);
        if (!note) return;

        // Check if content actually changed to avoid unnecessary writes?
        // For now, simpler to just update from DOM.

        // Update note data from DOM
        // Note: We don't need to read tags here because tags are saved immediately when added/removed.
        // We only care about title and content.
        const currentTitle = titleInput.value.trim();
        const currentContent = contentInput.innerHTML;

        // Optional: Only save if changed
        if (note.title === currentTitle && note.content === currentContent) return;

        note.title = currentTitle;
        note.content = currentContent;
        note.updatedAt = new Date().toISOString();

        // Persist to storage (async — errors handled inside persistNotes via toast)
        callbacks.persistNotes();

        // Update sidebar to show new time/preview
        callbacks.renderNotesList();
    };

    // Create a debounced version of the save function (e.g., 2 seconds)
    const debouncedSave = debounce(performAutoSave, 2000);

    // Attach listeners
    titleInput.addEventListener("input", debouncedSave);
    // Content is a div with contenteditable, so 'input' works.
    contentInput.addEventListener("input", debouncedSave);
}
