/** Shared app configuration */
import { ImageSourcePropType } from 'react-native';

/** Bundled hero art — works offline */
export const HERO_IMAGE: ImageSourcePropType = require('@/assets/hero.jpg');

/** Legacy CDN fallback if local asset missing in dev */
export const HERO_IMAGE_URI =
  'https://images.pexels.com/photos/13316865/pexels-photo-13316865.jpeg?auto=compress&cs=tinysrgb&w=1260';

/** User-facing message when online backend URL is missing or invalid. */
export const BACKEND_CONFIG_MESSAGE =
  'Online play is not configured. Set EXPO_PUBLIC_BACKEND_URL in .env and restart the app.';

const rawBackendUrl = (process.env.EXPO_PUBLIC_BACKEND_URL ?? '').trim();

/** True when a non-empty backend base URL is present. */
export function isBackendConfigured(): boolean {
  return rawBackendUrl.length > 0;
}

/** Normalized HTTP base URL, or empty string when unset. */
export const BACKEND_HTTP = isBackendConfigured() ? rawBackendUrl.replace(/\/$/, '') : '';

/** WebSocket base URL derived from BACKEND_HTTP, or empty when unset. */
export const BACKEND_WS = BACKEND_HTTP ? BACKEND_HTTP.replace(/^http/, 'ws') : '';

/** Max content width for tablets / large phones */
export const CONTENT_MAX_WIDTH = 520;

export const FETCH_TIMEOUT_MS = 8000;
