import { THEME_KEY } from "./constants.js";

const DEFAULT_THEME = "dark";

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme) {
  const normalized = theme === "light" ? "light" : "dark";
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

  const toggleBtn = document.querySelector("#theme-toggle");
  if (toggleBtn) {
    toggleBtn.textContent = normalized === "light" ? "Dark mode" : "Light mode";
  }
}

export function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore storage issues
  }
  applyTheme(theme);
}

export function wireThemeToggle() {
  const toggleBtn = document.querySelector("#theme-toggle");
  if (!toggleBtn) {
    applyTheme(getStoredTheme());
    return;
  }

  applyTheme(getStoredTheme());

  toggleBtn.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
    persistTheme(nextTheme);
  });
}