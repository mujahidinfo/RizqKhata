import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthScreen, GoogleButton } from '@/components/auth-screen';
import { Button } from '@/components/button';
import { HeaderButton } from '@/components/header-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ApiError } from '@/lib/api-client';
import { useSession } from '@/lib/session';
import { useT } from '@/lib/i18n';

export default function SignInScreen() {
  const { signIn } = useSession();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim().toLowerCase(), password);
      // Stack.Protected swaps to onboarding or the app automatically.
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 400
          ? t('auth.wrongCredentials')
          : e instanceof ApiError && e.status === 401 && e.message === 'Invalid credentials'
            ? t('auth.wrongCredentials')
            : e instanceof Error
              ? e.message
              : t('common.somethingWrong'),
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={t('auth.welcomeBack')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <View style={styles.footer}>
          <View style={styles.switch}>
            <ThemedText themeColor="textSecondary">{t('auth.newHere')}</ThemedText>
            <HeaderButton title={t('auth.createAccount')} onPress={() => router.replace('/sign-up')} />
          </View>
        </View>
      }>
      <GoogleButton onError={setError} />
      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <TextField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}
      <Button title={t('auth.signIn')} onPress={onSubmit} loading={submitting} disabled={!canSubmit} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: 16,
  },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
});
