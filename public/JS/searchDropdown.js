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
