import { generateTextWithGemini } from './geminiAPI.js';
import { wireAppsDropdown } from './utilities.js';
import { wireThemeToggle } from './themeManager.js';

document.addEventListener('DOMContentLoaded', () => {
  wireAppsDropdown();
  try { wireThemeToggle(); } catch (e) { console.warn('Theme toggle error:', e); }
  // DOM Elements
  const setApiKeyBtn = document.getElementById('set-api-key-btn');
  const openPasteModalBtn = document.getElementById('open-paste-modal-btn');
  const pasteModal = document.getElementById('paste-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelPasteBtn = document.getElementById('cancel-paste-btn');
  const confirmPasteBtn = document.getElementById('confirm-paste-btn');
  const pasteHtmlTextarea = document.getElementById('paste-html-textarea');

  const previewIframe = document.getElementById('preview-iframe');
  const emptyState = document.getElementById('empty-state');
  const inspectorStatusBadge = document.getElementById('inspector-status-badge');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');

  const selectedElementBadge = document.getElementById('selected-element-badge');
  const targetTagLabel = document.getElementById('target-tag-label');
  const targetIdLabel = document.getElementById('target-id-label');
  const elementCodePreview = document.getElementById('element-code-preview');
  const aiPromptInput = document.getElementById('ai-prompt-input');
  const refineAiBtn = document.getElementById('refine-ai-btn');
  const elementsCountBadge = document.getElementById('elements-count-badge');

  const documentCodeTextarea = document.getElementById('document-code-textarea');
  const exportHtmlBtn = document.getElementById('export-html-btn');
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');

  // Application State
  let currentHTML = '';
  let selectedElement = null;
  let historyStack = [];
  let redoStack = [];

  const STARTER_TEMPLATES = {
    hero: `
<div style="padding: 48px 24px; text-align: center; background: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; border-radius: 16px; margin: 20px; border: 1px solid rgba(59, 130, 246, 0.2);">
  <span data-element-id="node-1" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block;">Next-Gen Workspace</span>
  <h1 data-element-id="node-2" style="font-size: 36px; font-weight: 800; margin: 16px 0; background: linear-gradient(135deg, #ffffff 0%, #38bdf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Build Stunning UI Components with AI</h1>
  <p data-element-id="node-3" style="color: #94a3b8; font-size: 16px; max-width: 500px; margin: 0 auto 24px; line-height: 1.6;">Transform any target HTML component into a modern glassmorphic interface instantly with AI.</p>
  <button data-element-id="node-4" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; border: 1px solid #3b82f6; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; box-shadow: 0 4px 16px rgba(37,99,235,0.4);">Get Started Free</button>
</div>
    `.trim(),

    pricing: `
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 24px; background: #0f172a; font-family: system-ui, sans-serif; border-radius: 16px; margin: 20px; border: 1px solid rgba(59, 130, 246, 0.2);">
  <div data-element-id="node-10" style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; color: #f8fafc;">
    <h3 data-element-id="node-11" style="margin: 0; font-size: 18px; color: #94a3b8;">Starter</h3>
    <div data-element-id="node-12" style="font-size: 32px; font-weight: 800; margin: 12px 0;">$0 <span style="font-size: 14px; color: #64748b;">/mo</span></div>
    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 16px;">Essential note features for solo developers.</p>
    <button data-element-id="node-13" style="width: 100%; background: #334155; color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer;">Start Free</button>
  </div>
  <div data-element-id="node-20" style="background: #1e293b; border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; color: #f8fafc; position: relative;">
    <span data-element-id="node-21" style="background: #3b82f6; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; position: absolute; top: -10px; right: 16px;">POPULAR</span>
    <h3 data-element-id="node-22" style="margin: 0; font-size: 18px; color: #60a5fa;">Pro Plan</h3>
    <div data-element-id="node-23" style="font-size: 32px; font-weight: 800; margin: 12px 0;">$19 <span style="font-size: 14px; color: #64748b;">/mo</span></div>
    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 16px;">Full AI Refiner, PDF Editor & Cross-Note Search.</p>
    <button data-element-id="node-24" style="width: 100%; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; border: 1px solid #3b82f6; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer;">Upgrade Now</button>
  </div>
</div>
    `.trim(),

    card: `
<div data-element-id="node-30" style="max-width: 380px; margin: 24px auto; background: #1e293b; border-radius: 16px; padding: 24px; color: #f8fafc; font-family: system-ui, sans-serif; border: 1px solid rgba(59, 130, 246, 0.2); box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
  <div data-element-id="node-31" style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Analytics Overview</div>
  <h2 data-element-id="node-32" style="margin: 0 0 12px; font-size: 20px;">Active Subscriptions</h2>
  <div data-element-id="node-33" style="font-size: 36px; font-weight: 800; color: #f8fafc;">$48,290 <span style="font-size: 14px; color: #4ade80; font-weight: 600;">+14.2%</span></div>
  <p data-element-id="node-34" style="color: #94a3b8; font-size: 13px; margin: 8px 0 0 0;">Compared to $42,300 last month.</p>
</div>
    `.trim()
  };

  function showLoading(text) {
    loadingText.textContent = text || 'Loading...';
    loadingOverlay.style.display = 'flex';
  }

  function hideLoading() {
    loadingOverlay.style.display = 'none';
  }

  function updateUndoRedoButtons() {
    undoBtn.disabled = historyStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
  }

  function pushState(html) {
    if (currentHTML) {
      historyStack.push(currentHTML);
      redoStack = []; // Clear redo stack on new action
      updateUndoRedoButtons();
    }
    currentHTML = html;
    documentCodeTextarea.value = html;
    try {
      localStorage.setItem('GN_ACTIVE_DESIGN_HTML', html);
    } catch (e) {}
  }

  function prepareHTMLWithInspector(rawHtml) {
    if (!rawHtml) return '';
    
    // Count & auto-tag nodes with data-element-id
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;
    const nodes = tempDiv.querySelectorAll('*');
    if (elementsCountBadge) {
      elementsCountBadge.textContent = `${nodes.length} Nodes`;
    }

    let idIndex = 1;
    nodes.forEach(el => {
      if (!el.getAttribute('data-element-id')) {
        el.setAttribute('data-element-id', `node-${idIndex++}`);
      }
    });

    const bodyContent = tempDiv.innerHTML;
    const bridgeScript = `<script src="/JS/inspector-bridge.js"></script>`;

    if (rawHtml.includes('<!DOCTYPE html>') || rawHtml.includes('<html')) {
      if (!rawHtml.includes('inspector-bridge.js')) {
        if (rawHtml.includes('</body>')) {
          return rawHtml.replace('</body>', `${bridgeScript}</body>`);
        }
        return `${rawHtml}${bridgeScript}`;
      }
      return rawHtml;
    }

    // Wrap raw HTML snippet in standard HTML document shell
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; min-height: 100vh; }
  </style>
</head>
<body>
  ${bodyContent}
  ${bridgeScript}
</body>
</html>`;
  }

  function loadHTMLIntoIframe(html, elementCount) {
    emptyState.style.display = 'none';
    inspectorStatusBadge.style.display = 'block';

    const preparedHTML = prepareHTMLWithInspector(html);
    pushState(preparedHTML);
    previewIframe.srcdoc = preparedHTML;
  }

  // Handle Starter Template Button Clicks
  document.querySelectorAll('.starter-card-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const templateKey = btn.getAttribute('data-template');
      const html = STARTER_TEMPLATES[templateKey];
      if (html) {
        loadHTMLIntoIframe(html);
      }
    });
  });

  // Handle Starter Template Header Select
  const starterSelect = document.getElementById('starter-templates-select');
  if (starterSelect) {
    starterSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      if (key && STARTER_TEMPLATES[key]) {
        loadHTMLIntoIframe(STARTER_TEMPLATES[key]);
      }
      setTimeout(() => {
        starterSelect.selectedIndex = 0;
      }, 100);
    });
  }


  // Handle Viewport Mode Switching
  document.querySelectorAll('.viewport-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.viewport-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const width = btn.getAttribute('data-viewport');
      if (width === '100%') {
        previewIframe.style.width = '100%';
        previewIframe.style.margin = '0';
      } else {
        previewIframe.style.width = width;
        previewIframe.style.margin = '0 auto';
      }
    });
  });


  function transformPresetHTML(presetType, outerHTML, elementId) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = outerHTML.trim();
    const node = tempDiv.firstElementChild || tempDiv;

    if (presetType === 'glassmorphic') {
      const existingStyle = node.getAttribute('style') || '';
      node.setAttribute('style', `${existingStyle}; background: #1e293b !important; border: 1px solid #334155 !important; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important; color: #ffffff !important; border-radius: 12px !important;`.trim());
      node.className = ((node.className || '') + ' bg-slate-800 border border-slate-700 shadow-xl rounded-xl').trim();
    } else if (presetType === 'neon-glow') {
      const existingStyle = node.getAttribute('style') || '';
      node.setAttribute('style', `${existingStyle}; background: #1e293b !important; border: 1px solid #3b82f6 !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important; color: #ffffff !important; border-radius: 12px !important;`.trim());
      node.className = ((node.className || '') + ' bg-slate-800 border border-blue-500 shadow-lg rounded-xl').trim();
    } else if (presetType === 'hover-anim') {
      const existingStyle = node.getAttribute('style') || '';
      node.setAttribute('style', `${existingStyle}; transition: all 0.2s ease !important; cursor: pointer !important;`.trim());
      node.setAttribute('onmouseover', "this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.4)';");
      node.setAttribute('onmouseout', "this.style.transform='translateY(0)';");
      node.className = ((node.className || '') + ' transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl').trim();
    } else if (presetType === 'pill-shape') {
      const existingStyle = node.getAttribute('style') || '';
      node.setAttribute('style', `${existingStyle}; border-radius: 9999px !important; padding: 10px 24px !important; background: #2563eb !important; color: #ffffff !important; font-weight: 600 !important; border: 1px solid #3b82f6 !important;`.trim());
      node.className = ((node.className || '') + ' rounded-full px-6 py-2.5 bg-blue-600 text-white font-semibold shadow').trim();
    }


    node.setAttribute('data-element-id', elementId);
    return node.outerHTML;
  }

  // Handle Quick Preset Chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const promptText = chip.getAttribute('data-prompt');
      const presetType = chip.getAttribute('data-preset');
      aiPromptInput.value = promptText;
      aiPromptInput.focus();

      if (selectedElement && selectedElement.elementId) {
        const transformedHTML = transformPresetHTML(presetType, selectedElement.outerHTML, selectedElement.elementId);
        
        // Push state to undo history
        pushState(currentHTML);

        // Update iframe live preview instantly
        if (previewIframe.contentWindow) {
          previewIframe.contentWindow.postMessage({
            type: 'GN_UPDATE_ELEMENT',
            elementId: selectedElement.elementId,
            newHTML: transformedHTML
          }, '*');
        }

        elementCodePreview.textContent = transformedHTML;
        selectedElement.outerHTML = transformedHTML;
      }
    });
  });



  // Fetch URL via express proxy
  async function fetchDesignFromProxy(payload) {
    showLoading('Proxying design & loading visual DOM tree...');
    try {
      const response = await fetch('/api/proxy/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please restart your Node server (npm start) so all backend routes are loaded.');
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to proxy design');
      }

      loadHTMLIntoIframe(data.html, data.elementCount);
    } catch (err) {
      alert(`Error loading design: ${err.message}\n\nTip: For authenticated apps like Stitch, use 'Paste HTML' for 100% accuracy!`);
    } finally {
      hideLoading();
    }
  }

  // Modal Handlers
  openPasteModalBtn.addEventListener('click', () => {
    pasteModal.classList.remove('hidden');
    pasteHtmlTextarea.focus();
  });

  const closeModal = () => pasteModal.classList.add('hidden');
  closeModalBtn.addEventListener('click', closeModal);
  cancelPasteBtn.addEventListener('click', closeModal);

  confirmPasteBtn.addEventListener('click', () => {
    const rawHtml = pasteHtmlTextarea.value.trim();
    if (rawHtml) {
      loadHTMLIntoIframe(rawHtml);
      closeModal();
      pasteHtmlTextarea.value = '';
    }
  });


  // Listen for iframe element selection & DOM update messages
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'GN_ELEMENT_SELECTED') {
      selectedElement = data;

      // Update UI Panel
      targetTagLabel.textContent = `<${data.selector}>`;
      targetIdLabel.textContent = `[${data.elementId || 'node'}]`;
      elementCodePreview.textContent = data.outerHTML;

      refineAiBtn.disabled = false;
      aiPromptInput.focus();
    } else if (data.type === 'GN_DOM_UPDATED') {
      currentHTML = data.fullHTML;
      documentCodeTextarea.value = currentHTML;
      try {
        localStorage.setItem('GN_ACTIVE_DESIGN_HTML', currentHTML);
      } catch (e) {}
    }
  });

  function transformClientElementLocally(outerHTML, prompt, elementId) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = outerHTML.trim();
    const node = tempDiv.firstElementChild || tempDiv;
    const p = (prompt || '').toLowerCase();

    let style = node.getAttribute('style') || '';

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
      'slate': '#334155'
    };

    let bgSet = false;
    for (const [colorName, hexVal] of Object.entries(colorMap)) {
      if (p.includes(colorName)) {
        if (p.includes('button') || p.includes('bg') || p.includes('background') || p.includes('card') || !bgSet) {
          style += `; background: ${hexVal} !important;`;
          bgSet = true;
        }
        if (p.includes('text') || p.includes('font') || p.includes('color')) {
          style += `; color: ${hexVal} !important;`;
        }
      }
    }

    if (p.includes('text') && (p.includes('visible') || p.includes('change'))) {
      style += `; color: #ffffff !important;`;
    }

    if (p.includes('glassmorphic') || p.includes('glass')) {
      style += `; background: rgba(30, 41, 59, 0.85) !important; backdrop-filter: blur(16px) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; color: #ffffff !important;`;
    }

    if (p.includes('pill') || p.includes('rounded')) {
      style += `; border-radius: 9999px !important; padding: 10px 24px !important;`;
    }

    if (p.includes('border') || p.includes('accent')) {
      style += `; border: 1px solid #3b82f6 !important;`;
    }

    if (p.includes('shadow') || p.includes('elevation')) {
      style += `; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4) !important;`;
    }

    node.setAttribute('style', style);
    node.setAttribute('data-element-id', elementId);
    return node.outerHTML;
  }

  // AI Element Refinement Action (Secure Server Endpoint + Resilient Fallback Engine)
  refineAiBtn.addEventListener('click', async () => {
    if (!selectedElement || !selectedElement.elementId) {
      alert('Please click and select an element in the visual preview first.');
      return;
    }

    const userPrompt = aiPromptInput.value.trim();
    if (!userPrompt) {
      alert('Please enter or select a description of the changes you want to make.');
      return;
    }

    const originalBtnHTML = refineAiBtn.innerHTML;
    refineAiBtn.innerHTML = `<span class="inline-btn-spinner"></span> Refining [${selectedElement.elementId}]...`;
    refineAiBtn.disabled = true;

    let cleanedHTML = '';

    try {
      const response = await fetch('/api/ai/refine-element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetHTML: selectedElement.outerHTML,
          elementId: selectedElement.elementId,
          prompt: userPrompt,
          fullDocContext: currentHTML
        })
      });

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok && data.success && data.html) {
          cleanedHTML = data.html;
        } else {
          console.warn('[UI Designer] Server rate-limited or API quota hit. Applying local transformation fallback...');
          cleanedHTML = transformClientElementLocally(selectedElement.outerHTML, userPrompt, selectedElement.elementId);
        }
      } else {
        cleanedHTML = transformClientElementLocally(selectedElement.outerHTML, userPrompt, selectedElement.elementId);
      }
    } catch (err) {
      console.warn('[UI Designer] Fetch error, executing local transformation fallback:', err);
      cleanedHTML = transformClientElementLocally(selectedElement.outerHTML, userPrompt, selectedElement.elementId);
    } finally {
      if (cleanedHTML) {
        // Push current state to undo history
        pushState(currentHTML);

        // Send update message to iframe
        if (previewIframe.contentWindow) {
          previewIframe.contentWindow.postMessage({
            type: 'GN_UPDATE_ELEMENT',
            elementId: selectedElement.elementId,
            newHTML: cleanedHTML
          }, '*');
        }

        // Update snippet preview
        elementCodePreview.textContent = cleanedHTML;
        aiPromptInput.value = '';
      }

      refineAiBtn.innerHTML = originalBtnHTML;
      refineAiBtn.disabled = false;
    }
  });


  // Export Cleaned HTML
  exportHtmlBtn.addEventListener('click', () => {
    if (!currentHTML) {
      alert('No HTML document loaded to export.');
      return;
    }

    // Clean inspector bridge scripts & attributes for production export
    let cleanHTML = currentHTML
      .replace(/<script src="\/JS\/inspector-bridge\.js"><\/script>/g, '')
      .replace(/\s*data-element-id="node-\d+"/g, '')
      .replace(/\s*class="[^"]*gn-inspector-[^"]*"/g, '');

    const blob = new Blob([cleanHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited-design.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Copy Isolated Element Code Handler
  const copyElementCodeBtn = document.getElementById('copy-element-code-btn');
  if (copyElementCodeBtn) {
    copyElementCodeBtn.addEventListener('click', async () => {
      let rawSnippet = elementCodePreview.textContent || '';
      if (!rawSnippet || rawSnippet.includes('Click an element')) {
        alert('Please select an element in the live visual preview first.');
        return;
      }

      // Clean inspector markers for production clipboard
      const cleanSnippet = rawSnippet
        .replace(/\s*data-element-id="node-\d+"/g, '')
        .replace(/\s*class="[^"]*gn-inspector-[^"]*"/g, '');

      try {
        await navigator.clipboard.writeText(cleanSnippet);
        const origHTML = copyElementCodeBtn.innerHTML;
        copyElementCodeBtn.innerHTML = `✓ Copied!`;
        copyElementCodeBtn.style.color = '#10b981';
        setTimeout(() => {
          copyElementCodeBtn.innerHTML = origHTML;
          copyElementCodeBtn.style.color = '';
        }, 2000);
      } catch (err) {
        alert('Failed to copy code: ' + err.message);
      }
    });
  }

  // Copy Full Document Code Handler
  const copyDocCodeBtn = document.getElementById('copy-doc-code-btn');
  if (copyDocCodeBtn) {
    copyDocCodeBtn.addEventListener('click', async () => {
      if (!currentHTML) {
        alert('No HTML document loaded to copy.');
        return;
      }

      const cleanDocHTML = currentHTML
        .replace(/<script src="\/JS\/inspector-bridge\.js"><\/script>/g, '')
        .replace(/\s*data-element-id="node-\d+"/g, '')
        .replace(/\s*class="[^"]*gn-inspector-[^"]*"/g, '');

      try {
        await navigator.clipboard.writeText(cleanDocHTML);
        const origHTML = copyDocCodeBtn.innerHTML;
        copyDocCodeBtn.innerHTML = `✓ Copied!`;
        copyDocCodeBtn.style.color = '#10b981';
        setTimeout(() => {
          copyDocCodeBtn.innerHTML = origHTML;
          copyDocCodeBtn.style.color = '';
        }, 2000);
      } catch (err) {
        alert('Failed to copy code: ' + err.message);
      }
    });
  }

  // Undo & Redo Handlers
  undoBtn.addEventListener('click', () => {
    if (historyStack.length > 0) {
      redoStack.push(currentHTML);
      const prevHTML = historyStack.pop();
      currentHTML = prevHTML;
      previewIframe.srcdoc = currentHTML;
      documentCodeTextarea.value = currentHTML;
      updateUndoRedoButtons();
    }
  });

  redoBtn.addEventListener('click', () => {
    if (redoStack.length > 0) {
      historyStack.push(currentHTML);
      const nextHTML = redoStack.pop();
      currentHTML = nextHTML;
      previewIframe.srcdoc = currentHTML;
      documentCodeTextarea.value = currentHTML;
      updateUndoRedoButtons();
    }
  });

  // Clear Design Action
  const clearDesignBtn = document.getElementById('clear-design-btn');
  if (clearDesignBtn) {
    clearDesignBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your current design and start fresh?')) {
        try { localStorage.removeItem('GN_ACTIVE_DESIGN_HTML'); } catch (e) {}
        currentHTML = '';
        historyStack = [];
        redoStack = [];
        updateUndoRedoButtons();
        previewIframe.srcdoc = '';
        emptyState.style.display = 'flex';
        inspectorStatusBadge.style.display = 'none';
        elementCodePreview.textContent = '// Click an element in the live preview window to isolate its HTML...';
        documentCodeTextarea.value = '';
      }
    });
  }

  // Live manual code editing sync
  if (documentCodeTextarea) {
    documentCodeTextarea.addEventListener('input', () => {
      const editedHTML = documentCodeTextarea.value;
      currentHTML = editedHTML;
      try { localStorage.setItem('GN_ACTIVE_DESIGN_HTML', editedHTML); } catch (e) {}
      if (previewIframe) {
        previewIframe.srcdoc = prepareHTMLWithInspector(editedHTML);
      }
    });
  }

  // Restore Active Design from LocalStorage on Page Refresh
  try {
    const savedDesign = localStorage.getItem('GN_ACTIVE_DESIGN_HTML');
    if (savedDesign && savedDesign.trim()) {
      console.log('[UI Designer] Automatically restoring active design from local storage after page refresh...');
      loadHTMLIntoIframe(savedDesign);

    }
  } catch (e) {
    console.warn('[UI Designer] Failed to load saved design from local storage:', e);
  }
});
