import { generateTextWithGemini } from "./geminiAPI.js";
import { insertHtmlAtCursor } from "./formattingToolbar.js";

const $ = (selector) => document.querySelector(selector);

// Lists for concept detection
const LANGUAGES = [
    "javascript", "typescript", "python", "java", "c++", "rust", "go",
    "swift", "kotlin", "php", "html", "css", "sql", "ruby", "c#"
];

const CONCEPTS = [
    "recursion", "dynamic programming", "binary search", "linked list",
    "stack", "queue", "tree", "graph", "sorting", "big o", "complexity",
    "inheritance", "polymorphism", "encapsulation", "abstraction",
    "database", "rest api", "hooks", "state", "props"
];

let globalState = null;
let globalCallbacks = null;
let recognition = null;
let isRecording = false;
let currentTranscript = "";

/**
 * Initializes the Study Assistant sidebar and listeners.
 */
export function initStudyAssistant(state, callbacks) {
    globalState = state;
    globalCallbacks = callbacks;

    setupSidebarToggle();
    setupTabs();
    setupRecorder();
    setupContentListener();
    setupAIScanButton();
}

/**
 * Handles sidebar visibility toggling.
 */
function setupSidebarToggle() {
    const toggleBtn = $("#toggle-study-assistant");
    const sidebar = $("#study-assistant-sidebar");

    if (!toggleBtn || !sidebar) return;

    // Load saved state (default to collapsed)
    const savedState = localStorage.getItem("studyAssistantCollapsed");
    if (savedState === "false") {
        sidebar.classList.remove("collapsed");
        toggleBtn.classList.add("active");
    } else {
        sidebar.classList.add("collapsed");
        toggleBtn.classList.remove("active");
    }

    toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        toggleBtn.classList.toggle("active");
        localStorage.setItem("studyAssistantCollapsed", sidebar.classList.contains("collapsed"));
    });
}

/**
 * Handles sidebar tab navigation.
 */
function setupTabs() {
    const tabs = document.querySelectorAll(".assistant-tab");
    const panels = document.querySelectorAll(".assistant-panel");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));

            tab.classList.add("active");
            const targetId = `panel-${tab.dataset.tab}`;
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add("active");
            }
        });
    });
}

/**
 * Hooks up Speech Recognition & audio recorder controls.
 */
function setupRecorder() {
    const btnRecord = $("#btn-record-lecture");
    const btnStop = $("#btn-stop-lecture");
    const btnExtract = $("#btn-extract-glossary");
    const statusEl = $("#recorder-status");
    const visualizer = $("#recorder-visualizer");
    const transcriptTextarea = $("#lecture-transcript");

    if (!btnRecord || !btnStop || !btnExtract || !statusEl || !visualizer || !transcriptTextarea) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        statusEl.textContent = "Speech Recognition not supported in this browser.";
        btnRecord.disabled = true;
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        isRecording = true;
        btnRecord.disabled = true;
        btnStop.disabled = false;
        btnExtract.disabled = true;
        statusEl.textContent = "Recording lecture...";
        visualizer.classList.add("recording");
    };

    recognition.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            currentTranscript += " " + finalTranscript;
        }

        transcriptTextarea.value = (currentTranscript + " " + interimTranscript).trim();
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition error:", event.error);
        statusEl.textContent = `Error occurred: ${event.error}`;
        stopRecordingUI();
    };

    recognition.onend = () => {
        stopRecordingUI();
    };

    btnRecord.addEventListener("click", () => {
        currentTranscript = "";
        transcriptTextarea.value = "";
        try {
            recognition.start();
        } catch (err) {
            console.error("Failed to start speech recognition:", err);
        }
    });

    btnStop.addEventListener("click", () => {
        if (recognition && isRecording) {
            recognition.stop();
        }
    });

    btnExtract.addEventListener("click", async () => {
        const text = transcriptTextarea.value.trim();
        if (!text) return;

        const originalText = btnExtract.textContent;
        btnExtract.disabled = true;
        btnExtract.textContent = "Extracting...";

        try {
            const prompt = `We recorded a student lecture. Extracted transcript: "${text}". 
            Please extract a list of key technical terms, definitions, programming languages, or algorithms mentioned.
            Format your response strictly as a JSON array of objects, with no other text, comments, markdown blocks, or conversational introductions.
            
            Example format:
            [
              {"term": "Recursion", "definition": "A method where the solution to a problem depends on solutions to smaller instances of the same problem."}
            ]`;

            const rawAiResponse = await generateTextWithGemini(prompt);
            
            let jsonText = rawAiResponse.trim();
            if (jsonText.startsWith("```")) {
                jsonText = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
            }

            const terms = JSON.parse(jsonText);
            if (Array.isArray(terms)) {
                // Save terms to the note
                const note = getActiveNote();
                if (note) {
                    note.lectureTranscript = text;
                    note.glossaryTerms = terms;
                    globalCallbacks.persistNotes();
                }
                renderGlossary(terms);
            }
        } catch (err) {
            console.error("Failed to parse glossary JSON:", err);
            statusEl.textContent = "Failed to extract glossary. Please try again.";
        } finally {
            btnExtract.disabled = false;
            btnExtract.textContent = originalText;
        }
    });

    function stopRecordingUI() {
        isRecording = false;
        btnRecord.disabled = false;
        btnStop.disabled = true;
        visualizer.classList.remove("recording");
        statusEl.textContent = "Recording stopped. Ready to extract glossary.";
        if (transcriptTextarea.value.trim()) {
            btnExtract.disabled = false;
        }
    }
}

