const express = require('express');
const router = express.Router();
const UIStudioProject = require('../models/UIStudioProject');

/**
 * Domain-Tailored Smart UI Engine (Fallback if AI response takes too long)
 */
function getDomainTailoredScreens(prompt, theme = {}) {
  const primary = theme.primaryColor || '#FF4F00';
  const secondary = theme.secondaryColor || '#8B5CF6';
  const bg = theme.bgColor || '#09090B';
  const surface = theme.surfaceColor || '#18181B';
  const text = theme.textColor || '#FFFFFF';

  const lower = (prompt || '').toLowerCase();
  const isGym = lower.includes('gym') || lower.includes('fitness') || lower.includes('workout');
  const isCrypto = lower.includes('crypto') || lower.includes('wallet') || lower.includes('trading');
  const isEcommerce = lower.includes('shop') || lower.includes('store') || lower.includes('cart') || lower.includes('e-commerce');

  const sharedCSS = `
    :root {
      --primary: ${primary};
      --secondary: ${secondary};
      --bg: ${bg};
      --surface: ${surface};
      --text: ${text};
      --border: rgba(255, 255, 255, 0.1);
      --font: 'Outfit', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font); background: var(--bg); color: var(--text); padding: 0; line-height: 1.5; }
    .container { max-width: 1000px; margin: 0 auto; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border); }
    .brand { font-size: 1.2rem; font-weight: 900; color: var(--primary); }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; border: none; text-decoration: none; }
    .btn-primary { background: var(--primary); color: #FFF; }
    .btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 24px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .stat-val { font-size: 1.8rem; font-weight: 900; color: var(--primary); margin-top: 4px; }
    input { width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; color: var(--text); margin-bottom: 12px; font-family: var(--font); }
  `;

  if (isGym) {
    return [
      {
        id: 'screen-1',
        title: 'FitPulse — Gym Landing Page',
        type: 'landing',
        html: `
          <header class="header container">
            <div class="brand">💪 FitPulse Studio</div>
            <nav style="display:flex; gap:12px;">
              <a href="#" class="btn btn-secondary" style="padding:6px 12px; font-size:0.8rem;">Workouts</a>
              <a href="#" class="btn btn-primary" style="padding:6px 12px; font-size:0.8rem;">Join Gym</a>
            </nav>
          </header>
          <main class="container" style="text-align:center; padding-top:40px;">
            <span style="background:rgba(255,79,0,0.15); color:var(--primary); padding:4px 12px; border-radius:20px; font-weight:800; font-size:0.75rem;">PREMIUM FITNESS APP</span>
            <h1 style="font-size:2.4rem; margin:14px 0; font-weight:900;">Transform Your Body & Mind</h1>
            <p style="opacity:0.8; max-width:560px; margin:0 auto 24px auto;">Personalized AI workout plans, real-time rep tracking, and certified trainer coaching in one fitness app.</p>
            <div style="display:flex; justify-content:center; gap:12px;">
              <a href="#" class="btn btn-primary">Start 7-Day Free Trial</a>
              <a href="#" class="btn btn-secondary">View Routines</a>
            </div>
            <div class="grid" style="text-align:left;">
              <div class="card">
                <h3 style="color:var(--primary); margin-bottom:6px;">🏋️ Hypertrophy & Strength</h3>
                <p style="font-size:0.82rem; opacity:0.75;">Progressive overload programs designed by elite powerlifters.</p>
              </div>
              <div class="card">
                <h3 style="color:var(--secondary); margin-bottom:6px;">🥗 Macro Nutrition Engine</h3>
                <p style="font-size:0.82rem; opacity:0.75;">Calorie counting & high-protein meal plans for lean muscle growth.</p>
              </div>
            </div>
          </main>
        `,
        css: sharedCSS,
        description: 'Gym app presentation landing page'
      },
      {
        id: 'screen-2',
        title: 'Member Login & Workout Goal',
        type: 'auth',
        html: `
          <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px;">
            <div class="card" style="width:100%; max-width:380px; text-align:center;">
              <div class="brand" style="margin-bottom:10px;">💪 FitPulse Member</div>
              <h2 style="font-size:1.3rem; font-weight:800;">Welcome Back, Athlete</h2>
              <p style="font-size:0.8rem; opacity:0.7; margin-bottom:20px;">Log in to log today's training session</p>
              <form style="text-align:left;">
                <label style="font-size:0.78rem; font-weight:700;">Email or Member ID</label>
                <input type="email" value="alex.runner@fitpulse.io">
                <label style="font-size:0.78rem; font-weight:700;">Select Today's Focus</label>
                <select style="width:100%; padding:12px; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:8px; color:var(--text); margin-bottom:14px; font-family:var(--font);">
                  <option>Chest & Triceps Hypertrophy</option>
                  <option>Back & Biceps Heavy Pull</option>
                  <option>Quads & Glutes Leg Day</option>
                  <option>HIIT Cardio & Core</option>
                </select>
                <button type="button" class="btn btn-primary" style="width:100%; margin-top:6px;">Start Workout Session ➔</button>
              </form>
            </div>
          </div>
        `,
        css: sharedCSS,
        description: 'Gym member login and workout selection'
      },
      {
        id: 'screen-3',
        title: 'Gym Workout & Muscle Dashboard',
        type: 'dashboard',
        html: `
          <div style="display:flex; min-height:100vh;">
            <aside style="width:200px; background:var(--surface); border-right:1px solid var(--border); padding:20px;">
              <div class="brand" style="margin-bottom:24px;">💪 FitPulse</div>
              <nav style="display:flex; flex-direction:column; gap:8px;">
                <a href="#" class="btn btn-primary" style="justify-content:flex-start; font-size:0.8rem;">📊 Log Book</a>
                <a href="#" class="btn btn-secondary" style="justify-content:flex-start; font-size:0.8rem;">🏋️ Exercises</a>
                <a href="#" class="btn btn-secondary" style="justify-content:flex-start; font-size:0.8rem;">🥗 Macros</a>
              </nav>
            </aside>
            <main style="flex:1; padding:24px;">
              <h1 style="font-size:1.6rem; font-weight:900;">Gym Fitness Dashboard</h1>
              <p style="font-size:0.82rem; opacity:0.75; margin-bottom:16px;">Weekly Training Volume & Personal Bests</p>
              <div class="grid">
                <div class="card">
                  <span style="font-size:0.75rem; opacity:0.6;">BENCH PRESS MAX</span>
                  <div class="stat-val">245 lbs</div>
                </div>
                <div class="card">
                  <span style="font-size:0.75rem; opacity:0.6;">SQUAT MAX</span>
                  <div class="stat-val" style="color:var(--secondary);">315 lbs</div>
                </div>
                <div class="card">
                  <span style="font-size:0.75rem; opacity:0.6;">WEEKLY VOLUME</span>
                  <div class="stat-val" style="color:#10B981;">42,500 lbs</div>
                </div>
              </div>
            </main>
          </div>
        `,
        css: sharedCSS,
        description: 'Gym metrics and workout log console'
      }
    ];
  }

  // Default SaaS/App Flow
  return [
    {
      id: 'screen-1',
      title: `${prompt.substring(0, 20)} — Landing Page`,
      type: 'landing',
      html: `
        <header class="header container">
          <div class="brand">⚡ ${prompt.substring(0, 15)} Studio</div>
          <a href="#" class="btn btn-primary" style="padding:6px 14px; font-size:0.8rem;">Get Started</a>
        </header>
        <main class="container" style="text-align:center; padding-top:40px;">
          <h1 style="font-size:2.2rem; margin:14px 0; font-weight:900;">${prompt}</h1>
          <p style="opacity:0.8; max-width:540px; margin:0 auto 24px auto;">Multi-screen application flow generated dynamically with design system cohesion.</p>
          <a href="#" class="btn btn-primary">Launch Application ➔</a>
        </main>
      `,
      css: sharedCSS,
      description: 'Landing presentation view'
    },
    {
      id: 'screen-2',
      title: 'Authentication & Access',
      type: 'auth',
      html: `
        <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px;">
          <div class="card" style="width:100%; max-width:360px; text-align:center;">
            <div class="brand" style="margin-bottom:12px;">⚡ Sign In</div>
            <input type="email" placeholder="user@domain.com">
            <input type="password" value="••••••••••••">
            <button class="btn btn-primary" style="width:100%; margin-top:8px;">Continue ➔</button>
          </div>
        </div>
      `,
      css: sharedCSS,
      description: 'Sign in portal card'
    },
    {
      id: 'screen-3',
      title: 'Application Dashboard',
      type: 'dashboard',
      html: `
        <div class="container" style="padding-top:24px;">
          <h1 style="font-size:1.6rem; font-weight:900;">Console Dashboard</h1>
          <div class="grid">
            <div class="card">
              <span style="font-size:0.75rem; opacity:0.6;">ACTIVE USERS</span>
              <div class="stat-val">1,420</div>
            </div>
            <div class="card">
              <span style="font-size:0.75rem; opacity:0.6;">SYSTEM HEALTH</span>
              <div class="stat-val" style="color:#10B981;">99.9%</div>
            </div>
          </div>
        </div>
      `,
      css: sharedCSS,
      description: 'Application control panel'
    }
  ];
}

