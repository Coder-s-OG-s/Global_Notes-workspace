import { showToast, wireAppsDropdown } from "./utilities.js";

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.3;
let currentTool = "draw"; // "draw", "highlight", "text"
let currentColor = "#3b82f6";
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let pageAnnotations = {}; // pageNum -> dataURL or canvas state

// ========================================
// INDEXEDDB PERSISTENCE FOR PDF EDITOR
// ========================================
let activeArrayBuffer = null;
let activeFileName = "Document.pdf";

function getPDFDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("PDFEditorDB", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("pdfStore")) {
                db.createObjectStore("pdfStore");
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function savePDFToCache(fileName, arrayBuffer, annotations = {}, currentPage = 1) {
    try {
        const db = await getPDFDB();
        const tx = db.transaction("pdfStore", "readwrite");
        const store = tx.objectStore("pdfStore");
        store.put({
            name: fileName,
            buffer: arrayBuffer,
            annotations: annotations,
            pageNum: currentPage,
            savedAt: new Date().toISOString()
        }, "activeDoc");
    } catch (err) {
        console.warn("Failed to persist PDF to IndexedDB:", err);
    }
}

async function getCachedPDF() {
    try {
        const db = await getPDFDB();
        return new Promise((resolve) => {
            const tx = db.transaction("pdfStore", "readonly");
            const store = tx.objectStore("pdfStore");
            const req = store.get("activeDoc");
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    } catch (err) {
        return null;
    }
}

async function restoreCachedPDFIfAvailable() {
    const cached = await getCachedPDF();
    if (cached && cached.buffer) {
        activeFileName = cached.name || "Document.pdf";
        activeArrayBuffer = cached.buffer;
        pageAnnotations = cached.annotations || {};
        pageNum = cached.pageNum || 1;
        
        const fileNameEl = document.getElementById("pdf-file-name");
        if (fileNameEl) fileNameEl.textContent = activeFileName;

        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            window.pdfjsLib.getDocument(new Uint8Array(cached.buffer)).promise.then(function (pdf) {
                pdfDoc = pdf;
                const pageNumEl = document.getElementById("pdf-page-num");
                if (pageNumEl) pageNumEl.textContent = `Page ${pageNum} / ${pdfDoc.numPages}`;
                renderPage(pageNum);
                showToast(`Restored active PDF: ${activeFileName}`, "info");
            }).catch(err => {
                console.error("Failed to restore PDF from cache:", err);
            });
        }
    }
}

export function initPDFEditor() {
    wireAppsDropdown();
    const modal = document.getElementById("pdf-editor-modal");
    const closeBtn = document.getElementById("close-pdf-modal");
    const fileInput = document.getElementById("pdf-file-input");

    if (modal && (window.location.hash === "#pdf-editor" || window.location.search.includes("open=pdf-editor"))) {
        if (typeof modal.showModal === "function") {
            modal.showModal();
        }
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            modal.close();
        });
    }

    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file && file.type === "application/pdf") {
                loadPDFFile(file);
            } else if (file) {
                showToast("Please select a valid PDF file.", "warning");
            }
        });
    }

    wirePDFToolbar();
    setupDrawCanvas();
    wireSaveNoteModal();
    restoreCachedPDFIfAvailable();
}

function wireSaveNoteModal() {
    const saveModal = document.getElementById("save-note-modal");
    const saveForm = document.getElementById("save-note-form");
    const closeBtn = document.getElementById("close-save-note-modal");
    const cancelBtn = document.getElementById("cancel-save-note-btn");
    const titleInput = document.getElementById("pdf-note-title-input");
    const folderSelect = document.getElementById("pdf-folder-select");
    const confirmBtn = document.getElementById("confirm-save-note-btn");

    if (closeBtn && saveModal) {
        closeBtn.addEventListener("click", () => {
            if (typeof saveModal.close === "function") saveModal.close();
            else saveModal.style.display = "none";
        });
    }

    if (cancelBtn && saveModal) {
        cancelBtn.addEventListener("click", () => {
            if (typeof saveModal.close === "function") saveModal.close();
            else saveModal.style.display = "none";
        });
    }

    if (saveForm) {
        saveForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const title = titleInput?.value.trim() || `Annotated PDF - ${activeFileName}`;
            const selectedFolderId = folderSelect?.value || null;

            if (!currentCapturedImgUrl) {
                showToast("No canvas annotation to save.", "warning");
                return;
            }

            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = "Saving to Database...";
            }

            const imgContent = `<p><strong>Source Document:</strong> ${activeFileName} (Page ${pageNum})</p><figure class="note-image"><img src="${currentCapturedImgUrl}" alt="PDF Page ${pageNum} Annotation" /><figcaption class="note-image-caption">Annotated PDF Page ${pageNum} Screenshot</figcaption></figure>`;

            try {
                const response = await fetch("/api/notes", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        title: title,
                        content: imgContent,
                        folderId: selectedFolderId,
                        tags: ["PDF-Annotation"]
                    })
                });

                if (response.ok) {
                    const savedNote = await response.json();
                    showToast("Successfully saved PDF annotation to Notes Database!", "success");
                    if (saveModal && typeof saveModal.close === "function") {
                        saveModal.close();
                    } else if (saveModal) {
                        saveModal.style.display = "none";
                    }
                } else {
                    const errText = await response.text();
                    showToast(`Failed to save note: ${errText || response.statusText}`, "error");
                }
            } catch (err) {
                console.error("Save note error:", err);
                showToast("Network error saving note to database", "error");
            } finally {
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = "Save Note to Database";
                }
            }
        });
    }
}

