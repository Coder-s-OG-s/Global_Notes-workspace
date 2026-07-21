/**
 * uiStudio.js — AI Multi-Page UI Studio Client Application
 */

let zoomLevel = 1.0;
let currentProject = null;
let selectedTheme = {
  name: 'vibrant-neon',
  primaryColor: '#FF4F00',
  secondaryColor: '#8B5CF6',
  bgColor: '#09090B',
  surfaceColor: '#18181B',
  textColor: '#FFFFFF'
};

document.addEventListener('DOMContentLoaded', () => {
  initStudioCanvas();
  initSidebarControls();
  initExportModal();

  // Load initial demo project flow
  generateUIFlow('SaaS Product Flow with Landing, Authentication & Dashboard');
});

/**
 * Canvas Viewport & Zoom Controls
 */
function initStudioCanvas() {
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const zoomLabel = document.getElementById('zoom-level-label');
  const viewport = document.getElementById('canvas-viewport');

  function updateZoom(newZoom) {
    zoomLevel = Math.max(0.5, Math.min(2.0, newZoom));
    viewport.style.transform = `scale(${zoomLevel})`;
    zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
  }

  btnZoomIn?.addEventListener('click', () => updateZoom(zoomLevel + 0.15));
  btnZoomOut?.addEventListener('click', () => updateZoom(zoomLevel - 0.15));
  btnZoomReset?.addEventListener('click', () => updateZoom(1.0));

  // Canvas Mousewheel Zoom
  const canvasStage = document.getElementById('canvas-stage');
  canvasStage?.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      updateZoom(zoomLevel + (e.deltaY < 0 ? 0.1 : -0.1));
    }
  }, { passive: false });
}

/**
 * Sidebar Prompt, PRD Uploader & Theme Picker
 */
function initSidebarControls() {
  const btnGenerate = document.getElementById('btn-generate-flow');
  const promptInput = document.getElementById('ui-prompt-input');
  const prdFileInput = document.getElementById('prd-file-input');
  const uploadFilename = document.getElementById('upload-filename');
  const themeOptions = document.querySelectorAll('.theme-option');

  // Theme selection
  themeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      themeOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');

      const themeName = opt.dataset.theme;
      if (themeName === 'vibrant-neon') {
        selectedTheme.primaryColor = '#FF4F00';
        selectedTheme.secondaryColor = '#8B5CF6';
      } else if (themeName === 'obsidian-purple') {
        selectedTheme.primaryColor = '#8B5CF6';
        selectedTheme.secondaryColor = '#EC4899';
      } else if (themeName === 'emerald-pro') {
        selectedTheme.primaryColor = '#10B981';
        selectedTheme.secondaryColor = '#3B82F6';
      } else if (themeName === 'cyberpunk-gold') {
        selectedTheme.primaryColor = '#F59E0B';
        selectedTheme.secondaryColor = '#EF4444';
      }

      // Re-apply theme to existing screens
      if (currentProject && currentProject.screens) {
        renderScreens(currentProject.screens);
      }
    });
  });

  // Prompt Submit CTA
  btnGenerate?.addEventListener('click', () => {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      alert('Please enter a prompt or upload a PRD file.');
      return;
    }
    generateUIFlow(prompt);
  });

  // PRD File Upload Listener
  prdFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadFilename.textContent = `📄 ${file.name}`;
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target.result;
      parsePRDFile(fileContent, file.name);
    };
    reader.readAsText(file);
  });
}

/**
 * Call Server API to generate screens
 */
async function generateUIFlow(prompt) {
  const btnGenerate = document.getElementById('btn-generate-flow');
  if (btnGenerate) btnGenerate.innerHTML = '<span>⏳ Generating UI Flow...</span>';

  try {
    const response = await fetch('/api/ui-studio/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, theme: selectedTheme })
    });

    if (!response.ok) throw new Error('API request failed.');

    const data = await response.json();
    currentProject = data;
    renderScreens(data.screens);

    // Save project to MongoDB in background
    saveProjectToDatabase(data);
  } catch (error) {
    console.warn('Falling back to local AI studio engine:', error);
    // Client-side fallback if server offline
    const fallbackScreens = getFallbackScreens(prompt, selectedTheme);
    currentProject = { title: prompt, screens: fallbackScreens };
    renderScreens(fallbackScreens);
  } finally {
    if (btnGenerate) btnGenerate.innerHTML = '<span>✨ Generate Multi-Page UI Flow</span>';
  }
}

