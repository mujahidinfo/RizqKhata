import { Appearance } from 'react-native';

import { secureStorage } from '@/lib/secure-storage';

const KEY = 'genpos.colorScheme';

type Choice = 'light' | 'dark';

/**
 * Light/dark override. `Appearance.setColorScheme` sets the native interface
 * style, so headers, NativeTabs, the status bar and `useColorScheme()` all
 * follow it. With nothing saved the app follows the system setting.
 */
export async function restoreColorScheme() {
  try {
    const saved = await secureStorage.get(KEY);
    if (saved === 'light' || saved === 'dark') Appearance.setColorScheme?.(saved);
  } catch {
    // No saved choice: keep following the system.
  }
}

export function setColorSchemeChoice(choice: Choice) {
  Appearance.setColorScheme?.(choice);
  void secureStorage.set(KEY, choice);
}

/** Drop the override and follow the system setting again. */
export function followSystemColorScheme() {
  Appearance.setColorScheme?.('unspecified');
  void secureStorage.remove(KEY);
}

/*
 * The web build keeps its own override (appearance.web.ts) and its
 * useColorScheme() reads it through these two. Natively the OS holds the
 * choice, so there is nothing to subscribe to.
 */
export const subscribeColorScheme = (_listener: () => void) => () => {};
export const getColorSchemeOverride = (): 'light' | 'dark' | null => null;
