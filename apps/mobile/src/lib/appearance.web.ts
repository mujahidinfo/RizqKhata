import { secureStorage } from '@/lib/secure-storage';

/**
 * Light/dark override for the web build. On iOS/Android `Appearance.setColorScheme`
 * switches the whole native UI (appearance.ts); react-native-web has no such
 * switch, so the browser build keeps the choice here and `useColorScheme()`
 * (hooks/use-color-scheme.web.ts) reads it. With nothing saved the app
 * follows the system setting.
 */
const KEY = 'genpos.colorScheme';

type Choice = 'light' | 'dark';

let override: Choice | null = null;
const listeners = new Set<() => void>();

function apply(next: Choice | null) {
  override = next;
  // Native form controls and scrollbars follow the chosen scheme too.
  if (typeof document !== 'undefined') document.documentElement.style.colorScheme = next ?? 'light dark';
  listeners.forEach((listener) => listener());
}

export function subscribeColorScheme(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getColorSchemeOverride = () => override;

export async function restoreColorScheme() {
  try {
    const saved = await secureStorage.get(KEY);
    if (saved === 'light' || saved === 'dark') apply(saved);
  } catch {
    // No saved choice: keep following the system.
  }
}

export function setColorSchemeChoice(choice: Choice) {
  apply(choice);
  void secureStorage.set(KEY, choice);
}

/** Drop the override and follow the system setting again. */
export function followSystemColorScheme() {
  apply(null);
  void secureStorage.remove(KEY);
}