/**
 * Returns the currently active note object.
 */
function getActiveNote() {
    if (!globalState || !globalState.activeNoteId) return null;
    return globalState.notes.find(n => n.id === globalState.activeNoteId);
}

/**
 * Listens to note editor input for cross-linking analysis.
 */
function setupContentListener() {
    const contentEl = $("#content");
    if (!contentEl) return;

    let timeout = null;
    contentEl.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const text = contentEl.innerText || "";
            analyzeNoteContent(text);
        }, 1000);
    });
}

/**
 * Analyzes Note text content for concepts and deadlines.
 */
function analyzeNoteContent(text) {
    const detectedLanguages = [];
    const detectedConcepts = [];
    const detectedDeadlines = [];

    // 1. Detect Languages and Technical Concepts
    const words = text.toLowerCase().split(/\s+/);
    LANGUAGES.forEach(lang => {
        if (words.some(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") === lang)) {
            detectedLanguages.push(lang);
        }
    });

    CONCEPTS.forEach(concept => {
        // Concept words can contain spaces, check substring with word boundaries
        const regex = new RegExp(`\\b${concept}\\b`, "i");
        if (regex.test(text)) {
            detectedConcepts.push(concept);
        }
    });

    // 2. Detect Deadlines
    // Looks for dates and checks if matching words like exam/test/deadline are nearby
    const dateRegex = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|[a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?,? \d{4}|[a-zA-Z]+ \d{1,2}(?:st|nd|rd|th)?|next [a-zA-Z]+day|[a-zA-Z]+day)\b/gi;
    let match;
    const sentences = text.split(/[.!?]+/);

    sentences.forEach(sentence => {
        const cleanSentence = sentence.trim();
        if (!cleanSentence) return;

        const dateMatch = cleanSentence.match(dateRegex);
        if (dateMatch) {
            const hasKeyword = /(exam|test|quiz|assignment|project|deadline|due)/i.test(cleanSentence);
            if (hasKeyword) {
                // Extract description and date
                const dateStr = dateMatch[0];
                const cleanTitle = cleanSentence
                    .replace(dateStr, "")
                    .replace(/(on|by|at|due|for)\s*$/i, "")
                    .replace(/^\s*(on|by|at|due|for)\s*/i, "")
                    .trim();

                const ymdDate = parseDateStringToYMD(dateStr);
                if (ymdDate) {
                    detectedDeadlines.push({
                        title: cleanTitle || "Exam",
                        dateStr: dateStr,
                        ymd: ymdDate
                    });
                }
            }
        }
    });

    renderSuggestions(detectedLanguages.concat(detectedConcepts), detectedDeadlines);
}

/**
 * Parses date string (e.g. "June 15" or "Monday") to YYYY-MM-DD.
 */
function parseDateStringToYMD(dateStr) {
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Weekdays matching
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const lowercase = dateStr.toLowerCase();
    let targetDay = -1;
    days.forEach((day, index) => {
        if (lowercase.includes(day)) targetDay = index;
    });

    if (targetDay !== -1) {
        const today = new Date();
        const todayDay = today.getDay();
        let diff = targetDay - todayDay;
        if (diff <= 0 || lowercase.includes("next")) diff += 7;
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + diff);
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // Try parsing slash- or dash-separated dates (e.g. DD/MM/YYYY, MM/DD/YYYY, D/M/YY)
    const parts = dateStr.split(/[\/-]/);
    if (parts.length === 3) {
        let p1 = parseInt(parts[0], 10);
        let p2 = parseInt(parts[1], 10);
        let p3 = parseInt(parts[2], 10);
        if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
            let year, month, day;
            if (p1 >= 1000) {
                // YYYY-MM-DD or YYYY/MM/DD
                year = p1;
                month = p2;
                day = p3;
            } else {
                // Year is the third component (p3)
                year = p3;
                if (year < 100) year += 2000; // e.g. 26 -> 2026
                
                if (p1 > 12) {
                    // p1 must be the day, p2 must be the month (DD/MM/YYYY)
                    day = p1;
                    month = p2;
                } else if (p2 > 12) {
                    // p2 must be the day, p1 must be the month (MM/DD/YYYY)
                    day = p2;
                    month = p1;
                } else {
                    // Both <= 12, default to DD/MM/YYYY (matching localized user format)
                    day = p1;
                    month = p2;
                }
            }
            if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const yyyy = String(year);
                const mm = String(month).padStart(2, '0');
                const dd = String(day).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }
        }
    }

    // Try parsing using Date.parse
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() < 2026) d.setFullYear(2026); // Default to current workspace year
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    return null;
}


