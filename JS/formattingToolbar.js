const $ = (selector) => document.querySelector(selector);

export function insertHtmlAtCursor(html) {
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

export function wireFormattingToolbar() {
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

  // Text size control with proper event handling
  const textSizeSelect = $("#text-size");
  if (textSizeSelect) {
    try {
      // Load saved size preference from localStorage
      const savedSize = localStorage.getItem("notesWorkspace.textSize") || "15";
      // Set the select dropdown to the saved value
      textSizeSelect.value = savedSize;
      // Apply the saved font size to content area
      contentEl.style.fontSize = `${savedSize}px`;
    } catch {
      // Default to 15px if localStorage fails
      contentEl.style.fontSize = "15px";
    }

    // Listen for changes to text size dropdown
    textSizeSelect.addEventListener("change", (e) => {
      const size = e.target.value;
      // Apply new font size to content area
      contentEl.style.fontSize = `${size}px`;
      try {
        // Persist the user's choice to localStorage
        localStorage.setItem("notesWorkspace.textSize", size);
      } catch {
        // Silently fail if storage is unavailable
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
