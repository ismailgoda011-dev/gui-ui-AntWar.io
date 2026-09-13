// Backward-compatible facade. New code should use performance-manager.js.
import { getPerformanceMode, getPerformancePolicy, setPerformanceMode, rafThrottle, initPerformanceManager } from './performance-manager.js';

let frame = 0;
let raf = 0;

export { getPerformanceMode, getPerformancePolicy, rafThrottle };
export function applyPerformanceMode(mode = 'auto') { return setPerformanceMode(mode); }
export function shouldAnimate() { return !document.hidden && getPerformancePolicy().motion; }
export function startFrameBudget(callback) {
  stopFrameBudget();
  const tick = time => {
    if (shouldAnimate()) callback(time, frame++);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
export function stopFrameBudget() { if (raf) cancelAnimationFrame(raf); raf = 0; }
export { initPerformanceManager };
