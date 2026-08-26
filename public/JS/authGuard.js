/**
 * authGuard.js - Global Security Enforcement Module
 * Restricts unauthenticated users from accessing any features:
 * Notes Workspace, Code Workspace, Student Hub, UI Designer, PDF Editor, and AI Assistant tools.
 */

import { getActiveUser, setActiveUser, clearActiveUser, getAuthHeaders, getApiUrl } from "./storage.js";

export async function checkAuthAndEnforce() {
  const currentPath = window.location.pathname;
  
  // Public pages that do NOT require authentication
  const isPublicPage = 
    currentPath.endsWith("/HTML/signup.html") || 
    currentPath.endsWith("/signup.html") ||
    currentPath.endsWith("/HTML/login.html") || 
    currentPath.endsWith("/login.html") ||
    currentPath === "/" ||
    currentPath.endsWith("/index.html");

  if (isPublicPage) {
    return true;
  }

  // Always verify backend session directly from MongoDB Atlas server
  let activeUser = null;
  try {
    const response = await fetch(getApiUrl("/api/auth/user"), { 
      credentials: "include",
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const userData = await response.json();
      if (userData && (userData.username || userData.email || userData.displayName || userData._id)) {
        const resolvedName = userData.username || userData.displayName || userData.email;
        setActiveUser(resolvedName);
        activeUser = resolvedName;
      }
    }
  } catch (err) {
    console.warn("Backend auth verification failed:", err);
  }

  // Fallback to local activeUser if set and valid
  if (!activeUser) {
    activeUser = getActiveUser();
  }

  // Strictly enforce restriction: If user is not authenticated on backend or locally
  if (!activeUser || activeUser === "guest" || activeUser.trim() === "") {
    console.warn("🔒 Security Guard: Access Denied. User is unauthenticated. Redirecting to Login...");
    
    try {
      clearActiveUser();
    } catch (e) {}

    // Store intended page for post-login redirect
    const targetRedirect = currentPath + window.location.search;
    sessionStorage.setItem("postLoginRedirect", targetRedirect);

    // Redirect to Login page with security banner flag
    const loginUrl = `/HTML/login.html?redirect=${encodeURIComponent(targetRedirect)}&required=true`;
    window.location.replace(loginUrl);
    return false;
  }

  return true;
}

// Execute authentication guard immediately upon module load
checkAuthAndEnforce();
