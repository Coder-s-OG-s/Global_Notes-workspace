import { escapeHtml } from "./utilities.js";
import { insertHtmlAtCursor } from "./formattingToolbar.js";

const $ = (selector) => document.querySelector(selector);

// Sets up event handlers for media insertion including images and tables
export function wireUploadButtons() {
  const contentEl = $("#content");
  if (!contentEl) return;

  const imageBtn = $("#insert-image");
  const imageInput = $("#image-upload-input");
  if (imageBtn && imageInput) {
    imageBtn.addEventListener("click", () => {
      imageInput.value = "";
      imageInput.click();
    });

    imageInput.addEventListener("change", () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (!dataUrl) return;
        const safeName = escapeHtml(file.name || "image");
        const html = `<figure class="note-image note-image-size-medium"><img src="${dataUrl}" alt="${safeName}" /><figcaption class="note-image-caption" contenteditable="true">Add caption…</figcaption></figure>`;
        insertHtmlAtCursor(html);
      };
      reader.readAsDataURL(file);
    });
  }

  const tableBtn = $("#insert-table");
  if (tableBtn) {
    tableBtn.addEventListener("click", () => {
      let rows = parseInt(prompt("Number of rows?", "3"), 10);
      let cols = parseInt(prompt("Number of columns?", "3"), 10);
      if (!Number.isFinite(rows) || rows <= 0) rows = 2;
      if (!Number.isFinite(cols) || cols <= 0) cols = 2;

      const tableRowsHtml = Array.from({ length: rows })
        .map((_, rowIndex) => {
          const cellTag = rowIndex === 0 ? "th" : "td";
          const cellsHtml = Array.from({ length: cols })
            .map(() => `<${cellTag}>&nbsp;</${cellTag}>`)
            .join("");
          return `<tr>${cellsHtml}</tr>`;
        })
        .join("");

      const tableHtml = `<table class="note-table note-table-striped"><tbody>${tableRowsHtml}</tbody></table>`;
      insertHtmlAtCursor(tableHtml);
    });
  }

  // Image and table interaction handlers
  contentEl.addEventListener("click", (event) => {
    const target = event.target;

    // Handle image clicks - size chooser with custom option
    if (target instanceof HTMLImageElement) {
      const figure = target.closest("figure.note-image");
      if (!figure) return;

      // Derive current display size description
      let currentSize = "custom";
      if (figure.classList.contains("note-image-size-small")) currentSize = "small";
      else if (figure.classList.contains("note-image-size-medium")) currentSize = "medium";
      else if (figure.classList.contains("note-image-size-large")) currentSize = "large";

      const input = prompt(
        "Set image size (examples: small, medium, large, 40%, 300px)",
        currentSize
      );
      if (!input) return;

      const raw = input.trim();
      const valueLower = raw.toLowerCase();

      // First handle named presets via CSS classes
      if (["small", "medium", "large"].includes(valueLower)) {
        figure.classList.remove(
          "note-image-size-small",
          "note-image-size-medium",
          "note-image-size-large"
        );
        target.style.width = "";
        target.style.maxWidth = "";
        figure.classList.add(`note-image-size-${valueLower}`);
        return;
      }

      // Otherwise treat as custom numeric size
      let numeric = raw;
      let unit = "%";
      if (raw.endsWith("px")) {
        numeric = raw.slice(0, -2);
        unit = "px";
      } else if (raw.endsWith("%")) {
        numeric = raw.slice(0, -1);
        unit = "%";
      }

      const num = Number.parseFloat(numeric);
      if (!Number.isFinite(num) || num <= 0) {
        alert("Please enter a positive number (e.g. 40%, 300px).");
        return;
      }

      // Reasonable bounds
      const clamped = unit === "%" ? Math.max(5, Math.min(num, 100)) : Math.max(20, Math.min(num, 2000));

      // Remove preset classes and apply inline style
      figure.classList.remove(
        "note-image-size-small",
        "note-image-size-medium",
        "note-image-size-large"
      );
      target.style.maxWidth = "none";
      target.style.width = `${clamped}${unit}`;
    }//check this

    // Handle table clicks - right-click to delete
    if (target instanceof HTMLTableElement || target.closest("table.note-table")) {
      const table = target.closest("table.note-table");
      if (!table) return;

      if (event.button === 2 || event.ctrlKey || event.metaKey) {
        event.preventDefault();
        if (confirm("Delete this table?")) {
          table.remove();
        }
        return;
      }
    }
  });

  // Add context menu for right-click options
  contentEl.addEventListener("contextmenu", (event) => {
    const target = event.target;

    // For images
    if (target instanceof HTMLImageElement) {
      const figure = target.closest("figure.note-image");
      if (figure) {
        event.preventDefault();
        const action = confirm("Right-click: Delete image?\n\nOK to delete, Cancel to keep");
        if (action) {
          figure.remove();
        }
        return;
      }
    }

    // For tables
    if (target.closest("table.note-table")) {
      event.preventDefault();
      const table = target.closest("table.note-table");
      const action = confirm("Right-click: Delete table?\n\nOK to delete, Cancel to keep");
      if (action) {
        table.remove();
      }
      return;
    }
  });
}