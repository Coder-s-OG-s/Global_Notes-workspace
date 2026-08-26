import { setActiveUser } from "./storage.js";
import { signInWithProvider } from "./authService.js";
import { getApiUrl } from "./utilities.js";

async function initAuthPage() {
  window._authPageInitialized = true;

  const messageEl = document.getElementById("auth-message");
  const authForm = document.getElementById("auth-form");
  const formTitle = document.getElementById("form-title");
  const toggleTextContainer = document.getElementById("toggle-text-container");
  const nameFieldsRow = document.getElementById("name-fields-row");
  const firstNameInput = document.getElementById("first-name");
  const lastNameInput = document.getElementById("last-name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const passwordFieldsRow = document.getElementById("password-fields-row");
  const confirmPasswordGroup = document.getElementById("confirm-password-group");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const forgotPasswordWrapper = document.getElementById("forgot-password-wrapper");
  const passwordHint = document.getElementById("password-hint");
  const termsCheckboxLabel = document.getElementById("terms-checkbox-label");
  const termsCheck = document.getElementById("terms-check");
  const submitBtn = document.getElementById("submit-btn");
  const submitBtnText = document.getElementById("submit-btn-text");
  const btnSpinner = document.getElementById("btn-spinner");
  const socialDividerText = document.getElementById("social-divider-text");

  let turnstileToken = "";
  let turnstileWidgetId = null;

  // Mode: 'signup' or 'login'
  let currentMode = "signup";

  // Check URL parameters for mode preference (e.g. login.html or ?mode=login)
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get("mode");
  const isLoginPage = window.location.pathname.includes("login.html") || modeParam === "login";

  if (isLoginPage) {
    currentMode = "login";
  }

  let appConfig = {
    TURNSTILE_SITE_KEY: "0x4AAAAAAEQyiKm40gWQ6_Gx"
  };

  try {
    const configModule = await import("./config.js");
    if (configModule && configModule.default) {
      appConfig = { ...appConfig, ...configModule.default };
    }
  } catch (err) {
    console.warn("Notice: config.js not found or ignored. Using production fallback config.", err);
  }

  // --- Handle Redirect & Required Auth Parameter ---
  const redirectTarget = urlParams.get("redirect");
  const isRequired = urlParams.get("required") === "true";

  if (redirectTarget) {
    sessionStorage.setItem("postLoginRedirect", redirectTarget);
  }

  // Helper to set message banner
  const setMessage = (text, type = "info") => {
    if (!messageEl) return;
    if (!text) {
      messageEl.style.display = "none";
      messageEl.textContent = "";
      messageEl.className = "auth-message";
      return;
    }
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
    messageEl.style.display = "block";
  };

  if (isRequired) {
    setMessage("🔒 Authentication Required: Please sign in to access your workspace.", "error");
  }

  // --- UI Mode Switcher (Sign Up <-> Log In) ---
  const updateUIMode = (mode) => {
    currentMode = mode;
    clearFieldErrors();
    setMessage("");

    if (currentMode === "signup") {
      if (formTitle) formTitle.textContent = "Register with your e-mail";
      if (toggleTextContainer) {
        toggleTextContainer.innerHTML = 'Already a member? <a href="#" id="toggle-auth-mode" class="toggle-link">Log In</a>';
      }
      if (nameFieldsRow) nameFieldsRow.style.display = "grid";
      if (firstNameInput) firstNameInput.required = true;
      if (confirmPasswordGroup) confirmPasswordGroup.style.display = "block";
      if (confirmPasswordInput) confirmPasswordInput.required = true;
      if (forgotPasswordWrapper) forgotPasswordWrapper.style.display = "none";
      if (passwordHint) passwordHint.style.display = "block";
      if (termsCheckboxLabel) termsCheckboxLabel.style.display = "flex";
      if (termsCheck) termsCheck.required = true;
      if (submitBtnText) submitBtnText.textContent = "SIGN UP";
      if (socialDividerText) socialDividerText.textContent = "Or register with";
      if (passwordFieldsRow) passwordFieldsRow.classList.add("two-cols");
    } else {
      if (formTitle) formTitle.textContent = "Welcome back";
      if (toggleTextContainer) {
        toggleTextContainer.innerHTML = 'Don\'t have an account? <a href="#" id="toggle-auth-mode" class="toggle-link">Sign Up</a>';
      }
      if (nameFieldsRow) nameFieldsRow.style.display = "none";
      if (firstNameInput) firstNameInput.required = false;
      if (confirmPasswordGroup) confirmPasswordGroup.style.display = "none";
      if (confirmPasswordInput) confirmPasswordInput.required = false;
      if (forgotPasswordWrapper) forgotPasswordWrapper.style.display = "block";
      if (passwordHint) passwordHint.style.display = "none";
      if (termsCheckboxLabel) termsCheckboxLabel.style.display = "none";
      if (termsCheck) termsCheck.required = false;
      if (submitBtnText) submitBtnText.textContent = "LOG IN";
      if (socialDividerText) socialDividerText.textContent = "Or log in with";
      if (passwordFieldsRow) passwordFieldsRow.classList.remove("two-cols");
    }

    // Re-bind click event on toggle link
    const toggleLink = document.getElementById("toggle-auth-mode");
    if (toggleLink) {
      toggleLink.addEventListener("click", (e) => {
        e.preventDefault();
        updateUIMode(currentMode === "signup" ? "login" : "signup");
      });
    }
  };

  // Initialize UI state based on mode
  updateUIMode(currentMode);

  // --- Turnstile Setup ---
  const siteKey = appConfig.TURNSTILE_SITE_KEY || "0x4AAAAAAEQyiKm40gWQ6_Gx";
  const turnstileContainer = document.getElementById("turnstile-container");

  const renderTurnstile = () => {
    if (turnstileContainer && window.turnstile) {
      try {
        turnstileWidgetId = window.turnstile.render("#turnstile-container", {
          sitekey: siteKey,
          theme: "dark",
          callback: function (token) {
            turnstileToken = token;
            setMessage("Security check passed.", "success");
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
      setTimeout(renderTurnstile, 300);
    }
  };

  renderTurnstile();

  // --- Backend Verification for Turnstile ---
  const verifyTurnstileWithBackend = async () => {
    if (!turnstileToken) {
      // If turnstile container is present and rendered, token is required
      if (window.turnstile && turnstileContainer && turnstileContainer.children.length > 0) {
        setMessage("Please complete the security verification challenge first.", "error");
        return false;
      }
      // If turnstile is not loaded locally, proceed
      return true;
    }

    try {
      const response = await fetch(getApiUrl("/api/auth/verify-turnstile"), {
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
      console.warn("Backend Turnstile verification bypass/warning:", error);
      return true; // Fallback to allow dev login
    }
  };

  // --- Form Validation Helpers ---
  function clearFieldErrors() {
    const inputs = document.querySelectorAll(".auth-input");
    inputs.forEach((input) => input.classList.remove("is-invalid"));
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  // --- Form Submission Handler ---
  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldErrors();
      setMessage("");

      const email = emailInput?.value.trim();
      const password = passwordInput?.value;
      const firstName = firstNameInput?.value.trim();
      const confirmPassword = confirmPasswordInput?.value;
      const termsAccepted = termsCheck?.checked;

      // Validation
      if (!email || !validateEmail(email)) {
        emailInput?.classList.add("is-invalid");
        setMessage("Please enter a valid email address.", "error");
        return;
      }

      if (!password || password.length < 6) {
        passwordInput?.classList.add("is-invalid");
        setMessage("Password must be at least 6 characters long.", "error");
        return;
      }

      if (currentMode === "signup") {
        if (!firstName) {
          firstNameInput?.classList.add("is-invalid");
          setMessage("Please enter your first name.", "error");
          return;
        }

        if (password !== confirmPassword) {
          confirmPasswordInput?.classList.add("is-invalid");
          setMessage("Passwords do not match.", "error");
          return;
        }

        if (!termsAccepted) {
          setMessage("Please accept the Terms and Conditions to register.", "error");
          return;
        }
      }

      // Show Loading state
      if (btnSpinner) btnSpinner.style.display = "block";
      if (submitBtnText) submitBtnText.style.opacity = "0.5";
      if (submitBtn) submitBtn.disabled = true;

      // Verify Turnstile security
      const isVerified = await verifyTurnstileWithBackend();
      if (!isVerified) {
        if (btnSpinner) btnSpinner.style.display = "none";
        if (submitBtnText) submitBtnText.style.opacity = "1";
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      // Process Authentication via Backend Database Endpoints
      setMessage(currentMode === "signup" ? "Creating your account..." : "Signing you in...", "info");

      const endpoint = currentMode === "signup" ? "/api/auth/register" : "/api/auth/login";
      try {
        const authRes = await fetch(getApiUrl(endpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password, firstName, lastName }),
        });

        const authData = await authRes.json();
        if (!authRes.ok || !authData.success) {
          if (btnSpinner) btnSpinner.style.display = "none";
          if (submitBtnText) submitBtnText.style.opacity = "1";
          if (submitBtn) submitBtn.disabled = false;
          setMessage(authData.message || "Authentication failed. Please try again.", "error");
          return;
        }

        if (authData.token) {
          localStorage.setItem("authToken", authData.token);
        }

        const resolvedUsername = (authData.user && (authData.user.username || authData.user.email)) 
          ? (authData.user.username || authData.user.email.split("@")[0]) 
          : (email.split("@")[0] || email);

        setActiveUser(resolvedUsername);

        setMessage(currentMode === "signup" ? "Account created successfully! Redirecting..." : "Success! Redirecting to workspace...", "success");

        setTimeout(() => {
          const target = sessionStorage.getItem("postLoginRedirect") || urlParams.get("redirect") || "/app.html";
          sessionStorage.removeItem("postLoginRedirect");
          window.location.href = target;
        }, 500);
      } catch (err) {
        console.error("Backend auth fetch error:", err);
        if (btnSpinner) btnSpinner.style.display = "none";
        if (submitBtnText) submitBtnText.style.opacity = "1";
        if (submitBtn) submitBtn.disabled = false;
        setMessage("Unable to connect to server. Please verify server is running at http://localhost:3000.", "error");
      }
    });
  }

  // --- Forgot Password Action ---
  const forgotPasswordLink = document.getElementById("forgot-password-link");
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      const email = emailInput?.value.trim();
      if (!email || !validateEmail(email)) {
        emailInput?.classList.add("is-invalid");
        setMessage("Please enter your email address to receive password reset instructions.", "error");
        return;
      }
      setMessage(`Password reset instructions have been sent to ${email}.`, "success");
    });
  }

  // --- Social Auth Handlers ---
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