/**
 * Handles rendering of extracted Glossary items.
 */
function renderGlossary(terms) {
    const listEl = $("#glossary-list");
    if (!listEl) return;

    if (!terms || terms.length === 0) {
        listEl.innerHTML = `<div class="glossary-empty">No terms extracted yet. Record a lecture and click extract.</div>`;
        return;
    }

    listEl.innerHTML = "";
    terms.forEach(item => {
        const card = document.createElement("div");
        card.className = "glossary-card";
        card.innerHTML = `
            <div class="card-term">${escapeHtml(item.term)}</div>
            <div class="card-definition">${escapeHtml(item.definition)}</div>
            <div class="card-actions">
                <button class="card-action-btn btn-insert-term" data-term="${escapeHtml(item.term)}" data-def="${escapeHtml(item.definition)}">Insert</button>
                <button class="card-action-btn btn-highlight-term" data-term="${escapeHtml(item.term)}">Find</button>
            </div>
        `;
        listEl.appendChild(card);
    });

    // Wire actions
    listEl.querySelectorAll(".btn-insert-term").forEach(btn => {
        btn.addEventListener("click", () => {
            const html = `<strong>${btn.dataset.term}</strong><span style="font-weight: normal;">: ${btn.dataset.def}</span><br>`;
            insertHtmlAtCursor(html);
        });
    });

    listEl.querySelectorAll(".btn-highlight-term").forEach(btn => {
        btn.addEventListener("click", () => {
            highlightWordInEditor(btn.dataset.term);
        });
    });
}

/**
 * Handles rendering of suggestions in the Smart Links sidebar.
 */
function renderSuggestions(concepts, deadlines) {
    const codeList = $("#code-suggestions-list");
    const calList = $("#calendar-suggestions-list");

    if (codeList) {
        if (concepts.length === 0) {
            codeList.innerHTML = `<div class="suggestions-empty">No technical concepts detected.</div>`;
        } else {
            codeList.innerHTML = "";
            const uniqueConcepts = [...new Set(concepts)];

            // Read coding snippets to see if matching ones exist
            const storedSnippetsRaw = localStorage.getItem("antigravity_snippets");
            const storedSnippets = storedSnippetsRaw ? JSON.parse(storedSnippetsRaw) : [];

            uniqueConcepts.forEach(concept => {
                const match = storedSnippets.find(s => s.title.toLowerCase().includes(concept.toLowerCase()));
                const card = document.createElement("div");
                card.className = "suggestion-card";

                if (match) {
                    card.innerHTML = `
                        <div class="card-title-text">${escapeHtml(concept)}</div>
                        <div class="card-desc">Linked to snippet: "${escapeHtml(match.title)}"</div>
                        <div class="card-actions">
                            <a href="HTML/code-workspace.html" class="card-action-btn" target="_blank">Open Workspace</a>
                        </div>
                    `;
                } else {
                    const createUrl = `HTML/code-workspace.html?createSnippet=${encodeURIComponent(concept)}`;
                    card.innerHTML = `
                        <div class="card-title-text">${escapeHtml(concept)}</div>
                        <div class="card-desc">Concept detected. Create a matching snippet in Code Workspace.</div>
                        <div class="card-actions">
                            <a href="${createUrl}" class="card-action-btn" target="_blank">Create Snippet</a>
                        </div>
                    `;
                }
                codeList.appendChild(card);
            });
        }
    }

    if (calList) {
        if (deadlines.length === 0) {
            calList.innerHTML = `<div class="suggestions-empty">No deadlines detected. Try typing: "exam on [date]...".</div>`;
        } else {
            calList.innerHTML = "";
            deadlines.forEach(item => {
                const card = document.createElement("div");
                card.className = "suggestion-card";
                const scheduleUrl = `HTML/student-hub.html?addDeadline=${encodeURIComponent(item.title)}&date=${item.ymd}`;

                card.innerHTML = `
                    <div class="card-title-text">${escapeHtml(item.title)}</div>
                    <div class="card-desc">Deadline on: ${escapeHtml(item.dateStr)}</div>
                    <div class="card-actions">
                        <a href="${scheduleUrl}" class="card-action-btn" target="_blank">Add to Plan</a>
                    </div>
                `;
                calList.appendChild(card);
            });
        }
    }
}

