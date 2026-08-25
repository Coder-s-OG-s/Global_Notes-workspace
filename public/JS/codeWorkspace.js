import config from './config.js';
import { generateTextWithGemini } from './geminiAPI.js';
import { wireThemeToggle, setThemeStorageKey } from './themeManager.js';
import { CODE_THEME_KEY } from './constants.js';
import { showConfirm, showPrompt, wireAppsDropdown } from './utilities.js';
import { initSearchDropdown } from './searchDropdown.js';

const STORAGE_KEY = 'antigravity_snippets';

const languageMap = {
    javascript: { name: 'JavaScript', mode: 'javascript', indent: 4 },
    python: { name: 'Python', mode: 'python', indent: 4 },
    python3: { name: 'Python3', mode: 'python', indent: 4 },
    java: { name: 'Java', mode: 'text/x-java', indent: 4 },
    cpp: { name: 'C++', mode: 'text/x-c++src', indent: 4 },
    csharp: { name: 'C#', mode: 'text/x-csharp', indent: 4 },
    c: { name: 'C', mode: 'text/x-csrc', indent: 4 },
    go: { name: 'Go', mode: 'text/x-go', indent: 4, useTabs: true },
    kotlin: { name: 'Kotlin', mode: 'text/x-kotlin', indent: 4 },
    swift: { name: 'Swift', mode: 'text/x-swift', indent: 4 },
    rust: { name: 'Rust', mode: 'text/x-rustsrc', indent: 4 },
    ruby: { name: 'Ruby', mode: 'text/x-ruby', indent: 2 },
    php: { name: 'PHP', mode: 'text/x-php', indent: 4 },
    dart: { name: 'Dart', mode: 'application/dart', indent: 2 },
    scala: { name: 'Scala', mode: 'text/x-scala', indent: 2 },
    elixir: { name: 'Elixir', mode: 'text/x-elixir', indent: 2 },
    erlang: { name: 'Erlang', mode: 'text/x-erlang', indent: 4 },
    racket: { name: 'Racket', mode: 'text/x-scheme', indent: 2 },
    htmlmixed: { name: 'HTML', mode: 'htmlmixed', indent: 4 },
    css: { name: 'CSS', mode: 'css', indent: 4 },
    sql: { name: 'SQL', mode: 'text/x-sql', indent: 4 },
    typescript: { name: 'TypeScript', mode: 'text/typescript', indent: 4 }
};

class CodeWorkspace {
    constructor() {
        this.snippets = this.loadSnippets();
        this.activeSnippetId = null;
        this.editor = null;
        this.copilotModes = {
            general: {
                name: 'General Copilot',
                systemPrompt: `You are a Senior Staff Software Engineer and Expert Programming Tutor at Global Code Workspace.
Your goal is to provide elite-level, production-grade assistance.`
            },
            optimizer: {
                name: 'Performance Optimizer',
                systemPrompt: `You are an Expert Algorithmic & Performance Optimization Engineer.
Focus on analyzing Big-O time and space complexity, memory reduction, and execution speed.`
            },
            debugger: {
                name: 'Security & Bug Hunter',
                systemPrompt: `You are a Lead Application Security & Bug Hunting Specialist.
Focus on finding edge cases, null pointers, race conditions, memory leaks, and vulnerability vectors.`
            },
            testGen: {
                name: 'Unit Test Architect',
                systemPrompt: `You are a Senior Test Automation Architect.
Focus on writing clean, comprehensive unit and integration test suites covering edge cases and boundary conditions.`
            }
        };
        this.activeCopilotMode = 'general';
        this.chatHistory = [
            {
                role: "system",
                content: this.copilotModes.general.systemPrompt
            }
        ];
        this.isCustomHeight = false;

        this.init();
    }

