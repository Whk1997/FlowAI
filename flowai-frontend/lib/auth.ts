import { apiFetch } from './api';

const ACCESS_KEY = 'flowai_access_token';
const REFRESH_KEY = 'flowai_refresh_token';

export type User = {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
};

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export async function register(input: {
  email: string;
  password: string;
  name?: string;
}) {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function login(input: { email: string; password: string }) {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  try {
    const data = await apiFetch<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    setTokens(data.accessToken, data.refreshToken);
    return data;
  } catch {
    clearTokens();
    return null;
  }
}

export async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore network errors on logout
    }
  }
  clearTokens();
}

export async function fetchMe() {
  let accessToken = getAccessToken();
  if (!accessToken) {
    const refreshed = await refreshSession();
    accessToken = refreshed?.accessToken ?? null;
  }
  if (!accessToken) return null;

  try {
    return await apiFetch<User>('/auth/me', { accessToken });
  } catch {
    const refreshed = await refreshSession();
    if (!refreshed) return null;
    return apiFetch<User>('/auth/me', { accessToken: refreshed.accessToken });
  }
}
