
const $ = (selector) => document.querySelector(selector);

export function wireSlashCommands() {
    const contentEl = $("#content");
    if (!contentEl) return;

    // Create menu element
    const menu = document.createElement("div");
    menu.className = "slash-menu hidden";
    menu.innerHTML = `
      <div class="slash-item active" data-cmd="h1">Heading 1</div>
      <div class="slash-item" data-cmd="h2">Heading 2</div>
      <div class="slash-item" data-cmd="p">Paragraph</div>
      <div class="slash-item" data-cmd="bullet">Bullet List</div>
      <div class="slash-item" data-cmd="photo-video">Image/Video</div>
      <div class="slash-item" data-cmd="file">Attach File</div>
      <div class="slash-item" data-cmd="audio">Record Audio</div>
      <div class="slash-item" data-cmd="table">Table</div>
    `;
    document.body.appendChild(menu);

    let isActive = false;
    let selectedIndex = 0;
    let savedRange = null; // Save range to restore after menu click

    contentEl.addEventListener("keydown", (e) => {
        if (isActive) {
            const items = menu.querySelectorAll(".slash-item");
            if (e.key === "ArrowDown") {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateSelection();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                updateSelection();
            } else if (e.key === "Enter") {
                e.preventDefault();
                triggerItem(items[selectedIndex]);
            } else if (e.key === "Escape") {
                e.preventDefault();
                closeMenu();
            }
        }
    });

    contentEl.addEventListener("keyup", (e) => {
        if (e.key === "/") {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                // Check if it's a valid trigger (start of line or after space)
                // For now, allow anywhere as per typical behavior
                openMenu(range);
            }
        }
    });

    // Close if clicking elsewhere
    document.addEventListener("click", (e) => {
        if (isActive && !menu.contains(e.target)) {
            closeMenu();
        }
    });

    function updateSelection() {
        const items = menu.querySelectorAll(".slash-item");
        items.forEach((item, i) => {
            item.classList.toggle("active", i === selectedIndex);
        });
        // Ensure active item is visible in scroll
        if (items[selectedIndex]) {
            items[selectedIndex].scrollIntoView({ block: "nearest" });
        }
    }

    function openMenu(range) {
        isActive = true;
        selectedIndex = 0;
        savedRange = range.cloneRange(); // Save location of the slash
        menu.classList.remove("hidden");
        updateSelection();

        const rect = range.getBoundingClientRect();
        // Improved positioning logic
        // If rect is 0 (collapsed), try to use getClientRects or fallback
        let top = rect.bottom;
        let left = rect.left;

        if (rect.width === 0 && rect.height === 0) {
            const rects = range.getClientRects();
            if (rects.length > 0) {
                top = rects[0].bottom;
                left = rects[0].left;
            } else {
                // Fallback to cursor event if available (not passed here), or approximation
                // Just use the selection logic again
                const sel = window.getSelection();
                if (sel.rangeCount > 0) {
                    const r = sel.getRangeAt(0).getBoundingClientRect();
                    top = r.bottom;
                    left = r.left;
                }
            }
        }

        menu.style.top = (top + window.scrollY + 5) + "px";
        menu.style.left = (left + window.scrollX) + "px";
    }

    function closeMenu() {
        isActive = false;
        menu.classList.add("hidden");
    }

    // Handle clicks
    menu.addEventListener("click", (e) => {
        // Prevent default to avoid losing focus immediately
        // e.preventDefault(); 
        const item = e.target.closest(".slash-item");
        if (item) {
            triggerItem(item);
        }
    });

    function triggerItem(item) {
        const cmd = item.dataset.cmd;

        // 1. Remove the slash first
        // We need to restore the range to where the slash was
        if (savedRange) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRange);

            // Delete the character before the cursor (assuming it is the slash)
            // Or select and delete.
            // Safer: select the slash. Range is at the END of the slash (after keyup).
            // So we extend backwards by 1.
            try {
                selection.modify("extend", "backward", "character");
                document.execCommand("delete");
            } catch (err) {
                console.warn("Could not delete slash automatically", err);
            }
        }

        closeMenu();

        // 2. Execute command
        executeCommand(cmd);
    }

    function executeCommand(cmd) {
        contentEl.focus(); // Ensure focus back to editor

        if (["h1", "h2", "p"].includes(cmd)) {
            document.execCommand("formatBlock", false, cmd === "p" ? "p" : cmd.toUpperCase());
        } else if (cmd === "bullet") {
            document.execCommand("insertUnorderedList", false, null);
        } else {
            // Triggers for media manager
            const insertSelect = $("#insert-action");
            if (insertSelect) {
                insertSelect.value = cmd;
                // Dispatch change event to trigger listeners in mediaManager.js
                insertSelect.dispatchEvent(new Event("change"));

                // Reset select for next time
                setTimeout(() => { insertSelect.value = ""; }, 100);
            }
        }
    }
}
