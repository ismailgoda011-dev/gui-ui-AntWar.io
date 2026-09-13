// Safe DOM helpers. Backend/game data must never be interpolated into HTML.
export function el(tag, { className = '', text = '', attrs = {}, children = [] } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  });
  children.filter(Boolean).forEach(child => node.append(child));
  return node;
}

export function setText(node, value) {
  if (node) node.textContent = value == null ? '' : String(value);
  return node;
}

export function clear(node) {
  if (!node) return;
  while (node.firstChild) node.firstChild.remove();
}

export function safeUrl(value, fallback = '') {
  try {
    const url = new URL(String(value), window.location.href);
    if (url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'data:') return url.href;
  } catch {}
  return fallback;
}
