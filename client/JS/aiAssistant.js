import { generateTextWithGemini } from './geminiAPI.js';
import { showToast, escapeHtml } from './utilities.js';

export function wireAIAssistant(state, callbacks) {
    const generateBtn = document.getElementById("ai-generate-btn");
    const promptInput = document.getElementById("ai-sidebar-prompt");
    const contentEditor = document.getElementById("content");

    if (!generateBtn || !promptInput) return;

    generateBtn.addEventListener("click", async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        const originalText = generateBtn.textContent;
        generateBtn.textContent = "⏳ Thinking...";
        generateBtn.disabled = true;
        promptInput.disabled = true;

        try {
            const text = await generateTextWithGemini(prompt);
            insertTextAtCursor(text);
            promptInput.value = "";
        } catch (err) {
            showToast("AI generation failed. Please try again.", "error");
        } finally {
            generateBtn.textContent = originalText;
            generateBtn.disabled = false;
            promptInput.disabled = false;
        }
    });

    function insertTextAtCursor(text) {
        if (!contentEditor) return;
        contentEditor.focus();

        const formattedHtml = parseMarkdownToHtml(text);

        try {
            document.execCommand('insertHTML', false, formattedHtml);
        } catch (e) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            range.deleteContents();

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = formattedHtml;
            const fragment = document.createDocumentFragment();
            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }
            range.insertNode(fragment);
        }
    }
}

export function parseMarkdownToHtml(text) {
    if (!text) return '';

    // Extract code blocks with unique placeholders
    const codeBlocks = [];
    const placeholder = (i) => `___CODEBLOCK_${i}___`;

    let processed = text.replace(/```([\s\S]*?)```/g, (match, code) => {
        const lines = code.split('\n');
        let cleanCode = code;
        if (lines.length > 0 && /^[a-z#]+$/i.test(lines[0].trim())) {
            lines.shift();
            cleanCode = lines.join('\n');
        }
        const escaped = escapeHtml(cleanCode);
        codeBlocks.push(`<pre style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 6px; font-family: monospace; overflow-x: auto;"><code>${escaped}</code></pre>`);
        return placeholder(codeBlocks.length - 1);
    });

    processed = escapeHtml(processed);

    const formatInline = (str) => {
        return str
            .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>');
    };

    const lines = processed.split('\n');
    const outputLines = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (/___CODEBLOCK_\d+___/.test(line)) {
            if (inList) {
                outputLines.push('</ul>');
                inList = false;
            }
            outputLines.push(line);
            continue;
        }

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

        const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const content = formatInline(headerMatch[2]);
            outputLines.push(`<h${level} style="margin: 10px 0 4px 0; font-weight: 600;">${content}</h${level}>`);
            continue;
        }

        if (!trimmed) {
            outputLines.push('<br>');
            continue;
        }

        outputLines.push(formatInline(line) + '<br>');
    }

    if (inList) {
        outputLines.push('</ul>');
    }

    processed = outputLines.join('');

    codeBlocks.forEach((block, i) => {
        processed = processed.replace(placeholder(i), block);
    });

    return processed;
}
