import { stripHtml, escapeHtml, formatDate } from "./utilities.js";

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
      const content = stripHtml(note.content || "");

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
  // Headings
  text = text.replace(/<h1.*?>(.*?)<\/h1>/gi, "\n# $1\n");
  text = text.replace(/<h2.*?>(.*?)<\/h2>/gi, "\n## $1\n");
  text = text.replace(/<h3.*?>(.*?)<\/h3>/gi, "\n### $1\n");
  // Simple Formatting
  text = text.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  text = text.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  text = text.replace(/<i>(.*?)<\/i>/gi, "*$1*");
  text = text.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  text = text.replace(/<u>(.*?)<\/u>/gi, "__$1__");
  text = text.replace(/<strike.*?>(.*?)<\/strike>/gi, "~~$1~~");
  text = text.replace(/<s.*?>(.*?)<\/s>/gi, "~~$1~~");
  // Lists
  text = text.replace(/<li.*?>(.*?)<\/li>/gi, "\n* $1");
  // Blocks
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<div>/gi, "\n");
  text = text.replace(/<\/div>/gi, "");
  text = text.replace(/<p>(.*?)<\/p>/gi, "\n$1\n");
  // Media
  text = text.replace(/<img.*?src="(.*?)".*?>/gi, "\n![Note Image]($1)\n");
  text = text.replace(/<video.*?src="(.*?)".*?>/gi, "\n[Embedded Video]($1)\n");
  // Cleanup
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
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

