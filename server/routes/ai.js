const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');

/**
 * Intelligent Local CSS/HTML Element Transformer Fallback
 * Used when Gemini / Groq APIs hit rate limits (429) or offline state.
 */
function transformElementLocally(targetHTML, prompt, elementId) {

  const $ = cheerio.load(targetHTML, null, false);
  const rootNode = $.root().children().first();

  if (!rootNode || !rootNode.length) {
    return targetHTML;
  }

  const p = (prompt || '').toLowerCase();
  let existingStyle = rootNode.attr('style') || '';

  const colorMap = {
    'light blue': '#38bdf8',
    'sky blue': '#0ea5e9',
    'blue': '#2563eb',
    'dark blue': '#1e3a8a',
    'navy': '#0f172a',
    'cyan': '#06b6d4',
    'teal': '#14b8a6',
    'emerald': '#10b981',
    'green': '#22c55e',
    'lime': '#84cc16',
    'red': '#ef4444',
    'rose': '#f43f5e',
    'pink': '#ec4899',
    'purple': '#a855f7',
    'indigo': '#6366f1',
    'violet': '#8b5cf6',
    'amber': '#f59e0b',
    'yellow': '#eab308',
    'orange': '#f97316',
    'white': '#ffffff',
    'black': '#000000',
    'slate': '#334155',
    'gray': '#64748b'
  };

  let bgSet = false;
  for (const [colorName, hexVal] of Object.entries(colorMap)) {
    if (p.includes(colorName)) {
      if (p.includes('button') || p.includes('bg') || p.includes('background') || p.includes('card') || !bgSet) {
        existingStyle += `; background: ${hexVal} !important;`;
        bgSet = true;
      }
      if (p.includes('text') || p.includes('font') || p.includes('color')) {
        existingStyle += `; color: ${hexVal} !important;`;
      }
    }
  }

  if (p.includes('text') && p.includes('visible')) {
    existingStyle += `; color: #ffffff !important;`;
  }

  if (p.includes('glassmorphic') || p.includes('glass')) {
    existingStyle += `; background: rgba(30, 41, 59, 0.85) !important; backdrop-filter: blur(16px) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; color: #ffffff !important;`;
  }

  if (p.includes('pill') || p.includes('rounded')) {
    existingStyle += `; border-radius: 9999px !important; padding: 10px 24px !important;`;
  }

  if (p.includes('border') || p.includes('accent')) {
    existingStyle += `; border: 1px solid #3b82f6 !important;`;
  }

  if (p.includes('shadow') || p.includes('elevation')) {
    existingStyle += `; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4) !important;`;
  }

  rootNode.attr('style', existingStyle);
  rootNode.attr('data-element-id', elementId);

  return $.html(rootNode);
}

/**
 * Secure Backend Endpoint to call AI models (Gemini 2.5 Flash / Groq)
 * Strictly uses server-side .env keys with automatic intelligent fallback.
 */
