/**
 * profileManager.js
 * Updated to use local session state and MongoDB-backed stats
 */

import { getNotes } from "./storage.js";

/**
 * Calculates user statistics from their notes
 */
function calculateStats(notes) {
    const totalNotes = notes.length;
    const totalWords = notes.reduce((acc, note) => {
        const text = note.content ? note.content.replace(/<[^>]*>/g, ' ') : '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        return acc + words;
    }, 0);

    let lastActive = "Never";
    if (notes.length > 0) {
        const timestamps = notes
            .map(n => new Date(n.updatedAt || n.createdAt).getTime())
            .filter(t => !isNaN(t));

        if (timestamps.length > 0) {
            const maxTime = Math.max(...timestamps);
            const date = new Date(maxTime);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) lastActive = "Today";
            else if (diffDays === 1) lastActive = "Yesterday";
            else if (diffDays < 7) lastActive = `${diffDays} days ago`;
            else lastActive = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        }
    }

    return { totalNotes, totalWords, lastActive };
}

/**
 * Wires up profile modal and related events
 */
export function wireProfileManager(state, callbacks) {
    const userPill = document.getElementById("user-pill");
    const modal = document.getElementById("profile-modal");
    const closeModalBtn = modal?.querySelector(".close-modal");

    if (!userPill || !modal) return;

    // Open Modal
    userPill.addEventListener("click", (e) => {
        if (e.target.closest("#logout")) return;
        openProfileModal(state.activeUser);
    });

    // Close Modal
    closeModalBtn?.addEventListener("click", () => {
        modal.close();
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.close();
    });
}

/**
 * Populates and opens the profile modal
 */
async function openProfileModal(username) {
    if (!username) return;

    const modal = document.getElementById("profile-modal");
    if (!modal) return;

    const notes = await getNotes(username);
    const stats = calculateStats(notes);

    // Set Username
    const usernameEl = document.getElementById("profile-username");
    if (usernameEl) usernameEl.textContent = username;

    // Set Stats
    const statNotes = document.getElementById("stat-total-notes");
    if (statNotes) statNotes.textContent = stats.totalNotes;
    
    const statWords = document.getElementById("stat-words");
    if (statWords) statWords.textContent = stats.totalWords.toLocaleString();
    
    const statActive = document.getElementById("stat-last-active");
    if (statActive) statActive.textContent = stats.lastActive;

    modal.showModal();
}

/**
 * Updates the user pill avatar in the header
 */
export function updateHeaderAvatar(username) {
    const imgEl = document.getElementById("header-avatar");
    if (!imgEl) return;

    if (!username) {
        imgEl.classList.remove("visible");
        return;
    }

    // Default avatar
    imgEl.src = `https://ui-avatars.com/api/?name=${username}&background=random&size=64`;
    imgEl.classList.add("visible");
}
