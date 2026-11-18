import { router, Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useProduct } from '@/api/queries';
import { Badge } from '@/components/badge';
import { Card, DetailRow } from '@/components/card';
import { HeaderButton } from '@/components/header-button';
import { ProductThumb } from '@/components/product-thumb';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, totalStock, useFormatCurrency } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { canEditCatalog } from '@/lib/roles';
import { useActiveShop } from '@/lib/session';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const t = useT();
  const formatCurrency = useFormatCurrency();
  const canEdit = canEditCatalog(useActiveShop().role);
  const { data: product, isLoading, error, refetch, isRefetching } = useProduct(id);

  if (!product) {
    return <QueryState isLoading={isLoading} error={error} onRetry={refetch} />;
  }

  const variantName = (variantId: string | null) =>
    product.variants.find((v) => v.id === variantId)?.name;

  return (
    <>
      <Stack.Screen
        options={{
          title: product.name,
          headerRight: canEdit
            ? () => <HeaderButton title={t('common.edit')} onPress={() => router.push({ pathname: '/new-product', params: { id: product.id } })} />
            : undefined,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={theme.primary} />
        }>
        <View style={styles.hero}>
          <ProductThumb name={product.name} imageUrl={product.imageUrl} size={88} radius={18} />
          <View style={styles.heroText}>
            <ThemedText type="subtitle">{product.name}</ThemedText>
            {product.category && (
              <ThemedText type="small" themeColor="textSecondary">
                {product.category.name}
              </ThemedText>
            )}
          </View>
        </View>

        <Card title={t('products.pricing')}>
          <DetailRow label={t('products.price')} value={formatCurrency(product.price)} emphasis />
          <DetailRow label={t('products.cost')} value={formatCurrency(product.costPrice)} />
          {product.sku && <DetailRow label={t('products.sku')} value={product.sku} />}
          {product.barcode && <DetailRow label={t('products.barcode')} value={product.barcode} />}
        </Card>

        {product.variants.length > 0 && (
          <Card title={t('products.stockTotal', { count: totalStock(product.variants) })}>
            {product.variants.map((v) => {
              const low = v.stock <= v.lowStock;
              return (
                <View key={v.id} style={styles.variant}>
                  <View style={styles.variantMain}>
                    <ThemedText type="small">{v.name}</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {formatCurrency(v.price ?? product.price)} · {t('products.alertAt', { count: v.lowStock })}
                    </ThemedText>
                  </View>
                  {low ? (
                    <Badge label={v.stock === 0 ? t('sellParts.out') : t('sellParts.left', { count: v.stock })} tone="danger" />
                  ) : (
                    <ThemedText type="smallBold">{v.stock}</ThemedText>
                  )}
                </View>
              );
            })}
          </Card>
        )}

        {product.description ? (
          <Card title={t('products.description')}>
            <ThemedText type="small">{product.description}</ThemedText>
          </Card>
        ) : null}

        {product.stockMovements.length > 0 && (
          <Card title={t('products.recentActivity')}>
            {product.stockMovements.map((m) => (
              <View key={m.id} style={styles.variant}>
                <View style={styles.variantMain}>
                  <ThemedText type="small">
                    {t(`products.movement.${m.type}`)} {m.quantity}
                    {variantName(m.variantId) ? ` · ${variantName(m.variantId)}` : ''}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {[formatDateTime(m.createdAt, t), m.note].filter(Boolean).join(' · ')}
                  </ThemedText>
                </View>
              </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  heroText: {
    flex: 1,
    gap: Spacing.half,
  },
  variant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  variantMain: {
    flex: 1,
    gap: Spacing.half,
  },
});
