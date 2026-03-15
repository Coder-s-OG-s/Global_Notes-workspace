import config from './config.js';
import { generateTextWithGemini } from './geminiAPI.js';

const STORAGE_KEY = 'antigravity_snippets';

const languageMap = {
    javascript: { name: 'JavaScript', mode: 'javascript' },
    python: { name: 'Python', mode: 'python' },
    python3: { name: 'Python3', mode: 'python' },
    java: { name: 'Java', mode: 'text/x-java' },
    cpp: { name: 'C++', mode: 'text/x-c++src' },
    csharp: { name: 'C#', mode: 'text/x-csharp' },
    c: { name: 'C', mode: 'text/x-csrc' },
    go: { name: 'Go', mode: 'text/x-go' },
    kotlin: { name: 'Kotlin', mode: 'text/x-kotlin' },
    swift: { name: 'Swift', mode: 'text/x-swift' },
    rust: { name: 'Rust', mode: 'text/x-rustsrc' },
    ruby: { name: 'Ruby', mode: 'text/x-ruby' },
    php: { name: 'PHP', mode: 'text/x-php' },
    dart: { name: 'Dart', mode: 'application/dart' },
    scala: { name: 'Scala', mode: 'text/x-scala' },
    elixir: { name: 'Elixir', mode: 'text/x-elixir' },
    erlang: { name: 'Erlang', mode: 'text/x-erlang' },
    racket: { name: 'Racket', mode: 'text/x-scheme' },
    htmlmixed: { name: 'HTML', mode: 'htmlmixed' },
    css: { name: 'CSS', mode: 'css' },
    sql: { name: 'SQL', mode: 'text/x-sql' },
    typescript: { name: 'TypeScript', mode: 'text/typescript' }
};

class CodeWorkspace {
    constructor() {
        this.snippets = this.loadSnippets();
        this.activeSnippetId = null;
        this.editor = null;
        this.chatHistory = [
            { role: "system", content: "You are a helpful programming assistant embedded in a code editor called Global Code Workspace. Help users understand, debug, and improve their code. Be concise, practical, and friendly. Format code in your responses using backtick blocks." }
        ];
        this.isCustomHeight = false;

        this.init();
    }

    init() {
        this.initEditor();
        this.renderSnippetList();
        this.attachEventListeners();
        this.setupCustomLanguageSelect();
        this.initChat();
        this.checkAPIKey();
        this.createNewSnippet();
    }

