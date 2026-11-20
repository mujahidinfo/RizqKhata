import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { usePaySupplier, useSupplier } from '@/api/queries';
import type { PaymentMethod, SupplierDetail } from '@/api/types';
import { Button } from '@/components/button';
import { Chip, ChipGroup, Segmented } from '@/components/choice';
import { QueryState } from '@/components/query-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';

const METHODS: PaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER'];

export default function SupplierPaymentScreen() {
  const { supplierId } = useLocalSearchParams<{ supplierId: string }>();
  const query = useSupplier(supplierId);
  if (!query.data) return <QueryState isLoading={query.isLoading} error={query.error} />;
  return <PaymentForm supplier={query.data} />;
}

function PaymentForm({ supplier }: { supplier: SupplierDetail }) {
  const theme = useTheme();
  const t = useT();
  const formatCurrency = useFormatCurrency();
  const pay = usePaySupplier();
  const due = Math.max(supplier.due, 0);
  const [amount, setAmount] = useState(due > 0 ? String(due) : '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount.replace(/,/g, ''));
  const valid = value > 0 && Number.isFinite(value);

  const submit = async () => {
    setError(null);
    try {
      await pay.mutateAsync({
        supplierId: supplier.id,
        supplierName: supplier.name,
        amount: value,
        paymentMethod: method,
        note: note.trim() || undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('supplierPayment.couldNotRecord'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('supplierPayment.youOwe', { name: supplier.name })}
          </ThemedText>
          <ThemedText type="title">{formatCurrency(due)}</ThemedText>
        </View>
        <TextField label={t('supplierPayment.amountPaid')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        {due > 0 && (
          <ChipGroup>
            <Chip label={t('supplierPayment.fullAmount')} selected={value === due} onPress={() => setAmount(String(due))} />
            <Chip
              label={t('supplierPayment.half')}
              selected={value === Math.round(due / 2)}
              onPress={() => setAmount(String(Math.round(due / 2)))}
            />
          </ChipGroup>
        )}
        <Segmented
          options={METHODS.map((value) => ({ value, label: t(`common.paymentMethods.${value}`) }))}
          value={method}
          onChange={setMethod}
        />
        <TextField
          label={t('supplierPayment.note')}
          value={note}
          onChangeText={setNote}
          placeholder={t('supplierPayment.notePlaceholder')}
        />
        <ThemedText type="caption" themeColor="textSecondary">
          {t('supplierPayment.alsoExpense')}
        </ThemedText>
        {valid && value > due && (
          <ThemedText type="small" themeColor="warning">
            That’s more than you owe — the extra stays as credit with {supplier.name}.
          </ThemedText>
        )}
        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
        <Button
          title={valid ? t('supplierPayment.payAmount', { amount: formatCurrency(value) }) : t('supplierPayment.pay')}
          onPress={submit}
          loading={pay.isPending}
          disabled={!valid}
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
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
