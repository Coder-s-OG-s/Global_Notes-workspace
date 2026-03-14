import { escapeHtml, showToast } from "./utilities.js";
import { insertHtmlAtCursor } from "./formattingToolbar.js";
import { SketchPad } from "./sketchPad.js";
import { AudioRecorder } from "./audioRecorder.js";

const MAX_FILE_SIZE_MB = 10;

const $ = (selector) => document.querySelector(selector);

// Sets up event handlers for media insertion including images and tables
export function wireUploadButtons() {
  const contentEl = $("#content");
  if (!contentEl) return;

  const mediaInput = $("#media-upload-input");
  const fileInput = $("#file-upload-input");

  // Initialize helpers
  const sketchPad = new SketchPad('sketch-canvas');
  const audioRecorder = new AudioRecorder();

  // Insert dropdown handler
  const insertSelect = $("#insert-action");
  if (insertSelect) {
    insertSelect.addEventListener("change", (e) => {
      const action = e.target.value;
      if (!action) return;

      switch (action) {
        case "photo-video":
          if (mediaInput) mediaInput.click();
          break;
        case "audio":
          openAudioModal();
          break;
        case "file":
          if (fileInput) fileInput.click();
          break;
        case "sketch":
          openSketchModal();
          break;
        case "shapes":
          const shapesModal = document.getElementById("shapes-modal");
          if (shapesModal) shapesModal.showModal();
          break;
        case "table":
          insertTable();
          break;
      }

      // Reset dropdown
      setTimeout(() => {
        e.target.value = "";
      }, 100);
    });
  }

  // --- File Input Handlers ---

  // File size check
  function checkFileSize(file) {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showToast(`File too large (max ${MAX_FILE_SIZE_MB}MB). Please use a smaller file.`, "error");
      return false;
    }
    return true;
  }

  // Generic handler for images/videos
  const handleMediaUpload = (input) => {
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!checkFileSize(file)) { input.value = ""; return; }

      if (file.type.startsWith('image/')) {
        insertImage(file);
      } else if (file.type.startsWith('video/')) {
        insertVideo(file);
      }
      input.value = "";
    });
  };

  if (mediaInput) handleMediaUpload(mediaInput);

  // Generic file handler
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (!checkFileSize(file)) { fileInput.value = ""; return; }
      insertFileLink(file);
      fileInput.value = "";
    });
  }

  // --- Insertion Logic ---

  function insertImage(fileOrUrl) {
    if (typeof fileOrUrl === 'string') {
      const html = `<figure class="note-image note-image-size-medium"><img src="${fileOrUrl}" alt="Sketch" /><figcaption class="note-image-caption" contenteditable="true">Sketch</figcaption></figure>`;
      insertHtmlAtCursor(html);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const safeName = escapeHtml(fileOrUrl.name || "image");
      const html = `<figure class="note-image note-image-size-medium"><img src="${dataUrl}" alt="${safeName}" /><figcaption class="note-image-caption" contenteditable="true">Add caption…</figcaption></figure>`;
      insertHtmlAtCursor(html);
    };
    reader.readAsDataURL(fileOrUrl);
  }

  function insertVideo(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const html = `<div class="note-video"><video controls src="${dataUrl}" style="max-width: 100%; border-radius: 8px;"></video></div><p><br></p>`;
      insertHtmlAtCursor(html);
    };
    reader.readAsDataURL(file);
  }

  function insertFileLink(file) {
    const safeName = escapeHtml(file.name);
    const fileUrl = URL.createObjectURL(file);

    // Revoke blob URL after a delay to prevent memory leak
    setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);

    const html = `<a href="${fileUrl}" target="_blank" contenteditable="false" style="text-decoration: none; display: block; cursor: pointer;">
        <div class="file-attachment" style="padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); display: flex; align-items: center; gap: 10px; margin: 10px 0;">
            <span style="font-size: 20px;">📄</span>
            <span style="color: var(--text); font-weight: 500;">${safeName} (${Math.round(file.size / 1024)} KB)</span>
        </div>
     </a><p><br></p>`;
    insertHtmlAtCursor(html);
  }

  function insertTable() {
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

    const tableHtml = `<table class="note-table note-table-striped"><tbody>${tableRowsHtml}</tbody></table><p><br></p>`;
    insertHtmlAtCursor(tableHtml);
  }

  // --- Modals Logic ---

  const audioModal = $("#audio-modal");
  const sketchModal = $("#sketch-modal");

  function openAudioModal() {
    if (audioModal) audioModal.showModal();
  }

  function openSketchModal() {
    if (sketchModal) {
      sketchPad.reset();
      sketchModal.showModal();
    }
  }

  // Modal Buttons
  const saveAudioBtn = $("#save-audio-btn");
  if (saveAudioBtn) {
    saveAudioBtn.addEventListener("click", () => {
      const url = audioRecorder.getAudioUrl();
      if (url) {
        const html = `<div class="note-audio"><audio controls src="${url}"></audio></div><p><br></p>`;
        insertHtmlAtCursor(html);
      }
      if (audioModal) audioModal.close();
    });
  }

  const saveSketchBtn = $("#save-sketch-btn");
  if (saveSketchBtn) {
    saveSketchBtn.addEventListener("click", () => {
      const dataUrl = sketchPad.getImageDataUrl();
      insertImage(dataUrl);
      if (sketchModal) sketchModal.close();
    });
  }

  // Close buttons delegated handling handled by layoutManager or generic close listeners usually, 
  // but let's ensure specific modal close buttons work here just in case.
  document.querySelectorAll(".close-modal").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest("dialog");
      if (modal) modal.close();
    });
  });


  // --- Event Delegation for Interactions ---

  contentEl.addEventListener("click", (event) => {
    const target = event.target;

    // Image resizing (Unified)
    if (target instanceof HTMLImageElement && target.closest("figure.note-image")) {
      handleImageClick(target);
    }

    // Table deletion
    if ((target instanceof HTMLTableElement || target.closest("table.note-table")) && (event.button === 2 || event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (confirm("Delete this table?")) target.closest("table").remove();
    }
  });

  function handleImageClick(img) {
    const figure = img.closest("figure.note-image");
    const currentSize = figure.classList.contains("note-image-size-small") ? "small" :
      figure.classList.contains("note-image-size-medium") ? "medium" :
        figure.classList.contains("note-image-size-large") ? "large" : "custom";

    const input = prompt("Set image size (small, medium, large, or %/px):", currentSize);
    if (!input) return;

    const val = input.trim().toLowerCase();
    figure.classList.remove("note-image-size-small", "note-image-size-medium", "note-image-size-large");
    img.style.width = "";

    if (["small", "medium", "large"].includes(val)) {
      figure.classList.add(`note-image-size-${val}`);
    } else {
      img.style.width = val; // let CSS handle valid units
    }
  }

  // --- Context Menu for Deletion ---
  // --- Context Menu for Deletion ---
  contentEl.addEventListener("contextmenu", (event) => {
    const target = event.target;
    let deletable = null;
    let typeName = "item";

    // 1. Images (including Sketches)
    if (target instanceof HTMLImageElement && target.closest("figure.note-image")) {
      deletable = target.closest("figure.note-image");
      typeName = "image";
    }
    // 2. Tables
    else if (target.closest("table.note-table")) {
      deletable = target.closest("table.note-table");
      typeName = "table";
    }
    // 3. Videos
    else if (target.closest(".note-video")) {
      deletable = target.closest(".note-video");
      typeName = "video";
    }
    // 4. Audio
    else if (target.closest(".note-audio")) {
      deletable = target.closest(".note-audio");
      typeName = "audio";
    }
    // 5. Files (Wrapped in <a>)
    else if (target.closest(".file-attachment") || target.closest("a > .file-attachment")) {
      const wrapper = target.closest("a");
      // If wrapped in <a>, delete the <a>. Otherwise delete the div (legacy).
      deletable = wrapper ? wrapper : target.closest(".file-attachment");
      typeName = "file attachment";
    }

    // 6. Shapes (SVG)
    else if ((target.closest(".note-shape-container") || target.closest("svg")) && !target.closest("button")) { // Exclude headers/buttons
      deletable = target.closest(".note-shape-container") || target.closest("svg");
      typeName = "shape";
    }

    if (deletable) {
      event.preventDefault();
      event.stopPropagation(); // prevent opening the link

      // Select for visual feedback
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNode(deletable);
      selection.removeAllRanges();
      selection.addRange(range);

      if (confirm(`Delete this ${typeName}?`)) {
        deletable.remove();
      } else {
        // Deselect if cancelled
        selection.removeAllRanges();
      }
    }
  });


  // Shape Click Handling for Resize
  contentEl.addEventListener("click", (event) => {
    const target = event.target;
    const container = target.closest(".note-shape-container");

    if (container) {
      const svg = container.querySelector("svg");
      if (svg) {
        const currentWidth = svg.getAttribute("width") || "100";
        const newSize = prompt("Set shape size (e.g., 50, 200, 100%):", currentWidth);
        if (newSize) {
          svg.setAttribute("width", newSize);
          svg.setAttribute("height", newSize);
        }
      }
    }
  });
}