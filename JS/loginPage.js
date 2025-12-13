import { getAccounts, setActiveUser, mergeGuestNotes } from "./storage.js";

// Initializes the login form with validation and user authentication logic
export function initLoginForm({
  formId = "login-form",
  setMessage = () => { },
  toggleView = () => { },
} = {}) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const username = usernameInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    const accounts = getAccounts();
    const account = accounts.find((a) => a.username.toLowerCase() === username.toLowerCase());
    if (!account) {
      setMessage("Account not found. Create one below.", "error");
      toggleView("signup");
      return;
    }
    if (account.password !== password) {
      setMessage("Incorrect password. Try again.", "error");
      return;
    }

    mergeGuestNotes(account.username);
    setActiveUser(account.username);
    setMessage("Success! Redirecting…", "success");
    setTimeout(() => {
      window.location.href = "../index.html";
    }, 400);
  });
}

//aneek
