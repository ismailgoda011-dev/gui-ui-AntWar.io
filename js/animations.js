// AntWar animation helpers with reduced-motion and performance awareness.
function motionDisabled() {
  return document.documentElement.classList.contains('reduced-motion') || document.documentElement.dataset.performance === 'low';
}

function finish(el, callback) { if (el) el.style.willChange = ''; callback?.(); }

export function animateModalOpen(containerEl) {
  if (!containerEl) return;
  if (motionDisabled()) { containerEl.classList.add('modal-opening'); return; }
  if (window.gsap) {
    containerEl.style.willChange = 'transform, opacity';
    window.gsap.fromTo(containerEl, { scale: 0.94, opacity: 0, y: 18 }, { scale: 1, opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', onComplete: () => finish(containerEl) });
  } else containerEl.classList.add('modal-opening');
}

export function animateModalClose(containerEl, onComplete) {
  if (!containerEl) return onComplete?.();
  if (motionDisabled()) { finish(containerEl, onComplete); return; }
  if (window.gsap) {
    containerEl.style.willChange = 'transform, opacity';
    window.gsap.to(containerEl, { scale: 0.98, opacity: 0, y: 12, duration: 0.18, ease: 'power1.in', onComplete: () => finish(containerEl, onComplete) });
  } else onComplete?.();
}

export function createRipple(event, element) {
  if (!element || motionDisabled()) return;
  const rect = element.getBoundingClientRect();
  const x = (event.clientX || rect.left + rect.width / 2) - rect.left;
  const y = (event.clientY || rect.top + rect.height / 2) - rect.top;
  const ripple = document.createElement('span');
  ripple.className = 'anim-ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  element.appendChild(ripple);
  window.setTimeout(() => ripple.remove(), 400);
}

export function animatePageIn(pageEl) {
  if (!pageEl) return;
  pageEl.classList.add('active');
  if (motionDisabled()) return;
  window.gsap?.fromTo(pageEl, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' });
}

export function animatePageOut(pageEl, onComplete) {
  if (!pageEl) return onComplete?.();
  if (motionDisabled() || !window.gsap) { pageEl.classList.remove('active'); return onComplete?.(); }
  window.gsap.to(pageEl, { opacity: 0, y: 8, duration: 0.16, ease: 'power1.in', onComplete: () => { pageEl.classList.remove('active'); onComplete?.(); } });
}
