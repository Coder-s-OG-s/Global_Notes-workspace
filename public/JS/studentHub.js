import config from './config.js';
import { generateTextWithGemini, generateTextWithGroq } from './geminiAPI.js';
import { THEME_KEY } from './constants.js';
import { setThemeStorageKey, wireThemeToggle, getStoredTheme, persistTheme } from './themeManager.js';
import { showToast, showConfirm } from './utilities.js';
import { getCurrentUser } from './authService.js';

// --- Local Storage Keys ---
const STORAGE_DECKS_KEY = 'global_notes_hub_decks';
const STORAGE_ACTIVE_DECK_ID_KEY = 'global_notes_hub_active_deck_id';
const STORAGE_SCHEDULES_KEY = 'global_notes_hub_schedules';
const STORAGE_ACTIVE_SCHEDULE_ID_KEY = 'global_notes_hub_active_schedule_id';
const STORAGE_SCHEDULE_KEY = 'global_notes_hub_schedule';

// --- Card Colorful Gradients ---
const CARD_THEMES = [
    { color: '#13b5b1', gradient: 'linear-gradient(135deg, rgba(19, 181, 177, 0.15), rgba(2, 128, 144, 0.15)), linear-gradient(135deg, #13b5b1, #028090)' }, // Aurora Teal
    { color: '#ff6b6b', gradient: 'linear-gradient(135deg, rgba(255, 107, 107, 0.15), rgba(255, 142, 83, 0.15)), linear-gradient(135deg, #ff6b6b, #ff8e53)' }, // Sunset Rose
    { color: '#7f00ff', gradient: 'linear-gradient(135deg, rgba(127, 0, 255, 0.15), rgba(225, 0, 255, 0.15)), linear-gradient(135deg, #7f00ff, #e100ff)' }, // Electric Violet
    { color: '#00c6ff', gradient: 'linear-gradient(135deg, rgba(0, 198, 255, 0.15), rgba(0, 114, 255, 0.15)), linear-gradient(135deg, #00c6ff, #0072ff)' }, // Ocean Blue
    { color: '#11998e', gradient: 'linear-gradient(135deg, rgba(17, 153, 142, 0.15), rgba(56, 239, 125, 0.15)), linear-gradient(135deg, #11998e, #38ef7d)' }, // Mystic Green
    { color: '#f857a6', gradient: 'linear-gradient(135deg, rgba(248, 87, 166, 0.15), rgba(255, 88, 88, 0.15)), linear-gradient(135deg, #f857a6, #ff5858)' }  // Amber Glow
];

const STORAGE_FLOWCHART_SHAPES_KEY = 'global_notes_hub_flowchart_shapes';
const STORAGE_FLOWCHARTS_LIST_KEY = 'global_notes_hub_flowcharts_list';
const STORAGE_ACTIVE_FLOWCHART_ID_KEY = 'global_notes_hub_active_flowchart_id';

// --- State Variables ---
let currentUser = null;
let flashcardFileText = '';
let scheduleFileText = '';
let savedDecks = [];
let activeDeckId = null;
let savedSchedules = [];
let activeCartoonTemplate = localStorage.getItem('global_notes_hub_cartoon_template') || 'cubist';
let activeScheduleId = null;
let savedFlowcharts = [];
let activeFlowchartId = null;
let activeTab = 'flashcards'; // 'flashcards', 'schedule', or 'flowcharts'

async function saveState() {
    // Write local storage as fallback/guest backup
    localStorage.setItem(STORAGE_DECKS_KEY, JSON.stringify(savedDecks));
    localStorage.setItem(STORAGE_ACTIVE_DECK_ID_KEY, activeDeckId || '');
    localStorage.setItem(STORAGE_SCHEDULES_KEY, JSON.stringify(savedSchedules));
    localStorage.setItem(STORAGE_ACTIVE_SCHEDULE_ID_KEY, activeScheduleId || '');
    localStorage.setItem(STORAGE_FLOWCHARTS_LIST_KEY, JSON.stringify(savedFlowcharts));
    localStorage.setItem(STORAGE_ACTIVE_FLOWCHART_ID_KEY, activeFlowchartId || '');
    localStorage.setItem(STORAGE_FLOWCHART_SHAPES_KEY, JSON.stringify(shapes));

    // If authenticated user is logged in, sync state to MongoDB database
    if (currentUser) {
        try {
            await fetch('/api/student-hub', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decks: savedDecks,
                    activeDeckId,
                    schedules: savedSchedules,
                    activeScheduleId,
                    flowcharts: savedFlowcharts,
                    activeFlowchartId
                })
            });
        } catch (e) {
            console.error("Failed to sync Student Hub state to database:", e);
        }
    }
}

// Flowchart State
let shapes = [];
let selectedShapeId = null;

// Drag and Resize State
let activeDragShapeId = null;
let activeResizeShapeId = null;
let resizeDirection = ''; // 'tl', 'tr', 'bl', 'br'
let dragStartX = 0;
let dragStartY = 0;
let shapeStartX = 0;
let shapeStartY = 0;
let shapeStartWidth = 0;
let shapeStartHeight = 0;

// ═══════════════════════════════════════════
// INTERACTIVE AI QUIZ ARENA GAME ENGINE
// ═══════════════════════════════════════════
let quizState = {
    active: false,
    title: 'INTRO TO CALCULUS · QUIZ',
    questions: [],
    currentIndex: 0,
    userAnswers: [],
    score: 0
};

const DEFAULT_CALCULUS_QUIZ = [
    {
        question: "What is the derivative of sin(x)?",
        options: ["cos(x)", "-cos(x)", "tan(x)", "-sin(x)"],
        correctIndex: 0,
        explanation: "The derivative of sin(x) with respect to x is cos(x). By calculus identity: d/dx[sin(x)] = cos(x)."
    },
    {
        question: "What is the integral of 1/x dx?",
        options: ["ln|x| + C", "x^2/2 + C", "-1/x^2 + C", "e^x + C"],
        correctIndex: 0,
        explanation: "The antiderivative of 1/x is the natural logarithm ln|x| + C for all non-zero x."
    },
    {
        question: "What is the derivative of e^(2x)?",
        options: ["2e^(2x)", "e^(2x)", "2x e^(2x-1)", "e^x"],
        correctIndex: 0,
        explanation: "Using the chain rule: d/dx[e^(2x)] = e^(2x) * d/dx[2x] = 2e^(2x)."
    },
    {
        question: "What is the limit of (sin x)/x as x approaches 0?",
        options: ["1", "0", "Infinity", "Undefined"],
        correctIndex: 0,
        explanation: "The fundamental trigonometric limit statement establishes that lim(x->0) (sin x)/x = 1."
    },
    {
        question: "What does the Power Rule state for d/dx[x^n]?",
        options: ["n * x^(n-1)", "x^(n+1) / (n+1)", "n * x^n", "n^x"],
        correctIndex: 0,
        explanation: "The Power Rule for differentiation states d/dx[x^n] = n * x^(n-1)."
    }
];

function initQuizArena() {
    const btnStartQuizMe = document.getElementById('btn-start-quiz-me');
    const btnTopQuizMe = document.getElementById('btn-top-quiz-me');
    const btnCloseQuiz = document.getElementById('btn-close-quiz');
    const btnSkipQuiz = document.getElementById('btn-skip-quiz');
    const btnCloseResults = document.getElementById('btn-close-quiz-results');
    const btnRetakeQuiz = document.getElementById('btn-retake-quiz');
    const btnFinishQuiz = document.getElementById('btn-finish-quiz');

    if (btnStartQuizMe) btnStartQuizMe.addEventListener('click', () => generateDynamicAIQuiz());
    if (btnTopQuizMe) btnTopQuizMe.addEventListener('click', () => generateDynamicAIQuiz());
    if (btnCloseQuiz) btnCloseQuiz.addEventListener('click', () => stopQuiz());
    if (btnSkipQuiz) btnSkipQuiz.addEventListener('click', () => skipQuizQuestion());
    if (btnCloseResults) btnCloseResults.addEventListener('click', () => stopQuiz());
    if (btnRetakeQuiz) btnRetakeQuiz.addEventListener('click', () => generateDynamicAIQuiz());
    if (btnFinishQuiz) btnFinishQuiz.addEventListener('click', () => stopQuiz());
}

async function generateDynamicAIQuiz() {
    const syllabusInputEl = document.getElementById('schedule-syllabus-input');
    let syllabusText = syllabusInputEl ? syllabusInputEl.value.trim() : '';

    // Check if file is selected in schedule-file-input if scheduleFileText is not populated yet
    const fileInput = document.getElementById('schedule-file-input');
    if (!scheduleFileText && fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        try {
            if (file.name.toLowerCase().endsWith('.pdf')) {
                const arrayBuffer = await file.arrayBuffer();
                scheduleFileText = await extractTextFromPDF(arrayBuffer);
            } else {
                scheduleFileText = await file.text();
            }
            if (syllabusInputEl && !syllabusInputEl.value.trim() && scheduleFileText) {
                syllabusInputEl.value = scheduleFileText.substring(0, 500) + (scheduleFileText.length > 500 ? '...' : '');
            }
        } catch (e) {
            console.error("Error reading file during quiz trigger:", e);
        }
    }

    let sourceContent = (syllabusText + '\n' + (scheduleFileText || '')).trim();

    if (!sourceContent && activeScheduleId) {
        const sched = savedSchedules.find(s => s.id === activeScheduleId);
        if (sched && sched.items) {
            sourceContent = sched.items.map(item => `${item.focus}: ${item.topics}`).join('\n');
        }
    }

    if (!sourceContent && activeDeckId) {
        const deck = savedDecks.find(d => d.id === activeDeckId);
        if (deck && deck.cards) {
            sourceContent = deck.cards.map(c => `Topic: ${c.question}\nAnswer: ${c.answer}`).join('\n');
        }
    }

    if (!sourceContent) {
        showToast('Please enter syllabus text or upload a document file (.pdf, .txt, .md) first.', 'warning');
        return;
    }

    const btnStart = document.getElementById('btn-start-quiz-me');
    const btnTop = document.getElementById('btn-top-quiz-me');
    const origHtmlStart = btnStart ? btnStart.innerHTML : '';
    const origHtmlTop = btnTop ? btnTop.innerHTML : '';

    if (btnStart) { btnStart.disabled = true; btnStart.innerHTML = '<span class="ai-spinner"></span> Generating AI Quiz...'; }
    if (btnTop) { btnTop.disabled = true; btnTop.innerHTML = '<span class="ai-spinner"></span> Generating AI Quiz...'; }

    try {
        const fileNameLabel = (document.getElementById('schedule-filename')?.textContent || 'Uploaded Document').replace(/\.[^/.]+$/, "");
        const truncatedContent = sourceContent.length > 8000 ? sourceContent.substring(0, 8000) : sourceContent;

        const prompt = `You are an expert academic examiner.
Generate a comprehensive multiple choice practice test based EXCLUSIVELY on the provided document / syllabus content below.

STRICT REQUIREMENTS:
1. Do NOT generate questions about calculus, mathematics, or unrelated subjects UNLESS the provided document explicitly discusses calculus.
2. Identify all main subjects or topic sections present in the document.
3. For EACH subject/topic identified, generate EXACTLY 10 multiple choice questions (or 10-30 total questions derived strictly from the uploaded document).
4. Return ONLY a valid JSON array of question objects (optionally wrapped in \`\`\`json ... \`\`\` codeblock).
5. Each object MUST have:
   - "subject": string (e.g. topic/section name from document)
   - "question": string (clear question statement strictly derived from document content - NO emojis)
   - "options": array of 4 distinct strings (e.g. ["Option A", "Option B", "Option C", "Option D"])
   - "correctIndex": number (0, 1, 2, or 3 pointing to the correct option)
   - "explanation": string (a clear, educational breakdown explaining why this answer is correct based on the document text)

Document / Syllabus Content:
${truncatedContent}`;

        const aiResponse = await generateTextWithGemini(prompt);
        let quizData = parseJsonArray(aiResponse);

        if (!Array.isArray(quizData) || quizData.length === 0) {
            throw new Error("AI did not return a valid quiz array.");
        }

        const questions = quizData.map(q => ({
            subject: q.subject || fileNameLabel,
            question: stripEmojis(q.question || 'Document Question'),
            options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: q.explanation || 'Based on your uploaded document material.'
        }));

        startQuiz(questions, `${fileNameLabel.toUpperCase()} · PRACTICE QUIZ`);
        showToast(`AI Quiz generated successfully (${questions.length} questions from uploaded document)!`, 'success');

    } catch (err) {
        console.error("AI Quiz Generation Error:", err);
        
        // Intelligent Document-Based Local Engine (100% derived from uploaded PDF / text lines)
        const docLines = sourceContent.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 15 && !l.toLowerCase().startsWith('page'));

        const fileNameLabel = (document.getElementById('schedule-filename')?.textContent || 'Uploaded Syllabus').replace(/\.[^/.]+$/, "");
        const fallbackQuestions = [];

        if (docLines.length > 0) {
            const step = Math.max(1, Math.floor(docLines.length / 10));
            for (let i = 0; i < Math.min(docLines.length, 30); i += step) {
                const lineSample = docLines[i];
                const keyTerm = lineSample.split(/\s+/).slice(0, 4).join(' ');
                
                fallbackQuestions.push({
                    subject: fileNameLabel.substring(0, 24),
                    question: `Based on "${fileNameLabel}", what key principle relates to: "${lineSample.substring(0, 70)}..."?`,
                    options: [
                        `Primary rule: ${lineSample.substring(0, 45)}`,
                        `Contradictory statement regarding ${keyTerm}`,
                        `Specification not mentioned in document`,
                        `None of the above`
                    ],
                    correctIndex: 0,
                    explanation: `Document extract: "${lineSample.substring(0, 100)}"`
                });
            }
        }

        if (fallbackQuestions.length > 0) {
            startQuiz(fallbackQuestions, `${fileNameLabel.toUpperCase()} · PRACTICE QUIZ`);
            showToast(`Generated ${fallbackQuestions.length} practice questions directly from uploaded document.`, 'success');
        } else {
            showToast('Could not extract readable text from document. Please ensure PDF contains text.', 'error');
        }
    } finally {
        if (btnStart) { btnStart.disabled = false; btnStart.innerHTML = origHtmlStart; }
        if (btnTop) { btnTop.disabled = false; btnTop.innerHTML = origHtmlTop; }
    }
}

function startQuiz(customQuestions, title) {
    const activeDeck = savedDecks.find(d => d.id === activeDeckId);
    let questions = customQuestions;

    if (!questions || questions.length === 0) {
        if (activeDeck && activeDeck.cards && activeDeck.cards.length > 0) {
            questions = activeDeck.cards.map((c, i) => {
                const options = [c.answer || 'Correct Answer'];
                options.push('Incorrect derivative / output');
                options.push('Opposite sign constant value');
                options.push('None of the above');
                for (let k = options.length - 1; k > 0; k--) {
                    const j = Math.floor(Math.random() * (k + 1));
                    [options[k], options[j]] = [options[j], options[k]];
                }
                const correctIdx = options.indexOf(c.answer || 'Correct Answer');
                return {
                    question: stripEmojis(c.question),
                    options: options,
                    correctIndex: correctIdx >= 0 ? correctIdx : 0,
                    explanation: c.mnemonic || `Mastery card answer: ${c.answer}`
                };
            });
        } else {
            questions = DEFAULT_CALCULUS_QUIZ;
        }
    }

    quizState = {
        active: true,
        title: title || (activeDeck ? `${activeDeck.name.toUpperCase()} · QUIZ` : 'INTRO TO CALCULUS · QUIZ'),
        questions: questions,
        currentIndex: 0,
        userAnswers: [],
        score: 0
    };

    const container = document.getElementById('quiz-arena-container');
    const placeholder = document.getElementById('schedule-placeholder');
    const timeline = document.getElementById('schedule-timeline');
    const cardBody = document.getElementById('quiz-card-body');
    const resultsCard = document.getElementById('quiz-results-card');

    if (container) container.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
    if (timeline) timeline.classList.add('hidden');
    if (cardBody) cardBody.classList.remove('hidden');
    if (resultsCard) resultsCard.classList.add('hidden');

    renderQuizQuestion();
}

function renderQuizQuestion() {
    const q = quizState.questions[quizState.currentIndex];
    if (!q) {
        renderQuizResults();
        return;
    }

    const progressText = document.getElementById('quiz-progress-text');
    const progressFill = document.getElementById('quiz-progress-line-fill');
    const subtitle = document.getElementById('quiz-category-subtitle');
    const questionText = document.getElementById('quiz-question-text');
    const optionsList = document.getElementById('quiz-options-list');
    const explanationCard = document.getElementById('quiz-explanation-card');

    const total = quizState.questions.length;
    const currentNum = quizState.currentIndex + 1;
    const percent = Math.round((currentNum / total) * 100);

    if (progressText) progressText.textContent = `${currentNum} / ${total}`;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (subtitle) subtitle.textContent = q.subject ? `${q.subject.toUpperCase()} · QUIZ` : quizState.title;
    if (questionText) questionText.textContent = q.question;
    if (explanationCard) explanationCard.classList.add('hidden');

    if (optionsList) {
        optionsList.innerHTML = '';
        const badges = ['A', 'B', 'C', 'D'];

        q.options.forEach((optText, optIdx) => {
            const pill = document.createElement('div');
            pill.className = 'quiz-option-pill';
            pill.innerHTML = `
                <div class="quiz-option-left">
                    <div class="quiz-option-letter-badge">${badges[optIdx] || optIdx + 1}</div>
                    <div class="quiz-option-text">${escapeHtml(optText)}</div>
                </div>
                <div class="quiz-option-status-icon"></div>
            `;

            pill.addEventListener('click', () => handleQuizOptionSelect(optIdx, pill));
            optionsList.appendChild(pill);
        });
    }
}

