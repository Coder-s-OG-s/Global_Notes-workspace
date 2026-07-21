import config from './config.js';

/**
 * Calls the Groq API (OpenAI compatible) to generate content.
 * Keeps the original function name to avoid breaking imports in other files.
 * @param {string} prompt The user's prompt.
 * @returns {Promise<string>} The generated text.
 */
export async function generateTextWithGemini(prompt) {
    const { GROQ_API_KEY: API_KEY } = config;
    const API_URL = "https://api.groq.com/openai/v1/chat/completions";

    if (!API_KEY || API_KEY === '' || API_KEY === 'YOUR_GROQ_API_KEY') {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const message = isLocal
            ? "Please add GROQ_API_KEY to your .env file and run 'npm run build'."
            : "Deployment Error: GROQ_API_KEY is missing. Please add it to your deployment platform's Environment Variables.";

        return Promise.resolve(`
[AI Assistant]: ${message}
You can get a key from console.groq.com.
`);
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Groq API request failed:', errorBody);
            throw new Error(`API request failed with status ${response.status}: ${errorBody.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            console.warn("Groq API response was successful, but no content was found.", data);
            return "I'm sorry, I couldn't generate a response. Please try again.";
        }

    } catch (error) {
        console.error('Error calling Groq API:', error);
        return `
[AI Assistant]: There was an error contacting the Groq service.
Please check the console for more details.
Error: ${error.message}
        `;
    }
}
