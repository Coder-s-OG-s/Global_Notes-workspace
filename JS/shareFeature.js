

/**
 * Wires up the Share button and Modal logic.
 * @param {Object} state - The global app state.
 */
export function wireShareFeature(state, callbacks) {
    const shareBtn = document.getElementById('share-note');
    const shareModal = document.getElementById('share-modal');
    const copyBtn = document.getElementById('copy-share-link');
    const linkInput = document.getElementById('share-link-input');
    const closeBtns = shareModal?.querySelectorAll('.close-modal');

    const hostInput = document.getElementById('share-host-ip');
    const compactCheckbox = document.getElementById('share-compact-mode');

    if (shareBtn && shareModal) {
        shareBtn.addEventListener('click', async () => {
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

            // Pre-fill host input if empty
            if (hostInput && !hostInput.value) {
                // We detected this IP on the machine. Pre-filling it to help the user.
                const detectedIP = '10.110.153.152';
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    hostInput.value = detectedIP;
                } else {
                    hostInput.value = window.location.hostname;
                }
            }

            // Default to Compact Mode (simple link) ALWAYS on open to prevent errors
            if (compactCheckbox) {
                compactCheckbox.checked = true;
            }

            // Internal helper to update UI
            const updateUI = () => {
                const detectedIP = '10.110.153.152';
                // Use input value, or detected IP if input is empty/missing on localhost, fallback to hostname
                let currentHost;
                if (hostInput && hostInput.value) {
                    currentHost = hostInput.value;
                } else {
                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                        currentHost = detectedIP;
                    } else {
                        currentHost = window.location.hostname;
                    }
                }

                // Default to Compact Mode if checkbox is missing, otherwise read checked state
                let isCompact = compactCheckbox ? compactCheckbox.checked : true;

                let longLink = generateShareLink(activeNote, state.activeUser, currentHost, isCompact);

                // Auto-fallback 1: Force Compact Mode if too long
                if (longLink.length > 2900 && !isCompact && compactCheckbox) {
                    console.warn("Link too long, switching to Compact Mode");
                    compactCheckbox.checked = true;
                    isCompact = true;
                    longLink = generateShareLink(activeNote, state.activeUser, currentHost, isCompact);
                }

                // Auto-fallback 2: Smart Truncation if STILL too long (User request: "make it short so QR works")
                if (longLink.length > 2900) {
                    console.warn("Link still too long, truncating content for QR Code safety");

                    // Create a temporary truncated note object
                    const truncatedNote = { ...activeNote };
                    // aggressive cut to ensure fit (1500 chars is safe for V40-L QR)
                    if (truncatedNote.content && truncatedNote.content.length > 1500) {
                        truncatedNote.content = truncatedNote.content.substring(0, 1500) + "\n\n[...Note truncated for QR Code. Use Copy Link for full version...]";
                    }

                    longLink = generateShareLink(truncatedNote, state.activeUser, currentHost, true); // Force compact on truncated

                    // Visual indicator (optional but helpful)
                    const qrContainer = document.getElementById('qrcode-container');
                    if (qrContainer) {
                        qrContainer.style.border = "2px solid #f59e0b"; // Warning color
                        qrContainer.setAttribute("title", "QR Code contains partial note (too large)");
                    }
                } else {
                    const qrContainer = document.getElementById('qrcode-container');
                    if (qrContainer) qrContainer.style.border = "none";
                }

                if (linkInput) {
                    linkInput.value = longLink;
                    linkInput.disabled = false;
                }
                // Generate QR Code
                requestAnimationFrame(() => {
                    generateQRCode(longLink);
                });
            };

            // Run once on open
            updateUI();

            // Listen for IP changes
            if (hostInput) {
                // Remove old listeners to avoid duplicates (naive approach)
                hostInput.oninput = updateUI;
            }

            // Listen for Compact Mode changes
            if (compactCheckbox) {
                compactCheckbox.onchange = () => {
                    compactCheckbox.setAttribute('data-user-set', 'true');
                    updateUI();
                };
            }

            // Open Modal immediately
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

    if (copyBtn && linkInput) {
        copyBtn.addEventListener('click', () => {
            linkInput.select();
            navigator.clipboard.writeText(linkInput.value).then(() => {
                const originalText = copyBtn.innerText;
                copyBtn.innerText = "Copied!";
                setTimeout(() => copyBtn.innerText = originalText, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        });
    }
}


/**
 * Generates a shareable URL with note data encoded in query params.
 * @param {string} username - The username of the sharer.
 * @param {string} [customHost] - Optional custom hostname/IP.
 * @param {boolean} [compact] - If true, omits branding/user info for shorter URL.
 * @returns {string} - The full URL.
 */
function generateShareLink(note, username, customHost, compact = false) {
    let baseUrl = window.location.origin + window.location.pathname;

    if (customHost) {
        // Replace protocol + hostname with protocol + customHost
        try {
            const url = new URL(baseUrl);
            url.hostname = customHost;
            baseUrl = url.toString();
            // Remove trailing slash if present to avoid double slash issues optionally
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        } catch (e) {
            console.error("Invalid custom host", e);
        }
    }

    // Use the current base URL directly.
    // Ideally, for mobile sharing, the user should access the app via their LAN IP.


    // Create a minimal object to share
    let contentToShare = note.content;

    // meaningful optimization: In compact mode, we strip HTML to save HUGE amounts of space
    // The user explicitly asked for "access the notes data as a text" and "make url little short".
    if (compact && typeof contentToShare === 'string') {
        // Create a temporary element to strip tags correctly or use regex
        // Regex is safer for a quick sync ops without DOM overhead concerns
        contentToShare = contentToShare.replace(/<[^>]*>?/gm, '\n');
        // cleanup multiple newlines
        contentToShare = contentToShare.replace(/\n\s*\n/g, '\n').trim();
    }

    const shareData = {
        t: note.title,
        c: contentToShare,
        d: note.updatedAt || new Date().toISOString()
    };

    // Encode with compression to save space
    const jsonString = JSON.stringify(shareData);
    let encodedData;
    if (window.LZString) {
        encodedData = window.LZString.compressToEncodedURIComponent(jsonString);
    } else {
        console.warn("LZString is undefined, falling back to basic encoding");
        encodedData = encodeURIComponent(jsonString);
    }

    // Build URL with descriptive parameters
    const params = new URLSearchParams();

    // Only add metadata if NOT in compact mode
    if (!compact) {
        if (username) params.set('user', username);
        params.set('title', note.title || 'Untitled');
        params.set('company', 'Global Notes Workspace');
    }

    params.set('share_data', encodedData);
    params.set('compressed', 'true');

    return `${baseUrl}?${params.toString()}`;
}

/**
 * Generates a QR Code in the #qrcode-container element.
 * @param {string} text - The text/URL to encode.
 */
function generateQRCode(text) {
    const container = document.getElementById('qrcode-container');
    if (!container) {
        console.error("QR Container not found");
        return;
    }

    // Clear previous QR
    container.innerHTML = '';

    // Check if QRCode lib is loaded
    if (!window.QRCode) {
        console.error("QRCode library not loaded");
        container.innerHTML = '<div style="color: red; padding: 10px; text-align: center;">Error: QR Code library missing.</div>';
        return;
    }

    // Check for length limit (approximate for Version 40 QR code)
    // Decreased to 2900 (Max bytes for V40-L is ~2953). 4000 was too optimistic for binary content.
    if (text.length > 2900) {
        console.warn("URL still too long for QR Code:", text.length);
        container.innerHTML = '<div style="color: var(--text-muted); padding: 10px; text-align: center;">Link is too long (' + text.length + ' chars).<br>Max is 2900.<br>Please use the Copy Link button.</div>';
        return;
    }

    try {
        console.log("Creating new QRCode instance for length:", text.length);

        // Use setTimeout to ensure the modal transition has finished and container has dimensions
        setTimeout(() => {
            try {
                // Clear again just in case
                container.innerHTML = '';

                new window.QRCode(container, {
                    text: text,
                    width: 256,
                    height: 256,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: window.QRCode.CorrectLevel.L // Low error correction maximizes capacity
                });
            } catch (innerError) {
                console.error("Inner QR Generation Error:", innerError);
                // Show specific error to user/developer
                container.innerHTML = `<div style="color: red; padding: 10px; text-align: center;">Error: ${innerError.message || "Unknown Gen Error"}</div>`;
            }
        }, 100);

    } catch (e) {
        console.error("QR Generation Error:", e);
        container.innerText = "Error generating QR Code";
    }
}

/**
 * Checks the URL at startup for shared data.
 * If found, displays the shared note.
 */
export function checkSharedUrl() {
    const params = new URLSearchParams(window.location.search);
    const shareDataRaw = params.get('share_data');
    const isCompressed = params.get('compressed') === 'true';
    const sharedBy = params.get('user');

    if (shareDataRaw) {
        try {
            let jsonString;

            if (isCompressed) {
                if (typeof LZString === 'undefined') {
                    alert("System components missing (LZString). Please reload the page and check your internet/network.");
                    throw new Error("LZString library missing on client.");
                }
                jsonString = LZString.decompressFromEncodedURIComponent(shareDataRaw);
            } else {
                jsonString = decodeURIComponent(shareDataRaw);
            }

            if (!jsonString) throw new Error("Decompression returned null (invalid data)");

            const shareData = JSON.parse(jsonString);

            displaySharedNote(shareData, sharedBy);

            // Clean URL so refresh doesn't stick in shared mode forever optionally
            // window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
            console.error("Error parsing share data:", e);
            // More specific error for the user
            if (e.message.includes("LZString")) {
                alert("Could not load share library. Please reload.");
            } else {
                alert("The share link is corrupted or incomplete. Please try copying it again.");
            }
        }
    }
}

/**
 * Displays the shared note.
 * Since the user wants to "access the notes data as a text",
 * we can either inject it into the editor or show a special "Read Only" view.
 * For now, let's replace the editor content directly and maybe hide the sidebar/edit controls
 * to indicate this is a "Shared View". Or better, just load it as a new "Shared Note" in memory.
 */
function displaySharedNote(data, sharedBy) {
    const sharedNote = {
        title: data.t || 'Untitled Shared Note',
        content: data.c || '',
        updatedAt: data.d
    };

    const footerText = sharedBy
        ? `Shared by <strong>${sharedBy}</strong> via Global Notes Workspace`
        : `Shared via Global Notes Workspace`;

    // 1. Set Title
    document.title = `${sharedNote.title} - Shared Note`;

    // 2. Clear existing body and styles
    document.body.innerHTML = '';
    document.body.style = '';
    document.body.className = '';

    // Remove all existing stylesheets
    document.querySelectorAll('link[rel="stylesheet"], style').forEach(el => el.remove());

    // 3. Inject New "Clean View" Styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #f9f9f9;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            display: flex;
            justify-content: center;
            padding: 40px 20px;
            box-sizing: border-box;
        }
        .shared-container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            width: 100%;
            max-width: 800px;
            height: fit-content;
        }
        h1 {
            margin-top: 0;
            font-size: 2em;
            color: #1a1a1a;
            border-bottom: 2px solid #eaeaea;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        .content {
            font-size: 1.1em;
            white-space: pre-wrap; /* Preserve whitespace/newlines */
        }
        .content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
        }
        .meta {
            margin-top: 40px;
            font-size: 0.85em;
            color: #888;
            border-top: 1px solid #eaeaea;
            padding-top: 20px;
            text-align: center;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .shared-container { padding: 20px; }
            h1 { font-size: 1.5rem; }
        }
    `;
    document.head.appendChild(styleEl);

    // 4. Build Structure (Valid DOM, not replacing HTML tag)
    const container = document.createElement('div');
    container.className = 'shared-container';

    // Sanitize content (strip scripts, keep structure)
    // For this view, we want to allow some HTML if possible, 
    // but the user's "text form" request implies safety.
    // We will do basic stripping but allow safe tags if needed, 
    // or just use textContent if it's purely text.
    // Assuming 'content' might contain simple formatting.

    // Create header
    const header = document.createElement('h1');
    header.textContent = sharedNote.title;
    container.appendChild(header);

    // Create content div
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    // Use innerHTML but strip dangerous tags for safety
    const safeContent = (sharedNote.content || '').replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "");
    contentDiv.innerHTML = safeContent;
    container.appendChild(contentDiv);

    // Create footer
    const footerDiv = document.createElement('div');
    footerDiv.className = 'meta';
    footerDiv.innerHTML = footerText;
    container.appendChild(footerDiv);

    document.body.appendChild(container);
}