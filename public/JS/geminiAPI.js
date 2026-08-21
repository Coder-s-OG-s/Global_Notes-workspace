import config from './config.js';

/**
 * Calls Gemini / Groq API directly if client key is present,
 * or routes securely through server endpoint /api/ai/generate-text using process.env keys.
 * @param {string} prompt The user's prompt or system prompt.
 * @param {string} [customApiKey] Optional custom key from UI.
 * @returns {Promise<string>} The generated text.
 */
export async function generateTextWithGemini(prompt, customApiKey) {
    const geminiKey = customApiKey || config.GEMINI_API_KEY || window.localStorage.getItem('GN_CUSTOM_GEMINI_KEY');
    const groqKey = config.GROQ_API_KEY || window.localStorage.getItem('GN_CUSTOM_GROQ_KEY');

    // 1. Try Google Gemini API if client-side key is available
    if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY' && geminiKey.trim() !== '') {
        try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`;
            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 8192
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                }
            }
        } catch (geminiErr) {
            console.warn('Client-side Gemini API call failed, trying server proxy:', geminiErr.message);
        }
    }

    // 2. Try Groq API if client-side key is available
    if (groqKey && groqKey !== 'YOUR_GROQ_API_KEY' && groqKey.trim() !== '') {
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqKey.trim()}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                    max_tokens: 4096
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.choices && data.choices[0]?.message?.content) {
                    return data.choices[0].message.content;
                }
            }
        } catch (groqErr) {
            console.warn('Client-side Groq API call failed, trying server proxy:', groqErr.message);
        }
    }

    // 3. Secure Server Backend Proxy Endpoint (uses server-side .env keys)
    try {
        const response = await fetch('/api/ai/generate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, customApiKey })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.text) {
                return data.text;
            }
        }
        
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server AI Proxy HTTP ${response.status}`);
    } catch (serverErr) {
        console.error('Server AI proxy call error:', serverErr);
        throw serverErr;
    }
}

/**
 * Calls Groq API or routes through secure server AI proxy /api/ai/generate-text.
 * @param {string} prompt The user's prompt or system prompt.
 * @param {string} [customApiKey] Optional custom key from UI.
 * @returns {Promise<string>} The generated text.
 */
export async function generateTextWithGroq(prompt, customApiKey) {
    return generateTextWithGemini(prompt, customApiKey);
}
