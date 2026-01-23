import { setActiveUser } from "./storage.js";
import { initLoginForm } from "./loginPage.js";
import { signUp, signInWithProvider } from "./authService.js";

function initAuthPage() {
  // Set flag to indicate module has loaded
  window._authPageInitialized = true;

  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const switchButtons = document.querySelectorAll(".switch-btn");
  const messageEl = document.getElementById("auth-message");

  // Make Email Required for Signup
  const emailInput = document.getElementById("email");
  if (emailInput) {
    emailInput.required = true;
    const label = document.querySelector('label[for="email"]');
    if (label) label.textContent = "Email (Required)";
  }

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

  // --- Social Auth ---
  const handleSocialLogin = async (provider) => {
    setMessage(`Connecting to ${provider}...`, "info");
    try {
      await signInWithProvider(provider);
      // Redirect handled by Supabase (setRedirectTo)
    } catch (error) {
      console.error("Social Login Error", error);
      setMessage(`Error logging in with ${provider}: ${error.message}`, "error");
    }
  };

  const googleBtn = document.querySelector(".social-btn.google");
  const githubBtn = document.querySelector(".social-btn.github");

  if (googleBtn) googleBtn.addEventListener("click", () => handleSocialLogin("google"));
  if (githubBtn) githubBtn.addEventListener("click", () => handleSocialLogin("github"));



  // Initialize the login form with necessary callbacks
  initLoginForm({
    formId: "login-form",
    setMessage,
    toggleView,
  });

  // Handle signup form submission
  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const username = document.getElementById("new-username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("new-password").value;
    const confirm = document.getElementById("confirm-password").value;

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.", "error");
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.", "error");
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    try {
      setMessage("Creating account...", "info");
      const { data, error } = await signUp(email, password, username);

      if (error) throw error;

      if (data?.session) {
        // Auto-login (Confirm Email disabled)
        setActiveUser(username);
        setMessage("Account created! Redirecting...", "success");
        setTimeout(() => {
          window.location.href = "../index.html";
        }, 800);
      } else {
        // Email confirmation required
        setMessage("Account created! Please check your email to confirm.", "success");
        signupForm.reset();
        if (submitBtn) submitBtn.disabled = false;
      }

    } catch (error) {
      console.error("Signup Error:", error);
      setMessage(error.message || "Signup failed.", "error");
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthPage);
} else {
  initAuthPage();
}