/**
 * Parse PRD File
 */
async function parsePRDFile(fileContent, fileName) {
  try {
    const response = await fetch('/api/ui-studio/parse-prd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileContent, fileName })
    });

    if (response.ok) {
      const data = await response.json();
      currentProject = data;
      renderScreens(data.screens);
    }
  } catch (error) {
    console.error('Failed to parse PRD file:', error);
  }
}

/**
 * Save project to MongoDB Atlas
 */
async function saveProjectToDatabase(projectData) {
  const indicator = document.getElementById('save-status-indicator');
  try {
    const res = await fetch('/api/ui-studio/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });
    if (res.ok && indicator) {
      indicator.textContent = 'Saved to Cloud';
      indicator.style.color = '#10B981';
    }
  } catch (e) {
    if (indicator) {
      indicator.textContent = 'Local Session';
      indicator.style.color = '#F59E0B';
    }
  }
}

/**
 * Render Connected Screen Cards Side-by-Side on Canvas
 */
function renderScreens(screens) {
  const container = document.getElementById('screens-container');
  if (!container) return;
  container.innerHTML = '';

  screens.forEach((screen, index) => {
    const cardNode = document.createElement('div');
    cardNode.className = 'screen-card-node';
    cardNode.id = `screen-card-${index}`;

    cardNode.innerHTML = `
      <div class="screen-card-header">
        <span class="screen-title">
          <span class="screen-number-badge">0${index + 1}</span>
          ${screen.title}
        </span>
        <div class="screen-card-actions">
          <button class="card-action-btn copy-html-btn" title="Copy HTML">📋</button>
          <button class="card-action-btn delete-card-btn" title="Remove Screen">✕</button>
        </div>
      </div>
      <div class="screen-card-tabs">
        <div class="tab-item active" data-tab="preview">Preview</div>
        <div class="tab-item" data-tab="html">HTML</div>
        <div class="tab-item" data-tab="css">CSS</div>
      </div>
      <div class="screen-card-body">
        <iframe id="iframe-${index}" sandbox="allow-scripts allow-same-origin"></iframe>
        <pre class="code-inspector-view inspector-html"></pre>
        <pre class="code-inspector-view inspector-css"></pre>
      </div>
    `;

    container.appendChild(cardNode);

    // Populate iframe live view
    const iframe = cardNode.querySelector(`#iframe-${index}`);
    const htmlInspector = cardNode.querySelector('.inspector-html');
    const cssInspector = cardNode.querySelector('.inspector-css');

    htmlInspector.textContent = screen.html;
    cssInspector.textContent = screen.css;

    const fullDocument = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>${screen.css}</style>
      </head>
      <body>${screen.html}</body>
      </html>
    `;

    iframe.onload = () => {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(fullDocument);
      doc.close();
    };
    iframe.src = 'about:blank';

    // Tab switching
    const tabs = cardNode.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        iframe.style.display = target === 'preview' ? 'block' : 'none';
        htmlInspector.classList.toggle('active', target === 'html');
        cssInspector.classList.toggle('active', target === 'css');
      });
    });

    // Copy HTML button
    cardNode.querySelector('.copy-html-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(screen.html);
      alert(`Copied ${screen.title} HTML to clipboard!`);
    });

    // Delete screen card
    cardNode.querySelector('.delete-card-btn')?.addEventListener('click', () => {
      cardNode.remove();
    });
  });
}

/**
 * Export Modal Functionality
 */
function initExportModal() {
  const modal = document.getElementById('export-modal');
  const btnExport = document.getElementById('btn-export-project');
  const btnClose = document.getElementById('btn-close-modal');
  const btnCopy = document.getElementById('btn-copy-export');
  const btnDownload = document.getElementById('btn-download-export');
  const exportOutput = document.getElementById('code-export-output');
  const codeTabs = document.querySelectorAll('.code-tab');

  btnExport?.addEventListener('click', () => {
    if (!currentProject || !currentProject.screens) return;
    modal?.classList.add('active');
    updateExportOutput('html');
  });

  btnClose?.addEventListener('click', () => modal?.classList.remove('active'));

  codeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      codeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.target;
      updateExportOutput(target === 'code-export-html' ? 'html' : 'css');
    });
  });

  function updateExportOutput(type) {
    if (!currentProject || !currentProject.screens) return;
    if (type === 'html') {
      const combinedHTML = currentProject.screens.map(s => `<!-- ================= ${s.title} ================= -->\n${s.html}`).join('\n\n');
      exportOutput.value = combinedHTML;
    } else {
      exportOutput.value = currentProject.screens[0]?.css || '/* No CSS defined */';
    }
  }

  btnCopy?.addEventListener('click', () => {
    navigator.clipboard.writeText(exportOutput.value);
    alert('Export code copied to clipboard!');
  });

  btnDownload?.addEventListener('click', () => {
    const blob = new Blob([exportOutput.value], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject?.title || 'ui-studio-prototype'}.html`;
    a.click();
  });
}

/**
 * Dynamic Client-Side UI Engine (Tailors full designs to domain keywords)
 */
function getFallbackScreens(prompt, theme) {
  const primary = theme.primaryColor || '#FF4F00';
  const secondary = theme.secondaryColor || '#8B5CF6';
  const lower = (prompt || '').toLowerCase();
  
  const isGym = lower.includes('gym') || lower.includes('fitness') || lower.includes('workout') || lower.includes('exercise');
  const isCrypto = lower.includes('crypto') || lower.includes('wallet') || lower.includes('trading') || lower.includes('coin');
  const isShop = lower.includes('shop') || lower.includes('store') || lower.includes('cart') || lower.includes('e-commerce') || lower.includes('product');
  const isFood = lower.includes('food') || lower.includes('restaurant') || lower.includes('recipe') || lower.includes('meal');

  const sharedCSS = `
    :root { --primary: ${primary}; --secondary: ${secondary}; --bg: #09090B; --surface: #18181B; --text: #FFF; --border: rgba(255,255,255,0.1); }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Outfit', -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 0; line-height: 1.5; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border); }
    .brand { font-size: 1.25rem; font-weight: 900; color: var(--primary); }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; border: none; text-decoration: none; font-size: 0.85rem; }
    .btn-primary { background: var(--primary); color: #FFF; }
    .btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 20px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .val { font-size: 1.8rem; font-weight: 900; color: var(--primary); margin-top: 4px; }
    input, select { width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; color: var(--text); margin-bottom: 12px; font-family: inherit; font-size: 0.88rem; }
  `;

  if (isGym) {
    return [
      {
        id: 's1',
        title: 'FitPulse — Gym & Fitness Hero',
        html: `
          <header class="header container">
            <div class="brand">💪 FitPulse Gym</div>
            <a href="#" class="btn btn-primary">Join Now</a>
          </header>
          <main class="container" style="text-align: center; padding-top: 32px;">
            <span style="background: rgba(255,79,0,0.15); color: var(--primary); padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.75rem;">AI GYM PLATFORM</span>
            <h1 style="font-size: 2.2rem; margin: 12px 0; font-weight: 900;">Push Beyond Your Limits</h1>
            <p style="opacity: 0.8; max-width: 500px; margin: 0 auto 20px auto;">AI-powered workout routines, muscle rep tracking, and personalized bodybuilding macros.</p>
            <div style="display: flex; justify-content: center; gap: 10px;">
              <a href="#" class="btn btn-primary">Start Workout ➔</a>
              <a href="#" class="btn btn-secondary">Explore Routines</a>
            </div>
            <div class="grid" style="text-align: left;">
              <div class="card">
                <h3 style="color: var(--primary); margin-bottom: 4px;">🏋️ Heavy Push/Pull/Legs</h3>
                <p style="font-size: 0.8rem; opacity: 0.75;">Progressive overload tracking for bench, squat, and deadlift.</p>
              </div>
              <div class="card">
                <h3 style="color: var(--secondary); margin-bottom: 4px;">🥗 Macro Meal Plans</h3>
                <p style="font-size: 0.8rem; opacity: 0.75;">High-protein diet calculator tailored to bodyweight goals.</p>
              </div>
            </div>
          </main>
        `,
        css: sharedCSS
      },
      {
        id: 's2',
        title: 'Gym Member Workout Selection',
        html: `
          <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div class="card" style="width: 100%; max-width: 380px; text-align: center;">
              <div class="brand" style="margin-bottom: 8px;">💪 Member Portal</div>
              <h2 style="font-size: 1.2rem; font-weight: 800;">Log Today's Gym Session</h2>
              <p style="font-size: 0.78rem; opacity: 0.7; margin-bottom: 16px;">Select your training program</p>
              <form style="text-align: left;">
                <label style="font-size: 0.75rem; font-weight: 700;">Select Routine</label>
                <select>
                  <option>Chest & Triceps Hypertrophy</option>
                  <option>Back & Biceps Heavy Pull</option>
                  <option>Quads & Calves Leg Day</option>
                  <option>HIIT Conditioning & Core</option>
                </select>
                <label style="font-size: 0.75rem; font-weight: 700;">Target Training Duration</label>
                <input type="text" value="60 Minutes">
                <button type="button" class="btn btn-primary" style="width: 100%; margin-top: 6px;">Begin Workout Session ➔</button>
              </form>
            </div>
          </div>
        `,
        css: sharedCSS
      },
      {
        id: 's3',
        title: 'Gym Metrics & Log Dashboard',
        html: `
          <div class="container">
            <h1 style="font-size: 1.6rem; font-weight: 900;">Fitness Dashboard</h1>
            <p style="font-size: 0.8rem; opacity: 0.7; margin-bottom: 16px;">Personal Bests & Muscle Recovery Overview</p>
            <div class="grid">
              <div class="card">
                <span style="font-size: 0.72rem; opacity: 0.6;">BENCH PRESS PR</span>
                <div class="val">245 lbs</div>
              </div>
              <div class="card">
                <span style="font-size: 0.72rem; opacity: 0.6;">SQUAT PR</span>
                <div class="val" style="color: var(--secondary);">315 lbs</div>
              </div>
              <div class="card">
                <span style="font-size: 0.72rem; opacity: 0.6;">WEEKLY VOLUME</span>
                <div class="val" style="color: #10B981;">42.5k lbs</div>
              </div>
            </div>
          </div>
        `,
        css: sharedCSS
      }
    ];
  }

  // Fallback SaaS/App Template
  return [
    {
      id: 's1',
      title: `${prompt} — Hero Presentation`,
      html: `
        <header class="header container">
          <div class="brand">⚡ ${prompt.substring(0, 15)}</div>
          <a href="#" class="btn btn-primary">Get Started</a>
        </header>
        <main class="container" style="text-align: center; padding-top: 40px;">
          <h1 style="font-size: 2.2rem; margin: 12px 0; font-weight: 900;">${prompt}</h1>
          <p style="opacity: 0.8; max-width: 520px; margin: 0 auto 20px auto;">Connected multi-page application prototype generated with unified design tokens.</p>
          <a href="#" class="btn btn-primary">Launch Experience ➔</a>
        </main>
      `,
      css: sharedCSS
    },
    {
      id: 's2',
      title: 'User Access Portal',
      html: `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div class="card" style="width: 100%; max-width: 360px; text-align: center;">
            <div class="brand" style="margin-bottom: 10px;">⚡ Account Portal</div>
            <input type="email" placeholder="Email Address">
            <input type="password" value="••••••••••••">
            <button class="btn btn-primary" style="width: 100%;">Continue to Console ➔</button>
          </div>
        </div>
      `,
      css: sharedCSS
    },
    {
      id: 's3',
      title: 'Console Dashboard',
      html: `
        <div class="container">
          <h1 style="font-size: 1.5rem; font-weight: 900;">App Metrics Console</h1>
          <div class="grid">
            <div class="card">
              <span style="font-size: 0.72rem; opacity: 0.6;">ACTIVE USERS</span>
              <div class="val">1,840</div>
            </div>
            <div class="card">
              <span style="font-size: 0.72rem; opacity: 0.6;">SYSTEM STATUS</span>
              <div class="val" style="color: #10B981;">Operational</div>
            </div>
          </div>
        </div>
      `,
      css: sharedCSS
    }
  ];
}
