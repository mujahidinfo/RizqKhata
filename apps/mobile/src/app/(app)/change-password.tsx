import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useChangePassword } from '@/api/queries';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api-client';
import { useT } from '@/lib/i18n';

const MIN_PASSWORD = 8;

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== next;
  const valid = next.length >= MIN_PASSWORD && next === confirm;

  const submit = async () => {
    if (!valid) return;
    setError(null);
    try {
      await change.mutateAsync({ currentPassword: current || undefined, newPassword: next });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
      if (Platform.OS !== 'web') Alert.alert(t('password.updated'), t('password.updatedBody'));
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? t('password.wrongCurrent')
          : e instanceof Error
            ? e.message
            : t('password.couldNotChange'),
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three }}>
        <TextField
          label={t('password.current')}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoComplete="current-password"
          placeholder={t('password.currentPlaceholder')}
          autoFocus
        />
        <TextField
          label={t('password.new')}
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoComplete="new-password"
        />
        <ThemedText
          type="caption"
          themeColor={next.length > 0 && next.length < MIN_PASSWORD ? 'danger' : 'textSecondary'}>
          At least {MIN_PASSWORD} characters
        </ThemedText>
        <TextField
          label={t('password.repeat')}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {mismatch && (
          <ThemedText type="caption" themeColor="danger">
            {t('password.mismatch')}
          </ThemedText>
        )}
        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite" selectable>
            {error}
          </ThemedText>
        )}
      </ScrollView>
      <View
        style={{
          padding: Spacing.three,
          paddingBottom: Spacing.three + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0),
          borderTopWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
        }}>
        <Button title={t('password.update')} onPress={submit} loading={change.isPending} disabled={!valid} />
      </View>
    </KeyboardAvoidingView>
  );
}
