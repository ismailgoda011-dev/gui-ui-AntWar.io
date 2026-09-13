import { applyTranslations, getCurrentLang, t } from '../i18n.js';
import { patchState } from '../core/game-state.js';
import { applyPerformanceMode } from '../core/performance.js';

const STORAGE_KEY = 'antwar:ux:v1';
let overlay = null;
let activeChatId = 'f1';
let chatMode = 'friends';
let roomMode = 'create';
let roomTab = 'create';
let settingsTab = 'general';
let chatSearch = '';

const CHAT_IDS = ['f1', 'f2', 'f3', 'f4', 'f5'];
const CHAT_STATUS = { f1: 'online', f2: 'online', f3: 'offline', f4: 'inLobby', f5: 'inGame' };
const CHAT_AVATARS = { f1: 'img/ant1.png', f2: 'img/beetle.png', f3: 'img/ant2.png', f4: 'img/ant1.png', f5: 'img/beetle.png' };
const CHAT_MESSAGES = {
  f1: [['chat.sample.m1', false, '18:21'], ['chat.sample.m2', true, '18:22'], ['chat.sample.m3', false, '18:23']],
  f2: [['chat.sample.m4', false, '16:08'], ['chat.sample.m5', true, '16:10']],
  f3: [['chat.sample.m2', false, '13:44']],
  f4: [['chat.sample.m3', false, '11:18']],
  f5: [['chat.sample.m4', false, '09:02']]
};

const loadSettings = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const saveSettings = data => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

function ensureI18nRender() { requestAnimationFrame(() => applyTranslations()); }

function closeOverlay() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
}

