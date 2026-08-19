/**
 * searchDropdown.js
 * Implements a premium, keyboard-navigable search results dropdown (command palette style)
 * for both notes and code workspace snippets.
 */

import { stripHtml } from './utilities.js';

export function initSearchDropdown({
  inputId,
  dropdownId,
  clearBtnId,
  getItems, // returns array of { id, title, subtitle, themeColor, emoji }
  onSelect
}) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  const clearBtn = document.getElementById(clearBtnId);

  if (!input || !dropdown) return;

  let activeIndex = -1;
  let visibleItems = [];

  // Toggle clear button and search results
  const updateUI = () => {
    const val = input.value.trim();
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', val.length === 0);
    }

    if (document.activeElement === input) {
      renderDropdown(val);
    } else {
      hideDropdown();
    }
  };

  const showDropdown = () => {
    dropdown.classList.remove('hidden');
  };

  const hideDropdown = () => {
    dropdown.classList.add('hidden');
    activeIndex = -1;
  };

  const renderDropdown = (query) => {
    const allItems = getItems() || [];
    if (query.length === 0) {
      // Show recent or first few items when focused but empty
      visibleItems = allItems.slice(0, 6);
    } else {
      const lowerQuery = query.toLowerCase();
      visibleItems = allItems.filter(item => 
        (item.title && item.title.toLowerCase().includes(lowerQuery)) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(lowerQuery))
      );
    }

    if (visibleItems.length === 0) {
      dropdown.innerHTML = `
        <div class="search-dropdown-header">Results</div>
        <div class="search-no-results">No matching results found</div>
      `;
      showDropdown();
      return;
    }

    const headerText = query.length === 0 ? "Recent Items" : "Search Results";
    let html = `<div class="search-dropdown-header">${headerText}</div>`;
    
    if (query.length > 2) {
      html += `
        <div class="search-cross-note-ai-btn" id="ask-cross-note-ai-trigger">
          <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> Ask AI Across Notes: "${escapeHtml(query)}"</span>
        </div>
      `;
    }


    visibleItems.forEach((item, index) => {
      // Dynamic avatar styling
      const themeColor = item.themeColor || 'var(--primary)';
      const avatarStyle = `background: ${themeColor}15; color: ${themeColor}; border: 1px solid ${themeColor}30;`;
      const isActive = index === activeIndex ? 'active' : '';

      html += `
        <div class="search-result-item ${isActive}" data-id="${item.id}" data-index="${index}">
          <div class="search-item-avatar" style="${avatarStyle}">
            ${item.emoji || '📄'}
          </div>
          <div class="search-item-content">
            <span class="search-item-title">${escapeHtml(item.title || 'Untitled')}</span>
            <span class="search-item-separator"> – </span>
            <span class="search-item-desc">${escapeHtml(item.subtitle || '')}</span>
          </div>
        </div>
      `;
    });

    dropdown.innerHTML = html;
    showDropdown();

    // Wire Cross Note AI Trigger
    const aiTrigger = dropdown.querySelector('#ask-cross-note-ai-trigger');
    if (aiTrigger) {
      aiTrigger.addEventListener('mousedown', (e) => e.preventDefault());
      aiTrigger.addEventListener('click', () => {
        runCrossNoteSearchAgent(query, getItems(), dropdown);
      });
    }

    // Attach click events
    dropdown.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        // Prevent input blur before click registers
        e.preventDefault();
      });
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        selectItem(id);
      });
    });
  };


  const selectItem = (id) => {
    hideDropdown();
    input.blur();
    if (onSelect) onSelect(id);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (dropdown.classList.contains('hidden')) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        showDropdown();
        renderDropdown(input.value.trim());
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % visibleItems.length;
      renderDropdown(input.value.trim());
      scrollToActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + visibleItems.length) % visibleItems.length;
      renderDropdown(input.value.trim());
      scrollToActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < visibleItems.length) {
        selectItem(visibleItems[activeIndex].id);
      } else if (visibleItems.length > 0) {
        selectItem(visibleItems[0].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      input.blur();
      hideDropdown();
    }
  };

  const scrollToActive = () => {
    const activeEl = dropdown.querySelector('.search-result-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  };

  // Event Listeners
  input.addEventListener('focus', () => {
    activeIndex = -1;
    renderDropdown(input.value.trim());
  });

  input.addEventListener('input', () => {
    activeIndex = -1;
    updateUI();
  });

  input.addEventListener('blur', () => {
    // Timeout to allow click events to register
    setTimeout(hideDropdown, 200);
  });

  input.addEventListener('keydown', handleKeyDown);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      updateUI();
    });
  }
}

