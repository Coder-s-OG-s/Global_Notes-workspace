import { getAccounts, setAccounts, mergeGuestNotes } from "./storage.js";
import { initLoginForm } from "./loginPage.js";

function initAuthPage() {
  // Set flag to indicate module has loaded
  window._authPageInitialized = true;

  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const switchButtons = document.querySelectorAll(".switch-btn");
  const messageEl = document.getElementById("auth-message");

  // Displays a message to the user with optional type (info/error/success)
  const setMessage = (text, type = "info") => {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
  };

  // Toggles between login and signup forms
  const toggleView = (view) => {
    document.querySelectorAll(".auth-form").forEach((form) => {
      const isTarget = form.dataset.view === view;
      form.classList.toggle("hidden", !isTarget);
    });
    switchButtons.forEach((btn) => {
      const isTarget = btn.dataset.view === view;
      btn.classList.toggle("active", isTarget);
      btn.setAttribute("aria-selected", String(isTarget));
    });
    setMessage("");
  };

  switchButtons.forEach((btn) => {
    btn.addEventListener("click", () => toggleView(btn.dataset.view));
  });

  // Initialize the login form with necessary callbacks
  initLoginForm({
    formId: "login-form",
    setMessage,
    toggleView,
  });

  // Handle signup form submission
  signupForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("new-username").value.trim();
    const password = document.getElementById("new-password").value;
    const confirm = document.getElementById("confirm-password").value;
    const email = document.getElementById("email").value.trim();

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.", "error");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.", "error");
      return;
    }

    const accounts = getAccounts();
    const exists = accounts.some((a) => a.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      setMessage("That username is already taken.", "error");
      return;
    }

    accounts.push({ username, password, email });
    setAccounts(accounts);
    mergeGuestNotes(username);
    setMessage("Account created! You can log in now.", "success");
    signupForm.reset();
    toggleView("login");
    document.getElementById("username").value = username;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthPage);
} else {
  initAuthPage();
}

//aneek
