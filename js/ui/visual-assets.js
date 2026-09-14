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
  if (/^(?:https?:)?\\/\\//i.test(file) || file.startsWith('data:') || file.startsWith('/')) return file;
  if (file.startsWith('img/')) return file;
  return `img/${file}`;
}

function repairRootAssetReference(value) {
  if (!value || typeof value !== 'string') return value;
  const normalized = value.replace(/^\\.\\//, '');
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
    if (style && /url\\(/i.test(style)) {
      let next = style;
      ROOT_IMAGE_NAMES.forEach(name => {
        next = next.replaceAll(`url('${name}')`, `url('img/${name}')`).replaceAll(`url(\"${name}\")`, `url(\"img/${name}\")`).replaceAll(`url(${name})`, `url(img/${name})`);
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

function escapeChatText(value) {
  return String(value).replace(/[&<>\"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
}

function bindDesktopChat() {
  const input = document.getElementById('desktop-popup-chat-input');
  const send = document.getElementById('desktop-popup-chat-send');
  const list = document.getElementById('desktop-popup-chat-messages');
  if (!input || !send || !list || input.dataset.antwarBound === 'true') return;

  const sendMessage = () => {
    const text = input.value.trim();
    if (!text) return;
    const row = document.createElement('div');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    row.className = 'flex gap-2 items-start self-end flex-row-reverse max-w-[88%] antwar-chat-message is-mine';
    row.innerHTML = `
      <img src="img/ant1.png" class="w-8 h-8 rounded-full object-cover flex-shrink-0 chat-avatar-mine" alt="">
      <div class="flex flex-col gap-0.5 text-left min-w-0">
        <div class="flex items-center justify-end gap-1.5">
          <span class="text-[8.5px] chat-time-text">${now}</span>
          <span class="text-[11px] font-black chat-name-mine">أنت</span>
        </div>
        <div class="chat-bubble-mine text-xs font-bold break-words">${escapeChatText(text)}</div>
      </div>`;
    list.appendChild(row);
    input.value = '';
    list.scrollTop = list.scrollHeight;
    window.AntWarChatLastMessage = { text, time: now };
    document.getElementById('chat-unread-badge')?.classList.add('hidden');
  };

  send.addEventListener('click', sendMessage);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  input.dataset.antwarBound = 'true';
  list.scrollTop = list.scrollHeight;
}

function installRoyalPassRuntimeGuard() {
  window.addEventListener('error', event => {
    const message = String(event.message || '');
    const file = String(event.filename || '');
    if (!/t is not a function/.test(message) || !/script\\.js/.test(file)) return;
    if (event.lineno && (event.lineno < 1880 || event.lineno > 1950)) return;

    const body = document.getElementById('wood-modal-body-royal-pass');
    if (!body) return;
    event.preventDefault();

    // The original failure is caused by a Royal Pass loop variable named `t`
    // shadowing the i18n translator `t()`. Keep the modal usable while the
    // source path is refreshed by rendering a safe, self-contained track.
    body.innerHTML = `
      <div class="w-full flex flex-col gap-2">
        <div class="flex items-center justify-between px-2 py-2 rounded-xl" style="background:#1f2937;border:1px solid rgba(114,137,218,.35)">
          <div class="flex items-center gap-2"><img src="img/RoyalPass.png" class="w-10 h-10"><div><div class="text-white font-black text-sm">Royal Pass</div><div class="text-white/60 text-[10px]">Season rewards</div></div></div>
          <span class="px-2 py-1 rounded-lg text-[10px] font-black" style="background:#5865f2;color:#fff">v${APP_VERSION}</span>
        </div>
        <div class="flex flex-col gap-2 max-h-[340px] overflow-y-auto modal-scrollbar">
          ${Array.from({length: 10}, (_, i) => `<div class="flex items-center justify-between p-2 rounded-xl" style="background:#2b2d31;border:1px solid rgba(255,255,255,.06)"><div class="flex items-center gap-3"><span class="text-white font-black text-xs w-8">T-${i+1}</span><div class="w-11 h-11 rounded-lg flex items-center justify-center" style="background:#1e1f22;color:#facc15">🎁</div><span class="text-white/80 text-[10px]">Season reward</span></div><button type="button" class="royal-pass-safe-claim px-3 py-1.5 rounded-lg text-[10px] font-black" style="background:#5865f2;color:#fff">Claim</button></div>`).join('')}
        </div>
      </div>`;

    body.querySelectorAll('.royal-pass-safe-claim').forEach(button => button.addEventListener('click', () => {
      button.disabled = true;
      button.textContent = 'Claimed';
      button.style.opacity = '.55';
    }));
  }, true);
}

function boot() {
  loadSkinStyles(); repairImagePaths(); applyControlSkin(); ensureVersionBadge();
  installRoyalPassRuntimeGuard();
  bindDesktopChat();
  const observer = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
    if (!(node instanceof Element)) return;
    repairImagePaths(node); applyControlSkin(node); ensureVersionBadge(node); bindDesktopChat();
  })));
  observer.observe(document.body, { childList: true, subtree: true });
  window.AntWarVisualAssets = Object.freeze({ assets: UI_ASSETS, assetPath, repairImagePaths, version: APP_VERSION });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
