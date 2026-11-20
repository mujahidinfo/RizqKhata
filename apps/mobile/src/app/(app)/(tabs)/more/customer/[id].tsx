import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { useCustomer } from '@/api/queries';
import type { CustomerDetail } from '@/api/types';
import { Avatar } from '@/components/avatar';
import { OrderStatusBadge } from '@/components/badge';
import { HeaderButton } from '@/components/header-button';
import { Icon } from '@/components/icon';
import { IconTile, TINT } from '@/components/icon-tile';
import { Panel } from '@/components/panel';
import { QueryState } from '@/components/query-state';
import { StatTile } from '@/components/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatDayLabel, useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useActiveShop } from '@/lib/session';
import { JobStatusBadge } from '@/components/job-status';

/** One customer: what they spend, how to reach them, and every recent order. */
export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const t = useT();
  const formatCurrency = useFormatCurrency();
  const { data: customer, isLoading, error, refetch, isRefetching } = useCustomer(id);

  if (!customer) return <QueryState isLoading={isLoading} error={error} onRetry={refetch} />;

  const { stats } = customer;

  return (
    <>
      <Stack.Screen
        options={{
          title: customer.name,
          headerRight: () => (
            <HeaderButton
              title={t('common.edit')}
              onPress={() => router.push({ pathname: '/customer-form', params: { id: customer.id } })}
            />
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={theme.primary} />}>
        <Panel>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <Avatar name={customer.name} size={56} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="subtitle" numberOfLines={2}>
                {customer.name}
              </ThemedText>
              {customer.phone && (
                <ThemedText type="small" themeColor="textSecondary" selectable>
                  {customer.phone}
                </ThemedText>
              )}
              <ThemedText type="caption" themeColor="textSecondary">
                {t('customers.since', { date: formatDayLabel(customer.createdAt, t) })}
              </ThemedText>
            </View>
            {customer.phone && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('customers.call')}
                onPress={() => Linking.openURL(`tel:${customer.phone}`)}
                hitSlop={6}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <IconTile name="phone" tint={TINT.emerald} size={44} round />
              </Pressable>
            )}
          </View>
        </Panel>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
          <StatTile icon="money" tint={TINT.emerald} label={t('customers.totalSpent')} value={formatCurrency(stats.totalSpent)} />
          <StatTile icon="receipt" tint={TINT.indigo} label={t('customers.ordersLabel')} value={String(stats.orderCount)} />
          <StatTile icon="trend" tint={TINT.amber} label={t('customers.average')} value={formatCurrency(stats.averageOrder)} />
          <StatTile
            icon="calendar"
            tint={TINT.violet}
            label={t('customers.lastVisit')}
            value={stats.lastOrderAt ? formatDayLabel(stats.lastOrderAt, t) : '–'}
          />
        </View>

        {(customer.email || customer.address) && (
          <Panel icon="info" tint={TINT.slate} title={t('customers.contact')}>
            {customer.email && <Line label={t('customers.email')} value={customer.email} />}
            {customer.address && <Line label={t('customers.address')} value={customer.address} />}
          </Panel>
        )}

        {customer.jobs.length > 0 && (
          <Panel icon="wrench" tint={TINT.emerald} title={t('customers.jobsTitle')}>
            {customer.jobs.map((job) => (
              <Pressable
                key={job.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job.id } })}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, opacity: pressed ? 0.6 : 1 })}>
                <IconTile name="device" tint={TINT.emerald} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {[job.device, job.jobNumber].filter(Boolean).join(' · ')}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                    {[formatDayLabel(job.createdAt, t), job.problem].join(' · ')}
                  </ThemedText>
                </View>
                <JobStatusBadge status={job.status} />
              </Pressable>
            ))}
          </Panel>
        )}

        <Panel icon="history" tint={TINT.sky} title={t('customers.history')}>
          {customer.orders.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('customers.noOrders')}
            </ThemedText>
          ) : (
            <>
              {customer.orders.map((order) => (
                <OrderRow key={order.id} order={order} total={formatCurrency(order.total)} />
              ))}
              {stats.orderCount > customer.orders.length && (
                <ThemedText type="caption" themeColor="textSecondary">
                  {t('customers.showingLatest', { count: customer.orders.length })}
                </ThemedText>
              )}
            </>
          )}
        </Panel>
      </ScrollView>
    </>
  );
}

function OrderRow({ order, total }: { order: CustomerDetail['orders'][number]; total: string }) {
  const theme = useTheme();
  const t = useT();
  const count = order.items.reduce((n, i) => n + i.quantity, 0);
  // Order details are per branch; orders from other branches show where they were made.
  const here = order.shop.id === useActiveShop().id;
  return (
    <Pressable
      disabled={!here}
      accessibilityRole={here ? 'button' : 'text'}
      accessibilityLabel={`${order.orderNumber}, ${total}`}
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.one,
        borderRadius: Radius.md,
        opacity: pressed ? 0.6 : 1,
      })}>
      <IconTile name="receipt" tint={TINT.indigo} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {order.orderNumber}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {[formatDateTime(order.createdAt, t), t('common.items', { count }), t('customers.at', { shop: order.shop.name })].join(' · ')}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>
          {total}
        </ThemedText>
        <OrderStatusBadge status={order.status} />
      </View>
      {here && <Icon name="chevronRight" size={14} color={theme.textSecondary} />}
    </Pressable>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" selectable>
        {value}
      </ThemedText>
    </View>
  );
}