function loadPDFFile(file) {
    activeFileName = file.name;
    const fileNameEl = document.getElementById("pdf-file-name");
    if (fileNameEl) fileNameEl.textContent = activeFileName;

    const fileReader = new FileReader();
    fileReader.onload = function () {
        activeArrayBuffer = this.result;
        const typedarray = new Uint8Array(this.result);
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            window.pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
                pdfDoc = pdf;
                pageNum = 1;
                pageAnnotations = {};
                savePDFToCache(activeFileName, activeArrayBuffer, pageAnnotations, pageNum);
                const pageNumEl = document.getElementById("pdf-page-num");
                if (pageNumEl) pageNumEl.textContent = `Page ${pageNum} / ${pdfDoc.numPages}`;
                renderPage(pageNum);
                showToast(`Loaded PDF: ${file.name}`, "info");
            }).catch(err => {
                console.error("PDF load error:", err);
                showToast("Failed to parse PDF file.", "error");
            });
        } else {
            showToast("PDF rendering library loading...", "warning");
        }
    };
    fileReader.readAsArrayBuffer(file);
}

function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(function (page) {
        const viewport = page.getViewport({ scale: scale });
        const renderCanvas = document.getElementById("pdf-render-canvas");
        const drawCanvas = document.getElementById("pdf-draw-canvas");
        const wrapper = document.getElementById("pdf-canvas-wrapper");

        renderCanvas.height = viewport.height;
        renderCanvas.width = viewport.width;
        drawCanvas.height = viewport.height;
        drawCanvas.width = viewport.width;
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;

        const ctx = renderCanvas.getContext("2d");
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        const renderTask = page.render(renderContext);

        renderTask.promise.then(function () {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
            restoreAnnotations(num);
        });
    });

    const pageNumEl = document.getElementById("pdf-page-num");
    if (pageNumEl) pageNumEl.textContent = `Page ${num} / ${pdfDoc.numPages}`;
    if (activeArrayBuffer) {
        savePDFToCache(activeFileName, activeArrayBuffer, pageAnnotations, num);
    }
}

function restoreAnnotations(num) {
    const drawCanvas = document.getElementById("pdf-draw-canvas");
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    if (pageAnnotations[num]) {
        const img = new Image();
        img.onload = function () {
            ctx.drawImage(img, 0, 0);
        };
        img.src = pageAnnotations[num];
    }
}

function saveAnnotations(num) {
    const drawCanvas = document.getElementById("pdf-draw-canvas");
    if (drawCanvas) {
        pageAnnotations[num] = drawCanvas.toDataURL();
        if (activeArrayBuffer) {
            savePDFToCache(activeFileName, activeArrayBuffer, pageAnnotations, pageNum);
        }
    }
}

function wirePDFToolbar() {
    const prevBtn = document.getElementById("pdf-prev-page");
    const nextBtn = document.getElementById("pdf-next-page");
    const toolDraw = document.getElementById("pdf-tool-draw");
    const toolHighlight = document.getElementById("pdf-tool-highlight");
    const toolText = document.getElementById("pdf-tool-text");
    const colorPicker = document.getElementById("pdf-color-picker");
    const clearBtn = document.getElementById("pdf-clear-draw");
    const exportBtn = document.getElementById("pdf-export-btn");
    const attachBtn = document.getElementById("pdf-attach-note-btn");

    prevBtn?.addEventListener("click", () => {
        if (!pdfDoc || pageNum <= 1) return;
        saveAnnotations(pageNum);
        pageNum--;
        renderPage(pageNum);
    });

    nextBtn?.addEventListener("click", () => {
        if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
        saveAnnotations(pageNum);
        pageNum++;
        renderPage(pageNum);
    });

    [toolDraw, toolHighlight, toolText].forEach(btn => {
        btn?.addEventListener("click", (e) => {
            [toolDraw, toolHighlight, toolText].forEach(b => b?.classList.remove("active"));
            btn.classList.add("active");
            if (btn === toolDraw) currentTool = "draw";
            if (btn === toolHighlight) currentTool = "highlight";
            if (btn === toolText) currentTool = "text";
        });
    });

    colorPicker?.addEventListener("change", (e) => {
        currentColor = e.target.value;
    });

    clearBtn?.addEventListener("click", () => {
        const drawCanvas = document.getElementById("pdf-draw-canvas");
        const ctx = drawCanvas.getContext("2d");
        ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        delete pageAnnotations[pageNum];
        showToast("Annotations cleared for current page", "info");
    });

    exportBtn?.addEventListener("click", exportPDFPagePNG);
    attachBtn?.addEventListener("click", attachPDFToActiveNote);
}

