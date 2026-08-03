import { generateTextWithGemini } from './geminiAPI.js';

document.addEventListener('DOMContentLoaded', () => {
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

  function loadHTMLIntoIframe(html, elementCount) {
    emptyState.style.display = 'none';
    inspectorStatusBadge.style.display = 'block';
    if (elementCount !== undefined) {
      elementsCountBadge.textContent = `${elementCount} Nodes`;
    }

    pushState(html);

    // Set srcdoc on preview iframe
    previewIframe.srcdoc = html;
  }

  function transformPresetHTML(presetType, outerHTML, elementId) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = outerHTML.trim();
    const node = tempDiv.firstElementChild || tempDiv;

    if (presetType === 'glassmorphic') {
      const existingStyle = node.getAttribute('style') || '';
      node.setAttribute('style', `${existingStyle}; background: rgba(255, 255, 255, 0.12) !important; backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important; border: 1px solid rgba(255, 255, 255, 0.25) !important; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37) !important; color: #ffffff !important; border-radius: 16px !important;`.trim());
      node.className = ((node.className || '') + ' backdrop-blur-md bg-white/10 border border-white/20 shadow-2xl rounded-2xl').trim();
    } else if (presetType === 'neon-glow') {
      const existingStyle = node.getAttribute('style') || '';
      node.setAttribute('style', `${existingStyle}; background: #431407 !important; border: 2px solid #f97316 !important; box-shadow: 0 0 20px rgba(249, 115, 22, 0.8), inset 0 0 15px rgba(249, 115, 22, 0.3) !important; color: #ffffff !important; border-radius: 16px !important;`.trim());
      node.className = ((node.className || '') + ' bg-orange-950 border-2 border-orange-500 shadow-orange-500/50 shadow-2xl rounded-2xl').trim();
    } else if (presetType === 'hover-anim') {
      const existingStyle = node.getAttribute('style') || '';
      node.setAttribute('style', `${existingStyle}; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; cursor: pointer !important;`.trim());
      node.setAttribute('onmouseover', "this.style.transform='scale(1.05) translateY(-4px)'; this.style.boxShadow='0 20px 25px -5px rgba(0,0,0,0.5)';");
      node.setAttribute('onmouseout', "this.style.transform='scale(1) translateY(0)';");
      node.className = ((node.className || '') + ' transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-2xl').trim();
    } else if (presetType === 'pill-shape') {
      const existingStyle = node.getAttribute('style') || '';
      node.setAttribute('style', `${existingStyle}; border-radius: 9999px !important; padding: 10px 24px !important; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important; color: #ffffff !important; font-weight: 600 !important; border: none !important;`.trim());
      node.className = ((node.className || '') + ' rounded-full px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold shadow-lg').trim();
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

  // Set Custom Gemini / AI API Key
  setApiKeyBtn.addEventListener('click', () => {
    const existingKey = window.localStorage.getItem('GN_CUSTOM_GEMINI_KEY') || '';
    const newKey = prompt('🔒 Securely enter your personal Gemini API Key (or leave blank to use server environment key):\nGet a free key at: aistudio.google.com', existingKey);
    if (newKey !== null) {
      if (newKey.trim() !== '') {
        window.localStorage.setItem('GN_CUSTOM_GEMINI_KEY', newKey.trim());
        alert('Gemini API Key saved securely! AI Refiner will now use Gemini 2.5 Flash.');
      } else {
        window.localStorage.removeItem('GN_CUSTOM_GEMINI_KEY');
        alert('Custom key cleared. Server environment key will be used.');
      }
    }
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
      fetchDesignFromProxy({ rawHtml });
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

  // AI Element Refinement Action (Secure Server Endpoint + Resilient Client Fallback)
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
    refineAiBtn.innerHTML = `<span class="inline-btn-spinner"></span> Refining [${selectedElement.elementId}] with AI...`;
    refineAiBtn.disabled = true;

    try {
      const customKey = window.localStorage.getItem('GN_CUSTOM_GEMINI_KEY') || '';

      const response = await fetch('/api/ai/refine-element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetHTML: selectedElement.outerHTML,
          elementId: selectedElement.elementId,
          prompt: userPrompt,
          fullDocContext: currentHTML,
          customApiKey: customKey
        })
      });

      const contentType = response.headers.get('content-type') || '';
      let cleanedHTML = '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'AI refinement failed');
        }
        cleanedHTML = data.html;
      } else {
        // Fallback gracefully if running server process hasn't been restarted yet
        console.warn('Backend route returned non-JSON. Executing client-side AI fallback...');
        const hasTailwind = currentHTML.includes('tailwindcss') || currentHTML.includes('tailwind');
        const hasMaterialIcons = currentHTML.includes('material-symbols') || currentHTML.includes('material-icons');

        const systemPrompt = `
You are a Staff Frontend UI/UX Architect and Tailwind/CSS Specialist.
Modify ONLY this target HTML element (element-id: ${selectedElement.elementId}):
\`\`\`html
${selectedElement.outerHTML}
\`\`\`

USER INSTRUCTION: "${userPrompt}"

RULES:
1. MUST PRESERVE data-element-id="${selectedElement.elementId}" on root node.
2. Return ONLY clean modified HTML snippet. No markdown fences.
        `.trim();

        const aiResult = await generateTextWithGemini(systemPrompt, customKey);
        cleanedHTML = aiResult.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      }

      if (!cleanedHTML) {
        throw new Error('AI returned an empty response.');
      }

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

    } catch (err) {
      alert(`AI Refinement failed: ${err.message}`);
    } finally {
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
