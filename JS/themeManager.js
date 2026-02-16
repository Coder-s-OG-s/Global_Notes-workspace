import { THEME_KEY } from "./constants.js";

const DEFAULT_THEME = "amoled-dark";
const VALID_THEMES = ["amoled-dark", "nature-green", "corporate-gray", "minimal-white"];

// Retrieves the user's preferred theme from localStorage or returns the default AMOLED dark theme
export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
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
    root.dataset.theme = normalized;
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
}

// Saves the user's theme preference to localStorage and applies it
export function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
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

  // 3. Handle Custom Buttons
  const themeButtons = document.querySelectorAll(".theme-option");
  themeButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent closing dropdown if we want, or let it close?
      // Usually users might want to see the change immediately.
      // But let's keep dropdown open to allow switching back if they don't like it.
      const val = btn.dataset.value;
      if (val) {
        persistTheme(val);
        if (selector) selector.value = val;
        updateButtonState(val);
      }
    });
  });

  // Initial button state
  updateButtonState(currentTheme);

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