// =======================================================
// runtime.js — Direct AntWar GUI runtime bootstrap
// The GUI is the frontend shell. No mock engine is required.
// =======================================================

import { GameAdapter } from '../game/game-adapter.js';
import { gameEvents } from './event-bus.js';
import { getState, patchState } from './game-state.js';
import { applyPerformanceMode } from './performance.js';

let started = false;

function detectReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function syncEngineSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    const player = snapshot.player || snapshot.user;
    const room = snapshot.room;
    const match = snapshot.match || snapshot.game;
    if (player) patchState('player', player);
    if (room) patchState('room', room);
    if (match) patchState('match', match);
    if (snapshot.connection) patchState('connection', snapshot.connection);
}

function bindEngineEvents() {
    const bridge = window.ANTWAR_ENGINE_EVENTS || window.antwarEngineEvents;
    if (!bridge) return;

    const names = ['state:changed', 'player:changed', 'room:changed', 'match:changed', 'connection:changed', 'game:started', 'game:ended', 'game:error'];
    const subscribe = typeof bridge.on === 'function' ? bridge.on.bind(bridge) : null;
    if (!subscribe) return;

    names.forEach(name => {
        try { subscribe(name, payload => { syncEngineSnapshot(payload?.state || payload); gameEvents.emit(name, payload); }); } catch (_) {}
    });
}

function bindDirectGameControls() {
    // This capture handler intentionally bypasses the prototype matchmaking modal.
    // The real AntWar engine becomes the authority for starting a game.
    document.addEventListener('click', event => {
        const play = event.target.closest?.('#play-action-btn');
        if (!play || !GameAdapter.isAvailable()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const mode = play.getAttribute('data-game-mode') || 'normal';
        GameAdapter.start(mode, { source: 'gui', direct: true });
    }, true);

    document.addEventListener('click', event => {
        const exit = event.target.closest?.('[data-game-exit], #game-exit-btn');
        if (!exit || !GameAdapter.isAvailable()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        GameAdapter.exit();
    }, true);
}

export function initRuntime() {
    if (started) return;
    started = true;
    const reducedMotion = detectReducedMotion();
    patchState('ui.reducedMotion', reducedMotion);
    applyPerformanceMode(reducedMotion ? 'low' : 'auto');
    bindEngineEvents();
    bindDirectGameControls();

    window.AntWarRuntime = {
        version: 2,
        directIntegration: true,
        engineAvailable: () => GameAdapter.isAvailable(),
        state: () => getState(''),
        start: (mode, options) => GameAdapter.start(mode, options),
        exit: () => GameAdapter.exit()
    };

    gameEvents.emit('runtime:ready', { engineAvailable: GameAdapter.isAvailable() });
}
