const express = require('express');
const router = express.Router();
const UIStudioProject = require('../models/UIStudioProject');

/**
 * Live Google Gemini 2.5 Flash AI UI Generator
 */
async function callGeminiAI(prompt, theme = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const primary = theme.primaryColor || '#FF4F00';
  const secondary = theme.secondaryColor || '#8B5CF6';
  const bg = theme.bgColor || '#09090B';
  const surface = theme.surfaceColor || '#18181B';
  const text = theme.textColor || '#FFFFFF';

  const systemInstruction = `
You are a Staff UI/UX Designer and Lead Frontend Engineer.
Generate a cohesive 3-screen responsive web design prototype based on the user's prompt or PRD specifications.

Design Tokens to enforce across all screens:
- Primary Color: ${primary}
- Secondary Accent: ${secondary}
- Background Color: ${bg}
- Surface Card Color: ${surface}
- Text Color: ${text}
- Typography: 'Outfit', 'Inter', sans-serif

You MUST return strictly valid JSON matching this structure without extra commentary:
{
  "title": "Project Title",
  "screens": [
    {
      "id": "screen-1",
      "title": "Landing / Presentation View",
      "type": "landing",
      "html": "<full responsive HTML markup for screen 1>",
      "css": "<unified CSS stylesheet using the design tokens>",
      "description": "Overview description"
    },
    {
      "id": "screen-2",
      "title": "Authentication / Onboarding",
      "type": "auth",
      "html": "<full responsive HTML markup for screen 2>",
      "css": "<unified CSS stylesheet using the design tokens>",
      "description": "Sign in / onboarding screen"
    },
    {
      "id": "screen-3",
      "title": "Dashboard / Main Console",
      "type": "dashboard",
      "html": "<full responsive HTML markup for screen 3>",
      "css": "<unified CSS stylesheet using the design tokens>",
      "description": "Main application workspace"
    }
  ]
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: `${systemInstruction}\n\nUser Prompt / Specs:\n${prompt}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error details:', errorText);
    throw new Error(`Gemini API HTTP Error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Clean markdown code blocks if wrapped
  let cleanedText = rawText.trim();
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleanedText);
  return parsed;
}

// @route   POST /api/ui-studio/generate
// @desc    Generate real connected multi-page UI designs using Gemini AI
router.post('/generate', async (req, res) => {
  try {
    const { prompt, theme } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt or PRD content is required.' });
    }

    console.log(`⚡ Generating live Gemini 2.5 UI design for prompt: "${prompt.substring(0, 40)}..."`);
    const aiResponse = await callGeminiAI(prompt, theme);

    res.json({
      title: aiResponse.title || prompt.substring(0, 30),
      prompt,
      theme,
      screens: aiResponse.screens || []
    });
  } catch (err) {
    console.error('Error generating UI via Gemini API:', err.message);
    res.status(500).json({ error: 'Gemini AI generation failed.', details: err.message });
  }
});

// @route   POST /api/ui-studio/parse-prd
// @desc    Parse uploaded PRD file text into real multi-page UI designs using Gemini AI
router.post('/parse-prd', async (req, res) => {
  try {
    const { fileContent, fileName } = req.body;
    if (!fileContent) {
      return res.status(400).json({ error: 'File content is empty.' });
    }

    const prdPrompt = `PRD Document (${fileName || 'Specification'}):\n${fileContent.substring(0, 3000)}`;
    console.log(`📄 Parsing PRD document with Gemini AI: ${fileName}`);

    const aiResponse = await callGeminiAI(prdPrompt, {});

    res.json({
      title: aiResponse.title || `PRD: ${fileName}`,
      summary: `Extracted screen flows from ${fileName || 'PRD document'} using Gemini 2.5 Flash AI.`,
      screens: aiResponse.screens || []
    });
  } catch (err) {
    console.error('Error parsing PRD via Gemini API:', err.message);
    res.status(500).json({ error: 'Failed to parse PRD file with Gemini AI.', details: err.message });
  }
});

// @route   GET /api/ui-studio/projects
// @desc    Get saved UI Studio projects from MongoDB
router.get('/projects', async (req, res) => {
  try {
    const projects = await UIStudioProject.find().sort({ updatedAt: -1 }).limit(20);
    res.json(projects);
  } catch (err) {
    console.error('Error fetching UI studio projects:', err.message);
    res.status(500).json({ error: 'Database query failed.' });
  }
});

// @route   POST /api/ui-studio/projects
// @desc    Save UI Studio project to MongoDB Atlas
router.post('/projects', async (req, res) => {
  try {
    const { title, prompt, theme, screens } = req.body;
    const project = await UIStudioProject.create({
      title: title || 'Untitled UI Studio Project',
      prompt: prompt || 'Custom UI Flow',
      theme,
      screens
    });
    res.json(project);
  } catch (err) {
    console.error('Error saving UI studio project:', err.message);
    res.status(500).json({ error: 'Failed to save project.' });
  }
});

module.exports = router;
