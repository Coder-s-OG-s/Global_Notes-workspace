import { escapeHtml } from "./utilities.js";
import { insertHtmlAtCursor } from "./formattingToolbar.js";

const $ = (selector) => document.querySelector(selector);

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

    // Handle image clicks - cycle through sizes or delete
    if (target instanceof HTMLImageElement) {
      const figure = target.closest("figure.note-image");
      if (!figure) return;

      // Right-click to delete image
      if (event.button === 2 || event.ctrlKey || event.metaKey) {
        event.preventDefault();
        if (confirm("Delete this image?")) {
          figure.remove();
        }
        return;
      }

      // Left-click to cycle through sizes
      if (figure.classList.contains("note-image-size-small")) {
        figure.classList.remove("note-image-size-small");
        figure.classList.add("note-image-size-medium");
      } else if (figure.classList.contains("note-image-size-medium")) {
        figure.classList.remove("note-image-size-medium");
        figure.classList.add("note-image-size-large");
      } else if (figure.classList.contains("note-image-size-large")) {
        figure.classList.remove("note-image-size-large");
        figure.classList.add("note-image-size-small");
      } else {
        figure.classList.add("note-image-size-medium");
      }
    }

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
