// =======================================================
// event-bus.js — framework-agnostic GUI/Game event bus
// =======================================================
export class EventBus {
    #listeners = new Map();
    on(event, handler) {
        if (typeof handler !== 'function') return () => {};
        const set = this.#listeners.get(event) || new Set();
        set.add(handler); this.#listeners.set(event, set);
        return () => this.off(event, handler);
    }
    once(event, handler) {
        const off = this.on(event, (...args) => { off(); handler(...args); });
        return off;
    }
    off(event, handler) { this.#listeners.get(event)?.delete(handler); }
    emit(event, payload) { this.#listeners.get(event)?.forEach(handler => handler(payload)); }
    clear(event) { event ? this.#listeners.delete(event) : this.#listeners.clear(); }
}

export const gameEvents = new EventBus();
