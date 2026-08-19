import { showToast } from "./utilities.js";

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

export function initPDFEditor() {
    const navBtn = document.getElementById("nav-pdf-editor");
    const modal = document.getElementById("pdf-editor-modal");
    const closeBtn = document.getElementById("close-pdf-modal");
    const fileInput = document.getElementById("pdf-file-input");

    if (navBtn && modal) {
        navBtn.addEventListener("click", () => {
            modal.showModal();
        });
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
}

function loadPDFFile(file) {
    document.getElementById("pdf-file-name").textContent = file.name;
    const fileReader = new FileReader();

    fileReader.onload = function () {
        const typedarray = new Uint8Array(this.result);
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            window.pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
                pdfDoc = pdf;
                pageNum = 1;
                pageAnnotations = {};
                document.getElementById("pdf-page-num").textContent = `Page ${pageNum} / ${pdfDoc.numPages}`;
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

    document.getElementById("pdf-page-num").textContent = `Page ${num} / ${pdfDoc.numPages}`;
}

function restoreAnnotations(num) {
    const drawCanvas = document.getElementById("pdf-draw-canvas");
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
    pageAnnotations[num] = drawCanvas.toDataURL();
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

    exportBtn?.addEventListener("click", exportAnnotatedPDF);
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

function exportAnnotatedPDF() {
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

function attachPDFToActiveNote() {
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

    const imgUrl = merged.toDataURL("image/png");
    const imgHtml = `<p><img src="${imgUrl}" alt="PDF Page ${pageNum} Annotation" style="max-width:100%; border-radius:8px; margin: 12px 0; border:1px solid rgba(255,255,255,0.1);" /></p>`;

    const contentEditor = document.getElementById("content");
    if (contentEditor) {
        contentEditor.focus();
        document.execCommand("insertHTML", false, imgHtml);
        showToast(`Attached PDF Page ${pageNum} annotation to note`, "success");
        document.getElementById("pdf-editor-modal").close();
    } else {
        showToast("Active note editor not found", "error");
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPDFEditor);
} else {
    initPDFEditor();
}
