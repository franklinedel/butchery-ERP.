// Single place that knows the backend's address.
// Every screen imports from here instead of hardcoding the URL,
// so switching between local dev and a real server later is one change.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function apiGet(path) {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
}

export async function apiPost(path, body) {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed: ${res.status}`);
    }
    return res.json();
}
