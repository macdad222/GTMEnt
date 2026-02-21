/**
 * Centralized API utility with JWT token management.
 * All API calls should use these helpers instead of raw fetch.
 */

const TOKEN_KEY = 'gtm_jwt_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = { ...authHeaders(), ...(options.headers as Record<string, string> || {}) };
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    localStorage.removeItem('gtm_user_session');
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/gate')) {
      window.location.href = '/gate';
    }
  }
  return response;
}

export async function apiGet(url: string): Promise<Response> {
  return apiFetch(url, { method: 'GET' });
}

export async function apiPost(url: string, body?: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut(url: string, body?: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete(url: string): Promise<Response> {
  return apiFetch(url, { method: 'DELETE' });
}
