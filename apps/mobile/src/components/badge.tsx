import { StyleSheet, View } from 'react-native';

import type { OrderStatus } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

type Tone = Extract<ThemeColor, 'success' | 'warning' | 'danger' | 'primary' | 'textSecondary'>;

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const theme = useTheme();
  const color = theme[tone];

  return (
    // 1A = ~10% alpha tint of the tone color
    <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
      <ThemedText type="caption" style={{ color, fontWeight: 700 }}>
        {label}
      </ThemedText>
    </View>
  );
}

const ORDER_TONE: Record<OrderStatus, Tone> = {
  PENDING: 'warning',
  PROCESSING: 'primary',
  FULFILLED: 'success',
  CANCELED: 'textSecondary',
  REFUNDED: 'danger',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useT();
  return <Badge label={t(`orderStatus.${status}`)} tone={ORDER_TONE[status]} />;
}

const styles = StyleSheet.create({
  // No alignSelf: the parent decides (right in list rows, centered in heroes).
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
});
