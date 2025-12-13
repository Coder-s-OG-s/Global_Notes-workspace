const $ = (selector) => document.querySelector(selector);

// Converts an array of note objects into a formatted text string for export
export function formatNotesAsText(notes) {
  if (!Array.isArray(notes) || notes.length === 0) {
    return "(No notes to export)";
  }

  return notes
    .map((note, index) => {
      const title = note.title || "Untitled note";
      const tags = (note.tags || []).join(", ") || "none";
      const created = note.createdAt || "";
      const updated = note.updatedAt || "";
      const content = note.content || "";

      const lines = [
        `=== NOTE ${index + 1} ===`,
        `Title: ${title}`,
        `Tags: ${tags}`,
      ];

      if (created) lines.push(`Created: ${created}`);
      if (updated) lines.push(`Updated: ${updated}`);

      lines.push("", "Content:");
      lines.push(content || "(empty)");
      lines.push("", "=== END NOTE " + (index + 1) + " ===", "");

      return lines.join("\n");
    })
    .join("\n");
}

// Exports all notes as a downloadable text file


// Converts HTML content to basic Markdown
function htmlToMarkdown(html) {
  let text = html || "";
  text = text.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  text = text.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  text = text.replace(/<i>(.*?)<\/i>/gi, "*$1*");
  text = text.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<div>/gi, "\n");
  text = text.replace(/<\/div>/gi, "");
  text = text.replace(/<p>(.*?)<\/p>/gi, "\n$1\n");
  text = text.replace(/&nbsp;/g, " ");
  // Strip remaining tags
  text = text.replace(/<[^>]*>/g, "");
  return text.trim();
}

export function formatNotesAsMarkdown(notes) {
  if (!Array.isArray(notes) || notes.length === 0) return "# No notes to export";

  return notes.map((note) => {
    const title = note.title || "Untitled";
    const created = note.createdAt ? `*Created: ${note.createdAt}*` : "";
    const tags = (note.tags || []).length ? `**Tags:** ${note.tags.join(", ")}` : "";
    const content = htmlToMarkdown(note.content);

    return `# ${title}\n${created}\n${tags}\n\n${content}\n\n---\n`;
  }).join("\n");
}

export function exportNotes(notes, format = 'txt') {
  if (format === 'pdf') {
    printNotes(notes);
    return;
  }

  let text = "";
  let filename = "notes-backup.txt";
  let type = "text/plain;charset=utf-8";

  if (format === 'md') {
    text = formatNotesAsMarkdown(notes);
    filename = "notes-export.md";
  } else {
    text = formatNotesAsText(notes);
  }

  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function printNotes(notes) {
  const printContent = notes.map(note => `
    <div style="margin-bottom: 2rem; page-break-inside: avoid;">
      <h2 style="margin-bottom: 0.5rem;">${note.title || "Untitled"}</h2>
      <div style="font-size: 0.8em; color: #666; margin-bottom: 1rem;">
        ${note.createdAt ? `Created: ${note.createdAt} | ` : ""}
        Tags: ${(note.tags || []).join(", ") || "None"}
      </div>
      <div style="line-height: 1.6;">
        ${note.content || "(No content)"}
      </div>
      <hr style="margin-top: 2rem; border: none; border-top: 1px solid #ddd;">
    </div>
  `).join("");

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to export as PDF");
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>Notes Export</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
          img { max-width: 100%; }
        </style>
      </head>
      <body>
        <h1>My Notes Export</h1>
        ${printContent}
        <script>
          window.onload = () => { window.print(); window.close(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// Sets up event listeners for import/export functionality
export function wireImportExport(state) { // Accepts state object now
  $("#export")?.addEventListener("click", () => {
    // Check if we already have the modal
    let modal = document.getElementById("export-modal");
    if (!modal) {
      // Lazy create modal
      document.body.insertAdjacentHTML('beforeend', `
        <dialog id="export-modal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Export Notes</h2>
              <button class="btn-icon close-modal">×</button>
            </div>
            <div style="display: grid; gap: 10px;">
              <button class="btn" id="export-txt">Text File (.txt)</button>
              <button class="btn" id="export-md">Markdown (.md)</button>
              <button class="btn" id="export-pdf">PDF (Print View)</button>
            </div>
          </div>
        </dialog>
      `);
      modal = document.getElementById("export-modal");

      modal.querySelector(".close-modal").onclick = () => modal.close();
      modal.onclick = (e) => { if (e.target === modal) modal.close(); };

      document.getElementById("export-txt").onclick = () => {
        exportNotes(state.notes, 'txt');
        modal.close();
      };
      document.getElementById("export-md").onclick = () => {
        exportNotes(state.notes, 'md');
        modal.close();
      };
      document.getElementById("export-pdf").onclick = () => {
        exportNotes(state.notes, 'pdf');
        modal.close();
      };
    }

    document.getElementById("export-modal").showModal();
  });
}