/**
 * Live Google Gemini 2.5 Flash AI UI Generator
 */
async function callGeminiAI(prompt, theme = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY missing, using domain generator.');
    return { title: prompt, screens: getDomainTailoredScreens(prompt, theme) };
  }

  const primary = theme.primaryColor || '#FF4F00';
  const secondary = theme.secondaryColor || '#8B5CF6';
  const bg = theme.bgColor || '#09090B';
  const surface = theme.surfaceColor || '#18181B';
  const text = theme.textColor || '#FFFFFF';

  const systemInstruction = `
You are a Lead UI/UX Designer.
Generate a custom, responsive 3-screen web application prototype tailored strictly to the user's prompt: "${prompt}".

Requirements for HTML/CSS:
- Primary Accent: ${primary}
- Secondary Color: ${secondary}
- Background: ${bg}
- Surface Card: ${surface}
- Text: ${text}

If the prompt is about GYM/FITNESS, build gym workout trackers, exercise logs, member portals!
If the prompt is about E-COMMERCE, build product storefronts, shopping carts, checkout forms!
If the prompt is about CRYPTO, build live trading charts, coin balances, swap forms!

Return ONLY valid JSON matching this exact structure:
{
  "title": "Short Application Name",
  "screens": [
    {
      "id": "screen-1",
      "title": "Screen 1 Title",
      "type": "landing",
      "html": "<full HTML code>",
      "css": "<full CSS stylesheet>",
      "description": "Short summary"
    },
    {
      "id": "screen-2",
      "title": "Screen 2 Title",
      "type": "auth",
      "html": "<full HTML code>",
      "css": "<full CSS stylesheet>",
      "description": "Short summary"
    },
    {
      "id": "screen-3",
      "title": "Screen 3 Title",
      "type": "dashboard",
      "html": "<full HTML code>",
      "css": "<full CSS stylesheet>",
      "description": "Short summary"
    }
  ]
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout limit for fast UX

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemInstruction }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemini API HTTP Error ${response.status}`);
    }

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    rawText = rawText.trim();
    if (rawText.startsWith('```json')) rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (rawText.startsWith('```')) rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');

    const parsed = JSON.parse(rawText);
    if (parsed.screens && parsed.screens.length > 0) {
      return parsed;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Gemini API call timed out or erred, returning domain tailored screens:', err.message);
  }

  return { title: prompt, screens: getDomainTailoredScreens(prompt, theme) };
}

