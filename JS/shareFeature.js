import { stripHtml } from './utilities.js';

/**
 * Wires up the Social Share Modal logic.
 * @param {Object} state - The global app state.
 */
export function wireShareFeature(state, callbacks) {
    const shareBtn = document.getElementById('share-note');
    const shareModal = document.getElementById('share-modal');
    const closeBtns = shareModal?.querySelectorAll('.close-modal');

    const whatsappBtn = document.getElementById('share-whatsapp');
    const emailBtn = document.getElementById('share-email');
    const copyTextBtn = document.getElementById('share-copy-text');

    if (shareBtn && shareModal) {
        shareBtn.addEventListener('click', () => {
            // Check if user is logged in
            if (!state.activeUser) {
                const shouldLogin = confirm("You need to be logged in to share notes. Would you like to log in now?");
                if (shouldLogin) {
                    window.location.href = "./HTML/signup.html";
                }
                return;
            }

            // Get the active note
            const activeNote = state.notes.find(n => n.id === state.activeNoteId);
            if (!activeNote) {
                alert("No active note to share.");
                return;
            }

            // Generate the text content
            const shareText = generateShareText(activeNote);
            const shareTitle = activeNote.title || "Shared Note";

            // Update WhatsApp Link
            if (whatsappBtn) {
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                whatsappBtn.href = whatsappUrl;
            }

            // Update Email Link
            if (emailBtn) {
                // Ensure newlines are encoded as CRLF (%0D%0A) for better email client compatibility
                const mailBody = shareText.replace(/\n/g, '\r\n');
                const emailUrl = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(mailBody)}`;
                emailBtn.href = emailUrl;
            }

            // Setup Copy Button
            if (copyTextBtn) {
                // Remove old listeners by cloning (simple trick) or just re-assign onclick
                copyTextBtn.onclick = () => {
                    navigator.clipboard.writeText(shareText).then(() => {
                        const originalText = copyTextBtn.innerHTML;
                        copyTextBtn.innerHTML = '<span style="font-size: 1.2em;">✅</span> Copied!';
                        setTimeout(() => {
                            copyTextBtn.innerHTML = originalText;
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy: ', err);
                        alert("Failed to copy text.");
                    });
                };
            }

            // Open Modal
            shareModal.showModal();
        });
    }

    // Wiring close buttons
    if (closeBtns) {
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                shareModal.close();
            });
        });
    }

    // Close on click outside
    if (shareModal) {
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                shareModal.close();
            }
        });
    }
}


/**
 * Generates the formatted text for sharing.
 * Format:
 * [Title]
 * 
 * [Content]
 * 
 * Shared via Global Notes Workspace
 */
function generateShareText(note) {
    const content = stripHtml(note.content || "");
    return `${note.title || "Untitled Note"}\n\n${content}\n\nShared via Global Notes Workspace`;
}

/**
 * Legacy URL check - No longer needed for text sharing but kept empty to prevent import errors in main app.
 */
export function checkSharedUrl() {
    return false;
}