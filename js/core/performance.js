// Backward-compatible performance facade.
// New code should use performance-manager.js directly.
import { getPerformanceMode, getPerformancePolicy, setPerformanceMode, rafThrottle, initPerformanceManager } from './performance-manager.js';

let frame = 0;
let raf = 0;
let running = false;

export { getPerformanceMode, getPerformancePolicy, rafThrottle };
export function applyPerformanceMode(mode = 'auto') { return setPerformanceMode(mode); }
export function shouldAnimate() { return !document.hidden && getPerformancePolicy().motion; }

export function startFrameBudget(callback) {
  stopFrameBudget();
  if (typeof callback !== 'function') return;
  running = true;
  const tick = time => {
    if (!running) return;
    if (shouldAnimate()) callback(time, frame++);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

export function stopFrameBudget() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

export function pauseFrameBudget() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

export function resumeFrameBudget(callback) {
  if (running) startFrameBudget(callback);
}

export { initPerformanceManager };
