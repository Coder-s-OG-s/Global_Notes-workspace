import { setActiveUser } from "./storage.js";
import { signInWithProvider } from "./authService.js";

function initAuthPage() {
  // Set flag to indicate module has loaded
  window._authPageInitialized = true;

  const messageEl = document.getElementById("auth-message");

  // Displays a message to the user with optional type (info/error/success)
  const setMessage = (text, type = "info") => {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
  };

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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthPage);
} else {
  initAuthPage();
}
