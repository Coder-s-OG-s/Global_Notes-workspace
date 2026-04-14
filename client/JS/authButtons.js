// Import the clearActiveUser function from storage.js to handle user session cleanup
import { clearActiveUser } from "./storage.js";
import { signOut } from "./authService.js";

/**
 * Helper function to simplify DOM element selection
 * @param {string} selector - CSS selector string to find the element
 * @returns {Element|null} The first element that matches the selector, or null if no matches
 */
const $ = (selector) => document.querySelector(selector);

/**
 * Sets up authentication button event listeners
 * @param {Object} state - Application state object
 * @param {Object} callbacks - Object containing callback functions for various actions
 */
export function wireAuthButtons(state, callbacks) {
  // Handle login button click - redirects to signup page
  $("#login")?.addEventListener("click", () => {
    window.location.href = "./HTML/signup.html";
  });



  // Handle logout button click - performs cleanup and redirects to signup page
  $("#logout")?.addEventListener("click", async () => {
    // Save any pending notes before logging out (Sync last changes)
    await callbacks.persistNotes();

    // Sign out from Supabase
    try {
      await signOut();
    } catch (e) {
      console.error("Logout error", e);
    }

    // Clear user session local tracking
    clearActiveUser();
    // Update application state
    state.activeUser = null;
    // Reset UI components
    await callbacks.loadNotesForCurrentUser();
    callbacks.updateUserDisplay();
    callbacks.renderNotesList();
    callbacks.renderActiveNote();
    // Redirect to signup page
    window.location.href = "./HTML/signup.html";
  });
}