function handleQuizOptionSelect(selectedIdx, pillElement) {
    const q = quizState.questions[quizState.currentIndex];
    if (!q) return;

    const isCorrect = selectedIdx === q.correctIndex;
    quizState.userAnswers.push({
        questionIndex: quizState.currentIndex,
        selectedOptionIdx: selectedIdx,
        isCorrect: isCorrect
    });

    if (isCorrect) quizState.score += 1;

    const allPills = document.querySelectorAll('.quiz-option-pill');
    allPills.forEach((p, idx) => {
        p.style.pointerEvents = 'none';
        const statusIcon = p.querySelector('.quiz-option-status-icon');
        if (idx === q.correctIndex) {
            p.classList.add('correct');
            if (statusIcon) statusIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0f172a" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (idx === selectedIdx && !isCorrect) {
            p.classList.add('incorrect');
            if (statusIcon) statusIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#be123c" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        }
    });

    const explanationCard = document.getElementById('quiz-explanation-card');
    const explanationText = document.getElementById('quiz-explanation-text');
    if (explanationCard && explanationText && q.explanation) {
        explanationText.textContent = q.explanation;
        explanationCard.classList.remove('hidden');
    }

    setTimeout(() => {
        quizState.currentIndex += 1;
        if (quizState.currentIndex < quizState.questions.length) {
            renderQuizQuestion();
        } else {
            renderQuizResults();
        }
    }, 1800);
}

function skipQuizQuestion() {
    quizState.currentIndex += 1;
    if (quizState.currentIndex < quizState.questions.length) {
        renderQuizQuestion();
    } else {
        renderQuizResults();
    }
}

function renderQuizResults() {
    const cardBody = document.getElementById('quiz-card-body');
    const resultsCard = document.getElementById('quiz-results-card');

    if (cardBody) cardBody.classList.add('hidden');
    if (resultsCard) resultsCard.classList.remove('hidden');

    const total = quizState.questions.length;
    const correctCount = quizState.score;
    const redoCount = total - correctCount;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const scorePercentageEl = document.getElementById('quiz-score-percentage');
    const scoreSubtextEl = document.getElementById('quiz-score-subtext');
    const metricNailedEl = document.getElementById('quiz-metric-nailed-number');
    const metricRedoEl = document.getElementById('quiz-metric-redo-number');

    if (scorePercentageEl) scorePercentageEl.textContent = `${percent}%`;
    if (scoreSubtextEl) scoreSubtextEl.textContent = `${correctCount} of ${total} correct`;
    if (metricNailedEl) metricNailedEl.textContent = `${correctCount}`;
    if (metricRedoEl) metricRedoEl.textContent = `${redoCount}`;
}

function stopQuiz() {
    quizState.active = false;
    const container = document.getElementById('quiz-arena-container');
    const placeholder = document.getElementById('schedule-placeholder');
    const timeline = document.getElementById('schedule-timeline');

    if (container) container.classList.add('hidden');
    if (timeline && timeline.children.length > 0) {
        timeline.classList.remove('hidden');
    } else if (placeholder) {
        placeholder.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await initHub();
});

async function initHub() {
    // Save current page state
    localStorage.setItem('lastPage', 'student-hub');

    // Handle back button click to clear state
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            localStorage.setItem('lastPage', 'dashboard');
        });
    }

    // 1. Sync Theme
    setThemeStorageKey(THEME_KEY);
    wireThemeToggle();

    // 2. Tab Navigation Setup
    initTabs();

    // 3. API Key Check
    checkAPIKey();

    // 4. File Upload Drag and Drop Setup
    setupUploadDropzone('flashcards-dropzone', 'flashcards-file-input', 'flashcards-filename', (text) => {
        flashcardFileText = text;
        showToast('Flashcard notes uploaded successfully.', 'success');
    });

    setupUploadDropzone('schedule-dropzone', 'schedule-file-input', 'schedule-filename', (text) => {
        scheduleFileText = text;
        const syllabusInputEl = document.getElementById('schedule-syllabus-input');
        if (syllabusInputEl && text) {
            syllabusInputEl.value = text.substring(0, 600) + (text.length > 600 ? '...' : '');
        }
        showToast('Syllabus document uploaded and parsed successfully.', 'success');
    });

    setupUploadDropzone('flowchart-dropzone', 'flowchart-file-input', 'flowchart-filename', (text) => {
        const promptInputEl = document.getElementById('flowchart-ai-prompt');
        if (promptInputEl && text) {
            promptInputEl.value = text.substring(0, 800) + (text.length > 800 ? '...' : '');
        }
        showToast('Process file loaded into Flowchart Studio.', 'success');
    });

    // 5. Button Action Listeners
    document.getElementById('btn-generate-flashcards').addEventListener('click', handleGenerateFlashcards);
    document.getElementById('btn-generate-schedule').addEventListener('click', handleGenerateSchedule);
    
    // Bind 2x2 Study Set Cards (Intro to Calculus, Lecture 1 Slides, Syllabus, Cell Division)
    document.querySelectorAll('.pastel-study-card').forEach(card => {
        card.addEventListener('click', () => {
            const topic = card.dataset.topic;
            const topicInput = document.getElementById('flashcards-topic-input');
            if (topicInput) {
                topicInput.value = topic;
                handleGenerateFlashcards();
            }
        });
    });

    // Bind Pick a Source Grid Cards
    document.querySelectorAll('.source-card-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.source-card-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const srcType = btn.dataset.type;
            if (srcType === 'pdf' || srcType === 'docx') {
                const fileInput = document.getElementById('flashcards-file-input');
                if (fileInput) fileInput.click();
            } else if (srcType === 'youtube') {
                const ytInput = document.getElementById('youtube-link-input');
                if (ytInput) ytInput.focus();
            }
        });
    });

    // Bind YouTube Go Button
    const btnYtGo = document.getElementById('btn-youtube-go');
    if (btnYtGo) {
        btnYtGo.addEventListener('click', () => {
            const ytInput = document.getElementById('youtube-link-input');
            const val = ytInput ? ytInput.value.trim() : '';
            if (val) {
                const topicInput = document.getElementById('flashcards-topic-input');
                if (topicInput) topicInput.value = `Video Analysis for ${val}`;
                showToast('YouTube link accepted. Generating flashcards...', 'info');
                handleGenerateFlashcards();
            } else {
                showToast('Please paste a valid YouTube video link.', 'warning');
            }
        });
    }

    // Bind + Add source button & Close button
    const btnOpenAddSource = document.getElementById('btn-open-add-source');
    const btnCloseAddSource = document.getElementById('btn-close-add-source');
    
    if (btnOpenAddSource) {
        btnOpenAddSource.addEventListener('click', () => {
            const addSourceModal = document.querySelector('.add-source-card-modal');
            if (addSourceModal) {
                addSourceModal.style.display = 'block';
                addSourceModal.classList.remove('hidden');
            }
            const placeholder = document.getElementById('flashcards-placeholder');
            const grid = document.getElementById('flashcards-grid');
            const header = document.getElementById('flashcards-header');
            if (placeholder) placeholder.classList.add('hidden');
            if (grid) grid.classList.add('hidden');
            if (header) header.classList.add('hidden');

            const dropzone = document.getElementById('flashcards-dropzone');
            if (dropzone) dropzone.scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (btnCloseAddSource) {
        btnCloseAddSource.addEventListener('click', () => {
            const addSourceModal = document.querySelector('.add-source-card-modal');
            if (addSourceModal) {
                addSourceModal.style.display = 'none';
                addSourceModal.classList.add('hidden');
            }
            if (activeDeckId) {
                selectDeck(activeDeckId);
            } else {
                const placeholder = document.getElementById('flashcards-placeholder');
                if (placeholder) placeholder.classList.remove('hidden');
            }
        });
    }

    // Bind Cartoon Template Selector Pills
    const cartoonPills = document.querySelectorAll('.cartoon-pill-btn');
    cartoonPills.forEach(pill => {
        if (pill.dataset.template === activeCartoonTemplate) {
            pill.classList.add('active');
            pill.style.background = '#6366f1';
            pill.style.color = '#ffffff';
        } else {
            pill.classList.remove('active');
            pill.style.background = '#ffffff';
            pill.style.color = '#0f172a';
        }

        pill.addEventListener('click', () => {
            cartoonPills.forEach(p => {
                p.classList.remove('active');
                p.style.background = '#ffffff';
                p.style.color = '#0f172a';
            });
            pill.classList.add('active');
            pill.style.background = '#6366f1';
            pill.style.color = '#ffffff';
            activeCartoonTemplate = pill.dataset.template || 'cubist';
            localStorage.setItem('global_notes_hub_cartoon_template', activeCartoonTemplate);

            if (activeDeckId) {
                const activeDeck = savedDecks.find(d => d.id === activeDeckId);
                if (activeDeck) {
                    renderFlashcards(activeDeck.cards);
                }
            }
        });
    });

    // Bind Search Bar Toggle & Input Filter
    const libSearchBtn = document.getElementById('lib-search-btn');
    const libSearchInput = document.getElementById('lib-search-input');
    if (libSearchBtn && libSearchInput) {
        libSearchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            libSearchInput.classList.toggle('active');
            if (libSearchInput.classList.contains('active')) {
                libSearchInput.focus();
            } else {
                libSearchInput.value = '';
                renderLibraryDecks('');
            }
        });

        libSearchInput.addEventListener('input', (e) => {
            renderLibraryDecks(e.target.value);
        });
    }

    // Bind Sidebar Menu Toggle Buttons (Header & Sidebar Title)
    const toggleSidebar = (e) => {
        if (e) e.stopPropagation();
        const libraryPanel = document.querySelector('.my-library-panel');
        if (libraryPanel) {
            libraryPanel.classList.toggle('collapsed');
            showToast(libraryPanel.classList.contains('collapsed') ? 'Library sidebar hidden' : 'Library sidebar expanded', 'info');
        }
    };

    const libMenuBtn = document.getElementById('lib-menu-btn');
    if (libMenuBtn) libMenuBtn.addEventListener('click', toggleSidebar);

    const libMenuBtnSidebar = document.getElementById('lib-menu-btn-sidebar');
    if (libMenuBtnSidebar) libMenuBtnSidebar.addEventListener('click', toggleSidebar);

    // Initialize Interactive AI Quiz Arena Engine
    initQuizArena();



    // 6. Populate Coding Note Snippet Dropdowns
    populateSnippetSelects();

    // 7. Initialize Visuals & Timers
    initStudentVisuals();
    initStudentTimers();

    // Flowchart Shapes Dropdown and Controls
    const btnShapesDropdown = document.getElementById('btn-shapes-dropdown');
    const shapesDropdownPanel = document.getElementById('shapes-dropdown-panel');
    if (btnShapesDropdown && shapesDropdownPanel) {
        btnShapesDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            shapesDropdownPanel.classList.toggle('hidden');
        });
        
        document.addEventListener('click', (e) => {
            if (!shapesDropdownPanel.classList.contains('hidden') && !e.target.closest('.dropdown-trigger-wrapper')) {
                shapesDropdownPanel.classList.add('hidden');
            }
        });
    }

    const shapeBtns = document.querySelectorAll('.shape-btn');
    shapeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const shapeType = btn.dataset.shape;
            addShape(shapeType);
            if (shapesDropdownPanel) shapesDropdownPanel.classList.add('hidden');
        });
    });

    const btnTextbox = document.getElementById('btn-textbox');
    if (btnTextbox) {
        btnTextbox.addEventListener('click', () => {
            addShape('textbox');
        });
    }

    const btnPicture = document.getElementById('btn-picture');
    const imageShapeInput = document.getElementById('image-shape-input');
    if (btnPicture && imageShapeInput) {
        btnPicture.addEventListener('click', () => {
            imageShapeInput.click();
        });

        imageShapeInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (evt) => {
                    addShape('picture', evt.target.result);
                };
                reader.readAsDataURL(file);
                // Reset value so same image can be reselected
                imageShapeInput.value = '';
            }
        });
    }

    const btnClearCanvas = document.getElementById('btn-clear-canvas');
    if (btnClearCanvas) {
        btnClearCanvas.addEventListener('click', clearFlowchartCanvas);
    }

    const btnGenerateFlowchartAI = document.getElementById('btn-generate-flowchart-ai');
    if (btnGenerateFlowchartAI) {
        btnGenerateFlowchartAI.addEventListener('click', handleGenerateFlowchartAI);
    }

    // Canvas click event to deselect active shape
    const canvas = document.getElementById('flowchart-canvas');
    if (canvas) {
        canvas.addEventListener('pointerdown', (e) => {
            if (e.target === canvas) {
                selectedShapeId = null;
                renderFlowchart();
            }
        });
    }

    // Keydown handler for Delete/Backspace key to delete selected shape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag !== 'input' && activeTag !== 'textarea') {
                selectedShapeId && deleteSelectedShape();
            }
        }
    });

    // 6. History Dropdown Trigger
    setupHistoryDropdown();

    // 7. Load Saved State
    await loadSavedState();

    // Check URL parameters for pre-populating deadlines
    const urlParams = new URLSearchParams(window.location.search);
    const deadlineName = urlParams.get('addDeadline');
    const deadlineDate = urlParams.get('date');
    if (deadlineName) {
        const btnSchedule = document.getElementById('tab-schedule');
        const viewFlashcards = document.getElementById('view-flashcards');
        const viewSchedule = document.getElementById('view-schedule');
        const viewFlowcharts = document.getElementById('view-flowcharts');
        const btnFlashcards = document.getElementById('tab-flashcards');
        const btnFlowcharts = document.getElementById('tab-flowcharts');

        if (btnSchedule) {
            activeTab = 'schedule';
            if (btnFlashcards) btnFlashcards.classList.remove('active');
            btnSchedule.classList.add('active');
            if (btnFlowcharts) btnFlowcharts.classList.remove('active');

            if (viewFlashcards) viewFlashcards.classList.remove('active');
            if (viewSchedule) viewSchedule.classList.add('active');
            if (viewFlowcharts) viewFlowcharts.classList.remove('active');
        }

        const syllabusInputEl = document.getElementById('schedule-syllabus-input');
        if (syllabusInputEl) {
            syllabusInputEl.value = `Prepare for ${decodeURIComponent(deadlineName)}`;
        }
        const examDateInput = document.getElementById('exam-date-input');
        if (examDateInput && deadlineDate) {
            examDateInput.value = deadlineDate;
        }
    }
}

// Check API Key status
function checkAPIKey() {
    const apiKey = config.GROQ_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY' || apiKey.includes('YOUR')) {
        document.getElementById('api-warning').classList.remove('hidden');
    }
}

// Tab Toggling logic
function initTabs() {
    const btnFlashcards = document.getElementById('tab-flashcards');
    const btnSchedule = document.getElementById('tab-schedule');
    const btnFlowcharts = document.getElementById('tab-flowcharts');
    const btnVisuals = document.getElementById('tab-visuals');
    const btnTimers = document.getElementById('tab-timers');

    const viewFlashcards = document.getElementById('view-flashcards');
    const viewSchedule = document.getElementById('view-schedule');
    const viewFlowcharts = document.getElementById('view-flowcharts');
    const viewVisuals = document.getElementById('view-visuals');
    const viewTimers = document.getElementById('view-timers');

    const switchTab = (tab) => {
        activeTab = tab;
        closeDropdown();

        // Toggle buttons active state
        btnFlashcards?.classList.toggle('active', tab === 'flashcards');
        btnSchedule?.classList.toggle('active', tab === 'schedule');
        btnFlowcharts?.classList.toggle('active', tab === 'flowcharts');
        btnVisuals?.classList.toggle('active', tab === 'visuals');
        btnTimers?.classList.toggle('active', tab === 'timers');

        // Toggle views active state
        viewFlashcards?.classList.toggle('active', tab === 'flashcards');
        viewSchedule?.classList.toggle('active', tab === 'schedule');
        viewFlowcharts?.classList.toggle('active', tab === 'flowcharts');
        viewVisuals?.classList.toggle('active', tab === 'visuals');
        viewTimers?.classList.toggle('active', tab === 'timers');

        // Ensure history button container is always visible
        const historyContainer = document.querySelector('.history-dropdown-container');
        if (historyContainer) {
            historyContainer.classList.remove('hidden');
        }

        if (tab === 'flowcharts') {
            renderFlowchart();
        }
    };

    btnFlashcards?.addEventListener('click', () => switchTab('flashcards'));
    btnSchedule?.addEventListener('click', () => switchTab('schedule'));
    btnFlowcharts?.addEventListener('click', () => switchTab('flowcharts'));
    btnVisuals?.addEventListener('click', () => switchTab('visuals'));
    btnTimers?.addEventListener('click', () => switchTab('timers'));

    const validTabs = ['flowcharts', 'flashcards', 'schedule', 'visuals', 'timers'];

    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        if (validTabs.includes(hash)) {
            switchTab(hash);
        }
    }

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1);
        if (validTabs.includes(hash)) {
            switchTab(hash);
        }
    });
}