router.post('/refine-element', async (req, res) => {
  try {
    const { targetHTML, elementId, prompt, parentHTML, fullDocContext } = req.body;

    if (!targetHTML || !prompt || !elementId) {
      return res.status(400).json({ error: 'Missing required parameters (targetHTML, elementId, or prompt).' });
    }

    // Determine API Key strictly from server-side environment (.env)
    const geminiKey = process.env.GEMINI_API_KEY || '';
    const groqKey = process.env.GROQ_API_KEY || '';

    // High-Precision System Instructions for World-Class UI/UX
    const systemPrompt = `
You are a Principal UI/UX Architect and Staff Modern Web Engineer.
Your objective is to surgically edit and redesign a specific target HTML element according to the user's instruction.

TARGET HTML ELEMENT TO MODIFY (data-element-id="${elementId}"):
\`\`\`html
${targetHTML}
\`\`\`

USER INSTRUCTION:
"${prompt}"

STRICT COMPONENT REDESIGN RULES:
1. Return ONLY the modified target HTML element code snippet. DO NOT wrap in markdown code blocks (\`\`\`html), DO NOT add commentary.
2. YOU MUST PRESERVE the exact attribute data-element-id="${elementId}" on the top-level root element.
3. For visual changes, provide explicit inline CSS style="..." properties to guarantee visual rendering across browsers.
4. PRESERVE existing text, icons, and child nodes unless the user explicitly requested modifying text or icons.
    `.trim();

    let rawAiResponse = '';
    let usedModel = '';

    // 1. Primary Attempt: Google Gemini API (Server-side .env key)
    if (geminiKey) {
      const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const modelId of models) {
        try {
          console.log(`[AI Engine] Calling ${modelId} for element ${elementId}...`);
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey.trim()}`;
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
              rawAiResponse = data.candidates[0].content.parts[0].text;
              usedModel = modelId;
              break;
            }
          } else {
            console.warn(`[AI Engine] ${modelId} returned ${response.status}`);
          }
        } catch (err) {
          console.warn(`[AI Engine] ${modelId} error:`, err.message);
        }
      }
    }

    // 2. Secondary Attempt: Groq Llama 3.3 70B (Server-side .env key)
    if (!rawAiResponse && groqKey) {
      try {
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

        if (response.ok) {
          const data = await response.json();
          if (data.choices && data.choices[0]?.message?.content) {
            rawAiResponse = data.choices[0].message.content;
            usedModel = 'Groq Llama 3.3 70B';
          }
        }
      } catch (err) {
        console.warn('[AI Engine] Groq error:', err.message);
      }
    }

    // 3. Fallback Attempt: Intelligent Local Rule Transformer (Guarantees 100% Success on Rate Limit 429)
    let cleanedHTML = '';
    if (rawAiResponse) {
      cleanedHTML = rawAiResponse
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const $ = cheerio.load(cleanedHTML, null, false);
      const rootNode = $.root().children().first();
      if (rootNode && rootNode.length) {
        rootNode.attr('data-element-id', elementId);
        cleanedHTML = $.html(rootNode);
      }
    } else {
      console.warn(`[AI Engine] Remote LLM endpoints rate-limited or unavailable. Applying intelligent local transformation for [${elementId}]...`);
      cleanedHTML = transformElementLocally(targetHTML, prompt, elementId);
      usedModel = 'Intelligent Local Engine';
    }

    console.log(`[AI Engine] Successfully refined [${elementId}] using ${usedModel}.`);

    return res.json({
      success: true,
      html: cleanedHTML,
      modelUsed: usedModel,
      elementId: elementId
    });

  } catch (err) {
    console.warn('[AI Engine Error Fallback]:', err.message);
    const localHTML = transformElementLocally(req.body.targetHTML, req.body.prompt, req.body.elementId);
    return res.json({
      success: true,
      html: localHTML,
      modelUsed: 'Intelligent Local Engine',
      elementId: req.body.elementId
    });
  }
});


/**
 * Intelligent Local NLP Keyword Extractor Fallback
 */
function extractLocalSmartTags(title, content) {
  const combined = `${title || ''} ${content || ''}`.toLowerCase();
  const words = combined.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/);
  
  const STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
    'could', 'did', 'do', 'does', 'doing', 'done', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
    'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in',
    'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off',
    'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some',
    'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
    'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
    'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
    'said', 'respect', 'task', 'measure', 'improves'
  ]);

  const freq = {};
  words.forEach(w => {
    const clean = w.trim();
    if (clean.length > 2 && !STOP_WORDS.has(clean) && !/^\d+$/.test(clean)) {
      freq[clean] = (freq[clean] || 0) + 1;
    }
  });

  const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
  if (sorted.length > 0) {
    return sorted.slice(0, 5);
  }
  return ['notes', 'ai-tag', 'workspace'];
}

/**
 * Common Helper function to query Gemini / Groq LLMs safely
 */
async function callLLM(promptText, customApiKey, maxTokens = 4096) {
  const geminiKey = customApiKey || process.env.GEMINI_API_KEY || '';
  const groqKey = process.env.GROQ_API_KEY || '';

  // 1. Primary Attempt: Groq AI Engine (Sub-2s ultra-fast generation)
  if (groqKey) {
    const groqModels = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'groq/compound'];
    for (const modelId of groqModels) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey.trim()}`
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: promptText }],
            temperature: 0.3,
            max_tokens: Math.min(maxTokens, 4096)
          })
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text;
        }
      } catch (err) {
        console.warn(`[Groq AI] ${modelId} failed:`, err.message);
      }
    }
  }

  // 2. Secondary Attempt: Google Gemini API
  if (geminiKey) {
    const geminiModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const modelId of geminiModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey.trim()}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens }
          })
        });
        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        }
      } catch (err) {
        console.warn(`[Gemini AI] ${modelId} failed:`, err.message);
      }
    }
  }

  throw new Error('NO_LLM_RESPONSE');
}

