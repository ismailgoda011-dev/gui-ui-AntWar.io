import { setLanguage } from '../i18n.js';

window.addEventListener('antwar:ux:set-language', event => {
  const code = event.detail;
  if (code) setLanguage(code);
});

window.addEventListener('languageChanged', () => {
  const ui = window.ANTWAR_PREMIUM_UI;
  const active = document.querySelector('.antwar-ux-overlay')?.dataset.kind;
  if (!ui || !active) return;
  if (active === 'chat') ui.openChat();
  else if (active === 'room') ui.openRoom();
  else if (active === 'settings') ui.openSettings();
});

window.addEventListener('antwar:room:create', event => {
  window.dispatchEvent(new CustomEvent('antwar:room:changed', { detail: event.detail }));
});

window.addEventListener('antwar:room:ready', event => {
  window.dispatchEvent(new CustomEvent('antwar:room:changed', { detail: { ready: true, source: event.detail } }));
});

window.addEventListener('antwar:room:start', event => {
  window.dispatchEvent(new CustomEvent('antwar:room:start-requested', { detail: event.detail }));
});

window.addEventListener('antwar:chat:send', event => {
  // Real engine/WebSocket bridge can subscribe to this stable event later.
  window.ANTWAR_CHAT_LAST_EVENT = event.detail;
});
