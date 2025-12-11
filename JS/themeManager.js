import { THEME_KEY } from "./constants.js";

const DEFAULT_THEME = "amoled-dark";
const VALID_THEMES = ["amoled-dark", "sepia", "solarized", "minimal-white"];

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
  const bodyEl = document.body;
  if (bodyEl) {
    bodyEl.dataset.theme = normalized;
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
  const selector = document.querySelector("#theme-selector");
  if (!selector) {
    applyTheme(getStoredTheme());
    return;
  }

  // Initialize with stored theme
  applyTheme(getStoredTheme());

  // Listen for theme changes
  selector.addEventListener("change", () => {
    persistTheme(selector.value);
  });
}