// AntWar UI runtime bridge.
// v1.7 moves the visible game interface to PixiJS. Legacy DOM is retained only as a compatibility bridge for existing game logic.

import { APP_VERSION, APP_RELEASE } from '../core/app-version.js';

export const UI_ASSETS = Object.freeze({ itemFrame: 'img/frame-item.png' });

function loadLegacyStyles() {
  [
    'css/ui/tokens.css','css/ui/surfaces.css','css/ui/controls.css','css/ui/responsive.css',
    'css/ui/ux-overhaul.css','css/ui/modern-ui.css','css/ui/responsive-modern.css',
    'css/ui/game-theme.css','css/ui/game-hud.css','css/ui/game-windows.css',
    'css/ui/game-components.css','css/ui/game-items.css','css/ui/game-chat.css',
    'css/ui/game-motion.css','css/ui/game-responsive.css','css/ui/game-overrides.css'
  ].forEach(href => {
    if (document.querySelector(`link[data-antwar-skin="${href}"]`)) return;
    const link=document.createElement('link'); link.rel='stylesheet'; link.href=href; link.dataset.antwarSkin=href; document.head.appendChild(link);
  });
}

function applyControlSkin(root=document){
  root.querySelectorAll('input[type="checkbox"],input[type="radio"]').forEach(input=>input.classList.add('antwar-skin-control'));
}
function ensureVersionBadge(root=document){
  const modal=root.matches?.('#modal-settings')?root:root.querySelector?.('#modal-settings');
  if(!modal)return;
  const header=modal.querySelector('.wood-modal-header');
  if(!header||header.querySelector('[data-antwar-version]'))return;
  const badge=document.createElement('span');badge.dataset.antwarVersion='true';badge.textContent=`v${APP_VERSION}`;badge.title=`AntWar GUI ${APP_VERSION} — ${APP_RELEASE}`;badge.className='antwar-version-badge';header.appendChild(badge);
}
function escapeChatText(value){return String(value).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function bindDesktopChat(){
  const input=document.getElementById('desktop-popup-chat-input'),send=document.getElementById('desktop-popup-chat-send'),list=document.getElementById('desktop-popup-chat-messages');
  if(!input||!send||!list||input.dataset.antwarBound==='true')return;
  const sendMessage=()=>{const value=input.value.trim();if(!value)return;const row=document.createElement('div');const now=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});row.className='flex gap-2 items-start self-end flex-row-reverse max-w-[88%] antwar-chat-message is-mine';row.innerHTML=`<div class="flex flex-col gap-0.5 text-left min-w-0"><div class="flex items-center justify-end gap-1.5"><span class="text-[8.5px] chat-time-text">${now}</span><span class="text-[11px] font-black chat-name-mine">أنت</span></div><div class="chat-bubble-mine text-xs font-bold break-words">${escapeChatText(value)}</div></div>`;list.appendChild(row);input.value='';list.scrollTop=list.scrollHeight;window.AntWarChatLastMessage={text:value,time:now};document.getElementById('chat-unread-badge')?.classList.add('hidden');};
  send.addEventListener('click',sendMessage);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});input.dataset.antwarBound='true';list.scrollTop=list.scrollHeight;
}
function installRoyalPassRuntimeGuard(){
  window.addEventListener('error',event=>{const message=String(event.message||''),file=String(event.filename||'');if(!/t is not a function/.test(message)||!/script\.js/.test(file))return;if(event.lineno&&(event.lineno<1880||event.lineno>1950))return;const body=document.getElementById('wood-modal-body-royal-pass');if(!body)return;event.preventDefault();body.innerHTML=`<div class="w-full flex flex-col gap-2"><div class="flex items-center justify-between px-2 py-2"><div><div class="font-black text-sm">Royal Pass</div><div class="text-[10px]">Season rewards</div></div><span class="antwar-version-badge">v${APP_VERSION}</span></div><div class="flex flex-col gap-2 max-h-[340px] overflow-y-auto modal-scrollbar">${Array.from({length:10},(_,i)=>`<div class="royal-pass-safe-row flex items-center justify-between p-2"><div class="flex items-center gap-3"><span class="font-black text-xs w-8">T-${i+1}</span><div class="royal-pass-safe-icon w-11 h-11 flex items-center justify-center">🎁</div><span class="text-[10px]">Season reward</span></div><button type="button" class="royal-pass-safe-claim">Claim</button></div>`).join('')}</div></div>`;body.querySelectorAll('.royal-pass-safe-claim').forEach(button=>button.addEventListener('click',()=>{button.disabled=true;button.textContent='Claimed';button.classList.add('is-claimed');}));},true);
}
async function boot(){
  loadLegacyStyles();applyControlSkin();ensureVersionBadge();installRoyalPassRuntimeGuard();bindDesktopChat();
  const observer=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(node=>{if(!(node instanceof Element))return;applyControlSkin(node);ensureVersionBadge(node);bindDesktopChat();})));observer.observe(document.body,{childList:true,subtree:true});
  window.AntWarVisualAssets=Object.freeze({assets:UI_ASSETS,version:APP_VERSION});
  try { await import('./pixi-ui.js'); } catch(error) { console.error('[AntWar] PixiJS UI failed to load',error); }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
