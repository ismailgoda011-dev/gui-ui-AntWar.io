// AntWar GUI visual asset contract.
// Every reusable GUI skin asset resolves from /img and legacy root references are repaired at runtime.

import { APP_VERSION, APP_RELEASE } from '../core/app-version.js';

export const UI_ASSETS = Object.freeze({
  background: 'img/bg0.png', backgroundAlt: 'img/bg1.png', backgroundDark: 'img/bg2.png', backgroundShop: 'img/bg5.png',
  list: 'img/list.png', panel: 'img/box-white.png', panelWide: 'img/box-white-brother.png', modal: 'img/box-big.png', modalLarge: 'img/box-big-Brother.png',
  text: 'img/Text BackgroundBox.png', button: 'img/Empty-button.png', topbar: 'img/topbar-box.png', optionMenu: 'img/option-Menu.png', arrow: 'img/arrow-Menu.png',
  checkboxOff: 'img/disabled.png', checkboxOn: 'img/enable.png', avatarFrame: 'img/frame.png', itemFrame: 'img/frame-item.png',
  teamColor: 'img/color-team.png', teamLock: 'img/lock-team.png', listLock: 'img/lock-list.png', emptyItem: 'img/no item.png', playerName: 'img/namePalyer.png'
});

const ROOT_IMAGE_NAMES = [
  'Chat.png','Coin.png','Create Room.png','Daily-Gifts.png','Diamond.png','Empty-button.png','Exit.png','Play.png','Rank.png','RoyalPass.png','Save.png','Settings.png','Task.png','Text BackgroundBox.png','Wardrobe.png','X.png',
  'ant1.png','ant2.png','arrow-Menu.png','bag.png','beetle.png','bg0.png','bg1.png','bg2.png','bg5.png','box-big-Brother.png','box-big.png','box-white-brother.png','box-white.png','box.png','color-team.png','disabled.png','enable.png','frame-item.png','frame.png','friend.png','list.png','lock-list.png','lock-team.png','mail.png','namePalyer.png','no item.png','option-Menu.png','shop.png','topbar-box.png'
];

export function assetPath(file) {
  if (!file) return '';
  if (/^(?:https?:)?\/\//i.test(file) || file.startsWith('data:') || file.startsWith('/')) return file;
  if (file.startsWith('img/')) return file;
  return `img/${file}`;
}

function repairRootAssetReference(value) {
  if (!value || typeof value !== 'string') return value;
  const normalized = value.replace(/^\.\//, '');
  if (normalized.startsWith('img/') || normalized.startsWith('icons/') || normalized.startsWith('language/')) return value;
  const match = ROOT_IMAGE_NAMES.find(name => normalized === name || normalized.endsWith(`/${name}`));
  return match ? `img/${match}` : value;
}

export function repairImagePaths(root = document) {
  root.querySelectorAll('img[src], source[src], [style]').forEach(node => {
    if (node.hasAttribute('src')) {
      const next = repairRootAssetReference(node.getAttribute('src'));
      if (next !== node.getAttribute('src')) node.setAttribute('src', next);
    }
    const style = node.getAttribute('style');
    if (style && /url\(/i.test(style)) {
      let next = style;
      ROOT_IMAGE_NAMES.forEach(name => {
        next = next.replaceAll(`url('${name}')`, `url('img/${name}')`).replaceAll(`url("${name}")`, `url("img/${name}")`).replaceAll(`url(${name})`, `url(img/${name})`);
      });
      if (next !== style) node.setAttribute('style', next);
    }
  });
}

function loadSkinStyles() {
  ['css/ui/tokens.css','css/ui/surfaces.css','css/ui/controls.css','css/ui/responsive.css'].forEach(href => {
    if (document.querySelector(`link[data-antwar-skin="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href; link.dataset.antwarSkin = href;
    document.head.appendChild(link);
  });
}

function applyControlSkin(root = document) {
  root.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => input.classList.add('antwar-skin-control'));
}

function ensureVersionBadge(root = document) {
  const modal = root.matches?.('#modal-settings') ? root : root.querySelector?.('#modal-settings');
  if (!modal) return;
  const header = modal.querySelector('.wood-modal-header');
  if (!header || header.querySelector('[data-antwar-version]')) return;
  const badge = document.createElement('span');
  badge.dataset.antwarVersion = 'true';
  badge.textContent = `v${APP_VERSION}`;
  badge.title = `AntWar GUI ${APP_VERSION} — ${APP_RELEASE}`;
  badge.style.cssText = 'margin-inline:8px;padding:3px 8px;font:800 10px/1 var(--aw-font-body);color:#241008;background:url("img/Text BackgroundBox.png") center/100% 100% no-repeat;white-space:nowrap;';
  header.appendChild(badge);
}

function boot() {
  loadSkinStyles(); repairImagePaths(); applyControlSkin(); ensureVersionBadge();
  const observer = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
    if (!(node instanceof Element)) return;
    repairImagePaths(node); applyControlSkin(node); ensureVersionBadge(node);
  })));
  observer.observe(document.body, { childList: true, subtree: true });
  window.AntWarVisualAssets = Object.freeze({ assets: UI_ASSETS, assetPath, repairImagePaths, version: APP_VERSION });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
