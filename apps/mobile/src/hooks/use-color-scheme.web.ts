import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { getColorSchemeOverride, subscribeColorScheme } from '@/lib/appearance';

/**
 * The browser build's colour scheme: the light/dark choice from the theme
 * toggle (lib/appearance.web.ts) when there is one, otherwise the system's.
 * The server snapshot is 'light' so static rendering stays stable.
 */
export function useColorScheme() {
  const system = useRNColorScheme();
  const override = useSyncExternalStore(subscribeColorScheme, getColorSchemeOverride, () => null);
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!hydrated) return 'light';
  return override ?? system;
}

const noopSubscribe = () => () => {};
