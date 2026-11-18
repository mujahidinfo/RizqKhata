import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useOrder } from '@/api/queries';
import { OrderStatusBadge } from '@/components/badge';
import { Card, DetailRow } from '@/components/card';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';

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

const styles = StyleSheet.create({
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