function setupDrawCanvas() {
    const drawCanvas = document.getElementById("pdf-draw-canvas");
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");

    drawCanvas.addEventListener("mousedown", (e) => {
        if (!pdfDoc) return;
        const rect = drawCanvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;

        if (currentTool === "text") {
            const text = prompt("Enter text annotation:");
            if (text) {
                ctx.font = "16px Inter, sans-serif";
                ctx.fillStyle = currentColor;
                ctx.fillText(text, lastX, lastY);
                saveAnnotations(pageNum);
            }
            return;
        }

        isDrawing = true;
    });

    drawCanvas.addEventListener("mousemove", (e) => {
        if (!isDrawing || !pdfDoc) return;
        const rect = drawCanvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);

        if (currentTool === "highlight") {
            ctx.strokeStyle = currentColor + "66"; // 40% opacity
            ctx.lineWidth = 18;
            ctx.lineCap = "square";
        } else {
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
        }

        ctx.stroke();
        lastX = currentX;
        lastY = currentY;
    });

    drawCanvas.addEventListener("mouseup", () => {
        if (isDrawing) {
            isDrawing = false;
            saveAnnotations(pageNum);
        }
    });

    drawCanvas.addEventListener("mouseleave", () => {
        if (isDrawing) {
            isDrawing = false;
            saveAnnotations(pageNum);
        }
    });
}

function exportPDFPagePNG() {
    if (!pdfDoc) {
        showToast("Load a PDF file first", "warning");
        return;
    }
    saveAnnotations(pageNum);

    const renderCanvas = document.getElementById("pdf-render-canvas");
    const drawCanvas = document.getElementById("pdf-draw-canvas");

    const merged = document.createElement("canvas");
    merged.width = renderCanvas.width;
    merged.height = renderCanvas.height;
    const mctx = merged.getContext("2d");

    mctx.drawImage(renderCanvas, 0, 0);
    mctx.drawImage(drawCanvas, 0, 0);

    const dataUrl = merged.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `annotated_page_${pageNum}.png`;
    a.click();
    showToast(`Exported page ${pageNum} as PNG`, "success");
}

let currentCapturedImgUrl = null;

async function attachPDFToActiveNote() {
    if (!pdfDoc) {
        showToast("Load a PDF file first", "warning");
        return;
    }
    saveAnnotations(pageNum);

    const renderCanvas = document.getElementById("pdf-render-canvas");
    const drawCanvas = document.getElementById("pdf-draw-canvas");

    const merged = document.createElement("canvas");
    merged.width = renderCanvas.width;
    merged.height = renderCanvas.height;
    const mctx = merged.getContext("2d");

    mctx.drawImage(renderCanvas, 0, 0);
    mctx.drawImage(drawCanvas, 0, 0);

    currentCapturedImgUrl = merged.toDataURL("image/png");

    const modal = document.getElementById("save-note-modal");
    const titleInput = document.getElementById("pdf-note-title-input");
    const folderSelect = document.getElementById("pdf-folder-select");
    const thumbContainer = document.getElementById("pdf-preview-thumbnail");
    const pageInfo = document.getElementById("pdf-note-page-info");
    const fileName = document.getElementById("pdf-file-name")?.textContent || "Document";

    if (titleInput) {
        titleInput.value = `Annotated PDF - ${fileName} (Page ${pageNum})`;
    }
    if (pageInfo) {
        pageInfo.textContent = `PDF Page ${pageNum} Canvas Screenshot`;
    }
    if (thumbContainer) {
        thumbContainer.innerHTML = `<img src="${currentCapturedImgUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />`;
    }

    // Fetch existing folders directly from Database API
    if (folderSelect) {
        folderSelect.innerHTML = `<option value="">📁 General / No Folder</option>`;
        try {
            const res = await fetch("/api/folders");
            if (res.ok) {
                const folders = await res.json();
                folders.forEach(f => {
                    const opt = document.createElement("option");
                    opt.value = f.id || f._id;
                    opt.textContent = `📁 ${f.name}`;
                    folderSelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.warn("Folder sync warning:", err);
        }
    }

    if (modal && typeof modal.showModal === "function") {
        modal.showModal();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPDFEditor);
} else {
    initPDFEditor();
}
