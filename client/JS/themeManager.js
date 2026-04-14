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

  // Let CSS variables drive colors; clear any previous inline overrides
  const contentEl = document.querySelector("#content");
  if (contentEl) {
    contentEl.style.color = "";
    contentEl.style.backgroundColor = "";
  }

  // Update theme selector dropdown to match current theme
  const selector = document.querySelector("#theme-selector");
  if (selector) {
    selector.value = normalized;
  }
  // Handle visibility of the 'Note Card Theme' selector (only relevant for light themes)
  const noteThemeSelect = document.querySelector("#note-theme");
  if (noteThemeSelect) {
    const isDark = normalized === "amoled-dark" || normalized === "corporate-gray";
    // Target ONLY the note-theme custom wrapper or the select itself
    const target = noteThemeSelect.closest(".custom-select-wrapper") || noteThemeSelect;

    if (target) {
      target.classList.toggle("hidden", isDark);
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
  // 1. Initial Apply
  const currentTheme = getStoredTheme();
  applyTheme(currentTheme);

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