// Global Notes Workspace - Persistent Knowledge Base Interactivity (v4)

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. STICKY NAVBAR SCROLL STATE
    // ==========================================
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // ==========================================
    // 1A. TYPEWRITER HERO HEADLINE ENGINE
    // ==========================================
    (function initTypewriter() {
        const wordEl      = document.getElementById('typewriter-word');
        const chipEls     = document.querySelectorAll('.persona-chip');
        if (!wordEl) return;

        const personas    = ['Students', 'Developers', 'Writers', 'Researchers'];
        let   currentIdx  = 0;
        let   charIdx     = 0;
        let   isDeleting  = false;
        let   isPausing   = false;
        let   timer       = null;

        const TYPING_SPEED   = 82;    // ms per character forward
        const DELETING_SPEED = 42;    // ms per character backward
        const PAUSE_AFTER    = 1800;  // ms hold on complete word
        const PAUSE_BEFORE   = 350;   // ms before next word starts

        function setActiveChip(idx) {
            chipEls.forEach((chip, i) => {
                chip.classList.toggle('active', i === idx);
            });
        }

        function tick() {
            const word   = personas[currentIdx];
            const shown  = word.slice(0, charIdx);
            wordEl.textContent = shown;

            if (!isDeleting && charIdx < word.length) {
                // Still typing
                charIdx++;
                timer = setTimeout(tick, TYPING_SPEED);

            } else if (!isDeleting && charIdx === word.length) {
                // Finished typing — pause then start deleting
                isPausing = true;
                timer = setTimeout(() => {
                    isPausing  = false;
                    isDeleting = true;
                    wordEl.classList.add('fade-out');
                    timer = setTimeout(tick, DELETING_SPEED);
                }, PAUSE_AFTER);

            } else if (isDeleting && charIdx > 0) {
                // Deleting
                charIdx--;
                timer = setTimeout(tick, DELETING_SPEED);

            } else if (isDeleting && charIdx === 0) {
                // Done deleting — move to next word
                isDeleting = false;
                wordEl.classList.remove('fade-out');
                currentIdx = (currentIdx + 1) % personas.length;
                setActiveChip(currentIdx);
                timer = setTimeout(tick, PAUSE_BEFORE);
            }
        }

        // Kickoff: type first word immediately
        setActiveChip(0);
        tick();

        // Persona chip manual jump
        chipEls.forEach((chip, i) => {
            chip.addEventListener('click', () => {
                clearTimeout(timer);
                currentIdx  = i;
                charIdx     = 0;
                isDeleting  = false;
                isPausing   = false;
                wordEl.classList.remove('fade-out');
                setActiveChip(i);
                tick();
            });
        });
    })();

    // ==========================================
    // 1B. ENGINE TOGGLE (Developer / Student)
    // ==========================================
    const engineToggle    = document.getElementById('engine-toggle');
    const btnDevEngine    = document.getElementById('btn-developer-engine');
    const btnStudentEngine= document.getElementById('btn-student-engine');

    function activateEngine(engine) {
        if (!btnDevEngine || !btnStudentEngine) return;
        if (engine === 'developer') {
            document.body.classList.remove('student-engine-active');
            btnDevEngine.classList.add('active');
            btnStudentEngine.classList.remove('active');
        } else {
            document.body.classList.add('student-engine-active');
            btnStudentEngine.classList.add('active');
            btnDevEngine.classList.remove('active');
        }
    }

    if (btnDevEngine)     btnDevEngine.addEventListener('click',     () => activateEngine('developer'));
    if (btnStudentEngine) btnStudentEngine.addEventListener('click', () => activateEngine('student'));

    // ==========================================
    // 1B. MACBOOK LID OPENING SCROLL TRIGGER
    // ==========================================
    const macbookContainer = document.getElementById('macbook-container');
    if (macbookContainer) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    macbookContainer.classList.add('open');
                }
            });
        }, {
            threshold: 0.15
        });
        observer.observe(macbookContainer);
    }

    // ==========================================
    // INTERACTIVE WORKSPACE TRIAL STATE
    // ==========================================
    let trialFolders = [
        { id: 'f-welcome', name: '🏠 Welcome Guide' },
        { id: 'f-features', name: '⚙️ App Features' },
        { id: 'f-drafts', name: '💡 My Notes' }
    ];

    let trialNotes = [
        {
            id: 'n-welcome',
            folderId: 'f-welcome',
            title: 'Welcome to Global Notes',
            content: 'Global Notes is a modern, high-performance, offline-capable second brain workspace.\n\nType directly into the title or body area of this editor to try the real-time edit functionality. Notice how the card title and preview text update immediately!\n\nClick "+ New Note" to create a fresh note or "+ Add Folder" to organize your folders.',
            tag: '#welcome',
            date: 'Just now',
            widget: 'none'
        },
        {
            id: 'n-guide',
            folderId: 'f-welcome',
            title: '🚀 Interactive Trial Guide',
            content: 'Quick Guide to using this in-screen demo:\n\n1. **Manage Folders**: Add new folders on the left panel.\n2. **Manage Notes**: Add new note cards, write content, and watch them update dynamically.\n3. **Search Filter**: Type in the middle search bar to filter notes instantly.\n4. **Workspaces**: Toggle Notes, Code, and Student panels using the buttons above.',
            tag: '#welcome',
            date: 'Just now',
            widget: 'none'
        },
        {
            id: 'n-editor',
            folderId: 'f-features',
            title: 'Smart Markdown Editor',
            content: 'Write notes using fully compliant markdown formatting. You can structure content, format text, and insert smart summaries or canvas diagram widgets.\n\nSelecting this card will display a simulated quote widget below, demonstrating how interactive quote blocks are rendered inside the document editor pane.',
            tag: '#features',
            date: 'Just now',
            widget: 'quote'
        },
        {
            id: 'n-code',
            folderId: 'f-features',
            title: 'Integrated Code IDE',
            content: 'Global Notes Workspace includes a dedicated Code IDE sandbox. Write code snippets, search files, and get instant explanations from Gemini.\n\nSwitch to the "Code Workspace" tab above in the mock browser bar to write code and test the AI Explainer.',
            tag: '#features',
            date: 'Just now',
            widget: 'none'
        },
        {
            id: 'n-canvas',
            folderId: 'f-features',
            title: 'Freeform Sketch Canvas',
            content: 'Design flowcharts and vector diagrams directly inside your documents. Combine shapes, dots, and lines to visualize abstract ideas.\n\nSelecting this card will load the Vector Canvas diagram widget below in the editor area, allowing you to preview visual layouts.',
            tag: '#features',
            date: 'Just now',
            widget: 'canvas'
        }
    ];

    let trialSelectedFolder = 'f-welcome';
    let trialSelectedNote = 'n-welcome';
    let trialSearchNotesQuery = '';

    // Render Folders
    const renderTrialFolders = () => {
        const foldersList = document.getElementById('trial-folders-list');
        if (!foldersList) return;
        foldersList.innerHTML = '';
        trialFolders.forEach(folder => {
            const li = document.createElement('li');
            if (folder.id === trialSelectedFolder) li.className = 'active';
            
            // Count notes in folder
            const count = trialNotes.filter(n => n.folderId === folder.id).length;
            
            li.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                <span>${folder.name}</span>
                <span class="badge">${count}</span>
            `;
            li.addEventListener('click', () => {
                trialSelectedFolder = folder.id;
                // Select first note of this folder, if any
                const firstNote = trialNotes.find(n => n.folderId === folder.id);
                trialSelectedNote = firstNote ? firstNote.id : null;
                renderAllNotesTrial();
            });
            foldersList.appendChild(li);
        });
    };

    // Render Note Cards list
    const renderTrialNotesList = () => {
        const notesContainer = document.getElementById('trial-notes-list-container');
        if (!notesContainer) return;
        notesContainer.innerHTML = '';
        
        // Filter notes by folder & search query
        let filteredNotes = trialNotes.filter(n => n.folderId === trialSelectedFolder);
        if (trialSearchNotesQuery.trim() !== '') {
            const q = trialSearchNotesQuery.toLowerCase();
            filteredNotes = filteredNotes.filter(n => 
                n.title.toLowerCase().includes(q) || 
                n.content.toLowerCase().includes(q)
            );
        }
        
        if (filteredNotes.length === 0) {
            notesContainer.innerHTML = '<div style="font-size: 0.7rem; color: var(--text-muted); text-align: center; padding-top: 20px;">No notes found</div>';
            return;
        }

        filteredNotes.forEach(note => {
            const div = document.createElement('div');
            div.className = `mock-note-card ${note.id === trialSelectedNote ? 'active' : ''}`;
            
            // Get preview text snippet
            let preview = note.content.replace(/[#*`_-]/g, '').substring(0, 30);
            if (preview.length === 0) preview = 'Empty note...';
            
            div.innerHTML = `
                <div class="card-title">${note.title || 'Untitled Note'}</div>
                <div class="card-preview">${preview}</div>
            `;
            div.addEventListener('click', () => {
                trialSelectedNote = note.id;
                renderAllNotesTrial();
            });
            notesContainer.appendChild(div);
        });
    };

    // Load active note to editor
    const loadTrialNoteToEditor = () => {
        const titleInput = document.getElementById('trial-editor-title');
        const bodyTextarea = document.getElementById('trial-editor-body');
        const metaDiv = document.getElementById('trial-editor-meta');
        const widgetContainer = document.getElementById('trial-editor-visual-widget');
        
        if (!titleInput || !bodyTextarea) return;
        
        const note = trialNotes.find(n => n.id === trialSelectedNote);
        if (!note) {
            titleInput.value = '';
            bodyTextarea.value = '';
            titleInput.disabled = true;
            bodyTextarea.disabled = true;
            if (metaDiv) metaDiv.textContent = '';
            if (widgetContainer) widgetContainer.innerHTML = '';
            return;
        }
        
        titleInput.disabled = false;
        bodyTextarea.disabled = false;
        titleInput.value = note.title;
        bodyTextarea.value = note.content;
        
        if (metaDiv) {
            metaDiv.textContent = `Last synced just now • ${note.tag || '#welcome'}`;
        }
        
        // Render dynamic widgets (quotes, sketches)
        if (widgetContainer) {
            widgetContainer.innerHTML = '';
            if (note.widget === 'quote') {
                widgetContainer.innerHTML = `
                  <div class="mock-quote">
                    <strong>AI Smart Summary:</strong> Keep a priority queue of vertices ordered by distance. Extract min, relax edges, and update distances dynamically. Time complexity is O((V + E) log V).
                  </div>
                `;
            } else if (note.widget === 'canvas') {
                widgetContainer.innerHTML = `
                  <div class="mock-sketch-preview">
                    <div class="sketch-dot s-1">A</div>
                    <div class="sketch-dot s-2">B</div>
                    <div class="sketch-dot s-3">C</div>
                    <svg class="sketch-connector" viewBox="0 0 100 100">
                      <line x1="20" y1="50" x2="80" y2="20" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-dasharray="4"/>
                      <line x1="80" y1="20" x2="50" y2="80" stroke="var(--theme-color-1)" stroke-width="2"/>
                    </svg>
                    <span class="sketch-label">Interactive Canvas Diagram</span>
                  </div>
                `;
            }
        }
    };

    const renderAllNotesTrial = () => {
        renderTrialFolders();
        renderTrialNotesList();
        loadTrialNoteToEditor();
    };

    // Wire Notes Events
    const initNotesTrialEvents = () => {
        // Title Change
        const titleInput = document.getElementById('trial-editor-title');
        if (titleInput) {
            titleInput.addEventListener('input', (e) => {
                const note = trialNotes.find(n => n.id === trialSelectedNote);
                if (note) {
                    note.title = e.target.value;
                    renderTrialNotesList(); // Update sidebar card title immediately
                }
            });
        }
        
        // Body Change
        const bodyTextarea = document.getElementById('trial-editor-body');
        if (bodyTextarea) {
            bodyTextarea.addEventListener('input', (e) => {
                const note = trialNotes.find(n => n.id === trialSelectedNote);
                if (note) {
                    note.content = e.target.value;
                    renderTrialNotesList(); // Update sidebar preview text immediately
                    if (typeof completeMission === 'function') {
                        completeMission('notes');
                    }
                }
            });
        }
        
        // New Note button
        const newNoteBtn = document.getElementById('trial-add-note-btn');
        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', () => {
                const newId = 'n-' + Date.now();
                const newNote = {
                    id: newId,
                    folderId: trialSelectedFolder,
                    title: 'Untitled Note',
                    content: 'Type your note content here...',
                    tag: '#new',
                    date: 'Just now',
                    widget: 'none'
                };
                trialNotes.push(newNote);
                trialSelectedNote = newId;
                renderAllNotesTrial();
                
                const bodyTextarea = document.getElementById('trial-editor-body');
                if (bodyTextarea) bodyTextarea.focus();
            });
        }

        // New Folder button
        const newFolderBtn = document.getElementById('trial-add-folder-btn');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => {
                const folderName = prompt('Enter new folder name:', 'New Folder');
                if (folderName && folderName.trim() !== '') {
                    const newId = 'f-' + Date.now();
                    trialFolders.push({
                        id: newId,
                        name: '📁 ' + folderName,
                        icon: 'folder'
                    });
                    trialSelectedFolder = newId;
                    trialSelectedNote = null;
                    renderAllNotesTrial();
                }
            });
        }
        
        // Search notes
        const searchInput = document.getElementById('trial-search-notes');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                trialSearchNotesQuery = e.target.value;
                renderTrialNotesList();
            });
        }
    };

    // ==========================================
    // CODE WORKSPACE TRIAL STATE
    // ==========================================
    let trialSnippets = [
        { id: 's-main', name: 'main.js', code: 'import GeminiHelper from \'./ai\';\n\n// Indented coding and notes editor\nasync function optimizeBrain(notes) {\n  const assistant = new GeminiHelper();\n  const summary = await assistant.summarize(notes);\n  \n  return {\n    status: \'optimized\',\n    length: summary.words\n  };\n}' },
        { id: 's-utils', name: 'utils.py', code: 'def calculate_grades(scores):\n    # Python utility to calculate average score\n    total = sum(scores)\n    count = len(scores)\n    return total / count if count > 0 else 0' },
        { id: 's-styles', name: 'styles.css', code: '/* Custom application styles */\n.theme-nature-green {\n    --bg-primary: #f0fdf4;\n    --text-primary: #14532d;\n    --theme-color-1: #16a34a;\n}' }
    ];
    let trialSelectedSnippet = 's-main';
    let trialSearchSnippetsQuery = '';

    const renderTrialSnippets = () => {
        const snippetsList = document.getElementById('trial-snippets-list');
        const snippetTabs = document.getElementById('trial-snippet-tabs');
        if (!snippetsList || !snippetTabs) return;

        snippetsList.innerHTML = '';
        snippetTabs.innerHTML = '';

        // Filter snippets
        let filteredSnippets = trialSnippets;
        if (trialSearchSnippetsQuery.trim() !== '') {
            const q = trialSearchSnippetsQuery.toLowerCase();
            filteredSnippets = trialSnippets.filter(s => s.name.toLowerCase().includes(q));
        }

        filteredSnippets.forEach(snippet => {
            // Render Sidebar item
            const li = document.createElement('li');
            if (snippet.id === trialSelectedSnippet) li.className = 'active';
            li.innerHTML = `📄 ${snippet.name}`;
            li.addEventListener('click', () => {
                trialSelectedSnippet = snippet.id;
                renderAllCodeTrial();
                if (typeof completeMission === 'function') {
                    completeMission('code');
                }
            });
            snippetsList.appendChild(li);

            // Render Tab (only for the selected one, or all for visual parity)
            if (snippet.id === trialSelectedSnippet || snippet.id === 's-main' || snippet.id === 's-utils') {
                const tab = document.createElement('div');
                tab.className = `editor-tab ${snippet.id === trialSelectedSnippet ? 'active' : ''}`;
                tab.textContent = snippet.name;
                tab.addEventListener('click', () => {
                    trialSelectedSnippet = snippet.id;
                    renderAllCodeTrial();
                    if (typeof completeMission === 'function') {
                        completeMission('code');
                    }
                });
                snippetTabs.appendChild(tab);
            }
        });

        // Load active code to editor
        const codeEditor = document.getElementById('trial-code-editor');
        if (codeEditor) {
            const activeSnippet = trialSnippets.find(s => s.id === trialSelectedSnippet);
            if (activeSnippet) {
                codeEditor.value = activeSnippet.code;
            } else {
                codeEditor.value = '';
            }
        }
    };

    const renderAllCodeTrial = () => {
        renderTrialSnippets();
    };

    const initCodeTrialEvents = () => {
        const codeEditor = document.getElementById('trial-code-editor');
        if (codeEditor) {
            codeEditor.addEventListener('input', (e) => {
                const snippet = trialSnippets.find(s => s.id === trialSelectedSnippet);
                if (snippet) {
                    snippet.code = e.target.value;
                }
            });
        }

        // Add snippet button
        const addSnippetBtn = document.getElementById('trial-add-snippet-btn');
        if (addSnippetBtn) {
            addSnippetBtn.addEventListener('click', () => {
                const name = prompt('Enter snippet file name (e.g. index.js):', 'snippet.js');
                if (name && name.trim() !== '') {
                    const newId = 's-' + Date.now();
                    trialSnippets.push({
                        id: newId,
                        name: name,
                        code: '// Write code here...\n'
                    });
                    trialSelectedSnippet = newId;
                    renderAllCodeTrial();
                }
            });
        }

        // Search snippets
        const searchInput = document.getElementById('trial-search-snippets');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                trialSearchSnippetsQuery = e.target.value;
                renderTrialSnippets();
            });
        }
    };

    // ==========================================
    // STUDENT HUB TRIAL STATE & ACTIONS
    // ==========================================
    let trialFlashcards = [
        { q: 'What is the time complexity of building a heap with Floyd\'s heap construction method?', a: 'The time complexity is O(N) linear time, because the work decreases exponentially at higher levels.', tag: 'Topic: Computer Science' },
        { q: 'How does Dijkstra\'s algorithm handle negative edge weights?', a: 'Dijkstra\'s algorithm does NOT support negative weights because it assumes once a vertex is finalized, its shortest path is stable. Use Bellman-Ford instead.', tag: 'Topic: Graphs' },
        { q: 'What is the primary difference between a queue and a stack?', a: 'A queue operates on FIFO (First In First Out), while a stack operates on LIFO (Last In First Out).', tag: 'Topic: Data Structures' },
        { q: 'What are the main principles of Object-Oriented Programming (OOP)?', a: 'OOP principles are Encapsulation (data hiding), Abstraction (hiding details), Inheritance (reusability), and Polymorphism (many forms).', tag: 'Topic: Software Engineering' }
    ];
    let trialSelectedFlashcardIndex = 0;

    const renderFlashcard = () => {
        const qEl = document.getElementById('trial-card-question');
        const aEl = document.getElementById('trial-card-answer');
        const indEl = document.getElementById('trial-card-indicator');
        const flashcardContainer = document.getElementById('mock-flashcard');
        
        if (!qEl || !aEl || !indEl) return;
        
        // Remove flipped state when changing card
        const inner = flashcardContainer ? flashcardContainer.querySelector('.mock-flashcard-inner') : null;
        if (inner) inner.classList.remove('flipped');
        
        const card = trialFlashcards[trialSelectedFlashcardIndex];
        qEl.textContent = card.q;
        aEl.textContent = card.a;
        
        const tagFront = qEl.previousElementSibling;
        if (tagFront && tagFront.classList.contains('card-tag')) {
            tagFront.textContent = card.tag;
        }
        
        indEl.textContent = `${trialSelectedFlashcardIndex + 1} / ${trialFlashcards.length}`;
    };

    const initStudentTrialEvents = () => {
        // Next Card
        const nextBtn = document.getElementById('btn-next-card');
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                trialSelectedFlashcardIndex = (trialSelectedFlashcardIndex + 1) % trialFlashcards.length;
                renderFlashcard();
            });
        }
        
        // Prev Card
        const prevBtn = document.getElementById('btn-prev-card');
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                trialSelectedFlashcardIndex = (trialSelectedFlashcardIndex - 1 + trialFlashcards.length) % trialFlashcards.length;
                renderFlashcard();
            });
        }

        // Generate revision schedule
        const generateBtn = document.getElementById('btn-generate-schedule');
        const subjectInput = document.getElementById('trial-schedule-subject');
        const timelineList = document.getElementById('trial-timeline-list');
        
        if (generateBtn && subjectInput && timelineList) {
            generateBtn.addEventListener('click', () => {
                const subject = subjectInput.value.trim() || 'Algorithms';
                generateBtn.disabled = true;
                generateBtn.textContent = 'Planning...';
                
                setTimeout(() => {
                    timelineList.innerHTML = `
                      <div class="timeline-item active">
                        <span class="timeline-day">Day 1</span>
                        <div class="timeline-info">
                          <strong>${subject} Core Fundamentals</strong>
                          <p>Analyze definitions, basic structures, and review terminology guides</p>
                        </div>
                      </div>
                      <div class="timeline-item">
                        <span class="timeline-day">Day 2</span>
                        <div class="timeline-info">
                          <strong>Practical ${subject} Exercises</strong>
                          <p>Solve practice sets, write code/notes implementation, and test edge cases</p>
                        </div>
                      </div>
                      <div class="timeline-item">
                        <span class="timeline-day">Day 3</span>
                        <div class="timeline-info">
                          <strong>Active Recall & Mock Exam</strong>
                          <p>Run study flashcards, complete timed questions, and finalize formulas list</p>
                        </div>
                      </div>
                    `;
                    generateBtn.disabled = false;
                    generateBtn.textContent = 'Generate';
                }, 1000);
            });
        }
    };

    // Initialize all workspace trials
    renderAllNotesTrial();
    initNotesTrialEvents();
    renderAllCodeTrial();
    initCodeTrialEvents();
    renderFlashcard();
    initStudentTrialEvents();

    // ==========================================
    // 2. INTERACTIVE WORKSPACE PREVIEW SWITCHER
    // ==========================================
    const dockItems = document.querySelectorAll('.os-dock .dock-item');
    const desktopIcons = document.querySelectorAll('.desktop-icon-item');
    const bentoWindows = document.querySelectorAll('.bento-window');

    const switchTab = (tabName) => {
        // Switch active dock button state
        dockItems.forEach(b => {
            if (b.getAttribute('data-app') === tabName) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        // Switch active window panel
        bentoWindows.forEach(win => {
            if (win.getAttribute('data-window') === tabName) {
                win.classList.remove('minimized');
                win.classList.add('active');
            } else {
                win.classList.remove('active');
            }
        });

        // Dynamically toggle student accent colors and chassis glows
        if (tabName === 'student') {
            document.body.classList.add('student-engine-active');
        } else {
            document.body.classList.remove('student-engine-active');
        }
    };

    dockItems.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetApp = btn.getAttribute('data-app');
            if (targetApp && ['notes', 'code', 'student', 'uidesigner'].includes(targetApp)) {
                switchTab(targetApp);
            }
        });
    });

    desktopIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            const targetApp = icon.getAttribute('data-app');
            if (targetApp && ['notes', 'code', 'student', 'uidesigner'].includes(targetApp)) {
                e.preventDefault();
                switchTab(targetApp);
            }
        });
    });

    // ==========================================
    // 2B. TRIAL UI DESIGNER INTERACTIVE PRESETS
    // ==========================================
    const trialPreviewCard = document.getElementById('trial-uidesigner-preview-card');
    const trialBtn = document.getElementById('trial-uidesigner-btn');
    const trialPromptInput = document.getElementById('trial-uidesigner-prompt');
    const trialRefineBtn = document.getElementById('btn-trial-refine-ai');
    const trialChips = document.querySelectorAll('.trial-preset-chip');

    if (trialPreviewCard) {
        const applyTrialPreset = (preset) => {
            if (preset === 'glassmorphic') {
                trialPreviewCard.style.background = 'rgba(255, 255, 255, 0.12)';
                trialPreviewCard.style.backdropFilter = 'blur(16px)';
                trialPreviewCard.style.webkitBackdropFilter = 'blur(16px)';
                trialPreviewCard.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                trialPreviewCard.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
            } else if (preset === 'neon-glow') {
                trialPreviewCard.style.background = '#431407';
                trialPreviewCard.style.border = '2px solid #f97316';
                trialPreviewCard.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.8), inset 0 0 15px rgba(249, 115, 22, 0.3)';
            } else if (preset === 'hover-anim') {
                trialPreviewCard.style.transform = 'scale(1.04) translateY(-4px)';
                trialPreviewCard.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.5)';
                setTimeout(() => {
                    trialPreviewCard.style.transform = 'scale(1) translateY(0)';
                }, 1000);
            } else if (preset === 'pill-shape' && trialBtn) {
                trialBtn.style.borderRadius = '9999px';
                trialBtn.style.padding = '8px 24px';
                trialBtn.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
            }
        };

        trialChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const preset = chip.getAttribute('data-preset');
                if (trialPromptInput) trialPromptInput.value = `Apply ${preset} styling to target component`;
                applyTrialPreset(preset);
            });
        });

        if (trialRefineBtn) {
            trialRefineBtn.addEventListener('click', () => {
                const text = (trialPromptInput ? trialPromptInput.value.toLowerCase() : '');
                if (text.includes('neon')) applyTrialPreset('neon-glow');
                else if (text.includes('pill')) applyTrialPreset('pill-shape');
                else if (text.includes('hover') || text.includes('anim')) applyTrialPreset('hover-anim');
                else applyTrialPreset('glassmorphic');
            });
        }
    }

    // Close and minimize buttons
    const winCloseButtons = document.querySelectorAll('.window-controls .dot-close, .window-controls .dot-minimize');
    winCloseButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const winName = btn.getAttribute('data-win-close') || btn.getAttribute('data-win-minimize');
            const targetWin = document.getElementById(`window-${winName}`);
            if (targetWin) {
                targetWin.classList.add('minimized');
                targetWin.classList.remove('active');
                
                // Clear active dock styling
                const dockItem = document.querySelector(`.os-dock .dock-item[data-app="${winName}"]`);
                if (dockItem) dockItem.classList.remove('active');
            }
        });
    });

    // Expand restore button
    const winExpandButtons = document.querySelectorAll('.window-controls .dot-expand');
    winExpandButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const winName = btn.getAttribute('data-win-expand');
            const targetWin = document.getElementById(`window-${winName}`);
            if (targetWin) {
                targetWin.classList.remove('minimized');
                switchTab(winName);
            }
        });
    });

    // Focus window directly on clicking its pane
    bentoWindows.forEach(win => {
        win.addEventListener('click', (e) => {
            if (e.target.classList.contains('dot')) return;
            if (!win.classList.contains('active')) {
                const tabName = win.getAttribute('data-window');
                switchTab(tabName);
            }
        });
    });

    // ==========================================
    // 4. INTERACTIVE FLASHCARD WIDGET SIMULATOR
    // ==========================================
    const mockFlashcard = document.getElementById('mock-flashcard');
    if (mockFlashcard) {
        mockFlashcard.addEventListener('click', () => {
            const inner = mockFlashcard.querySelector('.mock-flashcard-inner');
            if (inner) {
                inner.classList.toggle('flipped');
            }
        });
    }

    // ==========================================
    // 5. INTERACTIVE TERMINAL AI CODE EXPLAINER (LOCKED TRIAL)
    // ==========================================
    const trialUpgradeModal = document.getElementById('trial-upgrade-modal');
    const trialModalMessage = document.getElementById('trial-modal-message');
    const btnCloseTrialModal = document.getElementById('btn-close-trial-modal');

    function openTrialUpgradeModal(message) {
        if (trialUpgradeModal && trialModalMessage) {
            trialModalMessage.textContent = message;
            trialUpgradeModal.classList.remove('hidden');
        }
    }

    function closeTrialUpgradeModal() {
        if (trialUpgradeModal) {
            trialUpgradeModal.classList.add('hidden');
        }
    }

    if (btnCloseTrialModal) {
        btnCloseTrialModal.addEventListener('click', closeTrialUpgradeModal);
    }

    const btnRunCode = document.getElementById('btn-run-code');
    if (btnRunCode) {
        btnRunCode.addEventListener('click', () => {
            openTrialUpgradeModal('✦ Unlock Gemini AI Assistant — Sign in or create a free account to explain, refactor, and generate code snippets instantly with our integrated AI companion.');
        });
    }

    // Wire up all premium AI buttons
    const aiLockBtns = document.querySelectorAll('.trial-ai-lock-btn');
    aiLockBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const action = btn.getAttribute('data-action');
            let featureName = 'Premium AI Assistant';
            if (action === 'ai-summary') featureName = 'Smart AI Document Summaries';
            if (action === 'ai-expand') featureName = 'Gemini Ask AI Writer';
            openTrialUpgradeModal(`✦ Unlock ${featureName} — Sign in or register for a free account to analyze, compose, and organize notes automatically using state-of-the-art LLMs.`);
        });
    });

    // ==========================================
    // NOTE EDITOR TOOLBAR FORMATTING ACTIONS
    // ==========================================
    const toolbarBtns = document.querySelectorAll('.trial-editor-toolbar .toolbar-btn:not(.trial-ai-lock-btn)');
    const editorTextarea = document.getElementById('trial-editor-body');

    toolbarBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!editorTextarea) return;

            const action = btn.getAttribute('data-action');
            const start = editorTextarea.selectionStart;
            const end = editorTextarea.selectionEnd;
            const text = editorTextarea.value;
            const selectedText = text.substring(start, end);

            let replacement = '';
            let selStart = start;
            let selEnd = end;

            switch (action) {
                case 'bold':
                    if (selectedText) {
                        replacement = `**${selectedText}**`;
                        selStart = start + 2;
                        selEnd = start + 2 + selectedText.length;
                    } else {
                        replacement = `**bold text**`;
                        selStart = start + 2;
                        selEnd = start + 11; // "bold text" is 9 chars
                    }
                    break;
                case 'italic':
                    if (selectedText) {
                        replacement = `*${selectedText}*`;
                        selStart = start + 1;
                        selEnd = start + 1 + selectedText.length;
                    } else {
                        replacement = `*italic text*`;
                        selStart = start + 1;
                        selEnd = start + 12; // "italic text" is 11 chars
                    }
                    break;
                case 'header':
                    if (selectedText) {
                        replacement = `\n### ${selectedText}\n`;
                        selStart = start + 5;
                        selEnd = start + 5 + selectedText.length;
                    } else {
                        replacement = `\n### Heading\n`;
                        selStart = start + 5;
                        selEnd = start + 12; // "Heading" is 7 chars
                    }
                    break;
                case 'list':
                    if (selectedText) {
                        replacement = `\n- ${selectedText}\n`;
                        selStart = start + 3;
                        selEnd = start + 3 + selectedText.length;
                    } else {
                        replacement = `\n- List item\n`;
                        selStart = start + 3;
                        selEnd = start + 12; // "List item" is 9 chars
                    }
                    break;
                case 'quote':
                    if (selectedText) {
                        replacement = `\n> ${selectedText}\n`;
                        selStart = start + 3;
                        selEnd = start + 3 + selectedText.length;
                    } else {
                        replacement = `\n> Quote\n`;
                        selStart = start + 3;
                        selEnd = start + 8; // "Quote" is 5 chars
                    }
                    break;
            }

            editorTextarea.value = text.substring(0, start) + replacement + text.substring(end);
            
            // Programmatically trigger input event to sync state immediately
            editorTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            editorTextarea.focus();
            editorTextarea.setSelectionRange(selStart, selEnd);

            // Sync with local trial note state and render card previews
            const note = trialNotes.find(n => n.id === trialSelectedNote);
            if (note) {
                note.content = editorTextarea.value;
                renderTrialNotesList();
            }

            if (typeof completeMission === 'function') {
                completeMission('toolbar');
            }
        });
    });

    // ==========================================
    // 8. ADVANCED 3D ISOMETRIC PARALLAX STAGE TILT
    // ==========================================
    const bentoStage = document.getElementById('bento-stage-container');
    const previewSection = document.querySelector('.desktop-env-section') || document.querySelector('.preview-section');
    if (bentoStage && previewSection) {
        previewSection.addEventListener('mousemove', (e) => {
            const rect = bentoStage.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Calculate distance from center in range [-1, 1]
            const tiltX = (e.clientX - centerX) / (window.innerWidth / 2);
            const tiltY = (e.clientY - centerY) / (window.innerHeight / 2);
            
            // Apply subtle tilt rotation to the entire stage wrapper
            const rotateX = (-tiltY * 5).toFixed(2);
            const rotateY = (tiltX * 5).toFixed(2);
            
            bentoStage.style.transform = `perspective(2000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        previewSection.addEventListener('mouseleave', () => {
            bentoStage.style.transform = 'perspective(2000px) rotateX(0deg) rotateY(0deg)';
            bentoStage.style.transition = 'transform 0.5s ease';
        });

        bentoStage.addEventListener('mouseenter', () => {
            bentoStage.style.transition = 'none'; // Instant response on hover start
        });
    }

    // Close Interactive Demo Sandbox Hint Badge
    const closeHintBtn = document.getElementById('btn-close-demo-hint');
    const hintBadge = document.getElementById('demo-interactive-hint');
    if (closeHintBtn && hintBadge) {
        closeHintBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hintBadge.classList.add('hidden');
        });
    }

    // ==========================================
    // 9. TACTILE 3D BENTO CARD TILT & GLOW HOVER
    // ==========================================
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
            
            // 3D Tilt calculations
            const cardX = rect.left + rect.width / 2;
            const cardY = rect.top + rect.height / 2;
            const tiltX = (e.clientX - cardX) / (rect.width / 2);
            const tiltY = (e.clientY - cardY) / (rect.height / 2);
            
            const rotateX = (-tiltY * 8).toFixed(2);
            const rotateY = (tiltX * 8).toFixed(2);
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
            card.style.transition = 'transform 0.5s ease';
        });
        
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'none';
        });
    });

    // ==========================================
    // 9B. SPOTLIGHT SCREENSHOTS 3D TILT
    // ==========================================
    const spotlightWrappers = document.querySelectorAll('.spotlight-visual .glowing-wrapper');
    spotlightWrappers.forEach(wrap => {
        wrap.addEventListener('mousemove', (e) => {
            const rect = wrap.getBoundingClientRect();
            const wrapX = rect.left + rect.width / 2;
            const wrapY = rect.top + rect.height / 2;
            const tiltX = (e.clientX - wrapX) / (rect.width / 2);
            const tiltY = (e.clientY - wrapY) / (rect.height / 2);
            
            const rotateX = (-tiltY * 10).toFixed(2);
            const rotateY = (tiltX * 10).toFixed(2);
            
            const shadowX = (-tiltX * 20).toFixed(1);
            const shadowY = (-tiltY * 20).toFixed(1);
            const shadowBlur = (25 + Math.abs(tiltX * 8) + Math.abs(tiltY * 8)).toFixed(1);
            
            wrap.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            wrap.style.boxShadow = `${shadowX}px ${shadowY}px ${shadowBlur}px rgba(9, 9, 11, 0.06), 0 30px 70px rgba(9, 9, 11, 0.04)`;
        });
        
        wrap.addEventListener('mouseleave', () => {
            wrap.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            wrap.style.boxShadow = '0 30px 70px rgba(9, 9, 11, 0.04)';
            wrap.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease';
        });
        
        wrap.addEventListener('mouseenter', () => {
            wrap.style.transition = 'none';
        });
    });

    // ==========================================
    // 10. SCROLL REVEAL INTERSECTION OBSERVER FALLBACK
    // ==========================================
    const supportsScrollDriven = CSS.supports('(animation-timeline: view()) and (animation-range: entry)');
    if (!supportsScrollDriven) {
        const revealSelectors = '.features-grid > *, .spotlight-section .scroll-reveal-left, .spotlight-section .scroll-reveal-right, .bento-stage-container';
        const elementsToReveal = document.querySelectorAll(revealSelectors);
        
        elementsToReveal.forEach(el => {
            el.classList.add('js-reveal');
        });

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -50px 0px'
        });

        elementsToReveal.forEach(el => {
            revealObserver.observe(el);
        });
    }

    // ==========================================
    // 11. SMOOTH ANCHOR LINK SCROLLING
    // ==========================================
    const navAnchors = document.querySelectorAll('a[href^="#"]');
    navAnchors.forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const navHeight = navbar ? navbar.offsetHeight : 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - navHeight - 20;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ==========================================
    // 12. MOBILE MENU DRAWER NAVIGATION
    // ==========================================
    const menuToggle = document.getElementById('menu-toggle');
    const navLinksContainer = document.querySelector('.nav-links');
    
    if (menuToggle && navLinksContainer) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinksContainer.classList.toggle('mobile-active');
            
            if (navLinksContainer.classList.contains('mobile-active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        navLinksContainer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinksContainer.classList.remove('mobile-active');
                document.body.style.overflow = '';
            });
        });
    }

    // ==========================================
    // 13. DYNAMIC OVERLAY MODALS DICTIONARY
    // ==========================================
    const footerData = {
        'Security': {
            title: 'Security at Global Notes Workspace',
            content: `
                <p>We take your data security seriously. Global Notes Workspace is built with a focus on privacy and reliability.</p>
                <h3>End-to-End Principles</h3>
                <p>Your notes are your business. We implement industry-standard encryption practices to ensure your data is secure both at rest and in transit.</p>
                <ul>
                    <li>TLS 1.3 for all data in transit</li>
                    <li>AES-256 encryption at rest</li>
                    <li>Regular third-party security audits</li>
                    <li>Transparent data practices</li>
                </ul>
                <h3>Privacy First</h3>
                <p>We don't sell your data. We don't track your writing habits. We believe in being a tool, not a tracker.</p>
            `
        },
        'Roadmap': {
            title: 'Product Roadmap',
            content: `
                <p>See what we're building next for the Global Notes ecosystem.</p>
                <h3>Q3 2026: Mobile Excellence</h3>
                <ul>
                    <li>Native iOS and Android apps (Beta)</li>
                    <li>Offline-first sync engine</li>
                    <li>Biometric locking for sensitive notes</li>
                </ul>
                <h3>Q4 2026: Advanced Collaboration</h3>
                <ul>
                    <li>Real-time multiplayer editing</li>
                    <li>Team workspaces and permissions</li>
                    <li>Advanced API for workspace automation</li>
                </ul>
            `
        },
        'Documentation': {
            title: 'Documentation',
            content: `
                <p>Learn how to get the most out of your workspace.</p>
                <h3>Getting Started</h3>
                <p>Everything you need to know to set up your second brain in under 5 minutes.</p>
                <ul>
                    <li><strong>Slash Commands:</strong> Type / for formatting and blocks.</li>
                    <li><strong>Markdown:</strong> Standard markdown support is built-in.</li>
                    <li><strong>Backlinking:</strong> Use [[ to link notes together.</li>
                    <li><strong>Code Blocks:</strong> Full syntax highlighting for 50+ languages.</li>
                </ul>
            `
        },
        'Help Center': {
            title: 'Help Center',
            content: `
                <p>Need a hand? Our support team and documentation are here to help.</p>
                <h3>Common Topics</h3>
                <ul>
                    <li>Resetting your password</li>
                    <li>Exporting your notes to PDF or Markdown</li>
                    <li>Configuring AI settings and API keys</li>
                    <li>Keyboard shortcuts for power users</li>
                </ul>
                <p>Can't find what you're looking for? Reach out to us at <strong>support@noted.com</strong></p>
            `
        },
        'About': {
            title: 'About Global Notes Workspace',
            content: `
                <p>Global Notes Workspace was born from a simple desire: to create a workspace that is as fast as your thoughts and as elegant as your ideas.</p>
                <p>We are a small team of engineers and designers dedicated to building the best tool for thinking. We believe that software should be beautiful, functional, and respect your focus.</p>
                <p>Founded in 2026, we're building a sustainable company that puts users first.</p>
            `
        },
        'Privacy': {
            title: 'Privacy Policy',
            content: `
                <p>Last Updated: April 14, 2026</p>
                <p>Your privacy is central to everything we do. We collect only the information necessary to provide our service.</p>
                <h3>What we collect</h3>
                <ul>
                    <li>Account information (Email)</li>
                    <li>Workspace content (encrypted)</li>
                    <li>Usage data for performance monitoring</li>
                </ul>
                <p>We do not share your private note content with any third party, except as required by law.</p>
            `
        },
        'Terms': {
            title: 'Terms of Service',
            content: `
                <p>By using Global Notes Workspace, you agree to treat the service and its community with respect.</p>
                <ul>
                    <li>You own your content.</li>
                    <li>Do not use the service for illegal activities.</li>
                    <li>We reserve the right to terminate accounts that violate these terms.</li>
                </ul>
            `
        },
        'Contact': {
            title: 'Contact Us',
            content: `
                <p>Have questions, feedback, or just want to say hello? We'd love to hear from you.</p>
                <h3>Email</h3>
                <p>General inquiries: <strong>hello@noted.com</strong></p>
                <p>Support: <strong>support@noted.com</strong></p>
                <h3>Social</h3>
                <p>Follow us on Twitter/X: <strong>@noted_app</strong></p>
            `
        }
    };

    const modal = document.getElementById('info-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const modalClose = document.getElementById('modal-close');

    if (modal && modalTitle && modalText) {
        const modalLinks = document.querySelectorAll('.modal-link, .footer-col ul li a');
        modalLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const modalKey = link.getAttribute('data-modal') || link.textContent.trim();
                
                let mappedKey = modalKey;
                if (modalKey === 'Privacy Policy') mappedKey = 'Privacy';
                if (modalKey === 'Terms of Service') mappedKey = 'Terms';

                if (footerData[mappedKey]) {
                    e.preventDefault();
                    modalTitle.textContent = footerData[mappedKey].title;
                    modalText.innerHTML = footerData[mappedKey].content;
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        });

        const closeModal = () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        };

        if (modalClose) modalClose.addEventListener('click', closeModal);
        const backdrop = modal.querySelector('.modal-backdrop');
        if (backdrop) backdrop.addEventListener('click', closeModal);
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    // ==========================================
    // INTERACTIVE BENTO PLAYGROUND WIDGETS LOGIC
    // ==========================================

    // Helper to show bento card actions feedback toast
    function showBentoToast(message) {
        let toast = document.getElementById('bento-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'bento-toast';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.background = 'rgba(9, 9, 11, 0.9)';
            toast.style.color = '#FFFFFF';
            toast.style.padding = '10px 16px';
            toast.style.borderRadius = '8px';
            toast.style.fontFamily = 'var(--ff-body)';
            toast.style.fontSize = '0.75rem';
            toast.style.zIndex = '9999';
            toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
            toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            toast.style.transform = 'translateY(10px)';
            toast.style.opacity = '0';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);

        // Hide after 2 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
        }, 2000);
    }

    // 1. Folders Tree Widget
    const folders = document.querySelectorAll('.folder-tree-visual .tree-folder');
    folders.forEach(folder => {
        folder.addEventListener('click', () => {
            const folderName = folder.getAttribute('data-folder');
            const subItems = document.getElementById(`tree-${folderName}`);
            const toggle = folder.querySelector('.tree-toggle');
            if (subItems && toggle) {
                const isHidden = subItems.classList.toggle('hidden');
                toggle.textContent = isHidden ? '▶' : '▼';
            }
        });
    });

    const files = document.querySelectorAll('.folder-tree-visual .tree-file');
    files.forEach(file => {
        file.addEventListener('click', () => {
            const fileName = file.querySelector('.tree-label').textContent;
            showBentoToast(`📄 Loaded ${fileName} instantly from SQLite cache!`);
        });
    });

    // 2. Latency Speedometer Widget
    const btnSyncGauge = document.getElementById('btn-sync-gauge');
    const gaugeLatency = document.getElementById('gauge-latency');
    const gaugeProgress = document.getElementById('gauge-progress');

    if (btnSyncGauge && gaugeLatency && gaugeProgress) {
        // Initialize gauge meter dashoffset
        gaugeProgress.style.strokeDashoffset = '264'; // empty at start

        btnSyncGauge.addEventListener('click', () => {
            btnSyncGauge.disabled = true;
            btnSyncGauge.textContent = 'Syncing...';
            
            // Step 1: Simulated network check
            gaugeLatency.textContent = '120ms';
            gaugeProgress.style.strokeDashoffset = '200';

            // Step 2: Cache lookup
            setTimeout(() => {
                gaugeLatency.textContent = '45ms';
                gaugeProgress.style.strokeDashoffset = '100';
            }, 400);

            // Step 3: Finished offline cache retrieval
            setTimeout(() => {
                gaugeLatency.textContent = '0.8ms';
                gaugeProgress.style.strokeDashoffset = '0';
                showBentoToast('⚡ Cache Sync Completed in 0.8ms!');
                if (typeof completeMission === 'function') {
                    completeMission('latency');
                }
            }, 800);

            // Step 4: Re-enable
            setTimeout(() => {
                btnSyncGauge.disabled = false;
                btnSyncGauge.textContent = '⚡ Trigger Cache Sync';
            }, 1800);
        });
    }

    // 3. Search Tag Filter Widget
    const bentoTags = document.querySelectorAll('.search-tags-row .bento-tag');
    const bentoSearchList = document.getElementById('bento-search-list');

    bentoTags.forEach(tag => {
        tag.addEventListener('click', () => {
            // Toggle active tag state
            bentoTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');

            const filter = tag.getAttribute('data-filter');
            const items = bentoSearchList.querySelectorAll('.search-result-item');
            
            items.forEach(item => {
                const tags = item.getAttribute('data-tags');
                if (filter === 'all' || tags.includes(filter)) {
                    item.classList.remove('filtered-out');
                } else {
                    item.classList.add('filtered-out');
                }
            });
        });
    });

    // 4. Dynamic Theme Swatches Card
    const themeSwatches = document.querySelectorAll('.theme-picker-visual .theme-swatch');
    const themeCard = document.getElementById('theme-bento-card');

    themeSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            themeSwatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');

            const theme = swatch.getAttribute('data-theme');
            
            if (themeCard) {
                // Clear existing local card theme classes
                themeCard.className = 'feature-card bento-wide glass-panel';
                
                if (theme !== 'linen') {
                    themeCard.classList.add(`theme-preset-${theme}`);
                }
                showBentoToast(`🎨 Shifted preview card theme to ${theme.toUpperCase()}!`);
            }
        });
    });

    // ==========================================
    // OS STATE MACHINE & SYSTEM CLOCK CONTROL
    // ==========================================

    // System clock update loop
    const systemClock = document.getElementById('system-clock');
    if (systemClock) {
        const updateClock = () => {
            const now = new Date();
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // hour '0' should be '12'
            systemClock.textContent = `${hours}:${minutes} ${ampm}`;
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    // Onboarding Missions state tracking
    window.missionState = {
        notes: false,
        toolbar: false,
        code: false,
        latency: false
    };

    window.completeMission = (missionId) => {
        if (window.missionState[missionId] === true) return; // already done

        window.missionState[missionId] = true;
        
        // Update checkbox list item UI
        const item = document.getElementById(`mission-${missionId}`);
        if (item) {
            item.classList.add('completed');
        }

        // Count completed
        const completedCount = Object.values(window.missionState).filter(val => val).length;
        const progressEl = document.getElementById('mission-progress');
        if (progressEl) {
            progressEl.textContent = `${completedCount}/4`;
        }

        // Toast feedback
        const missionNames = {
            notes: 'Type in Notes editor',
            toolbar: 'Click Bold tool',
            code: 'Select Snippet in IDE',
            latency: 'Run Latency sync'
        };
        showBentoToast(`🎉 Mission Completed: ${missionNames[missionId]}!`);

        // Check overall completion
        if (completedCount === 4) {
            triggerReward();
        }
    };

    const triggerReward = () => {
        const modal = document.getElementById('trial-upgrade-modal');
        if (modal) {
            const modalTitle = modal.querySelector('h3');
            const modalMsg = document.getElementById('trial-modal-message');
            const primaryCta = modal.querySelector('.trial-modal-actions .btn-pill-primary');

            if (modalTitle && modalMsg && primaryCta) {
                modalTitle.innerHTML = '✦ Mission Accomplished!';
                modalMsg.textContent = 'Congratulations! You have completed all onboarding tasks and unlocked 3 months of free Premium Gemini AI access. Create a free account now to claim your reward!';
                primaryCta.textContent = 'Claim Premium Reward';
                primaryCta.href = 'HTML/signup.html';
                
                setTimeout(() => {
                    modal.classList.remove('hidden');
                }, 600);
            }
        }
    };

    // ==========================================
    // INTERACTIVE SPOTLIGHT CONSOLES LOGIC
    // ==========================================

    // 1. Developer IDE Spotlights Runner
    const spotlightRunBtn = document.getElementById('btn-spotlight-run-code');
    const spotlightTerminal = document.getElementById('spotlight-ide-terminal');
    
    if (spotlightRunBtn && spotlightTerminal) {
        spotlightRunBtn.addEventListener('click', () => {
            spotlightRunBtn.disabled = true;
            spotlightRunBtn.textContent = 'Running...';
            spotlightTerminal.innerHTML = '';
            
            const logs = [
                { text: '$ node index.js', type: 'command-log', delay: 100 },
                { text: '[SQLite] Connecting to local DB sandbox...', type: '', delay: 400 },
                { text: '[SQLite] SELECT * FROM notes LIMIT 5;', type: 'command-log', delay: 800 },
                { text: '✔ Connection open. Retrieved 5 rows in 0.38ms!', type: 'success-log', delay: 1200 },
                { text: 'Done. Exiting process.', type: '', delay: 1500 }
            ];

            logs.forEach(log => {
                setTimeout(() => {
                    const row = document.createElement('div');
                    row.className = `terminal-row ${log.type}`;
                    row.textContent = log.text;
                    spotlightTerminal.appendChild(row);
                    spotlightTerminal.scrollTop = spotlightTerminal.scrollHeight;
                    
                    if (log.text.startsWith('Done.')) {
                        spotlightRunBtn.disabled = false;
                        spotlightRunBtn.textContent = '⚡ Run Code Block';
                    }
                }, log.delay);
            });
        });
    }

    // 2. Student Hub Flashcard Flip
    const spotlightFlashcard = document.getElementById('spotlight-flashcard');
    if (spotlightFlashcard) {
        spotlightFlashcard.addEventListener('click', () => {
            spotlightFlashcard.classList.toggle('flipped');
        });
    }

    // 3. Student Hub Timetable Scheduler Generator
    const spotlightSchedBtn = document.getElementById('btn-spotlight-generate-schedule');
    const spotlightSchedList = document.getElementById('spotlight-schedule-list');
    
    const studyPlanSets = [
        [
            { day: 'Day 1', task: 'Priority Queues Setup' },
            { day: 'Day 2', task: 'Graph Edge Relaxations' },
            { day: 'Day 3', task: 'Shortest Paths Proof' }
        ],
        [
            { day: 'Day 1', task: 'DP Memoization Analysis' },
            { day: 'Day 2', task: 'Knapsack Problem Proof' },
            { day: 'Day 3', task: 'Edit Distance Code' }
        ],
        [
            { day: 'Day 1', task: 'Hash Map Collision Rate' },
            { day: 'Day 2', task: 'Balanced Trees Rotations' },
            { day: 'Day 3', task: 'Red-Black Nodes Insertion' }
        ]
    ];
    let currentPlanIndex = 0;

    if (spotlightSchedBtn && spotlightSchedList) {
        spotlightSchedBtn.addEventListener('click', () => {
            spotlightSchedBtn.disabled = true;
            spotlightSchedBtn.textContent = 'Generating...';
            spotlightSchedList.style.opacity = '0.3';
            
            setTimeout(() => {
                currentPlanIndex = (currentPlanIndex + 1) % studyPlanSets.length;
                const activePlan = studyPlanSets[currentPlanIndex];
                
                spotlightSchedList.innerHTML = '';
                activePlan.forEach((item, idx) => {
                    const row = document.createElement('div');
                    row.className = `schedule-row ${idx === 0 ? 'active' : ''}`;
                    row.innerHTML = `
                        <span class="day-badge">${item.day}</span>
                        <span class="subject-title">${item.task}</span>
                    `;
                    spotlightSchedList.appendChild(row);
                });
                
                spotlightSchedList.style.opacity = '1';
                spotlightSchedBtn.disabled = false;
                spotlightSchedBtn.textContent = '🔄 Refresh Study Plan';
            }, 600);
        });
    }

    // 4. Live Footer System Status Simulator
    const footerLatencyVal = document.getElementById('footer-latency-val');
    const footerSyncIndicator = document.getElementById('footer-sync-indicator');
    
    if (footerLatencyVal && footerSyncIndicator) {
        // Initialize as online
        footerSyncIndicator.className = 'status-indicator online';
        
        setInterval(() => {
            const randomLatency = (Math.random() * 0.5).toFixed(2);
            footerLatencyVal.textContent = randomLatency + 'ms';
            
            // Spike trigger simulation: 20% chance to blink alert state
            if (Math.random() > 0.8) {
                footerSyncIndicator.className = 'status-indicator warning';
                setTimeout(() => {
                    footerSyncIndicator.className = 'status-indicator online';
                }, 800);
            } else {
                footerSyncIndicator.className = 'status-indicator online';
            }
        }, 4000);
    }

    // 5. Bento Folder Explorer Interactive Logic
    const bentoFolders = document.querySelectorAll('.tree-folder');
    const bentoFiles = document.querySelectorAll('.tree-file');
    const explorerTitle = document.getElementById('explorer-preview-title');
    const explorerBody = document.getElementById('explorer-preview-body');

    const previewContents = {
        readme: `<p>Welcome to Global Notes! This document outlines your persistent offline knowledge base environment.</p>`,
        roadmap: `<p><b>Project Milestones:</b><br>1. Local caching validation - Complete<br>2. 3D tilt interface stage - Complete<br>3. Multi-workspace integrations - In Progress</p>`,
        quantum: `<p><b>Theoretical Physics Lab Logs:</b><br>Measurements of quantum entanglement states in silicon lattices indicate stable coherence levels under cryo settings.</p>`,
        server: `<p><code>const express = require('express');<br>const app = express();<br>app.listen(3000, () => console.log('Offline server running!'));</code></p>`
    };

    bentoFolders.forEach(folder => {
        folder.addEventListener('click', () => {
            const targetId = folder.getAttribute('data-target');
            const subItems = document.getElementById(targetId);
            const toggleIcon = folder.querySelector('.tree-toggle');
            
            if (subItems) {
                const isHidden = subItems.classList.toggle('hidden');
                folder.classList.toggle('expanded', !isHidden);
                if (toggleIcon) {
                    toggleIcon.textContent = isHidden ? '▶' : '▼';
                }
            }
        });
    });

    bentoFiles.forEach(file => {
        file.addEventListener('click', () => {
            bentoFiles.forEach(f => f.classList.remove('active'));
            file.classList.add('active');
            
            const contentKey = file.getAttribute('data-content');
            const fileLabel = file.querySelector('.tree-label');
            
            if (explorerTitle && fileLabel) {
                explorerTitle.textContent = fileLabel.textContent;
            }
            if (explorerBody && previewContents[contentKey]) {
                explorerBody.innerHTML = previewContents[contentKey];
            }
        });
    });
});
