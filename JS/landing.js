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

    // 4. Mobile Menu Toggle (Basic)
    const menuToggle = document.getElementById('menu-toggle');
    const navButtons = document.querySelector('.nav-links'); // For mobile this could be expanded
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            // This is a placeholder for a real mobile drawer
            // Given the requirements, we'll keep it simple or expand later
            console.log('Mobile menu clicked');
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
});