    init() {
        // Save current page state
        localStorage.setItem('lastPage', 'code-workspace');

        // Handle back button click to clear state
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                localStorage.setItem('lastPage', 'dashboard');
            });
        }

        setThemeStorageKey(CODE_THEME_KEY);
        wireThemeToggle();
        wireAppsDropdown();
        this.initEditor();
        this.renderSnippetList();
        this.attachEventListeners();
        this.setupCustomLanguageSelect();
        this.initChat();
        this.checkAPIKey();
        this.createNewSnippet();

        // Handle auto-creation of snippet via URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const autoCreateTitle = urlParams.get('createSnippet');
        if (autoCreateTitle) {
            const decodedTitle = decodeURIComponent(autoCreateTitle);
            const existing = this.snippets.find(s => s.title.toLowerCase() === decodedTitle.toLowerCase());
            if (existing) {
                this.activeSnippetId = existing.id;
                this.editor.setValue(existing.code);
                const selector = document.getElementById('language-selector');
                if (selector) {
                    selector.value = existing.language || 'javascript';
                    selector.dispatchEvent(new Event('change'));
                }
                this.updateEditorSettings(existing.language || 'javascript');
                this.renderSnippetList();
            } else {
                const newId = Date.now().toString();
                const newSnippet = {
                    id: newId,
                    title: decodedTitle,
                    code: `// Coding notes for ${decodedTitle}\n\n`,
                    language: 'javascript',
                    updatedAt: new Date().toISOString()
                };
                this.snippets.unshift(newSnippet);
                this.activeSnippetId = newId;
                this.editor.setValue(newSnippet.code);
                const selector = document.getElementById('language-selector');
                if (selector) {
                    selector.value = 'javascript';
                    selector.dispatchEvent(new Event('change'));
                }
                this.updateEditorSettings('javascript');
                this.saveToStorage();
                this.renderSnippetList();
            }
        }
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.code-sidebar');
            if (sidebar) sidebar.classList.add('collapsed');
        }
    }

    checkAPIKey() {
        const warningEl = document.getElementById('api-warning');
        if (warningEl) {
            warningEl.classList.add('hidden');
        }
    }

    initEditor() {
        const editorTarget = document.getElementById('editor-target');
        if (!editorTarget) return;

        const currentTheme = document.documentElement.dataset.theme || 'amoled-dark';
        const isDark = currentTheme.includes('dark') || currentTheme === 'corporate-gray';

        this.editor = CodeMirror(editorTarget, {
            lineNumbers: true,
            theme: isDark ? 'dracula' : 'default',
            mode: 'javascript',
            tabSize: 4,
            indentUnit: 4,
            indentWithTabs: false,
            autoCloseBrackets: true,
            autoCloseTags: true,
            matchBrackets: true,
            styleActiveLine: true,
            viewportMargin: Infinity,
            lineWrapping: false
        });

        // Sync Status Bar (Line Count & Char Count) & Header Tab
        const updateStatusBar = () => {
            if (!this.editor) return;
            const lineCountEl = document.getElementById('editor-line-count');
            const charCountEl = document.getElementById('editor-char-count');
            const val = this.editor.getValue() || '';
            if (lineCountEl) lineCountEl.textContent = `Lines: ${this.editor.lineCount()}`;
            if (charCountEl) charCountEl.textContent = `Chars: ${val.length}`;
        };

        this.editor.on('change', updateStatusBar);
        this.editor.on('cursorActivity', updateStatusBar);
        updateStatusBar();

        // Listen for Theme Toggle changes dynamically
        const themeObserver = new MutationObserver(() => {
            const activeTheme = document.documentElement.dataset.theme || 'amoled-dark';
            const isDarkTheme = activeTheme.includes('dark') || activeTheme === 'corporate-gray';
            if (this.editor) {
                this.editor.setOption('theme', isDarkTheme ? 'dracula' : 'default');
            }
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        this.editor.setOption("extraKeys", {
            "Tab": (cm) => {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                    return;
                }
                const cur = cm.getCursor();
                const lineText = cm.getLine(cur.line);
                const aiMatch = lineText.match(/^\s*(\/\/|#)\s*AI:\s*(.+)$/i);
                if (aiMatch) {
                    const commentPrefix = aiMatch[1];
                    const prompt = aiMatch[2].trim();
                    const lineStart = { line: cur.line, ch: 0 };
                    const lineEnd = { line: cur.line, ch: lineText.length };
                    
                    const tempText = `${commentPrefix} AI: ${prompt} (Generating...)`;
                    cm.replaceRange(tempText, lineStart, lineEnd);
                    
                    const langSelect = document.getElementById('language-selector');
                    const lang = langSelect ? languageMap[langSelect.value]?.name || 'JavaScript' : 'JavaScript';
                    
                    generateTextWithGemini(
                        `You are an expert programming assistant. Generate a clean code snippet in ${lang} based on this prompt: "${prompt}".
Provide ONLY the code. Do NOT wrap it in markdown codeblocks (no \`\`\`), do NOT include explanations, comments, or conversational text. Return the raw code ready to execute.`
                    ).then((aiCode) => {
                        const currentLineText = cm.getLine(cur.line);
                        if (currentLineText && currentLineText.includes("(Generating...)")) {
                            cm.replaceRange(aiCode, { line: cur.line, ch: 0 }, { line: cur.line, ch: currentLineText.length });
                        } else {
                            cm.replaceRange(aiCode, { line: cur.line, ch: 0 }, { line: cur.line, ch: (cm.getLine(cur.line) || '').length });
                        }
                    }).catch((err) => {
                        console.error(err);
                        const errText = `${commentPrefix} AI: ${prompt} (Error generating code)`;
                        const currLine = cm.getLine(cur.line);
                        cm.replaceRange(errText, { line: cur.line, ch: 0 }, { line: cur.line, ch: (currLine || '').length });
                    });
                    
                    return;
                }
                if (cm.getOption("indentWithTabs")) {
                    cm.replaceSelection("\t");
                } else {
                    const n = cm.getOption("indentUnit");
                    const spaces = Array(n + 1).join(" ");
                    cm.replaceSelection(spaces);
                }
            },
            "Shift-Tab": (cm) => cm.indentSelection("subtract"),
            "Ctrl-S": () => this.saveSnippet(),
            "Cmd-S": () => this.saveSnippet(),
            "Ctrl-/": (cm) => cm.toggleComment(),
            "Cmd-/": (cm) => cm.toggleComment(),
            "Shift-Alt-F": (cm) => {
                const totalLines = cm.lineCount();
                for (let i = 0; i < totalLines; i++) {
                    cm.indentLine(i, "smart");
                }
            },
            "Alt-F": (cm) => {
                const totalLines = cm.lineCount();
                for (let i = 0; i < totalLines; i++) {
                    cm.indentLine(i, "smart");
                }
            },
            "Ctrl-D": (cm) => {
                const selections = cm.listSelections();
                selections.forEach(sel => {
                    const line = cm.getLine(sel.anchor.line);
                    cm.replaceRange(line + "\n", { line: sel.anchor.line, ch: 0 });
                });
            },
            "Cmd-D": (cm) => {
                const selections = cm.listSelections();
                selections.forEach(sel => {
                    const line = cm.getLine(sel.anchor.line);
                    cm.replaceRange(line + "\n", { line: sel.anchor.line, ch: 0 });
                });
            },
            "Ctrl-F": "findPersistent",
            "Cmd-F": "findPersistent",
            "Ctrl-G": "jumpToLine",
            "Cmd-G": "jumpToLine",
            "Ctrl-Shift-K": (cm) => {
                const from = cm.getCursor("from");
                const to = cm.getCursor("to");
                cm.replaceRange("", { line: from.line, ch: 0 }, { line: to.line + 1, ch: 0 });
            },
            "Cmd-Shift-K": (cm) => {
                const from = cm.getCursor("from");
                const to = cm.getCursor("to");
                cm.replaceRange("", { line: from.line, ch: 0 }, { line: to.line + 1, ch: 0 });
            },
            "Ctrl-B": (cm) => this.applyFormatting(cm, "**"),
            "Cmd-B": (cm) => this.applyFormatting(cm, "**"),
            "Ctrl-I": (cm) => this.applyFormatting(cm, "*"),
            "Cmd-I": (cm) => this.applyFormatting(cm, "*"),
            "Ctrl-K": (cm) => this.applyFormatting(cm, "`"),
            "Cmd-K": (cm) => this.applyFormatting(cm, "`")
        });
    }

    applyFormatting(cm, symbol) {
        const selection = cm.getSelection();
        if (selection) {
            cm.replaceSelection(`${symbol}${selection}${symbol}`);
        } else {
            const cursor = cm.getCursor();
            cm.replaceSelection(`${symbol}${symbol}`);
            cm.setCursor({ line: cursor.line, ch: cursor.ch + symbol.length });
        }
    }

    loadSnippets() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    saveToStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snippets));
    }

    attachEventListeners() {
        document.getElementById('language-selector').addEventListener('change', (e) => {
            const lang = e.target.value;
            this.updateEditorSettings(lang);
            if (this.activeSnippetId) {
                this.updateActiveSnippetMeta({ language: lang });
            }
        });

        document.getElementById('save-snippet-btn').addEventListener('click', () => this.saveSnippet());
        document.getElementById('new-snippet-btn').addEventListener('click', () => this.createNewSnippet());
        document.getElementById('copy-code-btn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('snippet-search').addEventListener('input', (e) => this.renderSnippetList(e.target.value));

        initSearchDropdown({
            inputId: 'snippet-search',
            dropdownId: 'snippet-search-dropdown',
            clearBtnId: 'snippet-search-clear',
            getItems: () => {
                return this.snippets.map(s => {
                    const langObj = languageMap[s.language] || { name: s.language || 'Plain Text' };
                    return {
                        id: s.id,
                        title: s.title || 'Untitled snippet',
                        subtitle: `${langObj.name}`,
                        themeColor: 'var(--primary)',
                        emoji: '💻'
                    };
                });
            },
            onSelect: (id) => {
                this.selectSnippet(id);
            }
        });
        const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', () => {
                const sidebar = document.querySelector('.code-sidebar');
                const page = document.querySelector('.code-workspace-page');
                if (sidebar) {
                    if (window.innerWidth <= 1024) {
                        if (page) page.classList.toggle('sidebar-visible');
                        sidebar.classList.toggle('open');
                    } else {
                        sidebar.classList.toggle('collapsed');
                    }
                    if (this.editor) {
                        setTimeout(() => {
                            this.editor.refresh();
                        }, 350);
                    }
                }
            });
        }

        document.getElementById('close-panel-btn').addEventListener('click', () => this.togglePanel(false));
        document.getElementById('expand-panel-btn').addEventListener('click', () => this.toggleExpand());

        // Resizer Logic
        const resizer = document.getElementById('ai-panel-resizer');
        resizer.addEventListener('mousedown', (e) => this.startResizing(e));

        // AI Tools Dropdown Toggle
        const aiToolsBtn = document.getElementById('ai-tools-dropdown-btn');
        const aiToolsMenu = document.getElementById('ai-tools-menu');
        if (aiToolsBtn && aiToolsMenu) {
            aiToolsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                aiToolsMenu.classList.toggle('hidden');
            });
            document.addEventListener('click', (e) => {
                if (!aiToolsMenu.contains(e.target) && !aiToolsBtn.contains(e.target)) {
                    aiToolsMenu.classList.add('hidden');
                }
            });
            aiToolsMenu.querySelectorAll('.ai-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    aiToolsMenu.classList.add('hidden');
                });
            });
        }

        // AI Feature Buttons
        const suggestBtn = document.getElementById('ai-suggest-btn');
        if (suggestBtn) suggestBtn.addEventListener('click', () => this.handleAIRequest('suggest'));

        const explainBtn = document.getElementById('ai-explain-btn');
        if (explainBtn) explainBtn.addEventListener('click', () => this.handleAIRequest('explain'));

        const docsBtn = document.getElementById('ai-docs-btn');
        if (docsBtn) docsBtn.addEventListener('click', () => this.handleAIRequest('docs'));

        const improveBtn = document.getElementById('ai-improve-btn');
        if (improveBtn) improveBtn.addEventListener('click', () => this.handleAIRequest('improve'));

        const analyzeBtn = document.getElementById('ai-analyze-btn');
        if (analyzeBtn) analyzeBtn.addEventListener('click', () => this.handleAIRequest('analyze'));

        const debugBtn = document.getElementById('ai-debug-btn');
        if (debugBtn) debugBtn.addEventListener('click', () => this.handleAIRequest('debug'));

        const visualizeBtn = document.getElementById('ai-visualize-flowchart-btn');
        if (visualizeBtn) visualizeBtn.addEventListener('click', () => this.handleFlowchartRequest());

        // Overlay Click Listener to close sidebar
        const overlay = document.getElementById('sidebar-overlay-code');
        if (overlay) {
            overlay.addEventListener('click', () => {
                const sidebar = document.querySelector('.code-sidebar');
                if (sidebar) {
                    sidebar.classList.add('collapsed');
                    if (this.editor) {
                        setTimeout(() => {
                            this.editor.refresh();
                        }, 350);
                    }
                }
            });
        }
    }

    setupCustomLanguageSelect() {
        const select = document.getElementById('language-selector');
        if (!select) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'lang-select-wrapper';

        select.classList.add('hidden-select');

        const trigger = document.createElement('div');
        trigger.className = 'lang-select-trigger';
        trigger.innerHTML = `
            <span class="trigger-value">${select.options[select.selectedIndex]?.text || 'Select Language'}</span>
            <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        `;

        const menu = document.createElement('div');
        menu.className = 'lang-select-menu';
        document.body.appendChild(menu);

        const updateMenu = () => {
            menu.innerHTML = '';
            const groups = select.querySelectorAll('optgroup');

            groups.forEach(group => {
                const column = document.createElement('div');
                column.className = 'lang-select-column';

                const label = document.createElement('div');
                label.className = 'lang-select-group-label';
                label.textContent = group.label;
                column.appendChild(label);

                group.querySelectorAll('option').forEach(opt => {
                    const item = document.createElement('div');
                    item.className = 'lang-select-option' + (opt.value === select.value ? ' selected' : '');
                    item.innerHTML = `<span>${opt.text}</span>`;
                    item.onclick = (e) => {
                        e.stopPropagation();
                        select.value = opt.value;
                        select.dispatchEvent(new Event('change'));
                        trigger.querySelector('.trigger-value').textContent = opt.text;
                        menu.classList.remove('show');
                        trigger.classList.remove('active');
                        updateMenu();
                    };
                    column.appendChild(item);
                });
                menu.appendChild(column);
            });
        };

        updateMenu();

        trigger.onclick = (e) => {
            e.stopPropagation();
            const rect = trigger.getBoundingClientRect();

            const isMobile = window.innerWidth <= 768;

            if (isMobile) {
                menu.style.top = '';
                menu.style.left = '';
            } else {
                // Positioning directly under the trigger
                menu.style.top = `${rect.bottom + 8}px`;

                // Center the mega-menu relative to the trigger
                let left = rect.left + (rect.width / 2) - (menu.offsetWidth / 2);

                // Boundary checks (prevent going off-screen)
                const padding = 20;
                if (left < padding) left = padding;
                if (left + menu.offsetWidth > window.innerWidth - padding) {
                    left = window.innerWidth - menu.offsetWidth - padding;
                }
                menu.style.left = `${left}px`;
            }

            const isShowing = menu.classList.contains('show');
            document.querySelectorAll('.lang-select-menu').forEach(m => m.classList.remove('show'));
            document.querySelectorAll('.lang-select-trigger').forEach(t => t.classList.remove('active'));

            if (!isShowing) {
                menu.classList.add('show');
                trigger.classList.add('active');
            }
        };

        document.addEventListener('click', () => {
            menu.classList.remove('show');
            trigger.classList.remove('active');
        });

        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        wrapper.appendChild(trigger);

        // sync back if select value changes programmatically
        select.addEventListener('change', () => {
            trigger.querySelector('.trigger-value').textContent = select.options[select.selectedIndex]?.text;
            updateMenu();
        });
    }

    // --- AI Shared Logic ---
    async callAI(systemPrompt, userContent) {
        const fullPrompt = `${systemPrompt}\n\nUSER CODE/CONTEXT:\n${userContent}`;
        return await generateTextWithGemini(fullPrompt);
    }

    async handleAIRequest(type) {
        const code = this.editor.getValue();
        if (!code.trim()) {
            this.showToast(`No code to ${type}.`);
            return;
        }

        this.togglePanel(true, "Analyzing your code...");
        this.setAIButtonsLoading(true);

        try {
            const langSelectVal = document.getElementById('language-selector').value;
            const lang = (languageMap[langSelectVal] || { name: langSelectVal || 'Plain Text' }).name;
            let response = '';

            if (type === 'suggest') {
                const memoryEnabled = localStorage.getItem("gnw_ai_memory_enabled") === "true";
                const memoryPrompt = memoryEnabled ? (localStorage.getItem("gnw_ai_memory_text") || "") : "";
                
                try {
                    const res = await fetch('/api/ai/code-suggest', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, language: lang, action: 'suggest', memoryPrompt })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const explanation = data.explanation || "AI Code Suggestions";
                        const suggestedCode = data.suggestedCode || code;
                        response = `**AI Suggestions & Refinements:**\n${explanation}\n\n**Suggested Code:**\n\`\`\`${langSelectVal}\n${suggestedCode}\n\`\`\``;
                    } else {
                        throw new Error('API request failed');
                    }
                } catch(e) {
                    response = await this.callAI(
                        "You are an AI code completion assistant. Suggest code improvements, completions, or fixes. Respond with:\n**Suggestions:**\n[bullet list]\n**Suggested Code:**\n[code block]",
                        `Language: ${lang}\n\nCode:\n${code}`
                    );
                }
                this.renderAIResult("AI Code Suggestions", response, true);

            } else if (type === 'explain') {

                response = await this.callAI(
                    "You are an expert programming tutor. Explain code clearly for intermediate developers. Structure your response with these exact sections:\n**Overview** — what the code does in 2–3 sentences\n**Key Functions** — explain each function/method\n**Concepts Used** — list and briefly explain the main concepts\nKeep it concise, practical, and beginner-friendly.",
                    `Language: ${lang}\n\nCode:\n${code}`
                );
                this.renderAIResult("Code Explanation", response);
            } else if (type === 'docs') {
                response = await this.callAI(
                    "You are a technical documentation writer. Generate clean, structured documentation for the provided code. Use this exact format:\n**Title:** [function or module name]\n**Description:** [what it does]\n**Parameters:** [list each param with type and description, or 'None']\n**Returns:** [what it returns, or 'void']\n**Example Usage:**\n[a short usage code example in the same language]\n**Notes:** [any important caveats or dependencies]",
                    `Language: ${lang}\n\nCode:\n${code}`
                );
                this.renderAIResult("Generated Documentation", response, false, true);
            } else if (type === 'improve') {
                response = await this.callAI(
                    "You are a senior software engineer doing a code review. Analyze the code and respond with exactly two sections:\n**Suggestions:**\n[numbered list of specific improvements — readability, performance, best practices, error handling. Be concrete, not generic. Max 6 suggestions.]\n**Improved Code:**\n[the full rewritten version of the code with all improvements applied, inside a code block]",
                    `Language: ${lang}\n\nCode:\n${code}`
                );
                this.renderAIResult("Code Improvements", response, true);
            } else if (type === 'analyze') {
                response = await this.callAI(
                    "You are an expert computer science professor and algorithm optimizer. Analyze the time and space complexity of the provided code using Big-O notation. Provide a clear breakdown of the analysis and suggest code optimizations to improve efficiency. Response must contain these exact sections:\n**Time Complexity:** [e.g. O(N^2) - explanation]\n**Space Complexity:** [e.g. O(1) - explanation]\n**Complexity Breakdown:** [detailed breakdown]\n**Suggestions for Optimization:** [ideas to improve runtime or space efficiency]\n**Optimized Code:**\n[the optimized version of the code in a markdown code block]",
                    `Language: ${lang}\n\nCode:\n${code}`
                );
                this.renderAIResult("Complexity & Optimization", response, true);
            } else if (type === 'debug') {
                response = await this.callAI(
                    "You are an expert debugger and QA engineer. Scan the provided code for syntax or logical bugs. Explain the bugs and provide the corrected code. Response must contain these exact sections:\n**Identified Bugs:**\n[numbered list explaining what bugs were found, why they happened, and how to fix them]\n**Corrected Code:**\n[the fully corrected and bug-free code inside a markdown code block]",
                    `Language: ${lang}\n\nCode:\n${code}`
                );
                this.renderAIResult("Code Debugging", response, true);
            }
        } catch (err) {
            this.renderAIError(err.message);
        } finally {
            this.setAIButtonsLoading(false);
        }
    }

    async handleFlowchartRequest() {
        const code = this.editor.getValue();
        if (!code.trim()) {
            this.showToast("No code to visualize.");
            return;
        }

        this.togglePanel(true, "Generating flowchart layout...");
        this.setAIButtonsLoading(true);

        try {
            const langSelect = document.getElementById('language-selector');
            const lang = langSelect ? languageMap[langSelect.value]?.name || 'JavaScript' : 'JavaScript';
            
            const systemPrompt = `You are an expert systems flow diagram designer. Convert the user's code execution path into a highly detailed, clear, step-by-step flowchart layout.
You MUST break down the algorithm into EACH individual step (e.g. Start, Input reading, Variable Initialization, Loop/Condition check, Loop Body statements, Pointers update, Return/Output, and End). Do NOT skip intermediate steps or simplify the algorithm to a single node.

LAYOUT RULES (Strictly enforce to prevent overlap and messy layouts):
1. Canvas bounds: x = [50 to 950], y = [50 to 950].
2. Coordinate Grid: Align all nodes and directional arrows on a clean grid layout.
3. Node Sizes: Default size for process/decision/terminator boxes: width = 150, height = 70.
4. Directional Arrows (Use types "block-down", "block-right", "block-left", "block-up"):
   - Default size for block arrows: width = 80, height = 50 (or width = 50, height = 80 depending on orientation).
   - Place arrows exactly in the empty space between the nodes they connect.
   - Make sure arrows NEVER overlap any process boxes or other arrows.
5. Branching logic alignment:
   - For a decision diamond at x = C, y = H:
     - Branch True (Right): Place a "block-right" arrow at x = C + 160, y = H + 10, and the target shape at x = C + 260, y = H.
     - Branch False (Left): Place a "block-left" arrow at x = C - 100, y = H + 10, and the target shape at x = C - 270, y = H.
     - Branch Down (Next Step): Place a "block-down" arrow at x = C + 35, y = H + 80, and the next shape at x = C, y = H + 150.
6. Cascade logic vertically: If moving to the next sequence, drop Y coordinates by at least 140px.

Return ONLY a JSON array of shape objects. Each element must be a shape node:
- "id": string (unique ID, e.g. "n1", "n2", "a1", "a2")
- "type": string — one of: "rectangle" (process), "rounded-rect" (start/end terminators), "diamond" (decision point), "oval", "parallelogram" (input/output), "block-right", "block-down", "block-left", "block-up"
- "label": string (short concise label, 1-4 words, e.g. "Start", "Initialize Pointers", "left < right?", "Increment left", "End")
- "x": number (horizontal coordinate)
- "y": number (vertical coordinate)
- "width": number
- "height": number

Example for a clean vertical process:
[
  { "id": "n1", "type": "rounded-rect", "label": "Start", "x": 350, "y": 50, "width": 150, "height": 70 },
  { "id": "a1", "type": "block-down", "label": "", "x": 385, "y": 130, "width": 80, "height": 50 },
  { "id": "n2", "type": "rectangle", "label": "Read Input Str", "x": 350, "y": 190, "width": 150, "height": 70 }
]`;

            const response = await this.callAI(systemPrompt, `Language: ${lang}\n\nCode:\n${code}`);
            
            const cleanText = response.trim();
            let data;
            
            // 1. Try parsing directly
            try {
                data = JSON.parse(cleanText);
            } catch (e) {
                // Ignore
            }

            // 2. Try parsing after removing outer ```json or ``` wrapper if it matches perfectly
            if (!data && cleanText.startsWith('```') && cleanText.endsWith('```')) {
                const matches = cleanText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
                if (matches && matches[1]) {
                    try {
                        data = JSON.parse(matches[1].trim());
                    } catch (e) {
                        // Ignore
                    }
                }
            }

            // 3. Substring extraction fallback
            if (!data) {
                let startIdx = -1;
                while ((startIdx = cleanText.indexOf('[', startIdx + 1)) !== -1) {
                    let endIdx = cleanText.length;
                    while ((endIdx = cleanText.lastIndexOf(']', endIdx - 1)) !== -1 && endIdx > startIdx) {
                        const candidate = cleanText.substring(startIdx, endIdx + 1);
                        try {
                            const parsed = JSON.parse(candidate);
                            if (Array.isArray(parsed)) {
                                data = parsed;
                                break;
                            }
                        } catch (err) {
                            // Ignore
                        }
                    }
                    if (data) break;
                }
            }

            if (!data) {
                throw new Error("AI did not return a valid JSON array.");
            }


            if (!Array.isArray(data)) {
                throw new Error("Flowchart layout must be an array of nodes.");
            }

            const shapes = data.map(n => ({
                id: n.id || ('shape_ai_' + Math.random().toString(36).substr(2, 5)),
                type: n.type || 'rectangle',
                text: n.label || '',
                x: Number(n.x) || 100,
                y: Number(n.y) || 100,
                width: Number(n.width) || 140,
                height: Number(n.height) || 70
            }));

            localStorage.setItem('global_notes_hub_flowchart_shapes', JSON.stringify(shapes));
            
            this.showToast('Flowchart generated! Redirecting...');
            setTimeout(() => {
                window.location.href = '/HTML/student-hub.html#flowcharts';
            }, 1000);

        } catch (err) {
            this.showToast(err.message || 'Flowchart generation failed.');
            this.renderAIError(err.message);
        } finally {
            this.setAIButtonsLoading(false);
            this.togglePanel(false);
        }
    }

    setAIButtonsLoading(isLoading) {
        const btnIds = ['ai-explain-btn', 'ai-docs-btn', 'ai-improve-btn', 'ai-analyze-btn', 'ai-debug-btn', 'ai-visualize-flowchart-btn'];
        btnIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = isLoading;
                if (isLoading) {
                    btn.dataset.original = btn.innerHTML;
                    btn.innerHTML = '<span class="ai-spinner"></span>';
                } else if (btn.dataset.original) {
                    btn.innerHTML = btn.dataset.original;
                }
            }
        });
    }

    togglePanel(show, loadingText = null) {
        const panel = document.getElementById('ai-result-panel');
        const content = document.getElementById('ai-panel-content');

        if (show) {
            panel.classList.add('show');
            if (!this.isCustomHeight) {
                panel.style.height = '280px';
            }
            if (loadingText) {
                content.innerHTML = `
            <div class="panel-loading">
              <span class="ai-spinner" style="width: 40px; height: 40px;"></span>
              <p>${loadingText}</p>
            </div>
          `;
            }
        } else {
            panel.classList.remove('show');
            panel.style.height = '0';
            this.isCustomHeight = false;
        }
    }

    startResizing(e) {
        e.preventDefault();
        const panel = document.getElementById('ai-result-panel');
        const startY = e.clientY;
        const startHeight = parseInt(document.defaultView.getComputedStyle(panel).height, 10);

        const doDrag = (e) => {
            const height = startHeight + (startY - e.clientY);
            if (height > 100 && height < window.innerHeight * 0.8) {
                panel.style.height = height + 'px';
                panel.style.transition = 'none'; // Disable transition while dragging
                this.isCustomHeight = true;
                this.editor.refresh(); // Keep CodeMirror in sync
            }
        };

        const stopDrag = () => {
            panel.style.transition = ''; // Restore transition
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
        };

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    }

    toggleExpand() {
        const panel = document.getElementById('ai-result-panel');
        const isMaximized = panel.style.height === '80vh';

        if (isMaximized) {
            panel.style.height = '280px';
            this.isCustomHeight = false;
        } else {
            panel.style.height = '80vh';
            this.isCustomHeight = true;
        }
        setTimeout(() => this.editor.refresh(), 300);
    }

    renderAIResult(title, content, hasImprovedCode = false, hasDownloadPdf = false) {
        document.getElementById('ai-panel-title').textContent = title;
        const contentEl = document.getElementById('ai-panel-content');

        contentEl.innerHTML = this.renderMarkdown(content, false);

        if (hasImprovedCode) {
            const codeBlocks = content.match(/```([\s\S]*?)```/);
            if (codeBlocks) {
                let improvedCode = codeBlocks[1].trim();
                const lines = improvedCode.split('\n');
                if (lines.length > 0 && /^[a-z#]+$/i.test(lines[0].trim())) {
                    lines.shift();
                    improvedCode = lines.join('\n');
                }

                const copyBtn = document.createElement('button');
                copyBtn.className = 'btn primary';
                copyBtn.style.marginTop = '10px';
                copyBtn.textContent = 'Copy Improved Code';
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(improvedCode).then(() => {
                        this.showToast('Improved Code Copied!');
                    });
                };
                contentEl.appendChild(copyBtn);
            }
        }

        if (hasDownloadPdf) {
            const pdfBtn = document.createElement('button');
            pdfBtn.className = 'btn secondary';
            pdfBtn.style.marginTop = '10px';
            pdfBtn.style.marginLeft = '10px';
            pdfBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg> Download PDF`;
            pdfBtn.onclick = () => this.downloadPDF(title, content, true);
            contentEl.appendChild(pdfBtn);
        }
    }

    downloadPDF(title, content = null, includeCode = false) {
        const element = document.createElement('div');
        element.style.padding = '40px';
        element.style.color = '#1a1a1e';
        element.style.background = '#ffffff';
        element.style.fontFamily = 'Inter, system-ui, sans-serif';

        const date = new Date().toLocaleDateString();
        const editorCode = includeCode ? this.editor.getValue() : '';
        const lang = document.getElementById('language-selector').value;

        let htmlContent = `
            <div style="border-bottom: 2px solid #5b5bd6; margin-bottom: 30px; padding-bottom: 10px; page-break-inside: avoid;">
                <h1 style="color: #5b5bd6; font-size: 24px; margin: 0;">Global Code Documentation</h1>
                <p style="color: #91919a; font-size: 12px; margin-top: 5px;">Generated on ${date}</p>
            </div>
            <h2 style="font-size: 20px; color: #1a1a1e; margin-bottom: 20px;">${title}</h2>
        `;

        if (includeCode && editorCode) {
            htmlContent += `
                <div style="margin: 20px 0; page-break-inside: avoid;">
                    <h3 style="font-size: 16px; color: #5b5bd6; margin-bottom: 10px;">Source Code (${lang})</h3>
                    <pre style="background: #f7f7f8; padding: 15px; border-radius: 8px; border: 1px solid #e5e5e8; font-family: 'JetBrains Mono', monospace; font-size: 12px; white-space: pre-wrap; overflow: hidden;"><code>${this.escapeHtml(editorCode)}</code></pre>
                </div>
            `;
        }

        if (content) {
            htmlContent += `
                <div style="margin-top: 20px;">
                    <h3 style="font-size: 16px; color: #5b5bd6; margin-bottom: 10px; page-break-after: avoid;">AI Documentation</h3>
                    <div style="line-height: 1.6; color: #555560; font-size: 14px;">
                        ${this.renderMarkdown(content, true)}
                    </div>
                </div>
            `;
        }

        htmlContent += `
            <div style="margin-top: 60px; border-top: 1px solid #e5e5e8; padding-top: 20px; font-size: 10px; color: #91919a; text-align: center; page-break-inside: avoid;">
                © 2026 Global Notes Workspace — Expert Coding Documentation
            </div>
        `;

        element.innerHTML = htmlContent;

        // Apply shared PDF styles for code blocks
        const styles = Array.from(element.querySelectorAll('pre')).forEach(pre => {
            pre.style.background = '#f7f7f8';
            pre.style.padding = '15px';
            pre.style.borderRadius = '8px';
            pre.style.border = '1px solid #e5e5e8';
            pre.style.overflowX = 'auto';
            pre.style.fontFamily = 'JetBrains Mono, monospace';
            pre.style.fontSize = '12px';
            pre.style.pageBreakInside = 'avoid';
        });

        const opt = {
            margin: 10,
            filename: `${title.replace(/\s+/g, '_').toLowerCase()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(element).save();
    }

    renderMarkdown(text, forPDF = false) {
        const codeBlocks = [];
        const placeholder = (i) => `__CODE_BLOCK_${i}__`;

        // 1. Extract code blocks with placeholders
        let processed = text.replace(/```([\s\S]*?)```/g, (match, code) => {
            let cleanCode = code.trim();
            const lines = cleanCode.split('\n');
            // Remove language tag if present (e.g., ```python)
            if (lines.length > 0 && /^[a-z#]+$/i.test(lines[0].trim())) {
                lines.shift();
                cleanCode = lines.join('\n');
            }

            const escaped = this.escapeHtml(cleanCode);
            codeBlocks.push(`
                <div class="code-block-container" style="position: relative; margin: 10px 0; page-break-inside: avoid;">
                    ${forPDF ? '' : `
                        <div class="code-block-actions" style="position: absolute; top: 6px; right: 6px; display: flex; gap: 6px; z-index: 10;">
                            <button class="chat-apply-btn" onclick="window.workspace.applyCodeToEditor(this)"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:3px; vertical-align:-1px;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> Apply to Editor</button>
                            <button class="chat-copy-btn" onclick="window.workspace.copyChatCode(this)">Copy</button>
                        </div>
                    `}
                    <pre><code>${escaped}</code></pre>
                </div>
            `);
            return placeholder(codeBlocks.length - 1);
        });

        // 2. Escape non-code text
        processed = this.escapeHtml(processed);

        // Helper for inline formatting (bold, italics, inline code)
        const formatInline = (str) => {
            return str
                .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/__(.*?)__/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/_(.*?)_/g, '<em>$1</em>');
        };

        // 3. Process line by line for headers, bullet lists, and paragraphs
        const lines = processed.split('\n');
        const outputLines = [];
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Skip code block placeholders from line-level formatting
            if (/___CODEBLOCK_\d+___/.test(line)) {
                if (inList) {
                    outputLines.push('</ul>');
                    inList = false;
                }
                outputLines.push(line);
                continue;
            }

            // Bullet list item (*, -, +)
            const listMatch = line.match(/^(\s*)([\*\-\+])\s+(.*)$/);
            if (listMatch) {
                if (!inList) {
                    inList = true;
                    outputLines.push('<ul style="margin: 8px 0; padding-left: 20px;">');
                }
                const content = formatInline(listMatch[3]);
                outputLines.push(`<li>${content}</li>`);
                continue;
            }

            if (inList) {
                outputLines.push('</ul>');
                inList = false;
            }

            // Header (# Header, ## Header, ### Header, etc.)
            const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const content = formatInline(headerMatch[2]);
                outputLines.push(`<h${level} style="margin: 12px 0 6px 0; font-weight: 600;">${content}</h${level}>`);
                continue;
            }

            // Blank line
            if (!trimmed) {
                outputLines.push('<div style="margin-bottom: 12px;"></div>');
                continue;
            }

            // Normal line
            outputLines.push(formatInline(line) + '<br>');
        }

        if (inList) {
            outputLines.push('</ul>');
        }

        processed = outputLines.join('\n');

        // 4. Re-insert code blocks with guaranteed vertical gaps
        codeBlocks.forEach((block, i) => {
            const blockWithGap = `<div style="margin: 20px 0;">${block}</div>`;
            processed = processed.replace(placeholder(i), blockWithGap);
        });

        return processed;
    }

    renderAIError(msg) {
        document.getElementById('ai-panel-title').textContent = "Error";
        document.getElementById('ai-panel-content').innerHTML = `
        <div class="error-msg">
          <strong>AI Request Failed:</strong><br>${msg}
        </div>
      `;
    }

    // --- AI Chat Assistant ---
    initChat() {
        // Create chat trigger
        const trigger = document.createElement('button');
        trigger.id = 'ai-chat-btn';
        trigger.className = 'ai-chat-trigger';
        trigger.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"></path></svg>';
        trigger.onclick = () => this.toggleChat();
        document.body.appendChild(trigger);

        // Create chat window
        const win = document.createElement('div');
        win.id = 'ai-chat-window';
        win.className = 'ai-chat-window';
        win.innerHTML = `
        <div class="chat-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="ai-status-dot"></div>
            <div style="font-size: 14px; font-weight:700; color:#fff; letter-spacing: 0.5px;">Global AI Copilot</div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="panel-close-btn" id="clear-chat" title="Clear Chat Thread" style="font-size:12px; padding: 2px 8px; display: inline-flex; align-items: center; gap: 4px;">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Clear
            </button>
            <button class="panel-close-btn" id="minimize-chat" style="font-size:16px;">−</button>
            <button class="panel-close-btn" id="close-chat">×</button>
          </div>
        </div>
        <div class="copilot-mode-bar" id="copilot-mode-bar">
          <button class="copilot-mode-btn active" data-mode="general">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="15" x2="8" y2="17"></line><line x1="16" y1="15" x2="16" y2="17"></line></svg>
            General
          </button>
          <button class="copilot-mode-btn" data-mode="optimizer">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            Optimizer
          </button>
          <button class="copilot-mode-btn" data-mode="debugger">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="6" width="8" height="14" rx="4"></rect><line x1="6" y1="18" x2="8" y2="16"></line><line x1="18" y1="18" x2="16" y2="16"></line><line x1="6" y1="11" x2="18" y2="11"></line><line x1="6" y1="6" x2="8" y2="8"></line><line x1="18" y1="6" x2="16" y2="8"></line></svg>
            Bug Hunter
          </button>
          <button class="copilot-mode-btn" data-mode="testGen">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg>
            Unit Tests
          </button>
        </div>
        <div class="chat-messages" id="chat-messages">
          <div class="message assistant welcome-card">
            <div class="welcome-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px; vertical-align:-2px;"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"></path></svg>
              Intelligent Code Assistant
            </div>
            <div class="welcome-desc">Ask questions, analyze logic, or optimize your code workspace in real-time.</div>
            
            <div class="quick-actions-grid">
              <div class="quick-action-card prompt-chip" data-prompt="Explain my current code">
                <div class="action-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </div>
                <div class="action-details">
                  <div class="action-title">Explain Code</div>
                  <div class="action-desc">Walkthrough execution logic</div>
                </div>
              </div>
              <div class="quick-action-card prompt-chip" data-prompt="How do I optimize my current code for time and space complexity?">
                <div class="action-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                </div>
                <div class="action-details">
                  <div class="action-title">Optimize Performance</div>
                  <div class="action-desc">Refine time & space Big-O</div>
                </div>
              </div>
              <div class="quick-action-card prompt-chip" data-prompt="Scan my current code for bugs, logic errors, or edge cases.">
                <div class="action-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <div class="action-details">
                  <div class="action-title">Find & Fix Bugs</div>
                  <div class="action-desc">Identify errors & leaks</div>
                </div>
              </div>
              <div class="quick-action-card prompt-chip" data-prompt="Write comprehensive unit tests for my current code.">
                <div class="action-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg>
                </div>
                <div class="action-details">
                  <div class="action-title">Generate Tests</div>
                  <div class="action-desc">Write robust test cases</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <input type="text" id="chat-input" class="chat-input" placeholder="Ask General Copilot...">
          <button id="send-chat" class="btn primary" style="padding: 0 12px; height: 35px;">▶</button>
        </div>
      `;
        const codeLayout = document.querySelector('.code-layout');
        if (codeLayout) {
            codeLayout.appendChild(win);
        } else {
            document.body.appendChild(win);
        }

        document.getElementById('close-chat').onclick = () => this.toggleChat(false);
        const minimizeBtn = document.getElementById('minimize-chat');
        if (minimizeBtn) minimizeBtn.onclick = () => this.toggleChat(false);
        const clearBtn = document.getElementById('clear-chat');
        if (clearBtn) clearBtn.onclick = () => this.clearChat();

        document.getElementById('send-chat').onclick = () => this.sendChatMessage();
        document.getElementById('chat-input').onkeydown = (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        };

        // Copilot Mode Selector listeners
        const modeBar = win.querySelector('#copilot-mode-bar');
        if (modeBar) {
            modeBar.addEventListener('click', (e) => {
                const btn = e.target.closest('.copilot-mode-btn');
                if (btn && btn.dataset.mode) {
                    modeBar.querySelectorAll('.copilot-mode-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.activeCopilotMode = btn.dataset.mode;
                    const modeObj = this.copilotModes[this.activeCopilotMode];
                    const chatInput = document.getElementById('chat-input');
                    if (chatInput && modeObj) {
                        chatInput.placeholder = `Ask ${modeObj.name}...`;
                    }
                    this.showToast(`Switched mode to ${modeObj ? modeObj.name : 'Copilot'}`);
                }
            });
        }

        // Chips listener
        win.addEventListener('click', (e) => {
            const chip = e.target.closest('.prompt-chip');
            if (chip) {
                let prompt = chip.dataset.prompt;
                if (prompt.includes("code") || prompt.includes("this")) {
                    prompt += `\n\nCode context:\n${this.editor ? this.editor.getValue() : ''}`;
                }
                this.sendChatMessage(prompt);
            }
        });
    }

    toggleChat(open = null) {
        const win = document.getElementById('ai-chat-window');
        const isCurrentlyOpen = win.classList.contains('open');
        const shouldOpen = open !== null ? open : !isCurrentlyOpen;

        if (shouldOpen) {
            win.classList.add('open');
            document.getElementById('chat-input').focus();
        } else {
            win.classList.remove('open');
        }

        if (this.editor) {
            setTimeout(() => {
                this.editor.refresh();
            }, 350);
        }
    }

    async sendChatMessage(overrideMsg = null) {
        const input = document.getElementById('chat-input');
        const message = overrideMsg || input.value.trim();
        if (!message) return;

        input.value = '';
        this.addMessageToChat('user', message);

        this.chatHistory.push({ role: "user", content: message });

        const loadingId = 'loading-' + Date.now();
        this.addMessageToChat('assistant', '<div class="ai-typing-indicator"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>', loadingId);

        try {
            const modeObj = this.copilotModes[this.activeCopilotMode] || this.copilotModes.general;
            const systemRule = modeObj.systemPrompt;
            let fullPrompt = `${systemRule}\n\nCONVERSATION HISTORY:\n`;

            this.chatHistory.filter(m => m.role !== 'system').forEach(msg => {
                const label = msg.role === 'user' ? 'USER' : 'ASSISTANT';
                fullPrompt += `[${label}]: ${msg.content}\n`;
            });

            // Context: Check if user selected code in editor
            let selectedCode = '';
            if (this.editor && typeof this.editor.getSelection === 'function') {
                selectedCode = this.editor.getSelection().trim();
            }

            const currentCode = this.editor ? this.editor.getValue() : '';
            if (selectedCode) {
                fullPrompt += `\n[SELECTED_CODE_IN_EDITOR]:\n${selectedCode}\n`;
            }
            fullPrompt += `\n[FULL_CODE_IN_EDITOR]:\n${currentCode}\n`;
            fullPrompt += `\n[ASSISTANT_NEXT_RESPONSE]: Provide a highly structured, professional answer with clean code snippets when applicable.`;

            const aiMsg = await generateTextWithGemini(fullPrompt);
            const loadingEl = document.getElementById(loadingId);

            if (aiMsg.includes("Deployment Error") || aiMsg.includes("error contacting the AI service")) {
                loadingEl.innerHTML = "Sorry, I couldn't reach the AI. Check your Gemini API key in config.js.";
                return;
            }

            this.chatHistory.push({ role: "assistant", content: aiMsg });

            // Render with markdown helper
            loadingEl.innerHTML = this.renderMarkdown(aiMsg, false);

            const messagesContainer = document.getElementById('chat-messages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (err) {
            document.getElementById(loadingId).innerHTML = "Error: " + err.message;
        }
    }

    addMessageToChat(role, content, id = null) {
        const container = document.getElementById('chat-messages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        if (id) msgDiv.id = id;
        msgDiv.innerHTML = content;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    applyCodeToEditor(btn) {
        const container = btn.closest('.code-block-container');
        if (!container) return;
        const code = container.querySelector('code').textContent;
        if (this.editor) {
            const selection = this.editor.getSelection ? this.editor.getSelection() : '';
            if (selection && selection.trim().length > 0) {
                this.editor.replaceSelection(code);
                this.showToast('Replaced selection with AI code!');
            } else {
                this.editor.setValue(code);
                this.showToast('Applied AI code to editor!');
            }
            const original = btn.textContent;
            btn.textContent = 'Applied! ✓';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = original;
                btn.classList.remove('copied');
            }, 2000);
        }
    }

    clearChat() {
        this.chatHistory = [
            {
                role: "system",
                content: this.copilotModes[this.activeCopilotMode]?.systemPrompt || this.copilotModes.general.systemPrompt
            }
        ];
        const container = document.getElementById('chat-messages');
        if (container) {
            container.innerHTML = `
            <div class="message assistant welcome-card">
                <div class="welcome-title">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px; vertical-align:-2px;"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"></path></svg>
                  Intelligent Code Assistant
                </div>
                <div class="welcome-desc">Ask questions, analyze logic, or optimize your code workspace in real-time.</div>
                
                <div class="quick-actions-grid">
                  <div class="quick-action-card prompt-chip" data-prompt="Explain my current code">
                    <div class="action-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </div>
                    <div class="action-details">
                      <div class="action-title">Explain Code</div>
                      <div class="action-desc">Walkthrough execution logic</div>
                    </div>
                  </div>
                  <div class="quick-action-card prompt-chip" data-prompt="How do I optimize my current code for time and space complexity?">
                    <div class="action-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    </div>
                    <div class="action-details">
                      <div class="action-title">Optimize Performance</div>
                      <div class="action-desc">Refine time & space Big-O</div>
                    </div>
                  </div>
                  <div class="quick-action-card prompt-chip" data-prompt="Scan my current code for bugs, logic errors, or edge cases.">
                    <div class="action-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <div class="action-details">
                      <div class="action-title">Find & Fix Bugs</div>
                      <div class="action-desc">Identify errors & leaks</div>
                    </div>
                  </div>
                  <div class="quick-action-card prompt-chip" data-prompt="Write comprehensive unit tests for my current code.">
                    <div class="action-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg>
                    </div>
                    <div class="action-details">
                      <div class="action-title">Generate Tests</div>
                      <div class="action-desc">Write robust test cases</div>
                    </div>
                  </div>
                </div>
            </div>
            `;
        }
        this.showToast('Chat history cleared!');
    }

    // --- Snippet Core Logic ---
    createNewSnippet() {
        const newId = Date.now().toString();
        const newSnippet = {
            id: newId,
            title: 'Untitled Snippet',
            code: '',
            language: 'javascript',
            updatedAt: new Date().toISOString()
        };
        this.activeSnippetId = newId;
        this.editor.setValue('');
        const selector = document.getElementById('language-selector');
        if (selector) {
            selector.value = 'javascript';
            selector.dispatchEvent(new Event('change'));
        }
        this.editor.setOption('mode', 'javascript');
        this.renderSnippetList();
    }

    async saveSnippet() {
        const code = this.editor.getValue();
        const language = document.getElementById('language-selector').value;
        let current = this.snippets.find(s => s.id === this.activeSnippetId);
        let title = current ? current.title : '';

        if (!current || title === 'Untitled Snippet') {
            const newTitle = await showPrompt('Save Snippet', title || 'My Awesome Code', 'Save');
            if (newTitle === null) return;
            title = newTitle || 'Untitled Snippet';
        }

        const snippetData = { id: this.activeSnippetId, title, code, language, updatedAt: new Date().toISOString() };
        const index = this.snippets.findIndex(s => s.id === this.activeSnippetId);
        if (index > -1) this.snippets[index] = snippetData;
        else this.snippets.unshift(snippetData);

        this.saveToStorage();
        this.renderSnippetList();
        this.showToast('Snippet Saved Successfully!');
    }

    async deleteSnippet(id, event) {
        if (event) event.stopPropagation();
        const confirmed = await showConfirm(
            "Delete Snippet",
            "Are you sure you want to delete this code snippet? This cannot be undone.",
            "Delete"
        );
        if (!confirmed) return;
        this.snippets = this.snippets.filter(s => s.id !== id);
        this.saveToStorage();
        if (this.activeSnippetId === id) this.createNewSnippet();
        else this.renderSnippetList();
        this.showToast('Snippet Deleted');
    }

    selectSnippet(id) {
        const snippet = this.snippets.find(s => s.id === id);
        if (!snippet) return;
        this.activeSnippetId = id;
        this.editor.setValue(snippet.code);
        const selector = document.getElementById('language-selector');
        if (selector) {
            selector.value = snippet.language;
            selector.dispatchEvent(new Event('change'));
        }
        this.updateEditorSettings(snippet.language);
        this.renderSnippetList();
    }

    updateEditorHeaderTab(title, langKey) {
        const titleEl = document.getElementById('editor-tab-title');
        const langEl = document.getElementById('editor-tab-lang');
        const iconEl = document.getElementById('editor-tab-icon');
        const langObj = languageMap[langKey] || { name: langKey || 'JavaScript' };
        
        if (titleEl) titleEl.textContent = title || 'Untitled Snippet';
        if (langEl) langEl.textContent = langObj.name ? langObj.name.toUpperCase() : 'JAVASCRIPT';
        if (iconEl) {
            iconEl.style.display = 'inline-flex';
            iconEl.style.alignItems = 'center';
            iconEl.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
        }
    }

    updateEditorSettings(lang) {
        const settings = languageMap[lang];
        if (this.editor && settings) {
            this.editor.setOption('mode', settings.mode);
            this.editor.setOption('indentUnit', settings.indent || 4);
            this.editor.setOption('tabSize', settings.indent || 4);
            this.editor.setOption('indentWithTabs', !!settings.useTabs);
        }
        const currentSnippet = this.snippets.find(s => s.id === this.activeSnippetId);
        this.updateEditorHeaderTab(currentSnippet ? currentSnippet.title : 'Untitled Snippet', lang);
    }

    updateActiveSnippetMeta(updates) {
        const index = this.snippets.findIndex(s => s.id === this.activeSnippetId);
        if (index > -1) {
            this.snippets[index] = { ...this.snippets[index], ...updates };
            this.saveToStorage();
            this.renderSnippetList();
        }
    }

    renderSnippetList(query = '') {
        const listEl = document.getElementById('snippets-list');
        listEl.innerHTML = '';
        const filtered = this.snippets.filter(s => {
            const q = query.toLowerCase();
            return s.title.toLowerCase().includes(q) || s.language.toLowerCase().includes(q);
        });
        filtered.forEach(snippet => {
            const li = document.createElement('li');
            li.className = `snippet-card ${snippet.id === this.activeSnippetId ? 'active' : ''}`;
            li.onclick = () => this.selectSnippet(snippet.id);
            const langInfo = languageMap[snippet.language] || { name: snippet.language || 'Plain Text' };
            li.innerHTML = `
                <div class="snippet-header">
                  <span class="lang-badge badge-${snippet.language}">${langInfo.name}</span>
                  <button class="delete-snippet-btn" title="Delete">×</button>
                </div>
                <h3 class="snippet-title">${this.escapeHtml(snippet.title)}</h3>
                <p class="snippet-preview">${this.escapeHtml(snippet.code.substring(0, 100))}</p>
            `;
            li.querySelector('.delete-snippet-btn').onclick = (e) => this.deleteSnippet(snippet.id, e);
            listEl.appendChild(li);
        });
    }

    copyToClipboard() {
        const code = this.editor.getValue();
        navigator.clipboard.writeText(code).then(() => {
            this.showToast('Code Copied!');
            const btn = document.getElementById('copy-code-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = originalText, 2000);
        });
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    copyChatCode(btn) {
        const container = btn.closest('.code-block-container');
        const code = container.querySelector('code').textContent;
        navigator.clipboard.writeText(code).then(() => {
            const original = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = original;
                btn.classList.remove('copied');
            }, 2000);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.addEventListener('DOMContentLoaded', () => { window.workspace = new CodeWorkspace(); });