/**
 * Searches the editor content editable for a word, scrolls to it, and selects it.
 */
function highlightWordInEditor(word) {
    const contentEl = $("#content");
    if (!contentEl) return;

    contentEl.focus();
    const selection = window.getSelection();
    if (!selection) return;

    // Use window.find if available (fastest way to find and select in page)
    if (window.find) {
        // Reset selection to start so it searches from beginning
        selection.collapse(contentEl, 0);
        const found = window.find(word, false, false, true, false, true, false);
        if (found) return;
    }

    // Fallback simple search
    const textNodes = [];
    const walk = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walk.nextNode()) {
        textNodes.push(node);
    }

    for (const tNode of textNodes) {
        const index = tNode.textContent.toLowerCase().indexOf(word.toLowerCase());
        if (index !== -1) {
            const range = document.createRange();
            range.setStart(tNode, index);
            range.setEnd(tNode, index + word.length);
            selection.removeAllRanges();
            selection.addRange(range);
            tNode.parentElement.scrollIntoView({ behavior: "smooth", block: "center" });
            break;
        }
    }
}

/**
 * Notification from notesApp when the active note changes.
 */
export function onActiveNoteChanged(note) {
    const transcriptTextarea = $("#lecture-transcript");
    const btnExtract = $("#btn-extract-glossary");

    if (transcriptTextarea) {
        transcriptTextarea.value = note && note.lectureTranscript ? note.lectureTranscript : "";
    }
    if (btnExtract) {
        btnExtract.disabled = !note || !note.lectureTranscript;
    }

    renderGlossary(note && note.glossaryTerms ? note.glossaryTerms : []);

    if (note && (note.aiConcepts || note.aiDeadlines)) {
        renderSuggestions(note.aiConcepts || [], note.aiDeadlines || []);
    } else if (note && note.content) {
        const text = note.content.replace(/<[^>]*>/g, ""); // Strip HTML tags
        analyzeNoteContent(text);
    } else {
        renderSuggestions([], []);
    }
}

/**
 * HTML Escaper helper.
 */
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Sets up the Scan Note with AI button listener.
 */
function setupAIScanButton() {
    const btn = $("#btn-scan-note-ai");
    if (btn) {
        btn.addEventListener("click", handleAIScan);
    }
}

/**
 * Calls AI to parse the note text and identify concepts and deadlines.
 */
async function handleAIScan() {
    const btn = $("#btn-scan-note-ai");
    if (!btn) return;

    const note = getActiveNote();
    if (!note) return;

    const contentEl = $("#content");
    const text = contentEl ? contentEl.innerText.trim() : "";
    if (!text) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Scanning with AI...";

    try {
        const prompt = `You are a smart note parsing assistant. Review the following student note contents:
"${text}"

Extract:
1. Programming languages mentioned.
2. Key technical/computer science concepts.
3. Upcoming test, exam, assignment, or study deadlines.

Format your response strictly as a JSON object, with no introductory text, comments, markdown blocks, or conversational filler.
Example format:
{
  "concepts": ["JavaScript", "Recursion"],
  "deadlines": [
    {"title": "Math Assignment", "dateStr": "June 15, 2026", "ymd": "2026-06-15"}
  ]
}

Ensure the "ymd" date format is exactly "YYYY-MM-DD" matching any relative descriptions (like 'Monday' or 'next week') relative to the current local date: 2026-06-03.`;

        const aiResponse = await generateTextWithGemini(prompt);
        let jsonText = aiResponse.trim();
        if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }

        const data = JSON.parse(jsonText);
        if (data && (Array.isArray(data.concepts) || Array.isArray(data.deadlines))) {
            const concepts = data.concepts || [];
            const deadlines = data.deadlines || [];

            // Save to active note
            note.aiConcepts = concepts;
            note.aiDeadlines = deadlines;
            globalCallbacks.persistNotes();

            renderSuggestions(concepts, deadlines);
        }
    } catch (err) {
        console.error("AI scanning error:", err);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}
