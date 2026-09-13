import { el } from '../core/dom.js';

const ICONS = Object.freeze({
  success: '✓',
  error: '!',
  alert: '!',
  info: 'i'
});

export class ToastManager {
  constructor(container = document.getElementById('toast-container')) { this.container = container; }
  show(message, type = 'info', duration = 2500) {
    if (!this.container) return null;
    const toast = el('div', { className: `rpg-toast toast-${type}`, attrs: { role: 'status', 'aria-live': 'polite' } });
    const icon = el('span', { className: 'toast-icon', text: ICONS[type] || '' });
    const text = el('span', { className: 'toast-message', text: message });
    toast.append(icon, text);
    this.container.append(toast);
    const timer = window.setTimeout(() => {
      toast.classList.add('toast-fadeout');
      window.setTimeout(() => toast.remove(), 300);
    }, duration);
    toast.addEventListener('remove', () => clearTimeout(timer), { once: true });
    return toast;
  }
}
