// =======================================================
// game-contract.js — explicit integration contract
// =======================================================

export const GAME_CONTRACT_VERSION = 2;

export const GAME_CONTRACT = Object.freeze({
    required: ['play', 'exitGame'],
    optional: [
        'startSingleplayer', 'getState', 'getPlayer', 'getRoom', 'getMatch',
        'on', 'off', 'joinRoom', 'leaveRoom', 'setReady'
    ],
    events: [
        'state:changed', 'player:changed', 'room:changed', 'match:changed',
        'connection:changed', 'game:started', 'game:ended', 'game:error'
    ]
});

export function validateGameEngine(engine = window.game) {
    if (!engine) return { ok: false, missing: GAME_CONTRACT.required };
    const missing = GAME_CONTRACT.required.filter(name => typeof engine[name] !== 'function');
    return { ok: missing.length === 0, missing };
}
