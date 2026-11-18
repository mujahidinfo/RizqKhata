import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { useSaveSupplier, useSupplier } from '@/api/queries';
import type { Supplier } from '@/api/types';
import { Button } from '@/components/button';
import { QueryState } from '@/components/query-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

/** Add (`/supplier-form`) or edit (`/supplier-form?id=…`) a supplier. */
export default function SupplierFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const query = useSupplier(id);

  if (!id) return <SupplierForm />;
  if (!query.data) return <QueryState isLoading={query.isLoading} error={query.error} />;
  return <SupplierForm supplier={query.data} />;
}

function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const theme = useTheme();
  const t = useT();
  const save = useSaveSupplier();
  const [name, setName] = useState(supplier?.name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await save.mutateAsync({
        id: supplier?.id,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        notes: notes.trim(),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('supplierForm.couldNotSave'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label={t('supplierForm.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('supplierForm.namePlaceholder')}
          autoCapitalize="words"
          autoFocus={!supplier}
        />
        <TextField label={t('supplierForm.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField
          label={t('supplierForm.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField label={t('supplierForm.address')} value={address} onChangeText={setAddress} />
        <TextField
          label={t('supplierForm.notes')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('supplierForm.notesPlaceholder')}
          multiline
        />
        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
        <Button
          title={supplier ? t('common.save') : t('supplierForm.add')}
          onPress={submit}
          loading={save.isPending}
          disabled={!name.trim()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
