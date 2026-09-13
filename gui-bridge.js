// =======================================================
// gui-bridge.js — optional AntWar integration adapter
// =======================================================
// This file is intentionally dormant until the real game engine sets:
//   window.ANTWAR_GAME_ENGINE = true
// It can therefore ship with the GUI without changing standalone/demo mode.

(function () {
    'use strict';

    if (!window.ANTWAR_GAME_ENGINE) {
        console.info('[AntWar GUI Bridge] Standalone GUI mode — bridge dormant.');
        return;
    }

    const API_BASE = (window.ANTWAR_CONFIG?.SERVER?.API_URL || window.location.origin).replace(/\/$/, '');
    const BridgeState = {
        inGame: false,
        selectedMode: 'normal',
        selectedRegion: 'me',
        playerName: ''
    };

    const I18n = () => window.AntWarI18n?.t || ((key) => key);

    function getPlayerName() {
        const hudNameEl = document.getElementById('player-name-text');
        if (hudNameEl?.textContent.trim()) return hudNameEl.textContent.trim();
        try { return localStorage.getItem('name') || localStorage.getItem('antwar_user_name') || I18n()('game.defaultPlayer'); }
        catch { return I18n()('game.defaultPlayer'); }
    }

    function safeText(value) {
        return document.createTextNode(String(value ?? ''));
    }

    async function apiGet(path) {
        const response = await fetch(`${API_BASE}${path}`, { credentials: 'include', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`API ${response.status}`);
        return response.json();
    }

    async function syncServerStats() {
        try {
            const data = await apiGet('/gameStats');
            document.getElementById('server-players-count')?.replaceChildren(safeText(Number(data.playerCount || 0).toLocaleString()));
            document.getElementById('server-rooms-count')?.replaceChildren(safeText(Number(data.gameCount || 0).toLocaleString()));
        } catch (error) { console.debug('[GUI Bridge] Server stats unavailable:', error.message); }
    }

    async function syncLeaderboard() {
        try {
            const data = await apiGet('/leaderboard');
            const list = Array.isArray(data.leaderboard) ? data.leaderboard.slice(0, 5) : [];
            const dockList = document.getElementById('leaderboard-dock-list');
            if (!dockList) return;
            dockList.replaceChildren(...list.map((user, index) => {
                const row = document.createElement('div');
                row.className = 'rank-item-row flex items-center justify-between p-1.5 rounded-lg bg-black/40 hover:bg-white/10 transition-colors cursor-pointer border border-[#BC4526]/20';
                const left = document.createElement('div'); left.className = 'flex items-center gap-2';
                const rank = document.createElement('span'); rank.className = `w-5 text-center font-black text-xs ${index === 0 ? 'text-[#FFD875]' : index === 1 ? 'text-white' : 'text-[#BC4526]'}`; rank.textContent = `#${index + 1}`;
                const name = document.createElement('span'); name.className = 'text-xs font-bold text-white truncate max-w-[110px]'; name.textContent = user.name || I18n()('game.defaultPlayer');
                const xp = document.createElement('span'); xp.className = 'text-[11px] font-black text-[#FFD875]'; xp.textContent = `${Number(user.xp || 0).toLocaleString()} XP`;
                left.append(rank, name); row.append(left, xp); return row;
            }));
        } catch (error) { console.debug('[GUI Bridge] Leaderboard unavailable:', error.message); }
    }

    function closeGuiLayers() {
        window.closeAllModals?.();
        document.querySelectorAll('.full-page-view.active').forEach(page => page.classList.remove('active'));
        document.body.classList.remove('fullpage-open');
    }

    function launchGame(gamemode = 'normal', customOptions = {}) {
        const adapter = window.AntWarGameAdapter;
        if (!adapter) { console.error('[GUI Bridge] GameAdapter is unavailable.'); return false; }

        BridgeState.playerName = getPlayerName();
        BridgeState.inGame = true;
        const options = { playerName: BridgeState.playerName, regionCode: BridgeState.selectedRegion, gamemode, ...customOptions };
        closeGuiLayers();
        document.getElementById('main-app-container')?.classList.add('in-game-hidden');
        document.getElementById('ambient-overlay')?.style.setProperty('display', 'none');
        document.getElementById('ambient-particles-canvas')?.style.setProperty('display', 'none');
        document.getElementById('antwar-ingame-hud')?.classList.remove('hidden');
        return adapter.start(gamemode, options);
    }

    function returnToLobby() {
        BridgeState.inGame = false;
        document.getElementById('main-app-container')?.classList.remove('in-game-hidden');
        document.getElementById('ambient-overlay')?.style.removeProperty('display');
        document.getElementById('ambient-particles-canvas')?.style.removeProperty('display');
        document.getElementById('antwar-ingame-hud')?.classList.add('hidden');
        window.AntWarGameAdapter?.exit();
    }

    function createInGameHud() {
        if (document.getElementById('antwar-ingame-hud')) return;
        const hud = document.createElement('div');
        hud.id = 'antwar-ingame-hud';
        hud.className = 'fixed top-3 right-3 z-[150] hidden flex items-center gap-2 select-none';
        hud.innerHTML = `<button id="ingame-settings-btn" class="w-10 h-10 rounded-full bg-black/70 hover:bg-[#BC4526] border-2 border-[#FFD875] text-[#FFD875] hover:text-white flex items-center justify-center text-sm shadow-xl transition-all cursor-pointer hover:scale-110" type="button"><i class="fa-solid fa-gear"></i></button><button id="ingame-surrender-btn" class="px-3 py-1.5 rounded-full bg-[#7E2025]/90 hover:bg-[#66180F] border-2 border-white/80 text-white font-black text-xs shadow-xl transition-all cursor-pointer hover:scale-105" type="button"><i class="fa-solid fa-arrow-right-from-bracket mr-1"></i><span data-i18n="actions.surrender">انسحاب</span></button>`;
        document.body.appendChild(hud);
        hud.querySelector('#ingame-settings-btn')?.addEventListener('click', () => window.openModal?.('settings'));
        hud.querySelector('#ingame-surrender-btn')?.addEventListener('click', () => {
            const message = I18n()('confirm.surrender');
            if (window.confirm(message)) returnToLobby();
        });
    }

    function attachEventListeners() {
        createInGameHud();
        document.addEventListener('click', event => {
            const modeBtn = event.target.closest('[data-gamemode]');
            if (!modeBtn) return;
            const mode = modeBtn.getAttribute('data-gamemode');
            launchGame(mode || 'normal', mode === 'tutorial' ? { isSingleplayer: true, isTutorial: true } : mode === 'sandbox' ? { isSingleplayer: true, isSandbox: true } : {});
        });
        window.AntWarGameAdapter?.on('game:ended', returnToLobby);
        syncServerStats(); syncLeaderboard();
        setInterval(syncServerStats, 10000); setInterval(syncLeaderboard, 30000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachEventListeners, { once: true });
    else attachEventListeners();

    window.AntWarBridge = { state: BridgeState, launchGame, returnToLobby, syncServerStats, syncLeaderboard };
})();
