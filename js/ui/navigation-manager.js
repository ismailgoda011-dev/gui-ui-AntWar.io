import { setState } from '../core/game-state.js';

export class NavigationManager {
  constructor() { this.activePage = null; }

  async open(pageName, render) {
    if (!pageName) return false;
    if (this.activePage === pageName) return this.close(pageName);
    const next = document.getElementById(`fullpage-${pageName}`);
    if (!next) return false;
    if (this.activePage) {
      const previous = document.getElementById(`fullpage-${this.activePage}`);
      previous?.classList.remove('active');
      previous?.setAttribute('aria-hidden', 'true');
    }
    if (typeof render === 'function') await render(pageName, next);
    next.classList.add('active');
    next.setAttribute('aria-hidden', 'false');
    document.body.classList.add('fullpage-open');
    this.activePage = pageName;
    setState('ui.page', pageName);
    return true;
  }

  close(pageName = this.activePage) {
    if (!pageName) return false;
    document.getElementById(`fullpage-${pageName}`)?.classList.remove('active');
    document.getElementById(`fullpage-${pageName}`)?.setAttribute('aria-hidden', 'true');
    if (this.activePage === pageName) this.activePage = null;
    if (!this.activePage) document.body.classList.remove('fullpage-open');
    setState('ui.page', this.activePage || 'home');
    return true;
  }

  closeAll() {
    document.querySelectorAll('.full-page-view.active').forEach(el => {
      el.classList.remove('active');
      el.setAttribute('aria-hidden', 'true');
    });
    this.activePage = null;
    document.body.classList.remove('fullpage-open');
    setState('ui.page', 'home');
  }
}
