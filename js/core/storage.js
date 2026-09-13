const PREFIX = 'antwar.gui.';

export function readStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

export function writeStorage(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch { return false; }
}

export function removeStorage(key) {
  try { localStorage.removeItem(PREFIX + key); } catch {}
}
