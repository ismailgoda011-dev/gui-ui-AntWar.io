// AntWar animation helpers with reduced-motion and performance awareness.
const motionDisabled = () => document.documentElement.classList.contains('reduced-motion') || document.documentElement.dataset.performance === 'low' || document.visibilityState === 'hidden';
const gsapReady = () => !motionDisabled() && window.gsap;
function finish(el, callback) { if (el) el.style.willChange = ''; callback?.(); }

export function animateModalOpen(containerEl) {
  if (!containerEl) return;
  const gsap = gsapReady();
  if (!gsap) { containerEl.classList.add('modal-opening'); return; }
  gsap.killTweensOf(containerEl);
  containerEl.style.willChange = 'transform, opacity';
  gsap.fromTo(containerEl, { scale: 0.94, opacity: 0, y: 18 }, { scale: 1, opacity: 1, y: 0, duration: 0.26, ease: 'power2.out', overwrite: true, onComplete: () => finish(containerEl) });
}

export function animateModalClose(containerEl, onComplete) {
  if (!containerEl) return onComplete?.();
  const gsap = gsapReady();
  if (!gsap) { finish(containerEl, onComplete); return; }
  gsap.killTweensOf(containerEl);
  containerEl.style.willChange = 'transform, opacity';
  gsap.to(containerEl, { scale: 0.98, opacity: 0, y: 10, duration: 0.16, ease: 'power1.in', overwrite: true, onComplete: () => finish(containerEl, onComplete) });
}

export function createRipple(event, element) {
  if (!element || motionDisabled()) return;
  const rect = element.getBoundingClientRect();
  const x = (event?.clientX ?? rect.left + rect.width / 2) - rect.left;
  const y = (event?.clientY ?? rect.top + rect.height / 2) - rect.top;
  const ripple = document.createElement('span');
  ripple.className = 'anim-ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  element.append(ripple);
  window.setTimeout(() => ripple.remove(), 400);
}

export function animatePageIn(pageEl) {
  if (!pageEl) return;
  pageEl.classList.add('active');
  const gsap = gsapReady();
  if (!gsap) return;
  gsap.killTweensOf(pageEl);
  gsap.fromTo(pageEl, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', overwrite: true });
}

export function animatePageOut(pageEl, onComplete) {
  if (!pageEl) return onComplete?.();
  const gsap = gsapReady();
  if (!gsap) { pageEl.classList.remove('active'); return onComplete?.(); }
  gsap.killTweensOf(pageEl);
  gsap.to(pageEl, { opacity: 0, y: 8, duration: 0.15, ease: 'power1.in', overwrite: true, onComplete: () => { pageEl.classList.remove('active'); onComplete?.(); } });
}

export function cancelAnimation(element) {
  if (window.gsap && element) window.gsap.killTweensOf(element);
}
