// =======================================================
// game-state.js — minimal reactive state container
// =======================================================
import { gameEvents } from './event-bus.js';

const state = {
    connection: { status: 'offline', latency: null },
    session: { inGame: false, matchId: null, roomId: null },
    player: { id: null, name: '', level: 0, gold: 0, gems: 0 },
    room: { id: null, name: '', players: [], maxPlayers: 0, ready: false },
    ui: { page: 'home', modal: null }
};

function clone(value) {
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function getGameState() { return clone(state); }
export function getState(path) {
    return path.split('.').reduce((value, key) => value?.[key], state);
}
export function setState(path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    let target = state;
    parts.forEach(key => { target[key] ||= {}; target = target[key]; });
    const previous = target[last];
    target[last] = value;
    gameEvents.emit('state:changed', { path, value, previous });
    gameEvents.emit(`state:${path}`, { value, previous });
    return value;
}
export function patchState(path, patch) {
    const current = getState(path) || {};
    return setState(path, { ...current, ...patch });
}

window.AntWarGameState = { get: getGameState, getValue: getState, set: setState, patch: patchState };