// @route   POST /api/ui-studio/generate
router.post('/generate', async (req, res) => {
  try {
    const { prompt, theme } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    console.log(`⚡ Generating UI design for prompt: "${prompt}"`);
    const result = await callGeminiAI(prompt, theme);

    res.json({
      title: result.title || prompt.substring(0, 25),
      prompt,
      theme,
      screens: result.screens || []
    });
  } catch (err) {
    console.error('Error in /generate:', err.message);
    const fallback = getDomainTailoredScreens(req.body.prompt || 'App Design', req.body.theme);
    res.json({ title: req.body.prompt, screens: fallback });
  }
});

// @route   POST /api/ui-studio/parse-prd
router.post('/parse-prd', async (req, res) => {
  try {
    const { fileContent, fileName } = req.body;
    const prompt = `PRD ${fileName || 'Spec'}: ${fileContent ? fileContent.substring(0, 1500) : 'App Spec'}`;
    const result = await callGeminiAI(prompt, {});

    res.json({
      title: result.title || `PRD: ${fileName}`,
      summary: `Parsed ${fileName || 'PRD Document'} into multi-page UI designs.`,
      screens: result.screens
    });
  } catch (err) {
    console.error('Error in /parse-prd:', err.message);
    res.status(500).json({ error: 'Failed to parse PRD file.' });
  }
});

// @route   GET /api/ui-studio/projects
router.get('/projects', async (req, res) => {
  try {
    const projects = await UIStudioProject.find().sort({ updatedAt: -1 }).limit(20);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Database query failed.' });
  }
});

// @route   POST /api/ui-studio/projects
router.post('/projects', async (req, res) => {
  try {
    const { title, prompt, theme, screens } = req.body;
    const project = await UIStudioProject.create({
      title: title || 'Untitled UI Project',
      prompt: prompt || 'Custom Flow',
      theme,
      screens
    });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save project.' });
  }
});

module.exports = router;
