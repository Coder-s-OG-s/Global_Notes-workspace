function getOptionIcon(selectId, optionValue) {
    if (selectId === 'insert-action') {
        return `<svg class="select-option-icon" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.2" style="width:13px;height:13px;margin-right:6px;flex-shrink:0;"><path d="M12 5v14M5 12h14"></path></svg>`;
    }
    if (selectId === 'note-theme') {
        const themeColors = {
            'sunset-orange': '#f97316',
            'classic-blue': '#3b82f6',
            'elegant-purple': '#a855f7',
            'forest-green': '#22c55e',
            'ocean-teal': '#14b8a6',
            'rose-gold': '#f43f5e',
            'slate-gray': '#64748b',
            'crimson-red': '#ef4444'
        };
        const color = themeColors[optionValue] || '#6366f1';
        return `<span class="theme-color-dot" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${color};margin-right:6px;box-shadow: 0 0 0 1px rgba(0,0,0,0.15);flex-shrink:0;"></span>`;
    }
    if (selectId === 'editor-pattern') {
        return `<svg class="select-option-icon" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style="width:13px;height:13px;margin-right:6px;flex-shrink:0;"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>`;
    }
    return '';
}

function updateLabelContent(select, label) {
    const selectedOption = select.options[select.selectedIndex];
    const text = selectedOption?.text || '';
    const val = selectedOption?.value || '';
    const icon = getOptionIcon(select.id, val);
    if (icon) {
        label.innerHTML = `${icon}<span class="label-text-span">${text}</span>`;
    } else {
        label.textContent = text;
    }
}

export function upgradeToolbarSelects() {
    const selects = document.querySelectorAll('.editor-toolbar select.tiny, .editor-toolbar .select.tiny, .sort-select-dashboard');

    selects.forEach(select => {
        // Skip hidden selects or those already upgraded
        if (select.classList.contains('hidden-select') || select.parentElement.classList.contains('custom-select-wrapper')) return;

        createCustomSelect(select);
    });
}

function createCustomSelect(select) {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';

    // Hide original select but keep it for events
    select.classList.add('hidden-select');
    select.style.display = 'none';
    select.style.pointerEvents = 'none';

    // Create trigger
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.tabIndex = 0;

    // Prevent mousedown on trigger from stealing text selection/focus in editor
    trigger.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    const label = document.createElement('span');
    label.className = 'trigger-value';
    updateLabelContent(select, label);

    const chevron = `
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    `;

    trigger.appendChild(label);
    trigger.insertAdjacentHTML('beforeend', chevron);

    // Create menu (Global container to avoid clipping by overflow:auto or backdrop-filter)
    const menu = document.createElement('div');
    menu.className = 'custom-select-menu';

    // Prevent mousedown on menu container from stealing focus
    menu.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    document.body.appendChild(menu);

    // Sync options
    updateMenuOptions(select, menu, label);

    const closeMenu = () => {
        menu.classList.remove('show');
        trigger.classList.remove('active');
    };

    const positionMenu = () => {
        const rect = trigger.getBoundingClientRect();
        // Since it's in body, fixed works relative to viewport
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 6}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.width = `${Math.max(rect.width, 140)}px`;
        menu.style.maxHeight = '280px';
        menu.style.overflowY = 'auto';
    };

    // Toggle menu
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.contains('show');

        // Close all other custom menus
        document.querySelectorAll('.custom-select-menu.show').forEach(m => {
            if (m !== menu) m.classList.remove('show');
        });
        document.querySelectorAll('.custom-select-trigger.active').forEach(t => {
            if (t !== trigger) t.classList.remove('active');
        });

        if (!isOpen) {
            positionMenu();
            menu.classList.add('show');
            trigger.classList.add('active');
        } else {
            closeMenu();
        }
    });

    // Close on click outside or scroll
    document.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, { passive: true });

    // Accessibility: handle Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    // Sync selection back to original select
    select.addEventListener('change', () => {
        updateLabelContent(select, label);
        updateMenuOptions(select, menu, label);
    });

    // Insertion
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    wrapper.appendChild(trigger);
}

function updateMenuOptions(select, menu, label) {
    menu.innerHTML = '';
    Array.from(select.options).forEach((option, index) => {
        const item = document.createElement('div');
        item.className = 'custom-select-option';
        if (index === select.selectedIndex) item.classList.add('selected');

        if (select.id === 'font-family-select' && option.value) {
            item.style.fontFamily = option.value;
        }

        const icon = getOptionIcon(select.id, option.value);
        if (icon) {
            item.innerHTML = `${icon}<span>${option.text}</span>`;
        } else {
            item.textContent = option.text;
        }
        item.dataset.value = option.value;

        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));

            // UI Update
            updateLabelContent(select, label);

            // Close
            menu.classList.remove('show');
            const trigger = menu.triggerElement || document.querySelector('.custom-select-trigger.active');
            if (trigger) trigger.classList.remove('active');

            // Re-sync all options to update 'selected' class
            updateMenuOptions(select, menu, label);
        });

        menu.appendChild(item);
    });
}
