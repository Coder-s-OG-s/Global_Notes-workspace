import { setActiveUser } from "./storage.js";
import { signInWithProvider } from "./authService.js";
import config from "./config.js";

function initAuthPage() {
  // Set flag to indicate module has loaded
  window._authPageInitialized = true;

  const messageEl = document.getElementById("auth-message");
  let turnstileToken = "";
  let turnstileWidgetId = null;

  // Displays a message to the user with optional type (info/error/success)
  const setMessage = (text, type = "info") => {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
  };

  // --- Turnstile Setup ---
  const siteKey = config?.TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
  const turnstileContainer = document.getElementById("turnstile-container");

  const renderTurnstile = () => {
    if (turnstileContainer && window.turnstile) {
      try {
        turnstileWidgetId = window.turnstile.render("#turnstile-container", {
          sitekey: siteKey,
          theme: "auto",
          callback: function (token) {
            turnstileToken = token;
            setMessage("Security check passed. You can now sign in.", "success");
          },
          "expired-callback": function () {
            turnstileToken = "";
            setMessage("Security check expired. Please complete the verification again.", "error");
          },
          "error-callback": function () {
            turnstileToken = "";
            setMessage("Security check error. Please refresh the page.", "error");
          }
        });
      } catch (err) {
        console.error("Turnstile render error:", err);
      }
    } else if (turnstileContainer) {
      // Retry if Turnstile SDK script is still loading
      setTimeout(renderTurnstile, 300);
    }
  };

  renderTurnstile();

  // --- Backend Verification ---
  const verifyTurnstileWithBackend = async () => {
    if (!turnstileToken) {
      setMessage("Please complete the Cloudflare security verification challenge first.", "error");
      return false;
    }

    try {
      const response = await fetch("/api/auth/verify-turnstile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });

      const data = await response.json();
      if (data.success) {
        return true;
      } else {
        setMessage(data.message || "Security verification failed. Please try again.", "error");
        if (window.turnstile && turnstileWidgetId !== null) {
          window.turnstile.reset(turnstileWidgetId);
          turnstileToken = "";
        }
        return false;
      }
    } catch (error) {
      console.error("Backend Turnstile verification error:", error);
      setMessage("Could not connect to security verification service.", "error");
      return false;
    }
  };

  // --- Social Auth ---
  const handleSocialLogin = async (provider) => {
    setMessage("Verifying security challenge...", "info");

    const isVerified = await verifyTurnstileWithBackend();
    if (!isVerified) return;

    setMessage(`Connecting to ${provider}...`, "info");
    try {
      await signInWithProvider(provider);
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

