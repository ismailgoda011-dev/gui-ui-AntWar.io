// =======================================================
// performance.js — adaptive visual-effects budget
// =======================================================

let mode = 'auto';
let frame = 0;
let raf = 0;

export function getPerformanceMode() { return mode; }

export function applyPerformanceMode(next = 'auto') {
    mode = ['auto', 'high', 'low', 'off'].includes(next) ? next : 'auto';
    document.documentElement.dataset.performance = mode;
    const low = mode === 'low' || mode === 'off';
    document.documentElement.classList.toggle('reduce-effects', low);
    const canvas = document.getElementById('ambient-particles-canvas');
    if (canvas) canvas.style.display = mode === 'off' ? 'none' : '';
    if (mode === 'off') stopFrameBudget();
    return mode;
}

export function shouldAnimate() {
    return mode !== 'off' && !document.hidden;
}

export function startFrameBudget(callback) {
    stopFrameBudget();
    const tick = time => {
        if (shouldAnimate()) callback(time, frame++);
        raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
}

export function stopFrameBudget() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
}