// History Dropdown Toggle
function setupHistoryDropdown() {
    const btnToggle = document.getElementById('btn-history-toggle');
    const dropdown = document.getElementById('history-dropdown');

    btnToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdown.classList.contains('hidden');
        if (isHidden) {
            renderHistoryList();
            dropdown.classList.remove('hidden');
        } else {
            dropdown.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.classList.contains('hidden') && !e.target.closest('.history-dropdown-container')) {
            dropdown.classList.add('hidden');
        }
    });
}

function closeDropdown() {
    const dropdown = document.getElementById('history-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
}

// PDF text extractor helper using PDF.js
async function extractTextFromPDF(arrayBuffer) {
    if (!window.pdfjsLib) {
        throw new Error("PDF.js library not loaded. Please reload the page.");
    }
    
    // Configure worker source path matching CDN version
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    try {
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        
        if (!fullText.trim()) {
            throw new Error("This PDF appears to be scanned or image-only (no selectable text found). Please upload a text-based document.");
        }
        
        return fullText;
    } catch (err) {
        console.error("PDF Parsing error:", err);
        throw new Error(err.message || "Failed to parse PDF content.");
    }
}

// Drag & Drop / Input file reader
function setupUploadDropzone(dropzoneId, inputId, filenameId, onLoaded) {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(inputId);
    const filenameLabel = document.getElementById(filenameId);
    const dropzoneText = dropzone.querySelector('.upload-text');

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(fileInput.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file) return;
        filenameLabel.textContent = file.name;
        if (dropzoneText) dropzoneText.classList.add('hidden');

        if (file.name.toLowerCase().endsWith('.pdf')) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const text = await extractTextFromPDF(e.target.result);
                    onLoaded(text);
                } catch (err) {
                    showToast(err.message || 'Failed to parse PDF.', 'error');
                    filenameLabel.textContent = '';
                    if (dropzoneText) dropzoneText.classList.remove('hidden');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                onLoaded(e.target.result);
            };
            reader.readAsText(file);
        }
    }
}

// Parse AI response safely as JSON
function parseJsonArray(text) {
    let cleanText = text.trim();
    
    // 1. Try parsing the whole text directly
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        // Ignore and proceed
    }

    // 2. Try parsing after removing outer ```json or ``` wrapper if it matches perfectly
    if (cleanText.startsWith('```') && cleanText.endsWith('```')) {
        const matches = cleanText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
        if (matches && matches[1]) {
            try {
                return JSON.parse(matches[1].trim());
            } catch (e) {
                // Ignore and proceed
            }
        }
    }

    // 3. Robust substring extraction fallback
    const extracted = extractJsonSubstrings(cleanText);
    if (extracted) {
        return extracted;
    }

    throw new Error("Unable to parse AI response as JSON. Please try again.");
}

