import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateOrder, useCustomerLookup, useShop } from '@/api/queries';
import type { Order, PaymentMethod } from '@/api/types';
import { Button } from '@/components/button';
import { Card, DetailRow } from '@/components/card';
import { Chip, Segmented } from '@/components/choice';
import { Icon } from '@/components/icon';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/lib/cart';
import { formatDateTime, useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';

const round2 = (n: number) => Math.round(n * 100) / 100;

const METHODS: PaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'CARD'];

/** Round-up amounts a customer is likely to hand over. */
function quickCash(total: number) {
  const steps = [10, 50, 100, 500, 1000];
  const options = new Set<number>([total]);
  for (const step of steps) {
    const rounded = Math.ceil(total / step) * step;
    if (rounded > total) options.add(rounded);
  }
  return [...options].slice(0, 4);
}

export default function CheckoutScreen() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const formatCurrency = useFormatCurrency();
  const { data: shop } = useShop();
  const createOrder = useCreateOrder();

  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cash, setCash] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [discountText, setDiscountText] = useState('');
  const [showCustomer, setShowCustomer] = useState(false);
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  // `queued`: saved on the phone (offline), syncs later.
  const [completed, setCompleted] = useState<{ order: Order; queued: boolean } | null>(null);

  const lookup = useCustomerLookup(showCustomer ? phone : '');
  const knownCustomer = lookup.data ?? null;

  // Same math as the API (orders.service.ts) so the screen and receipt agree.
  const taxRate = shop?.taxRate ?? 0;
  const subtotal = cart.subtotal;
  const discountValue = Number(discountText.replace(/,/g, '')) || 0;
  const discountAmt = round2(
    Math.min(
      discountType === 'percentage' ? subtotal * (Math.min(discountValue, 100) / 100) : discountValue,
      subtotal,
    ),
  );
  const taxAmt = round2((subtotal - discountAmt) * (taxRate / 100));
  const total = round2(subtotal - discountAmt + taxAmt);

  const cashValue = cash.trim() === '' ? undefined : Number(cash.replace(/,/g, ''));
  const change = cashValue !== undefined && !Number.isNaN(cashValue) ? round2(cashValue - total) : null;
  const cashShort = method === 'CASH' && change !== null && change < 0;

  const charge = async () => {
    if (createOrder.isPending || cashShort || cart.lines.length === 0) return;
    setError(null);
    try {
      // A new customer is found-or-created together with the sale, so this
      // works offline too.
      const newCustomer =
        !knownCustomer && showCustomer && phone.trim() && customerName.trim()
          ? { phone: phone.trim(), name: customerName.trim() }
          : undefined;
      const items = cart.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        name: l.variantName ? `${l.name} (${l.variantName})` : l.name,
        sku: l.sku ?? undefined,
        price: l.price,
        quantity: l.quantity,
      }));
      const amountTendered = method === 'CASH' ? (cashValue ?? total) : undefined;
      const result = await createOrder.mutateAsync({
        items,
        paymentMethod: method,
        amountTendered,
        ...(discountAmt > 0 && { discountType, discountValue }),
        taxRate,
        customerId: knownCustomer?.id,
        customer: newCustomer,
        status: 'FULFILLED',
        total,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.status === 'synced') {
        setCompleted({ order: result.data, queued: false });
      } else {
        // Receipt from what was rung up; the order number comes after it syncs.
        setCompleted({
          queued: true,
          order: {
            id: result.item.id,
            orderNumber: t('checkout.savedOffline'),
            status: 'FULFILLED',
            type: 'WALK_IN',
            subtotal,
            discountAmt,
            taxRate,
            taxAmt,
            total,
            paymentMethod: method,
            amountTendered: amountTendered ?? null,
            note: null,
            createdAt: result.item.createdAt,
            customer: null,
            cashier: null,
            items: items.map((i) => ({
              id: i.variantId,
              name: i.name,
              sku: i.sku ?? null,
              price: i.price,
              quantity: i.quantity,
              total: round2(i.price * i.quantity),
            })),
            refunds: [],
          },
        });
      }
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : t('checkout.couldNotComplete'));
    }
  };

  const newSale = () => {
    cart.clear();
    router.back();
  };

  if (completed) {
    const { order: done, queued } = completed;
    const tendered = done.amountTendered;
    const changeGiven = tendered !== null ? round2(tendered - done.total) : null;
    const shareReceipt = () =>
      Share.share({
        message: [
          shop?.businessName ?? shop?.name,
          `${done.orderNumber} · ${formatDateTime(done.createdAt, t)}`,
          '',
          ...done.items.map((i) => `${i.quantity} × ${i.name}  ${formatCurrency(i.total)}`),
          '',
          done.discountAmt > 0 ? `${t('checkout.discount')}  −${formatCurrency(done.discountAmt)}` : null,
          done.taxAmt > 0 ? `${t('checkout.tax')}  ${formatCurrency(done.taxAmt)}` : null,
          `${t('common.total')}  ${formatCurrency(done.total)}`,
          tendered !== null ? `${t('checkout.receiptPaid')}  ${formatCurrency(tendered)}` : null,
          changeGiven ? `${t('checkout.change')}  ${formatCurrency(changeGiven)}` : null,
          '',
          t('checkout.receiptThanks'),
        ]
          .filter((l) => l !== null)
          .join('\n'),
      });

    return (
      <View
        style={[
          styles.flex,
          styles.done,
          {
            backgroundColor: theme.background,
            paddingBottom: Spacing.four + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0),
          },
        ]}>
        <Stack.Screen options={{ title: t('screens.paid'), headerBackVisible: false, gestureEnabled: false }} />
        <View style={[styles.check, { backgroundColor: theme.success }]}>
          <ThemedText style={styles.checkMark}>✓</ThemedText>
        </View>
        {queued ? (
          <View style={[styles.offlinePill, { backgroundColor: `${theme.warning}1F` }]}>
            <Icon name="cloudOff" size={14} color={theme.warning} />
            <ThemedText type="smallBold" style={{ color: theme.warning }}>
              {t('checkout.savedOfflineSync')}
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {done.orderNumber}
          </ThemedText>
        )}
        <ThemedText type="title">{formatCurrency(done.total)}</ThemedText>
        {changeGiven !== null && changeGiven > 0 && (
          <View style={[styles.changeBox, { backgroundColor: `${theme.success}1A` }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('checkout.giveChange')}
            </ThemedText>
            <ThemedText type="subtitle" themeColor="success">
              {formatCurrency(changeGiven)}
            </ThemedText>
          </View>
        )}
        <View style={styles.doneActions}>
          <Button title={t('checkout.newSale')} onPress={newSale} />
          <Button title={t('checkout.shareReceipt')} variant="secondary" onPress={shareReceipt} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Spacing.four }]} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <ThemedText type="small" themeColor="textSecondary">
            {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} · Total
          </ThemedText>
          <ThemedText style={styles.total} adjustsFontSizeToFit numberOfLines={1}>
            {formatCurrency(total)}
          </ThemedText>
        </View>

        <Segmented
          options={METHODS.map((value) => ({ value, label: t(`common.paymentMethods.${value}`) }))}
          value={method}
          onChange={setMethod}
        />

        {method === 'CASH' && (
          <Card>
            <TextField
              label={t('checkout.cashReceived')}
              value={cash}
              onChangeText={setCash}
              placeholder={String(total)}
              keyboardType="decimal-pad"
            />
            <View style={styles.chips}>
              {quickCash(total).map((amount) => (
                <Chip
                  key={amount}
                  label={amount === total ? t('checkout.exact') : formatCurrency(amount)}
                  selected={cashValue === amount}
                  onPress={() => setCash(String(amount))}
                />
              ))}
            </View>
            {change !== null && (
              <DetailRow
                label={cashShort ? t('checkout.stillDue') : t('checkout.change')}
                value={formatCurrency(Math.abs(change))}
                emphasis
              />
            )}
          </Card>
        )}

        <Card>
          <DetailRow label={t('checkout.subtotal')} value={formatCurrency(subtotal)} />
          {discountAmt > 0 && <DetailRow label={t('checkout.discount')} value={`−${formatCurrency(discountAmt)}`} />}
          {taxAmt > 0 && (
            <DetailRow label={`${shop?.taxName ?? t('checkout.tax')} (${taxRate}%)`} value={formatCurrency(taxAmt)} />
          )}
          <DetailRow label={t('common.total')} value={formatCurrency(total)} emphasis />
        </Card>

        {showDiscount ? (
          <Card title={t('checkout.discount')}>
            <Segmented
              options={[
                { value: 'fixed', label: t('checkout.amount') },
                { value: 'percentage', label: t('checkout.percent') },
              ]}
              value={discountType}
              onChange={setDiscountType}
            />
            <TextField
              label={discountType === 'percentage' ? t('checkout.discountPercent') : t('checkout.discountAmount')}
              value={discountText}
              onChangeText={setDiscountText}
              placeholder="0"
              keyboardType="decimal-pad"
              autoFocus
            />
          </Card>
        ) : (
          <Button title={t('checkout.addDiscount')} variant="secondary" onPress={() => setShowDiscount(true)} />
        )}

        {showCustomer ? (
          <Card title={t('checkout.customerOptional')}>
            <TextField
              label={t('checkout.phone')}
              value={phone}
              onChangeText={setPhone}
              placeholder="01XXXXXXXXX"
              keyboardType="phone-pad"
              autoFocus
            />
            {knownCustomer ? (
              <ThemedText type="smallBold" themeColor="success">
                ✓ {knownCustomer.name}
              </ThemedText>
            ) : (
              phone.trim().length >= 6 &&
              !lookup.isFetching && (
                <TextField
                  label={t('checkout.newCustomerName')}
                  value={customerName}
                  onChangeText={setCustomerName}
                  autoCapitalize="words"
                />
              )
            )}
          </Card>
        ) : (
          <Button title={t('checkout.addCustomer')} variant="secondary" onPress={() => setShowCustomer(true)} />
        )}

        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            paddingBottom: Spacing.three + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0),
          },
        ]}>
        <Button
          title={t('checkout.chargeAmount', { amount: formatCurrency(total) })}
          onPress={charge}
          loading={createOrder.isPending}
          disabled={cashShort || cart.lines.length === 0}
        />
      </View>
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
  total: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: 700,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  footer: {
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  done: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  check: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: 700,
  },
  changeBox: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    marginTop: Spacing.two,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.lg,
  },
  doneActions: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
});
