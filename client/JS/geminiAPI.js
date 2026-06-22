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
    const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    });

    if (response.status === 401) {
        throw new Error('You need to be logged in to use AI features.');
    }

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const message = errData.error || `AI service error (${response.status})`;
        console.error('[geminiAPI] Proxy error:', message);
        throw new Error(message);
    }

    const data = await response.json().catch(() => {
        throw new Error('Invalid response from AI service.');
    });

    const text = data.text;
    if (!text) throw new Error('AI returned an empty response. Please try again.');
    return text;
}
