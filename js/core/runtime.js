// =======================================================
// runtime.js — Direct AntWar GUI runtime bootstrap
// =======================================================

import { GameAdapter } from '../game/game-adapter.js';
import { gameEvents } from './event-bus.js';
import { getGameState, patchState } from './game-state.js';
import { initPerformanceManager, setPerformanceMode } from './performance-manager.js';

let started = false;

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
  ['state:changed','player:changed','room:changed','match:changed','connection:changed','game:started','game:ended','game:error']
    .forEach(name => { try { bridge.on(name, payload => { syncEngineSnapshot(payload?.state || payload); gameEvents.emit(name, payload); }); } catch {} });
}

function bindDirectGameControls() {
  document.addEventListener('click', event => {
    const play = event.target.closest?.('#play-action-btn');
    if (!play || !GameAdapter.isAvailable()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    GameAdapter.start(play.getAttribute('data-game-mode') || 'normal', { source: 'gui', direct: true });
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
  const performance = initPerformanceManager();
  patchState('ui.reducedMotion', window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true);
  setPerformanceMode(patchState ? 'auto' : 'auto');
  bindEngineEvents();
  bindDirectGameControls();
  window.AntWarRuntime = Object.freeze({
    version: 3,
    directIntegration: true,
    engineAvailable: () => GameAdapter.isAvailable(),
    getState: () => getGameState(),
    start: (mode, options) => GameAdapter.start(mode, options),
    exit: () => GameAdapter.exit(),
    performance
  });
  gameEvents.emit('runtime:ready', { engineAvailable: GameAdapter.isAvailable() });
}
