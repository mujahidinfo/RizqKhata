import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { useAnalyticsOverview, useJobsSummary, useSalesChart, useShop, useTopProducts } from '@/api/queries';
import { Icon } from '@/components/icon';
import { IconTile, TINT } from '@/components/icon-tile';
import { CARD_SHADOW, Panel } from '@/components/panel';
import { QueryState } from '@/components/query-state';
import { RevenueBars } from '@/components/revenue-bars';
import { StatTile } from '@/components/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFormatCurrency } from '@/lib/format';
import { canEditCatalog } from '@/lib/roles';
import { useActiveShop, useCurrentUser } from '@/lib/session';
import { useT } from '@/lib/i18n';
import { useModules } from '@/lib/business';

const PERIODS = [
  { key: 'today', days: 1 },
  { key: 'week', days: 7 },
  { key: 'month', days: 30 },
] as const;

function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? 'dashboard.morning' : h < 18 ? 'dashboard.afternoon' : 'dashboard.evening';
}

// The Jobs tab root. Typed by hand: route-type generation lists it as `/jobs/index`.
const JOBS_TAB = '/jobs' as Href;

export default function HomeScreen() {
  const user = useCurrentUser();
  const active = useActiveShop();
  const theme = useTheme();
  const t = useT();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();
  const [days, setDays] = useState<number>(1);

  const { data: shop } = useShop();
  const overview = useAnalyticsOverview(days);
  const { services } = useModules();
  const jobs = useJobsSummary(services);
  const chart = useSalesChart(7);
  const topProducts = useTopProducts(days);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['analytics'] });
    setRefreshing(false);
  };

  const period = PERIODS.find((p) => p.days === days) ?? PERIODS[0];
  const phrase = t(`dashboard.phrases.${period.key}`);
  const lowStock = overview.data?.lowStockCount ?? 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
      <View style={{ paddingHorizontal: Spacing.one, gap: 2 }}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('dashboard.greeting', { greeting: t(greetingKey()), name: user.name.split(' ')[0] })}
        </ThemedText>
        <ThemedText style={{ fontSize: 22, lineHeight: 28, fontWeight: 700 }} numberOfLines={1}>
          {shop?.name ?? active.name}
        </ThemedText>
      </View>

      {/* Revenue hero with the period switch built in */}
      <View
        style={{
          gap: Spacing.three,
          padding: Spacing.three,
          borderRadius: Radius.lg + 4,
          borderCurve: 'continuous',
          backgroundColor: theme.backgroundElement,
          boxShadow: CARD_SHADOW,
        }}>
        <View
          style={{
            flexDirection: 'row',
            padding: 3,
            borderRadius: 999,
            backgroundColor: theme.backgroundSelected,
          }}>
          {PERIODS.map((p) => {
            const selected = p.days === days;
            return (
              <Pressable
                key={p.days}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setDays(p.days)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: selected ? theme.backgroundElement : 'transparent',
                  boxShadow: selected ? '0 1px 2px rgba(15, 23, 42, 0.12)' : undefined,
                }}>
                <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
                  {t(`dashboard.periods.${p.key}`)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
          <IconTile name="trend" tint={TINT.indigo} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('dashboard.revenue', { period: phrase })}
            </ThemedText>
            {overview.data ? (
              <ThemedText
                adjustsFontSizeToFit
                numberOfLines={1}
                style={{ fontSize: 36, lineHeight: 42, fontWeight: 700, fontVariant: ['tabular-nums'] }}>
                {formatCurrency(overview.data.totalRevenue)}
              </ThemedText>
            ) : (
              <ThemedText style={{ fontSize: 36, lineHeight: 42, fontWeight: 700 }} themeColor="textSecondary">
                –
              </ThemedText>
            )}
          </View>
        </View>
      </View>

      {services && jobs.data && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
          <StatTile
            icon="wrench"
            tint={TINT.indigo}
            label={t('dashboard.jobsActive')}
            value={String(jobs.data.active)}
            onPress={() => router.push(JOBS_TAB)}
          />
          <StatTile
            icon="check"
            tint={TINT.emerald}
            label={t('dashboard.jobsReady')}
            value={String(jobs.data.ready)}
            onPress={() => router.push(JOBS_TAB)}
          />
          <StatTile icon="wallet" tint={TINT.amber} label={t('dashboard.advancesHeld')} value={formatCurrency(jobs.data.advancesHeld)} />
          <StatTile icon="receipt" tint={TINT.sky} label={t('dashboard.deliveredToday')} value={String(jobs.data.deliveredToday)} />
        </View>
      )}
      {overview.data ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
          <StatTile icon="receipt" tint={TINT.emerald} label={t('dashboard.completedSales')} value={String(overview.data.fulfilledOrders)} />
          <StatTile icon="bag" tint={TINT.sky} label={t('dashboard.allOrders')} value={String(overview.data.totalOrders)} />
          <StatTile
            icon="alert"
            tint={lowStock > 0 ? TINT.rose : TINT.slate}
            label={t('dashboard.lowStockItems')}
            value={String(lowStock)}
            alert={lowStock > 0}
            {...(lowStock > 0 &&
              canEditCatalog(active.role) && {
                actionLabel: t('dashboard.reorder'),
                onPress: () => router.push({ pathname: '/receive-stock', params: { reorder: '1' } }),
              })}
          />
          <StatTile icon="team" tint={TINT.violet} label={t('dashboard.customers')} value={String(overview.data.totalCustomers)} />
        </View>
      ) : (
        <View style={{ minHeight: 120 }}>
          <QueryState isLoading={overview.isLoading} error={overview.error} onRetry={overview.refetch} />
        </View>
      )}

      <Panel icon="trend" tint={TINT.indigo} title={t('dashboard.last7Days')}>
        {chart.data ? (
          <RevenueBars data={chart.data} formatValue={formatCurrency} />
        ) : (
          <View style={{ minHeight: 120 }}>
            <QueryState isLoading={chart.isLoading} error={chart.error} onRetry={chart.refetch} />
          </View>
        )}
      </Panel>

      <Panel icon="star" tint={TINT.amber} title={t('dashboard.topSellers', { period: phrase })}>
        {topProducts.data && topProducts.data.length > 0 ? (
          topProducts.data.map((p, i) => (
            <View
              key={p.productId + p.name}
              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.one }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: i === 0 ? `${TINT.amber}26` : theme.backgroundSelected,
                }}>
                <ThemedText
                  type="smallBold"
                  style={{ color: i === 0 ? TINT.amber : theme.textSecondary, fontVariant: ['tabular-nums'] }}>
                  {i + 1}
                </ThemedText>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="small" style={{ fontWeight: 600 }} numberOfLines={1}>
                  {p.name}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {t('dashboard.sold', { count: p.totalQty })}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>
                {formatCurrency(p.totalRevenue)}
              </ThemedText>
            </View>
          ))
        ) : topProducts.isLoading ? (
          <QueryState isLoading />
        ) : (
          <View style={{ alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three }}>
            <Icon name="receipt" size={24} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {t('dashboard.noSales', { period: phrase })}
            </ThemedText>
          </View>
        )}
      </Panel>
    </ScrollView>
  );
}
