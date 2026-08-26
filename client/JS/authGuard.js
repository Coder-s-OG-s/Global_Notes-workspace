/**
 * authGuard.js - Global Security Enforcement Module
 * Restricts unauthenticated users from accessing any features:
 * Notes Workspace, Code Workspace, Student Hub, UI Designer, PDF Editor, and AI Assistant tools.
 */

import { getActiveUser } from "./storage.js";

export async function checkAuthAndEnforce() {
  const currentPath = window.location.pathname;
  
  // Public pages that do NOT require authentication
  const isPublicPage = 
    currentPath.endsWith("/HTML/signup.html") || 
    currentPath.endsWith("/signup.html") ||
    currentPath === "/" ||
    currentPath.endsWith("/index.html");

  if (isPublicPage) {
    return true;
  }

  // Check Local Active User State
  let activeUser = getActiveUser();

  // If local active user is missing or set to guest, check backend session
  if (!activeUser || activeUser === "guest" || activeUser.trim() === "") {
    try {
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const userData = await response.json();
        if (userData && (userData.username || userData.email || userData.displayName || userData._id)) {
          const resolvedName = userData.username || userData.displayName || userData.email;
          localStorage.setItem("activeUser", resolvedName);
          activeUser = resolvedName;
        }
      }
    } catch (err) {
      console.warn("Backend auth verification failed:", err);
    }
  }

  // Strictly enforce restriction: If user is not authenticated or is guest
  if (!activeUser || activeUser === "guest" || activeUser.trim() === "") {
    console.warn("🔒 Security Guard: Access Denied. User is unauthenticated. Redirecting to Sign In...");
    
    // Purge local storage
    try {
      localStorage.removeItem("activeUser");
    } catch (e) {}

    // Store intended page for post-login redirect
    const targetRedirect = currentPath + window.location.search;
    sessionStorage.setItem("postLoginRedirect", targetRedirect);

    // Redirect to Sign In page with security banner flag
    const signupUrl = `/HTML/signup.html?redirect=${encodeURIComponent(targetRedirect)}&required=true`;
    window.location.replace(signupUrl);
    return false;
  }

  return true;
}

// Execute authentication guard immediately upon module load
checkAuthAndEnforce();
