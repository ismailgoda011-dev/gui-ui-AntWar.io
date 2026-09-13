// =======================================================
// game-contract.js — explicit contract for direct AntWar integration
// =======================================================

export const GAME_CONTRACT_VERSION = 3;

export const GAME_CONTRACT = Object.freeze({
  required: ['play', 'exitGame'],
  optional: [
    'startSingleplayer', 'getState', 'getPlayer', 'getRoom', 'getMatch',
    'getInventory', 'getConnection', 'joinRoom', 'leaveRoom', 'setReady',
    'matchmake', 'cancelMatchmaking', 'on', 'off'
  ],
  events: [
    'state:changed', 'player:changed', 'room:changed', 'match:changed',
    'inventory:changed', 'connection:changed', 'game:started', 'game:ended',
    'game:error', 'room:joined', 'room:left', 'player:ready', 'match:found'
  ]
});

const FN = name => typeof window.game?.[name] === 'function';

export function validateGameEngine(engine = window.game) {
  if (!engine) return { ok: false, missing: [...GAME_CONTRACT.required], optional: [] };
  const missing = GAME_CONTRACT.required.filter(name => typeof engine[name] !== 'function');
  const available = GAME_CONTRACT.optional.filter(FN);
  return { ok: missing.length === 0, missing, available, version: GAME_CONTRACT_VERSION };
}

export function getEngineCapabilities(engine = window.game) {
  if (!engine) return Object.freeze({ available: false });
  return Object.freeze({
    available: true,
    ...Object.fromEntries([...GAME_CONTRACT.required, ...GAME_CONTRACT.optional].map(name => [name, typeof engine[name] === 'function']))
  });
}
