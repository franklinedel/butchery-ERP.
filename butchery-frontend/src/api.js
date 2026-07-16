// Single place that knows the backend's address AND handles auth.
// Every screen imports from here instead of hardcoding the URL
// or manually attaching tokens.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export function getToken() {
    return localStorage.getItem('butchery_token');
}

export function getUser() {
    const raw = localStorage.getItem('butchery_user');
    return raw ? JSON.parse(raw) : null;
}

export function setSession(token, user) {
    localStorage.setItem('butchery_token', token);
    localStorage.setItem('butchery_user', JSON.stringify(user));
}

export function clearSession() {
    localStorage.removeItem('butchery_token');
    localStorage.removeItem('butchery_user');
}

function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(username, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setSession(data.token, data.user);
    return data.user;
}

export async function apiGet(path) {
    const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
    if (res.status === 401) { clearSession(); window.location.reload(); }
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
}

export async function apiPost(path, body) {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
    });
    if (res.status === 401) { clearSession(); window.location.reload(); }
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed: ${res.status}`);
    }
    return res.json();
}

export async function apiPatch(path) {
    const res = await fetch(`${API_URL}${path}`, { method: 'PATCH', headers: authHeaders() });
    if (res.status === 401) { clearSession(); window.location.reload(); }
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
}