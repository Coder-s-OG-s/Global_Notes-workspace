// ========================================
// IMPORTS - Load authentication dependencies
// ========================================
// Import storage functions to manage user accounts and note migration
import { getAccounts, setAccounts, migrateGuestNotesIfEmpty } from "./storage.js";
// Import login form initialization function from separate module
import { initLoginForm } from "./loginPage.js";

// ========================================
// AUTH PAGE INITIALIZATION
// ========================================
/**
 * Initializes the authentication page (signup/login)
 * - Caches DOM elements for login and signup forms
 * - Sets up message display system for user feedback
 * - Handles tab switching between login and signup views
 * - Initializes login form with necessary callbacks
 * - Attaches signup form submission handler with validation
 */
function initAuthPage() {
  // Cache reference to login form element for later manipulation
  const loginForm = document.getElementById("login-form");
  // Cache reference to signup form element for later manipulation
  const signupForm = document.getElementById("signup-form");
  // Cache all tab/switch buttons that toggle between login/signup views
  // These buttons have data-view attribute to identify which view they activate
  const switchButtons = document.querySelectorAll(".switch-btn");
  // Cache reference to message display element for user feedback
  // Used to show errors, success messages, and info text
  const messageEl = document.getElementById("auth-message");

  /**
   * Helper function to display messages to the user
   * - Updates message element text content
   * - Sets CSS class based on message type (info, error, success)
   * - Used for validation feedback, errors, and success notifications
   * @param {string} text - Message text to display
   * @param {string} type - Message type: "info" (default), "error", or "success"
   */
  const setMessage = (text, type = "info") => {
    // Safety check: if message element doesn't exist, exit early
    if (!messageEl) return;
    // Set the text content that user will see
    messageEl.textContent = text;
    // Set CSS class for styling (auth-message is base, type affects color/styling)
    // Example: "auth-message error" for red error styling
    messageEl.className = `auth-message ${type}`;
  };

  /**
   * Helper function to switch between login and signup views
   * - Hides all auth forms except the target view
   * - Activates the corresponding tab button
   * - Updates aria-selected for accessibility
   * - Clears any previous messages when switching views
   * @param {string} view - Target view: "login" or "signup"
   */
  const toggleView = (view) => {
    // Query all form containers (each has data-view attribute)
    document.querySelectorAll(".auth-form").forEach((form) => {
      // Check if this form is the target view
      const isTarget = form.dataset.view === view;
      // Add "hidden" class to non-target forms, remove from target form
      // This shows/hides forms via CSS display:none
      form.classList.toggle("hidden", !isTarget);
    });
    // Update switch buttons to show which view is currently active
    switchButtons.forEach((btn) => {
      // Check if this button corresponds to the target view
      const isTarget = btn.dataset.view === view;
      // Add "active" class to target button, remove from others
      btn.classList.toggle("active", isTarget);
      // Set aria-selected for accessibility (screen readers)
      btn.setAttribute("aria-selected", String(isTarget));
    });
    // Clear any error/success messages from previous view
    setMessage("");
  };

  /**
   * EVENT WIRING - Tab/Switch Button Handlers
   * Attaches click listeners to all tab switching buttons
   * When clicked, button's data-view attribute determines which view to show
   */
  switchButtons.forEach((btn) => {
    // For each switch button, add a click event listener
    btn.addEventListener("click", () => {
      // Call toggleView with the view name from button's data-view attribute
      // This switches between login and signup forms
      toggleView(btn.dataset.view);
    });
  });

  /**
   * INITIALIZE LOGIN FORM
   * Calls login form initialization from separate module
   * Passes callback functions for message display and view switching
   * Login form uses these callbacks to communicate with auth page
   */
  initLoginForm({
    // ID of the login form element to initialize
    formId: "login-form",
    // Pass setMessage callback for login form to display messages
    setMessage,
    // Pass toggleView callback for login form to switch to signup if needed
    toggleView,
  });

  /**
   * SIGNUP FORM SUBMISSION HANDLER
   * Validates signup form and creates new user account
   * Includes password validation, duplicate username checking, and account creation
   */
  signupForm?.addEventListener("submit", (e) => {
    // Prevent form's default submission behavior (page reload)
    e.preventDefault();
    
    // ========================================
    // INPUT COLLECTION & SANITIZATION
    // ========================================
    // Get new username from input field and trim whitespace
    const username = document.getElementById("new-username").value.trim();
    // Get password (no trim - allow spaces in password for security)
    const password = document.getElementById("new-password").value;
    // Get password confirmation for verification
    const confirm = document.getElementById("confirm-password").value;
    // Get email and trim whitespace (optional field)
    const email = document.getElementById("email").value.trim();

    // ========================================
    // VALIDATION - Password Length
    // ========================================
    // Check if password meets minimum length requirement
    if (password.length < 6) {
      // Show error message if too short
      setMessage("Password must be at least 6 characters.", "error");
      // Exit early - don't proceed with account creation
      return;
    }
    
    // ========================================
    // VALIDATION - Password Confirmation
    // ========================================
    // Check if password and confirmation match
    if (password !== confirm) {
      // Show error if passwords don't match
      setMessage("Passwords do not match.", "error");
      // Exit early - don't proceed with account creation
      return;
    }

    // ========================================
    // VALIDATION - Username Uniqueness
    // ========================================
    // Retrieve all existing accounts from storage
    const accounts = getAccounts();
    // Check if any existing account has this username (case-insensitive)
    // Uses .some() to return true/false if username exists
    const exists = accounts.some((a) => a.username.toLowerCase() === username.toLowerCase());
    // If username already taken, show error
    if (exists) {
      setMessage("That username is already taken.", "error");
      // Exit early - don't proceed with account creation
      return;
    }

    // ========================================
    // ACCOUNT CREATION
    // ========================================
    // Create new account object with user's credentials and email
    // Password should ideally be hashed before storage (for production)
    // Current implementation stores plaintext password (security concern)
    accounts.push({ username, password, email });
    
    // Persist updated accounts list to localStorage
    // Now includes the newly created account
    setAccounts(accounts);
    
    /**
     * GUEST NOTE MIGRATION
     * If user was using app as guest, migrate their notes to new account
     * This preserves any notes created before signup
     */
    migrateGuestNotesIfEmpty(username);
    
    // ========================================
    // SUCCESS FEEDBACK & FORM RESET
    // ========================================
    // Show success message to user
    setMessage("Account created! You can log in now.", "success");
    
    // Clear all input fields from signup form for next use
    signupForm.reset();
    
    // Automatically switch to login view so user can log in with new account
    toggleView("login");
    
    // Pre-fill username field in login form with newly created username
    // User only needs to enter password to log in
    document.getElementById("username").value = username;
  });
}

// ========================================
// DOM READY INITIALIZATION
// ========================================
/**
 * Wait for DOM to be fully loaded before running initialization
 * Ensures all HTML elements are parsed and available
 */
// Check if DOM is still in "loading" state (not fully parsed)
if (document.readyState === "loading") {
  // If still loading, attach listener for DOMContentLoaded event
  // initAuthPage will run once all HTML is parsed
  document.addEventListener("DOMContentLoaded", initAuthPage);
} else {
  // If DOM is already loaded, run initAuthPage immediately
  // This handles case where script loads after HTML parsing completes
  initAuthPage();
}


