import Constants from 'expo-constants';

/**
 * Base URL of the Rizq Khata API (apps/api).
 *
 * Set EXPO_PUBLIC_API_URL for real deployments. In development we fall back to the
 * machine running Metro (from `hostUri`), so a phone on the same Wi-Fi or an
 * emulator reaches the API without any config.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // A release build without an API address would quietly talk to localhost.
  if (!__DEV__) throw new Error('EXPO_PUBLIC_API_URL is not set for this build');

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${devHost ?? 'localhost'}:4000/api/v1`;
}

export const API_URL = resolveApiUrl();
