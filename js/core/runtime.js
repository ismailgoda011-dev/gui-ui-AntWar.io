// =======================================================
// runtime.js — resilient AntWar GUI runtime bootstrap
// =======================================================

import { GameAdapter } from '../game/game-adapter.js';
import { gameEvents } from './event-bus.js';
import { getGameState, patchState } from './game-state.js';
import { initPerformanceManager } from './performance-manager.js';
import { initErrorBoundary } from './error-boundary.js';

let started = false;
let engineUnsubscribers = [];

function syncEngineSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  if (snapshot.player || snapshot.user) patchState('player', snapshot.player || snapshot.user);
  if (snapshot.room) patchState('room', snapshot.room);
  if (snapshot.match || snapshot.game) patchState('match', snapshot.match || snapshot.game);
  if (snapshot.connection) patchState('connection', snapshot.connection);
}

function bindEngineEvents() {
  const bridge = window.ANTWAR_ENGINE_EVENTS || window.antwarEngineEvents;
  if (!bridge || typeof bridge.on !== 'function') return;
  const names = ['state:changed','player:changed','room:changed','match:changed','connection:changed','game:started','game:ended','game:error'];
  names.forEach(name => {
    try {
      const unsubscribe = bridge.on(name, payload => {
        syncEngineSnapshot(payload?.state || payload);
        gameEvents.emit(name, payload);
      });
      if (typeof unsubscribe === 'function') engineUnsubscribers.push(unsubscribe);
    } catch (error) {
      if (window.ANTWAR_DEBUG === true) console.warn(`[AntWar] failed to bind ${name}`, error);
    }
  });
}

function bindDirectGameControls() {
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const play = target?.closest('#play-action-btn');
    if (!play || !GameAdapter.isAvailable()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    GameAdapter.start(play.getAttribute('data-game-mode') || 'normal', { source: 'gui', direct: true });
  }, true);

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const exit = target?.closest('[data-game-exit], #game-exit-btn');
    if (!exit || !GameAdapter.isAvailable()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    GameAdapter.exit();
  }, true);
}

export function initRuntime() {
  if (started) return window.AntWarRuntime;
  started = true;
  initErrorBoundary();
  const performance = initPerformanceManager();
  patchState('ui.reducedMotion', window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true);
  bindEngineEvents();
  bindDirectGameControls();

  window.addEventListener('beforeunload', () => {
    for (const unsubscribe of engineUnsubscribers.splice(0)) {
      try { unsubscribe(); } catch {}
    }
  }, { once: true });

  window.AntWarRuntime = Object.freeze({
    version: 4,
    directIntegration: true,
    engineAvailable: () => GameAdapter.isAvailable(),
    engineStatus: () => GameAdapter.getStatus(),
    getState: () => getGameState(),
    start: (mode, options) => GameAdapter.start(mode, options),
    exit: () => GameAdapter.exit(),
    performance
  });
  gameEvents.emit('runtime:ready', { engineAvailable: GameAdapter.isAvailable(), version: 4 });
  return window.AntWarRuntime;
}
