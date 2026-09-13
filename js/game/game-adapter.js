// =======================================================
// game-adapter.js — single boundary between GUI and AntWar engine
// =======================================================

import { gameEvents } from '../core/event-bus.js';
import { setState, patchState } from '../core/game-state.js';
import { GAME_CONTRACT, validateGameEngine, getEngineCapabilities } from './game-contract.js';

const engine = () => window.game || null;
const call = (name, ...args) => engine()?.[name]?.(...args);

export const GameAdapter = {
  contract: GAME_CONTRACT,
  isAvailable() { return validateGameEngine(engine()).ok; },
  getStatus() { const check = validateGameEngine(engine()); return { ...check, available: check.ok }; },
  getCapabilities() { return getEngineCapabilities(engine()); },

  start(mode='normal', options={}) {
    const payload = { gamemode: mode, ...options };
    const game = engine();
    if (!game || !validateGameEngine(game).ok) {
      gameEvents.emit('game:error', { code:'ENGINE_NOT_READY', payload });
      return false;
    }
    try {
      patchState('session', { inGame:true, mode, phase:'starting' });
      if (payload.isSingleplayer && typeof game.startSingleplayer === 'function') game.startSingleplayer(!!payload.isTutorial, !!payload.isSandbox);
      else game.play(null, payload);
      setState('session.phase', 'playing');
      gameEvents.emit('game:started', payload);
      return true;
    } catch (error) {
      patchState('connection', { status:'error', lastError:error?.message || String(error) });
      patchState('session', { inGame:false, phase:'idle' });
      gameEvents.emit('game:error', { error, payload });
      return false;
    }
  },

  exit() {
    try { call('exitGame'); }
    finally {
      patchState('session', { inGame:false, matchId:null, roomId:null, phase:'idle' });
      patchState('match', { id:null, status:'idle' });
      gameEvents.emit('game:ended');
    }
  },

  getState() { return call('getState') ?? null; },
  getPlayer() { return call('getPlayer') ?? null; },
  getRoom() { return call('getRoom') ?? null; },
  getMatch() { return call('getMatch') ?? null; },
  getInventory() { return call('getInventory') ?? null; },
  getConnection() { return call('getConnection') ?? null; },
  joinRoom(roomId, options={}) { return call('joinRoom', roomId, options); },
  leaveRoom() { return call('leaveRoom'); },
  setReady(ready=true) { return call('setReady', !!ready); },
  matchmake(options={}) { return call('matchmake', options); },
  cancelMatchmaking() { return call('cancelMatchmaking'); },
  on(event, handler) { return gameEvents.on(event, handler); },
  off(event, handler) { return gameEvents.off?.(event, handler); }
};

window.AntWarGameAdapter = GameAdapter;
