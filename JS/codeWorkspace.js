/**
 * Code Workspace Module for Antigravity with AI Features
 * 
 * PASTE YOUR OPENAI API KEY BELOW:
 */

const AI_CONFIG = {
    apiKey: "YOUR_OPENAI_API_KEY_HERE",   // ← user replaces this once
    model: "gpt-4o-mini",
    maxTokens: 1500,
    baseUrl: "https://api.openai.com/v1/chat/completions"
};

const STORAGE_KEY = 'antigravity_snippets';

const languageMap = {
    javascript: { name: 'JavaScript', mode: 'javascript' },
    python: { name: 'Python', mode: 'python' },
    java: { name: 'Java', mode: 'text/x-java' },
    cpp: { name: 'C++', mode: 'text/x-c++src' },
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
            { role: "system", content: "You are a helpful programming assistant embedded in a code editor called Antigravity. Help users understand, debug, and improve their code. Be concise, practical, and friendly. Format code in your responses using backtick blocks." }
        ];

        this.init();
    }

    init() {
        this.initEditor();
        this.renderSnippetList();
        this.attachEventListeners();
        this.initChat();
        this.checkAPIKey();
        this.createNewSnippet();
    }

    checkAPIKey() {
        if (AI_CONFIG.apiKey === "YOUR_OPENAI_API_KEY_HERE") {
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

        // AI Feature Buttons
        document.getElementById('ai-explain-btn').addEventListener('click', () => this.handleAIRequest('explain'));
        document.getElementById('ai-docs-btn').addEventListener('click', () => this.handleAIRequest('docs'));
        document.getElementById('ai-improve-btn').addEventListener('click', () => this.handleAIRequest('improve'));
    }

    // --- AI Shared Logic ---
    async callAI(systemPrompt, userContent) {
        if (AI_CONFIG.apiKey === "YOUR_OPENAI_API_KEY_HERE") throw new Error("API key missing");

        const response = await fetch(AI_CONFIG.baseUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AI_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: AI_CONFIG.model,
                max_tokens: AI_CONFIG.maxTokens,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent }
                ]
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "AI request failed");
        return data.choices[0].message.content;
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
        }
    }

    renderAIResult(title, content, hasImprovedCode = false) {
        document.getElementById('ai-panel-title').textContent = title;
        const contentEl = document.getElementById('ai-panel-content');

        // Basic Markdown-ish rendering
        let html = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '<p></p>')
            .replace(/\n/g, '<br>');

        // Extract code blocks
        const codeBlockRegex = /```([\s\S]*?)```/g;
        html = html.replace(codeBlockRegex, (match, code) => {
            return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
        });

        contentEl.innerHTML = html;

        if (hasImprovedCode) {
            const codeBlocks = content.match(/```([\s\S]*?)```/);
            if (codeBlocks) {
                const improvedCode = codeBlocks[1].trim();
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
            const response = await fetch(AI_CONFIG.baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${AI_CONFIG.apiKey}`
                },
                body: JSON.stringify({
                    model: AI_CONFIG.model,
                    messages: this.chatHistory
                })
            });

            const data = await response.json();
            const loadingEl = document.getElementById(loadingId);

            if (!response.ok) {
                loadingEl.innerHTML = "Sorry, I couldn't reach the AI. Check your API key and internet connection.";
                return;
            }

            const aiMsg = data.choices[0].message.content;
            this.chatHistory.push({ role: "assistant", content: aiMsg });

            // Render with simple markdown code format
            loadingEl.innerHTML = this.escapeHtml(aiMsg).replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

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
