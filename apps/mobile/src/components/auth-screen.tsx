import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getGoogleIdToken, isGoogleSignInAvailable } from '@/lib/google-sign-in';
import { useSession } from '@/lib/session';
import { LANGUAGES, useLanguage, useSetDeviceLanguage, useT } from '@/lib/i18n';

/** Shared frame for sign-in, sign-up and onboarding. */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.topRow}>
                <BrandLogo height={36} />
                <LanguageSwitch />
              </View>
              <ThemedText type="title">{title}</ThemedText>
              <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>
            </View>
            <View style={styles.form}>{children}</View>
            {footer}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** "Continue with Google" — renders nothing where Google sign-in can't run. */
export function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const { signInWithGoogle } = useSession();
  const t = useT();
  const [loading, setLoading] = useState(false);

  if (!isGoogleSignInAvailable) return null;

  const onPress = async () => {
    setLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      if (idToken) await signInWithGoogle(idToken);
    } catch (e) {
      onError(e instanceof Error ? e.message : t('auth.googleFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button title={t('auth.continueGoogle')} variant="secondary" onPress={onPress} loading={loading} />
      <ThemedText type="caption" themeColor="textSecondary" style={styles.or}>
        {t('auth.orEmail')}
      </ThemedText>
    </>
  );
}

/**
 * English / বাংলা before signing in. Saved on this phone; once signed in the
 * shop's language (Profile → Language) takes over.
 */
function LanguageSwitch() {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const setLanguage = useSetDeviceLanguage();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('auth.language')}
      style={[styles.switch, { backgroundColor: theme.backgroundSelected }]}>
      {LANGUAGES.map((l) => {
        const selected = l.code === language;
        return (
          <Pressable
            key={l.code}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setLanguage(l.code)}
            hitSlop={4}
            style={[styles.switchOption, selected && { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="caption" style={{ fontWeight: 700, color: selected ? theme.text : theme.textSecondary }}>
              {l.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.five,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.one,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  switch: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
  },
  switchOption: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  form: {
    gap: Spacing.three,
  },
  or: {
    textAlign: 'center',
  },
});