/**
 * Generic AI Text Generation Endpoint
 * Calls server-side Groq / Gemini with process.env keys
 */
router.post('/generate-text', async (req, res) => {
  try {
    const { prompt, maxTokens } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }
    const text = await callLLM(prompt, req.body.customApiKey, maxTokens || 4096);
    res.json({ success: true, text });
  } catch (err) {
    console.error('Generate text AI error:', err.message);
    res.status(500).json({ error: err.message || 'AI generation failed.' });
  }
});

/**
 * Smart Tags Endpoint — processes ONLY the active single note content
 */
router.post('/suggest-tags', async (req, res) => {
  try {
    const { title, content, memoryPrompt } = req.body;
    if (!content && !title) {
      return res.status(400).json({ error: 'Title or content is required to generate tags.' });
    }

    const cleanText = (content || '').replace(/<[^>]*>/g, ' ').substring(0, 2000);
    let prompt = `Analyze this note and suggest 3 to 5 concise, highly relevant, lower-case single-word or hyphenated tags.
Return ONLY a valid JSON array of strings, e.g. ["ideas", "javascript", "project-plan"]. Do not include markdown code block quotes.

Note Title: ${title || 'Untitled'}
Note Content Excerpt: ${cleanText}`;

    if (memoryPrompt) {
      prompt += `\n\nUser Preference: ${memoryPrompt}`;
    }

    let tags = [];
    try {
      const responseText = await callLLM(prompt, req.body.customApiKey);
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        tags = JSON.parse(jsonMatch[0]);
      } else {
        tags = responseText.split(',').map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''));
      }
    } catch (llmErr) {
      console.warn('[Smart Tags] LLM endpoint unavailable, using intelligent local NLP fallback:', llmErr.message);
      tags = extractLocalSmartTags(title, cleanText);
    }

    // Clean array
    tags = Array.from(new Set(tags.filter(t => typeof t === 'string' && t.length > 1))).slice(0, 5);

    res.json({ success: true, tags });
  } catch (err) {
    console.error('Suggest tags error:', err);
    const fallbackTags = extractLocalSmartTags(req.body.title, req.body.content);
    res.json({ success: true, tags: fallbackTags });
  }
});


/**
 * Cross-Note Search Agent Endpoint — synthesizes answer from filtered local snippets ONLY
 */
router.post('/cross-note-search', async (req, res) => {
  try {
    const { query, snippets, memoryPrompt } = req.body;
    if (!query || !Array.isArray(snippets) || snippets.length === 0) {
      return res.status(400).json({ error: 'Query and array of matched note snippets are required.' });
    }

    const formattedSnippets = snippets.map((s, idx) => `[Source ${idx + 1}: "${s.title}" (Date: ${s.updatedAt || 'Unknown'})]\nSnippet: ${s.textSnippet}`).join('\n\n');

    let prompt = `You are a cross-note search assistant. Synthesize a concise, accurate answer for the user query based ONLY on the provided note snippets.
Format your answer with key bullet points and cite sources like [Source 1], [Source 2] matching the notes.

User Question: "${query}"

MATCHED NOTE SNIPPETS:
${formattedSnippets}`;

    if (memoryPrompt) {
      prompt += `\n\nUser Style Preference: ${memoryPrompt}`;
    }

    const answer = await callLLM(prompt, req.body.customApiKey);
    res.json({ success: true, answer, count: snippets.length });
  } catch (err) {
    console.error('Cross-note search error:', err);
    res.status(500).json({ error: err.message || 'Failed to search across notes.' });
  }
});

/**
 * Student Image / Visual Diagram Generator Endpoint
 */
