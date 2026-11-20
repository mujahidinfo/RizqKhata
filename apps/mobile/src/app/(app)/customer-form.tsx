import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { useCustomer, useDeleteCustomer, useUpdateCustomer } from '@/api/queries';
import type { CustomerDetail } from '@/api/types';
import { Button } from '@/components/button';
import { QueryState } from '@/components/query-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

/** `/customer-form?id=…` — fix a customer's name or contact details. */
export default function CustomerFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useCustomer(id);
  if (!query.data) return <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} />;
  return <CustomerForm customer={query.data} />;
}

function CustomerForm({ customer }: { customer: CustomerDetail }) {
  const theme = useTheme();
  const t = useT();
  const update = useUpdateCustomer();
  const remove = useDeleteCustomer();
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [email, setEmail] = useState(customer.email ?? '');
  const [address, setAddress] = useState(customer.address ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await update.mutateAsync({
        id: customer.id,
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('customers.couldNotSave'));
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      t('customers.deleteTitle'),
      [
        t('customers.deleteBody', { name: customer.name }),
        // Orders stay (as walk-in sales) so takings and stock history don't change.
        customer.stats.orderCount ? t('customers.deleteWithOrders', { count: customer.stats.orderCount }) : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
      [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(customer.id);
            router.dismissTo('/more/customers');
          } catch (e) {
            setError(e instanceof Error ? e.message : t('customers.couldNotDelete'));
          }
        },
      },
      ],
    );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('customers.edit') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label={t('customers.name')} value={name} onChangeText={setName} autoCapitalize="words" />
        <TextField label={t('customers.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField
          label={t('customers.emailOptional')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField label={t('customers.addressOptional')} value={address} onChangeText={setAddress} multiline />
        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
        <Button title={t('common.save')} onPress={submit} loading={update.isPending} disabled={!name.trim()} />
        <Button title={t('customers.deleteCustomer')} variant="danger" onPress={confirmDelete} loading={remove.isPending} />
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
