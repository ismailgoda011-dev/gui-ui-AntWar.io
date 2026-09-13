// Central performance policy for the AntWar GUI.
const STORAGE_KEY = 'antwar.gui.performance.v1';

const MODES = Object.freeze({
  high: { particles: true, parallax: true, blur: true, motion: true },
  medium: { particles: true, parallax: false, blur: true, motion: true },
  low: { particles: false, parallax: false, blur: false, motion: false }
});

function detectMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== 'auto' && MODES[saved]) return saved;
  } catch {}
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'low';
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  return memory <= 2 || cores <= 2 ? 'low' : memory <= 4 || cores <= 4 ? 'medium' : 'high';
}

let mode = detectMode();
let rafId = 0;

function apply() {
  const policy = MODES[mode];
  document.documentElement.dataset.performance = mode;
  document.documentElement.classList.toggle('reduced-motion', policy.motion === false);
  window.dispatchEvent(new CustomEvent('antwar:performancechange', { detail: { mode, policy } }));
}

export function getPerformanceMode() { return mode; }
export function getPerformancePolicy() { return MODES[mode]; }
export function setPerformanceMode(next = 'auto') {
  mode = next === 'auto' ? detectMode() : (MODES[next] ? next : detectMode());
  try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  apply();
  return mode;
}

export function rafThrottle(callback) {
  return (...args) => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      callback(...args);
    });
  };
}

export function initPerformanceManager() {
  apply();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && rafId) cancelAnimationFrame(rafId);
  }, { passive: true });
  return { getMode: getPerformanceMode, getPolicy: getPerformancePolicy, setMode: setPerformanceMode };
}
