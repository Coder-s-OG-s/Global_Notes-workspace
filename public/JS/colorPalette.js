/**
 * Creates an MS Word style color palette popover
 */
export function createColorPalettePopover({ triggerElement, onSelectColor, initialColor = "#000000", showAutomatic = true, nativeInput = null }) {
  // Close any existing open color popovers
  document.querySelectorAll(".ms-color-palette-popover").forEach((p) => p.remove());

  const popover = document.createElement("div");
  popover.className = "ms-color-palette-popover show";

  // Prevent mousedown from stealing editor selection focus
  popover.addEventListener("mousedown", (e) => {
    e.preventDefault();
  });

  // 1. Automatic Option
  let html = "";
  if (showAutomatic) {
    html += `
      <div class="palette-option-auto" data-color="inherit">
        <span class="auto-swatch-box"></span>
        <span class="auto-label">Automatic</span>
      </div>
      <div class="palette-divider"></div>
    `;
  }

  // 2. Theme Colors Header & Grid
  // Top 10 theme base colors (MS Word palette)
  const themeBaseColors = [
    "#ffffff", "#000000", "#e7e6e6", "#1f4e79", "#2f5597",
    "#ed7d31", "#70ad47", "#5b9bd5", "#7030a0", "#00b050"
  ];

  // 5 shade rows (tints and shades matching MS Word)
  const themeShades = [
    // Tint 80% / 60%
    ["#f2f2f2", "#7f7f7f", "#d9d9d9", "#dce6f1", "#b8cce4", "#fce4d6", "#e2efda", "#dedeeb", "#f2e6f4", "#e2f0d9"],
    // Tint 60% / 40%
    ["#d9d9d9", "#595959", "#bfbfbf", "#b8cce4", "#95b3d7", "#f8cbad", "#c6e0b4", "#bdc0e8", "#e4cced", "#c6e0b4"],
    // Tint 40% / 20%
    ["#bfbfbf", "#3f3f3f", "#a6a6a6", "#95b3d7", "#366092", "#f4b084", "#a9d08e", "#9ca0e0", "#d8b2e1", "#a9d08e"],
    // Shade 25%
    ["#a6a6a6", "#262626", "#808080", "#16365c", "#244062", "#c65911", "#548235", "#2f5597", "#592780", "#385723"],
    // Shade 50%
    ["#7f7f7f", "#0d0d0d", "#595959", "#0f243e", "#182a40", "#833c0c", "#375623", "#1f3864", "#3b1a55", "#1e3914"]
  ];

  html += `<div class="theme-colors-grid">`;
  // Row 0: Base Theme Colors
  html += `<div class="color-row base-row">`;
  themeBaseColors.forEach((color) => {
    html += `<button type="button" class="color-swatch-btn" data-color="${color}" style="background-color:${color};" title="${color}"></button>`;
  });
  html += `</div>`;

  // Rows 1-5: Theme Shades
  themeShades.forEach((row) => {
    html += `<div class="color-row shade-row">`;
    row.forEach((color) => {
      html += `<button type="button" class="color-swatch-btn" data-color="${color}" style="background-color:${color};" title="${color}"></button>`;
    });
    html += `</div>`;
  });
  html += `</div>`;

  // 3. Standard Colors Section
  const standardColors = [
    "#c00000", "#ff0000", "#ffc000", "#ffff00", "#92d050",
    "#00b050", "#00b0f0", "#0070c0", "#002060", "#7030a0"
  ];

  html += `
    <div class="palette-divider"></div>
    <div class="palette-section-title">Standard Colors</div>
    <div class="color-row standard-row">
  `;
  standardColors.forEach((color) => {
    html += `<button type="button" class="color-swatch-btn" data-color="${color}" style="background-color:${color};" title="${color}"></button>`;
  });
  html += `</div>`;

  // 4. More Colors Button
  html += `
    <div class="palette-divider"></div>
    <div class="palette-option-more" id="palette-more-colors">
      <svg class="palette-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-right:6px;">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 2a10 10 0 0 0 0 20z" fill="#6366f1"></path>
      </svg>
      <span>More Colors...</span>
    </div>
  `;

  popover.innerHTML = html;
  document.body.appendChild(popover);

  // Position popover relative to trigger element
  const rect = triggerElement.getBoundingClientRect();
  popover.style.position = "fixed";
  popover.style.top = `${rect.bottom + 6}px`;
  popover.style.left = `${Math.min(rect.left, window.innerWidth - 230)}px`;
  popover.style.zIndex = "99999";

  const closePopover = () => {
    popover.remove();
    document.removeEventListener("click", onDocumentClick);
    window.removeEventListener("scroll", onDocumentClick);
  };

  const onDocumentClick = (e) => {
    if (!popover.contains(e.target) && !triggerElement.contains(e.target)) {
      closePopover();
    }
  };

  setTimeout(() => {
    document.addEventListener("click", onDocumentClick);
    window.addEventListener("scroll", onDocumentClick, { passive: true });
  }, 10);

  // Handle color swatch clicks
  popover.querySelectorAll(".color-swatch-btn, .palette-option-auto").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const color = btn.dataset.color;
      if (onSelectColor) onSelectColor(color);
      closePopover();
    });
  });

  // Handle More Colors click
  const moreBtn = popover.querySelector("#palette-more-colors");
  if (moreBtn && nativeInput) {
    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closePopover();
      nativeInput.click();
    });
  }
}
