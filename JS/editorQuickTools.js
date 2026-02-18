/**
 * editorQuickTools.js
 * Wires the AI and Mail quick-access popovers in the editor bar.
 * These are separate from the sidebar tools and use their own IDs.
 */

import { generateTextWithGemini } from './geminiAPI.js';

export function wireEditorQuickTools() {
    // ── Popover toggle logic ──────────────────────────────────────────────────

    const triggers = [
        { triggerId: 'editor-ai-trigger', popoverId: 'editor-ai-popover' },
        { triggerId: 'editor-mail-trigger', popoverId: 'editor-mail-popover' },
    ];

    triggers.forEach(({ triggerId, popoverId }) => {
        const trigger = document.getElementById(triggerId);
        const popover = document.getElementById(popoverId);
        if (!trigger || !popover) return;

        // Toggle on button click
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = popover.classList.contains('open');

            // Close all popovers first
            closeAllPopovers();

            if (!isOpen) {
                popover.classList.add('open');
                trigger.classList.add('active');
                // Focus first input inside
                const firstInput = popover.querySelector('input, textarea');
                if (firstInput) setTimeout(() => firstInput.focus(), 50);
            }
        });
    });

    // Close buttons inside popovers
    document.querySelectorAll('.editor-tool-popover-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllPopovers();
        });
    });

    // Click outside closes all popovers
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.editor-quick-tool')) {
            closeAllPopovers();
        }
    });

    // Escape key closes all
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllPopovers();
    });

    function closeAllPopovers() {
        document.querySelectorAll('.editor-tool-popover.open').forEach(p => p.classList.remove('open'));
        // Handle all pill/trigger button types
        document.querySelectorAll('.editor-tool-trigger.active, .ai-pill-btn.active, .mail-pill-btn.active').forEach(t => t.classList.remove('active'));
    }

    // ── AI Generate ───────────────────────────────────────────────────────────

    const aiGenerateBtn = document.getElementById('editor-ai-generate-btn');
    const aiPromptInput = document.getElementById('editor-ai-prompt');
    const contentEditor = document.getElementById('content');

    if (aiGenerateBtn && aiPromptInput) {
        aiGenerateBtn.addEventListener('click', async () => {
            const prompt = aiPromptInput.value.trim();
            if (!prompt) {
                aiPromptInput.focus();
                return;
            }

            // Loading state
            const originalHTML = aiGenerateBtn.innerHTML;
            aiGenerateBtn.innerHTML = '⏳ Thinking...';
            aiGenerateBtn.disabled = true;
            aiPromptInput.disabled = true;

            try {
                const text = await generateTextWithGemini(prompt);
                insertTextAtCursor(text, contentEditor);
                aiPromptInput.value = '';
                closeAllPopovers();
            } catch (err) {
                console.error('AI Generation failed', err);
                alert('Failed to generate text. Please check the console for details.');
            } finally {
                aiGenerateBtn.innerHTML = originalHTML;
                aiGenerateBtn.disabled = false;
                aiPromptInput.disabled = false;
            }
        });
    }

    // ── Mail Generate ─────────────────────────────────────────────────────────

    const mailGenerateBtn = document.getElementById('editor-mail-generate-btn');
    const mailSenderInput = document.getElementById('editor-mail-sender');
    const mailRecipInput = document.getElementById('editor-mail-recipient');
    const mailPromptInput = document.getElementById('editor-mail-prompt');

    if (mailGenerateBtn && mailSenderInput && mailRecipInput && mailPromptInput) {
        mailGenerateBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const sender = mailSenderInput.value.trim();
            const recipient = mailRecipInput.value.trim();
            const prompt = mailPromptInput.value.trim();

            if (!sender) { alert('Please enter your email address.'); mailSenderInput.focus(); return; }
            if (!isValidEmail(sender)) { alert('Please enter a valid sender email.'); mailSenderInput.focus(); return; }
            if (!recipient) { alert('Please enter the recipient email.'); mailRecipInput.focus(); return; }
            if (!isValidEmail(recipient)) { alert('Please enter a valid recipient email.'); mailRecipInput.focus(); return; }
            if (!prompt) { alert('Please describe what the email is about.'); mailPromptInput.focus(); return; }

            const originalHTML = mailGenerateBtn.innerHTML;
            mailGenerateBtn.innerHTML = '⏳ Drafting...';
            mailGenerateBtn.disabled = true;

            try {
                const fullPrompt = `Generate a professional email based on the following details. The output should be only the email, with "Subject: " on the first line, then a blank line, and then the email body.\n\nFrom: ${sender}\nTo: ${recipient}\nPrompt: ${prompt}`;

                const generatedEmail = await generateTextWithGemini(fullPrompt);

                const lines = generatedEmail.split('\n');
                let subject, body;
                if (lines.length > 1 && lines[0].toLowerCase().startsWith('subject:')) {
                    subject = lines[0].substring('subject:'.length).trim();
                    body = lines.slice(2).join('\n');
                } else {
                    subject = 'Email regarding your prompt';
                    body = generatedEmail;
                }

                let finalBody = body || '';
                if (finalBody.length > 2000) finalBody = finalBody.substring(0, 2000) + '\n\n[Truncated]';

                const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalBody)}`;
                window.open(gmailUrl, '_blank');

                setTimeout(() => {
                    mailSenderInput.value = '';
                    mailRecipInput.value = '';
                    mailPromptInput.value = '';
                    closeAllPopovers();
                }, 200);

            } catch (err) {
                console.error('Mail generation failed', err);
                alert('Error generating email. Please try again.');
            } finally {
                mailGenerateBtn.innerHTML = originalHTML;
                mailGenerateBtn.disabled = false;
            }
        });
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function insertTextAtCursor(text, contentEditor) {
    if (!contentEditor) return;
    contentEditor.focus();
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    try {
        if (paragraphs.length <= 1) {
            document.execCommand('insertText', false, text);
        } else {
            document.execCommand('insertHTML', false, paragraphs.join('<br>'));
        }
    } catch (e) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const fragment = document.createDocumentFragment();
        paragraphs.forEach((p, i) => {
            fragment.appendChild(document.createTextNode(p));
            if (i < paragraphs.length - 1) fragment.appendChild(document.createElement('br'));
        });
        range.insertNode(fragment);
    }
}
