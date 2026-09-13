// =======================================================
// ui-registry.js — validated, data-driven GUI registry
// =======================================================

import { t } from './i18n.js';
import { clear, el, safeAssetUrl } from './core/dom.js';

let registry = null;
const REQUIRED_ARRAYS = ['headerNav', 'events', 'bottomNav', 'serverOptions'];

export function asset(file) {
  if (!file) return '';
  const value = String(file).trim();
  if (/^(?:https?:)?\/\//i.test(value)) return safeAssetUrl(value);
  if (value.startsWith('data:') || value.startsWith('javascript:')) return '';
  if (value.startsWith('/') || value.startsWith('./img/')) return value;
  return `img/${value}`;
}

function validateRegistry(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('UI registry must be an object');
  for (const key of REQUIRED_ARRAYS) {
    if (data[key] != null && !Array.isArray(data[key])) throw new Error(`UI registry field "${key}" must be an array`);
  }
  return data;
}

export async function loadUIRegistry() {
  if (registry) return registry;
  const response = await fetch('data/nav-items.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Failed to load UI registry: ${response.status}`);
  registry = validateRegistry(await response.json());
  return registry;
}

export function getUIRegistry() { return registry; }
export function getLabel(item, fallback = '') { return item?.labelKey ? t(item.labelKey) : (item?.titleKey ? t(item.titleKey) : fallback); }

export function renderIconButton(item, options = {}) {
  const { buttonClass='rpg-unified-btn group', iconClass='w-[clamp(32px,3.8vw,44px)] h-[clamp(32px,3.8vw,44px)] drop-shadow', labelClass='rpg-btn-label', active=false } = options;
  const label = getLabel(item, item?.id || '');
  const title = item?.titleKey ? t(item.titleKey) : label;
  const wrap = el('div', { className: ['rpg-btn-icon-wrap', item?.iconWrapperClass || '', active ? 'active' : ''].join(' ').trim() });
  wrap.append(el('img', { className: `${iconClass} ${item?.iconClass || ''}`.trim(), attrs: { id: item?.iconId || `${item?.id || 'ui'}-icon`, src: asset(item?.icon), alt: label, loading: 'lazy', decoding: 'async' } }));
  if (item?.badge?.id) wrap.append(el('span', { className: item.badge.className || 'absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center border border-white shadow-lg pointer-events-none', text: item.badge.value ?? '', attrs: { id: item.badge.id } }));
  if (item?.levelTag?.id) wrap.append(el('span', { className: item.levelTag.className || 'absolute -bottom-0.5 -right-1 text-[8px] bg-yellow-400 text-black px-1 rounded font-black border border-black/40 shadow', text: item.levelTag.value ?? '', attrs: { id: item.levelTag.id } }));
  return el('button', { className: buttonClass, attrs: { id: item?.id || '', 'data-ui-action': item?.action || item?.modal || '', 'aria-label': label, title, type: 'button' }, children: [wrap, el('span', { className: labelClass, text: label, attrs: { id: item?.labelId || `${item?.id || 'ui'}-label` } })] });
}

export function renderHeaderDock(container) {
  if (!container || !registry) return;
  clear(container);
  for (const item of [...(registry.headerNav || []), ...(registry.events || [])]) container.append(renderIconButton(item, { iconClass: item.size === 'large' ? 'w-[clamp(32px,3.8vw,46px)] h-[clamp(32px,3.8vw,46px)] drop-shadow' : 'w-[clamp(32px,3.8vw,44px)] h-[clamp(32px,3.8vw,44px)] drop-shadow' }));
}

export function renderBottomNav(container) {
  if (!container || !registry) return;
  clear(container);
  (registry.bottomNav || []).forEach((item, index) => {
    const label = getLabel(item, item.id);
    const iconWrap = el('div', { className: 'bnav-icon-wrap', children: [el('img', { className: item.iconClass || '', attrs: { src: asset(item.icon), alt: label, loading: 'lazy', decoding: 'async' } })] });
    container.append(el('button', { className: `bnav-item ${index === 0 ? 'active' : ''}`, attrs: { id: item.id, 'data-action': item.action || '', 'data-label-key': item.labelKey || '', 'aria-label': label, type: 'button' }, children: [iconWrap, el('span', { className: 'bnav-label', text: label })] }));
  });
}

export function renderServerOptions(container) {
  if (!container || !registry) return [];
  clear(container);
  const servers = registry.serverOptions || [];
  servers.forEach(server => {
    const label = `${server.flag || ''} ${server.nameKey ? t(server.nameKey) : server.id || ''}`.trim();
    container.append(el('button', { className: 'server-option-btn w-full px-1.5 py-1 rounded flex items-center justify-between transition text-right cursor-pointer', attrs: { 'data-server-id': server.id || '', 'data-ping': server.ping ?? '', 'data-status': server.status || '', type: 'button' }, children: [el('span', { className: 'text-[10px] font-bold text-white flex items-center gap-1', text: label }), el('span', { className: `text-[9px] font-black ${server.status === 'emerald' ? 'text-[#37AA49]' : 'text-[#FFD875]'}`, text: server.ping ?? '—' })] }));
  });
  return servers;
}

export function getDailyRewards() { return (registry?.dailyRewards || []).map(item => ({ ...item })); }
export function getDailyQuests(type='daily') { return (registry?.dailyQuests?.[type] || []).map(item => ({ ...item })); }
export function getPassTabs() { return (registry?.royalPass?.tabs || []).map(item => ({ ...item })); }
