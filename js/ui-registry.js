// =======================================================
// ui-registry.js — validated, data-driven GUI registry
// =======================================================

import { t } from './i18n.js';

let registry = null;
const REQUIRED_ARRAYS = ['headerNav', 'events', 'bottomNav', 'serverOptions'];

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));

export function asset(file) {
  if (!file) return '';
  const value = String(file);
  if (/^(?:https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/') || value.startsWith('./img/')) return value;
  return `img/${value}`;
}

function validateRegistry(data) {
  if (!data || typeof data !== 'object') throw new Error('UI registry must be an object');
  for (const key of REQUIRED_ARRAYS) if (data[key] != null && !Array.isArray(data[key])) throw new Error(`UI registry field "${key}" must be an array`);
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
  const label = getLabel(item, item.id);
  const title = item.titleKey ? t(item.titleKey) : label;
  const icon = asset(item.icon);
  const safeId = escapeHTML(item.id);
  const badge = item.badge ? `<span id="${escapeHTML(item.badge.id)}" class="${escapeHTML(item.badge.className || 'absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center border border-white shadow-lg pointer-events-none')}">${escapeHTML(item.badge.value ?? '')}</span>` : '';
  const levelTag = item.levelTag ? `<span id="${escapeHTML(item.levelTag.id)}" class="${escapeHTML(item.levelTag.className || 'absolute -bottom-0.5 -right-1 text-[8px] bg-yellow-400 text-black px-1 rounded font-black border border-black/40 shadow')}">${escapeHTML(item.levelTag.value ?? '')}</span>` : '';
  const iconWrapClass = ['rpg-btn-icon-wrap', item.iconWrapperClass || '', active ? 'active' : ''].join(' ').trim();
  return `<button id="${safeId}" class="${escapeHTML(buttonClass)}" data-ui-action="${escapeHTML(item.action || item.modal || '')}" aria-label="${escapeHTML(label)}" title="${escapeHTML(title)}" type="button"><div class="${escapeHTML(iconWrapClass)}"><img id="${escapeHTML(item.iconId || `${item.id}-icon`)}" src="${escapeHTML(icon)}" alt="${escapeHTML(label)}" class="${escapeHTML(iconClass)} ${escapeHTML(item.iconClass || '')}">${badge}${levelTag}</div><span id="${escapeHTML(item.labelId || `${item.id}-label`)}" class="${escapeHTML(labelClass)}">${escapeHTML(label)}</span></button>`;
}

export function renderHeaderDock(container) {
  if (!container || !registry) return;
  const items = [...(registry.headerNav || []), ...(registry.events || [])];
  container.innerHTML = items.map(item => renderIconButton(item, { iconClass: item.size === 'large' ? 'w-[clamp(32px,3.8vw,46px)] h-[clamp(32px,3.8vw,46px)] drop-shadow' : 'w-[clamp(32px,3.8vw,44px)] h-[clamp(32px,3.8vw,44px)] drop-shadow' })).join('');
}

export function renderBottomNav(container) {
  if (!container || !registry) return;
  container.innerHTML = (registry.bottomNav || []).map((item, index) => `<button class="bnav-item ${index === 0 ? 'active' : ''}" id="${escapeHTML(item.id)}" data-action="${escapeHTML(item.action || '')}" data-label-key="${escapeHTML(item.labelKey || '')}" type="button" aria-label="${escapeHTML(getLabel(item, item.id))}"><div class="bnav-icon-wrap"><img src="${escapeHTML(asset(item.icon))}" alt="${escapeHTML(getLabel(item, item.id))}" class="${escapeHTML(item.iconClass || '')}"></div><span class="bnav-label">${escapeHTML(getLabel(item, item.id))}</span></button>`).join('');
}

export function renderServerOptions(container) {
  if (!container || !registry) return;
  const servers = registry.serverOptions || [];
  container.innerHTML = servers.map(server => `<button type="button" class="server-option-btn w-full px-1.5 py-1 rounded flex items-center justify-between transition text-right cursor-pointer" data-server-id="${escapeHTML(server.id)}" data-ping="${escapeHTML(server.ping)}" data-status="${escapeHTML(server.status)}"><span class="text-[10px] font-bold text-white flex items-center gap-1">${escapeHTML(server.flag || '')} ${escapeHTML(t(server.nameKey))}</span><span class="text-[9px] font-black ${server.status === 'emerald' ? 'text-[#37AA49]' : 'text-[#FFD875]'}">${escapeHTML(server.ping)}</span></button>`).join('');
  return servers;
}

export function getDailyRewards() { return (registry?.dailyRewards || []).map(item => ({ ...item })); }
export function getDailyQuests(type='daily') { return (registry?.dailyQuests?.[type] || []).map(item => ({ ...item })); }
export function getPassTabs() { return (registry?.royalPass?.tabs || []).map(item => ({ ...item })); }
