/**
 * utility to transform native selects into premium custom dropdowns
 */

export function upgradeToolbarSelects() {
    const selects = document.querySelectorAll('.editor-toolbar select.tiny');

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

    const label = document.createElement('span');
    label.className = 'trigger-value';
    label.textContent = select.options[select.selectedIndex]?.text || '';

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
        label.textContent = select.options[select.selectedIndex]?.text || '';
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

        item.textContent = option.text;
        item.dataset.value = option.value;

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));

            // UI Update
            label.textContent = option.text;

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
