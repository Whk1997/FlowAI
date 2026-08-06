import { apiFetch } from './api';
import { getAccessToken, refreshSession, clearTokens } from './auth';

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
    clearTokens();
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
      clearTokens();
      throw error;
    }

    return apiFetch<T>(path, {
      ...options,
      accessToken: refreshed.accessToken,
    });
  }
}
