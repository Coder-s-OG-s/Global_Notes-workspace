import config from './config.js';

/**
 * Calls Gemini 2.5 Flash API or Groq API to generate UI content.
 * @param {string} prompt The user's prompt or system prompt.
 * @param {string} [customApiKey] Optional custom key from UI.
 * @returns {Promise<string>} The generated text.
 */
export async function generateTextWithGemini(prompt, customApiKey) {
    const geminiKey = customApiKey || config.GEMINI_API_KEY || window.localStorage.getItem('GN_CUSTOM_GEMINI_KEY');
    const groqKey = config.GROQ_API_KEY;

    // 1. Try Google Gemini API if Gemini Key is available
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
            } else {
                console.warn('Gemini API failed with status:', response.status, 'Falling back to Groq...');
            }
        } catch (geminiErr) {
            console.warn('Gemini API call failed, falling back to Groq:', geminiErr.message);
        }
    }

    // 2. Fallback to Groq API (llama-3.3-70b-versatile)
    if (!groqKey || groqKey === '' || groqKey === 'YOUR_GROQ_API_KEY') {
        return Promise.resolve(`[AI Error]: Missing API Key. Please add GROQ_API_KEY or GEMINI_API_KEY to your .env file.`);
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Groq API error ${response.status}: ${errorBody.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
            return data.choices[0].message.content;
        } else {
            return "I couldn't generate a response. Please try again.";
        }
    } catch (error) {
        console.error('Error calling AI API:', error);
        throw error;
    }
}
