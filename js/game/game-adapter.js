// =======================================================
// game-adapter.js — stable contract between GUI and AntWar engine
// =======================================================
import { gameEvents } from '../core/event-bus.js';
import { setState, patchState } from '../core/game-state.js';

export const GameAdapter = {
    isAvailable() { return !!window.game; },
    start(mode = 'normal', options = {}) {
        const payload = { gamemode: mode, ...options };
        if (!window.game) {
            gameEvents.emit('game:error', { code: 'ENGINE_NOT_READY', payload });
            return false;
        }
        try {
            setState('session.inGame', true);
            if (payload.isSingleplayer && typeof window.game.startSingleplayer === 'function') {
                window.game.startSingleplayer(!!payload.isTutorial, !!payload.isSandbox);
            } else if (typeof window.game.play === 'function') {
                window.game.play(null, payload);
            } else {
                throw new Error('AntWar engine does not expose play/startSingleplayer');
            }
            gameEvents.emit('game:started', payload);
            return true;
        } catch (error) {
            gameEvents.emit('game:error', { error, payload });
            return false;
        }
    },
    exit() {
        try { window.game?.exitGame?.(); } finally {
            setState('session.inGame', false);
            patchState('session', { matchId: null, roomId: null });
            gameEvents.emit('game:ended');
        }
    },
    on(event, handler) { return gameEvents.on(event, handler); }
};

window.AntWarGameAdapter = GameAdapter;
