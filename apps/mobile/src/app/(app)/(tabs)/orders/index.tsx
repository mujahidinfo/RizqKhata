import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { useOrders } from '@/api/queries';
import type { Order, OrderStatus, PaymentMethod } from '@/api/types';
import { OrderStatusBadge } from '@/components/badge';
import { FilterBar } from '@/components/filter-bar';
import { TabScreen } from '@/components/safe-area';
import type { IconName } from '@/components/icon';
import { Icon } from '@/components/icon';
import { IconTile, TINT } from '@/components/icon-tile';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { PendingSyncBanner } from '@/components/pending-sync-banner';
import { Radius, Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDay, useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';

const CARD_SHADOW = '0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.03)';

const FILTERS: (OrderStatus | undefined)[] = [undefined, 'FULFILLED', 'PENDING', 'REFUNDED', 'CANCELED'];

const PAYMENT: Record<PaymentMethod, { icon: IconName; tint: string }> = {
  CASH: { icon: 'money', tint: TINT.emerald },
  CARD: { icon: 'receipt', tint: TINT.indigo },
  MOBILE_MONEY: { icon: 'phone', tint: TINT.violet },
  BANK_TRANSFER: { icon: 'branches', tint: TINT.sky },
};

export default function OrdersScreen() {
  const theme = useTheme();
  const t = useT();
  const formatCurrency = useFormatCurrency();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | undefined>();
  const debouncedSearch = useDebouncedValue(search.trim());
  const query = useOrders({ search: debouncedSearch, status });

  // The API returns newest first; sort again so a page merge can never reorder.
  const orders = (query.data?.pages.flatMap((p) => p.items) ?? []).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const filtered = Boolean(debouncedSearch || status);

  return (
    <TabScreen style={{ backgroundColor: theme.background }}>
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder={t('orders.searchPlaceholder')}
        chips={FILTERS.map((value) => ({ label: value ? t(`orderStatus.${value}`) : t('common.all'), value }))}
        selected={status}
        onSelect={setStatus}
      />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={orders}
        keyExtractor={(o) => o.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          flexGrow: 1,
          padding: Spacing.three,
          paddingTop: Spacing.one,
          paddingBottom: Spacing.three,
          gap: Spacing.two + 2,
        }}
        ListHeaderComponent={<PendingSyncBanner kinds={['sale']} noun={[t('orders.pendingNoun', { count: 1 }), t('orders.pendingNoun', { count: 2 })]} />}
        renderItem={({ item }) => <OrderCard order={item} total={formatCurrency(item.total)} />}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={theme.primary}
          />
        }
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            onRetry={query.refetch}
            emptyTitle={filtered ? t('orders.noMatching') : t('orders.noOrders')}
            emptyMessage={filtered ? t('orders.tryDifferent') : t('orders.salesShowHere')}
          />
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View style={{ padding: Spacing.three }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : undefined
        }
      />
    </TabScreen>
  );
}

function OrderCard({ order, total }: { order: Order; total: string }) {
  const theme = useTheme();
  const t = useT();
  const count = order.items.reduce((n, i) => n + i.quantity, 0);
  const pay = PAYMENT[order.paymentMethod];
  // The first line names the sale when there's no customer ("Milk +2 more").
  const first = order.items[0]?.name;
  const title = order.customer?.name ?? t('orders.walkInSale');
  const detail = [
    t('common.items', { count }),
    first && !order.customer ? first + (order.items.length > 1 ? ` ${t('orders.more', { count: order.items.length - 1 })}` : '') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${order.orderNumber}, ${total}`}
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
      style={({ pressed }) => ({
        gap: Spacing.two + 2,
        padding: Spacing.three,
        borderRadius: Radius.lg + 4,
        borderCurve: 'continuous',
        backgroundColor: theme.backgroundElement,
        boxShadow: CARD_SHADOW,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <IconTile name={pay.icon} tint={pay.tint} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="smallBold" style={{ fontSize: 16 }} numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {detail}
          </ThemedText>
        </View>
        <ThemedText type="smallBold" style={{ fontSize: 16, fontVariant: ['tabular-nums'] }}>
          {total}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <OrderStatusBadge status={order.status} />
        <ThemedText type="caption" themeColor="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
          {order.orderNumber} · {t(`common.paymentMethods.${order.paymentMethod}`)} · {formatRelativeDay(order.createdAt, t)}
        </ThemedText>
        <Icon name="chevronRight" size={14} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}
