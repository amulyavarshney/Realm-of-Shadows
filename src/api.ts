import { BACKEND_HTTP, BACKEND_CONFIG_MESSAGE, FETCH_TIMEOUT_MS, isBackendConfigured } from '@/src/config';

/** Thrown when EXPO_PUBLIC_BACKEND_URL is missing — callers should show BACKEND_CONFIG_MESSAGE. */
export class BackendNotConfiguredError extends Error {
  constructor() {
    super(BACKEND_CONFIG_MESSAGE);
    this.name = 'BackendNotConfiguredError';
  }
}

/** Low-latency fetch with abort timeout */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!isBackendConfigured()) {
    throw new BackendNotConfiguredError();
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${BACKEND_HTTP}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}
