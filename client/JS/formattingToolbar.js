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
  const lastChild = fragment.lastChild;
  
  range.insertNode(fragment);

  if (lastChild) {
    const newRange = range.cloneRange();
    newRange.setStartAfter(lastChild);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
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
    const selection = window.getSelection();
    const hasLiveEditorSelection = selection && selection.rangeCount > 0 && isRangeInsideEditor(selection.getRangeAt(0));
    if (!hasLiveEditorSelection) {
      contentEl.focus({ preventScroll: true });
      restoreSelection();
    }
    try {
      runCommand();
      saveSelection();
    } catch (error) {
      console.error("Formatting command failed:", error);
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

  // Quick direct inline format buttons
  const quickButtons = [
    { id: "#edit-bold", command: "bold" },
    { id: "#edit-italic", command: "italic" },
    { id: "#edit-underline", command: "underline" },
    { id: "#edit-strikethrough", command: "strikeThrough" },
    { id: "#align-left", command: "justifyLeft" },
    { id: "#align-center", command: "justifyCenter" },
    { id: "#align-right", command: "justifyRight" },
    { id: "#align-justify", command: "justifyFull" },
  ];

  quickButtons.forEach(({ id, command }) => {
    const btn = $(id);
    if (btn) {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        saveSelection();
      });
      btn.addEventListener("click", () => {
        applyFormat(command);
        updateActiveStates();
      });
    }
  });

  // Bullet List (:≡)
  const listBulletBtn = $("#list-bullet");
  if (listBulletBtn) {
    listBulletBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      saveSelection();
    });
    listBulletBtn.addEventListener("click", () => {
      contentEl.focus({ preventScroll: true });
      restoreSelection();
      document.execCommand("insertUnorderedList", false, null);
      saveSelection();
      updateActiveStates();
    });
  }

  // Numbered List (12≡)
  const listOrderedBtn = $("#list-ordered");
  if (listOrderedBtn) {
    listOrderedBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      saveSelection();
    });
    listOrderedBtn.addEventListener("click", () => {
      contentEl.focus({ preventScroll: true });
      restoreSelection();
      document.execCommand("insertOrderedList", false, null);
      saveSelection();
      updateActiveStates();
    });
  }

  // Task Checklist (☑)
  const listCheckBtn = $("#list-check");
  if (listCheckBtn) {
    listCheckBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      saveSelection();
    });
    listCheckBtn.addEventListener("click", () => {
      contentEl.focus({ preventScroll: true });
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        insertHtmlAtCursor('<div class="task-item-line" style="display:flex;align-items:center;gap:8px;margin:4px 0;"><input type="checkbox" class="note-task-check" style="width:16px;height:16px;cursor:pointer;"> <span>Task item</span></div><p><br></p>');
        return;
      }

      const range = selection.getRangeAt(0);

      // Check if current block/parent is already a task item line (for TOGGLE)
      let containerNode = range.commonAncestorContainer;
      if (containerNode.nodeType === 3) containerNode = containerNode.parentNode;
      const existingTask = containerNode ? containerNode.closest(".task-item-line") : null;

      if (existingTask) {
        // Toggle OFF: convert task item line back into standard <p>
        const text = existingTask.innerText || existingTask.textContent;
        const p = document.createElement("p");
        p.textContent = text;
        existingTask.parentNode.replaceChild(p, existingTask);

        const newRange = document.createRange();
        newRange.selectNodeContents(p);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // Toggle ON: convert current line or selected text into task checklist item(s)
        const selectedText = range.toString();
        if (selectedText.includes("\n")) {
          // Multi-line selection: convert each non-empty line into a task item
          const lines = selectedText.split(/\r?\n/).filter(line => line.trim().length > 0);
          const fragment = document.createDocumentFragment();

          lines.forEach(lineText => {
            const taskLine = document.createElement("div");
            taskLine.className = "task-item-line";
            taskLine.style.display = "flex";
            taskLine.style.alignItems = "center";
            taskLine.style.gap = "8px";
            taskLine.style.margin = "4px 0";

            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.className = "note-task-check";
            cb.style.width = "16px";
            cb.style.height = "16px";
            cb.style.cursor = "pointer";

            const labelSpan = document.createElement("span");
            labelSpan.textContent = lineText.trim();

            taskLine.appendChild(cb);
            taskLine.appendChild(labelSpan);
            fragment.appendChild(taskLine);
          });

          range.deleteContents();
          range.insertNode(fragment);
        } else {
          // Single line selection or caret
          let targetBlock = containerNode;
          while (targetBlock && targetBlock !== contentEl && targetBlock.parentNode !== contentEl) {
            targetBlock = targetBlock.parentNode;
          }

          const lineText = selectedText || (targetBlock && targetBlock !== contentEl ? targetBlock.innerText : "") || "Task item";

          const taskLine = document.createElement("div");
          taskLine.className = "task-item-line";
          taskLine.style.display = "flex";
          taskLine.style.alignItems = "center";
          taskLine.style.gap = "8px";
          taskLine.style.margin = "4px 0";

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.className = "note-task-check";
          cb.style.width = "16px";
          cb.style.height = "16px";
          cb.style.cursor = "pointer";

          const labelSpan = document.createElement("span");
          labelSpan.textContent = lineText.trim() || "Task item";

          taskLine.appendChild(cb);
          taskLine.appendChild(labelSpan);

          if (targetBlock && targetBlock !== contentEl && targetBlock.parentNode === contentEl) {
            targetBlock.parentNode.replaceChild(taskLine, targetBlock);
          } else {
            range.deleteContents();
            range.insertNode(taskLine);
          }

          const newRange = document.createRange();
          newRange.setStartAfter(taskLine);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      saveSelection();
      updateActiveStates();
    });
  }

  // Clear Formatting (X)
  const clearFormatBtn = $("#clear-format");
  if (clearFormatBtn) {
    clearFormatBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      saveSelection();
    });
    clearFormatBtn.addEventListener("click", () => {
      contentEl.focus({ preventScroll: true });

      // Step 1: Run native removeFormat & unlink
      document.execCommand("removeFormat", false, null);
      document.execCommand("unlink", false, null);
      document.execCommand("formatBlock", false, "<p>");

      const headingSelect = $("#heading-select");
      if (headingSelect) headingSelect.value = "p";

      // Step 2: Strip all inline styles, spans, font tags, and custom block wrappers
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        let container = range.commonAncestorContainer;
        if (container.nodeType === 3) container = container.parentNode;

        // Traverse up to find block wrapper
        let current = container;
        while (current && current !== contentEl) {
          if (
            current.tagName === "UL" ||
            current.tagName === "OL" ||
            current.tagName === "LI" ||
            current.tagName === "PRE" ||
            current.tagName === "CODE" ||
            current.tagName === "BLOCKQUOTE" ||
            current.classList?.contains("task-item-line")
          ) {
            const plainText = current.innerText || current.textContent;
            const p = document.createElement("p");
            p.textContent = plainText;
            current.parentNode.replaceChild(p, current);
            break;
          }
          current = current.parentNode;
        }

        // Clean any styled spans/fonts remaining in editor selection
        const elementsToClean = contentEl.querySelectorAll(".task-item-line, span[style], font, mark, b, i, u, s");
        elementsToClean.forEach((el) => {
          if (selection.containsNode(el, true)) {
            if (el.classList.contains("task-item-line")) {
              const text = el.innerText || el.textContent;
              const p = document.createElement("p");
              p.textContent = text;
              el.parentNode.replaceChild(p, el);
            } else {
              el.removeAttribute("style");
              el.removeAttribute("color");
              el.removeAttribute("face");
              el.removeAttribute("size");
            }
          }
        });
      }

      saveSelection();
      updateActiveStates();
    });
  }

  // Sync active states for format buttons on selection change
  function updateActiveStates() {
    try {
      $("#edit-bold")?.classList.toggle("active", document.queryCommandState("bold"));
      $("#edit-italic")?.classList.toggle("active", document.queryCommandState("italic"));
      $("#edit-underline")?.classList.toggle("active", document.queryCommandState("underline"));
      $("#edit-strikethrough")?.classList.toggle("active", document.queryCommandState("strikeThrough"));
      $("#align-left")?.classList.toggle("active", document.queryCommandState("justifyLeft"));
      $("#align-center")?.classList.toggle("active", document.queryCommandState("justifyCenter"));
      $("#align-right")?.classList.toggle("active", document.queryCommandState("justifyRight"));
      $("#align-justify")?.classList.toggle("active", document.queryCommandState("justifyFull"));
      $("#list-bullet")?.classList.toggle("active", document.queryCommandState("insertUnorderedList"));
      $("#list-ordered")?.classList.toggle("active", document.queryCommandState("insertOrderedList"));
    } catch {
      // Ignore queryCommandState edge cases
    }
  }

  contentEl.addEventListener("keyup", updateActiveStates);
  contentEl.addEventListener("mouseup", updateActiveStates);
  document.addEventListener("selectionchange", updateActiveStates);

  // Font size stepper control
  const fontSizeInput = $("#font-size-input");
  const decreaseBtn = $("#decrease-font-size");
  const increaseBtn = $("#increase-font-size");

  if (fontSizeInput && decreaseBtn && increaseBtn) {
    decreaseBtn.addEventListener("mousedown", (e) => e.preventDefault());
    increaseBtn.addEventListener("mousedown", (e) => e.preventDefault());

    const updateFontSize = (newSize) => {
      // Keep size within bounds
      const size = Math.min(100, Math.max(1, parseInt(newSize) || 15));
      fontSizeInput.value = size;

      const selection = window.getSelection();
      const hasSelection = selection && selection.rangeCount > 0 && !selection.isCollapsed && isRangeInsideEditor(selection.getRangeAt(0));

      if (hasSelection) {
        // Apply font size ONLY to the selected text range
        try {
          document.execCommand("fontSize", false, "7");
          const fontElements = contentEl.querySelectorAll("font[size='7']");
          fontElements.forEach((fontEl) => {
            fontEl.removeAttribute("size");
            fontEl.style.fontSize = `${size}px`;
          });
        } catch (err) {
          console.error("Failed to apply font size to selection:", err);
        }
      } else {
        // No selection active: update default editor container base font size
        if (contentEl) {
          contentEl.style.setProperty("--editor-font-size", `${size}px`);
          contentEl.style.fontSize = `${size}px`;
        }
        try {
          localStorage.setItem("notesWorkspace.textSize", size);
        } catch (err) {
          console.warn("Failed to save font size preference:", err);
        }
      }
    };

    // Load saved default size preference from localStorage
    const savedSize = localStorage.getItem("notesWorkspace.textSize") || "15";
    if (contentEl) {
      contentEl.style.setProperty("--editor-font-size", `${savedSize}px`);
      contentEl.style.fontSize = `${savedSize}px`;
    }

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
  }

  // Text color control
  const textColorSelect = $("#text-color");
  if (textColorSelect) {
    textColorSelect.addEventListener("mousedown", (e) => e.preventDefault());
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
      setTimeout(() => {
        textColorSelect.value = "";
      }, 150);
    });
  }

  // Custom text color control
  const customColorInput = $("#custom-text-color");
  const customColorSwatch = $("#custom-text-color-swatch");
  if (customColorInput) {
    const updateSwatch = () => {
      if (customColorSwatch) customColorSwatch.style.backgroundColor = customColorInput.value;
    };
    updateSwatch();

    customColorInput.addEventListener("input", (e) => {
      updateSwatch();
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

    customColorInput.addEventListener("change", (e) => {
      updateSwatch();
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
  if (highlightColorSelect) {
    highlightColorSelect.addEventListener("mousedown", (e) => e.preventDefault());
    highlightColorSelect.addEventListener("change", (e) => {
      const color = e.target.value;
      if (color) {
        try {
          withRestoredSelection(() => {
            document.execCommand("hiliteColor", false, color);
            document.execCommand("backColor", false, color);
          });
        } catch (err) {
          console.error("Highlight command failed", err);
        }
      } else {
        try {
          withRestoredSelection(() => {
            document.execCommand("hiliteColor", false, "transparent");
            document.execCommand("backColor", false, "transparent");
          });
        } catch (err) {
          console.error("Remove highlight failed", err);
        }
      }
      setTimeout(() => {
        highlightColorSelect.value = "";
      }, 150);
    });
  }
}