import { apiFetch } from './api';
import {
  getAccessToken,
  refreshSession,
  redirectToLogin,
} from './auth';

export async function authFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
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
    return await apiFetch<T>(path, { ...options, accessToken });
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'status' in error
        ? Number((error as { status: number }).status)
        : 0;

    if (status !== 401) {
      throw error;
    }

    const refreshed = await refreshSession();
    if (!refreshed?.accessToken) {
      redirectToLogin();
      throw error;
    }

    return apiFetch<T>(path, {
      ...options,
      accessToken: refreshed.accessToken,
    });
  }
}
