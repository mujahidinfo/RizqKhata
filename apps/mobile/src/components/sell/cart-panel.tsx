import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { CartRow } from '@/components/cart-row';
import { HeaderButton } from '@/components/header-button';
import { Icon } from '@/components/icon';
import { ListSeparator } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, WideLayout } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/lib/cart';
import { useT } from '@/lib/i18n';

/**
 * Desktop-browser Sell screen: the cart stays open beside the products, like
 * a till, instead of hiding behind the floating cart bar used on phones.
 */
export function CartPanel({
  highlighted,
  formatCurrency,
}: {
  highlighted: string | null;
  formatCurrency: (n: number) => string;
}) {
  const theme = useTheme();
  const t = useT();
  const cart = useCart();
  const empty = cart.lines.length === 0;

  return (
    <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText type="smallBold">{t('cart.title', { count: cart.itemCount })}</ThemedText>
        {!empty && <HeaderButton title={t('cart.clear')} tone="danger" onPress={cart.clear} />}
      </View>

      <FlatList
        style={styles.list}
        data={cart.lines}
        keyExtractor={(l) => l.variantId}
        ItemSeparatorComponent={ListSeparator}
        contentContainerStyle={{ flexGrow: 1 }}
        renderItem={({ item }) => (
          <CartRow
            line={item}
            highlighted={highlighted === item.variantId}
            formatCurrency={formatCurrency}
            onChangeQuantity={(q) => cart.setQuantity(item.variantId, q)}
            onChangePrice={(p) => cart.setPrice(item.variantId, p)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="bag" size={30} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              {t('cart.empty')}
            </ThemedText>
          </View>
        }
      />

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.total}>
          <ThemedText themeColor="textSecondary">{t('common.items', { count: cart.itemCount })}</ThemedText>
          <ThemedText type="subtitle" style={{ fontVariant: ['tabular-nums'] }}>
            {formatCurrency(cart.subtotal)}
          </ThemedText>
        </View>
        <Button title={t('sellParts.charge')} disabled={empty} onPress={() => router.push('/checkout')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: WideLayout.cartPanelWidth,
    margin: Spacing.three,
    marginLeft: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  list: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
  },
  footer: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
});
