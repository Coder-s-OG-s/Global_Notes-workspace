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
 * Client-side Fallback Screens Generator
 */
function getFallbackScreens(prompt, theme) {
  const primary = theme.primaryColor || '#FF4F00';
  const sharedCSS = `
    :root { --primary: ${primary}; --bg: #09090B; --surface: #18181B; --text: #FFF; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Outfit', sans-serif; background: var(--bg); color: var(--text); padding: 24px; }
    .card { background: var(--surface); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; }
    .btn { background: var(--primary); color: #FFF; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; }
  `;

  return [
    {
      id: 's1',
      title: 'Landing Page',
      html: `<div class="card" style="text-align: center;">
        <span style="color: var(--primary); font-weight: 800;">STITCH UI</span>
        <h1 style="margin: 16px 0;">${prompt}</h1>
        <button class="btn">Explore Prototype ➔</button>
      </div>`,
      css: sharedCSS
    },
    {
      id: 's2',
      title: 'Authentication',
      html: `<div class="card" style="max-width: 320px; margin: 0 auto; text-align: center;">
        <h2>Sign In</h2>
        <input type="email" placeholder="Email" style="width:100%; padding:10px; margin: 12px 0; background: #000; border: 1px solid #333; color: #fff; border-radius: 6px;">
        <button class="btn" style="width: 100%;">Continue</button>
      </div>`,
      css: sharedCSS
    },
    {
      id: 's3',
      title: 'Dashboard Console',
      html: `<div class="card">
        <h2>System Dashboard</h2>
        <p style="opacity: 0.7; margin: 8px 0 16px 0;">Connected multi-page flow active.</p>
        <button class="btn">+ Add Metric Node</button>
      </div>`,
      css: sharedCSS
    }
  ];
}
