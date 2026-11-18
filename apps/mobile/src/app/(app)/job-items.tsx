import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { useJob, useProducts, useUpdateJob } from '@/api/queries';
import type { Product } from '@/api/types';
import { Badge } from '@/components/badge';
import { FilterBar } from '@/components/filter-bar';
import { HeaderButton } from '@/components/header-button';
import { Icon } from '@/components/icon';
import { ProductThumb } from '@/components/product-thumb';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';

type Kind = 'SERVICE' | 'PRODUCT';

/** `/job-items?id=` — add services and parts to a job. Tap again for one more. */
export default function JobItemsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const t = useT();
  const formatCurrency = useFormatCurrency();
  const job = useJob(id);
  const update = useUpdateJob();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<Kind | undefined>('SERVICE');
  const debounced = useDebouncedValue(search.trim(), 250);
  const query = useProducts(debounced);

  const items = (query.data?.pages.flatMap((p) => p.items) ?? []).filter((p) => !kind || p.kind === kind);
  const lines = job.data?.lines ?? [];
  const countOf = (productId: string) => lines.filter((l) => l.productId === productId).reduce((n, l) => n + l.quantity, 0);

  const add = (product: Product) => {
    if (!job.data) return;
    void Haptics.selectionAsync();
    const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
    const current = lines.map(({ id: _id, ...l }) => l);
    const existing = current.find((l) => l.productId === product.id);
    const next = existing
      ? current.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l))
      : [...current, { productId: product.id, variantId: variant?.id, name: product.name, price: variant?.price ?? product.price, quantity: 1 }];
    update.mutate({ id: job.data.id, lines: next });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: t('jobs.pickTitle'),
          headerRight: () => <HeaderButton title={t('common.done')} onPress={() => router.back()} />,
        }}
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder={t('jobs.pickSearch')}
        chips={[
          { label: t('jobs.service'), value: 'SERVICE' as Kind },
          { label: t('jobs.part'), value: 'PRODUCT' as Kind },
          { label: t('common.all') },
        ]}
        selected={kind}
        onSelect={setKind}
      />
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ flexGrow: 1, padding: Spacing.three, gap: Spacing.two }}
        renderItem={({ item }) => {
          const count = countOf(item.id);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('addItem.addA11y', { name: item.name })}
              onPress={() => add(item)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                padding: Spacing.three,
                borderRadius: 16,
                backgroundColor: theme.backgroundElement,
                borderWidth: count ? 1.5 : 0,
                borderColor: theme.primary,
                opacity: pressed ? 0.7 : 1,
              })}>
              <ProductThumb name={item.name} imageUrl={item.imageUrl} size={40} radius={10} />
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {formatCurrency(item.price)}
                </ThemedText>
              </View>
              {count > 0 ? <Badge label={`× ${count}`} tone="primary" /> : <Icon name="plus" size={18} color={theme.primary} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            onRetry={query.refetch}
            emptyTitle={debounced ? t('addItem.noMatching') : t('addItem.noProducts')}
          />
        }
      />
    </View>
  );
}