export function exportNotes(notes, format = 'txt', customFilename = null) {
  if (format === 'pdf') {
    printNotes(notes);
    return;
  }

  // Double check we have notes
  if (!notes || notes.length === 0) {
    alert("No notes found to export. Please draft or select a note first.");
    return;
  }

  let text = "";
  // Safe filename generator: handles spaces and null titles
  const safeTitle = (notes[0] && notes[0].title ? notes[0].title : "untitled").toLowerCase().replace(/\s+/g, '-');
  const baseFilename = notes.length === 1 ? `note-${safeTitle}` : "notes-backup";
  let filename = customFilename || `${baseFilename}.${format}`;
  let type = format === 'md' ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";

  if (format === 'md') {
    text = formatNotesAsMarkdown(notes);
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
    <div class="note-print-wrapper">
      <div class="note-print-item">
        <h1 class="document-title">${escapeHtml(note.title || "Untitled Note")}</h1>
        <div class="document-metadata">
          <div class="meta-col">
            <span class="meta-label">Date Published</span>
            <span class="meta-value">${escapeHtml(formatDate(note.updatedAt))}</span>
          </div>
          <div class="meta-col">
            <span class="meta-label">Tags</span>
            <span class="meta-value">${escapeHtml((note.tags || []).join(", ") || "No specific tags")}</span>
          </div>
          ${note.folderId ? `
          <div class="meta-col">
            <span class="meta-label">Collection</span>
            <span class="meta-value">Global Workspace / Sub Folder</span>
          </div>` : ""}
        </div>
        
        <div class="note-print-content">
          ${note.content || "<p>(This note has no text content)</p>"}
        </div>
      </div>
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
        <title>Global Notes - Premium Export</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
        <style>
          @page { 
            size: A4; 
            margin: 20mm;
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-family: 'Inter', sans-serif;
              font-size: 9pt;
              color: #999;
            }
          }
          
          :root {
            --primary-charcoal: #1e293b;
            --secondary-slate: #64748b;
            --accent-blue: #3b82f6;
            --border-light: #e2e8f0;
          }

          body { 
            font-family: 'Inter', system-ui, sans-serif; 
            background: #fff;
            color: var(--primary-charcoal);
            line-height: 1.6;
            margin: 0;
            padding: 30px;
          }

          /* Premium Branding Header */
          .document-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--primary-charcoal);
            padding-bottom: 15px;
            margin-bottom: 40px;
          }
          .brand-logo {
            font-family: 'Outfit', sans-serif;
            font-weight: 700;
            font-size: 18pt;
            letter-spacing: -0.5px;
            color: var(--primary-charcoal);
          }
          .brand-logo span { color: var(--accent-blue); }
          .doc-type {
            font-size: 9pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--secondary-slate);
          }

          /* Document Title & Metadata */
          .document-title {
            font-family: 'Outfit', sans-serif;
            font-size: 32pt;
            font-weight: 700;
            margin: 0 0 20px 0;
            line-height: 1.1;
            color: var(--primary-charcoal);
          }
          .document-metadata {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            padding: 20px 0;
            border-top: 1px solid var(--border-light);
            border-bottom: 1px solid var(--border-light);
            margin-bottom: 40px;
          }
          .meta-col { display: flex; flex-direction: column; }
          .meta-label { 
            font-size: 7pt; 
            text-transform: uppercase; 
            font-weight: 700; 
            color: var(--secondary-slate); 
            margin-bottom: 4px;
            letter-spacing: 0.5px;
          }
          .meta-value { font-size: 10pt; font-weight: 500; }

          /* Content Styling */
          .note-print-content { 
            font-size: 11.5pt; 
            color: #334155;
          }
          .note-print-content h1, .note-print-content h2, .note-print-content h3 {
            font-family: 'Outfit', sans-serif;
            color: var(--primary-charcoal);
            margin-top: 30px;
            margin-bottom: 10px;
          }
          .note-print-content h1 { font-size: 20pt; }
          .note-print-content h2 { font-size: 16pt; }
          .note-print-content h3 { font-size: 14pt; }
          
          .note-print-content p { margin-bottom: 16px; font-size: 11pt; }
          
          .note-print-content ul, .note-print-content ol { 
            margin-bottom: 16px; 
            padding-left: 1.5rem;
          }
          .note-print-content li { margin-bottom: 8px; font-size: 11pt; }
          
          .note-print-wrapper { page-break-after: always; }
          .note-print-wrapper:last-child { page-break-after: auto; }

          img, video { 
            max-width: 100%; 
            height: auto; 
            border-radius: 8px; 
            display: block; 
            margin: 25px 0; 
            border: 1px solid var(--border-light);
          }
          pre { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid var(--accent-blue);
            font-family: 'Consolas', monospace; 
            font-size: 10pt; 
            margin: 20px 0;
            white-space: pre-wrap;
          }
          code { font-family: monospace; background: #eff6ff; color: var(--accent-blue); padding: 2px 6px; border-radius: 4px; }
          
          blockquote {
            border-left: 4px solid var(--border-light);
            padding-left: 20px;
            margin: 20px 0;
            font-style: italic;
            color: var(--secondary-slate);
          }

          @media print {
            body { padding: 0; }
            .no-print { display: none; }
            .document-header { margin-top: 0; }
          }
          
          .footer {
            margin-top: 80px;
            padding-top: 20px;
            border-top: 1px solid var(--border-light);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .footer-text { font-size: 8pt; color: var(--secondary-slate); }
          .page-counter:after { content: "Page " counter(page); font-size: 8pt; color: var(--secondary-slate); }
          
          /* Print Buttons */
          .print-controls {
            position: fixed;
            bottom: 30px;
            right: 30px;
            display: flex;
            gap: 12px;
          }
          .btn-print {
            padding: 12px 24px;
            background: var(--primary-charcoal);
            color: #fff;
            border: none;
            border-radius: 100px;
            cursor: pointer;
            font-weight: 600;
            font-size: 10pt;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
            transition: transform 0.2s, background 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Outfit', sans-serif;
          }
          .btn-print:hover { transform: translateY(-2px); background: #000; }
        </style>
      </head>
      <body>
        <div class="print-controls no-print">
          <button onclick="window.print()" class="btn-print">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print to PDF
          </button>
        </div>

        <div class="document-header">
          <div class="brand-logo">Global Notes <span>Workspace</span></div>
          <div class="doc-type">Intelligence Report</div>
        </div>

        ${printContent}

        <div class="footer no-print">
          <div class="footer-text">Verified Document &bull; ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div class="page-counter"></div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// Sets up event listeners for import/export functionality
export function wireImportExport(state) {
  $("#export")?.addEventListener("click", () => {
    // Check if there are any notes at all
    if (!state.notes || state.notes.length === 0) {
      alert("No notes available to export. Create a note first!");
      return;
    }

    let modal = document.getElementById("export-modal");
    if (!modal) {
      // Lazy create the modal if not present in the DOM (e.g. on landing pages or old builds)
      console.log("Lazy creating export modal...");
      document.body.insertAdjacentHTML('beforeend', `
        <dialog id="export-modal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Export Workspace</h2>
              <button class="btn-icon close-modal">&times;</button>
            </div>
            <div class="modal-body">
              <div class="export-options" style="display: grid; gap: 20px;">
                <div class="export-section">
                  <h3 style="margin-bottom: 8px; font-size: 0.8em; color: var(--text-secondary); text-transform: uppercase;">Active Note</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button class="btn secondary" id="export-active-txt">Text (.txt)</button>
                    <button class="btn secondary" id="export-active-md">Markdown (.md)</button>
                    <button class="btn primary" id="export-active-pdf" style="grid-column: span 2;">Professional PDF</button>
                  </div>
                </div>
                <div style="height: 1px; background: rgba(128,128,128,0.2);"></div>
                <div class="export-section">
                  <h3 style="margin-bottom: 8px; font-size: 0.8em; color: var(--text-secondary); text-transform: uppercase;">Backup All</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button class="btn secondary" id="export-all-txt">All Files (.txt)</button>
                    <button class="btn secondary" id="export-all-md">All Files (.md)</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </dialog>
      `);
      modal = document.getElementById("export-modal");
    }

    // Helper for getting active note
    const getActiveNote = () => state.notes.find(n => n.id === state.activeNoteId);

    // MAPPING ALL CLICKABLE IDs (New and Legacy for cached browsers)
    const exportTargets = [
      { id: "export-active-txt", notes: () => [getActiveNote()], format: 'txt' },
      { id: "export-active-md", notes: () => [getActiveNote()], format: 'md' },
      { id: "export-active-pdf", notes: () => [getActiveNote()], format: 'pdf' },
      { id: "export-all-txt", notes: () => state.notes, format: 'txt' },
      { id: "export-all-md", notes: () => state.notes, format: 'md' },
      // LEGACY IDs (Support for old app.html versions)
      { id: "export-txt", notes: () => state.notes, format: 'txt' },
      { id: "export-md", notes: () => state.notes, format: 'md' },
      { id: "export-pdf", notes: () => [getActiveNote()], format: 'pdf' }
    ];

    exportTargets.forEach(target => {
      const btn = document.getElementById(target.id);
      if (!btn) return;

      btn.onclick = (e) => {
        e.stopPropagation();
        const nts = target.notes().filter(n => n); // Clean nulls

        if (nts.length === 0) {
          alert("Could not identify the note to export. Please make sure a note is selected.");
        } else {
          exportNotes(nts, target.format);
        }
        modal.close();
      };
    });

    // Modal behavior (Close buttons and backdrop)
    modal.querySelectorAll(".close-modal").forEach(b => {
      b.onclick = () => modal.close();
    });

    modal.onclick = (e) => {
      if (e.target === modal) modal.close();
    };

    modal.showModal();
  });
}