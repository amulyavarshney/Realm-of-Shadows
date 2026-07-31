/** Shared app configuration */
export const HERO_IMAGE_URI =
  'https://images.pexels.com/photos/13316865/pexels-photo-13316865.jpeg';

export const BACKEND_HTTP = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

export const BACKEND_WS = BACKEND_HTTP.replace(/^http/, 'ws');

/** Max content width for tablets / large phones */
export const CONTENT_MAX_WIDTH = 520;

export const FETCH_TIMEOUT_MS = 8000;
