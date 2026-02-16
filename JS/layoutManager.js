export function wireSidebarToggle() {
    const mobileToggleBtn = document.querySelector("#sidebar-toggle"); // Keep old ID for mobile header
    const layout = document.querySelector(".layout");

    if (!layout) return;

    // Mobile Toggle Button (Navbar) - Handles Drawer visibility
    if (mobileToggleBtn) {
        mobileToggleBtn.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                // Mobile: Toggle Drawer
                layout.classList.toggle("sidebar-visible");
            }
        });
    }
}

export function wireToolTabs() {
    const tabs = document.querySelectorAll(".tool-tab");
    const panels = document.querySelectorAll(".tool-panel");

    if (!tabs.length || !panels.length) return;

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove("active"));
            // Add active class to clicked tab
            tab.classList.add("active");

            // Hide all panels
            panels.forEach(p => p.classList.remove("active"));
            // Show target panel
            const targetId = `tool-panel-${tab.dataset.tab}`;
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add("active");
            }
        });
    });
}

// Handles toggling the visibility of the formatting toolbar
export function wireToolbarToggle() {
    const toggleBtn = document.querySelector("#toolbar-toggle");
    const toolbar = document.querySelector(".editor-toolbar");

    if (!toggleBtn || !toolbar) return;

    // Check for saved preference
    const isCollapsed = localStorage.getItem("notesWorkspace.toolbarCollapsed") === "true";
    if (isCollapsed) {
        toolbar.classList.add("collapsed");
    }

    toggleBtn.addEventListener("click", () => {
        toolbar.classList.toggle("collapsed");

        // Save preference
        const isNowCollapsed = toolbar.classList.contains("collapsed");
        localStorage.setItem("notesWorkspace.toolbarCollapsed", isNowCollapsed);
    });
}

// Handles sidebar resizing
export function wireSidebarResize() {
    const resizer = document.getElementById("sidebar-resizer");
    const layout = document.querySelector(".layout");

    if (!resizer || !layout) return;

    // Load saved width
    const savedWidth = localStorage.getItem("notesWorkspace.sidebarWidth");
    if (savedWidth) {
        document.documentElement.style.setProperty("--sidebar-width", savedWidth);
    }

    let isResizing = false;

    resizer.addEventListener("mousedown", (e) => {
        isResizing = true;
        resizer.classList.add("resizing");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none"; // Prevent text selection
    });

    document.addEventListener("mousemove", (e) => {
        if (!isResizing) return;

        // Calculate new width
        // The layout has padding, so we might need to adjust or just take the mouse X relative to the layout
        const layoutRect = layout.getBoundingClientRect();
        let newWidth = e.clientX - layoutRect.left - parseFloat(getComputedStyle(layout).paddingLeft);

        // Enforce min and max widths
        const minWidth = 240;
        const maxWidth = 600; // Or a percentage of window width

        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;

        // Update CSS variable
        document.documentElement.style.setProperty("--sidebar-width", `${newWidth}px`);
    });

    document.addEventListener("mouseup", () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove("resizing");
            document.body.style.cursor = "";
            document.body.style.userSelect = "";

            // Save width
            const currentWidth = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width");
            localStorage.setItem("notesWorkspace.sidebarWidth", currentWidth);
        }
    });
}
