/**
 * geminiAPI.js
 * Calls the server-side AI proxy (/api/ai/generate) which forwards the request
 * to Groq securely. The GROQ_API_KEY never touches the browser.
 */

/**
 * Generates text via the server-side AI proxy.
 * @param {string} prompt The user's prompt.
 * @returns {Promise<string>} The generated text.
 */
export async function generateTextWithGemini(prompt) {
    try {
        const response = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        if (response.status === 401) {
            return '[AI Assistant]: You need to be logged in to use the AI assistant.';
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const message = errData.error || `Server error (${response.status})`;
            console.error('[geminiAPI] Proxy error:', message);
            return `[AI Assistant]: ${message}`;
        }

        const data = await response.json();
        return data.text ?? '[AI Assistant]: No response received.';

    } catch (error) {
        console.error('[geminiAPI] Network error:', error.message);
        return '[AI Assistant]: Could not connect to the AI service. Please check your connection.';
    }
}