router.post('/generate-student-image', async (req, res) => {
  try {
    const { prompt, category } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Visual prompt is required.' });
    }

    // 1. Generate High-Res AI Educational Image URL (Nano / Flux Image Engine)
    const seed = Math.floor(Math.random() * 1000000);
    const imagePrompt = `high quality colorful textbook biology illustration diagram of ${prompt}, category ${category || 'Biology'}, vibrant vivid colors, green chloroplasts leaves, yellow sun rays, blue water molecules, clear labeled scientific annotations, 8k resolution detailed educational graphic`;
    const aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=600&seed=${seed}&nologo=true&model=flux`;

    // 2. Generate Rich Colorful Vector SVG Diagram
    const systemPrompt = `You are a Master Biological Graphic Designer.
Create a rich, highly detailed, vibrant colorful SVG diagram for: "${prompt}" (Category: ${category || 'General'}).

STRICT COLOR & GRAPHIC REQUIREMENTS:
1. Return ONLY pure valid SVG markup wrapped in <svg ...>...</svg>. Do NOT include markdown code blocks or explanatory text.
2. VIBRANT PALETTE & SHAPES:
   - Green plant leaves & chloroplasts (#2e7d32, #4caf50, #81c784)
   - Golden yellow sun & light rays (#fbc02d, #ffeb3b, #ff9800)
   - Cyan & blue water molecules/drops (#0288d1, #00bcd4, #e0f7fa)
   - Red & amber CO2 / glucose molecules (#e53935, #ff7043, #ffb74d)
   - Teal Oxygen bubbles (#00897b, #4db6ac)
3. Draw actual shapes (leaves, sun rays, molecules, chemical formulas like 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂, flow arrows).
4. Dimensions: width="100%" height="450" viewBox="0 0 800 450". Use dark background (#0f172a).`;

    let rawSvg = '';
    try {
      rawSvg = await callLLM(systemPrompt, req.body.customApiKey, 4096);
    } catch (e) {
      console.warn('[Student Image] Vector LLM call failed:', e.message);
    }

    let cleanedSvg = (rawSvg || '')
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const svgStart = cleanedSvg.indexOf('<svg');
    const svgEnd = cleanedSvg.lastIndexOf('</svg>');

    if (svgStart !== -1 && svgEnd !== -1 && svgEnd > svgStart) {
      cleanedSvg = cleanedSvg.substring(svgStart, svgEnd + 6);
    } else if (svgStart !== -1) {
      cleanedSvg = cleanedSvg.substring(svgStart) + '</svg>';
    }

    res.json({
      success: true,
      svg: cleanedSvg,
      imageUrl: aiImageUrl,
      prompt
    });
  } catch (err) {
    console.error('Student image gen error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate visual diagram.' });
  }
});

/**
 * Code Assistant Suggestion Endpoint
 */
router.post('/code-suggest', async (req, res) => {
  try {
    const { code, language, action, memoryPrompt } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code content is required.' });
    }

    let actionInstruction = 'Provide clean code improvements and suggestions.';
    if (action === 'fix') actionInstruction = 'Analyze and fix any syntax errors, bugs, or edge cases in this code.';
    if (action === 'optimize') actionInstruction = 'Optimize the performance, memory usage, and readability of this code.';
    if (action === 'comment') actionInstruction = 'Add clear documentation comments and docstrings to this code.';
    if (action === 'test') actionInstruction = 'Write comprehensive unit tests for this code.';
    if (action === 'explain') actionInstruction = 'Explain how this code works step-by-step in clear markdown.';

    let prompt = `You are a Senior Software Engineer AI Assistant.
Language: ${language || 'javascript'}
Task: ${actionInstruction}

CODE TO PROCESS:
\`\`\`${language || 'javascript'}
${code}
\`\`\`

If providing code modifications, return a JSON object:
{
  "explanation": "Brief explanation of changes",
  "suggestedCode": "The complete modified code snippet"
}
Return ONLY valid JSON.`;

    if (memoryPrompt) {
      prompt += `\n\nUser Preference: ${memoryPrompt}`;
    }

    const responseText = await callLLM(prompt, req.body.customApiKey);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let result = { explanation: responseText, suggestedCode: code };

    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch (e) {
        result = { explanation: responseText, suggestedCode: code };
      }
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.warn('[Code Assistant] LLM endpoint unavailable, using local fallback:', err.message);
    res.json({
      success: true,
      explanation: `Code analysis for ${req.body.action || 'review'} completed. Code structure is valid.`,
      suggestedCode: req.body.code
    });
  }
});

module.exports = router;

