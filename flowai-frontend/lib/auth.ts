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

const AUTH_PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

let redirectingToLogin = false;

/** Access / Refresh 均失效时：清 token 并跳转登录页 */
export function redirectToLogin() {
  clearTokens();
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (AUTH_PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    return;
  }
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  // 用整页跳转，避免各页面只 toast 错误却停留在受保护路由
  window.location.replace('/login');
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
    if (!refreshed?.accessToken) return null;
    try {
      return await apiFetch<User>('/auth/me', {
        accessToken: refreshed.accessToken,
      });
    } catch {
      clearTokens();
      return null;
    }
  }
}

async function withAccessToken<T>(fn: (accessToken: string) => Promise<T>) {
  let accessToken = getAccessToken();
  if (!accessToken) {
    const refreshed = await refreshSession();
    accessToken = refreshed?.accessToken ?? null;
  }
  if (!accessToken) {
    redirectToLogin();
    throw new Error('Not authenticated');
  }

  try {
    return await fn(accessToken);
  } catch (err) {
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status: number }).status)
        : 0;
    if (status !== 401) throw err;

    const refreshed = await refreshSession();
    if (!refreshed?.accessToken) {
      redirectToLogin();
      throw err;
    }
    return fn(refreshed.accessToken);
  }
}

export async function updateProfile(input: { name: string }) {
  return withAccessToken((accessToken) =>
    apiFetch<User>('/auth/me', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(input),
    }),
  );
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  return withAccessToken((accessToken) =>
    apiFetch<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(input),
    }),
  );
}

export type ForgotPasswordResponse = {
  message: string;
  resetToken?: string;
  resetPath?: string;
};

export async function forgotPassword(email: string) {
  return apiFetch<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}) {
  return apiFetch<{ success: boolean }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
