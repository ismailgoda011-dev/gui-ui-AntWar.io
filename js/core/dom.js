// =======================================================
// dom.js — safe DOM primitives
// =======================================================

export function el(tag, { className = '', text, attrs = {}, children = [] } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'class') node.className = String(value);
    else node.setAttribute(key, String(value));
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

export function safeUrl(value, fallback = '', { allowData = false } = {}) {
  try {
    const url = new URL(String(value), window.location.href);
    const allowed = allowData
      ? ['https:', 'http:', 'data:']
      : ['https:', 'http:'];
    return allowed.includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

export function safeAssetUrl(value, fallback = 'img/ant1.png') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^(?:https?:)?\/\//i.test(raw)) return safeUrl(raw, fallback);
  if (raw.startsWith('data:') || raw.startsWith('javascript:')) return fallback;
  return raw;
}

export function button({ id, className = '', label = '', title = '', action = '', children = [] } = {}) {
  return el('button', {
    className,
    attrs: {
      ...(id ? { id } : {}),
      ...(title ? { title } : {}),
      ...(action ? { 'data-action': action } : {}),
      type: 'button'
    },
    children: [
      ...(label ? [el('span', { text: label })] : []),
      ...children
    ]
  });
}
