import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ProductThumb } from '@/components/product-thumb';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CartLine } from '@/lib/cart';
import { useT } from '@/lib/i18n';

/**
 * One cart line: what it is, unit price, quantity stepper, line total.
 * Tapping the unit price edits it for this sale only (prices are agreed at the
 * counter); the list price stays visible and one tap resets it.
 */
export function CartRow({
  line,
  highlighted,
  formatCurrency,
  onChangeQuantity,
  onChangePrice,
}: {
  line: CartLine;
  /** Briefly true right after this line was scanned. */
  highlighted: boolean;
  formatCurrency: (n: number) => string;
  onChangeQuantity: (quantity: number) => void;
  /** Omit to show the price read-only. */
  onChangePrice?: (price: number) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  const changed = line.price !== line.listPrice;
  const belowCost = line.costPrice > 0 && line.price < line.costPrice;

  const startEdit = () => {
    if (!onChangePrice) return;
    void Haptics.selectionAsync();
    setDraft(String(line.price));
  };
  const commit = () => {
    if (draft === null) return;
    const value = Number(draft.replace(/,/g, '').trim());
    if (draft.trim() !== '' && Number.isFinite(value) && value >= 0) onChangePrice?.(value);
    setDraft(null);
  };

  const step = (delta: number) => {
    void Haptics.selectionAsync();
    onChangeQuantity(line.quantity + delta);
  };

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: highlighted ? `${theme.primary}14` : theme.backgroundElement },
      ]}>
      <ProductThumb name={line.name} imageUrl={line.imageUrl} size={44} radius={10} />
      <View style={styles.main}>
        <ThemedText numberOfLines={2}>{line.name}</ThemedText>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={commit}
              onBlur={commit}
              autoFocus
              selectTextOnFocus
              keyboardType="decimal-pad"
              returnKeyType="done"
              accessibilityLabel={t('cart.priceLabel', { name: line.name })}
              style={[
                styles.priceInput,
                { color: theme.text, borderColor: theme.primary, backgroundColor: theme.background },
              ]}
            />
            {changed && (
              <Pressable
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => {
                  onChangePrice?.(line.listPrice);
                  setDraft(null);
                }}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {t('cart.resetPrice', { price: formatCurrency(line.listPrice) })}
                </ThemedText>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable
            disabled={!onChangePrice}
            onPress={startEdit}
            hitSlop={{ top: 8, bottom: 8 }}
            accessibilityRole={onChangePrice ? 'button' : undefined}
            accessibilityLabel={
              onChangePrice ? t('cart.editPriceA11y', { name: line.name, price: formatCurrency(line.price) }) : undefined
            }
            style={styles.priceRow}>
            <ThemedText
              type="small"
              themeColor={changed ? undefined : 'textSecondary'}
              style={[styles.shrink, changed && { color: theme.primary, fontWeight: 600 }]}
              numberOfLines={1}>
              {[line.variantName, formatCurrency(line.price)].filter(Boolean).join(' · ')}
            </ThemedText>
            {changed && (
              <ThemedText type="small" themeColor="textSecondary" style={[styles.struck, styles.shrink]} numberOfLines={1}>
                {formatCurrency(line.listPrice)}
              </ThemedText>
            )}
            {onChangePrice && <Icon name="edit" size={13} color={theme.textSecondary} />}
          </Pressable>
        )}
        {belowCost && (
          <View style={styles.priceRow} accessibilityLiveRegion="polite">
            <Icon name="alert" size={13} color={theme.warning} />
            <ThemedText type="small" style={[styles.shrink, { color: theme.warning }]} numberOfLines={1}>
              {t('cart.belowCost', { cost: formatCurrency(line.costPrice) })}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.side}>
        <ThemedText type="smallBold" style={styles.total}>
          {formatCurrency(line.price * line.quantity)}
        </ThemedText>
        <View style={[styles.stepper, { borderColor: theme.border }]}>
          <StepButton
            label={line.quantity === 1 ? t('common.remove') : t('sellParts.decrease')}
            symbol={line.quantity === 1 ? '×' : '−'}
            danger={line.quantity === 1}
            onPress={() => step(-1)}
          />
          <ThemedText type="smallBold" style={styles.qty} accessibilityLabel={t('sellParts.quantityA11y', { count: line.quantity })}>
            {line.quantity}
          </ThemedText>
          <StepButton label={t('sellParts.increase')} symbol="+" onPress={() => step(1)} />
        </View>
      </View>
    </View>
  );
}

function StepButton({
  label,
  symbol,
  danger,
  onPress,
}: {
  label: string;
  symbol: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText style={[styles.stepSymbol, { color: danger ? theme.danger : theme.text }]}>
        {symbol}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 72,
  },
  main: {
    flex: 1,
    gap: Spacing.half,
  },
  side: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  total: {
    fontVariant: ['tabular-nums'],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  shrink: {
    flexShrink: 1,
  },
  struck: {
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  priceInput: {
    minWidth: 96,
    height: 36,
    paddingHorizontal: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  stepButton: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  stepSymbol: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: 600,
  },
  qty: {
    minWidth: 28,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
