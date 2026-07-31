describe('backend config helpers', () => {
  const original = process.env.EXPO_PUBLIC_BACKEND_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.EXPO_PUBLIC_BACKEND_URL;
    } else {
      process.env.EXPO_PUBLIC_BACKEND_URL = original;
    }
    jest.resetModules();
  });

  it('isBackendConfigured is false when env is empty', async () => {
    process.env.EXPO_PUBLIC_BACKEND_URL = '';
    const { isBackendConfigured, BACKEND_HTTP } = await import('@/src/config');
    expect(isBackendConfigured()).toBe(false);
    expect(BACKEND_HTTP).toBe('');
  });

  it('strips trailing slash from backend URL', async () => {
    process.env.EXPO_PUBLIC_BACKEND_URL = 'https://api.example.com/';
    const { BACKEND_HTTP, BACKEND_WS, isBackendConfigured } = await import('@/src/config');
    expect(isBackendConfigured()).toBe(true);
    expect(BACKEND_HTTP).toBe('https://api.example.com');
    expect(BACKEND_WS).toBe('wss://api.example.com');
  });

  it('apiFetch throws BackendNotConfiguredError when unset', async () => {
    delete process.env.EXPO_PUBLIC_BACKEND_URL;
    const { apiFetch, BackendNotConfiguredError } = await import('@/src/api');
    const { BACKEND_CONFIG_MESSAGE } = await import('@/src/config');
    await expect(apiFetch('/api/health')).rejects.toThrow(BackendNotConfiguredError);
    await expect(apiFetch('/api/health')).rejects.toThrow(BACKEND_CONFIG_MESSAGE);
  });
});