// Helpers
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function runCrossNoteSearchAgent(query, items, dropdown) {
  dropdown.innerHTML = `
    <div class="search-dropdown-header">Cross-Note AI Agent</div>
    <div class="search-ai-loading">
      <span class="ai-spinner"></span>
      <span>Extracting local note snippets & synthesizing answer...</span>
    </div>
  `;

  try {
    const rawQuery = query.toLowerCase();
    const keywords = rawQuery.split(' ').filter(k => k.length > 2);

    // 1. Local Search & Snippet Extraction
    const snippets = [];
    items.forEach(item => {
      const title = item.title || 'Untitled';
      const content = stripHtml(item.content || item.subtitle || '');
      const lowerContent = content.toLowerCase();
      
      let matchedIndex = -1;
      for (const kw of keywords) {
        matchedIndex = lowerContent.indexOf(kw);
        if (matchedIndex !== -1) break;
      }

      if (matchedIndex !== -1 || title.toLowerCase().includes(rawQuery)) {
        const start = Math.max(0, matchedIndex - 50);
        const end = Math.min(content.length, matchedIndex + 150);
        const snippetText = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');

        snippets.push({
          id: item.id,
          title: title,
          updatedAt: item.updatedAt || 'Recently',
          textSnippet: snippetText
        });
      }
    });

    if (snippets.length === 0) {
      dropdown.innerHTML = `
        <div class="search-dropdown-header">Cross-Note AI Agent</div>
        <div class="search-no-results">No local note snippets matched your query keywords.</div>
      `;
      return;
    }

    const memoryEnabled = localStorage.getItem("gnw_ai_memory_enabled") === "true";
    const memoryPrompt = memoryEnabled ? (localStorage.getItem("gnw_ai_memory_text") || "") : "";

    const res = await fetch('/api/ai/cross-note-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        snippets: snippets.slice(0, 5),
        memoryPrompt: memoryPrompt
      })
    });

    if (!res.ok) throw new Error("API call failed");
    const data = await res.json();

    if (data.success && data.answer) {
      let sourcesHtml = snippets.slice(0, 5).map((s, idx) => `
        <button class="ai-source-chip" data-id="${s.id}" title="Jump to note">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:3px;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>${escapeHtml(s.title)}
        </button>
      `).join(' ');

      dropdown.innerHTML = `
        <div class="search-dropdown-header">Synthesized Answer (${data.count} Notes Analyzed)</div>
        <div class="search-ai-answer">${escapeHtml(data.answer).replace(/\n/g, '<br>')}</div>
        <div class="search-ai-sources">
          <span class="sources-label">Matched Notes:</span>
          ${sourcesHtml}
        </div>
      `;


      dropdown.querySelectorAll('.ai-source-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const noteId = btn.dataset.id;
          const noteCard = document.querySelector(`.note-card[data-id="${noteId}"]`);
          if (noteCard) noteCard.click();
          dropdown.classList.add('hidden');
        });
      });
    }
  } catch (err) {
    console.error("Cross-note agent error:", err);
    dropdown.innerHTML = `
      <div class="search-dropdown-header">✨ Cross-Note AI Agent</div>
      <div class="search-no-results">Failed to synthesize answer. Check network connection or API keys.</div>
    `;
  }
}

