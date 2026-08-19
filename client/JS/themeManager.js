import { THEME_KEY } from "./constants.js";

const DEFAULT_THEME = "amoled-dark";
const VALID_THEMES = ["amoled-dark", "nature-green", "corporate-gray", "minimal-white"];

let currentStorageKey = THEME_KEY; // Default to Notes Workspace theme key

// Overrides the storage key to use for following operations (e.g., Code Workspace)
export function setThemeStorageKey(key) {
  currentStorageKey = key;
}

// Retrieves the user's preferred theme from localStorage or returns the default AMOLED dark theme
export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(currentStorageKey);
    return VALID_THEMES.includes(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

// Helper to detect if a color string is dark (black/dark-gray)
function isDarkColor(color) {
  if (!color) return false;
  color = color.trim().toLowerCase();
  if (color === "black" || color === "#000" || color === "#000000" || color === "#111" || color === "#111111" || color === "#222" || color === "#222222" || color === "#333" || color === "#333333") return true;
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
    return luminance < 90;
  }
  if (color.startsWith("#") && (color.length === 4 || color.length === 7)) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
    return luminance < 90;
  }
  return false;
}

export function adaptEditorTextColor() {
  const currentTheme = getStoredTheme();
  const isDarkTheme = currentTheme.includes("dark") || currentTheme === "corporate-gray";
  const contentEl = document.querySelector("#content");
  if (!contentEl) return;

  const elementsWithStyle = contentEl.querySelectorAll("[style*='color'], font[color]");
  elementsWithStyle.forEach(el => {
    const inlineColor = el.style.color || el.getAttribute("color") || "";
    if (isDarkTheme) {
      if (isDarkColor(inlineColor)) {
        el.dataset.origColor = inlineColor;
        el.style.color = "#f8fafc";
      }
    } else {
      if (el.dataset.origColor) {
        el.style.color = el.dataset.origColor;
      } else if (inlineColor === "rgb(248, 250, 252)" || inlineColor === "#f8fafc") {
        el.style.color = "";
      }
    }
  });
}

// Applies the specified theme to the UI by updating the data-theme attribute
export function applyTheme(theme) {
  const normalized = VALID_THEMES.includes(theme) ? theme : DEFAULT_THEME;
  const root = document.documentElement;
  if (root) {
    // Add transition class for smooth crossfade
    root.classList.add("theme-transitioning");
    root.dataset.theme = normalized;
    // Remove transition class after animation completes
    setTimeout(() => root.classList.remove("theme-transitioning"), 350);
  }

  const isDarkTheme = normalized.includes("dark") || normalized === "corporate-gray";
  const contentEl = document.querySelector("#content");
  if (contentEl) {
    contentEl.style.color = "";
    contentEl.style.backgroundColor = "";
    adaptEditorTextColor();
  }

  // Update theme selector dropdown to match current theme
  const selector = document.querySelector("#theme-selector");
  if (selector) {
    selector.value = normalized;
  }
  // Note Card Theme selector is ONLY available in Light themes
  const noteThemeSelect = document.querySelector("#note-theme");
  if (noteThemeSelect) {
    const target = noteThemeSelect.closest(".custom-select-wrapper") || noteThemeSelect;
    if (target) {
      if (isDarkTheme) {
        target.classList.add("hidden");
      } else {
        target.classList.remove("hidden");
      }
    }
  }

  // Synchronize icons for quick-toggle if button exists
  updateQuickToggleState(normalized);
}




// Updates the visibility of Sun/Moon icons in the quick-toggle button
function updateQuickToggleState(theme) {
  const sunIcon = document.querySelector(".theme-icon-sun");
  const moonIcon = document.querySelector(".theme-icon-moon");

  if (!sunIcon || !moonIcon) return;

  // If currently dark, show Sun to switch to light. If currently light, show Moon for dark.
  const isDark = theme.includes("dark") || theme === "corporate-gray";

  if (isDark) {
    sunIcon.classList.remove("hidden");
    moonIcon.classList.add("hidden");
  } else {
    sunIcon.classList.add("hidden");
    moonIcon.classList.remove("hidden");
  }
}

// Saves the user's theme preference to localStorage and applies it
export function persistTheme(theme) {
  try {
    localStorage.setItem(currentStorageKey, theme);
  } catch {
    // ignore storage issues
  }
  applyTheme(theme);
}

// Sets up the theme selector dropdown and initializes the theme based on user preference
export function wireThemeToggle() {
  // 1. Initial Apply & MutationObserver for content text color adaptation
  const currentTheme = getStoredTheme();
  applyTheme(currentTheme);

  const contentEl = document.querySelector("#content");
  if (contentEl && window.MutationObserver) {
    const observer = new MutationObserver(() => {
      adaptEditorTextColor();
    });
    observer.observe(contentEl, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
  }


  // 2. Handle Hidden Select
  const selector = document.querySelector("#theme-selector");
  if (selector) {
    selector.value = currentTheme;
    selector.addEventListener("change", () => {
      const newVal = selector.value;
      persistTheme(newVal);
      updateButtonState(newVal);
    });
  }

  // 3. Handle Custom Buttons (Dropdown options)
  const themeButtons = document.querySelectorAll(".theme-option");
  themeButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = btn.dataset.value;
      if (val) {
        persistTheme(val);
        if (selector) selector.value = val;
        updateButtonState(val);
      }
    });
  });

  // 4. Handle Quick Toggle Button (Navbar)
  const quickToggle = document.querySelector("#theme-quick-toggle");
  if (quickToggle) {
    quickToggle.addEventListener("click", () => {
      const current = getStoredTheme();
      // Decide toggle target: if currently dark, go to a white theme; otherwise go to dark.
      const isDark = current.includes("dark") || current === "corporate-gray";
      const target = isDark ? "minimal-white" : "amoled-dark";

      persistTheme(target);
      updateButtonState(target);
      if (selector) selector.value = target;
    });
  }

  // Initial button state
  updateButtonState(currentTheme);
  updateQuickToggleState(currentTheme);

  // 5. Wire AI Memory & Style Opt-in Controls
  wireAIMemoryPreferences();

  function updateButtonState(activeTheme) {
    themeButtons.forEach(btn => {
      if (btn.dataset.value === activeTheme) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }
}

function wireAIMemoryPreferences() {
  const toggle = document.querySelector("#ai-memory-toggle");
  const container = document.querySelector("#ai-memory-container");
  const textarea = document.querySelector("#ai-memory-text");
  const saveBtn = document.querySelector("#ai-memory-save-btn");

  if (!toggle || !container) return;

  const isEnabled = localStorage.getItem("gnw_ai_memory_enabled") === "true";
  const savedPrompt = localStorage.getItem("gnw_ai_memory_text") || "";

  toggle.checked = isEnabled;
  if (isEnabled) container.classList.remove("hidden");
  if (textarea) textarea.value = savedPrompt;

  toggle.addEventListener("change", () => {
    const checked = toggle.checked;
    localStorage.setItem("gnw_ai_memory_enabled", checked ? "true" : "false");
    if (checked) {
      container.classList.remove("hidden");
    } else {
      container.classList.add("hidden");
    }
  });

  saveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    const text = (textarea?.value || "").trim().substring(0, 500);
    localStorage.setItem("gnw_ai_memory_text", text);
    const notification = document.createElement("div");
    notification.style.cssText = "font-size: 11px; color: #10b981; margin-top: 4px; text-align: center;";
    notification.textContent = "✓ Memory Saved!";
    saveBtn.parentNode.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  });
}