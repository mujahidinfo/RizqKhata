import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { AnimatedSplash } from '@/components/animated-splash';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { restoreColorScheme } from '@/lib/appearance';
import { LanguageProvider } from '@/lib/i18n';
import { installNetworkListeners } from '@/lib/network';
import { persistOptions, queryClient } from '@/lib/query-client';
import '@/lib/web-styles';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();
installNetworkListeners();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = Colors[scheme];

  return (
    // Restores the data saved on the phone, so the app works offline.
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <SessionProvider>
        <LanguageProvider>
          <ThemeProvider
            value={{
              ...base,
              colors: {
                ...base.colors,
                primary: colors.primary,
                background: colors.background,
                // Web: headers sit on the page colour, so in a wide window there's no
                // raised bar ending in hard corners inside the centred column.
                card: process.env.EXPO_OS === 'web' ? colors.background : colors.backgroundElement,
                text: colors.text,
                border: colors.border,
              },
            }}>
            <RootNavigator />
            {/* Drawn last so it covers the app while it loads. */}
            <SplashScreenController />
          </ThemeProvider>
        </LanguageProvider>
      </SessionProvider>
    </PersistQueryClientProvider>
  );
}

/**
 * The native splash stays up until the saved light/dark choice is applied (so
 * the animated splash starts in the right colours). Then the animated splash
 * takes over and plays until the session check is done.
 */
function SplashScreenController() {
  const { status } = useSession();
  const [schemeReady, setSchemeReady] = useState(false);

  useEffect(() => {
    void restoreColorScheme().finally(() => setSchemeReady(true));
  }, []);

  if (!schemeReady) return null;
  return <AnimatedSplash ready={status !== 'loading'} />;
}

/** signed out → auth screens · no business yet → onboarding · otherwise the app. */
function RootNavigator() {
  const { status } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'ready'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'needsShop'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      {/* Direct children (not a group) so the guard can always land on sign-in. */}
      <Stack.Protected guard={status === 'signedOut' || status === 'loading'}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}
