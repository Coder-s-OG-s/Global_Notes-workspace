/**
 * Constants used throughout the application for localStorage keys and other fixed values.
 * These constants help maintain consistency and prevent typos when accessing storage.
 */

// Key prefix for storing notes in localStorage
// Format: "notesWorkspace.notes.[userId]"
export const NOTES_STORAGE_PREFIX = "notesWorkspace.notes";

// Key for storing the currently active/authenticated user in localStorage
export const ACTIVE_USER_KEY = "notesWorkspace.activeUser";

// Key for storing user account information in localStorage
// Versioned (v1) to allow for future data structure changes
export const ACCOUNT_KEY = "notesWorkspace.accounts.v1";

// Key for storing the user's theme preference in localStorage (Notes Workspace)
export const THEME_KEY = "notesWorkspace.theme";

// Key for storing the user's theme preference in Code Workspace
export const CODE_THEME_KEY = "codeWorkspace.theme";
