import { useWindowDimensions } from 'react-native';

import { WideLayout } from '@/constants/theme';

/**
 * True only in a desktop-width browser (the app's web build on a laptop or a
 * counter PC). Always false on iOS and Android, so anything gated on it can
 * never change the phone app.
 */
export function useWideLayout() {
  const { width } = useWindowDimensions();
  return process.env.EXPO_OS === 'web' && width >= WideLayout.breakpoint;
}
