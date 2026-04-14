// Noted Landing Page Interactivity

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sticky Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Intersection Observer for Reveal Animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Unobserve after animating
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Staggered Fade Up for Hero
    const animateUpElements = document.querySelectorAll('.animate-up');
    animateUpElements.forEach((el, index) => {
        // Set staggered delay
        el.style.animationDelay = `${index * 0.1}s`;
        revealObserver.observe(el);
    });

    // Reveal other elements as they enter viewport
    const revealElements = document.querySelectorAll('.feature-card, .who-card, .how-step, .browser-frame');
    revealElements.forEach((el, index) => {
        el.classList.add('animate-up'); // Re-use the class for consistency
        // Subtle stagger for grids
        el.style.animationDelay = `${(index % 3) * 0.05}s`;
        revealObserver.observe(el);
    });

    // 3. Smooth Scroll for Nav Links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const navHeight = navbar.offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - navHeight - 20;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 4. Mobile Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navLinksContainer = document.querySelector('.nav-links');
    
    if (menuToggle && navLinksContainer) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinksContainer.classList.toggle('mobile-active');
            
            // Prevent body scroll when menu is open
            if (navLinksContainer.classList.contains('mobile-active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        // Close menu when a link is clicked
        navLinksContainer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinksContainer.classList.remove('mobile-active');
                document.body.style.overflow = '';
            });
        });
    }

    // 5. Parallax/Hover Depth for Screenshots
    // The CSS hover-lift handles the main lift, but we can add mouse tracking for premium feel
    const screenshotSection = document.querySelector('.screenshots');
    if (screenshotSection) {
        screenshotSection.addEventListener('mousemove', (e) => {
            const frames = document.querySelectorAll('.browser-frame');
            const x = (window.innerWidth / 2 - e.pageX) / 50;
            const y = (window.innerHeight / 2 - e.pageY) / 50;
            
            frames.forEach((frame, index) => {
                const multiplier = index === 0 ? 1 : -1;
                // Add subtle tilt logic if requested, else keep simple
            });
        });
    }
    // 6. Footer Information Modal Logic
    const footerData = {
        'Security': {
            title: 'Security at Noted',
            content: `
                <p>We take your data security seriously. Noted is built with a focus on privacy and reliability.</p>
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
            title: 'About Noted',
            content: `
                <p>Noted was born from a simple desire: to create a workspace that is as fast as your thoughts and as elegant as your ideas.</p>
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
                <p>By using Noted, you agree to treat the service and its community with respect.</p>
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

    if (modal) {
        // Open modal logic
        const footerLinks = document.querySelectorAll('.footer-col ul li a');
        footerLinks.forEach(link => {
            const text = link.textContent.trim();
            if (footerData[text]) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    modalTitle.textContent = footerData[text].title;
                    modalText.innerHTML = footerData[text].content;
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                });
            }
        });

        // Close modal logic
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