    checkAPIKey() {
        const apiKey = config.GEMINI_API_KEY;
        if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY" || apiKey.includes("YOUR")) {
            document.getElementById('api-warning').classList.remove('hidden');
            ['ai-explain-btn', 'ai-docs-btn', 'ai-improve-btn', 'ai-chat-btn'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.disabled = true;
                    btn.classList.add('is-locked');
                    btn.title = "Add API key to enable AI features";

                    // Add a small lock badge
                    const badge = document.createElement('div');
                    badge.className = 'lock-badge';
                    badge.innerHTML = '🔒';
                    btn.appendChild(badge);
                }
            });
        }
    }

    initEditor() {
        const editorTarget = document.getElementById('editor-target');
        if (!editorTarget) return;

        this.editor = CodeMirror(editorTarget, {
            lineNumbers: true,
            theme: 'dracula',
            mode: 'javascript',
            tabSize: 2,
            indentWithTabs: false,
            autoCloseBrackets: true,
            autoCloseTags: true,
            matchBrackets: true,

            viewportMargin: Infinity
        });

        this.editor.setOption("extraKeys", {
            "Tab": (cm) => {
                const spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
                cm.replaceSelection(spaces);
            },
            "Ctrl-S": () => this.saveSnippet(),
            "Cmd-S": () => this.saveSnippet()
        });
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
            const mode = languageMap[lang].mode;
            this.editor.setOption('mode', mode);
            if (this.activeSnippetId) {
                this.updateActiveSnippetMeta({ language: lang });
            }
        });

        document.getElementById('save-snippet-btn').addEventListener('click', () => this.saveSnippet());
        document.getElementById('new-snippet-btn').addEventListener('click', () => this.createNewSnippet());
        document.getElementById('copy-code-btn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('snippet-search').addEventListener('input', (e) => this.renderSnippetList(e.target.value));

        document.getElementById('close-panel-btn').addEventListener('click', () => this.togglePanel(false));
        document.getElementById('expand-panel-btn').addEventListener('click', () => this.toggleExpand());

        // Resizer Logic
        const resizer = document.getElementById('ai-panel-resizer');
        resizer.addEventListener('mousedown', (e) => this.startResizing(e));

        // AI Feature Buttons
        document.getElementById('ai-explain-btn').addEventListener('click', () => this.handleAIRequest('explain'));
        document.getElementById('ai-docs-btn').addEventListener('click', () => this.handleAIRequest('docs'));
        document.getElementById('ai-improve-btn').addEventListener('click', () => this.handleAIRequest('improve'));
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
            const lang = languageMap[document.getElementById('language-selector').value].name;
            let response = '';

            if (type === 'explain') {
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
                this.renderAIResult("Generated Documentation", response);
            } else if (type === 'improve') {
                response = await this.callAI(
                    "You are a senior software engineer doing a code review. Analyze the code and respond with exactly two sections:\n**Suggestions:**\n[numbered list of specific improvements — readability, performance, best practices, error handling. Be concrete, not generic. Max 6 suggestions.]\n**Improved Code:**\n[the full rewritten version of the code with all improvements applied, inside a code block]",
                    `Language: ${lang}\n\nCode:\n${code}`
                );
                this.renderAIResult("Code Improvements", response, true);
            }
        } catch (err) {
            this.renderAIError(err.message);
        } finally {
            this.setAIButtonsLoading(false);
        }
    }

    setAIButtonsLoading(isLoading) {
        const btnIds = ['ai-explain-btn', 'ai-docs-btn', 'ai-improve-btn'];
        btnIds.forEach(id => {
            const btn = document.getElementById(id);
            btn.disabled = isLoading;
            if (isLoading) {
                btn.dataset.original = btn.innerHTML;
                btn.innerHTML = '<span class="ai-spinner"></span>';
            } else if (btn.dataset.original) {
                btn.innerHTML = btn.dataset.original;
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

    renderAIResult(title, content, hasImprovedCode = false) {
        document.getElementById('ai-panel-title').textContent = title;
        const contentEl = document.getElementById('ai-panel-content');

        contentEl.innerHTML = this.renderMarkdown(content);

        if (hasImprovedCode) {
            const codeBlocks = content.match(/```([\s\S]*?)```/);
            if (codeBlocks) {
                let improvedCode = codeBlocks[1].trim();
                // Strip language tag (e.g., "python") from first line if present
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
    }

    renderMarkdown(text) {
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
            codeBlocks.push(`<pre><code>${this.escapeHtml(cleanCode)}</code></pre>`);
            return placeholder(codeBlocks.length - 1);
        });

        // 2. Escape non-code text and format
        processed = this.escapeHtml(processed)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '<p></p>')
            .replace(/\n/g, '<br>');

        // 3. Re-insert code blocks
        codeBlocks.forEach((block, i) => {
            processed = processed.replace(placeholder(i), block);
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
        trigger.innerHTML = '✦';
        trigger.onclick = () => this.toggleChat();
        document.body.appendChild(trigger);

        // Create chat window
        const win = document.createElement('div');
        win.id = 'ai-chat-window';
        win.className = 'ai-chat-window';
        win.innerHTML = `
        <div class="chat-header">
          <div style="font-size: 14px; font-weight:600; color:#fff;">✦ AI Assistant</div>
          <div style="display:flex; gap:8px;">
            <button class="panel-close-btn" style="font-size:16px;">−</button>
            <button class="panel-close-btn" id="close-chat">×</button>
          </div>
        </div>
        <div class="chat-messages" id="chat-messages">
          <div class="message assistant">
            Welcome! Ask me anything about your code or programming.
            <div class="suggested-chips">
              <span class="prompt-chip" data-prompt="Explain my current code">💡 Explain current code</span>
              <span class="prompt-chip" data-prompt="How do I optimize this?">⚡ Optimize code</span>
              <span class="prompt-chip" data-prompt="Convert to Python">🐍 Convert to Python</span>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <input type="text" id="chat-input" class="chat-input" placeholder="Type a question...">
          <button id="send-chat" class="btn primary" style="padding: 0 12px; height: 35px;">▶</button>
        </div>
      `;
        document.body.appendChild(win);

        document.getElementById('close-chat').onclick = () => this.toggleChat(false);
        document.getElementById('send-chat').onclick = () => this.sendChatMessage();
        document.getElementById('chat-input').onkeydown = (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        };

        // Chips listener
        win.addEventListener('click', (e) => {
            if (e.target.classList.contains('prompt-chip')) {
                let prompt = e.target.dataset.prompt;
                if (prompt.includes("code") || prompt.includes("this")) {
                    prompt += `\n\nCode context:\n${this.editor.getValue()}`;
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
    }

    async sendChatMessage(overrideMsg = null) {
        const input = document.getElementById('chat-input');
        const message = overrideMsg || input.value.trim();
        if (!message) return;

        input.value = '';
        this.addMessageToChat('user', message);

        this.chatHistory.push({ role: "user", content: message });

        const loadingId = 'loading-' + Date.now();
        this.addMessageToChat('assistant', '<span class="ai-spinner"></span>', loadingId);

        try {
            // Simple prompt concatenation for Gemini
            let fullPrompt = "You are a helpful programming assistant for Global Code Workspace.\n\nChat History:\n";
            this.chatHistory.forEach(msg => {
                fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            });

            const aiMsg = await generateTextWithGemini(fullPrompt);
            const loadingEl = document.getElementById(loadingId);

            if (aiMsg.includes("Deployment Error") || aiMsg.includes("error contacting the AI service")) {
                loadingEl.innerHTML = "Sorry, I couldn't reach the AI. Check your Gemini API key in config.js.";
                return;
            }

            this.chatHistory.push({ role: "assistant", content: aiMsg });

            // Render with the new markdown helper
            loadingEl.innerHTML = this.renderMarkdown(aiMsg);

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
        document.getElementById('language-selector').value = 'javascript';
        this.editor.setOption('mode', 'javascript');
        this.renderSnippetList();
    }

    saveSnippet() {
        const code = this.editor.getValue();
        const language = document.getElementById('language-selector').value;
        let current = this.snippets.find(s => s.id === this.activeSnippetId);
        let title = current ? current.title : '';

        if (!current || title === 'Untitled Snippet') {
            const newTitle = prompt('Enter snippet title:', title || 'My Awesome Code');
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

    deleteSnippet(id, event) {
        if (event) event.stopPropagation();
        if (!confirm('Are you sure you want to delete this snippet?')) return;
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
        document.getElementById('language-selector').value = snippet.language;
        this.editor.setOption('mode', languageMap[snippet.language].mode);
        this.renderSnippetList();
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
            const langInfo = languageMap[snippet.language];
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.addEventListener('DOMContentLoaded', () => { window.workspace = new CodeWorkspace(); });
