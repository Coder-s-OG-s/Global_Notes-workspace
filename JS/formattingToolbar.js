const $ = (selector) => document.querySelector(selector);

// Inserts HTML content at the current cursor position in the content editable area
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

// Sets up all formatting toolbar buttons and their corresponding actions
export function wireFormattingToolbar() {
  const contentEl = $("#content");
  if (!contentEl) return;

  let savedRange = null;

  function isRangeInsideEditor(range) {
    if (!range) return false;
    const common = range.commonAncestorContainer;
    return common === contentEl || contentEl.contains(common);
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (isRangeInsideEditor(range)) {
      savedRange = range.cloneRange();
    }
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (!selection || !savedRange) return false;
    selection.removeAllRanges();
    selection.addRange(savedRange);
    return true;
  }

  function withRestoredSelection(runCommand) {
    contentEl.focus({ preventScroll: true });
    const restored = restoreSelection();
    try {
      runCommand();
      saveSelection();
      return restored;
    } catch (error) {
      throw error;
    }
  }

  contentEl.addEventListener("mouseup", saveSelection);
  contentEl.addEventListener("keyup", saveSelection);
  contentEl.addEventListener("input", saveSelection);

  // Custom select UI renders outside native <select>; capture selection before clicks.
  document.addEventListener("mousedown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (
      target.closest(".custom-select-trigger") ||
      target.closest(".custom-select-option")
    ) {
      saveSelection();
    }
  });

  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (isRangeInsideEditor(range)) {
      savedRange = range.cloneRange();
    }
  });

  // Applies the specified formatting or edit command to the selected text
  function applyFormat(command) {
    try {
      withRestoredSelection(() => {
        document.execCommand(command, false, null);
      });
    } catch (e) {
      console.error("Command failed", command, e);
    }
  }

  // Format dropdown (Bold, Italic, Underline, Bullet List)
  const formatSelect = $("#format-action");
  if (formatSelect) {
    formatSelect.addEventListener("mousedown", saveSelection);
    formatSelect.addEventListener("change", (e) => {
      const action = e.target.value;
      if (!action) return;

      switch (action) {
        case "bold":
          applyFormat("bold");
          break;
        case "italic":
          applyFormat("italic");
          break;
        case "underline":
          applyFormat("underline");
          break;
        case "strikethrough":
          applyFormat("strikeThrough");
          break;
        case "alignLeft":
          applyFormat("justifyLeft");
          break;
        case "alignCenter":
          applyFormat("justifyCenter");
          break;
        case "alignRight":
          applyFormat("justifyRight");
          break;
        case "bullet":
          applyFormat("insertUnorderedList");
          break;
      }

      // Reset dropdown to default
      setTimeout(() => {
        e.target.value = "";
      }, 100);
    });
  }

  // Edit dropdown (Cut, Copy, Paste)
  const editSelect = $("#edit-action");
  if (editSelect) {
    editSelect.addEventListener("mousedown", saveSelection);
    editSelect.addEventListener("change", (e) => {
      const action = e.target.value;
      if (!action) return;

      switch (action) {
        case "cut":
          applyFormat("cut");
          break;
        case "copy":
          applyFormat("copy");
          break;
        case "paste":
          applyFormat("paste");
          break;
      }

      // Reset dropdown to default
      setTimeout(() => {
        e.target.value = "";
      }, 100);
    });
  }




  // Undo/Redo buttons
  const undoBtn = $("#edit-undo");
  if (undoBtn) {
    undoBtn.addEventListener("click", () => {
      applyFormat("undo");
    });
  }

  const redoBtn = $("#edit-redo");
  if (redoBtn) {
    redoBtn.addEventListener("click", () => {
      applyFormat("redo");
    });
  }

  // Font size stepper control
  const fontSizeInput = $("#font-size-input");
  const decreaseBtn = $("#decrease-font-size");
  const increaseBtn = $("#increase-font-size");

  if (fontSizeInput && decreaseBtn && increaseBtn) {
    const updateFontSize = (newSize) => {
      // Keep size within bounds
      const size = Math.min(100, Math.max(1, parseInt(newSize) || 15));
      fontSizeInput.value = size;

      if (contentEl) {
        contentEl.style.setProperty("--editor-font-size", `${size}px`);
        contentEl.style.fontSize = `${size}px`;
        // Force layout recalculation
        contentEl.offsetHeight;
      }

      try {
        localStorage.setItem("notesWorkspace.textSize", size);
      } catch (err) {
        console.warn("Failed to save font size preference:", err);
      }
    };

    // Load saved size preference from localStorage
    const savedSize = localStorage.getItem("notesWorkspace.textSize") || "15";
    updateFontSize(savedSize);

    // Increase button click
    increaseBtn.addEventListener("click", () => {
      updateFontSize(parseInt(fontSizeInput.value) + 1);
    });

    // Decrease button click
    decreaseBtn.addEventListener("click", () => {
      updateFontSize(parseInt(fontSizeInput.value) - 1);
    });

    // Direct input change
    fontSizeInput.addEventListener("input", (e) => {
      updateFontSize(e.target.value);
    });

    console.log("Font size stepper initialized");
  } else {
    console.warn("Font size stepper elements not found");
  }


  // Text color control
  const textColorSelect = $("#text-color");
  if (textColorSelect) {
    textColorSelect.addEventListener("mousedown", saveSelection);
    textColorSelect.addEventListener("change", (e) => {
      const color = e.target.value;
      if (color) {
        try {
          withRestoredSelection(() => {
            document.execCommand("foreColor", false, color);
          });
        } catch (err) {
          console.error("Color command failed", err);
        }
      } else {
        try {
          withRestoredSelection(() => {
            document.execCommand("removeFormat", false, null);
          });
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

  // Custom text color control
  const customColorInput = $("#custom-text-color");
  if (customColorInput) {
    customColorInput.addEventListener("mousedown", saveSelection);
    customColorInput.addEventListener("input", (e) => {
      const color = e.target.value;
      if (color) {
        try {
          withRestoredSelection(() => {
            document.execCommand("foreColor", false, color);
          });
        } catch (err) {
          console.error("Color command failed", err);
        }
      }
    });

    // Also handle 'change' event to ensure final selection is applied
    customColorInput.addEventListener("change", (e) => {
      const color = e.target.value;
      if (color) {
        try {
          withRestoredSelection(() => {
            document.execCommand("foreColor", false, color);
          });
        } catch (err) {
          console.error("Color command failed", err);
        }
      }
    });
  }

  // Highlight color control
  const highlightColorSelect = $("#highlight-color");
  console.log("Highlight Element:", highlightColorSelect); // DEBUG
  if (highlightColorSelect) {
    highlightColorSelect.addEventListener("mousedown", saveSelection);
    highlightColorSelect.addEventListener("change", (e) => {
      const color = e.target.value;
      if (color) {
        try {
          withRestoredSelection(() => {
            document.execCommand("hiliteColor", false, color);
          });
        } catch (err) {
          console.error("Highlight command failed", err);
        }
      } else {
        try {
          // Remove highlight (transparent background)
          withRestoredSelection(() => {
            document.execCommand("hiliteColor", false, "transparent");
          });
        } catch (err) {
          console.error("Remove highlight failed", err);
        }
      }
      // Reset dropdown to default after applying if desired, 
      // but usually for highlight state it's nice to see what was picked?
      // Actually standard behavior in this app seems to be reset.
      setTimeout(() => {
        highlightColorSelect.value = "";
      }, 100);
    });
  }
}