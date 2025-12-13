import { getActiveUser, getNotes, getAccountDetails, updateAccountDetails } from "./storage.js";

/**
 * Calculates user statistics from their notes
 * @param {Array} notes 
 */
function calculateStats(notes) {
    const totalNotes = notes.length;

    // Calculate total words
    // Basic calculation: split by whitespace
    const totalWords = notes.reduce((acc, note) => {
        // Determine content: try to use note.text if available, fall back to note.content (HTML)
        // Strip HTML tags for word count if needed, or just count raw words for simplicity
        const text = note.content ? note.content.replace(/<[^>]*>/g, ' ') : '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        return acc + words;
    }, 0);

    // Find last active date
    let lastActive = "Never";
    if (notes.length > 0) {
        // Get valid timestamps only
        const timestamps = notes
            .map(n => new Date(n.updated || n.created).getTime())
            .filter(t => !isNaN(t));

        if (timestamps.length > 0) {
            const maxTime = Math.max(...timestamps);

            // Format date nicely
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
 * @param {Object} state 
 * @param {Object} callbacks 
 */
export function wireProfileManager(state, callbacks) {
    const userPill = document.getElementById("user-pill");
    const modal = document.getElementById("profile-modal");
    const closeModalBtn = modal?.querySelector(".close-modal");
    const changeAvatarBtn = document.getElementById("change-avatar-btn");
    const avatarInput = document.getElementById("avatar-upload");

    if (!userPill || !modal) return;

    // Open Modal
    userPill.addEventListener("click", (e) => {
        // Don't trigger if logout button was clicked
        if (e.target.id === "logout") return;

        openProfileModal(state.activeUser);
    });

    // Close Modal
    closeModalBtn?.addEventListener("click", () => {
        modal.close();
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.close();
    });

    // Handle Avatar Upload
    changeAvatarBtn?.addEventListener("click", () => {
        avatarInput?.click();
    });

    avatarInput?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;

            // Save to storage
            const success = updateAccountDetails(state.activeUser, { avatar: base64 });

            if (success) {
                // Update UI
                updateProfileUI(state.activeUser, base64);
            } else {
                alert("Failed to update profile picture.");
            }
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Populates and opens the profile modal
 * @param {string} username 
 */
function openProfileModal(username) {
    if (!username) return;

    const modal = document.getElementById("profile-modal");
    const account = getAccountDetails(username);
    const notes = getNotes(username);
    const stats = calculateStats(notes);

    // Set Username & Join Date (mock join date if missing)
    document.getElementById("profile-username").textContent = username;
    document.getElementById("member-since").textContent = `Joined: ${account?.joined || "December 2024"}`;

    // Set Stats
    document.getElementById("stat-total-notes").textContent = stats.totalNotes;
    document.getElementById("stat-words").textContent = stats.totalWords.toLocaleString();
    document.getElementById("stat-last-active").textContent = stats.lastActive;

    // Set Avatar
    const avatarImg = document.getElementById("profile-avatar-large");
    if (account?.avatar) {
        avatarImg.src = account.avatar;
    } else {
        // Generate simple initial avatar if none exists
        // Using a placeholder service or a generic icon
        avatarImg.src = `https://ui-avatars.com/api/?name=${username}&background=random&size=128`;
    }

    modal.showModal();
}

/**
 * Updates the user pill avatar in the header
 * @param {string} username 
 * @param {string} avatarData - Base64 string or URL (optional, fetches if null)
 */
export function updateHeaderAvatar(username, avatarData = null) {
    const imgEl = document.getElementById("header-avatar");
    if (!imgEl) return;

    if (!username) {
        imgEl.classList.remove("visible");
        return;
    }

    let src = avatarData;
    if (!src) {
        const account = getAccountDetails(username);
        src = account?.avatar;
    }

    if (src) {
        imgEl.src = src;
    } else {
        // Show default avatar
        imgEl.src = `https://ui-avatars.com/api/?name=${username}&background=random&size=64`;
    }
    imgEl.classList.add("visible");
}

/**
 * Updates all profile UI elements with new avatar
 */
function updateProfileUI(username, avatarData) {
    updateHeaderAvatar(username, avatarData);
    const modalAvatar = document.getElementById("profile-avatar-large");
    if (modalAvatar) modalAvatar.src = avatarData;
}
