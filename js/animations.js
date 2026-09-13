// =======================================================
// animations.js — GSAP Micro-interactions & Transitions
// AntWar RPG
// =======================================================

/**
 * Animate modal entrance using GSAP
 */
export function animateModalOpen(containerEl) {
    if (!containerEl) return;
    if (window.gsap) {
        window.gsap.fromTo(containerEl, 
            { scale: 0.75, opacity: 0, y: 35 },
            { scale: 1, opacity: 1, y: 0, duration: 0.38, ease: 'back.out(1.6)' }
        );
    } else {
        containerEl.classList.add('modal-opening');
    }
}

/**
 * Animate modal exit using GSAP
 */
export function animateModalClose(containerEl, onComplete) {
    if (!containerEl) {
        if (onComplete) onComplete();
        return;
    }
    if (window.gsap) {
        window.gsap.to(containerEl, {
            scale: 0.8,
            opacity: 0,
            y: 25,
            duration: 0.25,
            ease: 'power2.in',
            onComplete
        });
    } else {
        if (onComplete) onComplete();
    }
}

/**
 * Create a tactile click ripple
 */
export function createRipple(event, element) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX || (event.touches && event.touches[0].clientX) || (rect.left + rect.width / 2)) - rect.left;
    const y = (event.clientY || (event.touches && event.touches[0].clientY) || (rect.top + rect.height / 2)) - rect.top;

    const ripple = document.createElement('span');
    ripple.className = 'anim-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    element.appendChild(ripple);
    setTimeout(() => {
        ripple.remove();
    }, 500);
}

/**
 * Animate full page entrance
 */
export function animatePageIn(pageEl) {
    if (!pageEl) return;
    pageEl.classList.add('active');
    if (window.gsap) {
        window.gsap.fromTo(pageEl,
            { opacity: 0, scale: 0.95, y: 20 },
            { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power2.out' }
        );
    }
}

/**
 * Animate full page exit
 */
export function animatePageOut(pageEl, onComplete) {
    if (!pageEl) {
        if (onComplete) onComplete();
        return;
    }
    if (window.gsap) {
        window.gsap.to(pageEl, {
            opacity: 0,
            scale: 0.96,
            y: 15,
            duration: 0.25,
            ease: 'power2.in',
            onComplete: () => {
                pageEl.classList.remove('active');
                if (onComplete) onComplete();
            }
        });
    } else {
        pageEl.classList.remove('active');
        if (onComplete) onComplete();
    }
}
