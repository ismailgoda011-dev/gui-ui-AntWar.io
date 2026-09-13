// =======================================================
// game-state.js — GUI runtime state for direct AntWar integration
// =======================================================

import { gameEvents } from './event-bus.js';

const state = {
    connection: { status: 'offline', latency: null, server: null, lastError: null },
    session: { inGame: false, matchId: null, roomId: null, mode: 'normal', phase: 'idle' },
    player: { id: null, name: '', level: 0, xp: 0, gold: 0, gems: 0, health: null, maxHealth: null, avatar: null },
    room: { id: null, name: '', players: [], maxPlayers: 0, ready: false, status: 'idle' },
    match: { id: null, time: null, score: null, team: null, status: 'idle' },
    inventory: { items: [], equipped: {}, updatedAt: 0 },
    ui: { page: 'home', modal: null, performanceMode: 'auto', reducedMotion: false },
    meta: { version: 2, updatedAt: 0 }
};

const clone = value => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
};

function resolvePath(path) {
    return String(path).split('.').filter(Boolean);
}

export function getGameState() { return clone(state); }

export function getState(path, fallback = undefined) {
    const value = resolvePath(path).reduce((obj, key) => obj == null ? undefined : obj[key], state);
    return value === undefined ? fallback : value;
}

export function setState(path, value) {
    const keys = resolvePath(path);
    if (!keys.length) return false;
    let target = state;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]] || typeof target[keys[i]] !== 'object') target[keys[i]] = {};
        target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    state.meta.updatedAt = Date.now();
    gameEvents.emit('state:changed', { path, value: clone(value), state: getGameState() });
    gameEvents.emit(`state:${path}`, clone(value));
    return true;
}

export function patchState(path, patch) {
    const current = getState(path, {});
    if (!current || typeof current !== 'object' || Array.isArray(current)) return setState(path, patch);
    return setState(path, { ...current, ...patch });
}

export function resetGameState() {
    const fresh = {
        connection: { status: 'offline', latency: null, server: null, lastError: null },
        session: { inGame: false, matchId: null, roomId: null, mode: 'normal', phase: 'idle' },
        player: { id: null, name: '', level: 0, xp: 0, gold: 0, gems: 0, health: null, maxHealth: null, avatar: null },
        room: { id: null, name: '', players: [], maxPlayers: 0, ready: false, status: 'idle' },
        match: { id: null, time: null, score: null, team: null, status: 'idle' },
        inventory: { items: [], equipped: {}, updatedAt: 0 },
        ui: { page: 'home', modal: null, performanceMode: 'auto', reducedMotion: false },
        meta: { version: 2, updatedAt: Date.now() }
    };
    Object.keys(state).forEach(key => { state[key] = fresh[key]; });
    gameEvents.emit('state:reset', getGameState());
}
