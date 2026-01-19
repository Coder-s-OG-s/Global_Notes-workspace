
import { generateTextWithGemini } from './geminiAPI.js';

// Flag to prevent multiple event listeners
let isWired = false;

export function wireMailFeature() {
    // Retry mechanism to ensure DOM elements are available
    function tryWireMailFeature(retries = 5, delay = 100) {
        // New Sidebar IDs
        const sendBtn = document.getElementById("sidebar-mail-send");
        const senderInput = document.getElementById("sidebar-mail-sender");
        const recipientInput = document.getElementById("sidebar-mail-recipient");
        const promptInput = document.getElementById("sidebar-mail-prompt");

        if (!sendBtn || !senderInput || !recipientInput || !promptInput) {
            if (retries > 0) {
                console.log(`Mail feature elements not found, retrying... (${retries} attempts left)`);
                setTimeout(() => tryWireMailFeature(retries - 1, delay), delay);
                return;
            } else {
                console.error('Mail feature elements not found after retries!');
                return;
            }
        }

        // Prevent duplicate wiring
        if (isWired) {
            console.log('Mail feature already wired, skipping...');
            return;
        }

        console.log('Mail feature wired successfully!');
        wireMailFeatureHandlers(sendBtn, senderInput, recipientInput, promptInput);
        isWired = true;
    }

    // Start trying to wire the feature
    tryWireMailFeature();
}

/**
 * Validates email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function wireMailFeatureHandlers(sendBtn, senderInput, recipientInput, promptInput) {
    // Generate and Open Mail
    sendBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        console.log('Mail button clicked!');
        const sender = senderInput.value.trim();
        const recipient = recipientInput.value.trim();
        const prompt = promptInput.value.trim();

        // Validation
        if (!sender) {
            alert("Please enter your email address.");
            senderInput.focus();
            return;
        }

        if (!isValidEmail(sender)) {
            alert("Please enter a valid email address for sender.");
            senderInput.focus();
            return;
        }

        if (!recipient) {
            alert("Please enter the recipient's email address.");
            recipientInput.focus();
            return;
        }

        if (!isValidEmail(recipient)) {
            alert("Please enter a valid email address for recipient.");
            recipientInput.focus();
            return;
        }

        if (!prompt) {
            alert("Please enter a prompt describing the mail you want to write.");
            promptInput.focus();
            return;
        }

        // Generate proper email from prompt using Gemini
        let subject, body;
        try {
            const fullPrompt = `Generate a professional email based on the following details. The output should be only the email, with "Subject: " on the first line, then a blank line, and then the email body.

From: ${sender}
To: ${recipient}
Prompt: ${prompt}`;

            const generatedEmail = await generateTextWithGemini(fullPrompt);

            // Parse the output
            const lines = generatedEmail.split('\n');
            if (lines.length > 1 && lines[0].toLowerCase().startsWith('subject:')) {
                subject = lines[0].substring('subject:'.length).trim();
                body = lines.slice(2).join('\n');
            } else {
                // Fallback if the format is not as expected
                console.warn("Gemini response for email was not in the expected format. Using fallback.");
                subject = "Email regarding your prompt";
                body = generatedEmail;
            }

        } catch (error) {
            console.error('Error generating email with Gemini:', error);
            alert('Error generating email. Please try again.');
            return;
        }


        // Truncate body if needed for URL length limits
        let finalBody = body || '';
        const maxBodyLength = 2000; // Conservative limit
        if (finalBody.length > maxBodyLength) {
            finalBody = finalBody.substring(0, maxBodyLength) + '\n\n[Email body truncated due to length limits]';
        }

        // Construct Gmail URL
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject || 'No Subject')}&body=${encodeURIComponent(finalBody)}`;

        console.log('Generated Gmail URL:', gmailUrl.substring(0, 150) + '...');

        // Open Gmail in a new tab
        try {
            window.open(gmailUrl, '_blank');

            // Small delay before clearing to ensure new tab opens
            setTimeout(() => {
                senderInput.value = "";
                recipientInput.value = "";
                promptInput.value = "";
            }, 200);
        } catch (e) {
            console.error('Error opening Gmail:', e);
            alert('Unable to open Gmail. Please check your browser\'s pop-up blocker settings.');
        }
    });
}
