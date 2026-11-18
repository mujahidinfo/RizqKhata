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

const MIN_PASSWORD = 8;

export default function SignUpScreen() {
  const { signUp } = useSession();
  const t = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailLooksValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const canSubmit =
    name.trim().length > 0 && emailLooksValid && password.length >= MIN_PASSWORD && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signUp(name.trim(), email.trim().toLowerCase(), password);
      // New accounts have no shop yet → the guard opens onboarding.
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? t('auth.tooManyAttempts')
          : e instanceof Error
            ? e.message
            : t('common.somethingWrong'),
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={t('auth.createTitle')}
      subtitle={t('auth.createSubtitle')}
      footer={
        <View style={styles.switch}>
          <ThemedText themeColor="textSecondary">{t('auth.haveAccount')}</ThemedText>
          <HeaderButton title={t('auth.signIn')} onPress={() => router.replace('/sign-in')} />
        </View>
      }>
      <GoogleButton onError={setError} />
      <TextField
        label={t('auth.yourName')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />
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
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <ThemedText
        type="caption"
        themeColor={password.length > 0 && password.length < MIN_PASSWORD ? 'danger' : 'textSecondary'}>
        At least {MIN_PASSWORD} characters
      </ThemedText>
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}
      <Button title={t('auth.createButton')} onPress={onSubmit} loading={submitting} disabled={!canSubmit} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
});
