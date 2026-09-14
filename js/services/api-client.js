// =======================================================
// api-client.js — centralized HTTP boundary for future backend
// =======================================================

export class ApiError extends Error {
    constructor(message, status = 0, payload = null) {
        super(message); this.name = 'ApiError'; this.status = status; this.payload = payload;
    }
}

export function createApiClient(baseUrl = '') {
    const base = String(baseUrl || '').replace(/\/$/, '');
    return {
        async request(path, options = {}) {
            const response = await fetch(`${base}${path}`, {
                credentials: 'include',
                headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
                ...options,
                body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
            });
            const type = response.headers.get('content-type') || '';
            const payload = type.includes('application/json') ? await response.json() : await response.text();
            if (!response.ok) throw new ApiError(`API request failed: ${response.status}`, response.status, payload);
            return payload;
        },
        get(path, options = {}) { return this.request(path, { ...options, method: 'GET' }); },
        post(path, body, options = {}) { return this.request(path, { ...options, method: 'POST', body }); }
    };
}

export const gameApi = createApiClient(window.ANTWAR_CONFIG?.SERVER?.API_URL || '');
