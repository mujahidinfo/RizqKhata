import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useOrder, useOrderStatus } from '@/api/queries';
import type { Order, OrderStatus } from '@/api/types';
import { OrderStatusBadge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card, DetailRow } from '@/components/card';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { canRefund, NEXT_STATUSES, refundableOf } from '@/lib/orders';
import { canManage } from '@/lib/roles';
import { useActiveShop } from '@/lib/session';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const t = useT();
  const formatCurrency = useFormatCurrency();
  const { data: order, isLoading, error, refetch, isRefetching } = useOrder(id);

  if (!order) {
    return <QueryState isLoading={isLoading} error={error} onRetry={refetch} />;
  }

  const refunded = order.refunds.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <Stack.Screen options={{ title: order.orderNumber }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={theme.primary} />
        }>
        <View style={styles.hero}>
          <ThemedText type="title">
            {formatCurrency(order.total)}
          </ThemedText>
          <OrderStatusBadge status={order.status} />
          <ThemedText type="small" themeColor="textSecondary">
            {formatDateTime(order.createdAt, t)}
            {order.cashier ? t('orders.by', { name: order.cashier.name }) : ''}
          </ThemedText>
        </View>

        <OrderActions order={order} />

        <Card title={t('orders.items')}>
          {order.items.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.itemMain}>
                <ThemedText type="small">{item.name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {item.quantity} × {formatCurrency(item.price)}
                  {item.variant ? ` · ${item.variant.name}` : ''}
                </ThemedText>
              </View>
              <ThemedText type="small" style={styles.tabular}>
                {formatCurrency(item.total)}
              </ThemedText>
            </View>
          ))}
        </Card>

        <Card title={t('orders.summary')}>
          <DetailRow label={t('checkout.subtotal')} value={formatCurrency(order.subtotal)} />
          {order.discountAmt > 0 && (
            <DetailRow label={t('checkout.discount')} value={`−${formatCurrency(order.discountAmt)}`} />
          )}
          {order.taxAmt > 0 && (
            <DetailRow label={t('orders.taxRate', { rate: order.taxRate })} value={formatCurrency(order.taxAmt)} />
          )}
          <DetailRow label={t('common.total')} value={formatCurrency(order.total)} emphasis />
          {(order.depositApplied ?? 0) > 0 && (
            <DetailRow label={t('jobs.advanceLess')} value={`−${formatCurrency(order.depositApplied ?? 0)}`} />
          )}
          {refunded > 0 && <DetailRow label={t('orders.refunded')} value={`−${formatCurrency(refunded)}`} />}
          {refunded > 0 && <DetailRow label={t('orders.kept')} value={formatCurrency(refundableOf(order))} emphasis />}
        </Card>

        <Card title={t('orders.details')}>
          <DetailRow label={t('orders.payment')} value={t(`common.paymentMethods.${order.paymentMethod}`)} />
          <DetailRow label={t('orders.type')} value={order.type === 'WALK_IN' ? t('orders.walkIn') : t('orders.online')} />
          <DetailRow label={t('orders.customer')} value={order.customer?.name ?? t('orders.walkInCustomer')} />
          {order.customer?.phone && <DetailRow label={t('checkout.phone')} value={order.customer.phone} />}
          {order.note && <DetailRow label={t('orders.note')} value={order.note} />}
        </Card>

        {order.refunds.length > 0 && (
          <Card title={t('orders.refunds')}>
            {order.refunds.map((r) => (
              <DetailRow
                key={r.id}
                label={[formatDateTime(r.createdAt, t), r.reason].filter(Boolean).join(' · ')}
                value={formatCurrency(r.amount)}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </>
  );
}

/**
 * What can be done to this order: refund (owners and managers, while money is
 * left to give back) and moving a pending order along. A counter sale is
 * already completed, so most orders only ever show Refund.
 */
function OrderActions({ order }: { order: Order }) {
  const t = useT();
  const formatCurrency = useFormatCurrency();
  const { role } = useActiveShop();
  const setStatus = useOrderStatus();
  const next = NEXT_STATUSES[order.status] ?? [];
  const refundable = canManage(role) && canRefund(order);
  if (!refundable && next.length === 0) return null;

  const move = (status: OrderStatus) => {
    const go = () =>
      setStatus.mutate(
        { id: order.id, status },
        {
          onError: (e) =>
            Platform.OS === 'web'
              ? undefined
              : Alert.alert(t('orders.couldNotUpdate'), e instanceof Error ? e.message : undefined),
        },
      );
    if (status !== 'CANCELED' || Platform.OS === 'web') return go();
    Alert.alert(t('orders.cancelTitle'), t('orders.cancelBody'), [
      { text: t('orders.keepOrder'), style: 'cancel' },
      { text: t('orders.cancelOrder'), style: 'destructive', onPress: go },
    ]);
  };

  return (
    <View style={styles.actions}>
      {next.map((status) => (
        <Button
          key={status}
          title={t('orders.markAs', { status: t(`orderStatus.${status}`) })}
          variant={status === 'CANCELED' ? 'danger' : status === 'FULFILLED' ? 'primary' : 'secondary'}
          loading={setStatus.isPending && setStatus.variables?.status === status}
          disabled={setStatus.isPending}
          onPress={() => move(status)}
        />
      ))}
      {refundable && (
        <Button
          title={t('orders.refundUpTo', { amount: formatCurrency(refundableOf(order)) })}
          variant="secondary"
          onPress={() => router.push({ pathname: '/refund', params: { orderId: order.id } })}
        />
      )}
      {setStatus.error && Platform.OS === 'web' && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {setStatus.error.message}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.two,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  itemMain: {
    flex: 1,
    gap: Spacing.half,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
