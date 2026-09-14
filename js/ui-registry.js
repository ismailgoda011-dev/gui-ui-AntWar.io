// =======================================================
// ui-registry.js — Data-driven GUI registry
// All navigational/event UI definitions live in data/nav-items.json.
// =======================================================

import './visual-assets.js';
import { t } from './i18n.js';

let registry = null;

export function asset(file) {
    if (!file) return '';
    if (/^(?:https?:)?\/\//i.test(file) || file.startsWith('data:') || file.startsWith('/') || file.startsWith('./img/')) return file;
    return `img/${file}`;
}

export async function loadUIRegistry() {
    if (registry) return registry;
    const response = await fetch('data/nav-items.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Failed to load UI registry: ${response.status}`);
    registry = await response.json();
    return registry;
}

export function getUIRegistry() {
    return registry;
}

export function getLabel(item, fallback = '') {
    return item?.labelKey ? t(item.labelKey) : (item?.titleKey ? t(item.titleKey) : fallback);
}

export function renderIconButton(item, options = {}) {
    const {
        buttonClass = 'rpg-unified-btn group',
        iconClass = 'w-[clamp(32px,3.8vw,44px)] h-[clamp(32px,3.8vw,44px)] drop-shadow',
        labelClass = 'rpg-btn-label',
        active = false
    } = options;

    const label = getLabel(item, item.id);
    const title = item.titleKey ? t(item.titleKey) : label;
    const icon = asset(item.icon);
    const badge = item.badge ? `<span id="${item.badge.id}" class="${item.badge.className || 'absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center border border-white shadow-lg animate-bounce pointer-events-none'}">${item.badge.value ?? ''}</span>` : '';
    const levelTag = item.levelTag ? `<span id="${item.levelTag.id}" class="${item.levelTag.className || 'absolute -bottom-0.5 -right-1 text-[8px] bg-yellow-400 text-black px-1 rounded font-black border border-black/40 shadow'}">${item.levelTag.value ?? ''}</span>` : '';
    const iconWrapClass = ['rpg-btn-icon-wrap', item.iconWrapperClass || '', active ? 'active' : ''].join(' ').trim();
    const iconExtra = item.iconClass || '';

    return `<button id="${item.id}" class="${buttonClass}" data-ui-action="${item.action || item.modal || ''}" aria-label="${label}" title="${title}" type="button">
        <div class="${iconWrapClass}">
            <img id="${item.iconId || `${item.id}-icon`}" src="${icon}" alt="${label}" class="${iconClass} ${iconExtra}">
            ${badge}${levelTag}
        </div>
        <span id="${item.labelId || `${item.id}-label`}" class="${labelClass}">${label}</span>
    </button>`;
}

export function renderHeaderDock(container) {
    if (!container || !registry) return;
    const items = [...(registry.headerNav || []), ...(registry.events || [])];
    container.innerHTML = items.map(item => renderIconButton(item, {
        iconClass: item.size === 'large'
            ? 'w-[clamp(32px,3.8vw,46px)] h-[clamp(32px,3.8vw,46px)] drop-shadow'
            : 'w-[clamp(32px,3.8vw,44px)] h-[clamp(32px,3.8vw,44px)] drop-shadow',
        iconExtra: item.iconClass || ''
    })).join('');
}

export function renderBottomNav(container) {
    if (!container || !registry) return;
    container.innerHTML = (registry.bottomNav || []).map((item, index) => `
        <button class="bnav-item ${index === 0 ? 'active' : ''}" id="${item.id}" data-action="${item.action || ''}" data-label-key="${item.labelKey || ''}" type="button" aria-label="${getLabel(item, item.id)}">
            <div class="bnav-icon-wrap"><img src="${asset(item.icon)}" alt="${getLabel(item, item.id)}" class="${item.iconClass || ''}"></div>
            <span class="bnav-label">${getLabel(item, item.id)}</span>
        </button>`).join('');
}

export function renderServerOptions(container) {
    if (!container || !registry) return;
    const servers = registry.serverOptions || [];
    container.innerHTML = servers.map((server, index) => `
        <button type="button" class="server-option-btn w-full px-1.5 py-1 rounded flex items-center justify-between hover:c-bg-burgundy transition text-right cursor-pointer" data-server-id="${server.id}" data-ping="${server.ping}" data-status="${server.status}">
            <span class="text-[10px] font-bold text-white flex items-center gap-1">${server.flag || ''} ${t(server.nameKey)}</span>
            <span class="text-[9px] font-black ${server.status === 'emerald' ? 'text-[#37AA49]' : 'text-[#FFD875]'}">${server.ping}</span>
        </button>`).join('');
    return servers;
}

export function getDailyRewards() {
    return (registry?.dailyRewards || []).map(item => ({ ...item }));
}

export function getDailyQuests(type = 'daily') {
    return (registry?.dailyQuests?.[type] || []).map(item => ({ ...item }));
}

export function getPassTabs() {
    return (registry?.royalPass?.tabs || []).map(item => ({ ...item }));
}
