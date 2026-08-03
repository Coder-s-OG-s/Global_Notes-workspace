(function () {
  if (window.__GN_INSPECTOR_LOADED__) return;
  window.__GN_INSPECTOR_LOADED__ = true;

  let activeHoverEl = null;
  let selectedEl = null;
  let inspectorActive = true;

  // Inject Styles for Inspector Overlay
  const style = document.createElement('style');
  style.id = 'gn-inspector-styles';
  style.textContent = `
    .gn-inspector-hover {
      outline: 2px dashed #6366f1 !important;
      outline-offset: -2px !important;
      cursor: pointer !important;
      position: relative !important;
    }
    .gn-inspector-selected {
      outline: 3px solid #8b5cf6 !important;
      outline-offset: -2px !important;
      box-shadow: 0 0 12px rgba(139, 92, 246, 0.4) !important;
    }
    #gn-inspector-badge {
      position: fixed;
      top: 10px;
      right: 10px;
      background: #1e1b4b;
      color: #e0e7ff;
      border: 1px solid #6366f1;
      border-radius: 6px;
      padding: 4px 10px;
      font-family: 'JetBrains Mono', monospace, sans-serif;
      font-size: 11px;
      font-weight: 600;
      z-index: 999999;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: none;
    }
  `;
  document.head.appendChild(style);

  // Floating Badge
  const badge = document.createElement('div');
  badge.id = 'gn-inspector-badge';
  document.body.appendChild(badge);

  function getElementSelector(el) {
    if (!el || el === document.body) return 'body';
    let label = el.tagName.toLowerCase();
    if (el.id) label += '#' + el.id;
    else if (el.className && typeof el.className === 'string') {
      const firstClass = el.className.split(' ').filter(c => c && !c.startsWith('gn-inspector'))[0];
      if (firstClass) label += '.' + firstClass;
    }
    return label;
  }

  function handleMouseOver(e) {
    if (!inspectorActive) return;
    const target = e.target;
    if (target === document.body || target === document.documentElement || target.id === 'gn-inspector-badge') return;

    if (activeHoverEl && activeHoverEl !== selectedEl) {
      activeHoverEl.classList.remove('gn-inspector-hover');
    }

    activeHoverEl = target;
    if (activeHoverEl !== selectedEl) {
      activeHoverEl.classList.add('gn-inspector-hover');
    }

    const elementId = target.getAttribute('data-element-id') || 'no-id';
    badge.textContent = `<${getElementSelector(target)}> [${elementId}]`;
    badge.style.display = 'block';
  }

  function handleMouseOut(e) {
    if (!inspectorActive) return;
    if (activeHoverEl && activeHoverEl !== selectedEl) {
      activeHoverEl.classList.remove('gn-inspector-hover');
    }
    activeHoverEl = null;
    badge.style.display = 'none';
  }

  function handleClick(e) {
    if (!inspectorActive) return;
    const target = e.target;
    if (target === document.body || target === document.documentElement || target.id === 'gn-inspector-badge') return;

    e.preventDefault();
    e.stopPropagation();

    if (selectedEl) {
      selectedEl.classList.remove('gn-inspector-selected');
      selectedEl.classList.remove('gn-inspector-hover');
    }

    selectedEl = target;
    selectedEl.classList.remove('gn-inspector-hover');
    selectedEl.classList.add('gn-inspector-selected');

    const elementId = selectedEl.getAttribute('data-element-id');
    const outerHTML = selectedEl.outerHTML;

    // Send selection event to host window
    window.parent.postMessage({
      type: 'GN_ELEMENT_SELECTED',
      elementId: elementId,
      tagName: selectedEl.tagName.toLowerCase(),
      selector: getElementSelector(selectedEl),
      outerHTML: outerHTML,
      innerHTML: selectedEl.innerHTML,
      id: selectedEl.id || '',
      className: selectedEl.className || ''
    }, '*');
  }

  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);

  // Handle incoming messages from Parent Application Window
  window.addEventListener('message', function (event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'GN_UPDATE_ELEMENT') {
      const { elementId, newHTML } = data;
      const targetNode = document.querySelector(`[data-element-id="${elementId}"]`);
      if (targetNode) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHTML.trim();
        const newNode = tempDiv.firstElementChild || tempDiv;
        
        // Preserve data-element-id
        if (newNode.setAttribute) {
          newNode.setAttribute('data-element-id', elementId);
        }

        targetNode.replaceWith(newNode);
        selectedEl = newNode;
        selectedEl.classList.add('gn-inspector-selected');

        // Notify parent that DOM updated successfully
        window.parent.postMessage({
          type: 'GN_DOM_UPDATED',
          fullHTML: document.documentElement.outerHTML
        }, '*');
      }
    } else if (data.type === 'GN_TOGGLE_INSPECTOR') {
      inspectorActive = !!data.active;
      if (!inspectorActive) {
        if (activeHoverEl) activeHoverEl.classList.remove('gn-inspector-hover');
        if (selectedEl) selectedEl.classList.remove('gn-inspector-selected');
        badge.style.display = 'none';
      }
    } else if (data.type === 'GN_SELECT_ELEMENT_BY_ID') {
      const targetNode = document.querySelector(`[data-element-id="${data.elementId}"]`);
      if (targetNode) {
        if (selectedEl) selectedEl.classList.remove('gn-inspector-selected');
        selectedEl = targetNode;
        selectedEl.classList.add('gn-inspector-selected');
        selectedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  console.log('[GN Inspector Bridge] Active and listening in sandbox preview frame.');
})();
