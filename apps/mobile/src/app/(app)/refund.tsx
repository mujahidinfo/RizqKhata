import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useOrder, useRefundOrder } from '@/api/queries';
import type { Order } from '@/api/types';
import { Button } from '@/components/button';
import { Chip, ChipGroup } from '@/components/choice';
import { QueryState } from '@/components/query-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { refundableOf } from '@/lib/orders';

const REASONS = ['returned', 'damaged', 'wrong', 'overcharged'] as const;

/** Give money back on an order: owners and managers, opened from the order. */
export default function RefundScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const query = useOrder(orderId);
  if (!query.data) return <QueryState isLoading={query.isLoading} error={query.error} />;
  return <RefundForm order={query.data} />;
}

function RefundForm({ order }: { order: Order }) {
  const theme = useTheme();
  const t = useT();
  const formatCurrency = useFormatCurrency();
  const refund = useRefundOrder();
  const max = refundableOf(order);
  const [amount, setAmount] = useState(max > 0 ? String(max) : '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const value = Number(amount.replace(/,/g, ''));
  const tooMuch = value > max + 0.001;
  const valid = Number.isFinite(value) && value > 0 && !tooMuch;

  const submit = async () => {
    setError(null);
    try {
      await refund.mutateAsync({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: Math.round(value * 100) / 100,
        reason: reason.trim() || undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('refund.couldNotRefund'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('refund.paid', { number: order.orderNumber, total: formatCurrency(order.total) })}
          </ThemedText>
          <ThemedText type="title" style={styles.tabular}>
            {formatCurrency(max)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {max > 0 ? t('refund.upTo') : t('refund.nothingLeft')}
          </ThemedText>
        </View>

        {max > 0 && (
          <>
            <TextField
              label={t('refund.amount')}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <ChipGroup>
              <Chip
                label={t('refund.full', { amount: formatCurrency(max) })}
                selected={value === max}
                onPress={() => setAmount(String(max))}
              />
            </ChipGroup>
            {tooMuch && (
              <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                {t('refund.tooMuch', { amount: formatCurrency(max) })}
              </ThemedText>
            )}

            <TextField
              label={t('refund.reason')}
              value={reason}
              onChangeText={setReason}
              placeholder={t('refund.reasonPlaceholder')}
            />
            <ChipGroup>
              {REASONS.map((r) => {
                const label = t(`refund.reasons.${r}`);
                return <Chip key={r} label={label} selected={reason === label} onPress={() => setReason(label)} />;
              })}
            </ChipGroup>

            <ThemedText type="caption" themeColor="textSecondary">
              {t('refund.stockNote')}
            </ThemedText>
            {error && (
              <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                {error}
              </ThemedText>
            )}
            <Button
              title={valid ? t('refund.confirm', { amount: formatCurrency(value) }) : t('refund.confirmPlain')}
              variant="danger"
              onPress={submit}
              loading={refund.isPending}
              disabled={!valid}
            />
          </>
        )}
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
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
