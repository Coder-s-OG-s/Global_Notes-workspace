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
    // 2. INTERACTIVE WORKSPACE PREVIEW SWITCHER
    // ==========================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const addressText = document.getElementById('preview-address-text');
    
    const addressMap = {
        'notes': 'global-notes://workspace/notes',
        'code': 'global-notes://workspace/developer-ide',
        'student': 'global-notes://workspace/student-hub'
    };

    const switchTab = (tabName) => {
        // Switch active button state
        tabButtons.forEach(b => {
            if (b.getAttribute('data-tab') === tabName) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        // Switch active content panel
        tabPanels.forEach(panel => {
            if (panel.id === `panel-${tabName}`) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        // Update browser mock URL address bar
        if (addressText && addressMap[tabName]) {
            addressText.textContent = addressMap[tabName];
        }
    };

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    // ==========================================
    // 3. DUAL-ENGINE HERO STATE SWITCHER
    // ==========================================
    const engineButtons = document.querySelectorAll('.engine-toggle-btn');
    const heroTitle = document.getElementById('hero-interactive-title');
    const heroDesc = document.getElementById('hero-interactive-desc');
    const primaryCta = document.getElementById('hero-primary-cta');
    const secondaryCta = document.getElementById('hero-secondary-cta');

    const animateInteractiveTitle = (text) => {
        if (!heroTitle) return;
        heroTitle.classList.add('exit-animation');
        
        setTimeout(() => {
            heroTitle.textContent = text;
            heroTitle.classList.remove('exit-animation');
            heroTitle.classList.add('entry-animation');
            
            setTimeout(() => {
                heroTitle.classList.remove('entry-animation');
            }, 350);
        }, 200);
    };

    engineButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetEngine = btn.getAttribute('data-engine');
            
            // Switch active toggle button
            engineButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

             if (targetEngine === 'developer') {
                // Developer Mode Active
                document.body.classList.remove('student-engine-active');
                
                animateInteractiveTitle('Synergy.');
                
                if (heroDesc) {
                    heroDesc.textContent = 'An offline-first, client-side workstation integrating compressed markdown document storage, an AI-powered coding snippet notebook, and a student study hub.';
                }
                if (primaryCta) {
                    const span = primaryCta.querySelector('span');
                    if (span) span.textContent = 'Open Notes Workspace';
                    else primaryCta.textContent = 'Open Notes Workspace';
                    primaryCta.setAttribute('href', 'app.html?guest=true');
                }
                if (secondaryCta) {
                    const span = secondaryCta.querySelector('span');
                    if (span) span.textContent = 'Launch Code Workspace';
                    else secondaryCta.textContent = 'Launch Code Workspace';
                    secondaryCta.setAttribute('href', 'HTML/code-workspace.html');
                }
                
                // Auto-switch preview tab
                switchTab('code');
                
            } else if (targetEngine === 'student') {
                // Student Mode Active
                document.body.classList.add('student-engine-active');
                
                animateInteractiveTitle('Harmony.');
                
                if (heroDesc) {
                    heroDesc.textContent = 'Activate Student Mode to streamline your academic workflow. Generate interactive revision cards, plan day-by-day exam schedules, and build diagram outlines using the built-in AI Study Hub.';
                }
                if (primaryCta) {
                    const span = primaryCta.querySelector('span');
                    if (span) span.textContent = 'Launch Student Hub';
                    else primaryCta.textContent = 'Launch Student Hub';
                    primaryCta.setAttribute('href', 'HTML/student-hub.html');
                }
                if (secondaryCta) {
                    const span = secondaryCta.querySelector('span');
                    if (span) span.textContent = 'Open Notes Workspace';
                    else secondaryCta.textContent = 'Open Notes Workspace';
                    secondaryCta.setAttribute('href', 'app.html?guest=true');
                }

                // Auto-switch preview tab
                switchTab('student');
            }

            // Restart SVG hand-drawn circle path animation
            const svgCircle = document.querySelector('.hand-drawn-circle');
            if (svgCircle) {
                svgCircle.style.animation = 'none';
                svgCircle.offsetHeight; // force reflow
                svgCircle.style.animation = 'drawCircle 1.6s cubic-bezier(0.4, 0, 0.2, 1) forwards';
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
    // 5. INTERACTIVE TERMINAL AI CODE EXPLAINER
    // ==========================================
    const btnRunCode = document.getElementById('btn-run-code');
    const terminalOutput = document.getElementById('terminal-output');

    if (btnRunCode && terminalOutput) {
        btnRunCode.addEventListener('click', () => {
            btnRunCode.disabled = true;
            btnRunCode.textContent = 'Thinking...';
            terminalOutput.innerHTML = '<div class="log-line">✦ Calling Gemini AI for code analysis...</div>';
            
            setTimeout(() => {
                terminalOutput.innerHTML += '<div class="log-line success">✦ Analyzing syntax tree structure and indentation...</div>';
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }, 300);

            setTimeout(() => {
                terminalOutput.innerHTML += '<div class="log-line">✦ Generating code explanation report...</div>';
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }, 800);

            setTimeout(() => {
                terminalOutput.innerHTML += `
                    <div class="log-line success" style="margin-top: 8px;"><strong>Gemini Code Explanation:</strong></div>
                    <div class="log-line" style="color: #52525B; font-size: 0.75rem; margin-top: 4px;">
                      This script imports an AI utility and defines an asynchronous function <code>optimizeBrain(notes)</code> to generate structured summaries. It evaluates in linear O(N) time.
                    </div>
                `;
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
                btnRunCode.disabled = false;
                btnRunCode.textContent = '✦ Explain Code';
            }, 1400);
        });
    }

    // ==========================================
    // 8. ADVANCED 3D MOUSE PARALLAX TILT WITH SHADOWS
    // ==========================================
    const previewFrame = document.getElementById('interactive-preview-frame');
    if (previewFrame) {
        document.querySelector('.preview-section').addEventListener('mousemove', (e) => {
            const rect = previewFrame.getBoundingClientRect();
            const frameX = rect.left + rect.width / 2;
            const frameY = rect.top + rect.height / 2;
            
            // Calculate distance from center in range [-1, 1]
            const tiltX = (e.clientX - frameX) / (window.innerWidth / 2);
            const tiltY = (e.clientY - frameY) / (window.innerHeight / 2);
            
            // Apply subtle tilt rotation (max 6 deg)
            const rotateX = (-tiltY * 6).toFixed(2);
            const rotateY = (tiltX * 6).toFixed(2);
            
            // Dynamic shadow offsets opposite to tilt
            const shadowX = (-tiltX * 24).toFixed(1);
            const shadowY = (-tiltY * 24).toFixed(1);
            const shadowBlur = (35 + Math.abs(tiltX * 10) + Math.abs(tiltY * 10)).toFixed(1);
            
            previewFrame.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            previewFrame.style.boxShadow = `${shadowX}px ${shadowY}px ${shadowBlur}px rgba(9, 9, 11, 0.08), 0 40px 100px rgba(9, 9, 11, 0.06)`;
        });

        document.querySelector('.preview-section').addEventListener('mouseleave', () => {
            previewFrame.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            previewFrame.style.boxShadow = '0 40px 100px rgba(9, 9, 11, 0.06)';
            previewFrame.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease';
        });

        previewFrame.addEventListener('mouseenter', () => {
            previewFrame.style.transition = 'none'; // Instant response on hover start
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
        const revealSelectors = '.features-grid > *, .spotlight-section .scroll-reveal-left, .spotlight-section .scroll-reveal-right, .interactive-preview-frame';
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
});
