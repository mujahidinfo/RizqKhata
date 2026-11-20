import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useOrder, useRefundOrder } from '@/api/queries';
import type { Order, OrderItem } from '@/api/types';
import { Button } from '@/components/button';
import { Chip, ChipGroup } from '@/components/choice';
import { QueryState } from '@/components/query-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { refundableOf, returnableLines, returnValue } from '@/lib/orders';

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
  const lines = returnableLines(order);
  const [back, setBack] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState(max > 0 ? String(max) : '');
  // Until the cashier types an amount, it follows what is coming back.
  const [amountTouched, setAmountTouched] = useState(false);
  const [reason, setReason] = useState('');

  const setReturned = (item: OrderItem, quantity: number) => {
    void Haptics.selectionAsync();
    const next = { ...back, [item.id]: quantity };
    setBack(next);
    if (amountTouched) return;
    const units = Object.values(next).some((n) => n > 0);
    setAmount(String(units ? Math.min(max, returnValue(order, next)) : max));
  };
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
        items: lines
          .filter((l) => (back[l.id] ?? 0) > 0)
          .map((l) => ({ orderItemId: l.id, quantity: back[l.id], variantId: l.variant!.id })),
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
            {lines.length > 0 && (
              <View style={[styles.returns, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">{t('refund.backTitle')}</ThemedText>
                {lines.map((item) => (
                  <ReturnRow
                    key={item.id}
                    item={item}
                    value={back[item.id] ?? 0}
                    onChange={(q) => setReturned(item, q)}
                  />
                ))}
              </View>
            )}
            <TextField
              label={t('refund.amount')}
              value={amount}
              onChangeText={(v) => {
                setAmountTouched(true);
                setAmount(v);
              }}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
            <ChipGroup>
              <Chip
                label={t('refund.full', { amount: formatCurrency(max) })}
                selected={value === max}
                onPress={() => {
                  setAmountTouched(true);
                  setAmount(String(max));
                }}
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

/** One line that can go back on the shelf: what was sold, what came back, a stepper. */
function ReturnRow({ item, value, onChange }: { item: OrderItem; value: number; onChange: (n: number) => void }) {
  const theme = useTheme();
  const t = useT();
  const left = item.quantity - item.returnedQty;
  return (
    <View style={styles.returnRow}>
      <View style={styles.flex}>
        <ThemedText type="small" numberOfLines={2}>
          {item.name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {item.returnedQty > 0
            ? t('refund.soldReturned', { sold: item.quantity, returned: item.returnedQty })
            : t('refund.sold', { sold: item.quantity })}
        </ThemedText>
      </View>
      <View style={[styles.stepper, { borderColor: theme.border }]}>
        <StepButton label={t('sellParts.decrease')} symbol="−" disabled={value <= 0} onPress={() => onChange(value - 1)} />
        <ThemedText
          type="smallBold"
          style={styles.qty}
          accessibilityLabel={t('refund.backA11y', { count: value, name: item.name })}>
          {value}
        </ThemedText>
        <StepButton label={t('sellParts.increase')} symbol="+" disabled={value >= left} onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}

function StepButton({ label, symbol, disabled, onPress }: { label: string; symbol: string; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText style={[styles.stepSymbol, { color: disabled ? theme.textSecondary : theme.text, opacity: disabled ? 0.4 : 1 }]}>
        {symbol}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  returns: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  returnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  stepButton: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  stepSymbol: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: 600,
  },
  qty: {
    minWidth: 28,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
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