function createOverlay(kind, titleKey, subtitleKey) {
  closeOverlay();
  overlay = document.createElement('div');
  overlay.className = 'antwar-ux-overlay';
  overlay.dataset.kind = kind;
  overlay.innerHTML = `
    <section class="antwar-ux-shell" role="dialog" aria-modal="true" aria-labelledby="antwar-ux-title">
      <header class="antwar-ux-topbar">
        <div class="antwar-ux-title-wrap">
          <div class="antwar-ux-title-icon"><i class="fa-solid ${kind === 'chat' ? 'fa-message' : kind === 'room' ? 'fa-tent' : 'fa-sliders'}"></i></div>
          <div>
            <h2 class="antwar-ux-title" id="antwar-ux-title" data-i18n="${titleKey}"></h2>
            <p class="antwar-ux-subtitle" data-i18n="${subtitleKey}"></p>
          </div>
        </div>
        <button class="antwar-ux-close" data-ux-close type="button" data-i18n-title="ux.common.close" aria-label=""><i class="fa-solid fa-xmark"></i></button>
      </header>
      <div class="antwar-ux-content"></div>
    </section>`;
  document.body.appendChild(overlay);
  overlay.querySelector('[data-ux-close]').addEventListener('click', closeOverlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
  ensureI18nRender();
  return overlay.querySelector('.antwar-ux-content');
}

function avatar(id) { return CHAT_AVATARS[id] || 'img/ant1.png'; }
function friendName(id) { return t(`chat.sample.friend${id.slice(1)}`); }
function friendStatus(id) { return t(`ux.chat.${CHAT_STATUS[id] === 'online' ? 'online' : CHAT_STATUS[id] === 'offline' ? 'offline' : CHAT_STATUS[id]}`); }

function renderChatMessages(container, id) {
  container.textContent = '';
  const msgs = CHAT_MESSAGES[id] || [];
  msgs.forEach(([key, mine, time]) => {
    const row = document.createElement('div');
    row.className = `antwar-msg-row ${mine ? 'me' : ''}`;
    const img = document.createElement('img');
    img.className = 'antwar-chat-avatar'; img.src = avatar(id); img.alt = '';
    const wrap = document.createElement('div');
    const bubble = document.createElement('div');
    bubble.className = 'antwar-msg-bubble'; bubble.textContent = t(key);
    const meta = document.createElement('div'); meta.className = 'antwar-msg-time'; meta.textContent = time;
    wrap.append(bubble, meta); row.append(img, wrap); container.appendChild(row);
  });
  container.scrollTop = container.scrollHeight;
}

function renderChatMain(root) {
  root.textContent = '';
  const layout = document.createElement('div'); layout.className = 'antwar-chat-layout';
  const side = document.createElement('aside'); side.className = 'antwar-chat-sidebar';
  const search = document.createElement('input'); search.className = 'antwar-chat-search'; search.placeholder = t('ux.chat.search'); search.value = chatSearch; search.setAttribute('aria-label', t('ux.chat.search'));
  search.addEventListener('input', () => { chatSearch = search.value; renderChatMain(root); requestAnimationFrame(() => root.querySelector('.antwar-chat-search')?.focus()); });
  side.appendChild(search);
  const filters = document.createElement('div'); filters.className = 'antwar-chat-filters';
  [['friends', 'friends'], ['global', 'global'], ['recent', 'recent']].forEach(([id, key]) => {
    const b = document.createElement('button'); b.className = `antwar-chat-filter ${chatMode === id ? 'active' : ''}`; b.type = 'button'; b.textContent = t(`ux.chat.${key}`);
    b.addEventListener('click', () => { chatMode = id; renderChatMain(root); }); filters.appendChild(b);
  });
  side.appendChild(filters);
  const list = document.createElement('div'); list.className = 'antwar-chat-list';
  const ids = CHAT_IDS.filter(id => friendName(id).toLowerCase().includes(chatSearch.toLowerCase()));
  ids.forEach(id => {
    const item = document.createElement('button'); item.type = 'button'; item.className = `antwar-chat-item ${activeChatId === id ? 'active' : ''}`;
    const img = document.createElement('img'); img.className = 'antwar-chat-avatar'; img.src = avatar(id); img.alt = '';
    const meta = document.createElement('div'); meta.className = 'antwar-chat-meta';
    const name = document.createElement('div'); name.className = 'antwar-chat-name'; name.textContent = friendName(id);
    const preview = document.createElement('div'); preview.className = 'antwar-chat-preview'; preview.textContent = t(CHAT_MESSAGES[id]?.at(-1)?.[0] || 'ux.chat.emptyBody');
    meta.append(name, preview);
    const dot = document.createElement('span'); dot.className = `antwar-chat-status-dot ${CHAT_STATUS[id] === 'offline' ? '' : 'online'}`;
    item.append(img, meta, dot); item.addEventListener('click', () => { activeChatId = id; chatMode = 'friends'; renderChatMain(root); });
    list.appendChild(item);
  });
  side.appendChild(list);

  const main = document.createElement('main'); main.className = 'antwar-chat-main';
  const head = document.createElement('div'); head.className = 'antwar-chat-head';
  const userWrap = document.createElement('div'); userWrap.className = 'antwar-chat-head-user';
  const hImg = document.createElement('img'); hImg.className = 'antwar-chat-avatar'; hImg.src = avatar(activeChatId); hImg.alt = '';
  const hMeta = document.createElement('div'); const hName = document.createElement('div'); hName.className = 'antwar-chat-name'; hName.textContent = friendName(activeChatId); const hStatus = document.createElement('div'); hStatus.className = 'antwar-chat-preview'; hStatus.textContent = friendStatus(activeChatId); hMeta.append(hName, hStatus); userWrap.append(hImg, hMeta);
  const headActions = document.createElement('div'); headActions.className = 'antwar-chat-head-actions';
  [['fa-user', 'ux.chat.viewProfile'], ['fa-user-plus', 'ux.chat.invite'], ['fa-ellipsis', 'ux.chat.more']].forEach(([icon, labelKey]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'antwar-icon-btn'; b.innerHTML = `<i class="fa-solid ${icon}"></i>`; b.title = t(labelKey); headActions.appendChild(b);
  });
  head.append(userWrap, headActions); main.appendChild(head);

  const messages = document.createElement('div'); messages.className = 'antwar-chat-messages'; renderChatMessages(messages, activeChatId); main.appendChild(messages);
  const composer = document.createElement('form'); composer.className = 'antwar-chat-composer';
  const emoji = document.createElement('button'); emoji.type = 'button'; emoji.className = 'antwar-icon-btn'; emoji.title = t('ux.chat.emoji'); emoji.innerHTML = '<i class="fa-regular fa-face-smile"></i>'; emoji.addEventListener('click', () => { input.value += ' 🐜'; input.focus(); });
  const attach = document.createElement('button'); attach.type = 'button'; attach.className = 'antwar-icon-btn'; attach.title = t('ux.chat.attach'); attach.innerHTML = '<i class="fa-solid fa-paperclip"></i>';
  const input = document.createElement('textarea'); input.className = 'antwar-composer-input'; input.rows = 1; input.placeholder = t('ux.chat.messagePlaceholder'); input.setAttribute('aria-label', t('ux.chat.messagePlaceholder'));
  const send = document.createElement('button'); send.type = 'submit'; send.className = 'antwar-send-btn'; send.innerHTML = `<i class="fa-solid fa-paper-plane"></i>`; send.title = t('ux.chat.send');
  composer.append(emoji, attach, input, send);
  composer.addEventListener('submit', e => {
    e.preventDefault(); const text = input.value.trim(); if (!text) return;
    const row = document.createElement('div'); row.className = 'antwar-msg-row me';
    const img = document.createElement('img'); img.className = 'antwar-chat-avatar'; img.src = 'img/ant1.png'; img.alt = '';
    const wrap = document.createElement('div'); const bubble = document.createElement('div'); bubble.className = 'antwar-msg-bubble'; bubble.textContent = text; const meta = document.createElement('div'); meta.className = 'antwar-msg-time'; meta.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); wrap.append(bubble, meta); row.append(img, wrap); messages.appendChild(row); messages.scrollTop = messages.scrollHeight; input.value = '';
    window.dispatchEvent(new CustomEvent('antwar:chat:send', { detail: { targetId: activeChatId, text } }));
  });
  main.appendChild(composer);

  const info = document.createElement('aside'); info.className = 'antwar-chat-info';
  const card = document.createElement('div'); card.className = 'antwar-chat-info-card';
  const iImg = document.createElement('img'); iImg.className = 'antwar-chat-info-avatar'; iImg.src = avatar(activeChatId); iImg.alt = '';
  const iName = document.createElement('div'); iName.className = 'antwar-chat-info-name'; iName.textContent = friendName(activeChatId);
  const iStatus = document.createElement('div'); iStatus.className = 'antwar-chat-info-status'; iStatus.textContent = friendStatus(activeChatId);
  const actions = document.createElement('div'); actions.className = 'antwar-chat-info-actions';
  [
    ['ux.chat.viewProfile', 'fa-user'],
    ['ux.chat.invite', 'fa-user-plus'],
    ['ux.chat.block', 'fa-ban'],
    ['ux.chat.report', 'fa-flag']
  ].forEach(([key, icon]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'antwar-soft-btn'; b.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${t(key)}</span>`; actions.appendChild(b); });
  card.append(iImg, iName, iStatus, actions); info.appendChild(card);
  const media = document.createElement('div'); media.className = 'antwar-chat-info-card'; media.innerHTML = `<div class="antwar-setting-label">${t('ux.chat.sharedMedia')}</div><div class="antwar-chat-preview" style="margin-top:7px">${t('ux.chat.emptyBody')}</div>`; info.appendChild(media);
  layout.append(side, main, info); root.appendChild(layout);
}

export function openPremiumChat() {
  const content = createOverlay('chat', 'ux.chat.title', 'ux.chat.subtitle');
  renderChatMain(content);
}

function renderRoomCreator(content) {
  content.textContent = '';
  const body = document.createElement('div'); body.className = 'antwar-room-body';
  const tabs = document.createElement('div'); tabs.className = 'antwar-room-tabs';
  [['create', 'ux.room.createTab'], ['browse', 'ux.room.browseTab']].forEach(([id, key]) => { const b = document.createElement('button'); b.type = 'button'; b.className = `antwar-room-tab ${roomTab === id ? 'active' : ''}`; b.textContent = t(key); b.addEventListener('click', () => { roomTab = id; renderRoomCreator(content); }); tabs.appendChild(b); });
  body.appendChild(tabs);
  if (roomMode === 'lobby') { renderRoomLobby(body); content.appendChild(body); ensureI18nRender(); return; }
  if (roomTab === 'browse') { renderRoomBrowser(body); content.appendChild(body); ensureI18nRender(); return; }

  const grid = document.createElement('div'); grid.className = 'antwar-room-grid';
  const left = document.createElement('div'); left.className = 'antwar-room-card';
  const h = document.createElement('h3'); h.dataset.i18n = 'ux.room.title'; const p = document.createElement('p'); p.dataset.i18n = 'ux.room.subtitle'; left.append(h,p);
  const form = document.createElement('div'); form.className = 'antwar-form-grid';
  const nameField = field('ux.room.roomName', 'input', 'room-name', loadSettings().roomName || '', 'ux.room.roomNamePlaceholder');
  nameField.classList.add('full'); form.appendChild(nameField);
  const modeField = selectField('ux.room.mode', 'room-mode', [['classic','ux.room.classic'],['endless','ux.room.endless'],['siege','ux.room.siege']], loadSettings().roomMode || 'classic');
  const teamsField = selectField('ux.room.teams', 'room-teams', [['2','ux.room.twoTeams'],['3','ux.room.threeTeams'],['4','ux.room.fourTeams']], loadSettings().roomTeams || '2');
  const playersField = selectField('ux.room.players', 'room-players', [['4','4'],['6','6'],['8','8'],['10','10'],['12','12']], loadSettings().roomPlayers || '8');
  const regionField = selectField('ux.room.region', 'room-region', [['me','server.middleEast'],['eu','server.europe'],['us','server.usEast'],['ap','server.asiaPacific']], loadSettings().roomRegion || 'me');
  form.append(modeField, teamsField, playersField, regionField);
  const privacy = selectField('ux.room.privacy', 'room-privacy', [['public','ux.room.public'],['private','ux.room.private']], loadSettings().roomPrivacy || 'public');
  form.append(privacy);
  const passField = field('ux.room.password', 'input', 'room-password', '', 'ux.room.passwordPlaceholder', true); form.append(passField);
  left.appendChild(form);
  const hint = document.createElement('p'); hint.id = 'room-privacy-hint'; hint.style.marginTop = '10px'; left.appendChild(hint);
  const actions = document.createElement('div'); actions.className = 'antwar-room-actions';
  const createBtn = document.createElement('button'); createBtn.type = 'button'; createBtn.className = 'antwar-primary-btn'; createBtn.textContent = t('ux.room.create');
  const resetBtn = document.createElement('button'); resetBtn.type = 'button'; resetBtn.className = 'antwar-secondary-btn'; resetBtn.textContent = t('ux.room.reset');
  actions.append(createBtn, resetBtn); left.append(actions);
  const right = document.createElement('div'); right.className = 'antwar-room-card';
  right.innerHTML = `<h3>${t('ux.room.quick')}</h3><p>${t('ux.room.publicHint')}</p>`;
  const quick = document.createElement('div'); quick.className = 'antwar-player-stack';
  [['ux.room.classic','classic','2','8'],['ux.room.endless','endless','2','6'],['ux.room.siege','siege','4','12']].forEach(([label,mode,teams,players]) => { const b=document.createElement('button'); b.type='button'; b.className='antwar-secondary-btn'; b.style.textAlign='start'; b.textContent=`${t(label)} · ${teams}× · ${players}`; b.addEventListener('click',()=>{document.getElementById('room-mode').value=mode;document.getElementById('room-teams').value=teams;document.getElementById('room-players').value=players;}); quick.appendChild(b); });
  right.appendChild(quick); grid.append(left,right); body.appendChild(grid); content.appendChild(body);
  const privacySelect = document.getElementById('room-privacy');
  const updateHint = () => { hint.textContent = privacySelect?.value === 'private' ? t('ux.room.privateHint') : t('ux.room.publicHint'); };
  privacySelect?.addEventListener('change', updateHint); updateHint();
  createBtn.addEventListener('click', () => {
    const settings = {
      roomName: document.getElementById('room-name')?.value.trim() || t('ux.room.demoRoom1'),
      roomMode: document.getElementById('room-mode')?.value || 'classic',
      roomTeams: document.getElementById('room-teams')?.value || '2',
      roomPlayers: document.getElementById('room-players')?.value || '8',
      roomRegion: document.getElementById('room-region')?.value || 'me',
      roomPrivacy: privacySelect?.value || 'public'
    };
    if (settings.roomPrivacy === 'private') {
      const code = document.getElementById('room-password')?.value.trim() || '';
      if (code.length < 4) { document.getElementById('room-password')?.focus(); return; }
      settings.password = code;
    }
    saveSettings(settings); patchState('room', { id: `ROOM-${Math.floor(1000 + Math.random()*8999)}`, name: settings.roomName, maxPlayers: Number(settings.roomPlayers), players: [], ready: false, status: 'lobby' });
    window.dispatchEvent(new CustomEvent('antwar:room:create', { detail: settings }));
    roomMode = 'lobby'; renderRoomCreator(content);
  });
  resetBtn.addEventListener('click',()=>{localStorage.removeItem(STORAGE_KEY); renderRoomCreator(content);});
  ensureI18nRender();
}

function renderRoomBrowser(body){
  const card=document.createElement('div'); card.className='antwar-room-card'; const h=document.createElement('h3'); h.textContent=t('ux.room.availableTitle'); const p=document.createElement('p'); p.textContent=t('ux.room.subtitle'); card.append(h,p); const list=document.createElement('div'); list.className='antwar-room-list';
  [['ux.room.demoRoom1','2','6','classic'],['ux.room.demoRoom2','3','8','endless'],['ux.room.demoRoom3','4','12','siege']].forEach(([name,teams,players,mode],i)=>{ const row=document.createElement('div'); row.className='antwar-room-row'; const main=document.createElement('div'); main.className='antwar-room-row-main'; const rn=document.createElement('div'); rn.className='antwar-room-row-name'; rn.textContent=t(name); const rm=document.createElement('div'); rm.className='antwar-room-row-meta'; rm.textContent=`${teams} · ${players} · ${t(`ux.room.${mode}`)}`; main.append(rn,rm); const badge=document.createElement('span'); badge.className='antwar-room-badge'; badge.textContent=t('ux.room.statusOpen'); const join=document.createElement('button'); join.type='button'; join.className='antwar-primary-btn'; join.textContent=t('ux.room.join'); join.addEventListener('click',()=>{patchState('room',{id:`BROWSE-${i+1}`,name:t(name),maxPlayers:Number(players),players:[],ready:false,status:'lobby'});roomMode='lobby';renderRoomCreator(body.parentElement?.parentElement?.querySelector('.antwar-ux-content') || document.createElement('div'));}); row.append(main,badge,join); list.appendChild(row);}); card.appendChild(list); body.appendChild(card);
}

function renderRoomLobby(body){
  const grid=document.createElement('div'); grid.className='antwar-lobby-grid'; const hero=document.createElement('div'); hero.className='antwar-lobby-hero'; const h=document.createElement('h3'); h.textContent=t('ux.room.lobbyTitle'); const p=document.createElement('p'); p.textContent=t('ux.room.lobbySubtitle'); hero.append(h,p); const code=document.createElement('span'); code.className='antwar-lobby-code'; code.textContent=`${t('ux.room.roomCode')}: ${patchRoomCode()}`; hero.appendChild(code);
  const summary=document.createElement('div'); summary.className='antwar-player-stack'; const state=window.AntWarRuntime?.getState?.().room || {}; [['ux.room.roomName', state.name || t('ux.room.demoRoom1')],['ux.room.players', `${state.players?.length || 1}/${state.maxPlayers || 8}`],['ux.room.statusOpen', t('ux.room.statusOpen')]].forEach(([label,val])=>{const r=document.createElement('div');r.className='antwar-player-row';const a=document.createElement('span');a.className='antwar-chat-preview';a.textContent=t(label);const b=document.createElement('strong');b.className='antwar-setting-label';b.textContent=val;r.append(a,b);summary.appendChild(r);}); hero.appendChild(summary);
  const actions=document.createElement('div'); actions.className='antwar-room-actions'; const ready=document.createElement('button'); ready.type='button'; ready.className='antwar-primary-btn'; ready.textContent=t('ux.room.ready'); const start=document.createElement('button'); start.type='button'; start.className='antwar-secondary-btn'; start.textContent=t('ux.room.start'); const copy=document.createElement('button'); copy.type='button'; copy.className='antwar-secondary-btn'; copy.textContent=t('ux.room.copyInvite'); const leave=document.createElement('button'); leave.type='button'; leave.className='antwar-secondary-btn'; leave.textContent=t('ux.room.leave'); actions.append(ready,start,copy,leave); hero.append(actions);
  const players=document.createElement('div'); players.className='antwar-room-card'; const ph=document.createElement('h3'); ph.textContent=t('ux.room.members'); players.appendChild(ph); const stack=document.createElement('div'); stack.className='antwar-player-stack'; [0,1,2].forEach((_,i)=>{const r=document.createElement('div');r.className='antwar-player-row';const img=document.createElement('img');img.className='antwar-chat-avatar';img.src=['img/ant1.png','img/beetle.png','img/ant2.png'][i];const name=document.createElement('span');name.className='antwar-setting-label';name.textContent=i===0?t('ux.room.playerYou'):`${t('chat.sample.friend'+(i+1))}`;const status=document.createElement('span');status.className='antwar-player-status';status.textContent=t('ux.room.ready');r.append(img,name,status);stack.appendChild(r);}); players.append(stack); grid.append(hero,players); body.appendChild(grid);
  ready.addEventListener('click',()=>{ready.textContent=t('ux.room.readyOn');ready.dataset.ready='1';patchState('room',{ready:true});window.dispatchEvent(new CustomEvent('antwar:room:ready'));}); start.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('antwar:room:start'))); leave.addEventListener('click',()=>{roomMode='create';patchState('room',{status:'idle'});renderRoomCreator(body.parentElement?.parentElement?.querySelector('.antwar-ux-content') || document.createElement('div'));}); copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href+'#room='+patchRoomCode());window.showToast?.(t('ux.common.copyDone'),'success');}catch{}});
}
function patchRoomCode(){return window.AntWarRuntime?.getState?.().room?.id || `ROOM-${Math.floor(1000+Math.random()*8999)}`;}

function field(labelKey, type, id, value, placeholderKey, password=false){ const wrap=document.createElement('div'); wrap.className='antwar-field'; const label=document.createElement('label'); label.dataset.i18n=labelKey; const input=document.createElement(type); input.className='antwar-input'; input.id=id; input.type=password?'password':'text'; input.value=value; if(placeholderKey) input.placeholder=t(placeholderKey); wrap.append(label,input); return wrap; }
function selectField(labelKey,id,options,value){ const wrap=document.createElement('div'); wrap.className='antwar-field'; const label=document.createElement('label'); label.dataset.i18n=labelKey; const select=document.createElement('select'); select.className='antwar-select'; select.id=id; options.forEach(([v,key])=>{const o=document.createElement('option');o.value=v;o.textContent=key.includes('.')?t(key):key;select.appendChild(o);}); select.value=value; wrap.append(label,select); return wrap; }

export function openPremiumRoom(){ const content=createOverlay('room','ux.room.title','ux.room.subtitle'); roomMode='create'; roomTab='create'; renderRoomCreator(content); }

function renderSettings(content){
  const data=loadSettings(); content.textContent=''; const body=document.createElement('div'); body.className='antwar-settings-body'; const tabs=document.createElement('div'); tabs.className='antwar-settings-tabs';
  [['general','fa-sliders','ux.settings.general'],['graphics','fa-display','ux.settings.graphics'],['audio','fa-volume-high','ux.settings.audio'],['accessibility','fa-universal-access','ux.settings.accessibility']].forEach(([id,icon,key])=>{const b=document.createElement('button');b.type='button';b.className=`antwar-settings-tab ${settingsTab===id?'active':''}`;b.innerHTML=`<i class="fa-solid ${icon}"></i><span>${t(key)}</span>`;b.addEventListener('click',()=>{settingsTab=id;renderSettings(content);});tabs.appendChild(b);});
  const panel=document.createElement('div'); panel.className='antwar-settings-panel'; const grid=document.createElement('div'); grid.className='antwar-settings-grid';
  if(settingsTab==='general'){
    grid.append(selectField('ux.settings.language','setting-language',[['ar','العربية'],['en','English']],getCurrentLang()), selectField('ux.settings.performance','setting-performance',[['auto','ux.settings.performanceAuto'],['high','ux.settings.performanceHigh'],['medium','ux.settings.performanceMedium'],['low','ux.settings.performanceLow']],data.performance||'auto'));
    panel.appendChild(sectionTitle(t('ux.settings.general'))); panel.appendChild(grid); addSettingFooter(panel,false);
  } else if(settingsTab==='graphics'){
    grid.append(selectField('ux.settings.graphicsPreset','setting-preset',[['ultra','ux.settings.ultra'],['high','ux.settings.high'],['medium','ux.settings.medium'],['low','ux.settings.low']],data.preset||'high'), selectField('ux.settings.resolution','setting-resolution',[['auto','ux.settings.resolutionAuto'],['1080','ux.settings.resolution1080'],['1440','ux.settings.resolution1440'],['720','ux.settings.resolution720']],data.resolution||'auto'), selectField('ux.settings.fps','setting-fps',[['60','ux.settings.fps60'],['120','ux.settings.fps120']],data.fps||'60'), selectField('ux.settings.shadows','setting-shadows',[['high','ux.settings.shadowsHigh'],['medium','ux.settings.shadowsMedium'],['off','ux.settings.shadowsOff']],data.shadows||'high'));
    panel.appendChild(sectionTitle(t('ux.settings.graphics'))); panel.appendChild(grid); addSettingFooter(panel,false);
  } else if(settingsTab==='audio'){
    panel.appendChild(sectionTitle(t('ux.settings.audio'))); [['master','ux.settings.masterVolume',data.master ?? 90],['music','ux.settings.music',data.music ?? 70],['effects','ux.settings.effects',data.effects ?? 85]].forEach(([key,label,val])=>{const item=document.createElement('div');item.className='antwar-setting-item full';const row=document.createElement('div');row.className='antwar-setting-row';const l=document.createElement('span');l.className='antwar-setting-label';l.textContent=t(label);const value=document.createElement('span');value.className='antwar-chat-preview';value.textContent=`${val}%`;row.append(l,value);const range=document.createElement('input');range.type='range';range.className='antwar-range';range.min='0';range.max='100';range.value=val;range.dataset.audio=key;range.addEventListener('input',()=>value.textContent=`${range.value}%`);item.append(row,range);grid.appendChild(item);}); panel.appendChild(grid); const mute=document.createElement('div');mute.className='antwar-setting-item full';mute.innerHTML=`<div class="antwar-setting-row"><span class="antwar-setting-label">${t('ux.settings.mute')}</span><label class="antwar-switch"><input id="setting-mute" type="checkbox" ${data.mute?'checked':''}><span></span></label></div>`;panel.appendChild(mute); addSettingFooter(panel,false);
  } else {
    panel.appendChild(sectionTitle(t('ux.settings.accessibility'))); const rm=document.createElement('div');rm.className='antwar-setting-item full';rm.innerHTML=`<div class="antwar-setting-row"><div><div class="antwar-setting-label">${t('ux.settings.reducedMotion')}</div><div class="antwar-setting-hint">${t('ux.settings.reducedMotionHint')}</div></div><label class="antwar-switch"><input id="setting-motion" type="checkbox" ${data.reducedMotion?'checked':''}><span></span></label></div>`; const lt=document.createElement('div');lt.className='antwar-setting-item full';lt.innerHTML=`<div class="antwar-setting-row"><div><div class="antwar-setting-label">${t('ux.settings.largeText')}</div><div class="antwar-setting-hint">${t('ux.settings.largeTextHint')}</div></div><label class="antwar-switch"><input id="setting-large-text" type="checkbox" ${data.largeText?'checked':''}><span></span></label></div>`;grid.append(rm,lt);panel.appendChild(grid);addSettingFooter(panel,true);
  }
  body.append(tabs,panel);content.appendChild(body);ensureI18nRender();
  const perf=document.getElementById('setting-performance');perf?.addEventListener('change',()=>applyPerformanceMode(perf.value));
  document.getElementById('setting-language')?.addEventListener('change',e=>window.dispatchEvent(new CustomEvent('antwar:ux:set-language',{detail:e.target.value})));
}
function sectionTitle(text){const h=document.createElement('h3');h.style.margin='0 0 14px';h.style.color='var(--ux-text)';h.style.fontSize='14px';h.style.fontWeight='900';h.textContent=text;return h;}
function addSettingFooter(panel, accessibility=false){const foot=document.createElement('div');foot.className='antwar-settings-footer';const reset=document.createElement('button');reset.type='button';reset.className='antwar-secondary-btn';reset.textContent=t('ux.settings.reset');const save=document.createElement('button');save.type='button';save.className='antwar-primary-btn';save.textContent=t('ux.settings.save');foot.append(reset,save);panel.appendChild(foot);save.addEventListener('click',()=>{const data=loadSettings(); ['setting-language','setting-performance','setting-preset','setting-resolution','setting-fps','setting-shadows'].forEach(id=>{const el=document.getElementById(id);if(el)data[id.replace('setting-','')]=el.value;}); ['setting-mute','setting-motion','setting-large-text'].forEach(id=>{const el=document.getElementById(id);if(el)data[id.replace('setting-','')]=!!el.checked;}); document.querySelectorAll('[data-audio]').forEach(el=>data[el.dataset.audio]=Number(el.value)); saveSettings(data); if(data.performance) applyPerformanceMode(data.performance); if(document.getElementById('setting-motion')) document.documentElement.classList.toggle('reduced-motion',!!data.motion); if(document.getElementById('setting-large-text')) document.documentElement.classList.toggle('large-text-ui',!!data.largeText); window.showToast?.(t('ux.settings.saved'),'success'); }); reset.addEventListener('click',()=>{localStorage.removeItem(STORAGE_KEY);applyPerformanceMode('auto');document.documentElement.classList.remove('reduced-motion','large-text-ui');window.showToast?.(t('ux.settings.resetDone'),'success');renderSettings(panel.closest('.antwar-ux-content'));}); }

export function openPremiumSettings(){ const content=createOverlay('settings','ux.settings.title','ux.settings.subtitle'); settingsTab='general'; renderSettings(content); }

function installCapture(){
  document.addEventListener('click', e => {
    const target = e.target instanceof Element ? e.target : null;
    const roomButton = target?.closest('#create-room-action-btn');
    if (roomButton) { e.preventDefault(); e.stopImmediatePropagation(); openPremiumRoom(); return; }
    const settingsButton = target?.closest('#open-settings-btn');
    if (settingsButton) { e.preventDefault(); e.stopImmediatePropagation(); openPremiumSettings(); return; }
    const friendRow = target?.closest('.friend-dock-row, [data-action="page:chat"]');
    if (friendRow) { e.preventDefault(); e.stopImmediatePropagation(); openPremiumChat(); return; }
    const oldChatClose = target?.closest('#close-desktop-chat-popup-btn');
    if (oldChatClose) { e.preventDefault(); e.stopImmediatePropagation(); openPremiumChat(); return; }
  }, true);
  window.addEventListener('languageChanged', () => { if (!overlay) return; const kind=overlay.dataset.kind; if(kind==='chat'){renderChatMain(overlay.querySelector('.antwar-ux-content'));} if(kind==='room'){renderRoomCreator(overlay.querySelector('.antwar-ux-content'));} if(kind==='settings'){renderSettings(overlay.querySelector('.antwar-ux-content'));} ensureI18nRender(); });
}

export function initPremiumExperience(){
  if (window.ANTWAR_PREMIUM_UI) return window.ANTWAR_PREMIUM_UI;
  installCapture();
  window.ANTWAR_PREMIUM_UI = Object.freeze({ openChat: openPremiumChat, openRoom: openPremiumRoom, openSettings: openPremiumSettings, version: 1 });
  return window.ANTWAR_PREMIUM_UI;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPremiumExperience, { once: true }); else initPremiumExperience();
