
// PLEASE NOTE: This is a sample implementation. You will need to secure your API key.
// Do not expose it in client-side code in a production environment.
// Consider using a backend proxy or a serverless function to handle API calls securely.

const API_KEY = 'AIzaSyCqXDZVyFZh0u2ZYCL4MrvPlsL8YNqNw70'; // <-- IMPORTANT: Replace with your API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent?key=${API_KEY}`;

/**
 * Calls the Gemini API to generate content.
 * @param {string} prompt The user's prompt.
 * @returns {Promise<string>} The generated text.
 */
export async function generateTextWithGemini(prompt) {
    if (API_KEY === 'YOUR_GEMINI_API_KEY') {
        // Return a message asking the user to configure the API key.
        return Promise.resolve(`
[AI Assistant]: Please configure your Gemini API key in JS/geminiAPI.js to enable this feature.
You can get a key from Google AI Studio.
`);
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Gemini API request failed:', errorBody);
            throw new Error(`API request failed with status ${response.status}: ${errorBody.error.message}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            // Handle cases where the response structure is unexpected
            console.warn("Gemini API response was successful, but no content was found.", data);
            return "I'm sorry, I couldn't generate a response. Please try again.";
        }

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        // Provide a more user-friendly error message
        return `
[AI Assistant]: There was an error contacting the AI service.
Please check the console for more details.
Make sure your API key is correct and has the necessary permissions.
Error: ${error.message}
        `;
    }
}
