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

        const paragraphs = text.split('\n').filter(p => p.trim() !== '');

        // Use insertText (safe) for single lines, safe HTML insertion for multi-line
        try {
            if (paragraphs.length <= 1) {
                document.execCommand('insertText', false, text);
            } else {
                // Escape HTML entities in each paragraph to prevent XSS
                const safeHtml = paragraphs.map(p => escapeHtml(p)).join('<br>');
                document.execCommand('insertHTML', false, safeHtml);
            }
        } catch (e) {
            // Fallback: DOM-based insertion with text nodes (inherently safe)
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            range.deleteContents();

            const fragment = document.createDocumentFragment();
            paragraphs.forEach((p, index) => {
                fragment.appendChild(document.createTextNode(p));
                if (index < paragraphs.length - 1) {
                    fragment.appendChild(document.createElement('br'));
                }
            });
            range.insertNode(fragment);
        }
    }
}
