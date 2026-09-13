import { playSound } from '../audio.js';

export class ModalManager {
  constructor(root = document.getElementById('modal-root')) {
    this.root = root;
    this.instances = new Map();
    this.zIndex = 100;
  }

  register(id, template) { if (id && template) this.instances.set(id, { template, element: null }); }
  get(id) { return this.instances.get(id)?.element || null; }

  open(id) {
    const record = this.instances.get(id);
    if (!record || !this.root) return false;
    if (record.element?.classList.contains('active')) return this.close(id);
    const tpl = record.template;
    if (!record.element) {
      const backdrop = document.createElement('div');
      backdrop.id = `modal-${id}`;
      backdrop.className = 'game-modal-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.addEventListener('click', e => { if (e.target === backdrop) this.close(id); });
      record.element = backdrop;
      this.root.append(backdrop);
    }
    const body = record.element;
    while (body.firstChild) body.firstChild.remove();
    const content = tpl.render ? tpl.render() : null;
    if (content instanceof Node) body.append(content);
    else if (content != null) body.textContent = String(content);
    if (typeof tpl.mount === 'function') tpl.mount(body, record.element);
    record.element.style.zIndex = String(++this.zIndex);
    record.element.classList.add('active');
    document.body.classList.add('modal-open');
    playSound?.('pop');
    tpl.onOpen?.(body, record.element);
    return true;
  }

  close(id) {
    const record = this.instances.get(id);
    if (!record?.element) return false;
    record.template.onClose?.(record.element);
    record.element.classList.remove('active');
    if (!document.querySelector('.game-modal-backdrop.active')) document.body.classList.remove('modal-open');
    playSound?.('close');
    return true;
  }

  closeAll() { [...this.instances.keys()].forEach(id => this.close(id)); }
  destroy(id) {
    const record = this.instances.get(id);
    record?.template.onDestroy?.(record.element);
    record?.element?.remove();
    this.instances.delete(id);
  }
}
