import { insertHtmlAtCursor } from "./formattingToolbar.js";

export function wireShapeManager() {
    const shapesModal = document.getElementById("shapes-modal");
    const closeBtn = shapesModal?.querySelector(".close-modal");
    const cancelBtn = shapesModal?.querySelector(".secondary");
    const shapesGrid = shapesModal?.querySelector(".shapes-grid");

    if (!shapesModal) return;

    // Close modal handlers
    const closeModal = () => {
        shapesModal.close();
    };

    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);

    // Close on backdrop click
    shapesModal.addEventListener("click", (e) => {
        if (e.target === shapesModal) {
            closeModal();
        }
    });

    // Shape selection handler
    shapesGrid?.addEventListener("click", (e) => {
        const btn = e.target.closest(".shape-btn");
        if (!btn) return;

        const shapeType = btn.dataset.shape;
        insertShape(shapeType);
        closeModal();
    });
}

function insertShape(type) {
    let svgContent = "";
    const commonAttrs = 'width="100" height="100" viewBox="0 0 24 24" style="display:inline-block; vertical-align:middle; margin: 0 4px; resize: both; overflow: hidden;"';
    const strokeAttrs = 'stroke="currentColor" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"';

    switch (type) {
        case "rectangle":
            svgContent = `<svg ${commonAttrs}><rect x="2" y="4" width="20" height="16" rx="2" ${strokeAttrs}/></svg>`;
            break;
        case "circle":
            svgContent = `<svg ${commonAttrs}><circle cx="12" cy="12" r="10" ${strokeAttrs}/></svg>`;
            break;
        case "triangle":
            svgContent = `<svg ${commonAttrs}><path d="M12 2L22 20H2L12 2Z" ${strokeAttrs}/></svg>`;
            break;
        case "star":
            svgContent = `<svg ${commonAttrs}><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" ${strokeAttrs}/></svg>`;
            break;
        case "arrow-right":
            svgContent = `<svg ${commonAttrs}><path d="M5 12H19M19 12L12 5M19 12L12 19" ${strokeAttrs} stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            break;
        case "line":
            svgContent = `<svg ${commonAttrs}><line x1="2" y1="12" x2="22" y2="12" ${strokeAttrs} stroke-linecap="round"/></svg>`;
            break;
    }

    if (svgContent) {
        const wrappedContent = `<span class="note-shape-container" contenteditable="false" draggable="true" style="display: inline-block; cursor: move; user-select: none;">${svgContent}</span><span>&nbsp;</span>`;
        insertHtmlAtCursor(wrappedContent);
    }
}
