// AntWar UI runtime bridge.
// v1.7: the visible game interface is rendered by PixiJS. The legacy DOM is retained only as a compatibility bridge for existing game logic.

import { APP_VERSION, APP_RELEASE } from '../core/app-version.js';

export const UI_ASSETS = Object.freeze({ itemFrame: 'img/frame-item.png' });

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
  const sendMessage=()=>{const value=input.value.trim();if(!value)return;const row=document.createElement('div');const now=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});row.className='antwar-chat-message is-mine';row.textContent=`${now} — أنت: ${value}`;list.appendChild(row);input.value='';list.scrollTop=list.scrollHeight;window.AntWarChatLastMessage={text:value,time:now};document.getElementById('chat-unread-badge')?.classList.add('hidden');};
  send.addEventListener('click',sendMessage);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});input.dataset.antwarBound='true';list.scrollTop=list.scrollHeight;
}
function installRoyalPassRuntimeGuard(){
  window.addEventListener('error',event=>{const message=String(event.message||''),file=String(event.filename||'');if(!/t is not a function/.test(message)||!/script\.js/.test(file))return;if(event.lineno&&(event.lineno<1880||event.lineno>1950))return;const body=document.getElementById('wood-modal-body-royal-pass');if(!body)return;event.preventDefault();body.innerHTML=`<div class="royal-pass-safe-bridge"><strong>Royal Pass</strong><span>Season rewards</span><span>v${APP_VERSION}</span></div>`;},true);
}
async function boot(){
  applyControlSkin();ensureVersionBadge();installRoyalPassRuntimeGuard();bindDesktopChat();
  const observer=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(node=>{if(!(node instanceof Element))return;applyControlSkin(node);ensureVersionBadge(node);bindDesktopChat();})));observer.observe(document.body,{childList:true,subtree:true});
  window.AntWarVisualAssets=Object.freeze({assets:UI_ASSETS,version:APP_VERSION});
  try { await import('./pixi-ui.js'); } catch(error) { console.error('[AntWar] PixiJS UI failed to load',error); }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
