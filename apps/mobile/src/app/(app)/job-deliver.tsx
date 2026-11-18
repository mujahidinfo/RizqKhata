import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDeliverJob, useJob, useOfflineCatalog, useShop } from '@/api/queries';
import type { JobDetail, Order, PaymentMethod } from '@/api/types';
import { Button } from '@/components/button';
import { Card, DetailRow } from '@/components/card';
import { Chip, Segmented } from '@/components/choice';
import { QueryState } from '@/components/query-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';

const round2 = (n: number) => Math.round(n * 100) / 100;
const METHODS: PaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'CARD'];

function quickCash(amount: number) {
  const options = new Set<number>([amount]);
  for (const step of [50, 100, 500, 1000]) {
    const rounded = Math.ceil(amount / step) * step;
    if (rounded > amount) options.add(rounded);
  }
  return [...options].slice(0, 4);
}

/** `/job-deliver?id=` — bill the job (advance deducted) and hand the device over. */
export default function JobDeliverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useJob(id);
  if (!query.data) return <QueryState isLoading={query.isLoading} error={query.error} onRetry={query.refetch} />;
  return <DeliverForm job={query.data} />;
}

function DeliverForm({ job }: { job: JobDetail }) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const formatCurrency = useFormatCurrency();
  const { data: shop } = useShop();
  const catalog = useOfflineCatalog(true);
  const deliver = useDeliverJob();

  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cash, setCash] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Order | null>(null);

  // Same math as the API: lines + tax, then the advance comes off.
  const taxRate = shop?.taxRate ?? 0;
  const subtotal = round2(job.lines.reduce((s, l) => s + l.price * l.quantity, 0));
  const taxAmt = round2(subtotal * (taxRate / 100));
  const total = round2(subtotal + taxAmt);
  const due = round2(Math.max(total - job.advance, 0));
  const cashValue = cash.trim() === '' ? undefined : Number(cash.replace(/,/g, ''));
  const change = method === 'CASH' && cashValue !== undefined && !Number.isNaN(cashValue) ? round2(cashValue - due) : null;
  const short = change !== null && change < 0;

  // Longest warranty among what was done (services and parts can carry one).
  const warranty = Math.max(
    job.warrantyDays ?? 0,
    ...job.lines.map((l) => catalog.data?.find((p) => p.id === l.productId)?.warrantyDays ?? 0),
  );

  const submit = async () => {
    if (deliver.isPending || short) return;
    setError(null);
    try {
      const result = await deliver.mutateAsync({
        id: job.id,
        paymentMethod: method,
        amountTendered: method === 'CASH' ? (cashValue ?? due) : undefined,
        taxRate,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(result.order);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : t('jobs.couldNotDeliver'));
    }
  };

  if (done) {
    const share = () =>
      Share.share({
        message: [
          shop?.businessName ?? shop?.name,
          `${done.orderNumber} · ${formatDateTime(done.createdAt, t)}`,
          t('jobs.receiptJob', { job: job.jobNumber }) + (job.device ? ` · ${job.device}` : ''),
          '',
          ...done.items.map((i) => `${i.quantity} × ${i.name}  ${formatCurrency(i.total)}`),
          '',
          done.taxAmt > 0 ? `${t('checkout.tax')}  ${formatCurrency(done.taxAmt)}` : null,
          `${t('common.total')}  ${formatCurrency(done.total)}`,
          job.advance > 0 ? `${t('jobs.receiptAdvance')}  −${formatCurrency(job.advance)}` : null,
          `${t('jobs.receiptDue')}  ${formatCurrency(due)}`,
          warranty > 0 ? t('jobs.warranty', { count: warranty }) : null,
          '',
          t('checkout.receiptThanks'),
        ]
          .filter((l) => l !== null)
          .join('\n'),
      });
    return (
      <View style={[styles.done, { backgroundColor: theme.background, paddingBottom: Spacing.four + insets.bottom }]}>
        <Stack.Screen options={{ title: t('jobs.delivered'), headerBackVisible: false, gestureEnabled: false }} />
        <View style={[styles.check, { backgroundColor: theme.success }]}>
          <ThemedText style={styles.checkMark}>✓</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {done.orderNumber} · {job.jobNumber}
        </ThemedText>
        <ThemedText type="title">{formatCurrency(due)}</ThemedText>
        {change !== null && change > 0 && (
          <View style={[styles.changeBox, { backgroundColor: `${theme.success}1A` }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('checkout.giveChange')}
            </ThemedText>
            <ThemedText type="subtitle" themeColor="success">
              {formatCurrency(change)}
            </ThemedText>
          </View>
        )}
        {warranty > 0 && (
          <ThemedText type="smallBold" themeColor="primary">
            {t('jobs.warranty', { count: warranty })}
          </ThemedText>
        )}
        <View style={styles.actions}>
          <Button title={t('common.done')} onPress={() => router.back()} />
          <Button title={t('checkout.shareReceipt')} variant="secondary" onPress={share} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('jobs.deliverHint')}
        </ThemedText>
        <Card title={`${job.jobNumber}${job.device ? ` · ${job.device}` : ''}`}>
          {job.lines.map((l, i) => (
            <DetailRow key={l.id ?? i} label={`${l.quantity > 1 ? `${l.quantity} × ` : ''}${l.name}`} value={formatCurrency(l.price * l.quantity)} />
          ))}
          {taxAmt > 0 && <DetailRow label={`${shop?.taxName ?? t('checkout.tax')} (${taxRate}%)`} value={formatCurrency(taxAmt)} />}
          <DetailRow label={t('common.total')} value={formatCurrency(total)} />
          {job.advance > 0 && <DetailRow label={t('jobs.advanceLess')} value={`−${formatCurrency(job.advance)}`} />}
          <DetailRow label={t('jobs.dueNow')} value={formatCurrency(due)} emphasis />
        </Card>

        {due > 0 && (
          <>
            <Segmented
              options={METHODS.map((value) => ({ value, label: t(`common.paymentMethods.${value}`) }))}
              value={method}
              onChange={setMethod}
            />
            {method === 'CASH' && (
              <Card>
                <TextField label={t('checkout.cashReceived')} value={cash} onChangeText={setCash} keyboardType="decimal-pad" placeholder={String(due)} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                  {quickCash(due).map((amount) => (
                    <Chip
                      key={amount}
                      label={amount === due ? t('checkout.exact') : formatCurrency(amount)}
                      selected={cashValue === amount}
                      onPress={() => setCash(String(amount))}
                    />
                  ))}
                </View>
                {change !== null && (
                  <DetailRow label={short ? t('checkout.stillDue') : t('checkout.change')} value={formatCurrency(Math.abs(change))} emphasis />
                )}
              </Card>
            )}
          </>
        )}
        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
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
        <Button
          title={due > 0 ? t('jobs.deliver', { amount: formatCurrency(due) }) : t('jobs.deliverNothingDue')}
          onPress={submit}
          loading={deliver.isPending}
          disabled={short || job.lines.length === 0}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  check: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  checkMark: { color: '#FFFFFF', fontSize: 36, lineHeight: 40, fontWeight: 700 },
  changeBox: { alignItems: 'center', borderRadius: Radius.lg, paddingVertical: Spacing.three, paddingHorizontal: Spacing.five, marginTop: Spacing.two },
  actions: { alignSelf: 'stretch', gap: Spacing.two, marginTop: Spacing.four },
});
