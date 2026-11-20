import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Product } from '@/api/types';
import { ProductThumb } from '@/components/product-thumb';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWideLayout } from '@/hooks/use-wide-layout';
import { useT } from '@/lib/i18n';

/**
 * Pick a size/colour for a product with several variants: a bottom sheet on
 * phones, a centred dialog in a desktop browser.
 */
export function VariantSheet({
  product,
  formatCurrency,
  onPick,
  onClose,
}: {
  product: Product | null;
  formatCurrency: (n: number) => string;
  onPick: (variantId: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const wide = useWideLayout();

  return (
    <Modal visible={!!product} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose} statusBarTranslucent>
      <View style={wide ? styles.centred : styles.fill}>
      <Pressable
        accessibilityLabel={t('common.close')}
        onPress={onClose}
        style={[wide ? StyleSheet.absoluteFill : styles.fill, styles.backdrop]}
      />
      {product && (
        <View
          style={{
            padding: Spacing.four,
            paddingBottom: Spacing.four + (wide ? 0 : insets.bottom),
            gap: Spacing.three,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            ...(wide && { width: '100%', maxWidth: 520, borderRadius: 24 }),
            borderCurve: 'continuous',
            backgroundColor: theme.backgroundElement,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <ProductThumb name={product.name} imageUrl={product.imageUrl} size={52} />
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" numberOfLines={1}>
                {product.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('sellParts.chooseOne')}
              </ThemedText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            {product.variants.map((v) => (
              <Pressable
                key={v.id}
                accessibilityRole="button"
                accessibilityLabel={t('sellParts.variantA11y', { name: v.name, stock: v.stock })}
                onPress={() => onPick(v.id)}
                style={({ pressed }) => ({
                  minWidth: 88,
                  alignItems: 'center',
                  gap: 2,
                  paddingVertical: 12,
                  paddingHorizontal: Spacing.three,
                  borderRadius: Radius.md,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: pressed ? theme.backgroundSelected : theme.background,
                })}>
                <ThemedText type="smallBold">{v.name}</ThemedText>
                <ThemedText type="caption" themeColor={v.stock <= 0 ? 'danger' : 'textSecondary'}>
                  {formatCurrency(v.price ?? product.price)} · {v.stock}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  backdrop: { backgroundColor: 'rgba(15, 23, 42, 0.4)' },
});
