import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { useCustomers } from '@/api/queries';
import type { CustomerSummary } from '@/api/types';
import { Avatar } from '@/components/avatar';
import { FilterBar } from '@/components/filter-bar';
import { Icon } from '@/components/icon';
import { IconTile, TINT } from '@/components/icon-tile';
import { CARD_SHADOW } from '@/components/panel';
import { QueryState } from '@/components/query-state';
import { TabScreen } from '@/components/safe-area';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel, useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';

type Sort = 'top' | 'name';

const byRecent = (a: CustomerSummary, b: CustomerSummary) =>
  (b.lastOrderAt ? Date.parse(b.lastOrderAt) : 0) - (a.lastOrderAt ? Date.parse(a.lastOrderAt) : 0) ||
  a.name.localeCompare(b.name);

/** Everyone saved at checkout, with what they spend and when they last came in. */
export default function CustomersScreen() {
  const theme = useTheme();
  const t = useT();
  const formatCurrency = useFormatCurrency();
  const query = useCustomers();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort | undefined>();
  const needle = useDebouncedValue(search.trim().toLowerCase(), 150);

  const all = query.data ?? [];
  const totalSpent = all.reduce((sum, c) => sum + c.totalSpent, 0);
  const shown = all
    .filter(
      (c) =>
        !needle ||
        c.name.toLowerCase().includes(needle) ||
        (c.phone ?? '').includes(needle) ||
        (c.email ?? '').toLowerCase().includes(needle),
    )
    .sort(
      sort === 'top'
        ? (a, b) => b.totalSpent - a.totalSpent || a.name.localeCompare(b.name)
        : sort === 'name'
          ? (a, b) => a.name.localeCompare(b.name)
          : byRecent,
    );

  return (
    <TabScreen style={{ backgroundColor: theme.background }}>
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder={t('customers.searchPlaceholder')}
        chips={[
          { label: t('customers.sortRecent') },
          { label: t('customers.sortTop'), value: 'top' as Sort },
          { label: t('customers.sortName'), value: 'name' as Sort },
        ]}
        selected={sort}
        onSelect={setSort}
      />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={shown}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ flexGrow: 1, padding: Spacing.three, paddingTop: Spacing.one, gap: Spacing.two + 2 }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={theme.primary} />}
        ListHeaderComponent={
          all.length > 0 && !needle ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                padding: Spacing.three,
                marginBottom: Spacing.one,
                borderRadius: Radius.lg + 4,
                borderCurve: 'continuous',
                backgroundColor: `${TINT.sky}14`,
              }}>
              <IconTile name="customers" tint={TINT.sky} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                  {t('customers.count', { count: all.length })}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {t('customers.spentTotal', { amount: formatCurrency(totalSpent) })}
                </ThemedText>
              </View>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => <CustomerCard customer={item} spent={formatCurrency(item.totalSpent)} />}
        ListEmptyComponent={
          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            onRetry={query.refetch}
            emptyTitle={needle ? t('customers.noMatching') : t('customers.noCustomers')}
            emptyMessage={needle ? t('customers.tryDifferent') : t('customers.emptyHint')}
          />
        }
      />
    </TabScreen>
  );
}

function CustomerCard({ customer, spent }: { customer: CustomerSummary; spent: string }) {
  const theme = useTheme();
  const t = useT();
  const orders = t('customers.orders', { count: customer._count.orders });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('customers.a11y', { name: customer.name, orders, amount: spent })}
      onPress={() => router.push({ pathname: '/more/customer/[id]', params: { id: customer.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Radius.lg + 4,
        borderCurve: 'continuous',
        backgroundColor: theme.backgroundElement,
        boxShadow: CARD_SHADOW,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      <Avatar name={customer.name} size={46} />
      <View style={{ flex: 1, gap: 3 }}>
        <ThemedText type="smallBold" style={{ fontSize: 16 }} numberOfLines={1}>
          {customer.name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {[customer.phone, orders].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <ThemedText type="smallBold" style={{ fontSize: 16, fontVariant: ['tabular-nums'] }}>
          {spent}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {customer.lastOrderAt
            ? t('customers.lastBought', { when: formatDayLabel(customer.lastOrderAt, t) })
            : t('customers.neverBought')}
        </ThemedText>
      </View>
      <Icon name="chevronRight" size={14} color={theme.textSecondary} />
    </Pressable>
  );
}
