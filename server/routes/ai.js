const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');

/**
 * Secure Backend Endpoint to call AI models (Gemini 2.5 Flash / Groq)
 * Keeps API Keys 100% hidden from client-side network inspect and code.
 */
router.post('/refine-element', async (req, res) => {
  try {
    const { targetHTML, elementId, prompt, parentHTML, fullDocContext, customApiKey } = req.body;

    if (!targetHTML || !prompt || !elementId) {
      return res.status(400).json({ error: 'Missing required parameters (targetHTML, elementId, or prompt).' });
    }

    // Determine API Key securely on server
    const geminiKey = customApiKey || process.env.GEMINI_API_KEY || '';
    const groqKey = process.env.GROQ_API_KEY || '';

    if (!geminiKey && !groqKey) {
      return res.status(500).json({
        error: 'No AI API Key configured on server. Please set GEMINI_API_KEY or GROQ_API_KEY in your server .env file.'
      });
    }

    // Detect Document Framework & Context
    const hasTailwind = fullDocContext ? (fullDocContext.includes('tailwindcss') || fullDocContext.includes('tailwind')) : true;
    const hasMaterialIcons = fullDocContext ? (fullDocContext.includes('material-symbols') || fullDocContext.includes('material-icons')) : false;

    // High-Precision System Instructions for World-Class UI/UX
    const systemPrompt = `
You are a Principal UI/UX Architect and Staff Modern Web Engineer.
Your objective is to surgically edit and redesign a specific target HTML element according to the user's instruction.

TARGET HTML ELEMENT TO MODIFY (data-element-id="${elementId}"):
\`\`\`html
${targetHTML}
\`\`\`

SURROUNDING PARENT CONTAINER CONTEXT:
\`\`\`html
${parentHTML ? parentHTML.substring(0, 500) : 'N/A'}
\`\`\`

USER INSTRUCTION:
"${prompt}"

STRICT COMPONENT REDESIGN RULES:
1. Return ONLY the modified target HTML element code snippet. DO NOT wrap in markdown code blocks (\`\`\`html), DO NOT add commentary.
2. YOU MUST PRESERVE the exact attribute data-element-id="${elementId}" on the top-level root element.
3. For visual changes (e.g. Glassmorphism, Neon Glow, Pill Shape, Colors, Gradients, Shadows, Hover effects):
   - ALWAYS PROVIDE explicit inline CSS \`style="..."\` properties (e.g. \`style="background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px 0 rgba(0,0,0,0.37); color: #ffffff;"\`) TO GUARANTEE VIVID VISUAL RENDERING IN ALL BROWSERS.
   - ALSO PROVIDE matching Tailwind CSS utility classes (e.g. \`class="backdrop-blur-md bg-white/10 border border-white/20 shadow-2xl rounded-2xl transition-all duration-300"\`).
4. PRESERVE existing text, icons, and child nodes unless the user explicitly requested modifying the text or icons.
5. If user requested hover animations or transitions, include smooth transition styles or inline event handlers (e.g. \`style="transition: all 0.3s ease;"\`).
    `.trim();

    let rawAiResponse = '';
    let usedModel = '';

    // 1. Primary Attempt: Google Gemini 2.5 Flash API (Server-side)
    if (geminiKey) {
      try {
        console.log(`[AI Engine] Calling Gemini 2.5 Flash for element ${elementId}...`);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4096
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            rawAiResponse = data.candidates[0].content.parts[0].text;
            usedModel = 'Gemini 2.5 Flash';
          }
        } else {
          const errText = await response.text();
          console.warn('[AI Engine] Gemini API call failed:', response.status, errText);
        }
      } catch (err) {
        console.warn('[AI Engine] Gemini request error, falling back to Groq:', err.message);
      }
    }

    // 2. Fallback Attempt: Groq Llama 3.3 70B (Server-side)
    if (!rawAiResponse && groqKey) {
      console.log(`[AI Engine] Calling Groq Llama-3.3-70b for element ${elementId}...`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey.trim()}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.3,
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(`Groq API Error (${response.status}): ${errBody.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        rawAiResponse = data.choices[0].message.content;
        usedModel = 'Groq Llama 3.3 70B';
      }
    }

    if (!rawAiResponse) {
      throw new Error('AI Engine failed to generate code. Please check your API keys.');
    }

    // Server-Side Clean & DOM Validation
    let cleanedHTML = rawAiResponse
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    // Ensure data-element-id attribute is attached to root node
    const $ = cheerio.load(cleanedHTML, null, false);
    const rootNode = $.root().children().first();
    if (rootNode && rootNode.length) {
      rootNode.attr('data-element-id', elementId);
      cleanedHTML = $.html(rootNode);
    }

    console.log(`[AI Engine] Successfully refined [${elementId}] using ${usedModel}.`);

    return res.json({
      success: true,
      html: cleanedHTML,
      modelUsed: usedModel,
      elementId: elementId
    });

  } catch (err) {
    console.error('[AI Engine Error]:', err);
    return res.status(500).json({ error: err.message || 'AI refinement failed.' });
  }
});

module.exports = router;
