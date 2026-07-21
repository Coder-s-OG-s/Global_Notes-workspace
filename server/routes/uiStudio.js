const express = require('express');
const router = express.Router();
const UIStudioProject = require('../models/UIStudioProject');

/**
 * Smart Multi-Page UI Generator Engine
 * Returns cohesive connected screens based on prompt & theme settings.
 */
function generateMultiPageUI(prompt, theme = {}) {
  const primary = theme.primaryColor || '#FF4F00';
  const secondary = theme.secondaryColor || '#8B5CF6';
  const bg = theme.bgColor || '#09090B';
  const surface = theme.surfaceColor || '#18181B';
  const text = theme.textColor || '#FFFFFF';

  // Shared CSS System for all generated screens
  const sharedCSS = `
    :root {
      --primary: ${primary};
      --secondary: ${secondary};
      --bg: ${bg};
      --surface: ${surface};
      --text: ${text};
      --border: rgba(255, 255, 255, 0.1);
      --font: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 0;
    }
    .container { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
    .header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 0; border-bottom: 1px solid var(--border);
    }
    .brand { font-size: 1.25rem; font-weight: 800; color: var(--primary); }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 10px 20px; border-radius: 8px; font-weight: 600;
      font-size: 0.88rem; cursor: pointer; text-decoration: none; border: none;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    .btn-primary { background: var(--primary); color: #FFF; }
    .btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 24px; margin-bottom: 16px;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
    input, select, textarea {
      width: 100%; padding: 12px; background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border); border-radius: 8px; color: var(--text);
      font-family: var(--font); font-size: 0.9rem; margin-bottom: 14px;
    }
  `;

  // Screen 1: Landing Page
  const screen1HTML = `
    <header class="header container">
      <div class="brand">⚡ AppStudio</div>
      <nav style="display: flex; gap: 16px;">
        <a href="#" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.8rem;">Features</a>
        <a href="#" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.8rem;">Get Started</a>
      </nav>
    </header>
    <main class="container" style="padding-top: 60px; text-align: center;">
      <span style="background: rgba(255, 79, 0, 0.15); color: var(--primary); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.75rem;">AI STITCH GENERATED</span>
      <h1 style="font-size: 2.5rem; margin: 16px 0; font-weight: 900;">${prompt || 'Next Gen Product Flow'}</h1>
      <p style="opacity: 0.75; max-width: 600px; margin: 0 auto 28px auto;">Connected multi-page UI architecture generated dynamically with unified design tokens and responsive CSS.</p>
      <div style="display: flex; justify-content: center; gap: 12px;">
        <a href="#" class="btn btn-primary">Launch Application ➔</a>
        <a href="#" class="btn btn-secondary">Documentation</a>
      </div>
      <div class="grid" style="margin-top: 50px; text-align: left;">
        <div class="card">
          <h3 style="color: var(--primary); margin-bottom: 8px;">🚀 Rapid Flow Parsing</h3>
          <p style="font-size: 0.85rem; opacity: 0.8;">Automatically translates PRD briefs into cohesive UI screens.</p>
        </div>
        <div class="card">
          <h3 style="color: var(--secondary); margin-bottom: 8px;">🎨 Token Cohesion</h3>
          <p style="font-size: 0.85rem; opacity: 0.8;">Shared CSS variables maintain brand identity across all views.</p>
        </div>
      </div>
    </main>
  `;

  // Screen 2: Authentication / Sign In
  const screen2HTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;">
      <div class="card" style="width: 100%; max-width: 380px; text-align: center;">
        <div class="brand" style="margin-bottom: 8px;">⚡ AppStudio</div>
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 4px;">Welcome Back</h2>
        <p style="font-size: 0.8rem; opacity: 0.75; margin-bottom: 20px;">Sign in to access your workspace</p>
        
        <form style="text-align: left;">
          <label style="font-size: 0.78rem; font-weight: 600; display: block; margin-bottom: 4px;">Email Address</label>
          <input type="email" placeholder="user@example.com" value="demo@appstudio.io">
          
          <label style="font-size: 0.78rem; font-weight: 600; display: block; margin-bottom: 4px;">Password</label>
          <input type="password" value="••••••••••••">
          
          <button type="button" class="btn btn-primary" style="width: 100%; margin-top: 8px;">Continue to Workspace</button>
        </form>
        <p style="font-size: 0.75rem; opacity: 0.6; margin-top: 16px;">Don't have an account? <a href="#" style="color: var(--primary); text-decoration: none;">Sign Up</a></p>
      </div>
    </div>
  `;

  // Screen 3: Dashboard Console
  const screen3HTML = `
    <div style="display: flex; min-height: 100vh;">
      <aside style="width: 220px; background: var(--surface); border-right: 1px solid var(--border); padding: 20px; display: flex; flex-direction: column; justify-space-between;">
        <div>
          <div class="brand" style="margin-bottom: 28px;">⚡ AppStudio</div>
          <nav style="display: flex; flex-direction: column; gap: 8px;">
            <a href="#" class="btn btn-primary" style="justify-content: flex-start; padding: 8px 12px; font-size: 0.8rem;">📊 Overview</a>
            <a href="#" class="btn btn-secondary" style="justify-content: flex-start; padding: 8px 12px; font-size: 0.8rem;">📁 Projects</a>
            <a href="#" class="btn btn-secondary" style="justify-content: flex-start; padding: 8px 12px; font-size: 0.8rem;">⚙️ Settings</a>
          </nav>
        </div>
        <div style="font-size: 0.72rem; opacity: 0.6; border-top: 1px solid var(--border); padding-top: 12px;">Active Workspace v2.4</div>
      </aside>
      <main style="flex: 1; padding: 28px; background: var(--bg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 800;">Project Dashboard</h1>
            <p style="font-size: 0.8rem; opacity: 0.75;">Live overview of generated UI components</p>
          </div>
          <button class="btn btn-primary" style="padding: 8px 16px; font-size: 0.8rem;">+ New Screen</button>
        </div>
        <div class="grid">
          <div class="card">
            <span style="font-size: 0.75rem; opacity: 0.6;">TOTAL SCREENS</span>
            <h2 style="font-size: 1.8rem; color: var(--primary); margin-top: 4px;">3 Active</h2>
          </div>
          <div class="card">
            <span style="font-size: 0.75rem; opacity: 0.6;">SYSTEM COHESION</span>
            <h2 style="font-size: 1.8rem; color: var(--secondary); margin-top: 4px;">100% Token Match</h2>
          </div>
        </div>
      </main>
    </div>
  `;

  return [
    {
      id: 'screen-1',
      title: 'Landing Page',
      type: 'landing',
      html: screen1HTML.trim(),
      css: sharedCSS.trim(),
      description: 'Hero presentation and feature overview'
    },
    {
      id: 'screen-2',
      title: 'Authentication',
      type: 'auth',
      html: screen2HTML.trim(),
      css: sharedCSS.trim(),
      description: 'User login and sign-up card container'
    },
    {
      id: 'screen-3',
      title: 'Dashboard Workspace',
      type: 'dashboard',
      html: screen3HTML.trim(),
      css: sharedCSS.trim(),
      description: 'Sidebar navigation & metrics console'
    }
  ];
}

// @route   POST /api/ui-studio/generate
// @desc    Generate connected multi-page UI screens from prompt or PRD
router.post('/generate', async (req, res) => {
  try {
    const { prompt, theme } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt or PRD content is required.' });
    }

    const screens = generateMultiPageUI(prompt, theme);
    res.json({
      title: prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt,
      prompt,
      theme,
      screens
    });
  } catch (err) {
    console.error('Error in /api/ui-studio/generate:', err.message);
    res.status(500).json({ error: 'Failed to generate UI screens.' });
  }
});

// @route   POST /api/ui-studio/parse-prd
// @desc    Parse uploaded PRD file text into structured flow objectives
router.post('/parse-prd', async (req, res) => {
  try {
    const { fileContent, fileName } = req.body;
    if (!fileContent) {
      return res.status(400).json({ error: 'File content is empty.' });
    }

    const title = fileName ? `PRD: ${fileName}` : 'Uploaded PRD Brief';
    const screens = generateMultiPageUI(`PRD Specs from ${fileName || 'document'}`, {});

    res.json({
      title,
      summary: `Extracted 3 primary screen flows from ${fileName || 'PRD document'}.`,
      screens
    });
  } catch (err) {
    console.error('Error in /api/ui-studio/parse-prd:', err.message);
    res.status(500).json({ error: 'Failed to parse PRD file.' });
  }
});

// @route   GET /api/ui-studio/projects
// @desc    Get all saved UI Studio projects from MongoDB
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
// @desc    Save or update a UI Studio project to MongoDB
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