function extractJsonSubstrings(cleanText) {
    // Try to find a valid JSON array first
    let startIdx = -1;
    while ((startIdx = cleanText.indexOf('[', startIdx + 1)) !== -1) {
        let endIdx = cleanText.length;
        while ((endIdx = cleanText.lastIndexOf(']', endIdx - 1)) !== -1 && endIdx > startIdx) {
            const candidate = cleanText.substring(startIdx, endIdx + 1);
            try {
                const parsed = JSON.parse(candidate);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch (err) {
                // Ignore parse errors, try next endIdx
            }
        }
    }

    // Try to find a valid JSON object
    startIdx = -1;
    while ((startIdx = cleanText.indexOf('{', startIdx + 1)) !== -1) {
        let endIdx = cleanText.length;
        while ((endIdx = cleanText.lastIndexOf('}', endIdx - 1)) !== -1 && endIdx > startIdx) {
            const candidate = cleanText.substring(startIdx, endIdx + 1);
            try {
                const parsed = JSON.parse(candidate);
                if (parsed && typeof parsed === 'object') {
                    return parsed;
                }
            } catch (err) {
                // Ignore parse errors, try next endIdx
            }
        }
    }
    return null;
}



// ─── DYNAMIC HISTORY DROPDOWN RENDERER ───
function renderHistoryList() {
    const header = document.getElementById('history-dropdown-header');
    const container = document.getElementById('history-dropdown-list');
    if (!container || !header) return;
    container.innerHTML = '';

    if (activeTab === 'flashcards') {
        header.textContent = 'Saved Study Decks';
        if (savedDecks.length === 0) {
            container.innerHTML = '<p class="decks-empty">No saved decks yet.</p>';
            return;
        }

        savedDecks.forEach(deck => {
            const item = document.createElement('div');
            item.className = `deck-item ${deck.id === activeDeckId ? 'active' : ''}`;
            
            const dateStr = new Date(deck.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            item.innerHTML = `
                <div class="deck-info">
                    <span class="deck-icon">📚</span>
                    <div class="deck-details">
                        <span class="deck-name">${escapeHtml(deck.name)}</span>
                        <span class="deck-meta">${dateStr} • ${deck.cards.length} cards</span>
                    </div>
                </div>
                <button class="deck-delete-btn" title="Delete Deck">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-14m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.closest('.deck-delete-btn')) return;
                selectDeck(deck.id);
                closeDropdown();
            });

            const deleteBtn = item.querySelector('.deck-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteDeck(deck.id);
            });

            container.appendChild(item);
        });
    } else if (activeTab === 'schedule') {
        header.textContent = 'Saved Revision Plans';
        if (savedSchedules.length === 0) {
            container.innerHTML = '<p class="decks-empty">No saved schedules yet.</p>';
            return;
        }

        savedSchedules.forEach(sched => {
            const item = document.createElement('div');
            item.className = `deck-item ${sched.id === activeScheduleId ? 'active' : ''}`;
            
            const dateStr = new Date(sched.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            item.innerHTML = `
                <div class="deck-info">
                    <span class="deck-icon">📅</span>
                    <div class="deck-details">
                        <span class="deck-name">${escapeHtml(sched.name)}</span>
                        <span class="deck-meta">${dateStr} • ${sched.items.length} days</span>
                    </div>
                </div>
                <button class="deck-delete-btn" title="Delete Schedule">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-14m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.closest('.deck-delete-btn')) return;
                selectSchedule(sched.id);
                closeDropdown();
            });

            const deleteBtn = item.querySelector('.deck-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteScheduleRecord(sched.id);
            });

            container.appendChild(item);
        });
    } else if (activeTab === 'flowcharts') {
        header.textContent = 'Saved Flowcharts';
        if (savedFlowcharts.length === 0) {
            container.innerHTML = '<p class="decks-empty">No saved flowcharts yet.</p>';
            return;
        }

        savedFlowcharts.forEach(flow => {
            const item = document.createElement('div');
            item.className = `deck-item ${flow.id === activeFlowchartId ? 'active' : ''}`;
            
            const dateStr = new Date(flow.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            item.innerHTML = `
                <div class="deck-info">
                    <span class="deck-icon">📊</span>
                    <div class="deck-details">
                        <span class="deck-name">${escapeHtml(flow.name)}</span>
                        <span class="deck-meta">${dateStr} • ${flow.shapes.length} steps</span>
                    </div>
                </div>
                <button class="deck-delete-btn" title="Delete Flowchart">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-14m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.closest('.deck-delete-btn')) return;
                selectFlowchart(flow.id);
                closeDropdown();
            });

            const deleteBtn = item.querySelector('.deck-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFlowchart(flow.id);
            });

            container.appendChild(item);
        });
    }
}

// ─── FLASHCARDS HANDLERS ───
async function handleGenerateFlashcards() {
    const topicInputEl = document.getElementById('flashcards-topic-input');
    const topicText = topicInputEl.value.trim();
    const sourceText = (topicText + '\n' + flashcardFileText).trim();

    if (!sourceText) {
        showToast('Please type a topic/concept or upload a notes file.', 'error');
        return;
    }

    const btn = document.getElementById('btn-generate-flashcards');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="ai-spinner"></span> Generating...';

    try {
        const prompt = `You are an expert tutor who designs highly memorable flashcards using active recall, spaced repetition, visual associations, and mnemonics.
Analyze the following topic or notes text and generate a list of 8 highly engaging, colorful study flashcards.

IMPORTANT: If the topic or notes contain programming, coding, or computer science concepts, generate "Code Comprehension Cards" containing short, clear code snippets inside markdown code blocks (using \`\`\`language ... \`\`\`). These cards should test the student's ability to:
1. Predict the output of a code snippet
2. Identify and debug a logical or syntax bug in a snippet
3. Complete or fill in a missing line of code to achieve a goal

Each flashcard must be returned in a JSON array of objects. You must return only a valid JSON array of objects (optionally wrapped in a \`\`\`json ... \`\`\` codeblock).
Inside the JSON string values (for "question", "answer", and "mnemonic"), you MUST wrap all programming code snippets in markdown code blocks using \`\`\`language ... \`\`\` (e.g. \`\`\`js ... \`\`\`) or inline backticks (\`code\`) so they render with correct syntax highlighting. Do not use raw unformatted code in strings.

Each object must have the following fields:
- "question": string (concise, clear query starting with a relevant descriptive emoji, e.g. "🌱 What is photosynthesis?", or for code cards, a snippet and a question like "💻 Predict the output of this JavaScript function:\\n\`\`\`js\\nfunction greet() {\\n  return (() => 'Hello')();\\n}\\nconsole.log(greet());\\n\`\`\`")
- "expectedAnswer": string (Only for code comprehension cards where a student has to fill in a missing line of code, fix a bug, or predict the output. This must contain the exact code statement, syntax, or output string that the student needs to type in an input field to pass the test. Do not include markdown code block syntax in this field, just the raw text/code to match. If it's a general non-code card, set this field to null.)
- "answer": string (concise explanation highlighting key terms inside <strong> tags for visual emphasis. For code cards, provide the corrected code or the output inside a code block, plus an explanation, e.g. "It outputs <strong>'Hello'</strong> because the immediately invoked arrow function is returned, which returns the string.")
- "mnemonic": string (a short, memorable analogy, trick, memory aid, or acronym to help the student retain this information easily, e.g. "💡 Memory Aid: Remember **P**lants **N**eed **C**arbon **W**ater (**PNCW**).")
- "category": string (a short 1-2 word classification tag, e.g., "Biology", "Web Dev", "Physics")

Example format:
[
  {
    "question": "💻 Fill in the missing line to return the sum of two numbers:\\n\`\`\`js\\nfunction add(a, b) {\\n  // missing line\\n}\\n\`\`\`",
    "expectedAnswer": "return a + b",
    "answer": "The missing line is <strong>return a + b</strong> to return the sum of the inputs.",
    "mnemonic": "Remember input goes in, output comes out via return.",
    "category": "JavaScript"
  }
]

Syllabus / Notes / Topic Input:
${sourceText}`;

        const aiResponse = await generateTextWithGemini(prompt);
        if (aiResponse.includes("Error:") || aiResponse.includes("Deployment Error")) {
            throw new Error(aiResponse);
        }

        const cards = parseJsonArray(aiResponse);
        if (!Array.isArray(cards)) {
            throw new Error("AI did not return a valid list of flashcards.");
        }

        // Determine Deck Title
        let deckName = '';
        if (topicText) {
            deckName = topicText.split('\n')[0].substring(0, 26).trim();
            if (topicText.length > 26) deckName += '...';
        } else {
            const fileLabel = document.getElementById('flashcards-filename').textContent;
            deckName = fileLabel ? fileLabel.substring(0, 26).trim() : 'Study Session';
            if (fileLabel && fileLabel.length > 26) deckName += '...';
        }

        // Create new Deck record
        const newDeck = {
            id: Date.now().toString(),
            name: deckName,
            timestamp: Date.now(),
            cards: cards.map((card, index) => ({
                ...card,
                mastered: false,
                themeIdx: index % CARD_THEMES.length
            }))
        };

        // Save to decks list
        savedDecks.unshift(newDeck);
        activeDeckId = newDeck.id;
        
        saveState();

        renderFlashcards(newDeck.cards);
        renderLibraryDecks();
        
        // Reset Inputs
        topicInputEl.value = '';
        flashcardFileText = '';
        const filenameLabel = document.getElementById('flashcards-filename');
        if (filenameLabel) filenameLabel.textContent = '';
        const dropzoneText = document.querySelector('#flashcards-dropzone .upload-text');
        if (dropzoneText) dropzoneText.classList.remove('hidden');

        showToast('Flashcards generated successfully.', 'success');

    } catch (err) {
        console.error(err);
        showToast(err.message || 'Generation failed.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

function getDefaultStudyDecks() {
    return [];
}

function renderLibraryDecks(query = '') {
    const gridEl = document.querySelector('.study-cards-grid');
    const learnedCardsEl = document.getElementById('stats-learned-cards');
    const learnedSetsEl = document.getElementById('stats-learned-sets');
    if (!gridEl) return;

    gridEl.innerHTML = '';

    let totalMasteredCards = 0;
    const filterQuery = (query || '').toLowerCase().trim();

    const filteredDecks = savedDecks.filter(deck => {
        if (!filterQuery) return true;
        return (deck.name || '').toLowerCase().includes(filterQuery) ||
               (deck.sourceType || '').toLowerCase().includes(filterQuery);
    });

    if (!savedDecks || savedDecks.length === 0) {
        gridEl.innerHTML = `
            <div class="empty-library-prompt" style="grid-column: span 2; padding: 24px; text-align: center; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 20px;">
                <div style="display: flex; justify-content: center; margin-bottom: 8px;">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#6366f1" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </div>
                <div style="font-weight: 800; font-size: 14px; color: #0f172a;">No Study Decks Created Yet</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Upload notes or enter a topic above to generate your first deck!</div>
            </div>
        `;
        if (learnedCardsEl) learnedCardsEl.textContent = '0 cards';
        if (learnedSetsEl) learnedSetsEl.textContent = '0';
        return;
    }

    if (filteredDecks.length === 0) {
        gridEl.innerHTML = `
            <div class="empty-library-prompt" style="grid-column: span 2; padding: 20px; text-align: center; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 20px;">
                <div style="font-weight: 700; font-size: 13px; color: #64748b;">No decks match "${escapeHtml(query)}"</div>
            </div>
        `;
    }

    const PASTEL_CLASSES = ['mockup-card-yellow', 'mockup-card-purple', 'mockup-card-pink', 'mockup-card-mint'];
    const TILT_CLASSES = ['card-tilt-left', 'card-tilt-right'];
    const CORNER_SVGS = [
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8M8 12h8"></path></svg>'
    ];

    let totalCardsInLibrary = 0;
    savedDecks.forEach(d => {
        totalCardsInLibrary += (d.cards ? d.cards.length : 0);
    });

    filteredDecks.forEach((deck, idx) => {
        const totalCards = deck.cards ? deck.cards.length : 0;
        const masteredCount = deck.cards ? deck.cards.filter(c => c.mastered).length : 0;
        totalMasteredCards += masteredCount;

        const masteryPercent = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;
        const pastelClass = PASTEL_CLASSES[idx % PASTEL_CLASSES.length];
        const tiltClass = TILT_CLASSES[idx % TILT_CLASSES.length];
        const cornerIcon = CORNER_SVGS[idx % CORNER_SVGS.length];
        const badgeText = deck.sourceType ? deck.sourceType.toUpperCase() : (totalCards > 10 ? 'FLASHCARDS' : 'PDF');

        const cardEl = document.createElement('div');
        cardEl.className = `pastel-study-card ${pastelClass} ${tiltClass} ${deck.id === activeDeckId ? 'active-deck' : ''}`;
        cardEl.dataset.deckId = deck.id;

        cardEl.innerHTML = `
            <div class="card-top-row">
                <span class="badge-pill-black">${badgeText}</span>
                <span class="card-corner-icon">${cornerIcon}</span>
            </div>
            <h3 class="card-main-title">${escapeHtml(deck.name || 'Untitled Deck')}</h3>
            <div class="card-bottom-row">
                <span class="card-count-text">${totalCards} cards</span>
                <span class="card-percent-text">${masteryPercent}%</span>
            </div>
            <div class="card-progress-bar">
                <div class="card-progress-fill" style="width: ${masteryPercent}%;"></div>
            </div>
        `;

        cardEl.addEventListener('click', () => {
            selectDeck(deck.id);
        });

        gridEl.appendChild(cardEl);
    });

    if (learnedCardsEl) learnedCardsEl.textContent = `${totalCardsInLibrary} cards`;
    if (learnedSetsEl) learnedSetsEl.textContent = `${savedDecks.length}`;
}

function selectDeck(deckId) {
    activeDeckId = deckId;
    saveState();
    
    const activeDeck = savedDecks.find(d => d.id === activeDeckId);
    renderLibraryDecks();

    const addSourceModal = document.querySelector('.add-source-card-modal');
    if (addSourceModal) {
        addSourceModal.style.display = 'none';
        addSourceModal.classList.add('hidden');
    }

    const placeholder = document.getElementById('flashcards-placeholder');
    const grid = document.getElementById('flashcards-grid');
    const header = document.getElementById('flashcards-header');

    if (activeDeck && activeDeck.cards && activeDeck.cards.length > 0) {
        renderFlashcards(activeDeck.cards);
        if (placeholder) placeholder.classList.add('hidden');
        if (grid) grid.classList.remove('hidden');
        if (header) header.classList.remove('hidden');
    } else {
        renderFlashcards([]);
        if (placeholder) placeholder.classList.remove('hidden');
        if (grid) grid.classList.add('hidden');
        if (header) header.classList.add('hidden');
    }
}

function deleteDeck(deckId) {
    savedDecks = savedDecks.filter(d => d.id !== deckId);

    if (activeDeckId === deckId) {
        activeDeckId = savedDecks.length > 0 ? savedDecks[0].id : null;
    }
    saveState();

    if (activeDeckId) {
        const activeDeck = savedDecks.find(d => d.id === activeDeckId);
        renderFlashcards(activeDeck ? activeDeck.cards : []);
    } else {
        renderFlashcards([]);
    }
    renderHistoryList();
    renderLibraryDecks();
    showToast('Deck deleted.', 'success');
}

function toggleCardMastery(cardIndex) {
    const activeDeck = savedDecks.find(d => d.id === activeDeckId);
    if (!activeDeck) return;

    activeDeck.cards[cardIndex].mastered = !activeDeck.cards[cardIndex].mastered;
    saveState();
    
    renderFlashcards(activeDeck.cards);
    renderLibraryDecks();
}

function updateProgressBar(cards) {
    const textEl = document.getElementById('flashcards-progress-text');
    const fillEl = document.getElementById('flashcards-progress-fill');
    if (!textEl || !fillEl) return;

    const total = cards.length;
    const masteredCount = cards.filter(c => c.mastered).length;
    const percentage = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

    textEl.textContent = `${percentage}% Mastered (${masteredCount}/${total} cards)`;
    fillEl.style.width = `${percentage}%`;
}

function stripEmojis(text) {
    if (!text) return '';
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
}

function getCartoonSvgForTemplate(templateName, idx) {
    const seed = idx || 0;
    const colors = [
        { main: '#2563eb', sec: '#ef4444', acc: '#f59e0b', bg: '#fef3c7' },
        { main: '#7c3aed', sec: '#ec4899', acc: '#06b6d4', bg: '#e0e7ff' },
        { main: '#059669', sec: '#10b981', acc: '#34d399', bg: '#dcfce7' },
        { main: '#ea580c', sec: '#f97316', acc: '#fbbf24', bg: '#ffedd5' }
    ];
    const c = colors[seed % colors.length];

    if (templateName === 'cyberpunk') {
        return `<svg viewBox="0 0 300 120" style="width:100%;height:100%;display:block;border-radius:18px 18px 0 0;" preserveAspectRatio="xMidYMid slice">
            <rect width="300" height="120" fill="#1e1b4b"/>
            <circle cx="150" cy="60" r="45" fill="#ec4899" opacity="0.3"/>
            <circle cx="150" cy="60" r="30" fill="#06b6d4" opacity="0.4"/>
            <rect x="120" y="30" width="60" height="60" rx="16" fill="#0f172a" stroke="#06b6d4" stroke-width="3"/>
            <rect x="130" y="45" width="40" height="16" rx="8" fill="#ec4899"/>
            <circle cx="112" cy="60" r="10" fill="#06b6d4"/>
            <circle cx="188" cy="60" r="10" fill="#06b6d4"/>
            <path d="M112 60 Q150 20 188 60" fill="none" stroke="#38bdf8" stroke-width="4"/>
        </svg>`;
    }

    if (templateName === 'cosmic') {
        return `<svg viewBox="0 0 300 120" style="width:100%;height:100%;display:block;border-radius:18px 18px 0 0;" preserveAspectRatio="xMidYMid slice">
            <rect width="300" height="120" fill="#0f172a"/>
            <circle cx="40" cy="25" r="2" fill="#fff" opacity="0.8"/>
            <circle cx="260" cy="35" r="3" fill="#fde047" opacity="0.9"/>
            <circle cx="220" cy="85" r="2" fill="#fff" opacity="0.7"/>
            <circle cx="70" cy="95" r="2" fill="#fff" opacity="0.8"/>
            <circle cx="230" cy="30" r="14" fill="#f59e0b"/>
            <ellipse cx="230" cy="30" rx="22" ry="5" fill="none" stroke="#fbbf24" stroke-width="3" transform="rotate(-20 230 30)"/>
            <circle cx="150" cy="60" r="32" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>
            <ellipse cx="150" cy="57" rx="20" ry="14" fill="#1e293b"/>
            <ellipse cx="145" cy="53" rx="7" ry="3" fill="#60a5fa" opacity="0.6"/>
        </svg>`;
    }

    if (templateName === 'minimal') {
        return `<svg viewBox="0 0 300 120" style="width:100%;height:100%;display:block;border-radius:18px 18px 0 0;" preserveAspectRatio="xMidYMid slice">
            <rect width="300" height="120" fill="${c.bg}"/>
            <circle cx="90" cy="60" r="40" fill="${c.main}" opacity="0.2"/>
            <circle cx="210" cy="60" r="30" fill="${c.sec}" opacity="0.2"/>
            <rect x="120" y="28" width="60" height="60" rx="22" fill="${c.main}"/>
            <circle cx="138" cy="50" r="5" fill="#ffffff"/>
            <circle cx="162" cy="50" r="5" fill="#ffffff"/>
            <path d="M142 66 Q150 74 158 66" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
        </svg>`;
    }

    if (templateName === 'pixel') {
        return `<svg viewBox="0 0 300 120" style="width:100%;height:100%;display:block;border-radius:18px 18px 0 0;" preserveAspectRatio="xMidYMid slice">
            <rect width="300" height="120" fill="#18181b"/>
            <g transform="translate(110, 20)">
                <rect x="20" y="10" width="40" height="10" fill="#f43f5e"/>
                <rect x="10" y="20" width="60" height="40" fill="#fbbf24"/>
                <rect x="20" y="30" width="10" height="10" fill="#09090b"/>
                <rect x="50" y="30" width="10" height="10" fill="#09090b"/>
                <rect x="25" y="50" width="30" height="8" fill="#e11d48"/>
            </g>
        </svg>`;
    }

    return `<svg viewBox="0 0 300 120" style="width:100%;height:100%;display:block;border-radius:18px 18px 0 0;" preserveAspectRatio="xMidYMid slice">
        <rect width="300" height="120" fill="${c.bg}"/>
        <path d="M0 0 L140 0 L90 120 L0 120 Z" fill="${c.sec}" opacity="0.85"/>
        <path d="M140 0 L300 0 L300 120 L90 120 Z" fill="${c.main}" opacity="0.85"/>
        <g transform="translate(110, 15)">
            <rect x="15" y="10" width="55" height="70" rx="18" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
            <path d="M15 10 Q42 32 70 10 L70 42 Z" fill="${c.acc}"/>
            <circle cx="34" cy="38" r="11" fill="#0f172a"/>
            <circle cx="34" cy="38" r="4" fill="#38bdf8"/>
            <polygon points="52,28 65,45 49,45" fill="#ef4444"/>
            <rect x="28" y="58" width="28" height="9" rx="4" fill="#0f172a"/>
            <line x1="37" y1="58" x2="37" y2="67" stroke="#fff" stroke-width="2"/>
            <line x1="47" y1="58" x2="47" y2="67" stroke="#fff" stroke-width="2"/>
        </g>
    </svg>`;
}

function renderFlashcards(cards) {
    const placeholder = document.getElementById('flashcards-placeholder');
    const grid = document.getElementById('flashcards-grid');
    const header = document.getElementById('flashcards-header');

    grid.innerHTML = '';
    
    if (!cards || cards.length === 0) {
        placeholder.classList.remove('hidden');
        grid.classList.add('hidden');
        header.classList.add('hidden');
        return;
    }

    placeholder.classList.add('hidden');
    grid.classList.remove('hidden');
    header.classList.remove('hidden');

    cards.forEach((card, idx) => {
        const themeIdx = card.themeIdx !== undefined ? card.themeIdx : (idx % CARD_THEMES.length);
        const theme = CARD_THEMES[themeIdx] || CARD_THEMES[0];

        const hasRecall = !!(card.expectedAnswer && card.expectedAnswer.trim());
        const cardEl = document.createElement('div');
        cardEl.className = `flashcard flashcard-appear ${card.mastered ? 'mastered' : ''} ${hasRecall ? 'has-recall' : ''}`;
        cardEl.style.animationDelay = `${idx * 0.05}s`;
        cardEl.style.setProperty('--card-color', theme.color);
        cardEl.style.setProperty('--card-gradient', theme.gradient);

        // Build mnemonic markup if it exists
        const mnemonicHtml = card.mnemonic ? `
            <div class="card-mnemonic-box">
                ${renderSafeHtml(card.mnemonic)}
            </div>
        ` : '';

        const recallHtml = (card.expectedAnswer && card.expectedAnswer.trim()) ? `
            <div class="card-recall-container" style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
                <input type="text" class="card-recall-input" placeholder="Type the correct syntax / output..." style="padding: 6px 10px; border-radius: 4px; border: 1px solid var(--card-color, #ccc); background: rgba(255,255,255,0.9); color: #333; font-family: monospace; font-size: 13px; outline: none; width: 100%; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <button class="card-recall-check-btn" style="padding: 4px 12px; background: var(--card-color); color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Check Answer</button>
                    <span class="card-recall-feedback" style="font-size: 12px; font-weight: 600; min-height: 18px;"></span>
                </div>
            </div>
        ` : '';
        const cartoonSvgMarkup = getCartoonSvgForTemplate(activeCartoonTemplate, idx);

        cardEl.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-stack-layer layer-back-2"></div>
                <div class="flashcard-stack-layer layer-back-1"></div>
                <div class="flashcard-front">
                    <!-- Hero Cartoon Cover Art Box at Top (Reference Match) -->
                    <div class="card-hero-illustration-box" style="position: relative; width: 100%; height: 120px; border-radius: 18px 18px 0 0; overflow: hidden; margin-bottom: 12px; flex-shrink: 0;">
                        ${cartoonSvgMarkup}
                        <div class="card-folder-tab-badge" style="position: absolute; top: 10px; left: 12px; z-index: 5;">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <span>${escapeHtml(card.category || 'General')}</span>
                        </div>
                        <span class="flashcard-index-label" style="position: absolute; top: 10px; right: 12px; z-index: 5; background: rgba(0,0,0,0.4); color: #fff; padding: 2px 8px; border-radius: 10px;">${idx + 1} / ${cards.length}</span>
                    </div>

                    ${card.mastered ? `
                        <div class="flashcard-mastered-badge" style="position: absolute; top: 124px; right: 12px; z-index: 6;">
                            ✓ Got It
                        </div>
                    ` : ''}

                    <div class="card-body-content" style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; min-height: 90px;">
                        <div class="flashcard-question-text" style="margin-top: 0;">${renderSafeHtml(stripEmojis(card.question))}</div>
                        ${recallHtml}
                    </div>

                    <!-- Bottom Progress Info Track (Matching Reference Image!) -->
                    <div class="card-footer-info-row" style="width: 100%; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border, #e2e8f0); display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; font-weight: 700; color: var(--text-muted, #64748b);">
                            <span>Question ${idx + 1} of ${cards.length}</span>
                            <span style="color: ${card.mastered ? '#10b981' : '#6366f1'};">${card.mastered ? 'Lesson Mastered' : 'In Progress'}</span>
                        </div>
                        <div class="card-mini-progress-track" style="height: 6px; background: var(--border, #e2e8f0); border-radius: 10px; overflow: hidden; width: 100%;">
                            <div style="height: 100%; width: ${card.mastered ? '100%' : Math.round(((idx + 1) / cards.length) * 100) + '%'}; background: ${card.mastered ? '#10b981' : '#6366f1'}; border-radius: 10px;"></div>
                        </div>
                    </div>

                    <!-- Floating Circle Actions Overlapping Right Edge (Matching Reference Image!) -->
                    <div class="card-floating-actions">
                        <button class="circle-action-btn btn-flip-card" title="Flip Card">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                        </button>
                        <button class="circle-action-btn card-mastery-btn ${card.mastered ? 'active' : ''}" title="Mark as Mastered">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-back-content">
                        <p class="flashcard-back-answer">${renderSafeHtml(stripEmojis(card.answer))}</p>
                        ${mnemonicHtml}
                    </div>
                    <button class="card-mastery-btn ${card.mastered ? 'active' : ''}" title="Mark as Mastered">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px;height:12px;margin-right:2px;">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>${card.mastered ? 'Mastered' : 'Got it!'}</span>
                    </button>
                </div>
            </div>
        `;

        cardEl.addEventListener('click', (e) => {
            if (e.target.closest('.card-mastery-btn') || e.target.closest('.circle-action-btn') || e.target.closest('.flashcard-back-content') || e.target.closest('.card-recall-container')) return;
            cardEl.classList.toggle('flipped');
        });

        const btnFlip = cardEl.querySelector('.btn-flip-card');
        if (btnFlip) {
            btnFlip.addEventListener('click', (e) => {
                e.stopPropagation();
                cardEl.classList.toggle('flipped');
            });
        }

        // Double-click back content to flip back as helper
        const backContent = cardEl.querySelector('.flashcard-back-content');
        backContent.addEventListener('click', (e) => {
            if (e.target.closest('.card-mastery-btn')) return;
            cardEl.classList.toggle('flipped');
        });

        // Stop propagation and handle validation inside recall container
        const recallContainer = cardEl.querySelector('.card-recall-container');
        if (recallContainer) {
            recallContainer.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            const checkBtn = cardEl.querySelector('.card-recall-check-btn');
            const recallInput = cardEl.querySelector('.card-recall-input');
            const feedbackEl = cardEl.querySelector('.card-recall-feedback');

            if (checkBtn && recallInput && feedbackEl) {
                checkBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const userInput = recallInput.value.trim();
                    const expected = card.expectedAnswer.trim();
                    
                    const normalize = (str) => str.replace(/\s+/g, '').replace(/;$/, '').replace(/['"]/g, '"');
                    
                    if (normalize(userInput) === normalize(expected)) {
                        feedbackEl.style.color = '#2e7d32';
                        feedbackEl.textContent = 'Correct!';
                        
                        setTimeout(() => {
                            if (!card.mastered) {
                                toggleCardMastery(idx);
                            }
                            cardEl.classList.add('flipped');
                        }, 800);
                    } else {
                        feedbackEl.style.color = '#c62828';
                        feedbackEl.textContent = 'Incorrect. Try again!';
                    }
                });
            }
        }

        const masteryBtn = cardEl.querySelector('.card-mastery-btn');
        masteryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCardMastery(idx);
        });

        grid.appendChild(cardEl);
    });

    updateProgressBar(cards);
}

// ─── REVISION SCHEDULE HANDLERS ───
async function handleGenerateSchedule() {
    const syllabusInputEl = document.getElementById('schedule-syllabus-input');
    let syllabusText = syllabusInputEl ? syllabusInputEl.value.trim() : '';
    let dateInput = document.getElementById('exam-date-input').value;

    const sourceSyllabus = (syllabusText + '\n' + (scheduleFileText || '')).trim();

    if (!sourceSyllabus) {
        showToast('Please enter your syllabus details or upload a syllabus file.', 'error');
        return;
    }

    if (!dateInput) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        const yyyy = defaultDate.getFullYear();
        const mm = String(defaultDate.getMonth() + 1).padStart(2, '0');
        const dd = String(defaultDate.getDate()).padStart(2, '0');
        dateInput = `${yyyy}-${mm}-${dd}`;
        document.getElementById('exam-date-input').value = dateInput;
    }

    const examDate = new Date(dateInput);
    const today = new Date();
    examDate.setHours(12, 0, 0, 0);
    today.setHours(12, 0, 0, 0);

    const diffTime = examDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        showToast('Exam date must be today or in the future.', 'error');
        return;
    }

    const btn = document.getElementById('btn-generate-schedule');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="ai-spinner"></span> Generating Plan...';

    try {
        const prompt = `You are an expert study planner. We have an exam or interview coming up in ${diffDays} days (Date: ${dateInput}).
The student's syllabus/topics are provided below. Create a complete, professional day-by-day study and revision schedule distributing the topics logically leading up to the target date.

IMPORTANT: 
- If the syllabus/topics explicitly mention "data structures", "algorithms", "dsa", or "leetcode", restructure the daily plan to act as a coding prep pathway. For each day, include:
  1. Specific DSA topics to master (e.g. "Sliding Window", "Binary Search", "Graphs/DFS").
  2. 2-3 specific target LeetCode practice problem names (e.g. "Two Sum", "Merge Intervals", "Longest Substring Without Repeating Characters", "Valid Parentheses").
  3. A coding tip or active-recall exercise on syntax, implementation detail, or time/space complexity.
- For all other subjects (including standard programming languages, web development like HTML/CSS/JS, history, science, math, etc. that do not explicitly mention DSA or LeetCode), generate a standard study plan tailored directly and exclusively to the provided syllabus topics. Do NOT inject DSA topics or LeetCode problems into non-DSA subjects. The daily topics and prep tips must be relevant to the subject.

Each daily revision plan must be returned as a JSON array of objects. You must return only a valid JSON array of objects (optionally wrapped in a \`\`\`json ... \`\`\` codeblock).
Each object must have the following properties:
- "day": string (e.g., "Day 1")
- "date": string (formatted date)
- "focus": string (the main topic focus for the day, e.g. "HTML Basics & Semantic Tags", "World War II Causes", or "DSA: Sliding Window Technique")
- "duration": string (recommended study duration, e.g. "2 hours" or "1.5 hours")
- "topics": string (a newline-separated list of concrete, checkable tasks to complete today. For non-DSA subjects, this should be detailed sub-topics or readings from the syllabus. For DSA/LeetCode subjects, include specific checklist tasks)
- "leetcodeProblems": array of strings (For DSA/LeetCode subjects, include 2-3 specific LeetCode problem titles to solve today, e.g. ["Two Sum", "Merge Intervals"]. For non-DSA subjects, return an empty array [])
- "examPrepTip": string (a specific active-recall tip or test advice for today's topics, e.g., "Explain the difference between absolute and relative positioning in CSS.")
- "urgent": boolean (set to true if this day falls within 3 days of the target date, or is a mock test / revision review day)

Example format:
[
  {
    "day": "Day 1",
    "date": "June 1, 2026",
    "focus": "React State Management",
    "duration": "2 hours",
    "topics": "- Review useState and useEffect hooks\\n- Refactor class components to functional",
    "leetcodeProblems": [],
    "examPrepTip": "Prep Tip: Build a search filter input without looking at docs.",
    "urgent": false
  }
]

Syllabus Details:
${sourceSyllabus}`;

        const aiResponse = await generateTextWithGroq(prompt);
        if (aiResponse.includes("Error:") || aiResponse.includes("Deployment Error")) {
            throw new Error(aiResponse);
        }

        const schedule = parseJsonArray(aiResponse);
        if (!Array.isArray(schedule)) {
            throw new Error("AI did not return a valid study schedule.");
        }

        // Initialize empty checklist states
        schedule.forEach(item => {
            item.checkedTasks = [];
            item.checkedLeetCode = [];
        });

        // Determine Schedule Title
        let scheduleName = '';
        if (syllabusText) {
            scheduleName = syllabusText.split('\n')[0].substring(0, 26).trim();
            if (syllabusText.length > 26) scheduleName += '...';
        } else {
            const fileLabel = document.getElementById('schedule-filename').textContent;
            scheduleName = fileLabel ? fileLabel.substring(0, 26).trim() : 'Study Plan';
            if (fileLabel && fileLabel.length > 26) scheduleName += '...';
        }
        scheduleName += ` (${diffDays} days)`;

        // Create new Schedule record
        const newSchedule = {
            id: Date.now().toString(),
            name: scheduleName,
            timestamp: Date.now(),
            examDate: dateInput,
            items: schedule
        };

        // Save to schedules list
        savedSchedules.unshift(newSchedule);
        activeScheduleId = newSchedule.id;

        saveState();

        renderSchedule(newSchedule.items);
        
        // Reset Inputs
        syllabusInputEl.value = '';
        scheduleFileText = '';
        document.getElementById('exam-date-input').value = '';
        const filenameLabel = document.getElementById('schedule-filename');
        if (filenameLabel) filenameLabel.textContent = '';
        const dropzoneText = document.querySelector('#schedule-dropzone .upload-text');
        if (dropzoneText) dropzoneText.classList.remove('hidden');

        showToast('Exam preparation schedule generated successfully.', 'success');

    } catch (err) {
        console.error(err);
        showToast(err.message || 'Timeline generation failed.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

function selectSchedule(schedId) {
    activeScheduleId = schedId;
    saveState();
    
    const activeSched = savedSchedules.find(s => s.id === activeScheduleId);
    if (activeSched) {
        renderSchedule(activeSched.items);
    }
}

function deleteScheduleRecord(schedId) {
    savedSchedules = savedSchedules.filter(s => s.id !== schedId);

    if (activeScheduleId === schedId) {
        activeScheduleId = savedSchedules.length > 0 ? savedSchedules[0].id : null;
    }
    saveState();

    if (activeScheduleId) {
        const activeSched = savedSchedules.find(s => s.id === activeScheduleId);
        renderSchedule(activeSched ? activeSched.items : []);
    } else {
        renderSchedule([]);
    }
    renderHistoryList();
    showToast('Schedule deleted.', 'success');
}

function selectFlowchart(flowId) {
    activeFlowchartId = flowId;
    
    const activeFlow = savedFlowcharts.find(f => f.id === activeFlowchartId);
    if (activeFlow) {
        shapes = activeFlow.shapes || [];
    }
    saveState();
    renderFlowchart();
}

function deleteFlowchart(flowId) {
    savedFlowcharts = savedFlowcharts.filter(f => f.id !== flowId);

    if (activeFlowchartId === flowId) {
        activeFlowchartId = savedFlowcharts.length > 0 ? savedFlowcharts[0].id : null;
        if (activeFlowchartId) {
            const activeFlow = savedFlowcharts.find(f => f.id === activeFlowchartId);
            shapes = activeFlow ? activeFlow.shapes : [];
        } else {
            shapes = [];
        }
    }
    saveState();
    renderFlowchart();
    
    renderHistoryList();
    showToast('Flowchart deleted.', 'success');
}

function renderSchedule(schedule) {
    const placeholder = document.getElementById('schedule-placeholder');
    const timeline = document.getElementById('schedule-timeline');

    timeline.innerHTML = '';
    
    if (!schedule || schedule.length === 0) {
        placeholder.classList.remove('hidden');
        timeline.classList.add('hidden');
        return;
    }

    placeholder.classList.add('hidden');
    timeline.classList.remove('hidden');

    schedule.forEach((item, itemIdx) => {
        const itemEl = document.createElement('div');
        let cardClass = 'timeline-card';
        if (item.urgent) {
            cardClass += ' urgent';
        }
        itemEl.className = cardClass;

        // Parse list lines dynamically to build checklist
        const topicsStr = item.topics || '';
        const lines = topicsStr.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        let listHtml = '';
        if (lines.length > 0) {
            listHtml = `<ul class="timeline-task-list">`;
            lines.forEach((lineText, lineIdx) => {
                const cleanedText = lineText.replace(/^([-*•\d\.\s]+)/, '');
                const isChecked = item.checkedTasks && item.checkedTasks[lineIdx] ? true : false;
                
                listHtml += `
                    <li class="timeline-task-item">
                        <label class="task-checkbox-label">
                            <input type="checkbox" class="task-checkbox" data-item-idx="${itemIdx}" data-line-idx="${lineIdx}" ${isChecked ? 'checked' : ''}>
                            <span class="task-checkbox-custom"></span>
                            <span class="task-text">${escapeHtml(cleanedText)}</span>
                        </label>
                    </li>
                `;
            });
            listHtml += `</ul>`;
        } else {
            listHtml = `<p class="timeline-topics">${escapeHtml(item.topics || '')}</p>`;
        }

        // Build Daily Focus & Prep Tips blocks
        const focusHtml = `
            <div class="timeline-focus-box">
                <span class="focus-label">Daily Focus:</span>
                <span class="focus-text">${escapeHtml(item.focus || 'General Review')}</span>
            </div>
        `;

        const tipHtml = item.examPrepTip ? `
            <div class="timeline-tip-box">
                <span class="tip-icon">💡</span>
                <p class="tip-text">${renderSafeHtml(item.examPrepTip)}</p>
            </div>
        ` : '';

        let leetcodeHtml = '';
        if (item.leetcodeProblems && Array.isArray(item.leetcodeProblems) && item.leetcodeProblems.length > 0) {
            leetcodeHtml = `
                <div class="timeline-leetcode-box" style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border-color, #e0e0e0);">
                    <span class="leetcode-label" style="font-size: 12px; font-weight: 700; color: #1a73e8; display: block; margin-bottom: 6px;">LeetCode Challenges:</span>
                    <ul class="timeline-task-list" style="margin: 0; padding-left: 0; list-style: none;">
            `;
            item.leetcodeProblems.forEach((problem, pIdx) => {
                const slug = problem.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
                const leetcodeUrl = `https://leetcode.com/problems/${slug}/`;
                const isChecked = item.checkedLeetCode && item.checkedLeetCode[pIdx] ? true : false;
                
                leetcodeHtml += `
                    <li class="timeline-task-item" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <label class="task-checkbox-label" style="flex: 1; display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" class="leetcode-checkbox" data-item-idx="${itemIdx}" data-problem-idx="${pIdx}" ${isChecked ? 'checked' : ''}>
                            <span class="task-checkbox-custom"></span>
                            <span class="task-text" style="${isChecked ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${escapeHtml(problem)}</span>
                        </label>
                        <a href="${leetcodeUrl}" target="_blank" class="leetcode-link" style="font-size: 11px; color: #e67e22; font-weight: 600; text-decoration: none; padding: 2px 6px; border: 1px solid #e67e22; border-radius: 4px; display: inline-flex; align-items: center;" onclick="event.stopPropagation();">Solve ↗</a>
                    </li>
                `;
            });
            leetcodeHtml += `
                    </ul>
                </div>
            `;
        }
        itemEl.innerHTML = `
            <div class="timeline-header">
                <span class="timeline-day">${escapeHtml(item.day)}</span>
                <div class="timeline-meta-header">
                    <span class="timeline-duration">⏱ ${escapeHtml(item.duration || '2 hours')}</span>
                    <span class="timeline-date">${escapeHtml(item.date)}</span>
                </div>
            </div>
            ${focusHtml}
            ${listHtml}
            ${leetcodeHtml}
            ${tipHtml}
        `;

        // Checkbox state toggle
        const checkboxes = itemEl.querySelectorAll('.task-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const iIdx = parseInt(e.target.dataset.itemIdx, 10);
                const lIdx = parseInt(e.target.dataset.lineIdx, 10);
                toggleScheduleTask(iIdx, lIdx, e.target.checked);
            });
        });

        // Leetcode checkbox state toggle
        const leetcodeCheckboxes = itemEl.querySelectorAll('.leetcode-checkbox');
        leetcodeCheckboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const iIdx = parseInt(e.target.dataset.itemIdx, 10);
                const pIdx = parseInt(e.target.dataset.problemIdx, 10);
                toggleLeetCodeTask(iIdx, pIdx, e.target.checked);
            });
        });
        timeline.appendChild(itemEl);
    });
}

function toggleScheduleTask(itemIdx, lineIdx, isChecked) {
    if (activeScheduleId) {
        const activeSched = savedSchedules.find(s => s.id === activeScheduleId);
        if (activeSched && activeSched.items[itemIdx]) {
            if (!activeSched.items[itemIdx].checkedTasks) {
                activeSched.items[itemIdx].checkedTasks = [];
            }
            activeSched.items[itemIdx].checkedTasks[lineIdx] = isChecked;
            saveState();
        }
    } else {
        // Fallback for unsaved/legacy items
        const stored = localStorage.getItem(STORAGE_SCHEDULE_KEY);
        if (!stored) return;
        try {
            const schedule = JSON.parse(stored);
            if (!schedule[itemIdx]) return;
            
            if (!schedule[itemIdx].checkedTasks) {
                schedule[itemIdx].checkedTasks = [];
            }
            schedule[itemIdx].checkedTasks[lineIdx] = isChecked;

            localStorage.setItem(STORAGE_SCHEDULE_KEY, JSON.stringify(schedule));
        } catch (e) {
            console.error(e);
        }
    }
}

function toggleLeetCodeTask(itemIdx, problemIdx, isChecked) {
    if (activeScheduleId) {
        const activeSched = savedSchedules.find(s => s.id === activeScheduleId);
        if (activeSched && activeSched.items[itemIdx]) {
            if (!activeSched.items[itemIdx].checkedLeetCode) {
                activeSched.items[itemIdx].checkedLeetCode = [];
            }
            activeSched.items[itemIdx].checkedLeetCode[problemIdx] = isChecked;
            saveState();
        }
    } else {
        const stored = localStorage.getItem(STORAGE_SCHEDULE_KEY);
        if (!stored) return;
        try {
            const schedule = JSON.parse(stored);
            if (!schedule[itemIdx]) return;
            
            if (!schedule[itemIdx].checkedLeetCode) {
                schedule[itemIdx].checkedLeetCode = [];
            }
            schedule[itemIdx].checkedLeetCode[problemIdx] = isChecked;

            localStorage.setItem(STORAGE_SCHEDULE_KEY, JSON.stringify(schedule));
        } catch (e) {
            console.error(e);
        }
    }
}
// ─── LOCAL STORAGE & DATABASE LOADER ───
async function loadSavedState() {
    try {
        currentUser = await getCurrentUser();
    } catch (e) {
        currentUser = null;
    }

    let loadedFromDb = false;

    if (currentUser) {
        try {
            const res = await fetch('/api/student-hub');
            if (res.ok) {
                const data = await res.json();
                if (data && (data.decks?.length || data.schedules?.length || data.flowcharts?.length)) {
                    savedDecks = data.decks || [];
                    activeDeckId = data.activeDeckId || null;
                    savedSchedules = data.schedules || [];
                    activeScheduleId = data.activeScheduleId || null;
                    savedFlowcharts = data.flowcharts || [];
                    activeFlowchartId = data.activeFlowchartId || null;
                    loadedFromDb = true;
                }
            }
        } catch (e) {
            // quiet fallback
        }
    }

    if (!loadedFromDb) {
        // 1. Load Decks from localStorage
        try {
            const storedDecks = localStorage.getItem(STORAGE_DECKS_KEY);
            if (storedDecks) {
                savedDecks = JSON.parse(storedDecks);
            }
            // Filter out legacy hardcoded sample decks
            if (Array.isArray(savedDecks)) {
                savedDecks = savedDecks.filter(d => d && !['deck_calc_1', 'deck_lecture_1', 'deck_syllabus_1', 'deck_cell_div_1'].includes(d.id) && d.name !== 'Intro to Calculus');
            } else {
                savedDecks = [];
            }
            const storedActiveId = localStorage.getItem(STORAGE_ACTIVE_DECK_ID_KEY);
            if (storedActiveId && savedDecks.some(d => d.id === storedActiveId)) {
                activeDeckId = storedActiveId;
            } else {
                activeDeckId = savedDecks.length > 0 ? savedDecks[0].id : null;
            }
        } catch (e) {
            savedDecks = [];
            activeDeckId = null;
        }

        // 2. Load Schedules from localStorage
        try {
            console.log("Loading study schedules from localStorage...");
            const storedSchedules = localStorage.getItem(STORAGE_SCHEDULES_KEY);
            if (storedSchedules) {
                savedSchedules = JSON.parse(storedSchedules);
            }
            const storedActiveScheduleId = localStorage.getItem(STORAGE_ACTIVE_SCHEDULE_ID_KEY);
            if (storedActiveScheduleId) {
                activeScheduleId = storedActiveScheduleId;
            } else if (savedSchedules.length > 0) {
                activeScheduleId = savedSchedules[0].id;
            }
            if (!activeScheduleId) {
                const savedSchedule = localStorage.getItem(STORAGE_SCHEDULE_KEY);
                if (savedSchedule) {
                    try {
                        const schedule = JSON.parse(savedSchedule);
                        if (Array.isArray(schedule) && schedule.length) {
                            const migratedId = "legacy_" + Date.now().toString();
                            const migratedSchedule = {
                                id: migratedId,
                                name: "Legacy Study Plan",
                                timestamp: Date.now(),
                                examDate: "",
                                items: schedule
                            };
                            savedSchedules.push(migratedSchedule);
                            activeScheduleId = migratedId;
                            localStorage.setItem(STORAGE_SCHEDULES_KEY, JSON.stringify(savedSchedules));
                            localStorage.setItem(STORAGE_ACTIVE_SCHEDULE_ID_KEY, activeScheduleId);
                            localStorage.removeItem(STORAGE_SCHEDULE_KEY);
                        }
                    } catch (e) {
                        console.error("Failed to parse legacy schedule:", e);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load schedules from localStorage:", e);
        }

        // 3. Load Flowcharts from localStorage
        try {
            console.log("Loading flowchart state from localStorage...");
            const storedFlowcharts = localStorage.getItem(STORAGE_FLOWCHARTS_LIST_KEY);
            if (storedFlowcharts) {
                savedFlowcharts = JSON.parse(storedFlowcharts);
            }
            const storedActiveFlowchartId = localStorage.getItem(STORAGE_ACTIVE_FLOWCHART_ID_KEY);
            if (storedActiveFlowchartId) {
                activeFlowchartId = storedActiveFlowchartId;
            } else if (savedFlowcharts.length > 0) {
                activeFlowchartId = savedFlowcharts[0].id;
            }
        } catch (e) {
            console.error("Failed to load flowchart state from localStorage:", e);
        }
    }

    // Render active views based on loaded state
    renderLibraryDecks();

    if (activeDeckId) {
        selectDeck(activeDeckId);
    } else {
        const addSourceModal = document.querySelector('.add-source-card-modal');
        if (addSourceModal) {
            addSourceModal.style.display = 'block';
            addSourceModal.classList.remove('hidden');
        }
        renderFlashcards([]);
    }

    if (activeScheduleId) {
        const activeSched = savedSchedules.find(s => s.id === activeScheduleId);
        if (activeSched) {
            renderSchedule(activeSched.items);
        }
    } else {
        renderSchedule([]);
    }

    // Check for new/unsaved visualizations from code workspace
    const rawStored = localStorage.getItem(STORAGE_FLOWCHART_SHAPES_KEY);
    if (rawStored) {
        try {
            const rawShapes = JSON.parse(rawStored);
            if (rawShapes && rawShapes.length > 0) {
                const isAlreadySaved = savedFlowcharts.some(f => JSON.stringify(f.shapes) === rawStored);
                if (!isAlreadySaved) {
                    const newFlow = {
                        id: 'vis_' + Date.now().toString(),
                        name: 'Visualized Code',
                        timestamp: Date.now(),
                        shapes: rawShapes
                    };
                    savedFlowcharts.unshift(newFlow);
                    activeFlowchartId = newFlow.id;
                    saveState();
                }
            }
        } catch (e) {
            console.error("Failed to parse raw flowchart shapes:", e);
        }
    }

    if (activeFlowchartId) {
        const activeFlow = savedFlowcharts.find(f => f.id === activeFlowchartId);
        if (activeFlow) {
            shapes = activeFlow.shapes || [];
            localStorage.setItem(STORAGE_FLOWCHART_SHAPES_KEY, JSON.stringify(shapes));
        }
    } else {
        loadFlowchartState();
    }

    if (activeTab === 'flowcharts') {
        renderFlowchart();
    }
}

// ─── HELPERS ───
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderSafeHtml(str) {
    if (!str) return '';
    let escaped = escapeHtml(str);
    
    // Parse markdown multi-line code blocks (e.g. ```javascript ... ```)
    escaped = escaped.replace(/```(?:[a-zA-Z0-9+#]+)?\n?([\s\S]*?)```/g, (match, code) => {
        return `<pre class="code-block-flashcard"><code>${code.trim()}</code></pre>`;
    });

    // Parse inline code (e.g. `code`)
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="inline-code-flashcard">$1</code>');

    escaped = escaped
        .replace(/&lt;strong&gt;/g, '<strong>')
        .replace(/&lt;\/strong&gt;/g, '</strong>')
        .replace(/&lt;b&gt;/g, '<b>')
        .replace(/&lt;\/b&gt;/g, '</b>')
        .replace(/&lt;em&gt;/g, '<em>')
        .replace(/&lt;\/em&gt;/g, '</em>')
        .replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>'); // Parse bold markdown fallbacks
    return escaped;
}

// ─── FLOWCHART MAKER FUNCTIONS ───

function saveFlowchartState() {
    if (activeFlowchartId) {
        const idx = savedFlowcharts.findIndex(f => f.id === activeFlowchartId);
        if (idx !== -1) {
            savedFlowcharts[idx].shapes = shapes;
        }
    }
    saveState();
}

function loadFlowchartState() {
    try {
        const storedShapes = localStorage.getItem(STORAGE_FLOWCHART_SHAPES_KEY);
        shapes = storedShapes ? JSON.parse(storedShapes) : [];
    } catch (e) {
        console.error("Failed to load flowchart state:", e);
        shapes = [];
    }
}

// ─── SVG Geometry Builders ───
// Returns the inner SVG markup for each supported shape type
function getSvgContentForType(type) {
    switch (type) {
        // ── Lines & Arrows ──
        case 'line':
            return `<line x1="2" y1="2" x2="98" y2="98" vector-effect="non-scaling-stroke" />`;
        case 'line-up':
            return `<line x1="2" y1="98" x2="98" y2="2" vector-effect="non-scaling-stroke" />`;
        case 'line-h':
            return `<line x1="2" y1="50" x2="98" y2="50" vector-effect="non-scaling-stroke" />`;
        case 'line-v':
            return `<line x1="50" y1="2" x2="50" y2="98" vector-effect="non-scaling-stroke" />`;
        case 'curve':
            return `<path d="M2 90 Q50 2 98 90" fill="none" vector-effect="non-scaling-stroke" />`;
        case 'arrow':
            return `<defs><marker id="fc-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" /></marker></defs>
                    <line x1="2" y1="2" x2="92" y2="92" vector-effect="non-scaling-stroke" marker-end="url(#fc-arrow)" />`;
        case 'arrow-up':
            return `<defs><marker id="fc-arrow-up" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" /></marker></defs>
                    <line x1="2" y1="92" x2="92" y2="2" vector-effect="non-scaling-stroke" marker-end="url(#fc-arrow-up)" />`;
        case 'double-arrow':
            return `<defs>
                      <marker id="fc-da-end" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" /></marker>
                      <marker id="fc-da-start" viewBox="0 0 10 10" refX="4" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 10 0 L 0 5 L 10 10 z" fill="var(--primary)" /></marker>
                    </defs>
                    <line x1="8" y1="8" x2="92" y2="92" vector-effect="non-scaling-stroke" marker-start="url(#fc-da-start)" marker-end="url(#fc-da-end)" />`;
        case 'elbow':
            return `<defs><marker id="fc-elbow-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" /></marker></defs>
                    <path d="M 5 5 L 50 5 L 50 95 L 95 95" fill="none" vector-effect="non-scaling-stroke" marker-end="url(#fc-elbow-arrow)" />`;

        // ── Rectangles ──
        case 'rectangle':
        case 'process':
        case 'fc-process':
            return `<rect x="2" y="2" width="96" height="96" rx="2" vector-effect="non-scaling-stroke" />`;
        case 'rounded-rect':
        case 'terminator':
        case 'fc-alt-process':
            return `<rect x="2" y="2" width="96" height="96" rx="20" vector-effect="non-scaling-stroke" />`;
        case 'snipped-rect':
            return `<polygon points="18,2 98,2 98,98 2,98 2,18" vector-effect="non-scaling-stroke" />`;
        case 'snipped-rect-both':
            return `<polygon points="18,2 82,2 98,18 98,98 2,98 2,18" vector-effect="non-scaling-stroke" />`;
        case 'single-round-rect':
            return `<path d="M2,2 L80,2 Q98,2 98,20 L98,98 L2,98 Z" vector-effect="non-scaling-stroke" />`;
        case 'round-diag-rect':
            return `<path d="M2,20 Q2,2 20,2 L80,2 L98,2 L98,80 Q98,98 80,98 L20,98 L2,98 Z" vector-effect="non-scaling-stroke" />`;

        // ── Basic Shapes ──
        case 'oval':
        case 'circle':
            return `<ellipse cx="50" cy="50" rx="48" ry="48" vector-effect="non-scaling-stroke" />`;
        case 'triangle':
            return `<polygon points="50,2 98,98 2,98" vector-effect="non-scaling-stroke" />`;
        case 'right-triangle':
            return `<polygon points="2,2 98,98 2,98" vector-effect="non-scaling-stroke" />`;
        case 'parallelogram':
        case 'fc-data':
            return `<polygon points="25,2 98,2 75,98 2,98" vector-effect="non-scaling-stroke" />`;
        case 'trapezoid':
        case 'fc-manual-op':
            return `<polygon points="20,2 80,2 98,98 2,98" vector-effect="non-scaling-stroke" />`;
        case 'diamond':
        case 'decision':
        case 'fc-decision':
            return `<polygon points="50,2 98,50 50,98 2,50" vector-effect="non-scaling-stroke" />`;
        case 'pentagon':
            return `<polygon points="50,2 98,38 80,98 20,98 2,38" vector-effect="non-scaling-stroke" />`;
        case 'hexagon':
        case 'fc-preparation':
            return `<polygon points="20,2 80,2 98,50 80,98 20,98 2,50" vector-effect="non-scaling-stroke" />`;
        case 'octagon':
            return `<polygon points="30,2 70,2 98,30 98,70 70,98 30,98 2,70 2,30" vector-effect="non-scaling-stroke" />`;
        case 'cylinder':
            return `<ellipse cx="50" cy="15" rx="46" ry="13" vector-effect="non-scaling-stroke" />
                    <path d="M 4,15 L 4,85 A 46,13 0 0 0 96,85 L 96,15" fill="none" vector-effect="non-scaling-stroke" />`;
        case 'cube':
            return `<rect x="2" y="20" width="68" height="68" vector-effect="non-scaling-stroke" />
                    <rect x="30" y="2" width="68" height="68" vector-effect="non-scaling-stroke" />
                    <line x1="2" y1="20" x2="30" y2="2" vector-effect="non-scaling-stroke" />
                    <line x1="70" y1="20" x2="98" y2="2" vector-effect="non-scaling-stroke" />
                    <line x1="70" y1="88" x2="98" y2="70" vector-effect="non-scaling-stroke" />`;
        case 'cross':
            return `<polygon points="35,2 65,2 65,35 98,35 98,65 65,65 65,98 35,98 35,65 2,65 2,35 35,35" vector-effect="non-scaling-stroke" />`;
        case 'l-shape':
            return `<polygon points="2,2 30,2 30,65 98,65 98,98 2,98" vector-effect="non-scaling-stroke" />`;
        case 'smiley':
            return `<circle cx="50" cy="50" r="46" vector-effect="non-scaling-stroke" />
                    <circle cx="35" cy="38" r="4" fill="var(--primary)" />
                    <circle cx="65" cy="38" r="4" fill="var(--primary)" />
                    <path d="M 30,62 Q 50,78 70,62" fill="none" vector-effect="non-scaling-stroke" />`;
        case 'heart':
            return `<path d="M 50,90 l -6,-5.5 C 20,64 5,52 5,37 C 5,22 17,12 30,12 c 8,0 15,4 20,9 C 55,16 62,12 70,12 c 13,0 25,10 25,25 c 0,15 -15,27 -39,47.5 L 50,90 Z" vector-effect="non-scaling-stroke" />`;
        case 'lightning':
            return `<polygon points="55,2 95,2 40,50 60,50 5,98 30,50 20,50" vector-effect="non-scaling-stroke" />`;
        case 'sun':
            return `<circle cx="50" cy="50" r="20" vector-effect="non-scaling-stroke" />
                    <line x1="50" y1="5" x2="50" y2="15" vector-effect="non-scaling-stroke" />
                    <line x1="50" y1="85" x2="50" y2="95" vector-effect="non-scaling-stroke" />
                    <line x1="5" y1="50" x2="15" y2="50" vector-effect="non-scaling-stroke" />
                    <line x1="85" y1="50" x2="95" y2="50" vector-effect="non-scaling-stroke" />
                    <line x1="18" y1="18" x2="25" y2="25" vector-effect="non-scaling-stroke" />
                    <line x1="75" y1="75" x2="82" y2="82" vector-effect="non-scaling-stroke" />
                    <line x1="82" y1="18" x2="75" y2="25" vector-effect="non-scaling-stroke" />
                    <line x1="25" y1="75" x2="18" y2="82" vector-effect="non-scaling-stroke" />`;
        case 'moon':
            return `<path d="M 50 5 A 45 45 0 1 0 50 95 A 35 35 0 0 1 50 5" vector-effect="non-scaling-stroke" />`;
        case 'cloud':
            return `<path d="M 76,40 A 18,18 0 0,0 58,26 A 26,26 0 0,0 14,44 A 22,22 0 0,0 18,82 L 76,82 A 20,20 0 0,0 76,40 Z" vector-effect="non-scaling-stroke" />`;
        case 'frame':
            return `<rect x="2" y="2" width="96" height="96" vector-effect="non-scaling-stroke" />
                    <rect x="14" y="14" width="72" height="72" vector-effect="non-scaling-stroke" />`;

        // ── Block Arrows ──
        case 'block-right':
            return `<polygon points="2,30 60,30 60,8 98,50 60,92 60,70 2,70" vector-effect="non-scaling-stroke" />`;
        case 'block-left':
            return `<polygon points="98,30 40,30 40,8 2,50 40,92 40,70 98,70" vector-effect="non-scaling-stroke" />`;
        case 'block-up':
            return `<polygon points="30,98 30,40 8,40 50,2 92,40 70,40 70,98" vector-effect="non-scaling-stroke" />`;
        case 'block-down':
            return `<polygon points="30,2 30,60 8,60 50,98 92,60 70,60 70,2" vector-effect="non-scaling-stroke" />`;
        case 'block-left-right':
            return `<polygon points="2,50 20,25 20,40 80,40 80,25 98,50 80,75 80,60 20,60 20,75" vector-effect="non-scaling-stroke" />`;
        case 'block-up-down':
            return `<polygon points="50,2 75,20 60,20 60,80 75,80 50,98 25,80 40,80 40,20 25,20" vector-effect="non-scaling-stroke" />`;
        case 'block-4way':
            return `<path d="M 50 2 L 38 18 L 45 18 L 45 38 L 25 38 L 25 32 L 8 44 L 25 56 L 25 50 L 45 50 L 45 70 L 38 70 L 50 86 L 62 70 L 55 70 L 55 50 L 75 50 L 75 56 L 92 44 L 75 32 L 75 38 L 55 38 L 55 18 L 62 18 Z" vector-effect="non-scaling-stroke" />`;
        case 'bent-arrow':
            return `<path d="M85,5 L85,55 L40,55 L40,40 L5,65 L40,90 L40,75 L95,75 L95,5 Z" vector-effect="non-scaling-stroke" />`;
        case 'u-turn-arrow':
            return `<path d="M20,98 L20,30 A30,30 0 0,1 80,30 L80,55 L65,55 L65,30 A15,15 0 0,0 35,30 L35,80 L55,80 L30,98 L5,80 L20,80 Z" vector-effect="non-scaling-stroke" />`;
        case 'chevron':
            return `<polygon points="2,10 65,10 98,50 65,90 2,90 35,50" vector-effect="non-scaling-stroke" />`;
        case 'notched-right':
            return `<polygon points="2,10 75,10 98,50 75,90 2,90 22,50" vector-effect="non-scaling-stroke" />`;
        case 'striped-right':
            return `<polygon points="30,25 60,25 60,8 95,50 60,92 60,75 30,75" vector-effect="non-scaling-stroke" />
                    <line x1="12" y1="25" x2="12" y2="75" vector-effect="non-scaling-stroke" />
                    <line x1="20" y1="25" x2="20" y2="75" vector-effect="non-scaling-stroke" />`;

        // ── Equation Shapes ──
        case 'eq-plus':
            return `<circle cx="50" cy="50" r="46" vector-effect="non-scaling-stroke" />
                    <line x1="25" y1="50" x2="75" y2="50" vector-effect="non-scaling-stroke" />
                    <line x1="50" y1="25" x2="50" y2="75" vector-effect="non-scaling-stroke" />`;
        case 'eq-minus':
            return `<circle cx="50" cy="50" r="46" vector-effect="non-scaling-stroke" />
                    <line x1="25" y1="50" x2="75" y2="50" vector-effect="non-scaling-stroke" />`;
        case 'eq-multiply':
            return `<circle cx="50" cy="50" r="46" vector-effect="non-scaling-stroke" />
                    <line x1="30" y1="30" x2="70" y2="70" vector-effect="non-scaling-stroke" />
                    <line x1="70" y1="30" x2="30" y2="70" vector-effect="non-scaling-stroke" />`;
        case 'eq-divide':
            return `<circle cx="50" cy="50" r="46" vector-effect="non-scaling-stroke" />
                    <line x1="25" y1="50" x2="75" y2="50" vector-effect="non-scaling-stroke" />
                    <circle cx="50" cy="32" r="5" fill="var(--primary)" />
                    <circle cx="50" cy="68" r="5" fill="var(--primary)" />`;
        case 'eq-equal':
            return `<rect x="2" y="10" width="96" height="80" rx="10" vector-effect="non-scaling-stroke" />
                    <line x1="20" y1="40" x2="80" y2="40" vector-effect="non-scaling-stroke" />
                    <line x1="20" y1="60" x2="80" y2="60" vector-effect="non-scaling-stroke" />`;
        case 'eq-notequal':
            return `<rect x="2" y="10" width="96" height="80" rx="10" vector-effect="non-scaling-stroke" />
                    <line x1="20" y1="40" x2="80" y2="40" vector-effect="non-scaling-stroke" />
                    <line x1="20" y1="60" x2="80" y2="60" vector-effect="non-scaling-stroke" />
                    <line x1="65" y1="18" x2="35" y2="82" vector-effect="non-scaling-stroke" />`;

        // ── Flowchart Shapes ──
        case 'fc-predef-process':
            return `<rect x="2" y="2" width="96" height="96" vector-effect="non-scaling-stroke" />
                    <line x1="14" y1="2" x2="14" y2="98" vector-effect="non-scaling-stroke" />
                    <line x1="86" y1="2" x2="86" y2="98" vector-effect="non-scaling-stroke" />`;
        case 'fc-internal-storage':
            return `<rect x="2" y="2" width="96" height="96" vector-effect="non-scaling-stroke" />
                    <line x1="18" y1="2" x2="18" y2="98" vector-effect="non-scaling-stroke" />
                    <line x1="2" y1="18" x2="98" y2="18" vector-effect="non-scaling-stroke" />`;
        case 'fc-document':
            return `<path d="M2,5 L98,5 L98,80 Q50,65 2,80 Z" vector-effect="non-scaling-stroke" />`;
        case 'fc-multi-document':
            return `<path d="M12,2 L98,2 L98,70 Q55,55 12,70 Z" vector-effect="non-scaling-stroke" />
                    <path d="M7,10 L7,78 Q50,63 93,78" fill="none" vector-effect="non-scaling-stroke" />
                    <path d="M2,18 L2,86 Q45,71 88,86" fill="none" vector-effect="non-scaling-stroke" />`;
        case 'fc-terminator':
            return `<rect x="2" y="15" width="96" height="70" rx="35" vector-effect="non-scaling-stroke" />`;
        case 'fc-manual-input':
            return `<polygon points="2,20 98,2 98,98 2,98" vector-effect="non-scaling-stroke" />`;
        case 'fc-connector':
        case 'connector':
            return `<circle cx="50" cy="50" r="38" vector-effect="non-scaling-stroke" />`;
        case 'fc-off-page':
            return `<polygon points="2,2 98,2 98,70 50,98 2,70" vector-effect="non-scaling-stroke" />`;
        case 'fc-card':
            return `<polygon points="22,2 98,2 98,98 2,98 2,22" vector-effect="non-scaling-stroke" />`;
        case 'fc-tape':
            return `<path d="M2,20 Q26,2 50,20 Q74,38 98,20 L98,80 Q74,98 50,80 Q26,62 2,80 Z" vector-effect="non-scaling-stroke" />`;
        case 'fc-display':
            return `<path d="M20,5 L80,5 Q98,50 80,95 L20,95 Q2,50 20,5" vector-effect="non-scaling-stroke" />`;
        case 'fc-delay':
            return `<path d="M2,5 L60,5 A40,45 0 0,1 60,95 L2,95 Z" vector-effect="non-scaling-stroke" />`;

        // ── Stars & Banners ──
        case 'star-4':
            return `<polygon points="50,2 58,38 95,38 65,58 78,95 50,72 22,95 35,58 5,38 42,38" vector-effect="non-scaling-stroke" />`;
        case 'star-5':
            return `<polygon points="50,2 62,38 98,38 68,58 78,95 50,75 22,95 32,58 2,38 38,38" vector-effect="non-scaling-stroke" />`;
        case 'star-6':
            return `<polygon points="50,2 58,28 85,10 72,38 98,50 72,62 85,90 58,72 50,98 42,72 15,90 28,62 2,50 28,38 15,10 42,28" vector-effect="non-scaling-stroke" />`;
        case 'star-8':
            return `<polygon points="50,2 58,28 82,8 68,32 98,50 68,68 82,92 58,72 50,98 42,72 18,92 32,68 2,50 32,32 18,8 42,28" vector-effect="non-scaling-stroke" />`;
        case 'explosion-1':
            return `<polygon points="50,2 58,25 80,8 68,30 98,30 78,45 95,65 72,58 78,90 50,70 22,90 28,58 5,65 22,45 2,30 32,30 20,8 42,25" vector-effect="non-scaling-stroke" />`;
        case 'banner-h':
            return `<path d="M12,5 L88,5 Q96,5 96,15 L96,85 Q96,95 88,95 L12,95 Q4,95 4,85 L4,15 Q4,5 12,5" vector-effect="non-scaling-stroke" />
                    <path d="M12,5 Q20,15 12,25" fill="none" vector-effect="non-scaling-stroke" />
                    <path d="M88,75 Q80,85 88,95" fill="none" vector-effect="non-scaling-stroke" />`;
        case 'banner-v':
            return `<rect x="12" y="2" width="76" height="96" rx="6" vector-effect="non-scaling-stroke" />
                    <path d="M12,12 Q2,12 2,22 Q2,32 12,32" fill="none" vector-effect="non-scaling-stroke" />
                    <path d="M88,68 Q98,68 98,78 Q98,88 88,88" fill="none" vector-effect="non-scaling-stroke" />`;
        case 'ribbon':
            return `<path d="M5,22 L22,22 L22,10 L78,10 L78,22 L95,22 L85,40 L95,58 L78,58 L78,90 L50,70 L22,90 L22,58 L5,58 L15,40 Z" vector-effect="non-scaling-stroke" />`;

        default:
            return `<rect x="2" y="2" width="96" height="96" rx="4" vector-effect="non-scaling-stroke" />`;
    }
}

// Determine whether a shape type is a "line" type (rendered without a text container)
function isLineType(type) {
    return ['line', 'line-up', 'line-h', 'line-v', 'curve', 'arrow', 'arrow-up', 'double-arrow', 'elbow'].includes(type);
}

function renderFlowchart() {
    const canvas = document.getElementById('flowchart-canvas');
    if (!canvas) {
        console.warn("Flowchart canvas element not found!");
        return;
    }
    console.log("Rendering flowchart shapes on canvas. Count:", shapes.length);

    // Remove existing shape elements (keep defs SVG)
    const existingShapes = canvas.querySelectorAll('.flowchart-shape');
    existingShapes.forEach(el => el.remove());

    // Render each shape
    shapes.forEach(shape => {
        const shapeEl = document.createElement('div');
        const lineShape = isLineType(shape.type);
        shapeEl.className = `flowchart-shape shape-${shape.type}${lineShape ? ' line-shape' : ''}`;
        if (shape.id === selectedShapeId) shapeEl.classList.add('selected');

        shapeEl.style.left = `${shape.x}px`;
        shapeEl.style.top = `${shape.y}px`;
        shapeEl.style.width = `${shape.width}px`;
        shapeEl.style.height = `${shape.height}px`;
        shapeEl.dataset.id = shape.id;

        // Build inner content based on type
        if (shape.type === 'textbox') {
            // Pure text container (no SVG background)
            shapeEl.innerHTML = `
                <div class="shape-text-container textbox-container">
                    <span class="shape-label-span">${escapeHtml(shape.text)}</span>
                </div>
                <div class="resize-handle tl" data-handle="tl"></div>
                <div class="resize-handle tr" data-handle="tr"></div>
                <div class="resize-handle bl" data-handle="bl"></div>
                <div class="resize-handle br" data-handle="br"></div>
            `;
        } else if (shape.type === 'picture') {
            // Image container
            shapeEl.innerHTML = `
                <img src="${shape.imageSrc || ''}" class="shape-picture-img" alt="Inserted picture" draggable="false" />
                <div class="resize-handle tl" data-handle="tl"></div>
                <div class="resize-handle tr" data-handle="tr"></div>
                <div class="resize-handle bl" data-handle="bl"></div>
                <div class="resize-handle br" data-handle="br"></div>
            `;
        } else {
            // SVG-based shape with optional text overlay
            const svgContent = getSvgContentForType(shape.type);
            const textHtml = lineShape ? '' : `
                <div class="shape-text-container">
                    <span class="shape-label-span">${escapeHtml(shape.text)}</span>
                </div>
            `;

            shapeEl.innerHTML = `
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                    ${svgContent}
                </svg>
                ${textHtml}
                <div class="resize-handle tl" data-handle="tl"></div>
                <div class="resize-handle tr" data-handle="tr"></div>
                <div class="resize-handle bl" data-handle="bl"></div>
                <div class="resize-handle br" data-handle="br"></div>
            `;
        }

        // Event Listeners
        shapeEl.addEventListener('pointerdown', (e) => handleShapePointerDown(e, shape.id));
        if (!lineShape && shape.type !== 'picture') {
            shapeEl.addEventListener('dblclick', (e) => handleShapeDoubleClick(e, shape.id));
        }

        canvas.appendChild(shapeEl);
    });
}

function addShape(type, imageSrc) {
    const canvas = document.getElementById('flowchart-canvas');
    if (!canvas) return;

    const canvasContainer = canvas.parentElement;
    const scrollLeft = canvasContainer.scrollLeft;
    const scrollTop = canvasContainer.scrollTop;
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;

    // Determine default dimensions based on shape type
    let defaultWidth, defaultHeight;
    if (isLineType(type)) {
        if (type === 'line-h') {
            defaultWidth = 180;
            defaultHeight = 8;
        } else if (type === 'line-v') {
            defaultWidth = 8;
            defaultHeight = 180;
        } else if (type === 'curve') {
            defaultWidth = 160;
            defaultHeight = 80;
        } else if (type === 'elbow') {
            defaultWidth = 150;
            defaultHeight = 120;
        } else {
            // Diagonal lines/arrows
            defaultWidth = 150;
            defaultHeight = 100;
        }
    } else if (type === 'textbox') {
        defaultWidth = 160;
        defaultHeight = 60;
    } else if (type === 'picture') {
        defaultWidth = 180;
        defaultHeight = 140;
    } else if (['oval', 'circle', 'connector'].includes(type)) {
        defaultWidth = 100;
        defaultHeight = 80;
    } else {
        defaultWidth = 140;
        defaultHeight = 80;
    }

    const x = Math.max(50, Math.round(scrollLeft + containerWidth / 2 - defaultWidth / 2));
    const y = Math.max(50, Math.round(scrollTop + containerHeight / 2 - defaultHeight / 2));

    // Determine default label
    let defaultText = '';
    if (type === 'textbox') {
        defaultText = 'Text';
    } else if (type === 'picture') {
        defaultText = '';
    } else if (!isLineType(type)) {
        // Humanize the type name for the label
        defaultText = type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    const newShape = {
        id: 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: type,
        text: defaultText,
        x: x,
        y: y,
        width: defaultWidth,
        height: defaultHeight
    };

    // Attach image data for picture shapes
    if (type === 'picture' && imageSrc) {
        newShape.imageSrc = imageSrc;
    }

    shapes.push(newShape);
    selectedShapeId = newShape.id;
    saveFlowchartState();
    renderFlowchart();
}

function handleShapePointerDown(e, shapeId) {
    const handleEl = e.target.closest('.resize-handle');
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    e.stopPropagation();

    // Select the shape
    selectedShapeId = shapeId;
    renderFlowchart();

    if (handleEl) {
        // Resize mode
        activeResizeShapeId = shapeId;
        resizeDirection = handleEl.dataset.handle;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        shapeStartX = shape.x;
        shapeStartY = shape.y;
        shapeStartWidth = shape.width;
        shapeStartHeight = shape.height;
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    } else {
        // Drag mode
        activeDragShapeId = shapeId;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        shapeStartX = shape.x;
        shapeStartY = shape.y;
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    }
}

function handlePointerMove(e) {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (activeDragShapeId) {
        const shape = shapes.find(s => s.id === activeDragShapeId);
        if (shape) {
            shape.x = Math.max(0, Math.min(2000 - shape.width, shapeStartX + dx));
            shape.y = Math.max(0, Math.min(2000 - shape.height, shapeStartY + dy));

            const el = document.querySelector(`.flowchart-shape[data-id="${activeDragShapeId}"]`);
            if (el) {
                el.style.left = `${shape.x}px`;
                el.style.top = `${shape.y}px`;
            }
        }
    } else if (activeResizeShapeId) {
        const shape = shapes.find(s => s.id === activeResizeShapeId);
        if (shape) {
            const minWidth = 40;
            const minHeight = 20;

            if (resizeDirection === 'br') {
                shape.width = Math.max(minWidth, shapeStartWidth + dx);
                shape.height = Math.max(minHeight, shapeStartHeight + dy);
            } else if (resizeDirection === 'bl') {
                const newWidth = Math.max(minWidth, shapeStartWidth - dx);
                if (newWidth > minWidth) {
                    shape.x = shapeStartX + dx;
                    shape.width = newWidth;
                }
                shape.height = Math.max(minHeight, shapeStartHeight + dy);
            } else if (resizeDirection === 'tr') {
                shape.width = Math.max(minWidth, shapeStartWidth + dx);
                const newHeight = Math.max(minHeight, shapeStartHeight - dy);
                if (newHeight > minHeight) {
                    shape.y = shapeStartY + dy;
                    shape.height = newHeight;
                }
            } else if (resizeDirection === 'tl') {
                const newWidth = Math.max(minWidth, shapeStartWidth - dx);
                if (newWidth > minWidth) {
                    shape.x = shapeStartX + dx;
                    shape.width = newWidth;
                }
                const newHeight = Math.max(minHeight, shapeStartHeight - dy);
                if (newHeight > minHeight) {
                    shape.y = shapeStartY + dy;
                    shape.height = newHeight;
                }
            }

            const el = document.querySelector(`.flowchart-shape[data-id="${activeResizeShapeId}"]`);
            if (el) {
                el.style.left = `${shape.x}px`;
                el.style.top = `${shape.y}px`;
                el.style.width = `${shape.width}px`;
                el.style.height = `${shape.height}px`;
            }
        }
    }
}

function handlePointerUp() {
    if (activeDragShapeId || activeResizeShapeId) {
        saveFlowchartState();
        renderFlowchart();
    }
    activeDragShapeId = null;
    activeResizeShapeId = null;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
}

function handleShapeDoubleClick(e, shapeId) {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    e.stopPropagation();

    const shapeEl = document.querySelector(`.flowchart-shape[data-id="${shapeId}"]`);
    if (!shapeEl) return;

    const textContainer = shapeEl.querySelector('.shape-text-container');
    if (!textContainer) return;

    textContainer.innerHTML = `<input type="text" class="shape-text-input" value="${escapeHtml(shape.text)}" />`;
    const input = textContainer.querySelector('.shape-text-input');

    input.focus();
    input.select();

    const finishEditing = () => {
        const val = input.value.trim();
        if (val) {
            shape.text = val;
            saveFlowchartState();
        }
        renderFlowchart();
    };

    input.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') {
            finishEditing();
        }
    });

    input.addEventListener('blur', finishEditing);
}

function deleteSelectedShape() {
    if (!selectedShapeId) return;

    shapes = shapes.filter(s => s.id !== selectedShapeId);
    selectedShapeId = null;
    saveFlowchartState();
    renderFlowchart();
    showToast('Shape deleted.', 'success');
}

async function clearFlowchartCanvas() {
    if (await showConfirm("Clear Canvas", "Are you sure you want to clear the entire canvas?", "Clear")) {
        shapes = [];
        selectedShapeId = null;
        saveFlowchartState();
        renderFlowchart();
        showToast('Canvas cleared.', 'success');
    }
}

function buildLocalFlowchartShapes(promptText) {
    const cleanPrompt = promptText.toLowerCase().trim();
    const shapesList = [];
    let currentY = 50;
    const startX = 280;

    // 1. Start Node
    shapesList.push({ id: 'node_start', type: 'rounded-rect', label: 'Start Process', x: startX, y: currentY, width: 150, height: 60 });
    currentY += 75;

    // Arrow Down
    shapesList.push({ id: 'arr_1', type: 'block-down', label: '', x: startX + 35, y: currentY, width: 80, height: 45 });
    currentY += 60;

    if (cleanPrompt.includes('palindrome')) {
        // Palindrome Algorithm Flowchart
        shapesList.push({ id: 'node_in', type: 'parallelogram', label: 'Input Number / String', x: startX - 10, y: currentY, width: 170, height: 60 });
        currentY += 75;

        shapesList.push({ id: 'arr_2', type: 'block-down', label: '', x: startX + 35, y: currentY, width: 80, height: 45 });
        currentY += 60;

        shapesList.push({ id: 'node_proc', type: 'rectangle', label: 'Store orig, rev = 0 or reverse string', x: startX - 25, y: currentY, width: 200, height: 65 });
        currentY += 80;

        shapesList.push({ id: 'arr_3', type: 'block-down', label: '', x: startX + 35, y: currentY, width: 80, height: 45 });
        currentY += 60;

        shapesList.push({ id: 'node_dec', type: 'diamond', label: 'Check: reversed == original?', x: startX - 25, y: currentY, width: 200, height: 80 });
        currentY += 95;

        shapesList.push({ id: 'arr_4', type: 'block-down', label: '', x: startX + 35, y: currentY, width: 80, height: 45 });
        currentY += 60;

        shapesList.push({ id: 'node_out', type: 'parallelogram', label: 'Print "Is Palindrome" / "Not Palindrome"', x: startX - 35, y: currentY, width: 220, height: 65 });
        currentY += 80;
    } else {
        // General Process Steps Extractor
        const topics = promptText.split(/[\n,;:]+/).map(s => s.trim()).filter(s => s.length > 3);
        const steps = topics.length > 0 ? topics : ['Receive Request / Input', 'Validate Input Data', 'Process & Execute Operations', 'Save Results & Send Response'];

        steps.forEach((stepText, idx) => {
            const isDecision = stepText.toLowerCase().includes('if') || stepText.toLowerCase().includes('check') || stepText.toLowerCase().includes('is');
            const shapeType = isDecision ? 'diamond' : (idx === 0 ? 'parallelogram' : 'rectangle');
            
            shapesList.push({
                id: `node_step_${idx}`,
                type: shapeType,
                label: stepText.substring(0, 35),
                x: startX - (shapeType === 'diamond' ? 20 : 10),
                y: currentY,
                width: isDecision ? 180 : 160,
                height: isDecision ? 75 : 65
            });
            currentY += (isDecision ? 90 : 80);

            if (idx < steps.length - 1) {
                shapesList.push({
                    id: `arr_step_${idx}`,
                    type: 'block-down',
                    label: '',
                    x: startX + 35,
                    y: currentY,
                    width: 80,
                    height: 45
                });
                currentY += 60;
            }
        });
    }

    // End Arrow & End Node
    shapesList.push({ id: 'arr_end', type: 'block-down', label: '', x: startX + 35, y: currentY, width: 80, height: 45 });
    currentY += 60;

    shapesList.push({ id: 'node_end', type: 'rounded-rect', label: 'End Process', x: startX, y: currentY, width: 150, height: 60 });

    return shapesList;
}

async function handleGenerateFlowchartAI() {
    const promptInputEl = document.getElementById('flowchart-ai-prompt');
    const promptText = promptInputEl ? promptInputEl.value.trim() : '';

    if (!promptText) {
        showToast('Please describe the flowchart process you want to generate.', 'error');
        return;
    }

    const btn = document.getElementById('btn-generate-flowchart-ai');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="ai-spinner"></span> Generating Flow...';
    }

    try {
        const prompt = `You are an expert systems flow diagram designer. Generate a logical, clear step-by-step flowchart layout for the following process: "${promptText}".
Distribute shapes horizontally and vertically in a neat grid or cascade so they flow logically and do not overlap.
Shapes coordinates (x, y) should lie within the canvas coordinate space of x = [50 to 900] and y = [50 to 800].

Return ONLY a JSON array representing the shape nodes. You must return only a valid JSON array of objects (optionally wrapped in a \`\`\`json ... \`\`\` codeblock). Each element represents a shape node:
- "id": string (unique ID, e.g. "node1", "node2")
- "type": string — one of: "rectangle", "rounded-rect", "diamond", "oval", "parallelogram", "hexagon", "triangle", "block-right", "block-down"
  Use "rounded-rect" for start/end terminators, "rectangle" for process steps, "diamond" for decision points,
  "parallelogram" for input/output, and "block-right" or "block-down" as directional arrow separators between steps.
- "label": string (short concise label, 1-4 words, e.g. "Start", "Check Input", "End")
- "x": number (horizontal coordinate)
- "y": number (vertical coordinate)
- "width": number (default 130-150 for boxes, 80-100 for arrows)
- "height": number (default 60-80 for boxes, 50-70 for arrows)

IMPORTANT: Include block-arrow shapes (type "block-right" or "block-down") between connected nodes to indicate the flow direction instead of using connection lines.

Example:
[
  { "id": "n1", "type": "rounded-rect", "label": "Start", "x": 350, "y": 50, "width": 140, "height": 60 },
  { "id": "a1", "type": "block-down", "label": "", "x": 380, "y": 120, "width": 80, "height": 50 },
  { "id": "n2", "type": "rectangle", "label": "Process", "x": 350, "y": 180, "width": 140, "height": 70 }
]

Input Process Description:
${promptText}`;

        let shapesData = [];
        try {
            const aiResponse = await generateTextWithGroq(prompt);
            if (aiResponse && !aiResponse.includes("Error:") && !aiResponse.includes("Deployment Error") && !aiResponse.includes("NO_LLM_RESPONSE")) {
                const parsed = parseJsonArray(aiResponse);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    shapesData = parsed;
                }
            }
        } catch (apiErr) {
            console.warn("[Flowchart AI] Gemini endpoint fallback triggered:", apiErr);
        }

        // Local Intelligent NLP Engine Fallback if AI returned invalid JSON or failed
        if (!shapesData || shapesData.length === 0) {
            shapesData = buildLocalFlowchartShapes(promptText);
        }

        // Map AI/Local nodes to our shapes format
        shapes = shapesData.map(n => ({
            id: n.id || ('shape_ai_' + Math.random().toString(36).substr(2, 5)),
            type: n.type || 'rectangle',
            text: n.label || n.text || '',
            x: Number(n.x) || 200,
            y: Number(n.y) || 100,
            width: Number(n.width) || 140,
            height: Number(n.height) || 70
        }));

        // Create new Flowchart record
        const flowchartName = promptText.substring(0, 26).trim() || 'AI Flowchart';
        const newFlowchart = {
            id: Date.now().toString(),
            name: flowchartName,
            timestamp: Date.now(),
            shapes: shapes
        };
        savedFlowcharts.unshift(newFlowchart);
        activeFlowchartId = newFlowchart.id;
        saveState();

        selectedShapeId = null;
        saveFlowchartState();
        renderFlowchart();

        // Reset AI input
        if (promptInputEl) promptInputEl.value = '';

        showToast(`Flowchart for "${flowchartName}" generated successfully.`, 'success');

    } catch (err) {
        console.error("Flowchart generation error:", err);
        showToast(err.message || 'AI Flowchart generation failed.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
}

function populateSnippetSelects() {
    const flashcardsSelect = document.getElementById('flashcards-snippet-select');
    const flowchartSelect = document.getElementById('flowchart-snippet-select');

    const storedRaw = localStorage.getItem('antigravity_snippets');
    const snippets = storedRaw ? JSON.parse(storedRaw) : [];

    if (flashcardsSelect) {
        flashcardsSelect.innerHTML = '<option value="">-- Select a Snippet --</option>';
        snippets.forEach((s, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${s.title} (${s.language || 'Plain'})`;
            flashcardsSelect.appendChild(opt);
        });

        flashcardsSelect.addEventListener('change', () => {
            const idx = flashcardsSelect.value;
            if (idx !== '') {
                const s = snippets[idx];
                if (s) {
                    const topicInputEl = document.getElementById('flashcards-topic-input');
                    if (topicInputEl) {
                        topicInputEl.value = `Coding Note: ${s.title}\n\nCode:\n\`\`\`${s.language || ''}\n${s.code}\n\`\`\``;
                    }
                }
            }
        });
    }

    if (flowchartSelect) {
        flowchartSelect.innerHTML = '<option value="">-- Select a Snippet --</option>';
        snippets.forEach((s, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${s.title} (${s.language || 'Plain'})`;
            flowchartSelect.appendChild(opt);
        });

        flowchartSelect.addEventListener('change', () => {
            const idx = flowchartSelect.value;
            if (idx !== '') {
                const s = snippets[idx];
                if (s) {
                    const promptInputEl = document.getElementById('flowchart-ai-prompt');
                    if (promptInputEl) {
                        promptInputEl.value = `Analyze code structure of algorithm:\nTitle: ${s.title}\nLanguage: ${s.language || 'Plain Text'}\n\nCode:\n${s.code}`;
                    }
                }
            }
        });
    }
}

/* ==========================================================================
   AI VISUALS & DIAGRAM GENERATOR FOR STUDENT HUB
   ========================================================================== */
function initStudentVisuals() {
    const btnGenerate = document.getElementById('btn-generate-visual');
    const promptInput = document.getElementById('visual-prompt-input');
    const categorySelect = document.getElementById('visual-category-select');
    const placeholder = document.getElementById('visual-placeholder');
    const container = document.getElementById('visual-output-container');
    const canvasCard = document.getElementById('visual-canvas-card');
    const downloadBtn = document.getElementById('btn-download-visual');

    if (!btnGenerate) return;

    let currentSvg = '';

    btnGenerate.addEventListener('click', async () => {
        const prompt = (promptInput?.value || '').trim();
        const category = categorySelect?.value || 'General';

        if (!prompt) {
            showToast('Please enter a description for the visual diagram.', 'warning');
            return;
        }

        btnGenerate.disabled = true;
        btnGenerate.innerHTML = '<span>⏳ Generating Visual...</span>';

        try {
            const res = await fetch('/api/ai/generate-student-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, category })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    currentSvg = data.svg || '';
                    const imageUrl = data.imageUrl || '';
                    placeholder?.classList.add('hidden');
                    container?.classList.remove('hidden');

                    if (imageUrl) {
                        canvasCard.innerHTML = `
                            <div style="width:100%; display:flex; flex-direction:column; align-items:center; gap:12px;">
                                <div style="display:flex; gap:10px; margin-bottom:4px;">
                                    <button id="btn-show-ai-img" class="btn primary btn-sm" style="font-size:12px; padding:6px 14px;">🎨 Nano AI Illustration</button>
                                    ${currentSvg ? '<button id="btn-show-vector-svg" class="btn secondary btn-sm" style="font-size:12px; padding:6px 14px;">📊 Vector Diagram</button>' : ''}
                                </div>
                                <div id="visual-display-area" style="width:100%; display:flex; justify-content:center; align-items:center; background:#0f172a; border-radius:12px; padding:12px;">
                                    <img src="${imageUrl}" alt="${prompt}" style="max-width:100%; max-height:480px; object-fit:contain; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.6);" />
                                </div>
                            </div>
                        `;

                        document.getElementById('btn-show-ai-img')?.addEventListener('click', () => {
                            const display = document.getElementById('visual-display-area');
                            if (display) {
                                display.innerHTML = `<img src="${imageUrl}" alt="${prompt}" style="max-width:100%; max-height:480px; object-fit:contain; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.6);" />`;
                            }
                        });

                        document.getElementById('btn-show-vector-svg')?.addEventListener('click', () => {
                            const display = document.getElementById('visual-display-area');
                            if (display && currentSvg) {
                                display.innerHTML = currentSvg;
                            }
                        });

                    } else if (currentSvg) {
                        canvasCard.innerHTML = currentSvg;
                    }

                    showToast('Visual Biology Diagram Generated!', 'success');
                } else {
                    throw new Error('Diagram generation failed');
                }
            } else {
                throw new Error('API server error');
            }
        } catch (err) {
            console.error('Visual diagram generation error:', err);
            showToast('Failed to generate visual diagram. Please check API keys.', 'error');
        } finally {
            btnGenerate.disabled = false;
            btnGenerate.innerHTML = '<span>✦ Generate Visual Diagram</span>';
        }
    });

    downloadBtn?.addEventListener('click', () => {
        if (!currentSvg) return;
        const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student_diagram_${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Downloaded SVG diagram', 'info');
    });
}

/* ==========================================================================
   STOPWATCH AND POMODORO STUDY TIMERS
   ========================================================================== */
function playAudioAlert() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } catch(e){}
}

function initStudentTimers() {
    const tabPomo = document.getElementById('timer-tab-pomodoro');
    const tabSW = document.getElementById('timer-tab-stopwatch');
    const panelPomo = document.getElementById('pomodoro-panel');
    const panelSW = document.getElementById('stopwatch-panel');
    const extraSWControls = document.getElementById('sw-controls-extra');
    const extraSWLaps = document.getElementById('sw-laps-container');

    if (!tabPomo || !tabSW) return;

    tabPomo.addEventListener('click', () => {
        tabPomo.classList.add('active');
        tabSW.classList.remove('active');
        tabPomo.style.background = '#6366f1';
        tabPomo.style.color = '#ffffff';
        tabSW.style.background = 'transparent';
        tabSW.style.color = '#475569';
        panelPomo?.classList.remove('hidden');
        panelSW?.classList.add('hidden');
        extraSWControls?.classList.add('hidden');
        extraSWLaps?.classList.add('hidden');
    });

    tabSW.addEventListener('click', () => {
        tabSW.classList.add('active');
        tabPomo.classList.remove('active');
        tabSW.style.background = '#6366f1';
        tabSW.style.color = '#ffffff';
        tabPomo.style.background = 'transparent';
        tabPomo.style.color = '#475569';
        panelSW?.classList.remove('hidden');
        panelPomo?.classList.add('hidden');
        extraSWControls?.classList.remove('hidden');
        extraSWLaps?.classList.remove('hidden');
    });

    // --- POMODORO TIMER ---
    const MODE_TIMES = { work: 1500, short: 300, long: 900 };
    const MODE_LABELS = { work: 'Time to Focus', short: 'Short Break', long: 'Long Break' };
    let currentPomoMode = 'work';
    let pomoTimeLeft = 1500;
    let pomoTimerId = null;
    let pomoCompletedSessions = 0;
    let pomoTotalFocusSeconds = 0;

    const textPomoDigits = document.getElementById('pomo-timer-text');
    const labelPomoStatus = document.getElementById('pomo-status-label');
    const ringProgress = document.getElementById('pomo-progress-ring');
    const btnPomoStart = document.getElementById('pomo-start-btn');
    const btnPomoReset = document.getElementById('pomo-reset-btn');
    const elCompletedSessions = document.getElementById('pomo-completed-count');
    const elTotalFocusTime = document.getElementById('pomo-total-time');

    const updatePomoDisplay = () => {
        const mins = Math.floor(pomoTimeLeft / 60);
        const secs = pomoTimeLeft % 60;
        textPomoDigits.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const totalForMode = MODE_TIMES[currentPomoMode];
        const fraction = pomoTimeLeft / totalForMode;
        // Total dasharray = 2 * PI * 85 ~= 534
        const dashoffset = 534 * (1 - fraction);
        if (ringProgress) ringProgress.style.strokeDashoffset = dashoffset;
    };

    const modePills = document.querySelectorAll('.mode-pill');
    modePills.forEach(pill => {
        pill.addEventListener('click', () => {
            modePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentPomoMode = pill.dataset.mode || 'work';
            labelPomoStatus.textContent = MODE_LABELS[currentPomoMode];
            pomoTimeLeft = MODE_TIMES[currentPomoMode];
            if (pomoTimerId) {
                clearInterval(pomoTimerId);
                pomoTimerId = null;
                btnPomoStart.textContent = 'Start Session';
            }
            updatePomoDisplay();
        });
    });

    btnPomoStart?.addEventListener('click', () => {
        if (pomoTimerId) {
            // Pause
            clearInterval(pomoTimerId);
            pomoTimerId = null;
            btnPomoStart.textContent = 'Resume';
        } else {
            // Start
            btnPomoStart.textContent = 'Pause';
            pomoTimerId = setInterval(() => {
                if (pomoTimeLeft > 0) {
                    pomoTimeLeft--;
                    if (currentPomoMode === 'work') pomoTotalFocusSeconds++;
                    updatePomoDisplay();
                } else {
                    clearInterval(pomoTimerId);
                    pomoTimerId = null;
                    btnPomoStart.textContent = 'Start Session';
                    playAudioAlert();
                    if (currentPomoMode === 'work') {
                        pomoCompletedSessions++;
                        elCompletedSessions.textContent = pomoCompletedSessions;
                        showToast('🍅 Great focus session completed! Take a break.', 'success');
                    } else {
                        showToast('🔔 Break time is over! Ready to focus?', 'info');
                    }
                    elTotalFocusTime.textContent = `${Math.floor(pomoTotalFocusSeconds / 60)}m`;
                }
            }, 1000);
        }
    });

    btnPomoReset?.addEventListener('click', () => {
        if (pomoTimerId) {
            clearInterval(pomoTimerId);
            pomoTimerId = null;
        }
        pomoTimeLeft = MODE_TIMES[currentPomoMode];
        btnPomoStart.textContent = 'Start Session';
        updatePomoDisplay();
    });

    updatePomoDisplay();

    // --- STOPWATCH ---
    let swStartTime = 0;
    let swElapsedTime = 0;
    let swTimerId = null;
    let swLaps = [];

    const textSWDigits = document.getElementById('sw-timer-text');
    const btnSWStart = document.getElementById('sw-start-btn');
    const btnSWLap = document.getElementById('sw-lap-btn');
    const btnSWReset = document.getElementById('sw-reset-btn');
    const lapsList = document.getElementById('sw-laps-list');

    const formatSWTime = (ms) => {
        const totalSecs = Math.floor(ms / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const hundredths = Math.floor((ms % 1000) / 10);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
    };

    const renderLaps = () => {
        if (!swLaps.length) {
            lapsList.innerHTML = '<li class="lap-empty">No laps recorded</li>';
            return;
        }
        lapsList.innerHTML = swLaps.map((lap, idx) => `
            <li class="lap-item">
                <span>Lap ${idx + 1}</span>
                <span>${formatSWTime(lap)}</span>
            </li>
        `).join('');
    };

    btnSWStart?.addEventListener('click', () => {
        if (swTimerId) {
            // Pause
            clearInterval(swTimerId);
            swTimerId = null;
            btnSWStart.textContent = 'Start';
        } else {
            // Start
            swStartTime = Date.now() - swElapsedTime;
            btnSWStart.textContent = 'Pause';
            swTimerId = setInterval(() => {
                swElapsedTime = Date.now() - swStartTime;
                textSWDigits.textContent = formatSWTime(swElapsedTime);
            }, 30);
        }
    });

    btnSWLap?.addEventListener('click', () => {
        if (swElapsedTime > 0) {
            swLaps.push(swElapsedTime);
            renderLaps();
        }
    });

    btnSWReset?.addEventListener('click', () => {
        if (swTimerId) {
            clearInterval(swTimerId);
            swTimerId = null;
        }
        swElapsedTime = 0;
        swLaps = [];
        btnSWStart.textContent = 'Start';
        textSWDigits.textContent = '00:00.00';
        renderLaps();
    });
}

