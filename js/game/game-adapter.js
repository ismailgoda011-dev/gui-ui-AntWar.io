// =======================================================
// game-adapter.js — single boundary between GUI and AntWar engine
// =======================================================

import { gameEvents } from '../core/event-bus.js';
import { setState, patchState } from '../core/game-state.js';
import { GAME_CONTRACT, validateGameEngine } from './game-contract.js';

const engine = () => window.game || null;

export const GameAdapter = {
    contract: GAME_CONTRACT,

    isAvailable() {
        return validateGameEngine(engine()).ok;
    },

    getStatus() {
        const check = validateGameEngine(engine());
        return { ...check, available: check.ok };
    },

    start(mode = 'normal', options = {}) {
        const payload = { gamemode: mode, ...options };
        const game = engine();
        if (!game) {
            gameEvents.emit('game:error', { code: 'ENGINE_NOT_READY', payload });
            return false;
        }
        try {
            setState('session.inGame', true);
            setState('session.mode', mode);
            setState('session.phase', 'starting');
            if (payload.isSingleplayer && typeof game.startSingleplayer === 'function') {
                game.startSingleplayer(!!payload.isTutorial, !!payload.isSandbox);
            } else if (typeof game.play === 'function') {
                game.play(null, payload);
            } else {
                throw new Error('AntWar engine does not expose play/startSingleplayer');
            }
            setState('session.phase', 'playing');
            gameEvents.emit('game:started', payload);
            return true;
        } catch (error) {
            patchState('connection', { status: 'error', lastError: error?.message || String(error) });
            setState('session.inGame', false);
            setState('session.phase', 'idle');
            gameEvents.emit('game:error', { error, payload });
            return false;
        }
    },

    exit() {
        try { engine()?.exitGame?.(); }
        finally {
            setState('session.inGame', false);
            patchState('session', { matchId: null, roomId: null, phase: 'idle' });
            patchState('match', { id: null, status: 'idle' });
            gameEvents.emit('game:ended');
        }
    },

    getState() { return engine()?.getState?.() ?? null; },
    getPlayer() { return engine()?.getPlayer?.() ?? null; },
    getRoom() { return engine()?.getRoom?.() ?? null; },
    getMatch() { return engine()?.getMatch?.() ?? null; },

    on(event, handler) { return gameEvents.on(event, handler); },
    off(event, handler) { return gameEvents.off?.(event, handler); }
};

window.AntWarGameAdapter = GameAdapter;
